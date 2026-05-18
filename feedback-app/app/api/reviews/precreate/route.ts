// --> POST /reviews/precreate

import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {

  const body = await req.json()

  const {
    pool_id,
    driver_user_id,
    started_at,
  } = body

  // Validamos si ya existen reviews para este pool
  const existingReviews = await prisma.review.findFirst({
    where: {
      pool_id,
    },
  })

  // Si ya existen, devolvemos 409
  if (existingReviews) {

    return Response.json(
      {
        error: "Las reviews ya fueron precreadas para este pool",
      },

      {
        status: 409,
      }
    )
  }

  // MOCK TEMPORAL
  // despues esto viene de Rider App
  const paidPassengers = [
    { passenger_user_id: "user_1" },
    { passenger_user_id: "user_2" },
  ]

  const reviewsToCreate = []

  for (const passenger of paidPassengers) {

    // pasajero -> conductor
    reviewsToCreate.push({
      pool_id,

      autor_id: passenger.passenger_user_id,
      destinatario_id: driver_user_id,

      estado_reseña: "PRECREATED",
    })

    // conductor -> pasajero
    reviewsToCreate.push({
      pool_id,

      autor_id: driver_user_id,
      destinatario_id: passenger.passenger_user_id,

      estado_reseña: "PRECREATED",
    })
  }

  await prisma.review.createMany({
    data: reviewsToCreate,
  })

  return Response.json({
    pool_id,
    review_status: "PRECREATED",
    paid_passengers_count: paidPassengers.length,
    created_reviews: reviewsToCreate.length,
  })
}