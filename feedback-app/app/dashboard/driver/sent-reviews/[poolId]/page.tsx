// app/dashboard/driver/sent-reviews/[poolId]/page.tsx

import Link from "next/link"
import { redirect } from "next/navigation"

import Navbar from "../../../../components/NavBar"
import PaginatedReviews from "../../../../components/PaginatedReviews"
import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "../../../../../lib/prisma"

import { Prisma } from "@prisma/client"

type ReviewWithRecipient = Prisma.ReviewGetPayload<{
  include: {
    recipient: true
  }
}>

type Props = {
  params: Promise<{
    poolId: string
  }>
}

async function getSentTripReviews(
  poolId: string,
  userId: string
): Promise<ReviewWithRecipient[]> {
  try {
    return await prisma.review.findMany({
      where: {
        pool_id: poolId,
        author_user_id: userId,
        author_role: "driver",
        status: "COMPLETED",
      },
      include: {
        recipient: true,
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
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date)
}

function formatTripKeyDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date)
}

export default async function SentTripReviewsPage({
  params,
}: Props) {
  const { poolId } = await params

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "driver") {
    redirect("/dashboard")
  }

  const reviews = await getSentTripReviews(
    poolId,
    user.id
  )

  const totalReviews = reviews.length

  const averageRating =
    totalReviews > 0
      ? (
          reviews.reduce(
            (acc, review) => acc + (review.rating || 0),
            0
          ) / totalReviews
        ).toFixed(1)
      : "0.0"

  const tripDate =
    reviews[0]?.enabled_at ??
    reviews[0]?.completed_at ??
    reviews[0]?.createdAt

  const reviewItems = reviews.map((review) => ({
    id: review.id,
    authorName: review.recipient?.name ?? "Pasajero",
    reservationId: review.reservation_id,
    rating: review.rating,
    comment: review.comment,
    dateLabel: formatTripDate(
      review.completed_at ??
      review.enabled_at ??
      review.createdAt
    ),
  }))

  return (
    <div className="ws-page">
      <Navbar role={user.role} />

      <main className="ws-container max-w-5xl">
        {/* HERO */}
        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-[var(--ws-slate)] mb-4 font-semibold tracking-wide uppercase">
              Opiniones enviadas del viaje
            </p>
            <h1 className="text-[32px] sm:text-5xl font-black tracking-tight leading-[0.95] mb-5 text-[var(--ws-midnight)]">
              {tripDate
                ? formatTripKeyDate(tripDate)
                : "Viaje"}
              <span className="block text-xl text-[var(--ws-slate)] mt-2 font-medium">
                Pool: {poolId.slice(0, 8)}
              </span>
            </h1>
            <p className="text-lg text-[var(--ws-slate)] max-w-2xl leading-relaxed">
              Feedback y reseñas enviadas a pasajeros de este viaje.
            </p>
          </div>

          <Link
            href="/dashboard/driver/sent-reviews"
            className="ws-secondary-button"
          >
            Volver a reseñas enviadas
          </Link>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          <div className="ws-card ws-card-pad">
            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Reseñas enviadas
            </p>
            <p className="text-4xl font-black text-[var(--ws-midnight)]">
              {totalReviews}
            </p>
          </div>

          <div className="ws-card ws-card-pad">
            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Promedio enviado del viaje
            </p>
            <p className="text-4xl font-black text-[var(--ws-success)]">
              {averageRating}★
            </p>
          </div>
        </section>

        {/* REVIEWS */}
        {reviews.length > 0 ? (
          <PaginatedReviews reviews={reviewItems} currentUserRole="driver" hideReportButton={true} />
        ) : (
          <section className="ws-card ws-card-large">
            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Este viaje todavía no tiene reseñas enviadas.
            </p>
            <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
              No registraste ningún feedback enviado para este viaje.
            </h2>
          </section>
        )}
      </main>
    </div>
  )
}
