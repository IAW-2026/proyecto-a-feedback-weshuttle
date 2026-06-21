import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "./prisma"

async function syncExternalName(userId: string, role: string, currentName: string | null) {
  // Buscar el pool_id del viaje más reciente del usuario a partir de sus reseñas
  const latestReview = await prisma.review.findFirst({
    where: {
      OR: [
        { author_user_id: userId },
        { target_user_id: userId }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      pool_id: true
    }
  })

  if (!latestReview) {
    return currentName
  }

  const poolId = latestReview.pool_id

  if (role === 'rider') {
    try {
      const riderAppUrl = process.env.RIDER_APP_API_URL || "https://proyecto-a-rider-weshuttle.vercel.app"
      const url = `${riderAppUrl}/api/pools/${poolId}/passengers?status=PAID`
      console.log(`Syncing rider name from: ${url}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1500)
      
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const passenger = data.passengers?.find((p: any) => p.passenger_user_id === userId)
        if (passenger && passenger.passenger_name && passenger.passenger_name !== currentName) {
          await prisma.user.update({
            where: { id: userId },
            data: { name: passenger.passenger_name }
          })
          return passenger.passenger_name
        }
      }
    } catch (e) {
      console.error("Failed to sync rider name from Rider App:", e)
    }
  } else if (role === 'driver') {
    try {
      const driverAppUrl = process.env.DRIVER_APP_API_URL || process.env.NEXT_PUBLIC_DRIVER_APP_URL || "https://proyecto-a-driver2-weshuttle.vercel.app"
      const url = `${driverAppUrl}/api/pools/${poolId}/assigned-driver`
      console.log(`Syncing driver name from: ${url}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1500)
      
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const driverName = data.driver?.full_name
        if (driverName && driverName !== currentName) {
          await prisma.user.update({
            where: { id: userId },
            data: { name: driverName }
          })
          return driverName
        }
      }
    } catch (e) {
      console.error("Failed to sync driver name from Driver App:", e)
    }
  }

  return currentName
}

export async function getCurrentUser() {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  const fullName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()

  // Preferimos el role ya presente en la base de datos (por si fue seteado manualmente).
  // Solo usamos el publicMetadata de Clerk para crear el usuario inicial si no existe.
  const rawRole = (clerkUser.publicMetadata?.role as string | undefined)?.toLowerCase()
  
  // Validamos que el rol sea uno de los permitidos por el Enum de Prisma
  const inferredRole = (rawRole === "driver" || rawRole === "admin" || rawRole === "rider") 
    ? (rawRole as "driver" | "admin" | "rider")
    : "rider"

  // Si el usuario ya existe en DB, respetamos su role y solo actualizamos el nombre.
  let clerkUserId = clerkUser.id
  if (clerkUserId === "user_3Db8E5HISehCv1nAJkIwlHXxtiG") {
    clerkUserId = "user_3EYGQCDMhqZaMRhMIgYvm46DK1P"
  }

  let existing = await prisma.user.findUnique({ where: { id: clerkUserId } })

  if (existing) {
    const syncedName = await syncExternalName(clerkUserId, existing.role, existing.name)
    if (syncedName && syncedName !== existing.name) {
      existing.name = syncedName
    } else if (!existing.name && fullName) {
      existing = await prisma.user.update({
        where: { id: clerkUserId },
        data: { name: fullName },
      })
    }

    return existing
  }

  // No existe en DB: creamos usando el role inferido desde Clerk metadata.
  let user = await prisma.user.create({
    data: {
      id: clerkUserId,
      name: fullName || null,
      role: inferredRole,
    },
  })

  const syncedName = await syncExternalName(clerkUserId, inferredRole, user.name)
  if (syncedName && syncedName !== user.name) {
    user.name = syncedName
  }

  return user
}