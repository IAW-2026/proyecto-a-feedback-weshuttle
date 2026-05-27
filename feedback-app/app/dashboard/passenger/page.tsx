import { prisma } from "../../../lib/prisma"
import Navbar from "../../components/NavBar"
import { redirect } from "next/navigation"
import CompleteReviewForm from "../../components/CompleteReviewForm"
import { getCurrentUser } from "@/lib/current-user"
import Link from "next/link"
import { Prisma } from "@prisma/client"

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
            status: "PENDING"
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

  if (user.role !== "PASSENGER") {
    redirect("/dashboard")
  }

  const reviews = await getReviews(user.id)

  const completedReviews = reviews.filter(
    (review) =>
      review.status === "COMPLETED" &&
      review.target_user_id === user.id
  )

  const pendingReviews = reviews.filter(
    (review) =>
      review.status === "PENDING" &&
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

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-black">

      <Navbar role={user.role} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* HERO */}
        <section className="mb-14">

          <p className="text-sm text-neutral-500 mb-4">
            WeShuttle Passenger Dashboard
          </p>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight max-w-3xl leading-[0.95] mb-6">
            Tu experiencia de viaje importa.
          </h1>

          <p className="text-lg text-neutral-600 max-w-xl leading-relaxed">
            Ayudanos a mejorar cada viaje con una reseña rápida y sencilla.
          </p>

        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT */}
          <div className="lg:col-span-5">

            {/* STATS */}
            <div className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

              <div className="mb-8">

                <p className="text-sm text-neutral-500 mb-3">
                  Estadísticas del pasajero
                </p>

                <h2 className="text-5xl font-black tracking-tight mb-3">
                  {averageRating}★
                </h2>

                <p className="text-neutral-600 leading-relaxed">
                  Calificación promedio recibida por conductores.
                </p>

              </div>

              <div className="space-y-4">

                <div className="bg-[#f6f6f6] rounded-2xl p-5">

                  <p className="text-sm text-neutral-500 mb-1">
                    Reseñas Recibidas
                  </p>

                  <p className="text-3xl font-black">
                    {completedReviews.length}
                  </p>

                </div>

                <div className="bg-[#f6f6f6] rounded-2xl p-5">

                  <p className="text-sm text-neutral-500 mb-1">
                    Reseñas Pendientes
                  </p>

                  <p className="text-3xl font-black">
                    {pendingReviews.length}
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7">

            {/* HISTORIAL */}
            <div className="mb-6 bg-[#0f172a] text-white rounded-[28px] p-8 shadow-lg">

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
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-white text-[#0f172a] px-8 py-4 text-sm font-black transition-all hover:bg-neutral-100 hover:scale-105 active:scale-95"
                >
                  Ver mis viajes →
                </Link>

              </div>

            </div>

            {/* PENDING REVIEWS */}
            {pendingReviews.length > 0 && (

              <div className="mb-10">

                <h2 className="text-3xl font-black tracking-tight mb-6">
                  Reseñas Pendientes
                </h2>

                <div className="space-y-5">

                  {pendingReviews.map((review) => (

                    <div
                      key={review.id}
                      className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    >

                      <div className="flex items-start justify-between mb-6">

                        <div>

                          <p className="text-sm text-neutral-500 mb-2">
                            Viaje completado
                          </p>

                          <h3 className="text-2xl font-black tracking-tight">
                            Feedback del viaje
                          </h3>

                        </div>

                        <div className="bg-yellow-100 text-yellow-700 rounded-full px-4 py-2 text-sm font-bold">
                          Pending
                        </div>

                      </div>

                      <p className="text-neutral-600 mb-6 leading-relaxed">
                        Tu viaje está esperando feedback. Evaluá tu experiencia y ayudá a mejorar futuros viajes.
                      </p>

                      <CompleteReviewForm reviewId={review.id} />

                    </div>

                  ))}

                </div>

              </div>

            )}

            {/* COMPLETED REVIEWS */}
            {completedReviews.length > 0 && (

              <div>

                <h2 className="text-3xl font-black tracking-tight mb-6">
                  Feedback Recibido
                </h2>

                <div className="space-y-5">

                  {completedReviews.map((review) => (

                    <div
                      key={review.id}
                      className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    >

                      <div className="flex items-start justify-between mb-6">

                        <div>

                          <p className="text-sm text-neutral-500 mb-2">
                            Reseña del conductor
                          </p>

                          <h3 className="text-2xl font-black tracking-tight">
                            Experiencia del viaje
                          </h3>

                        </div>

                        <div className="bg-green-100 text-green-700 rounded-full px-4 py-2 text-sm font-bold">
                          Completed
                        </div>

                      </div>

                      <div className="flex gap-1 text-3xl mb-5 text-green-600">
                        {"★".repeat(review.rating || 0)}
                      </div>

                      <div className="mb-4">

                        <p className="text-sm text-neutral-500">
                          Escrito por
                        </p>

                        <p className="font-medium text-neutral-800">
                          {review.author.name || review.author.id}
                        </p>

                      </div>

                      <p className="text-neutral-700 text-lg leading-relaxed">
                        {review.comment}
                      </p>

                    </div>

                  ))}

                </div>

              </div>

            )}

            {/* EMPTY STATE */}
            {pendingReviews.length === 0 &&
              completedReviews.length === 0 && (

              <div className="bg-white rounded-[28px] p-12 text-center border border-neutral-100">

                <p className="text-5xl mb-4">
                  ✈️
                </p>

                <h2 className="text-2xl font-black">
                  Todavía no hay actividad
                </h2>

                <p className="text-neutral-500 mt-2">
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