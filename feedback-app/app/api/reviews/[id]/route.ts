// --> PATCH /reviews/:id
// Una vez que el pasajero o conductor recibe la reseña "PRECREATED", 
// puede completarla con calificación y comentario, lo que actualiza su estado a "COMPLETED" desde acá
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, context: any) {
  const params = await context.params  // 👈 CLAVE

  const body = await req.json()

  if (!params?.id) {
    return new Response("Missing id", { status: 400 })
  }

  try {
    // Allow admin updates when `admin: true` is present in the body.
    const updateData: any = {}

    if (typeof body.rating !== "undefined") updateData.rating = body.rating
    if (typeof body.comment !== "undefined") updateData.comment = body.comment

    if (body.admin) {
      // Admin can set arbitrary status
      if (body.status) {
        updateData.status = body.status
        if (body.status === "COMPLETED") {
          updateData.completed_at = new Date()
        }
      }
    } else {
      // Default client behavior: completing the review
      updateData.status = "COMPLETED"
      updateData.completed_at = new Date()
    }

    const review = await prisma.review.update({
      where: { id: params.id },
      data: updateData,
    })

    return Response.json(review)
  } catch (error) {
    console.error("PRISMA ERROR:", error)
    return new Response("Prisma update failed", { status: 500 })
  }
}

export async function DELETE(req: Request, context: any) {
  const params = await context.params

  if (!params?.id) {
    return new Response("Missing id", { status: 400 })
  }

  try {
    await prisma.review.delete({ where: { id: params.id } })
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("PRISMA DELETE ERROR:", error)
    return new Response("Prisma delete failed", { status: 500 })
  }
}