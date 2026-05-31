import { prisma } from "../../../lib/prisma"
import Navbar from "../../components/NavBar"
import { redirect } from "next/navigation"
import { getCurrentUser } from "../../../lib/current-user"
import CompleteReviewForm from "../../components/CompleteReviewForm"
import DriverSimulationControls from "../../components/DriverSimulationControls"
import DriverPendingTripsAccordion from "../../components/DriverPendingTripsAccordion"
import Link from "next/link"
import { Prisma } from "@prisma/client"
import ProfileNameEditor from "../../components/ProfileNameEditor"

// Definimos el tipo exacto que devuelve Prisma incluyendo las relaciones
type ReviewWithUsers = Prisma.ReviewGetPayload<{
  include: { author: true; recipient: true }
}>

type GroupedPendingTrip = {
  poolId: string;
  date: Date;
  reviews: ReviewWithUsers[];
}

type PendingTripAccordionGroup = {
  poolId: string
  date: string
  reviews: {
    id: string
    recipientName: string | null
    createdAt: string
  }[]
}

async function getLatestDriverSimulationPoolId(userId: string): Promise<string | null> {
  const latestReview = await prisma.review.findFirst({
    where: {
      author_user_id: userId,
      author_role: "driver",
      status: {
        in: ["PRECREATED", "PENDING"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      pool_id: true,
    },
  })

  return latestReview?.pool_id ?? null
}

async function getDriverReviews(userId: string, poolId: string | null): Promise<ReviewWithUsers[]> {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        ...(poolId
          ? {
              pool_id: poolId,
            }
          : {
              OR: [
                { target_user_id: userId, status: "COMPLETED" },
                { author_user_id: userId, author_role: "driver", status: "PENDING" },
              ],
            }),
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

  const activePoolId = await getLatestDriverSimulationPoolId(user.id)

  const [reviews, precreatedReviewsCount] = await Promise.all([
    getDriverReviews(user.id, activePoolId),
    prisma.review.count({
      where: {
        author_user_id: user.id,
        author_role: "driver",
        status: "PRECREATED",
        ...(activePoolId ? { pool_id: activePoolId } : {}),
      },
    }),
  ])

  const completedReviews = reviews.filter(
    (review) => review.status === "COMPLETED" && review.target_user_id === user.id
  )

  const pendingReviews = reviews.filter(
    (review) => review.status !== "COMPLETED" && review.author_user_id === user.id
  )

  const groupedPending = groupPendingByTrip(pendingReviews);

  const pendingTripAccordionGroups: PendingTripAccordionGroup[] = groupedPending.map((group) => ({
    poolId: group.poolId,
    date: group.date.toISOString(),
    reviews: group.reviews.map((review) => ({
      id: review.id,
      recipientName: review.recipient.name,
      createdAt: review.createdAt.toISOString(),
    })),
  }))

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
    <div className="ws-page">

      <Navbar role={user.role} displayName={user.name} />

      <main className="ws-container">

        {/* HERO */}
        <section className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

          <div className="max-w-3xl">

            <p className="text-sm text-[var(--ws-slate)] mb-4 font-semibold tracking-wide uppercase">
              WeShuttle Driver Dashboard
            </p>

            <h1 className="text-[32px] sm:text-5xl font-black tracking-tight max-w-3xl leading-[0.95] mb-6 text-[var(--ws-midnight)]">
              Tu experiencia de manejo importa.
            </h1>

            <p className="text-lg text-[var(--ws-slate)] max-w-xl leading-relaxed">
              Trackear el feedback del pasajero y mejorar cada experiencia del conductor.
            </p>

          </div>

          <ProfileNameEditor initialName={user.name} />

        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT */}
          <div className="lg:col-span-5">

            <div className="ws-card ws-card-large">

              <div className="mb-8">

                <p className="text-sm text-[var(--ws-slate)] mb-3 font-semibold">
                  Estadísticas del conductor
                </p>

                <h2 className="text-5xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
                  {averageRating}★
                </h2>

                <p className="text-[var(--ws-slate)] leading-relaxed">
                  Calificacion promedio del pasajero basada en viajes completados.
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
                    Reseñas Pendientes de Envío
                  </p>

                  <p className="text-3xl font-black text-[var(--ws-midnight)]">
                    {pendingReviews.length}
                  </p>

                </div>

                <div className="bg-[var(--ws-info-soft)] rounded-[12px] p-5 border border-[var(--ws-outline)]">

                  <p className="text-sm text-[var(--ws-slate)] mb-1 font-semibold">
                    Reseñas Precreadas
                  </p>

                  <p className="text-3xl font-black text-[var(--ws-midnight)]">
                    {precreatedReviewsCount}
                  </p>

                </div>

              </div>

            </div>

            {/* SIMULATION TOOLS */}
            <div className="mt-6 ws-card ws-card-large border-dashed border-2 border-[var(--ws-outline)]">
              
              <div className="mb-6">
                <p className="text-xs font-bold text-[var(--ws-midnight)] uppercase tracking-widest mb-2">
                  Etapa 2 Debug
                </p>
                <h3 className="text-2xl font-black tracking-tight text-[var(--ws-midnight)]">
                  Simulación de Viaje
                </h3>
              </div>

              <p className="text-[var(--ws-slate)] text-sm mb-6 leading-relaxed">
                En la etapa 3 esta acción será disparada por la Driver App
                Por ahora usá este botón para generar formularios de feedback mutuos.
              </p>

              <DriverSimulationControls userId={user.id} />

            </div>

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7">

            {/* NAVEGACIÓN RÁPIDA */}
            <div className="mb-6 ws-panel-dark p-8">
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
                  className="inline-flex shrink-0 items-center justify-center rounded-[8px] bg-white text-[var(--ws-midnight)] px-8 py-4 text-sm font-black transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Ver mis viajes →
                </Link>
              </div>
            </div>

            {pendingTripAccordionGroups.length > 0 && (
              <div className="mb-10">
                <h2 className="text-3xl font-black tracking-tight mb-6 text-[var(--ws-midnight)]">
                  Reseñas Pendientes de Pasajeros
                </h2>
                <DriverPendingTripsAccordion trips={pendingTripAccordionGroups} />
              </div>
            )}

            {pendingTripAccordionGroups.length === 0 && (
              <div className="ws-card ws-card-large text-center">
                <p className="text-5xl mb-4">🎉</p>
                <h2 className="text-2xl font-black text-[var(--ws-midnight)]">¡Estás al día!</h2>
                <p className="text-[var(--ws-slate)] mt-2">No tenés reseñas pendientes de completar.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}