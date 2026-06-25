import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "./prisma"
import { getAuthHeaders } from "./auth-headers"

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

      const res = await fetch(url, { signal: controller.signal, headers: getAuthHeaders() })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const lookupId = userId === "user_3EYGQCDMhqZaMRhMIgYvm46DK1P" ? "user_3Db8E5HISehCv1nAJkIwlHXxtiG" : userId
        const passenger = data.passengers?.find((p: any) => p.passenger_user_id === userId || p.passenger_user_id === lookupId)
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

      const res = await fetch(url, { signal: controller.signal, headers: getAuthHeaders() })
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
  const isGenericClerkName = !fullName || fullName.includes("Usuario de Clerk") || fullName.includes("Clerk User") || fullName === "Usuario"

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
  } else if (clerkUserId === "user_3EYQtdZpi4fPlmXGq4EKEa1onL0") {
    clerkUserId = "user_3EYGtdZpi4fPlmXGq4EKEa1onL0"
  }

  let existing = await prisma.user.findUnique({ where: { id: clerkUserId } })

  if (existing) {
    // Prioritize the real name from Clerk if available and not generic
    if (fullName && !isGenericClerkName && existing.name !== fullName) {
      existing = await prisma.user.update({
        where: { id: clerkUserId },
        data: { name: fullName },
      })
    } else {
      const syncedName = await syncExternalName(clerkUserId, existing.role, existing.name)
      if (syncedName && syncedName !== existing.name) {
        existing.name = syncedName
      }
    }

    return existing
  }

  // No existe en DB: creamos usando el role inferido desde Clerk metadata.
  let user = await prisma.user.create({
    data: {
      id: clerkUserId,
      name: isGenericClerkName ? null : fullName,
      role: inferredRole,
    },
  })

  // Sync externally only if we didn't get a name from Clerk or if it's generic
  if (!user.name || isGenericClerkName) {
    const syncedName = await syncExternalName(clerkUserId, inferredRole, user.name)
    if (syncedName && syncedName !== user.name) {
      user.name = syncedName
    }
  }

  return user
}