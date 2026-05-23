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
            WeShuttle Feedback System
          </p>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight max-w-3xl leading-[0.95] mb-6">
            Your ride experience matters.
          </h1>

          <p className="text-lg text-neutral-600 max-w-xl leading-relaxed">
            Help improve every trip with fast and simple ride feedback.
          </p>

        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT */}
          <div className="lg:col-span-5">

            <div className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

              <p className="text-sm text-neutral-500 mb-3">Welcome back</p>
              <h2 className="text-3xl font-black tracking-tight mb-3">Passenger Status</h2>
              <p className="text-neutral-600 leading-relaxed">
                Your ride history and pending feedback will appear on the right as soon as a trip is completed.
              </p>
            </div>

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7">

            <div className="flex items-center justify-between mb-6">

              <div>

                <h2 className="text-3xl font-black tracking-tight">
                  Recent activity
                </h2>

                <p className="text-neutral-500 mt-1">
                  Latest ride reviews and experiences
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
                        Trip completed
                      </p>

                      <h3 className="text-2xl font-black tracking-tight">
                        Ride feedback
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
                        Your ride is waiting for feedback. Rate your experience and help improve future trips.
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
                          Written by
                        </p>

                        <p className="font-medium text-neutral-800">
                          {review.author.id}
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