import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    // 1. Auth check
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    if (user.role !== "admin") {
      return new Response("Forbidden", { status: 403 })
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url)
    const startDateParam = searchParams.get("start_date")
    const endDateParam = searchParams.get("end_date")

    let startDate: Date
    let endDate: Date

    // Default to last 15 days if not provided or invalid
    const now = new Date()
    if (startDateParam) {
      const parsed = new Date(startDateParam)
      if (Number.isNaN(parsed.getTime())) {
        startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      } else {
        startDate = parsed
      }
    } else {
      startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
    }

    if (endDateParam) {
      const parsed = new Date(endDateParam)
      if (Number.isNaN(parsed.getTime())) {
        endDate = now
      } else {
        endDate = parsed
      }
    } else {
      endDate = now
    }

    // Adjust dates to cover the entire start and end day
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    // 3. Database Queries

    // Driver Ratings Metrics (where recipient is driver, status = COMPLETED)
    const driverAvgAndCount = await prisma.review.aggregate({
      _avg: {
        rating: true
      },
      _count: {
        id: true
      },
      where: {
        target_role: "driver",
        status: "COMPLETED",
        rating: { not: null },
        completed_at: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Rider Ratings Metrics (where recipient is rider, status = COMPLETED)
    const riderAvgAndCount = await prisma.review.aggregate({
      _avg: {
        rating: true
      },
      _count: {
        id: true
      },
      where: {
        target_role: "rider",
        status: "COMPLETED",
        rating: { not: null },
        completed_at: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Review completion rates
    // Total reviews pre-created/pending in the period (excluding status REMOVED)
    const totalReviewsCreated = await prisma.review.count({
      where: {
        status: { not: "REMOVED" },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const totalReviewsCompleted = await prisma.review.count({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const completion_rate_pct = totalReviewsCreated > 0 
      ? Number(((totalReviewsCompleted / totalReviewsCreated) * 100).toFixed(1))
      : null

    // Top Flagged / Critical Reviews (rating <= 2 OR has reports associated)
    const flaggedReviews = await prisma.review.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        OR: [
          { rating: { lte: 2 } },
          { reports: { some: {} } }
        ]
      },
      include: {
        author: {
          select: {
            name: true,
            role: true
          }
        },
        recipient: {
          select: {
            name: true,
            role: true
          }
        },
        reports: {
          select: {
            id: true,
            type: true,
            description: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    })

    // Construct response
    const average_driver_stars = driverAvgAndCount._avg.rating !== null 
      ? Number(driverAvgAndCount._avg.rating.toFixed(2)) 
      : null

    const average_rider_stars = riderAvgAndCount._avg.rating !== null 
      ? Number(riderAvgAndCount._avg.rating.toFixed(2)) 
      : null

    return NextResponse.json({
      summary: {
        average_driver_stars,
        average_rider_stars,
        completion_rate_pct,
        total_reviews_created: totalReviewsCreated,
        total_reviews_completed: totalReviewsCompleted,
        total_driver_reviews: driverAvgAndCount._count.id,
        total_rider_reviews: riderAvgAndCount._count.id,
      },
      top_flagged_reviews: flaggedReviews.map((r: any) => ({
        id: r.id,
        pool_id: r.pool_id,
        reservation_id: r.reservation_id,
        author_user_id: r.author_user_id,
        author_name: r.author?.name || null,
        author_role: r.author_role,
        target_user_id: r.target_user_id,
        target_name: r.recipient?.name || null,
        target_role: r.target_role,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        completed_at: r.completed_at,
        created_at: r.createdAt,
        reports_count: r.reports.length,
        reports: r.reports
      }))
    })

  } catch (error) {
    console.error("METRICS_API_ERROR:", error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch analytics metrics" },
      { status: 500 }
    )
  }
}
