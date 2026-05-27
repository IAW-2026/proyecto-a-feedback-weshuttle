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

    <div className="min-h-screen bg-[#f6f6f6] text-black">

      <Navbar role={user.role} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* HERO */}

        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm text-neutral-500 mb-4">
              WeShuttle Passenger Dashboard
            </p>

            <h1 className="text-5xl sm:text-6xl font-black tracking-tight max-w-4xl leading-[0.95] mb-5">
              Mis viajes.
            </h1>

            <p className="text-lg text-neutral-600 max-w-2xl leading-relaxed">
              Historial completo de viajes y feedback recibido por conductores.
            </p>

          </div>

          <Link
            href="/dashboard/passenger"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-5 py-3 text-sm font-bold transition-colors hover:bg-slate-800"
          >
            Volver al dashboard
          </Link>

        </section>

        {/* STATS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">

          <div className="bg-white rounded-[28px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Viajes completados
            </p>

            <p className="text-4xl font-black tracking-tight">
              {trips.length}
            </p>

          </div>

          <div className="bg-white rounded-[28px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Promedio recibido
            </p>

            <p className="text-4xl font-black tracking-tight text-green-600">
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

                <article
                  key={trip.id}
                  className="bg-white rounded-[28px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100"
                >

                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">

                    <div>

                      <div className="flex items-center gap-3 mb-3">

                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                          Viaje #{trips.length - index}
                        </span>

                        <span className="text-neutral-400">
                          •
                        </span>

                        <p className="text-sm text-neutral-500">
                          Pool ID: {trip.pool_id.slice(0, 8)}
                        </p>

                      </div>

                      <h2 className="text-3xl font-black tracking-tight mb-3">
                        {formatTripDate(tripDate)}
                      </h2>

                      <p className="text-neutral-600 leading-relaxed">
                        Feedback recibido del conductor.
                      </p>

                    </div>

                    <div className="bg-[#f6f6f6] rounded-2xl px-5 py-4">

                      <p className="text-xs text-neutral-500 mb-1">
                        Calificación
                      </p>

                      <p className="text-2xl font-black text-green-600">
                        {trip.rating || 0}★
                      </p>

                    </div>

                  </div>

                  <div className="mb-5">

                    <p className="text-sm text-neutral-500 mb-1">
                      Conductor
                    </p>

                    <h3 className="text-2xl font-black tracking-tight">
                      {trip.author?.name || "Conductor"}
                    </h3>

                  </div>

                  <div className="flex gap-1 text-3xl mb-5 text-green-600">

                    {"★".repeat(trip.rating || 0)}

                  </div>

                  <p className="text-lg leading-relaxed text-neutral-700">

                    {trip.comment || "Sin comentario registrado."}

                  </p>

                </article>

              )
            })}

          </section>

        ) : (

          <section className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            <p className="text-sm text-neutral-500 mb-2">
              Todavía no tenés viajes con feedback.
            </p>

            <h2 className="text-3xl font-black tracking-tight mb-3">
              Cuando un conductor complete una reseña, aparecerá acá.
            </h2>

          </section>

        )}

      </main>

    </div>

  )
}