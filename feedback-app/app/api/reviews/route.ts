// --> GET /api/reviews

import { prisma } from "@/lib/prisma"

type ReviewRole = "driver" | "rider"

function normalizeUserRole(role: ReviewRole) {
  return role === "driver" ? "DRIVER" : "PASSENGER"
}

export async function GET() {

  const reviews = await prisma.review.findMany()

  return Response.json(reviews)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

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
      !pool_id ||
      !author_user_id ||
      !target_user_id ||
      typeof rating !== "number" ||
      Number.isNaN(rating)
    ) {
      return new Response("Missing required fields", { status: 400 })
    }

    const completedAt = trip_date ? new Date(trip_date) : new Date()

    await prisma.user.upsert({
      where: { id: author_user_id },
      update: { role: normalizeUserRole(author_role) },
      create: {
        id: author_user_id,
        name: null,
        role: normalizeUserRole(author_role),
      },
    })

    await prisma.user.upsert({
      where: { id: target_user_id },
      update: { role: normalizeUserRole(target_role) },
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