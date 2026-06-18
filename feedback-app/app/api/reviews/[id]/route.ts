// API interna para que admins puedan editar o eliminar 
// reseñas existentes.
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

type RouteContext = {
  params: Promise<{ id?: string }>
}

type PatchBody = {
  rating?: number
  comment?: string
  admin?: boolean
  status?: "PRECREATED" | "PENDING" | "COMPLETED"
}

function buildReviewUpdate(body: PatchBody) {
  const updateData: {
    rating?: number
    comment?: string
    status?: "PRECREATED" | "PENDING" | "COMPLETED"
    completed_at?: Date
  } = {}

  if (typeof body.rating !== "undefined") {
    updateData.rating = body.rating
  }

  if (typeof body.comment !== "undefined") {
    updateData.comment = body.comment
  }

  if (body.admin) {
    if (body.status) {
      updateData.status = body.status

      if (body.status === "COMPLETED") {
        updateData.completed_at = new Date()
      }
    }

    return updateData
  }

  updateData.status = "COMPLETED"
  updateData.completed_at = new Date()

  return updateData
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params

  if (!id) {
    return new Response("Missing id", { status: 400 })
  }

  let body: PatchBody

  try {
    body = (await req.json()) as PatchBody
  } catch {
    return new Response("Invalid JSON body", { status: 400 })
  }

  if (typeof body.rating !== "undefined" && typeof body.rating !== "number") {
    return new Response("Invalid rating", { status: 400 })
  }

  if (typeof body.comment !== "undefined" && typeof body.comment !== "string") {
    return new Response("Invalid comment", { status: 400 })
  }

  const existingReview = await prisma.review.findUnique({
    where: { id },
    select: {
      id: true,
      author_user_id: true,
      status: true,
    },
  })

  if (!existingReview) {
    return new Response("Review not found", { status: 404 })
  }

  if (body.admin) {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== "admin") {
      return new Response("Forbidden", { status: 403 })
    }
  } else {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return new Response("Unauthorized", { status: 401 })
    }

    if (currentUser.id !== existingReview.author_user_id) {
      return new Response("Forbidden", { status: 403 })
    }

    if (existingReview.status === "COMPLETED") {
      return new Response("Review already completed", { status: 409 })
    }
  }

  try {
    const review = await prisma.review.update({
      where: { id },
      data: buildReviewUpdate(body),
    })

    return Response.json(review)
  } catch (error) {
    console.error("PRISMA ERROR:", error)
    return new Response("Prisma update failed", { status: 500 })
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const { id } = await context.params

  if (!id) {
    return new Response("Missing id", { status: 400 })
  }

  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return new Response("Forbidden", { status: 403 })
  }

  try {
    await prisma.review.delete({ where: { id } })
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("PRISMA DELETE ERROR:", error)
    return new Response("Prisma delete failed", { status: 500 })
  }
}