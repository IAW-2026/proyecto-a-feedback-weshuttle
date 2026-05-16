import { prisma } from "@/lib/prisma"

export async function GET() {
  const reviews = await prisma.review.findMany()

  return Response.json(reviews)
}

export async function POST(req: Request) {
  const body = await req.json()

  const review = await prisma.review.create({
    data: {
      pool_id: body.pool_id,

      autor_id: body.autor_id,
      destinatario_id: body.destinatario_id,

      calificacion: body.calificacion,
      comentario: body.comentario,

      estado_reseña: "PENDING",
    },
  })

  return Response.json(review)
}