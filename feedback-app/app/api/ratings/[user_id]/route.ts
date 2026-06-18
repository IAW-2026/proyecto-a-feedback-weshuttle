// API Externa para obtener el rating promedio y total de reseñas de un usuario específico.
// Esta API es consumida por la Driver App para mostrar el rating de 
// los pasajeros, y por la Rider App para mostrar el rating de los conductores.
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {

  const { user_id } = await params

  const reviews = await prisma.review.findMany({
    where: {
      target_user_id: user_id,
      status: "COMPLETED",
      rating: {
        not: null,
      },
    },
  })

  const total_reviews = reviews.length
    // Esta constante representa la suma total de las calificaciones 
    // de las reseñas, considerando que algunas pueden no tener calificación (rating) 
    // y en ese caso se sumaría 0.
    // acc representa un acumulador que se va actualizando con cada iteración del reduce,
    // y review representa cada reseña individual en la iteración actual.
    const sum = reviews.reduce(
    (acc: number, review: any) => acc + (review.rating || 0),
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