import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
// Funciona como interruptor para cambiar el status de las reseñas de 
// PRECREATED a PENDING, lo que habilita a los usuarios a completar las reseñas. 
// Solo puede ser accedida por admins y drivers, y los drivers solo pueden activar reseñas de pools a los que tengan acceso (es decir, pools donde sean el autor de alguna reseña).
type ActivateReviewsRequestBody = {
  pool_id: string
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      )
    }

    if (user.role !== "admin" && user.role !== "driver") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      )
    }

    let body: ActivateReviewsRequestBody

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid JSON" },
        { status: 400 }
      )
    }

    if (typeof body.pool_id !== "string" || !body.pool_id.trim()) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Missing pool_id" },
        { status: 400 }
      )
    }

    if (user.role === "driver") {
      const accessibleReview = await prisma.review.findFirst({
        where: {
          pool_id: body.pool_id,
          author_user_id: user.id,
          author_role: "driver",
          status: {
            in: ["PRECREATED", "PENDING"],
          },
        },
        select: { id: true },
      })

      if (!accessibleReview) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Pool not accessible" },
          { status: 403 }
        )
      }
    }

    const result = await prisma.review.updateMany({
      where: {
        pool_id: body.pool_id,
        status: "PRECREATED",
      },
      data: {
        status: "PENDING",
        enabled_at: new Date(),
      },
    })

    // 1. Obtener el conductor del pool
    const poolDriverReview = await prisma.review.findFirst({
      where: {
        pool_id: body.pool_id,
        author_role: "driver",
      },
      select: {
        author_user_id: true,
      },
    })

    // 2. Obtener pasajeros del pool
    const passengerReviews = await prisma.review.findMany({
      where: {
        pool_id: body.pool_id,
        author_role: "rider",
      },
      select: {
        author_user_id: true,
      },
      distinct: ["author_user_id"],
    })

    // 3. Notificar a cada pasajero (Rider App)
    const riderAppUrl = process.env.RIDER_APP_API_URL || process.env.NEXT_PUBLIC_RIDER_APP_URL;
    if (riderAppUrl && passengerReviews.length > 0) {
      for (const p of passengerReviews) {
        // Notificar tanto al ID del mock como al del desarrollador si corresponde
        const idsToNotify = [p.author_user_id]
        if (p.author_user_id === "user_3EYGQCDMhqZaMRhMIgYvm46DK1P") {
          idsToNotify.push("user_3Db8E5HISehCv1nAJkIwlHXxtiG")
        }

        for (const targetId of idsToNotify) {
          try {
            const url = `${riderAppUrl}/api/notifications/feedback`;
            console.log(`Sending notification to Rider App: ${url} for passenger ${targetId}`);
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pool_id: body.pool_id,
                passenger_user_id: targetId,
                message: "Ya podés calificar tu viaje."
              }),
            });
            if (!res.ok) {
              console.error(`Failed to send notification to Rider App for passenger ${targetId}: ${res.status}`);
            }
          } catch (err) {
            console.error(`Error notifying passenger ${targetId}:`, err);
          }
        }
      }
    }

    // 4. Notificar al conductor (Driver App)
    const driverAppUrl = process.env.DRIVER_APP_API_URL || process.env.NEXT_PUBLIC_DRIVER_APP_URL;
    if (driverAppUrl && poolDriverReview) {
      try {
        const url = `${driverAppUrl}/api/notifications/feedback`;
        console.log(`Sending notification to Driver App: ${url} for driver ${poolDriverReview.author_user_id}`);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pool_id: body.pool_id,
            driver_user_id: poolDriverReview.author_user_id,
            message: "Ya podés calificar a los pasajeros del viaje."
          }),
        });
        if (!res.ok) {
          console.error(`Failed to send notification to Driver App: ${res.status}`);
        }
      } catch (err) {
        console.error("Error notifying driver:", err);
      }
    }

    return NextResponse.json({
      pool_id: body.pool_id,
      activated_reviews: result.count,
      review_status: "PENDING",
    })
  } catch (error) {
    console.error("Error activating reviews:", error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to activate reviews" },
      { status: 500 }
    )
  }
}