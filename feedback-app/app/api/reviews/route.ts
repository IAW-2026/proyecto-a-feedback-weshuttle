// --> GET /api/reviews

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

type ReviewRole = "driver" | "rider"

function normalizeUserRole(role: ReviewRole) {
  return role === "driver" ? "DRIVER" : "PASSENGER"
}

function parseTripDate(tripDate: unknown) {
  if (typeof tripDate === "undefined" || tripDate === null || tripDate === "") {
    return new Date()
  }

  if (typeof tripDate !== "string") {
    return null
  }

  const parsed = new Date(tripDate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isReviewRole(value: unknown): value is ReviewRole {
  return value === "driver" || value === "rider"
}

export async function GET() {

  const user = await getCurrentUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  if (user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 })
  }

  const reviews = await prisma.review.findMany()

  return Response.json(reviews)
}

// Crea reseña nueva manualmente, sin necesidad de que exista una pre-creada. Solo para admins.
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return new Response("Forbidden", { status: 403 })
    }

    let body: any

    try {
      body = await req.json()
    } catch {
      return new Response("Invalid JSON", { status: 400 })
    }

    const {
      pool_id,
      reservation_id,
      author_user_id,
      target_user_id,
      author_role,
      target_role,
      rating,
      comment,
      trip_date,
    } = body

    if (
      typeof pool_id !== "string" ||
      typeof author_user_id !== "string" ||
      typeof target_user_id !== "string" ||
      !isReviewRole(author_role) ||
      !isReviewRole(target_role) ||
      typeof rating !== "number" ||
      Number.isNaN(rating) ||
      rating < 1 ||
      rating > 5 ||
      (typeof comment !== "undefined" && typeof comment !== "string")
    ) {
      return new Response("Missing required fields", { status: 400 })
    }

    if (author_user_id === target_user_id) {
      return new Response("Author and target must be different", { status: 400 })
    }

    const completedAt = parseTripDate(trip_date)

    if (!completedAt) {
      return new Response("Invalid trip_date", { status: 400 })
    }

    await prisma.user.upsert({
      where: { id: author_user_id },
      update: {},
      create: {
        id: author_user_id,
        name: null,
        role: normalizeUserRole(author_role),
      },
    })

    await prisma.user.upsert({
      where: { id: target_user_id },
      update: {},
      create: {
        id: target_user_id,
        name: null,
        role: normalizeUserRole(target_role),
      },
    })

    const review = await prisma.review.create({
      data: {
        pool_id,
        reservation_id: reservation_id ?? null,
        author_user_id,
        author_role,
        target_user_id,
        target_role,
        rating,
        comment: comment ?? null,
        status: "COMPLETED",
        enabled_at: completedAt,
        completed_at: completedAt,
      },
      include: {
        author: true,
        recipient: true,
      },
    })

    return Response.json(review, { status: 201 })
  } catch (error) {
    console.error("PRISMA CREATE ERROR:", error)
    return new Response("Prisma create failed", { status: 500 })
  }
}