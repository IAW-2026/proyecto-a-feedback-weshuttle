import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

type ManualReviewRequestBody = {
  pool_id: string
  author_role: "driver" | "rider"
  passenger_name?: string
  target_user_id?: string
  target_user_name?: string | null
  rating: number
  comment?: string
}

type ExistingTripReview = {
  author_role: string | null
  target_role: string | null
  author_user_id: string
  target_user_id: string
}

function normalizeRole(role: "driver" | "rider") {
  return role === "driver" ? "DRIVER" : "PASSENGER"
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body: ManualReviewRequestBody = await req.json()

    if (!body.pool_id || !body.author_role || typeof body.rating !== "number") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Missing required fields" },
        { status: 400 }
      )
    }

    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid rating" },
        { status: 400 }
      )
    }

    const existingTripReviews = await prisma.review.findMany({
      where: { pool_id: body.pool_id },
      include: {
        author: true,
        recipient: true,
      },
    })

    const inferredDriver =
      existingTripReviews.find((review: ExistingTripReview) => review.author_role === "driver")?.author_user_id ??
      existingTripReviews.find((review: ExistingTripReview) => review.target_role === "driver")?.target_user_id ??
      null

    const authorUserId = user?.id ?? (body.author_role === "driver" ? inferredDriver : null)
    if (!authorUserId) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Unable to resolve author user" },
        { status: 400 }
      )
    }

    const targetUserId =
      body.author_role === "driver"
        ? body.target_user_id
        : inferredDriver

    if (!targetUserId) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Unable to resolve target user" },
        { status: 400 }
      )
    }

    const targetRole = body.author_role === "driver" ? "rider" : "driver"
    const authorRole = body.author_role
    const now = new Date()

    await prisma.user.upsert({
      where: { id: authorUserId },
      update: {
        name: body.author_role === "rider" ? body.passenger_name ?? undefined : user?.name ?? undefined,
        role: normalizeRole(authorRole),
      },
      create: {
        id: authorUserId,
        name: body.author_role === "rider" ? body.passenger_name ?? null : user?.name ?? null,
        role: normalizeRole(authorRole),
      },
    })

    await prisma.user.upsert({
      where: { id: targetUserId },
      update: {
        name: body.target_user_name ?? undefined,
        role: normalizeRole(targetRole === "driver" ? "driver" : "rider"),
      },
      create: {
        id: targetUserId,
        name: body.target_user_name ?? null,
        role: normalizeRole(targetRole === "driver" ? "driver" : "rider"),
      },
    })

    const review = await prisma.review.create({
      data: {
        pool_id: body.pool_id,
        reservation_id: null,
        author_user_id: authorUserId,
        author_role: authorRole,
        target_user_id: targetUserId,
        target_role: targetRole,
        rating: body.rating,
        comment: body.comment ?? null,
        status: "COMPLETED",
        enabled_at: now,
        completed_at: now,
      },
      include: {
        author: true,
        recipient: true,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error("Error creating manual review:", error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to create manual review" },
      { status: 500 }
    )
  }
}
