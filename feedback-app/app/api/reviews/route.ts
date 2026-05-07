import { prisma } from "@/lib/prisma"

export async function GET() {
  const reviews = await prisma.review.findMany()

  return Response.json(reviews)
}

export async function POST(req: Request) {
  const body = await req.json()

  const review = await prisma.review.create({
    data: {
      rating: body.rating,
      comment: body.comment,
      driverId: body.driverId,
      passengerId: body.passengerId,
    },
  })

  return Response.json(review)
}