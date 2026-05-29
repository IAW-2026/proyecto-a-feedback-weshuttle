"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CompleteReviewForm({
  reviewId,
}: {
  reviewId: string
}) {

  const [comment, setComment] = useState("")
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const response = await fetch(`/api/reviews/${reviewId}`, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        rating,
        comment,
      }),
    })

    if (response.ok) {
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <div>

        <p className="text-sm text-[var(--ws-slate)] mb-4 font-semibold">
          Calificá tu Viaje
        </p>

        <div
          className="flex gap-2 text-5xl"
          onMouseLeave={() => setHoveredStar(0)}
        >

          {[1, 2, 3, 4, 5].map((star) => {

            const activeStar =
              hoveredStar >= star || rating >= star

            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredStar(star)}
                onClick={() => setRating(star)}
                className={`transition-all duration-150 hover:scale-110 cursor-pointer ${activeStar ? "text-[var(--ws-success)]" : "text-slate-300"}`}
              >
                ★
              </button>
            )
          })}

        </div>

      </div>

      <div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Contanos sobre tu experiencia..."
          className="ws-textarea text-[15px] placeholder:text-slate-400"
        />

      </div>

      <button
        className="ws-primary-button w-full cursor-pointer"
      >
        Enviar Feedback
      </button>

    </form>
  )
}