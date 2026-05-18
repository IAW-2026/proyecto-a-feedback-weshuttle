"use client"

import { useState } from "react"

export default function CompleteReviewForm({
  reviewId,
}: {
  reviewId: string
}) {

  const [comentario, setComentario] = useState("")
  const [calificacion, setCalificacion] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const response = await fetch(`/api/reviews/${reviewId}`, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        calificacion,
        comentario,
      }),
    })

    if (response.ok) {
      window.location.reload()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <div>

        <p className="text-sm text-neutral-500 mb-4">
          Rate your trip
        </p>

        <div
          className="flex gap-2 text-5xl"
          onMouseLeave={() => setHoveredStar(0)}
        >

          {[1, 2, 3, 4, 5].map((star) => {

            const activeStar =
              hoveredStar >= star || calificacion >= star

            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredStar(star)}
                onClick={() => setCalificacion(star)}
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
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Tell us about your experience..."
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