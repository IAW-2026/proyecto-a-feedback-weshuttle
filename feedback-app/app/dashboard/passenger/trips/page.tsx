import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import Navbar from "../../../components/NavBar"
import { prisma } from "../../../../lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import PassengerTripsList from "../../../components/PassengerTripsList"
import { Prisma } from "@prisma/client"

type ReviewWithDriver = Prisma.ReviewGetPayload<{
  include: {
    author: true,
    reports: true // Incluir los reportes asociados a la reseña
  }
}>

async function getPassengerTrips(
  userId: string
): Promise<ReviewWithDriver[]> {

  try {

    return await prisma.review.findMany({

      where: {
        target_user_id: userId,
        target_role: "rider",
        status: "COMPLETED",
        // Excluir reseñas que han sido marcadas como REMOVED por un administrador
        NOT: {
          status: "REMOVED"
        }
      },


      include: {
        author: true,
        reports: { // Incluir reportes hechos por el usuario actual sobre esta reseña
          where: {
            reporter_user_id: userId
          }
        }
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

export default async function PassengerTripsPage() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "rider") {
    redirect("/dashboard")
  }

  const trips = await getPassengerTrips(user.id)

  const averageRating =
    trips.length > 0
      ? (
          trips.reduce(
            (acc, trip) => acc + (trip.rating || 0),
            0
          ) / trips.length
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
              Mis viajes.
            </h1>

            <p className="text-lg text-[var(--ws-slate)] max-w-2xl leading-relaxed">
              Historial completo de viajes y feedback recibido por conductores.
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
              Viajes completados
            </p>

            <p className="text-4xl font-black tracking-tight text-[var(--ws-midnight)]">
              {trips.length}
            </p>

          </div>

          <div className="ws-card ws-card-pad">

            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Promedio recibido
            </p>

            <p className="text-4xl font-black tracking-tight text-[var(--ws-success)]">
              {averageRating}★
            </p>

          </div>

        </section>

        {/* TRIPS */}
        <Suspense fallback={<div className="text-sm text-[var(--ws-slate)] animate-pulse">Cargando tus viajes...</div>}>
          <PassengerTripsList initialTrips={trips as any} />
        </Suspense>

      </main>

    </div>

  )
}