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

    // 5. Calculate Top 5 Drivers (recipient role = driver, status = COMPLETED)
    const driverGrouped = await prisma.review.groupBy({
      by: ["target_user_id"],
      _avg: { rating: true },
      _count: { rating: true },
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

    const topDriversGoodRaw = [...driverGrouped]
      .sort((a, b) => {
        const avgA = a._avg.rating ?? 0
        const avgB = b._avg.rating ?? 0
        if (avgB !== avgA) return avgB - avgA
        return b._count.rating - a._count.rating
      })
      .slice(0, 5)

    const topDriversBadRaw = [...driverGrouped]
      .sort((a, b) => {
        const avgA = a._avg.rating ?? 5
        const avgB = b._avg.rating ?? 5
        if (avgA !== avgB) return avgA - avgB
        return b._count.rating - a._count.rating
      })
      .slice(0, 5)

    // 6. Calculate Top 5 Riders (recipient role = rider, status = COMPLETED)
    const riderGrouped = await prisma.review.groupBy({
      by: ["target_user_id"],
      _avg: { rating: true },
      _count: { rating: true },
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

    const topRidersGoodRaw = [...riderGrouped]
      .sort((a, b) => {
        const avgA = a._avg.rating ?? 0
        const avgB = b._avg.rating ?? 0
        if (avgB !== avgA) return avgB - avgA
        return b._count.rating - a._count.rating
      })
      .slice(0, 5)

    const topRidersBadRaw = [...riderGrouped]
      .sort((a, b) => {
        const avgA = a._avg.rating ?? 5
        const avgB = b._avg.rating ?? 5
        if (avgA !== avgB) return avgA - avgB
        return b._count.rating - a._count.rating
      })
      .slice(0, 5)

    // Resolve Names from local User table
    const allUserIds = Array.from(new Set([
      ...topDriversGoodRaw.map((d) => d.target_user_id),
      ...topDriversBadRaw.map((d) => d.target_user_id),
      ...topRidersGoodRaw.map((r) => r.target_user_id),
      ...topRidersBadRaw.map((r) => r.target_user_id)
    ]))

    const dbUsers = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true }
    })

    const nameMap = new Map<string, string>()
    dbUsers.forEach((u) => nameMap.set(u.id, u.name || "Usuario Desconocido"))

    // Fetch representative comments for bad drivers
    const worstDriverComments = await prisma.review.findMany({
      where: {
        target_role: "driver",
        target_user_id: { in: topDriversBadRaw.map((d) => d.target_user_id) },
        rating: { lte: 2 },
        comment: { not: null, not: "" },
        completed_at: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        target_user_id: true,
        rating: true,
        comment: true,
        completed_at: true
      },
      orderBy: { completed_at: "desc" },
      take: 15
    })

    // Fetch representative comments for bad riders
    const worstRiderComments = await prisma.review.findMany({
      where: {
        target_role: "rider",
        target_user_id: { in: topRidersBadRaw.map((r) => r.target_user_id) },
        rating: { lte: 2 },
        comment: { not: null, not: "" },
        completed_at: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        target_user_id: true,
        rating: true,
        comment: true,
        completed_at: true
      },
      orderBy: { completed_at: "desc" },
      take: 15
    })

    const topDriversGood = topDriversGoodRaw.map((d) => ({
      userId: d.target_user_id,
      name: nameMap.get(d.target_user_id) || "Usuario Desconocido",
      avgRating: d._avg.rating !== null ? Number(d._avg.rating.toFixed(2)) : null,
      reviewCount: d._count.rating
    }))

    const topDriversBad = topDriversBadRaw.map((d) => {
      const comments = worstDriverComments
        .filter((c) => c.target_user_id === d.target_user_id)
        .map((c) => `(${c.rating}⭐) ${c.comment}`)
      return {
        userId: d.target_user_id,
        name: nameMap.get(d.target_user_id) || "Usuario Desconocido",
        avgRating: d._avg.rating !== null ? Number(d._avg.rating.toFixed(2)) : null,
        reviewCount: d._count.rating,
        comments
      }
    })

    const topRidersGood = topRidersGoodRaw.map((r) => ({
      userId: r.target_user_id,
      name: nameMap.get(r.target_user_id) || "Usuario Desconocido",
      avgRating: r._avg.rating !== null ? Number(r._avg.rating.toFixed(2)) : null,
      reviewCount: r._count.rating
    }))

    const topRidersBad = topRidersBadRaw.map((r) => {
      const comments = worstRiderComments
        .filter((c) => c.target_user_id === r.target_user_id)
        .map((c) => `(${c.rating}⭐) ${c.comment}`)
      return {
        userId: r.target_user_id,
        name: nameMap.get(r.target_user_id) || "Usuario Desconocido",
        avgRating: r._avg.rating !== null ? Number(r._avg.rating.toFixed(2)) : null,
        reviewCount: r._count.rating,
        comments
      }
    })

    // 7. Calculate day of week review distribution (based on completed_at in Argentina offset)
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    const dayOfWeekCounts = new Map<string, number>()
    dayNames.forEach((d) => dayOfWeekCounts.set(d, 0))

    const completedReviewsInPeriod = await prisma.review.findMany({
      where: {
        status: "COMPLETED",
        completed_at: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        completed_at: true,
        rating: true
      }
    })

    completedReviewsInPeriod.forEach((r) => {
      if (r.completed_at) {
        const argDate = toArgentina(r.completed_at)
        const dayOfWeekIndex = argDate.getUTCDay()
        const dayName = dayNames[dayOfWeekIndex]
        dayOfWeekCounts.set(dayName, (dayOfWeekCounts.get(dayName) || 0) + 1)
      }
    })

    const dayOfWeekDistribution = Object.fromEntries(dayOfWeekCounts.entries())

    // 8. Generate Dynamic Business Insights
    const businessInsights: string[] = []

    const activeDays = Array.from(dayOfWeekCounts.entries()).filter(([_, count]) => count > 0)
    if (activeDays.length > 0) {
      const totalActiveCount = activeDays.reduce((sum, [_, count]) => sum + count, 0)
      const avgReviewsPerDay = totalActiveCount / activeDays.length

      // Find the day with the absolute minimum activity
      const minDay = activeDays.reduce((min, current) => current[1] < min[1] ? current : min, activeDays[0])
      
      // If the minimum day has less than 70% of the average daily activity, flag it
      if (minDay[1] < avgReviewsPerDay * 0.7 && totalActiveCount >= 5) {
        businessInsights.push(`💡 Patrón de Demanda: Los días ${minDay[0]} registran un volumen de viajes inusualmente bajo (solo ${minDay[1]} completados, un ${Math.round((minDay[1] / avgReviewsPerDay) * 100)}% del promedio semanal). Se sugiere incentivar reservas este día con beneficios o descuentos de Pool.`)
      }

      // Check if Thursday specifically is active and low (if minDay didn't trigger, check Jueves specifically)
      const thursdayCount = dayOfWeekCounts.get("Jueves") || 0
      if (thursdayCount > 0 && thursdayCount < avgReviewsPerDay * 0.75 && minDay[0] !== "Jueves") {
        businessInsights.push(`💡 Patrón de Demanda: Se detecta menor frecuencia de viajes los días Jueves (${thursdayCount} viajes). Se sugiere una campaña dirigida para empleados de turno tarde.`)
      }
    }

    // Insight: Critical Drivers Alert
    const criticalDrivers = topDriversBad.filter((d) => d.avgRating !== null && d.avgRating <= 3.5)
    if (criticalDrivers.length > 0) {
      businessInsights.push(`⚠️ Calidad de Servicio: Se identificaron ${criticalDrivers.length} conductores con reputación crítica (≤ 3.5 estrellas) en este periodo. Se sugiere contactar a los conductores y auditar sus comentarios.`)
    }

    // Insight: Critical Passengers (Riders) Alert
    const criticalRiders = topRidersBad.filter((r) => r.avgRating !== null && r.avgRating <= 3.5)
    if (criticalRiders.length > 0) {
      businessInsights.push(`⚠️ Convivencia en Pool: Hay ${criticalRiders.length} pasajeros reportados con calificaciones críticas por parte de los conductores. Se recomienda revisar su comportamiento para evitar conflictos en los traslados.`)
    }

    // Insight: Perception gap between Drivers and Riders
    const averageDriverRating = driverAvg._avg.rating !== null
      ? Number(driverAvg._avg.rating.toFixed(1))
      : null

    const averagePassengerRating = riderAvg._avg.rating !== null
      ? Number(riderAvg._avg.rating.toFixed(1))
      : null

    if (averageDriverRating !== null && averagePassengerRating !== null) {
      const gap = Math.abs(averageDriverRating - averagePassengerRating)
      if (gap > 0.4) {
        const higher = averageDriverRating > averagePassengerRating ? "Conductores" : "Pasajeros"
        const lower = averageDriverRating > averagePassengerRating ? "Pasajeros" : "Conductores"
        businessInsights.push(`💡 Brecha de Percepción: Los ${higher} tienen mejor reputación promedio (${Math.max(averageDriverRating, averagePassengerRating)}) que los ${lower} (${Math.min(averageDriverRating, averagePassengerRating)}). Esto indica que un sector es percibido como más conflictivo.`)
      }
    }

    // Insight: UX/Feedback rate recommendation
    if (reviewCompletionRate !== null && reviewCompletionRate < 50) {
      businessInsights.push(`⚠️ Tasa de Respuesta Baja: Solo el ${reviewCompletionRate}% de las reseñas disponibles han sido completadas. Se aconseja agregar recordatorios push en la App al finalizar el viaje.`)
    }

    // Insight: Excellence Day
    const dayOfWeekRatings = new Map<string, { sum: number; count: number }>()
    dayNames.forEach((d) => dayOfWeekRatings.set(d, { sum: 0, count: 0 }))

    completedReviewsInPeriod.forEach((r) => {
      if (r.completed_at && r.rating !== null) {
        const argDate = toArgentina(r.completed_at)
        const dayName = dayNames[argDate.getUTCDay()]
        const current = dayOfWeekRatings.get(dayName)!
        dayOfWeekRatings.set(dayName, { sum: current.sum + r.rating, count: current.count + 1 })
      }
    })

    const dayRatings = Array.from(dayOfWeekRatings.entries())
      .filter(([_, data]) => data.count > 0)
      .map(([day, data]) => ({ day, avg: data.sum / data.count }))

    if (dayRatings.length > 0) {
      const maxRatedDay = dayRatings.reduce((max, cur) => cur.avg > max.avg ? cur : max, dayRatings[0])
      if (maxRatedDay.avg >= 4.5) {
        businessInsights.push(`🌟 Excelencia Operativa: Los viajes completados los días ${maxRatedDay.day} registran la mayor satisfacción del cliente con un promedio de ${maxRatedDay.avg.toFixed(1)} estrellas.`)
      }
    }

    // 9. Return JSON payload
    return NextResponse.json({
      averageDriverRating,
      averagePassengerRating,
      reviewCompletionRate,
      totalReviews: totalReviewsCompleted,
      ratingTrends,
      worstReviews,
      topDriversGood,
      topDriversBad,
      topRidersGood,
      topRidersBad,
      dayOfWeekDistribution,
      businessInsights
    })

  } catch (error) {
    console.error("METRICS_API_ERROR:", error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch analytics metrics" },
      { status: 500 }
    )
  }
}
