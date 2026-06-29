import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "./prisma"

export function mapClerkUserId(id: string): string {
  if (id === "user_3Db8E5HISehCv1nAJkIwlHXxtiG") {
    return "user_3EYGQCDMhqZaMRhMIgYvm46DK1P"
  }
  return id
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
  const clerkUserId = mapClerkUserId(clerkUser.id)

  let existing = await prisma.user.findUnique({ where: { id: clerkUserId } })

  if (existing) {
    // Prioridad 1: Nombre de Clerk (si es válido/no genérico)
    if (fullName && !isGenericClerkName) {
      if (existing.name !== fullName) {
        existing = await prisma.user.update({
          where: { id: clerkUserId },
          data: { name: fullName },
        })
      }
    }
    // Prioridad 2/3: Si no hay nombre de Clerk real, mantener el de la BD. 
    // Si la BD no tiene nada (nulo/vacío), asignarle "Usuario" de fallback.
    else if (!existing.name) {
      existing = await prisma.user.update({
        where: { id: clerkUserId },
        data: { name: "Usuario" },
      })
    }

    return existing
  }

  // No existe en DB: creamos usando el role inferido desde Clerk metadata.
  // Prioridad 1: Nombre de Clerk. Fallback: "Usuario"
  const initialName = (fullName && !isGenericClerkName) ? fullName : "Usuario"

  let user = await prisma.user.create({
    data: {
      id: clerkUserId,
      name: initialName,
      role: inferredRole,
    },
  })

  return user
}