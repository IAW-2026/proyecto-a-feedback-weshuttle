// app/dashboard/driver/trips/page.tsx

import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import Navbar from "../../../components/NavBar"
import DriverTripsList from "../../../components/DriverTripsList"
import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "../../../../lib/prisma"

type DriverTripReview = {
  id: string
  pool_id: string
  rating: number | null
  createdAt: Date
  enabled_at: Date | null
  completed_at: Date | null
  author: {
    id: string
    name: string | null
  } | null
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
      include: {
        author: true,
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
    timeZone: "America/Argentina/Buenos_Aires",
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
        <Suspense fallback={<div className="text-sm text-[var(--ws-slate)] animate-pulse">Cargando tus viajes...</div>}>
          <DriverTripsList initialReviews={reviews as any} />
        </Suspense>

      </main>

    </div>

  )
}