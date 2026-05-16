"use client"

import { useState } from "react"

export default function CreateReviewForm() {
  const [poolId, setPoolId] = useState("")
  const [destinatarioId, setDestinatarioId] = useState("")
  const [comentario, setComentario] = useState("")
  const [calificacion, setCalificacion] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validamos que el poolId tenga el formato correcto, es decir, que comience con "pool_" 
    // y tenga dos partes alfanumericas separadas por guiones bajos
    const poolRegex = /^pool_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/
        if (!poolRegex.test(poolId)) {
        setError("Ingrese un pool válido")
        return
        }

        setError("")

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pool_id: poolId,
        autor_id: "demo_user",
        destinatario_id: destinatarioId,
        calificacion: calificacion,
        comentario: comentario,
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
                Pool ID
            </label>

            <input
            type="text"
            value={poolId}
            onChange={(e) => {

                const value = e.target.value

                setPoolId(value)

                const poolRegex = /^pool_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/

                if (value.length === 0) {
                setError("")
                } else if (!poolRegex.test(value)) {
                setError("Ingrese un pool válido")
                } else {
                setError("")
                }

            }}
            className={`w-full p-3 border ${
                error
                ? "border-red-500"
                : "border-gray-300"
            }`}
            />
        {/* Si hay un error de validacion, lo mostramos debajo del input */}
            {error && (
                <p className="text-red-500 text-sm mt-2">
                {error}
                </p>
            )}
        </div>

      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Destinatario ID
        </label>

        <input
          type="text"
          value={destinatarioId}
          onChange={(e) => setDestinatarioId(e.target.value)}
          className="w-full border border-gray-300 p-3"
        />
      </div>

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
        Crear Review
      </button>

    </form>
  )
}