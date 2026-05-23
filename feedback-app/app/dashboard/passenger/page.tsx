import { prisma } from "../../../lib/prisma"
import Navbar from "../../components/NavBar"
import { redirect } from "next/navigation"
import CompleteReviewForm from "../../components/CompleteReviewForm"
import { getCurrentUser } from "@/lib/current-user"

async function getReviews(userId: string) {
  try {

    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          // Reseñas recibidas por el pasajero (Conductor -> Pasajero) que ya están completas
          { target_user_id: userId, target_role: "rider", status: "COMPLETED" }
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

export default async function Home() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "PASSENGER") {
    redirect("/dashboard")
  }

  const reviews = await getReviews(user.id)

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-black">

      <Navbar role={user.role} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* HERO */}
        <section className="mb-14">

          <p className="text-sm text-neutral-500 mb-4">
            WeShuttle Sistema de Feedback
          </p>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight max-w-3xl leading-[0.95] mb-6">
            Tu experiencia de viaje importa.
          </h1>

          <p className="text-lg text-neutral-600 max-w-xl leading-relaxed">
            Ayudanos a mejorar cada viaje con una reseña rapida y sencilla.
          </p>

        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT */}
          <div className="lg:col-span-5">

            <div className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

              <p className="text-sm text-neutral-500 mb-3">Bienvenido de vuelta</p>
              <h2 className="text-3xl font-black tracking-tight mb-3">Estado de Pasajero</h2>
              <p className="text-neutral-600 leading-relaxed">
                Tu historial de viajes y comentarios pendientes aparecerán a la derecha tan pronto como se complete un viaje.
              </p>
            </div>

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7">

            <div className="flex items-center justify-between mb-6">

              <div>

                <h2 className="text-3xl font-black tracking-tight">
                  Actividad reciente
                </h2>

                <p className="text-neutral-500 mt-1">
                  Últimas reseñas y experiencias de viaje
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
                        Feedback del viaje
                      </h3>

                    </div>

                    <div className="bg-[#f6f6f6] rounded-full px-4 py-2 text-sm font-medium">

                      {review.status !== "COMPLETED"
                        ? "Pending"
                        : "Completed"}

                    </div>

                  </div>

                  {review.status !== "COMPLETED" ? (

                    <div>

                      <p className="text-neutral-600 mb-6 leading-relaxed">
                        Tu viaje está esperando feedback. Evaluá tu experiencia y ayuda a mejorar los viajes futuros.
                      </p>

                      <CompleteReviewForm reviewId={review.id} />

                    </div>

                  ) : (

                    <>

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

                    </>

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