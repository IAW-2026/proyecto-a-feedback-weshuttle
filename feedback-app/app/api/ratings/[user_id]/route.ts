import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {

  const { user_id } = await params

  const reviews = await prisma.review.findMany({
    where: {
      destinatario_id: user_id,
      estado_reseña: "COMPLETED",
      calificacion: {
        not: null,
      },
    },
  })

  const total_reviews = reviews.length

    const sum = reviews.reduce(
    (acc: number, review: any) => acc + (review.calificacion || 0),
    0
    )

    const average_rating =
    total_reviews === 0
        ? null
        : sum / total_reviews

  return Response.json({
    user_id,
    average_rating,
    total_reviews,
  })
}