"use server"

import { prisma } from "@/lib/prisma"
import { getAuthHeaders } from "@/lib/auth-headers"

export async function checkAndActivatePoolsAction(userId: string): Promise<{ success: boolean; activatedCount: number; activePrecreatedPoolIds?: string[]; error?: string }> {
  try {
    // 1. Buscamos todas las reseñas en estado PRECREATED donde el usuario sea participante
    const precreatedReviews = await prisma.review.findMany({
      where: {
        status: "PRECREATED",
        OR: [
          { author_user_id: userId },
          { target_user_id: userId }
        ]
      },
      select: {
        pool_id: true
      }
    })

    const activePrecreatedPoolIds = Array.from(new Set(precreatedReviews.map((r: { pool_id: string }) => r.pool_id))) as string[]

    if (precreatedReviews.length === 0) {
      return { success: true, activatedCount: 0, activePrecreatedPoolIds: [] as string[] }
    }

    // Obtenemos los pool IDs únicos
    const uniquePoolIds = activePrecreatedPoolIds
    const driverAppUrl = process.env.DRIVER_APP_API_URL || process.env.NEXT_PUBLIC_DRIVER_APP_URL || "https://proyecto-a-driver2-weshuttle.vercel.app"
    let activatedCount = 0

    // 2. Verificamos el estado de cada pool en la Driver App
    for (const poolId of uniquePoolIds) {
      try {
        const url = `${driverAppUrl}/api/pools/${poolId}/status`
        console.log(`[AutoActivator] Checking pool ${poolId} status at: ${url}`)

        const res = await fetch(url, { headers: getAuthHeaders() })
        if (res.ok) {
          const data = await res.json()

          if (data.status === "COMPLETED") {
            console.log(`[AutoActivator] Pool ${poolId} is COMPLETED. Activating reviews in database...`)

            // Activamos las reseñas del pool
            const updateResult = await prisma.review.updateMany({
              where: {
                pool_id: poolId,
                status: "PRECREATED"
              },
              data: {
                status: "PENDING",
                enabled_at: new Date()
              }
            })

            activatedCount += updateResult.count

            // 3. Notificar a los participantes
            // Obtener conductor
            const poolDriverReview = await prisma.review.findFirst({
              where: { pool_id: poolId, author_role: "driver" },
              select: { author_user_id: true }
            })

            // Obtener pasajeros
            const passengerReviews = await prisma.review.findMany({
              where: { pool_id: poolId, author_role: "rider" },
              select: { author_user_id: true },
              distinct: ["author_user_id"]
            })

            // Notificar a cada pasajero (Rider App)
            const riderAppUrl = process.env.RIDER_APP_API_URL || process.env.NEXT_PUBLIC_RIDER_APP_URL
            if (riderAppUrl && passengerReviews.length > 0) {
              for (const p of passengerReviews) {
                // Notificar tanto al ID del mock como al del desarrollador si corresponde
                const idsToNotify = [p.author_user_id]
                if (p.author_user_id === "user_3EYGQCDMhqZaMRhMIgYvm46DK1P") {
                  idsToNotify.push("user_3Db8E5HISehCv1nAJkIwlHXxtiG")
                }

                for (const targetId of idsToNotify) {
                  try {
                    const notifyUrl = `${riderAppUrl}/api/notifications/feedback`
                    console.log(`[AutoActivator] Notifying passenger ${targetId} at ${notifyUrl}`)
                    const response = await fetch(notifyUrl, {
                      method: "POST",
                      headers: getAuthHeaders({ "Content-Type": "application/json" }),
                      body: JSON.stringify({
                        pool_id: poolId,
                        passenger_user_id: targetId,
                        message: "Ya podés calificar tu viaje."
                      })
                    })
                    if (!response.ok) {
                      console.error(`[AutoActivator] Failed to notify passenger ${targetId}: ${response.status}`)
                    }
                  } catch (err) {
                    console.error(`[AutoActivator] Error notifying passenger ${targetId}:`, err)
                  }
                }
              }
            }

            // Notificar al conductor (Driver App)
            if (driverAppUrl && poolDriverReview) {
              try {
                const notifyUrl = `${driverAppUrl}/api/notifications/feedback`
                console.log(`[AutoActivator] Notifying driver ${poolDriverReview.author_user_id} at ${notifyUrl}`)
                const response = await fetch(notifyUrl, {
                  method: "POST",
                  headers: getAuthHeaders({ "Content-Type": "application/json" }),
                  body: JSON.stringify({
                    pool_id: poolId,
                    driver_user_id: poolDriverReview.author_user_id,
                    message: "Ya podés calificar a los pasajeros del viaje."
                  })
                })
                if (!response.ok) {
                  console.error(`[AutoActivator] Failed to notify driver: ${response.status}`)
                }
              } catch (err) {
                console.error("[AutoActivator] Error notifying driver:", err)
              }
            }
          }
        } else {
          console.warn(`[AutoActivator] Pool ${poolId} status request failed with status: ${res.status}`)
        }
      } catch (err) {
        console.error(`[AutoActivator] Error processing status/activation for pool ${poolId}:`, err)
      }
    }

    return { success: true, activatedCount, activePrecreatedPoolIds }
  } catch (error) {
    console.error("[AutoActivator] Critical error in checkAndActivatePoolsAction:", error)
    return { success: false, error: "Failed to process activation", activatedCount: 0, activePrecreatedPoolIds: [] as string[] }
  }
}
