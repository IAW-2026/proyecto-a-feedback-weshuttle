import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type ActivateReviewsRequestBody = {
  pool_id: string
}

export async function POST(req: Request) {
  try {
    const body: ActivateReviewsRequestBody = await req.json()

    if (!body.pool_id) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Missing pool_id" },
        { status: 400 }
      )
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