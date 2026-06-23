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
    const reviewsForTrends: any[] = await prisma.review.findMany({
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
    const worstReviewsRaw: any[] = await prisma.review.findMany({
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

    const worstReviews: any[] = worstReviewsRaw.map((r: any) => {
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

    const dbUsers: any[] = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true }
    })

    const nameMap = new Map<string, string>()
    dbUsers.forEach((u: any) => nameMap.set(u.id, u.name || "Usuario Desconocido"))

    // Fetch representative comments for bad drivers
    const worstDriverComments: any[] = await prisma.review.findMany({
      where: {
        target_role: "driver",
        target_user_id: { in: topDriversBadRaw.map((d) => d.target_user_id) },
        rating: { lte: 2 },
        comment: { not: null, notIn: [""] },
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
    const worstRiderComments: any[] = await prisma.review.findMany({
      where: {
        target_role: "rider",
        target_user_id: { in: topRidersBadRaw.map((r) => r.target_user_id) },
        rating: { lte: 2 },
        comment: { not: null, notIn: [""] },
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
        .filter((c: any) => c.target_user_id === d.target_user_id)
        .map((c: any) => `(${c.rating}⭐) ${c.comment}`)
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
        .filter((c: any) => c.target_user_id === r.target_user_id)
        .map((c: any) => `(${c.rating}⭐) ${c.comment}`)
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

    const completedReviewsInPeriod: any[] = await prisma.review.findMany({
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

    completedReviewsInPeriod.forEach((r: any) => {
      if (r.completed_at) {
        const argDate = toArgentina(r.completed_at)
        const dayOfWeekIndex = argDate.getUTCDay()
        const dayName = dayNames[dayOfWeekIndex]
        dayOfWeekCounts.set(dayName, (dayOfWeekCounts.get(dayName) || 0) + 1)
      }
    })

    const dayOfWeekDistribution = Object.fromEntries(dayOfWeekCounts.entries())

    // 8. Generate Dynamic Business Insights based on ratings
    const businessInsights: string[] = []

    const averageDriverRating = driverAvg._avg.rating !== null
      ? Number(driverAvg._avg.rating.toFixed(1))
      : null

    const averagePassengerRating = riderAvg._avg.rating !== null
      ? Number(riderAvg._avg.rating.toFixed(1))
      : null

    const overallAvg = (averageDriverRating !== null && averagePassengerRating !== null)
      ? (averageDriverRating + averagePassengerRating) / 2
      : averageDriverRating || averagePassengerRating || 4.0

    // 8.1 Excellence and Anomaly by Day of Week
    const dayOfWeekRatings = new Map<string, { sum: number; count: number }>()
    dayNames.forEach((d) => dayOfWeekRatings.set(d, { sum: 0, count: 0 }))

    completedReviewsInPeriod.forEach((r: any) => {
      if (r.completed_at && r.rating !== null) {
        const argDate = toArgentina(r.completed_at)
        const dayName = dayNames[argDate.getUTCDay()]
        const current = dayOfWeekRatings.get(dayName)!
        dayOfWeekRatings.set(dayName, { sum: current.sum + r.rating, count: current.count + 1 })
      }
    })

    const dayRatings = Array.from(dayOfWeekRatings.entries())
      .filter(([_, data]) => data.count >= 2)
      .map(([day, data]) => ({ day, avg: data.sum / data.count }))

    if (dayRatings.length > 0) {
      const maxRatedDay = dayRatings.reduce((max, cur) => cur.avg > max.avg ? cur : max, dayRatings[0])
      if (maxRatedDay.avg >= 4.5) {
        businessInsights.push(`🌟 Excelencia Operativa: Los traslados los días ${maxRatedDay.day} registran la mayor satisfacción promedio con ${maxRatedDay.avg.toFixed(1)}⭐.`)
      }

      const minRatedDay = dayRatings.reduce((min, cur) => cur.avg < min.avg ? cur : min, dayRatings[0])
      if (minRatedDay.avg < 3.8 || (overallAvg && minRatedDay.avg < overallAvg - 0.5)) {
        businessInsights.push(`⚠️ Baja Satisfacción Semanal: Los traslados de los días ${minRatedDay.day} registran una calificación promedio inusualmente baja de ${minRatedDay.avg.toFixed(1)}⭐. Se sugiere auditar el servicio en estos turnos.`)
      }
    }

    // 8.2 Driver and Passenger Rating Trends (Temporal Progression)
    const midTime = startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2
    const firstHalfDriverReviews = reviewsForTrends.filter((r: any) => {
      const d = r.completed_at || r.createdAt
      return r.target_role === "driver" && r.rating !== null && d && d.getTime() < midTime
    })
    const secondHalfDriverReviews = reviewsForTrends.filter((r: any) => {
      const d = r.completed_at || r.createdAt
      return r.target_role === "driver" && r.rating !== null && d && d.getTime() >= midTime
    })

    if (firstHalfDriverReviews.length >= 3 && secondHalfDriverReviews.length >= 3) {
      const avg1 = firstHalfDriverReviews.reduce((sum: number, r: any) => sum + r.rating!, 0) / firstHalfDriverReviews.length
      const avg2 = secondHalfDriverReviews.reduce((sum: number, r: any) => sum + r.rating!, 0) / secondHalfDriverReviews.length
      if (avg2 < avg1 - 0.2) {
        businessInsights.push(`⚠️ Descenso de Calidad: La calificación promedio de los conductores bajó de ${avg1.toFixed(1)}⭐ a ${avg2.toFixed(1)}⭐ en la segunda mitad del período. Se sugiere revisar incidentes operativos recientes o el ingreso de nuevos choferes.`)
      } else if (avg2 > avg1 + 0.2) {
        businessInsights.push(`🌟 Mejora del Servicio: Excelente progreso de satisfacción de los conductores, subiendo de ${avg1.toFixed(1)}⭐ a ${avg2.toFixed(1)}⭐ en la segunda mitad del período analizado.`)
      }
    }

    // 8.3 Perception Gap
    if (averageDriverRating !== null && averagePassengerRating !== null) {
      const gap = Math.abs(averageDriverRating - averagePassengerRating)
      if (gap > 0.4) {
        const higher = averageDriverRating > averagePassengerRating ? "Conductores" : "Pasajeros"
        const lower = averageDriverRating > averagePassengerRating ? "Pasajeros" : "Conductores"
        businessInsights.push(`💡 Brecha de Percepción: Los ${higher} tienen mejor reputación promedio (${Math.max(averageDriverRating, averagePassengerRating).toFixed(1)}⭐) que los ${lower} (${Math.min(averageDriverRating, averagePassengerRating).toFixed(1)}⭐). Esto indica que un sector es percibido como más conflictivo.`)
      }
    }

    // 8.4 Critical Actors (Individual Anomalies)
    const criticalDrivers = topDriversBad.filter((d) => d.avgRating !== null && d.avgRating <= 3.5)
    if (criticalDrivers.length > 0) {
      businessInsights.push(`⚠️ Calidad de Servicio: Se identificaron ${criticalDrivers.length} conductores con reputación crítica (≤ 3.5 estrellas) en este periodo. Se sugiere contactar a los conductores y auditar sus comentarios.`)
    }

    const outstandingDrivers = topDriversGood.filter((d) => d.avgRating !== null && d.avgRating >= 4.8 && d.reviewCount >= 3)
    if (outstandingDrivers.length > 0) {
      const names = outstandingDrivers.slice(0, 2).map((d) => d.name).join(" y ")
      businessInsights.push(`🌟 Conductores Sobresalientes: ${names} lideran la calidad de servicio con calificaciones excepcionales (≥ 4.8⭐). Se sugiere considerar reconocimientos.`)
    }

    const badRiders = topRidersBad.filter((r) => r.avgRating !== null && r.avgRating <= 3.2 && r.reviewCount >= 2)
    if (badRiders.length > 0) {
      const names = badRiders.slice(0, 2).map((r) => r.name).join(" y ")
      businessInsights.push(`⚠️ Alerta de Convivencia: Los pasajeros ${names} registran calificaciones críticas por parte de los choferes (≤ 3.2⭐). Se recomienda enviar una advertencia de conducta.`)
    }

    // 8.5 Comment / Sentiment Analysis on low-rated reviews (worstReviews)
    const lowComments = worstReviews.map((r) => r.comment.toLowerCase())
    const delayKeywords = ["tarde", "demora", "retras", "demoró", "espera", "impuntual", "horario"]
    const drivingKeywords = ["manejo", "rápido", "rapido", "velocidad", "freno", "brusco", "peligro", "asusta", "cruza"]
    const cleanKeywords = ["sucio", "olor", "limpieza", "limpio", "higiene", "mugre"]
    const treatmentKeywords = ["trato", "maleducado", "maleducada", "grito", "insult", "atencion", "atención", "grosero"]

    const delayCount = lowComments.filter((c) => delayKeywords.some((k) => c.includes(k))).length
    const drivingCount = lowComments.filter((c) => drivingKeywords.some((k) => c.includes(k))).length
    const cleanCount = lowComments.filter((c) => cleanKeywords.some((k) => c.includes(k))).length
    const treatmentCount = lowComments.filter((c) => treatmentKeywords.some((k) => c.includes(k))).length

    if (delayCount >= 2) {
      businessInsights.push(`⚠️ Foco de Quejas (Demoras): Se detectaron ${delayCount} quejas sobre impuntualidad o retrasos en las calificaciones bajas de este período. Se sugiere revisar los márgenes de tolerancia de los itinerarios.`)
    }
    if (drivingCount >= 2) {
      businessInsights.push(`⚠️ Foco de Quejas (Conducción): Se registraron ${drivingCount} menciones sobre velocidad o frenado brusco. Se recomienda alertar a los choferes sobre manejo seguro.`)
    }
    if (cleanCount >= 2) {
      businessInsights.push(`⚠️ Foco de Quejas (Higiene): Hay menciones sobre el estado de limpieza o higiene de los vehículos. Se requiere auditar los estándares de limpieza antes de iniciar el pool.`)
    }
    if (treatmentCount >= 2) {
      businessInsights.push(`⚠️ Foco de Quejas (Trato): Se reportaron comportamientos rudos o descorteses (${treatmentCount} menciones). Se sugiere capacitación de atención al cliente.`)
    }

    // 8.6 Completion Rate Warning
    if (reviewCompletionRate !== null && reviewCompletionRate < 50) {
      businessInsights.push(`⚠️ Tasa de Respuesta Baja: Solo el ${reviewCompletionRate}% de las reseñas disponibles han sido completadas. Se aconseja agregar recordatorios push en la App al finalizar el viaje.`)
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
