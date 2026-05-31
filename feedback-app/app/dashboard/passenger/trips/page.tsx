import Link from "next/link"
import { redirect } from "next/navigation"

import Navbar from "../../../components/NavBar"
import { prisma } from "../../../../lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { Prisma } from "@prisma/client"

type ReviewWithDriver = Prisma.ReviewGetPayload<{
  include: {
    author: true
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

export default async function PassengerTripsPage() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "PASSENGER") {
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

      <Navbar role={user.role} displayName={user.name} />

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
            Volver al dashboard
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

        {trips.length > 0 ? (

          <section className="space-y-6">

            {trips.map((trip, index) => {

              const tripDate =
                trip.completed_at ??
                trip.enabled_at ??
                trip.createdAt

              return (

                <article key={trip.id} className="ws-card ws-card-large">

                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">

                    <div>

                      <div className="flex items-center gap-3 mb-3">

                          <span className="ws-pill ws-pill-info uppercase tracking-wider">
                          Viaje #{trips.length - index}
                        </span>

                        <span className="text-neutral-400">
                          •
                        </span>

                          <p className="text-sm text-[var(--ws-slate)]">
                          Pool ID: {trip.pool_id.slice(0, 8)}
                        </p>

                      </div>

                      <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
                        {formatTripDate(tripDate)}
                      </h2>

                      <p className="text-[var(--ws-slate)] leading-relaxed">
                        Feedback recibido del conductor.
                      </p>

                    </div>

                    <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">

                      <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">
                        Calificación
                      </p>

                      <p className="text-2xl font-black text-[var(--ws-success)]">
                        {trip.rating || 0}★
                      </p>

                    </div>

                  </div>

                  <div className="mb-5">

                    <p className="text-sm text-[var(--ws-slate)] mb-1 font-semibold">
                      Conductor
                    </p>

                    <h3 className="text-2xl font-black tracking-tight text-[var(--ws-midnight)]">
                      {trip.author?.name || "Conductor"}
                    </h3>

                  </div>

                  <div className="flex gap-1 text-3xl mb-5 text-green-600">

                    {"★".repeat(trip.rating || 0)}

                  </div>

                  <p className="text-lg leading-relaxed text-[var(--ws-midnight)]">

                    {trip.comment || "Sin comentario registrado."}

                  </p>

                </article>

              )
            })}

          </section>

        ) : (

          <section className="ws-card ws-card-large">

            <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
              Todavía no tenés viajes con feedback.
            </p>

            <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
              Cuando un conductor complete una reseña, aparecerá acá.
            </h2>

          </section>

        )}

      </main>

    </div>

  )
}