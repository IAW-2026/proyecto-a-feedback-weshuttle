import { prisma } from "../../lib/prisma"

async function getReviews() {
  try {
    return await prisma.review.findMany()
  } catch (error) {
    console.error(error)
    return []
  }
}

export default async function Dashboard() {
  const reviews = await getReviews()

  return (
    <div>
      <h1>Dashboard</h1>
      {reviews.map((r: any) => (
        <div key={r.id}>
          {r.comment}
        </div>
      ))}
    </div>
  )
}