import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type ReviewRole = "driver" | "rider"

export type CreateAdminReviewInput = {
  pool_id: string
  reservation_id?: string | null
  author_user_id: string
  author_role: ReviewRole
  target_user_id: string
  target_role: ReviewRole
  author_name?: string | null
  target_name?: string | null
  rating: number
  comment?: string | null
  trip_date?: string | Date | null
}

function normalizeRole(role: ReviewRole) {
  return role === "driver" ? "driver" : "rider"
}

function parseTripDate(tripDate: string | Date | null | undefined) {
  if (!tripDate) {
    return new Date()
  }

  const parsed = tripDate instanceof Date ? tripDate : new Date(tripDate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function createAdminReview(input: CreateAdminReviewInput) {
  if (
    typeof input.pool_id !== "string" ||
    !input.pool_id.trim() ||
    typeof input.author_user_id !== "string" ||
    !input.author_user_id.trim() ||
    typeof input.target_user_id !== "string" ||
    !input.target_user_id.trim() ||
    (input.author_role !== "driver" && input.author_role !== "rider") ||
    (input.target_role !== "driver" && input.target_role !== "rider") ||
    input.author_role === input.target_role ||
    typeof input.rating !== "number" ||
    Number.isNaN(input.rating) ||
    input.rating < 1 ||
    input.rating > 5 ||
    (typeof input.comment !== "undefined" &&
      input.comment !== null &&
      typeof input.comment !== "string")
  ) {
    throw new Error("INVALID_REVIEW_PAYLOAD")
  }

  if (input.author_user_id === input.target_user_id) {
    throw new Error("AUTHOR_AND_TARGET_MUST_DIFFER")
  }

  const completedAt = parseTripDate(input.trip_date)

  if (!completedAt) {
    throw new Error("INVALID_TRIP_DATE")
  }

  const authorName = input.author_name?.trim() ?? null
  const targetName = input.target_name?.trim() ?? null

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.upsert({
      where: { id: input.author_user_id },
      update: {
        name: authorName ?? undefined,
      },
      create: {
        id: input.author_user_id,
        name: authorName,
        role: normalizeRole(input.author_role),
      },
    })

    await tx.user.upsert({
      where: { id: input.target_user_id },
      update: {
        name: targetName ?? undefined,
      },
      create: {
        id: input.target_user_id,
        name: targetName,
        role: normalizeRole(input.target_role),
      },
    })

    return tx.review.create({
      data: {
        pool_id: input.pool_id,
        reservation_id: input.reservation_id ?? null,
        author_user_id: input.author_user_id,
        author_role: input.author_role,
        target_user_id: input.target_user_id,
        target_role: input.target_role,
        rating: input.rating,
        comment: input.comment ?? null,
        status: "COMPLETED",
        enabled_at: completedAt,
        completed_at: completedAt,
      },
      include: {
        author: true,
        recipient: true,
      },
    })
  })
}

export type CreatedAdminReview = Awaited<
  ReturnType<typeof createAdminReview>
>