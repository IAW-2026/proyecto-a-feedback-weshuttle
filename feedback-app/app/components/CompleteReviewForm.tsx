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

        <p className="text-sm text-neutral-500 mb-4">
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
                className={`
                  transition-all
                  duration-150
                  hover:scale-110
                  cursor-pointer
                  ${
                    activeStar
                      ? "text-green-600"
                      : "text-neutral-300"
                  }
                `}
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
          className="
          w-full
          min-h-[140px]
          rounded-[24px]
          bg-[#f6f6f6]
          px-5
          py-4
          outline-none
          resize-none
          text-[15px]
          placeholder:text-neutral-400
          "
        />

      </div>

      <button
        className="
        w-full
        h-14
        rounded-full
        bg-blue-600
        text-white
        font-medium
        text-[15px]
        hover:bg-blue-700
        transition-all
        duration-200
        cursor-pointer
        "
      >
        Enviar Feedback
      </button>

    </form>
  )
}