import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "./prisma"

export async function getCurrentUser() {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  const fullName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()

  // Mapeamos el rol de Clerk a nuestro Enum de Prisma
  const clerkRole = (clerkUser.publicMetadata.role as string)?.toUpperCase()
  const role = clerkRole === "DRIVER" ? "DRIVER" : clerkRole === "ADMIN" ? "ADMIN" : "PASSENGER"

  const user = await prisma.user.upsert({
    where: {
      id: clerkUser.id,
    },
    update: {
      name: fullName || null,
    },
    create: {
      id: clerkUser.id,
      name: fullName || null,
      role: role,
    },
  })

  return user
}