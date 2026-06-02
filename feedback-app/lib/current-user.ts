import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "./prisma"

export async function getCurrentUser() {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  const fullName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()

  // Preferimos el role ya presente en la base de datos (por si fue seteado manualmente).
  // Solo usamos el publicMetadata de Clerk para crear el usuario inicial si no existe.
  const clerkRole = (clerkUser.publicMetadata.role as string | undefined)?.toUpperCase()
  const inferredRole = clerkRole === "DRIVER" ? "DRIVER" : clerkRole === "ADMIN" ? "ADMIN" : "PASSENGER"

  // Si el usuario ya existe en DB, respetamos su role y solo actualizamos el nombre.
  const existing = await prisma.user.findUnique({ where: { id: clerkUser.id } })

  if (existing) {
    if (!existing.name && fullName) {
      return await prisma.user.update({
        where: { id: clerkUser.id },
        data: { name: fullName },
      })
    }

    return existing
  }

  // No existe en DB: creamos usando el role inferido desde Clerk metadata.
  const user = await prisma.user.create({
    data: {
      id: clerkUser.id,
      name: fullName || null,
      role: inferredRole,
    },
  })

  return user
}