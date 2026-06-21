import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import Navbar from "../../../components/NavBar"
import { prisma } from "../../../../lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import PassengerSentReviewsList from "../../../components/PassengerSentReviewsList"
import { Prisma } from "@prisma/client"

type ReviewWithRecipient = Prisma.ReviewGetPayload<{
  include: {
    recipient: true
  }
}>

async function getPassengerSentReviews(
  userId: string
): Promise<ReviewWithRecipient[]> {
  try {
    return await prisma.review.findMany({
      where: {
        author_user_id: userId,
        author_role: "rider",
        status: "COMPLETED",
        NOT: {
          status: "REMOVED"
        }
      },
      include: {
        recipient: true
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

export default async function PassengerSentReviewsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "rider") {
    redirect("/dashboard")
  }

  const reviews = await getPassengerSentReviews(user.id)

  const averageRatingSent =
    reviews.length > 0
      ? (
          reviews.reduce(
            (acc, review) => acc + (review.rating || 0),
            0
          ) / reviews.length
        ).toFixed(1)
      : "0.0"

  return (
    <div className="ws-page">
      <Navbar role={user.role} displayName={user.name ?? "Pasajero"} />

      <main className="ws-container">
        {/* HERO */}
        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-[var(--ws-slate)] mb-4 font-semibold tracking-wide uppercase">
              WeShuttle Passenger Dashboard
            </p>
            <h1 className="text-[32px] sm:text-5xl font-black tracking-tight max-w-4xl leading-[0.95] mb-5 text-[var(--ws-midnight)]">
              Reseñas enviadas.
            </h1>
            <p className="text-lg text-[var(--ws-slate)] max-w-2xl leading-relaxed">
              Historial completo de feedback y calificaciones enviadas a tus conductores.
            </p>
          </div>

          <Link
            href="/dashboard/passenger"
            className="ws-secondary-button"
          >
            Volver al inicio
          </Link>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
          <div className="ws-card ws-card-pad">
            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Reseñas enviadas
            </p>
            <p className="text-4xl font-black tracking-tight text-[var(--ws-midnight)]">
              {reviews.length}
            </p>
          </div>

          <div className="ws-card ws-card-pad">
            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Calificación promedio enviada
            </p>
            <p className="text-4xl font-black tracking-tight text-[var(--ws-success)]">
              {averageRatingSent}★
            </p>
          </div>
        </section>

        {/* SENT REVIEWS LIST */}
        <Suspense fallback={<div className="text-sm text-[var(--ws-slate)] animate-pulse">Cargando tus reseñas enviadas...</div>}>
          <PassengerSentReviewsList initialReviews={reviews as any} />
        </Suspense>
      </main>
    </div>
  )
}
