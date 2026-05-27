// app/dashboard/driver/trips/[poolId]/page.tsx

import Link from "next/link"
import { redirect } from "next/navigation"

import Navbar from "../../../../components/NavBar"
import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "../../../../../lib/prisma"

import { Prisma } from "@prisma/client"

type ReviewWithAuthor = Prisma.ReviewGetPayload<{
  include: {
    author: true
  }
}>

type Props = {
  params: Promise<{
    poolId: string
  }>
}

async function getTripReviews(
  poolId: string,
  userId: string
): Promise<ReviewWithAuthor[]> {

  try {

    return await prisma.review.findMany({

      where: {
        pool_id: poolId,
        target_user_id: userId,
        status: "COMPLETED",
      },

      include: {
        author: true,
      },

      orderBy: [
        {
          completed_at: "desc",
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

function formatTripDate(date: Date) {

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date)

}

function formatTripKeyDate(date: Date) {

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
  }).format(date)

}

export default async function TripReviewsPage({
  params,
}: Props) {

  const { poolId } = await params

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "DRIVER") {
    redirect("/dashboard")
  }

  const reviews = await getTripReviews(
    poolId,
    user.id
  )

  const totalReviews = reviews.length

  const averageRating =
    totalReviews > 0
      ? (
          reviews.reduce(
            (acc, review) =>
              acc + (review.rating || 0),
            0
          ) / totalReviews
        ).toFixed(1)
      : "0.0"

  const tripDate =
    reviews[0]?.enabled_at ??
    reviews[0]?.completed_at ??
    reviews[0]?.createdAt

  return (

    <div className="min-h-screen bg-[#f6f6f6] text-black">

      <Navbar role={user.role} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* HERO */}

        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm text-neutral-500 mb-4">
              Opiniones del viaje
            </p>

            <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[0.95] mb-5">

              {tripDate
                ? formatTripKeyDate(tripDate)
                : "Viaje"}

              <span className="block text-xl text-neutral-400 mt-2 font-medium">
                Pool: {poolId.slice(0, 8)}
              </span>

            </h1>

            <p className="text-lg text-neutral-600 max-w-2xl leading-relaxed">
              Feedback y reseñas de pasajeros de este viaje.
            </p>

          </div>

          <Link
            href="/dashboard/driver/trips"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-5 py-3 text-sm font-bold transition-colors hover:bg-slate-800"
          >
            Volver a viajes
          </Link>

        </section>

        {/* STATS */}

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">

          <div className="bg-white rounded-[28px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Reseñas recibidas
            </p>

            <p className="text-4xl font-black">
              {totalReviews}
            </p>

          </div>

          <div className="bg-white rounded-[28px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Promedio del viaje
            </p>

            <p className="text-4xl font-black text-green-600">
              {averageRating}★
            </p>

          </div>

        </section>

        {/* REVIEWS */}

        {reviews.length > 0 ? (

          <section className="space-y-5">

            {reviews.map((review) => (

              <article
                key={review.id}
                className="bg-white rounded-[28px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100"
              >

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">

                  <div>

                    <p className="text-sm text-neutral-500 mb-1">
                      Pasajero
                    </p>

                    <h2 className="text-2xl font-black tracking-tight">
                      {review.author?.name ?? "Pasajero"}
                    </h2>

                    {review.reservation_id && (

                      <p className="text-sm text-neutral-500 mt-2">
                        Reserva {review.reservation_id}
                      </p>

                    )}

                  </div>

                  <div className="bg-[#f6f6f6] rounded-full px-4 py-2 text-sm font-semibold text-neutral-700">

                    {formatTripDate(
                      review.completed_at ??
                      review.enabled_at ??
                      review.createdAt
                    )}

                  </div>

                </div>

                <div className="flex gap-1 text-3xl mb-5 text-green-600">

                  {"★".repeat(review.rating || 0)}

                </div>

                <p className="text-lg leading-relaxed text-neutral-700">

                  {review.comment || "Sin comentario registrado."}

                </p>

              </article>

            ))}

          </section>

        ) : (

          <section className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Este viaje todavía no tiene reseñas.
            </p>

            <h2 className="text-3xl font-black tracking-tight mb-3">
              Cuando los pasajeros completen feedback, va a aparecer acá.
            </h2>

          </section>

        )}

      </main>

    </div>

  )
}