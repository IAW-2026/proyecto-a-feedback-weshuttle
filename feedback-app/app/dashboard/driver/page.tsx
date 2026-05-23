import { prisma } from "../../../lib/prisma"
import Navbar from "../../components/NavBar"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/current-user"
import CompleteReviewForm from "../../components/CompleteReviewForm"
import PrecreateButton from "../../components/PrecreateButton"

async function getDriverReviews(userId: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          // Reseñas recibidas (completadas por pasajeros)
          { target_user_id: userId, status: "COMPLETED" },
          // Reseñas que el conductor debe completar
          { author_user_id: userId, author_role: "driver", status: { in: ["PENDING", "PRECREATED"] } }
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

export default async function DriverDashboard() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "DRIVER") {
    redirect("/dashboard")
  }

  const reviews = await getDriverReviews(user.id)

  const completedReviews = reviews.filter(
    (review: any) => review.status === "COMPLETED" && review.target_user_id === user.id
  )

  // Definimos la variable que faltaba
  const pendingReviews = reviews.filter(
    (review: any) => review.status !== "COMPLETED" && review.author_user_id === user.id
  )

    const averageRating =
    completedReviews.length > 0
        ? (
            completedReviews.reduce(
            (acc: number, review: any) =>
                acc + (review.rating || 0),
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
            WeShuttle Driver Dashboard
          </p>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight max-w-3xl leading-[0.95] mb-6">
            Tu experiencia de manejo importa.
          </h1>

          <p className="text-lg text-neutral-600 max-w-xl leading-relaxed">
            Trackear el feedback del pasajero y mejorar cada experiencia del conductor.
          </p>

        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT */}
          <div className="lg:col-span-5">

            <div className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

              <div className="mb-8">

                <p className="text-sm text-neutral-500 mb-3">
                  Estadísticas del conductor
                </p>

                <h2 className="text-5xl font-black tracking-tight mb-3">
                  {averageRating}★
                </h2>

                <p className="text-neutral-600 leading-relaxed">
                  Calificacion promedio del pasajero basada en viajes completados.
                </p>

              </div>

              <div className="space-y-4">

                <div className="bg-[#f6f6f6] rounded-2xl p-5">

                  <p className="text-sm text-neutral-500 mb-1">
                    Reseñas Recibidas
                  </p>

                  <p className="text-3xl font-black">
                    {reviews.length}
                  </p>

                </div>

                <div className="bg-[#f6f6f6] rounded-2xl p-5">

                  <p className="text-sm text-neutral-500 mb-1">
                    Reseñas Completadas
                  </p>

                  <p className="text-3xl font-black">
                    {completedReviews.length}
                  </p>

                </div>

              </div>

            </div>

            {/* SIMULATION TOOLS */}
            <div className="mt-6 bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-2 border-dashed border-blue-200">
              
              <div className="mb-6">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
                  Etapa 2 Debug
                </p>
                <h3 className="text-2xl font-black tracking-tight">
                  Simulación de Viaje
                </h3>
              </div>

              <p className="text-neutral-600 text-sm mb-6 leading-relaxed">
                En la etapa 3 esta acción será disparada por la Driver App
                Por ahora usá este botón para generar formularios de feedback mutuos.
              </p>

              <PrecreateButton userId={user.id} />

            </div>

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7">

            {pendingReviews.length > 0 && (
              <div className="mb-10">
                <h2 className="text-3xl font-black tracking-tight mb-6">
                  Reseñas Pendientes de Pasajeros
                </h2>
                <div className="space-y-5">
                  {pendingReviews.map((review: any) => (
                    <div key={review.id} className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-2 border-blue-100">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-sm text-blue-600 font-bold mb-2">ACCIÓN REQUERIDA</p>
                          <h3 className="text-2xl font-black tracking-tight">Califica a tu pasajero</h3>
                          <p className="text-neutral-500 text-sm mt-1">Pasajero: {review.recipient.name || review.target_user_id}</p>
                        </div>
                        <div className="bg-blue-50 text-blue-700 rounded-full px-4 py-2 text-sm font-bold">
                          Pendiente
                        </div>
                      </div>
                      <CompleteReviewForm reviewId={review.id} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">

              <div>

                <h2 className="text-3xl font-black tracking-tight">
                  Reseñas de Pasajeros
                </h2>

                <p className="text-neutral-500 mt-1">
                  Últimas reseñas y experiencias de viajes
                </p>

              </div>

            </div>

            <div className="space-y-5">

              {reviews.map((review: any) => (

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
                        Reseña del pasajero
                      </h3>

                    </div>

                    <div className="bg-[#f6f6f6] rounded-full px-4 py-2 text-sm font-medium">

                      {review.status !== "COMPLETED"
                        ? "Pending"
                        : "Completed"}

                    </div>

                  </div>

                  {review.status === "COMPLETED" ? (

                    <>

                      <div className="flex gap-1 text-3xl mb-5 text-green-600">
                        {"★".repeat(review.rating || 0)}
                      </div>

                      <div className="mb-4">

                        <p className="text-sm text-neutral-500">
                          Pasajero
                        </p>

                        <p className="font-medium text-neutral-800">
                          {review.author.name || review.author.id}
                        </p>

                      </div>

                      <p className="text-neutral-700 text-lg leading-relaxed">
                        {review.comment}
                      </p>

                    </>

                  ) : (

                    <p className="text-neutral-600 leading-relaxed">
                      Este viaje no ha recibido aún un feedback del pasajero.
                    </p>

                  )}

                </div>

              ))}

            </div>

          </div>

        </section>

      </main>

    </div>
  )
}