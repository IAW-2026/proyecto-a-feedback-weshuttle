import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

type ActivateReviewsRequestBody = {
  pool_id: string
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      )
    }

    if (user.role !== "ADMIN" && user.role !== "DRIVER") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      )
    }

    let body: ActivateReviewsRequestBody

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid JSON" },
        { status: 400 }
      )
    }

    if (typeof body.pool_id !== "string" || !body.pool_id.trim()) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Missing pool_id" },
        { status: 400 }
      )
    }

    if (user.role === "DRIVER") {
      const accessibleReview = await prisma.review.findFirst({
        where: {
          pool_id: body.pool_id,
          author_user_id: user.id,
          author_role: "driver",
          status: {
            in: ["PRECREATED", "PENDING"],
          },
        },
        select: { id: true },
      })

      if (!accessibleReview) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Pool not accessible" },
          { status: 403 }
        )
      }
    }

    const result = await prisma.review.updateMany({
      where: {
        pool_id: body.pool_id,
        status: "PRECREATED",
      },
      data: {
        status: "PENDING",
        enabled_at: new Date(),
      },
    })

    return NextResponse.json({
      pool_id: body.pool_id,
      activated_reviews: result.count,
      review_status: "PENDING",
    })
  } catch (error) {
    console.error("Error activating reviews:", error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to activate reviews" },
      { status: 500 }
    )
  }
}