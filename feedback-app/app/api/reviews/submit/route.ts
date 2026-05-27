// endpoint POST /api/reviews/submit
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {

  const body = await req.json()

  const {
    review_id,
    calificacion,
    comentario,
  } = body

  // buscamos la review
  const review = await prisma.review.findUnique({
    where: {
      id: review_id,
    },
  })

  // no existe
  if (!review) {
    return new Response(
      "Review not found",
      { status: 404 }
    )
  }

  // ya fue completada
  if (review.status === "COMPLETED") {
    return new Response(
      "Review already completed",
      { status: 409 }
    )
  }

  // update
  const updatedReview = await prisma.review.update({
    where: {
      id: review_id,
    },
    data: {
      rating: calificacion,
      comment: comentario,
      status: "COMPLETED",
    },
  })

  return Response.json(updatedReview)
}