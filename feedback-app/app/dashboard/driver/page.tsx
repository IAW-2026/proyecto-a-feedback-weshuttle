import { prisma } from "../../../lib/prisma"
import Navbar from "../../components/NavBar"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/current-user"

async function getDriverReviews(userId: string) {
  try {

    const reviews = await prisma.review.findMany({
      where: {
        destinatario_id: userId,
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
  (review: any) => review.estado_reseña === "COMPLETED"
)

    const averageRating =
    completedReviews.length > 0
        ? (
            completedReviews.reduce(
            (acc: number, review: any) =>
                acc + (review.calificacion || 0),
            0
            ) / completedReviews.length
        ).toFixed(1)
        : "0.0"

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-black">

      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* HERO */}
        <section className="mb-14">

          <p className="text-sm text-neutral-500 mb-4">
            WeShuttle Driver Dashboard
          </p>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight max-w-3xl leading-[0.95] mb-6">
            Your driving reputation matters.
          </h1>

          <p className="text-lg text-neutral-600 max-w-xl leading-relaxed">
            Track passenger feedback and improve every rider experience.
          </p>

        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT */}
          <div className="lg:col-span-5">

            <div className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

              <div className="mb-8">

                <p className="text-sm text-neutral-500 mb-3">
                  Driver Statistics
                </p>

                <h2 className="text-5xl font-black tracking-tight mb-3">
                  {averageRating}★
                </h2>

                <p className="text-neutral-600 leading-relaxed">
                  Average passenger rating based on completed trips.
                </p>

              </div>

              <div className="space-y-4">

                <div className="bg-[#f6f6f6] rounded-2xl p-5">

                  <p className="text-sm text-neutral-500 mb-1">
                    Total Reviews
                  </p>

                  <p className="text-3xl font-black">
                    {reviews.length}
                  </p>

                </div>

                <div className="bg-[#f6f6f6] rounded-2xl p-5">

                  <p className="text-sm text-neutral-500 mb-1">
                    Completed Reviews
                  </p>

                  <p className="text-3xl font-black">
                    {completedReviews.length}
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7">

            <div className="flex items-center justify-between mb-6">

              <div>

                <h2 className="text-3xl font-black tracking-tight">
                  Passenger feedback
                </h2>

                <p className="text-neutral-500 mt-1">
                  Latest reviews received from passengers
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
                        Ride completed
                      </p>

                      <h3 className="text-2xl font-black tracking-tight">
                        Passenger review
                      </h3>

                    </div>

                    <div className="bg-[#f6f6f6] rounded-full px-4 py-2 text-sm font-medium">

                      {review.estado_reseña === "PRECREATED"
                        ? "Pending"
                        : "Completed"}

                    </div>

                  </div>

                  {review.estado_reseña === "COMPLETED" ? (

                    <>

                      <div className="flex gap-1 text-3xl mb-5 text-green-600">
                        {"★".repeat(review.calificacion || 0)}
                      </div>

                      <div className="mb-4">

                        <p className="text-sm text-neutral-500">
                          Passenger
                        </p>

                        <p className="font-medium text-neutral-800">
                          {review.author.id}
                        </p>

                      </div>

                      <p className="text-neutral-700 text-lg leading-relaxed">
                        {review.comentario}
                      </p>

                    </>

                  ) : (

                    <p className="text-neutral-600 leading-relaxed">
                      This trip has not received passenger feedback yet.
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