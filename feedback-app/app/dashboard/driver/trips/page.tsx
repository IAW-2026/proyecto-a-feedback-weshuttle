// app/dashboard/driver/trips/page.tsx

import Link from "next/link"
import { redirect } from "next/navigation"

import Navbar from "../../../components/NavBar"
import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "../../../../lib/prisma"

type DriverTripReview = {
  id: string
  pool_id: string
  rating: number | null
  createdAt: Date
  enabled_at: Date | null
  completed_at: Date | null
}

type TripGroup = {
  poolId: string
  tripDate: Date
  reviews: DriverTripReview[]
}

async function getCompletedDriverReviews(userId: string) {
  try {
    return await prisma.review.findMany({
      where: {
        target_user_id: userId,
        status: "COMPLETED",
      },

      orderBy: [
        {
          enabled_at: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    })

  } catch (error) {
    console.error(error)
    return []
  }
}

function formatTripKeyDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
  }).format(date)
}

function groupReviewsByTrip(reviews: DriverTripReview[]) {

  const groups = new Map<string, TripGroup>()

  for (const review of reviews) {

    const tripDate =
      review.enabled_at ??
      review.completed_at ??
      review.createdAt

    const existingGroup = groups.get(review.pool_id)

    if (!existingGroup) {

      groups.set(review.pool_id, {
        poolId: review.pool_id,
        tripDate,
        reviews: [review],
      })

      continue
    }

    existingGroup.reviews.push(review)

    if (
      tripDate.getTime() >
      existingGroup.tripDate.getTime()
    ) {
      existingGroup.tripDate = tripDate
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) =>
      b.tripDate.getTime() -
      a.tripDate.getTime()
  )
}

export default async function DriverTripsPage() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "DRIVER") {
    redirect("/dashboard")
  }

  const reviews =
    await getCompletedDriverReviews(user.id)

  const groupedTrips =
    groupReviewsByTrip(
      reviews as DriverTripReview[]
    )

  const totalReviews = reviews.length

  const totalTrips = groupedTrips.length

  const averageRating =
    totalReviews > 0
      ? (
          reviews.reduce(
            (acc: number, review: DriverTripReview) =>
              acc + (review.rating || 0),
            0
          ) / totalReviews
        ).toFixed(1)
      : "0.0"

  return (

    <div className="min-h-screen bg-[#f6f6f6] text-black">

      <Navbar role={user.role} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* HERO */}

        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm text-neutral-500 mb-4">
              WeShuttle Driver Dashboard
            </p>

            <h1 className="text-5xl sm:text-6xl font-black tracking-tight max-w-4xl leading-[0.95] mb-5">
              Mis viajes.
            </h1>

            <p className="text-lg text-neutral-600 max-w-2xl leading-relaxed">
              Cada viaje contiene todas las reseñas asociadas a ese pool.
            </p>

          </div>

          <Link
            href="/dashboard/driver"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-5 py-3 text-sm font-bold transition-colors hover:bg-slate-800"
          >
            Volver al dashboard
          </Link>

        </section>

        {/* STATS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">

          <div className="bg-white rounded-[28px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Viajes con feedback
            </p>

            <p className="text-4xl font-black tracking-tight">
              {totalTrips}
            </p>

          </div>

          <div className="bg-white rounded-[28px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Reseñas recibidas
            </p>

            <p className="text-4xl font-black tracking-tight">
              {totalReviews}
            </p>

          </div>

          <div className="bg-white rounded-[28px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Promedio general
            </p>

            <p className="text-4xl font-black tracking-tight">
              {averageRating}★
            </p>

          </div>

        </section>

        {/* TRIPS */}

        {groupedTrips.length > 0 ? (

          <section className="space-y-6">

            {groupedTrips.map((trip, index) => {

              const average =
                (
                  trip.reviews.reduce(
                    (a, b) => a + (b.rating || 0),
                    0
                  ) / trip.reviews.length
                ).toFixed(1)

              return (

                <Link
                  key={trip.poolId}
                  href={`/dashboard/driver/trips/${trip.poolId}`}
                  className="block"
                >

                  <article className="bg-white rounded-[28px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1">

                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                      <div>

                        <div className="flex items-center gap-3 mb-3">

                          <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                            Viaje #{groupedTrips.length - index}
                          </span>

                          <span className="text-neutral-400">
                            •
                          </span>

                          <p className="text-sm text-neutral-500">
                            Pool ID: {trip.poolId}
                          </p>

                        </div>

                        <h2 className="text-3xl font-black tracking-tight mb-3">
                          {formatTripKeyDate(trip.tripDate)}
                        </h2>

                        <p className="text-neutral-600 leading-relaxed">
                          Ver opiniones y feedback de pasajeros.
                        </p>

                      </div>

                      <div className="flex gap-3">

                        <div className="bg-[#f6f6f6] rounded-2xl px-5 py-4">

                          <p className="text-xs text-neutral-500 mb-1">
                            Reviews
                          </p>

                          <p className="text-2xl font-black">
                            {trip.reviews.length}
                          </p>

                        </div>

                        <div className="bg-[#f6f6f6] rounded-2xl px-5 py-4">

                          <p className="text-xs text-neutral-500 mb-1">
                            Promedio
                          </p>

                          <p className="text-2xl font-black text-green-600">
                            {average}★
                          </p>

                        </div>

                      </div>

                    </div>

                  </article>

                </Link>

              )
            })}

          </section>

        ) : (

          <section className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Aún no hay viajes para mostrar
            </p>

            <h2 className="text-3xl font-black tracking-tight mb-3">
              Cuando lleguen reseñas, van a aparecer agrupadas acá.
            </h2>

            <p className="text-neutral-600 leading-relaxed max-w-2xl">
              Generá un viaje de prueba desde el dashboard.
            </p>

          </section>

        )}

      </main>

    </div>

  )
}