// --> POST /reviews/precreate

import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {

  const body = await req.json()
  console.log("BODY:", body)

  const {
    pool_id,
    driver_user_id,
  } = body

  console.log("DRIVER USER ID:", driver_user_id)

  // Verificamos si ya existen reviews
  const existingReviews = await prisma.review.findFirst({
    where: {
      pool_id,
    },
  })

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
  const paidPassengers = [
    { passenger_user_id: "user_1" },
    { passenger_user_id: "user_2" },
  ]

  // Crear conductor si no existe
  await prisma.user.upsert({
    where: {
      id: driver_user_id,
    },
    update: {},
    create: {
      id: driver_user_id,
      role: "DRIVER",
    },
  })

  // 🔥 Crear pasajeros si no existen
  for (const passenger of paidPassengers) {

    await prisma.user.upsert({
      where: {
        id: passenger.passenger_user_id,
      },
      update: {},
      create: {
        id: passenger.passenger_user_id,
        role: "PASSENGER",
      },
    })
  }

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