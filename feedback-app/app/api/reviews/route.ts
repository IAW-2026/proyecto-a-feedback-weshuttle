// --> GET /api/reviews

import { prisma } from "@/lib/prisma"

export async function GET() {

  const reviews = await prisma.review.findMany()

  return Response.json(reviews)
}