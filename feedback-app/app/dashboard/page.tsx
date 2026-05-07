async function getReviews() {
  const res = await fetch("http://localhost:3000/api/reviews")
  return res.json()
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