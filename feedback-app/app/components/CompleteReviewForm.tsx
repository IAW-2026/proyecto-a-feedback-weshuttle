"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Toast from "./Toast"

export default function CompleteReviewForm({
  reviewId,
}: {
  reviewId: string
}) {

  const [comment, setComment] = useState("")
  const [rating, setRating] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (rating === 0) {
      setError("Seleccioná una cantidad de estrellas antes de enviar")
      return
    }

    setError(null)

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
      setSubmitted(true)
      setShowToast(true)

      setTimeout(() => {
        router.refresh()
      }, 3000)
    } else {
      setError("No se pudo enviar la reseña")
    }
  }

  if (submitted) {
    return (
      <Toast
        message="¡Reseña enviada correctamente!"
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    )
  }

  return (
    <>
      <Toast
        message="¡Reseña enviada correctamente!"
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

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
                  className={`transition-all duration-150 hover:scale-110 cursor-pointer ${
                    activeStar
                      ? "text-[var(--ws-success)]"
                      : "text-slate-300"
                  }`}
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

        {error && (
          <p className="text-sm text-red-600 mb-2">{error}</p>
        )}

        <button
          className="ws-primary-button w-full cursor-pointer"
          type="submit"
          disabled={rating === 0}
        >
          Enviar Feedback
        </button>

      </form>
    </>
  )
}