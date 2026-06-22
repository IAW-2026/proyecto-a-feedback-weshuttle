import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    // 1. Parse query parameters
    const { searchParams } = new URL(req.url)
    const startDateParam = searchParams.get("start_date")
    const endDateParam = searchParams.get("end_date")

    let startDate: Date
    let endDate: Date

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

    // 2. Database Queries for Aggregates

    // Driver Ratings Metrics (recipient is driver, status = COMPLETED)
    const driverAvg = await prisma.review.aggregate({
      _avg: { rating: true },
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

    // Rider Ratings Metrics (recipient is rider, status = COMPLETED)
    const riderAvg = await prisma.review.aggregate({
      _avg: { rating: true },
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

    // Completion rates
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

    const reviewCompletionRate = totalReviewsCreated > 0
      ? Number(((totalReviewsCompleted / totalReviewsCreated) * 100).toFixed(1))
      : 0

    // 3. Rating Trends (un punto por día dentro del rango de fechas recibido)
    const reviewsForTrends = await prisma.review.findMany({
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
      reviewCount: number;
      driverRatingSum: number;
      driverRatingCount: number;
      riderRatingSum: number;
      riderRatingCount: number;
    }>()

    // Initialize the daily buckets for the range
    const tempDate = new Date(startDate)
    while (tempDate <= endDate) {
      const dateStr = tempDate.toISOString().split("T")[0]
      dailyDataMap.set(dateStr, {
        date: dateStr,
        reviewCount: 0,
        driverRatingSum: 0,
        driverRatingCount: 0,
        riderRatingSum: 0,
        riderRatingCount: 0
      })
      tempDate.setDate(tempDate.getDate() + 1)
    }

    // Populate daily data based on completed_at or createdAt (using completed_at if completed, fallback to createdAt)
    reviewsForTrends.forEach((r: any) => {
      const dateKey = (r.completed_at || r.createdAt).toISOString().split("T")[0]
      const dayObj = dailyDataMap.get(dateKey)
      if (dayObj) {
        if (r.completed_at) {
          dayObj.reviewCount += 1
          if (r.rating !== null && r.rating !== undefined) {
            if (r.target_role === "driver") {
              dayObj.driverRatingSum += r.rating
              dayObj.driverRatingCount += 1
            } else if (r.target_role === "rider") {
              dayObj.riderRatingSum += r.rating
              dayObj.riderRatingCount += 1
            }
          }
        }
      }
    })

    const ratingTrends = Array.from(dailyDataMap.values()).map(day => ({
      date: day.date,
      avgDriverRating: day.driverRatingCount > 0
        ? Number((day.driverRatingSum / day.driverRatingCount).toFixed(1))
        : null,
      avgPassengerRating: day.riderRatingCount > 0
        ? Number((day.riderRatingSum / day.riderRatingCount).toFixed(1))
        : null,
      reviewCount: day.reviewCount
    }))

    // 4. Worst Reviews (reseñas con rating ≤ 2, ordenadas de más reciente a más antigua)
    const worstReviewsRaw = await prisma.review.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: "COMPLETED",
        rating: { lte: 2, not: null }
      },
      include: {
        author: {
          select: { name: true }
        },
        recipient: {
          select: { name: true }
        },
        reports: {
          select: { id: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    const worstReviews = worstReviewsRaw.map((r: any) => {
      const authorRoleMapped = r.author_role === "rider" ? "Rider" : r.author_role === "driver" ? "Driver" : "Admin"
      const recipientRoleMapped = r.target_role === "rider" ? "Rider" : r.target_role === "driver" ? "Driver" : "Admin"
      const dateStr = (r.completed_at || r.createdAt).toISOString().split("T")[0]

      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment || "",
        author: r.author?.name || "Usuario Desconocido",
        authorRole: authorRoleMapped,
        recipient: r.recipient?.name || "Usuario Desconocido",
        recipientRole: recipientRoleMapped,
        date: dateStr,
        reported: r.reports.length > 0
      }
    })

    // 5. Construct response
    const averageDriverRating = driverAvg._avg.rating !== null
      ? Number(driverAvg._avg.rating.toFixed(1))
      : null

    const averagePassengerRating = riderAvg._avg.rating !== null
      ? Number(riderAvg._avg.rating.toFixed(1))
      : null

    return NextResponse.json({
      averageDriverRating,
      averagePassengerRating,
      reviewCompletionRate,
      totalReviews: totalReviewsCreated,
      ratingTrends,
      worstReviews
    })

  } catch (error) {
    console.error("METRICS_API_ERROR:", error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch analytics metrics" },
      { status: 500 }
    )
  }
}
