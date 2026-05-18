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
    <form onSubmit={handleSubmit} className="space-y-4">

      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Calificación
        </label>

        <div
          className="flex gap-1 text-4xl"
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
                className={`cursor-pointer transition-colors duration-150 ${
                  activeStar
                    ? "text-green-600"
                    : "text-gray-300"
                }`}
              >
                ★
              </button>
            )
          })}

        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Comentario
        </label>

        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          className="w-full border border-gray-300 p-3"
        />
      </div>

      <button className="w-full bg-blue-600 text-white p-3 font-semibold hover:bg-blue-700">
        Completar Review
      </button>

    </form>
  )
}