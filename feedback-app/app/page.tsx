import { prisma } from "../lib/prisma"
import Navbar from "./components/NavBar"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

async function getReviews() {
  try {
    const reviews = await prisma.review.findMany()
    return reviews
  } catch (error) {
    console.error(error)
    return []
  }
}
export default async function Home() {
  const { userId } = await auth()
  // si no hay userId, redirigimos a la pagina de sign-in
  if (!userId) {
    redirect("/sign-in")
  }

  const reviews = await getReviews()

  return (
    <div className="bg-gray-100 text-gray-900 flex h-screen overflow-hidden antialiased">

      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col h-full w-80 fixed left-0 top-0 z-50 border-r border-gray-300 bg-white p-4">

        <div className="flex flex-col gap-2 mb-8 mt-4 px-1">
          <div className="text-2xl font-black text-blue-600 mb-6">
            WeShuttle
          </div>

          <div className="flex items-center gap-4">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBb9Z2QkkuSU0m1LAay3tpb_iZRvn1f2WCamjPjY8P8RrNRL_i-LjhfKIF8jT0eCmsyn98usB_8YIDpVe8BbwkPUQg5xCWv3qxlfHBZuEuEo9u2Wb-bDTXL21RCZl9hAiwgx7tpGlUihhrutAuMetKoKVvsSQ1-WSC3Wu5V_QEL0NvjfHXe0qqPY05IA-bZFXSNr6A5XRILQNFT12MQb7Sq-bEhMaG2pWVYgVG3Or9KHjZQ0WwpvvZS4iQd7QXWk832Y6j64vWMAss"
              alt="avatar"
              className="w-12 h-12 rounded-full object-cover"
            />

            <div>
              <h2 className="text-base font-semibold">
                Welcome back
              </h2>

              <p className="text-sm text-gray-500">
                Passenger Account
              </p>
            </div>
          </div>
        </div>

      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col md:ml-80 h-full overflow-hidden">

        {/* TOPBAR */}
        <header className="flex justify-between items-center w-full px-5 h-16 bg-white border-b border-gray-300">
          <h1 className="text-xl font-bold text-blue-600">
            WeShuttle
          </h1>

          <Navbar />
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">

          <div className="max-w-7xl mx-auto">

            {/* PAGE HEADER */}
            <div className="mb-8">
              <h1 className="text-5xl font-extrabold mb-2">
                Feedback & Support
              </h1>

              <p className="text-gray-600 text-lg">
                Manage your reviews or let us know how we can improve your journey.
              </p>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* LEFT COLUMN */}
              <div className="lg:col-span-5">

                {/* SUPPORT FORM */}
                <div className="bg-white p-6 border border-gray-300">

                  <h2 className="text-2xl font-bold mb-6">
                    Report an Issue
                  </h2>

                  <form className="space-y-4">

                    <div>
                      <label className="block text-sm text-gray-500 mb-2">
                        Category
                      </label>

                      <select className="w-full border border-gray-300 p-3">
                        <option>Select an issue type</option>
                        <option>Ride Experience</option>
                        <option>Driver Behavior</option>
                        <option>App Functionality</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-2">
                        Trip Reference
                      </label>

                      <input
                        type="text"
                        placeholder="e.g. WSH-8842"
                        className="w-full border border-gray-300 p-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-2">
                        Details
                      </label>

                      <textarea
                        rows={4}
                        className="w-full border border-gray-300 p-3"
                        placeholder="Please describe what happened..."
                      />
                    </div>

                    <button className="w-full bg-blue-600 text-white p-3 font-semibold hover:bg-blue-700">
                      Submit Ticket
                    </button>

                  </form>

                </div>

              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-7">

                <div className="space-y-4">

                  {reviews.map((review: any) => (

                    <div
                      key={review.id}
                      className="bg-white p-6 border border-gray-300"
                    >

                      <div className="flex justify-between items-start mb-4">

                        <div>
                          <h3 className="font-bold text-lg">
                            Ride Feedback
                          </h3>

                          <p className="text-sm text-gray-500">
                            Driver: {review.driverId}
                          </p>
                        </div>

                        <div className="flex text-green-600 text-xl">
                          {"★".repeat(review.rating)}
                        </div>

                      </div>

                      <p className="text-gray-700">
                        {review.comment}
                      </p>

                      <p className="text-xs text-gray-400 mt-4">
                        Passenger: {review.passengerId}
                      </p>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          </div>

        </main>

      </div>
    </div>
  )
}