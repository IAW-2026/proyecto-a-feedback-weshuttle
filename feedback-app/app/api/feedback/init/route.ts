import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const body = await req.json()

  const {
    pool_id,
    conductor_id,
    pasajeros_ids,
  } = body

  const reviews = await Promise.all(

    pasajeros_ids.map((pasajeroId: string) => {

      return prisma.review.create({
        data: {
          pool_id,

          autor_id: pasajeroId,
          destinatario_id: conductor_id,

          estado_reseña: "PENDING",
        },
      })

    })

  )

  return Response.json({
    status: "PENDING_REVIEWS_CREATED",
    cantidad: reviews.length,
    notificaciones_enviadas: false,
  })
}