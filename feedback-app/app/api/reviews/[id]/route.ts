// --> PATCH /reviews/:id
// Una vez que el pasajero o conductor recibe la reseña "PRECREATED", 
// puede completarla con calificación y comentario, lo que actualiza su estado a "COMPLETED" desde acá
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {

  const body = await req.json()

  const review = await prisma.review.update({
    where: {
      id: params.id,
    },

    data: {
      calificacion: body.calificacion,
      comentario: body.comentario,

      estado_reseña: "COMPLETED",
    },
  })

  return Response.json(review)
}