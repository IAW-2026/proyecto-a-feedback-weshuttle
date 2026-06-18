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

  if (user.role !== "driver") {
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

    <div className="ws-page">

      <Navbar role={user.role} displayName={user.name} />

      <main className="ws-container">

        {/* HERO */}

        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm text-[var(--ws-slate)] mb-4 font-semibold tracking-wide uppercase">
              WeShuttle Driver Dashboard
            </p>

            <h1 className="text-[32px] sm:text-5xl font-black tracking-tight max-w-4xl leading-[0.95] mb-5 text-[var(--ws-midnight)]">
              Mis viajes.
            </h1>

            <p className="text-lg text-[var(--ws-slate)] max-w-2xl leading-relaxed">
              Cada viaje contiene todas las reseñas asociadas a ese pool.
            </p>

          </div>

          <Link
            href="/dashboard/driver"
            className="ws-secondary-button"
          >
            Volver al inicio
          </Link>

        </section>

        {/* STATS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">

          <div className="ws-card ws-card-pad">

            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Viajes con feedback
            </p>

            <p className="text-4xl font-black tracking-tight text-[var(--ws-midnight)]">
              {totalTrips}
            </p>

          </div>

          <div className="ws-card ws-card-pad">

            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Reseñas recibidas
            </p>

            <p className="text-4xl font-black tracking-tight text-[var(--ws-midnight)]">
              {totalReviews}
            </p>

          </div>

          <div className="ws-card ws-card-pad">

            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Promedio general
            </p>

            <p className="text-4xl font-black tracking-tight text-[var(--ws-midnight)]">
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

                  <article className="ws-card ws-card-large transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(10,25,47,0.1)]">

                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                      <div>

                        <div className="flex items-center gap-3 mb-3">

                          <span className="ws-pill ws-pill-info uppercase tracking-wider">
                            Viaje #{groupedTrips.length - index}
                          </span>

                          <span className="text-neutral-400">
                            •
                          </span>

                          <p className="text-sm text-[var(--ws-slate)]">
                            Pool ID: {trip.poolId}
                          </p>

                        </div>

                        <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
                          {formatTripKeyDate(trip.tripDate)}
                        </h2>

                        <p className="text-[var(--ws-slate)] leading-relaxed"> 
                          Ver opiniones y feedback de pasajeros.
                        </p>

                      </div>

                      <div className="flex gap-3">

                        <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">

                          <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">
                            Reviews
                          </p>

                          <p className="text-2xl font-black text-[var(--ws-midnight)]">
                            {trip.reviews.length}
                          </p>

                        </div>

                        <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">

                          <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">
                            Promedio
                          </p>

                          <p className="text-2xl font-black text-[var(--ws-success)]">
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

          <section className="ws-card ws-card-large">

            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Aún no hay viajes para mostrar
            </p>

            <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
              Cuando lleguen reseñas, van a aparecer agrupadas acá.
            </h2>

            <p className="text-[var(--ws-slate)] leading-relaxed max-w-2xl">
              Generá un viaje de prueba desde el dashboard.
            </p>

          </section>

        )}

      </main>

    </div>

  )
}