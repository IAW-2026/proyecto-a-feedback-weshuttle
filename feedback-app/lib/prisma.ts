import { PrismaNeon } from "@prisma/adapter-neon"
import prismaPkg from "@prisma/client"

// `@prisma/client`'s runtime shape can vary between versions/exports.
// Use a permissive import at runtime and keep types loose so builds don't fail
// when type definitions differ in CI or during `next build`.
const PrismaClientAny: any = (prismaPkg as any).PrismaClient ?? (prismaPkg as any).default ?? prismaPkg

const connectionString = process.env.DATABASE_URL!

const adapter = new PrismaNeon({
  connectionString,
})

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new (PrismaClientAny as any)({
    adapter,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}