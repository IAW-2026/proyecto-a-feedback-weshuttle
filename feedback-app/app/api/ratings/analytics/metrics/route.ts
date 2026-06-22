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

    // Argentina is always UTC-3 (no DST offset since 2009)
    const ARG_OFFSET_MS = -3 * 60 * 60 * 1000

    if (startDateParam) {
      // Input is YYYY-MM-DD
      // Parse as UTC first, e.g. "2026-06-21T00:00:00.000Z"
      const parsed = new Date(`${startDateParam}T00:00:00.000Z`)
      if (Number.isNaN(parsed.getTime())) {
        // Fallback: 15 days ago in Argentina
        const fallback = new Date(Date.now() + ARG_OFFSET_MS)
        fallback.setUTCDate(fallback.getUTCDate() - 15)
        startDate = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate(), 3, 0, 0, 0))
      } else {
        // Argentina 00:00:00 is UTC 03:00:00 of the same day
        startDate = new Date(parsed.getTime() + 3 * 60 * 60 * 1000)
      }
    } else {
      // Fallback: 15 days ago in Argentina
      const fallback = new Date(Date.now() + ARG_OFFSET_MS)
      fallback.setUTCDate(fallback.getUTCDate() - 15)
      startDate = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate(), 3, 0, 0, 0))
    }

    if (endDateParam) {
      const parsed = new Date(`${endDateParam}T00:00:00.000Z`)
      if (Number.isNaN(parsed.getTime())) {
        // Fallback: today in Argentina
        const fallback = new Date(Date.now() + ARG_OFFSET_MS)
        endDate = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate() + 1, 2, 59, 59, 999))
      } else {
        // Argentina 23:59:59.999 is UTC 02:59:59.999 of the next day
        endDate = new Date(parsed.getTime() + 27 * 60 * 60 * 1000 - 1)
      }
    } else {
      // Fallback: today in Argentina
      const fallback = new Date(Date.now() + ARG_OFFSET_MS)
      endDate = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate() + 1, 2, 59, 59, 999))
    }

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

    const completedCreatedInPeriod = await prisma.review.count({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const reviewCompletionRate = totalReviewsCreated > 0
      ? Number(((completedCreatedInPeriod / totalReviewsCreated) * 100).toFixed(1))
      : 0

    // Total reviews completed during the period (used for absolute counts and metrics)
    const totalReviewsCompleted = await prisma.review.count({
      where: {
        status: "COMPLETED",
        completed_at: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 3. Rating Trends (un punto por día dentro del rango de fechas recibido)
    const reviewsForTrends = await prisma.review.findMany({
      where: {
        OR: [
          {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            completed_at: {
              gte: startDate,
              lte: endDate
            }
          }
        ],
        status: { not: "REMOVED" }
      },
      select: {
        createdAt: true,
        completed_at: true,
        rating: true,
        target_role: true
      }
    })

    // Helper to convert Date to Argentina Time for UTC calculations
    const toArgentina = (date: Date) => {
      return new Date(date.getTime() - 3 * 60 * 60 * 1000)
    }

    const getArgentinaDateStr = (date: Date) => {
      return toArgentina(date).toISOString().split("T")[0]
    }

    const isSingleDay = getArgentinaDateStr(startDate) === getArgentinaDateStr(endDate);
    const diffMs = endDate.getTime() - startDate.getTime();
    const isHourlyGrouping = diffMs <= 1.5 * 24 * 60 * 60 * 1000; // <= 36 hours (e.g., today)

    const dailyDataMap = new Map<string, {
      date: string;
      reviewCount: number;
      driverRatingSum: number;
      driverRatingCount: number;
      riderRatingSum: number;
      riderRatingCount: number;
    }>()

    // Initialize the buckets (using UTC consistently with Argentina offset to avoid timezone discrepancies)
    if (isHourlyGrouping) {
      if (isSingleDay) {
        // Initialize 24 hourly buckets for a single day: "00:00", "01:00", ...
        for (let h = 0; h < 24; h++) {
          const hourStr = `${h.toString().padStart(2, "0")}:00`;
          dailyDataMap.set(hourStr, {
            date: hourStr,
            reviewCount: 0,
            driverRatingSum: 0,
            driverRatingCount: 0,
            riderRatingSum: 0,
            riderRatingCount: 0
          });
        }
      } else {
        // Hourly buckets across 2 days (every 2 hours to avoid X-axis clutter)
        const temp = toArgentina(startDate);
        const tempEnd = toArgentina(endDate);
        while (temp <= tempEnd) {
          const day = temp.getUTCDate().toString().padStart(2, "0");
          const month = (temp.getUTCMonth() + 1).toString().padStart(2, "0");
          const hour = temp.getUTCHours().toString().padStart(2, "0");
          const label = `${day}/${month} ${hour}:00`;
          dailyDataMap.set(label, {
            date: label,
            reviewCount: 0,
            driverRatingSum: 0,
            driverRatingCount: 0,
            riderRatingSum: 0,
            riderRatingCount: 0
          });
          temp.setUTCHours(temp.getUTCHours() + 2);
        }
      }
    } else {
      // Initialize daily buckets YYYY-MM-DD
      const tempDate = toArgentina(startDate)
      const tempEnd = toArgentina(endDate)
      while (tempDate <= tempEnd) {
        const dateStr = tempDate.toISOString().split("T")[0]
        dailyDataMap.set(dateStr, {
          date: dateStr,
          reviewCount: 0,
          driverRatingSum: 0,
          driverRatingCount: 0,
          riderRatingSum: 0,
          riderRatingCount: 0
        })
        tempDate.setUTCDate(tempDate.getUTCDate() + 1)
      }
    }

    // Populate daily/hourly data based on completed_at or createdAt (using UTC to match buckets)
    reviewsForTrends.forEach((r: any) => {
      const dateObj = r.completed_at || r.createdAt;
      if (!dateObj) return;

      let dateKey = "";
      if (isHourlyGrouping) {
        if (isSingleDay) {
          const hour = toArgentina(dateObj).getUTCHours();
          dateKey = `${hour.toString().padStart(2, "0")}:00`;
        } else {
          const argDate = toArgentina(dateObj);
          const day = argDate.getUTCDate().toString().padStart(2, "0");
          const month = (argDate.getUTCMonth() + 1).toString().padStart(2, "0");
          const hourVal = argDate.getUTCHours();
          const nearest2Hour = Math.floor(hourVal / 2) * 2;
          dateKey = `${day}/${month} ${nearest2Hour.toString().padStart(2, "0")}:00`;
        }
      } else {
        dateKey = toArgentina(dateObj).toISOString().split("T")[0];
      }

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
        completed_at: {
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
      const dateStr = toArgentina(r.completed_at || r.createdAt).toISOString().split("T")[0]

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
      totalReviews: totalReviewsCompleted,
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
