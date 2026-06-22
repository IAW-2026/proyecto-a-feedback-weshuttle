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

    // --- 4. Additional Analytics Data ---

    // 4.1. Historical daily data (created/completed reviews and daily ratings)
    const reviewsForHistory = await prisma.review.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: { not: "REMOVED" }
      },
      select: {
        createdAt: true,
        completed_at: true,
        rating: true,
        target_role: true
      }
    })

    const dailyDataMap = new Map<string, {
      date: string;
      created_count: number;
      completed_count: number;
      driver_rating_sum: number;
      driver_rating_count: number;
      rider_rating_sum: number;
      rider_rating_count: number;
    }>()

    // Initialize the daily buckets for the range
    const tempDate = new Date(startDate)
    while (tempDate <= endDate) {
      const dateStr = tempDate.toISOString().split("T")[0]
      dailyDataMap.set(dateStr, {
        date: dateStr,
        created_count: 0,
        completed_count: 0,
        driver_rating_sum: 0,
        driver_rating_count: 0,
        rider_rating_sum: 0,
        rider_rating_count: 0
      })
      tempDate.setDate(tempDate.getDate() + 1)
    }

    // Populate daily data
    reviewsForHistory.forEach((r: any) => {
      const createdStr = r.createdAt.toISOString().split("T")[0]
      const dayObj = dailyDataMap.get(createdStr)
      if (dayObj) {
        dayObj.created_count += 1
        if (r.completed_at) {
          dayObj.completed_count += 1
        }
        if (r.rating !== null && r.rating !== undefined) {
          if (r.target_role === "driver") {
            dayObj.driver_rating_sum += r.rating
            dayObj.driver_rating_count += 1
          } else if (r.target_role === "rider") {
            dayObj.rider_rating_sum += r.rating
            dayObj.rider_rating_count += 1
          }
        }
      }
    })

    const daily_metrics = Array.from(dailyDataMap.values()).map(day => ({
      date: day.date,
      created_count: day.created_count,
      completed_count: day.completed_count,
      average_driver_rating: day.driver_rating_count > 0 
        ? Number((day.driver_rating_sum / day.driver_rating_count).toFixed(2)) 
        : null,
      average_rider_rating: day.rider_rating_count > 0 
        ? Number((day.rider_rating_sum / day.rider_rating_count).toFixed(2)) 
        : null
    }))

    // 4.2. Star rating distribution (COMPLETED reviews in range)
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      _count: {
        id: true
      },
      where: {
        status: "COMPLETED",
        rating: { not: null },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const ratings_distribution = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0
    } as Record<string, number>

    ratingDistribution.forEach((group: any) => {
      if (group.rating !== null) {
        ratings_distribution[group.rating.toString()] = group._count.id
      }
    })

    // 4.3. Report type distribution (reports created in range)
    const reportDistribution = await prisma.report.groupBy({
      by: ['type'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const reports_distribution = {
      SPAM: 0,
      CONTENIDO_OFENSIVO: 0,
      INFORMACION_FALSA: 0,
      DATOS_PERSONALES: 0,
      OTROS: 0
    } as Record<string, number>

    reportDistribution.forEach((group: any) => {
      reports_distribution[group.type] = group._count.id
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
      ratings_distribution,
      reports_distribution,
      daily_metrics,
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
