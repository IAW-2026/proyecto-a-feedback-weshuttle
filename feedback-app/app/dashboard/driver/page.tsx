import { prisma } from "../../../lib/prisma"
import Navbar from "../../components/NavBar"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/current-user"
import CompleteReviewForm from "../../components/CompleteReviewForm"
import PrecreateButton from "../../components/PrecreateButton"
import Link from "next/link"
import { Prisma } from "@prisma/client"

// Definimos el tipo exacto que devuelve Prisma incluyendo las relaciones
type ReviewWithUsers = Prisma.ReviewGetPayload<{
  include: { author: true; recipient: true }
}>

type GroupedPendingTrip = {
  poolId: string;
  date: Date;
  reviews: ReviewWithUsers[];
}

async function getDriverReviews(userId: string): Promise<ReviewWithUsers[]> {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          { target_user_id: userId, status: "COMPLETED" },
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

function groupPendingByTrip(reviews: ReviewWithUsers[]): GroupedPendingTrip[] {
  const groups = new Map<string, GroupedPendingTrip>();

  reviews.forEach(review => {
    const existing = groups.get(review.pool_id);
    if (!existing) {
      groups.set(review.pool_id, {
        poolId: review.pool_id,
        date: review.createdAt,
        reviews: [review]
      });
    } else {
      existing.reviews.push(review);
    }
  });

  return Array.from(groups.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
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
    (review) => review.status === "COMPLETED" && review.target_user_id === user.id
  )

  const pendingReviews = reviews.filter(
    (review) => review.status !== "COMPLETED" && review.author_user_id === user.id
  )

  const groupedPending = groupPendingByTrip(pendingReviews);

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

            {/* NAVEGACIÓN RÁPIDA */}
            <div className="mb-6 bg-[#0f172a] text-white rounded-[28px] p-8 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-sm text-white/60 mb-1 uppercase font-bold tracking-wider">Historial de Feedback</p>
                  <h3 className="text-2xl font-black tracking-tight mb-2">Consulta tus viajes anteriores</h3>
                  <p className="text-white/70 text-sm max-w-md leading-relaxed">
                    Accede al registro completo de reseñas recibidas, organizadas por pool y fecha para un mejor seguimiento.
                  </p>
                </div>

                <Link
                  href="/dashboard/driver/trips"
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-white text-[#0f172a] px-8 py-4 text-sm font-black transition-all hover:bg-neutral-100 hover:scale-105 active:scale-95"
                >
                  Ver mis viajes →
                </Link>
              </div>
            </div>

            {groupedPending.length > 0 && (
              <div className="mb-10">
                <h2 className="text-3xl font-black tracking-tight mb-6">
                  Reseñas Pendientes de Pasajeros
                </h2>
                <div className="space-y-8">
                  {groupedPending.map((group) => (
                    <div key={group.poolId} className="bg-white rounded-[28px] p-1 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-neutral-200 overflow-hidden">
                      {/* Encabezado del Grupo de Viaje */}
                      <div className="bg-neutral-50 px-8 py-4 border-b border-neutral-100 flex justify-between items-center">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                          Viaje Pool: {group.poolId.slice(0, 8)}...
                        </p>
                        <span className="text-xs text-neutral-500 font-medium">
                          {new Intl.DateTimeFormat("es-AR", { dateStyle: 'medium', timeStyle: 'short' }).format(group.date)}
                        </span>
                      </div>

                      {/* Lista de formularios para este viaje */}
                      <div className="p-4 space-y-4">
                        {group.reviews.map((review) => (
                          <div key={review.id} className="bg-[#fbfbfb] rounded-[24px] p-6 border border-blue-50">
                            <div className="flex items-center justify-between mb-6">
                              <div>
                                <p className="text-sm text-blue-600 font-bold">CALIFICAR A:</p>
                                <h3 className="text-xl font-black tracking-tight">
                                  {review.recipient.name || "Pasajero"}
                                </h3>
                              </div>
                            </div>
                            <CompleteReviewForm reviewId={review.id} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groupedPending.length === 0 && (
              <div className="bg-white rounded-[28px] p-12 text-center border border-neutral-100">
                <p className="text-5xl mb-4">🎉</p>
                <h2 className="text-2xl font-black">¡Estás al día!</h2>
                <p className="text-neutral-500 mt-2">No tenés reseñas pendientes de completar.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}