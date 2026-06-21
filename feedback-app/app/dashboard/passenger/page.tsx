import { prisma } from "../../../lib/prisma"
import Navbar from "../../components/NavBar"
import { redirect } from "next/navigation"
import PassengerPendingReviews from "../../components/PassengerPendingReviews"
import { getCurrentUser } from "@/lib/current-user"
import Link from "next/link"
import { Prisma } from "@prisma/client"
import { getPoolDetailsMap } from "../../../lib/pools"
import AutoReviewActivator from "../../components/AutoReviewActivator"
import { checkAndActivatePoolsAction } from "../../actions/reviews"

type ReviewWithUsers = Prisma.ReviewGetPayload<{
  include: { author: true; recipient: true }
}>

async function getReviews(userId: string): Promise<ReviewWithUsers[]> {
  try {

    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          // Reviews pendientes que el pasajero tiene que completar
          {
            author_user_id: userId,
            author_role: "rider",
            status: {
              in: ["PRECREATED", "PENDING"]
            }
          },

          // Reviews recibidas por el pasajero
          {
            target_user_id: userId,
            target_role: "rider",
            status: "COMPLETED"
          }
        ]
      },

      include: {
        author: true,
        recipient: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    })

    return reviews

  } catch (error) {
    console.error(error)
    return []
  }
}

export default async function PassengerDashboard() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role === "admin") {
    redirect("/dashboard/admin")
  }

  if (user.role === "driver") {
    redirect("/dashboard/driver")
  }

  // Activar reseñas si algún viaje del usuario pasó a estar completado
  await checkAndActivatePoolsAction(user.id)

  const reviews = await getReviews(user.id)
  const poolDetails = await getPoolDetailsMap(reviews.map((r) => r.pool_id))

  const completedReviews = reviews.filter(
    (review) =>
      review.status === "COMPLETED" &&
      review.target_user_id === user.id
  )

  const pendingReviews = reviews.filter(
    (review) =>
      review.status !== "COMPLETED" &&
      review.author_user_id === user.id
  )

  const averageRating =
    completedReviews.length > 0
      ? (
          completedReviews.reduce(
            (acc, review) => acc + (review.rating || 0),
            0
          ) / completedReviews.length
        ).toFixed(1)
      : "0.0"

  const riderAppUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL || "https://proyecto-a-rider-weshuttle.vercel.app/"

  return (
    <div className="ws-page">

      <AutoReviewActivator userId={user.id} />

      <Navbar role={user.role} displayName={user.name ?? "Pasajero"} />

      <main className="ws-container">

        {/* HERO */}
        <section className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

          <div className="max-w-3xl">

            <p className="text-sm text-[var(--ws-slate)] mb-4 font-semibold tracking-wide uppercase">
              WeShuttle Passenger Dashboard
            </p>

            <h1 className="text-[32px] sm:text-5xl font-black tracking-tight max-w-3xl leading-[0.95] mb-6 text-[var(--ws-midnight)]">
              Tu experiencia de viaje importa.
            </h1>

            <p className="text-lg text-[var(--ws-slate)] max-w-xl leading-relaxed">
              Ayudanos a mejorar cada viaje con una reseña rápida y sencilla.
            </p>

            <div className="mt-6">
              <a
                href={riderAppUrl}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--ws-outline)] rounded-lg text-sm font-bold text-[var(--ws-midnight)] bg-white hover:bg-slate-50 hover:text-[var(--ws-midnight)] transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                ← Volver a Rider App
              </a>
            </div>

          </div>

        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT */}
          <div className="lg:col-span-5 space-y-6">

            {/* STATS */}
            <div className="ws-card ws-card-large">

              <div className="mb-8">

                <p className="text-sm text-[var(--ws-slate)] mb-3 font-semibold">
                  Estadísticas del pasajero
                </p>

                <h2 className="text-5xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
                  {averageRating}★
                </h2>

                <p className="text-[var(--ws-slate)] leading-relaxed">
                  Calificación promedio recibida por conductores.
                </p>

              </div>

              <div className="space-y-4">

                <div className="bg-[var(--ws-info-soft)] rounded-[12px] p-5 border border-[var(--ws-outline)]">

                  <p className="text-sm text-[var(--ws-slate)] mb-1 font-semibold">
                    Reseñas Recibidas
                  </p>

                  <p className="text-3xl font-black text-[var(--ws-midnight)]">
                    {completedReviews.length}
                  </p>

                </div>

                <div className="bg-[var(--ws-info-soft)] rounded-[12px] p-5 border border-[var(--ws-outline)]">

                  <p className="text-sm text-[var(--ws-slate)] mb-1 font-semibold">
                    Reseñas Pendientes
                  </p>

                  <p className="text-3xl font-black text-[var(--ws-midnight)]">
                    {pendingReviews.length}
                  </p>

                </div>

              </div>

            </div>

            {/* COMPLETED REVIEWS (FEEDBACK RECIBIDO) */}
            {completedReviews.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold tracking-tight text-[var(--ws-midnight)]">
                  Feedback Recibido (Últimos 4)
                </h3>
                
                <div className="space-y-4">
                  {completedReviews.slice(0, 4).map((review) => {
                    const poolInfo = poolDetails[review.pool_id];
                    return (
                      <div key={review.id} className="ws-card p-5">
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <div>
                            <p className="text-xs text-neutral-500 mb-0.5">
                              Viaje: <span className="font-bold text-[var(--ws-midnight)]">{poolInfo?.destinationName ?? "Polo Petroquímico"}</span>
                            </p>
                            <h4 className="text-xs font-bold text-neutral-600">
                              {poolInfo ? new Intl.DateTimeFormat("es-AR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              }).format(poolInfo.departureTime) : "Fecha del viaje"}
                            </h4>
                          </div>
                          <div className="flex gap-0.5 text-lg text-[var(--ws-success)]">
                            {"★".repeat(review.rating || 0)}
                          </div>
                        </div>

                        <p className="text-[15px] leading-relaxed text-[var(--ws-midnight)] mb-3 italic">
                          "{review.comment}"
                        </p>

                        <div className="text-xs text-neutral-500 pt-2 border-t border-[var(--ws-outline)]">
                          <span>Escrito por: </span>
                          <span className="font-semibold text-[var(--ws-midnight)]">
                            {review.author.name || review.author.id}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7">

            {/* HISTORIAL */}
            <div className="mb-6 ws-panel-dark p-8">

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                <div>

                  <p className="text-sm text-white/60 mb-1 uppercase font-bold tracking-wider">
                    Historial de Viajes
                  </p>

                  <h3 className="text-2xl font-black tracking-tight mb-2">
                    Consultá tus viajes anteriores
                  </h3>

                  <p className="text-white/70 text-sm max-w-md leading-relaxed">
                    Accedé a todas las reseñas recibidas por conductores y revisá tu actividad reciente.
                  </p>

                </div>

                <Link
                  href="/dashboard/passenger/trips"
                  className="inline-flex shrink-0 items-center justify-center rounded-[8px] bg-white text-[var(--ws-midnight)] px-8 py-4 text-sm font-black transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Ver mis viajes →
                </Link>

              </div>

            </div>

            {/* PENDING REVIEWS */}
            {pendingReviews.length > 0 && (
              <div className="mb-10">
                <h2 className="text-3xl font-black tracking-tight mb-6 text-[var(--ws-midnight)]">
                  Reseñas Pendientes
                </h2>
                <PassengerPendingReviews reviews={pendingReviews} poolDetails={poolDetails} />
              </div>
            )}



            {/* EMPTY STATE */}
            {pendingReviews.length === 0 &&
              completedReviews.length === 0 && (

              <div className="ws-card ws-card-large text-center">

                <p className="text-5xl mb-4">
                  ✈️
                </p>

                <h2 className="text-2xl font-black text-[var(--ws-midnight)]">
                  Todavía no hay actividad
                </h2>

                <p className="text-[var(--ws-slate)] mt-2">
                  Tus viajes y reseñas aparecerán acá una vez completados.
                </p>

              </div>

            )}

          </div>

        </section>

      </main>

    </div>
  )
}