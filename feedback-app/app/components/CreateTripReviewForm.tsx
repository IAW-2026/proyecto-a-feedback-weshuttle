"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type PassengerOption = {
  id: string
  name: string | null
}

type Props = {
  poolId: string
  driverName: string | null
  passengers: PassengerOption[]
}

export default function CreateTripReviewForm({ poolId, driverName, passengers }: Props) {
  const router = useRouter()
  const [authorRole, setAuthorRole] = useState<"driver" | "rider">("driver")
  const [selectedPassengerId, setSelectedPassengerId] = useState(passengers[0]?.id ?? "")
  const [passengerName, setPassengerName] = useState("")
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [hoveredStar, setHoveredStar] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedPassenger = useMemo(
    () => passengers.find((passenger) => passenger.id === selectedPassengerId) ?? null,
    [passengers, selectedPassengerId]
  )

  const canSubmitDriver = authorRole === "driver" ? Boolean(selectedPassengerId) : Boolean(passengerName.trim())

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (rating === 0) {
      setError("Seleccioná una cantidad de estrellas antes de enviar")
      return
    }

    if (authorRole === "driver" && !selectedPassengerId) {
      setError("Seleccioná un pasajero para calificar")
      return
    }

    if (authorRole === "rider" && !passengerName.trim()) {
      setError("Escribí el nombre del pasajero antes de enviar")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const response = await fetch("/api/reviews/manual", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pool_id: poolId,
        author_role: authorRole,
        passenger_name: passengerName,
        target_user_id: selectedPassengerId,
        target_user_name: selectedPassenger?.name,
        rating,
        comment,
      }),
    })

    setLoading(false)

    if (response.ok) {
      setSuccess("Reseña creada correctamente")
      setComment("")
      setRating(0)
      setHoveredStar(0)
      if (authorRole === "rider") {
        setPassengerName("")
      }
      router.refresh()
      return
    }

    setError("No se pudo crear la reseña")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-sm text-[var(--ws-slate)] mb-4 font-semibold">Crear reseña manual</p>

        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          <button
            type="button"
            onClick={() => setAuthorRole("driver")}
            className={`ws-secondary-button cursor-pointer ${authorRole === "driver" ? "border-[var(--ws-midnight)] bg-[var(--ws-info-soft)]" : ""}`}
          >
            Driver
          </button>
          <button
            type="button"
            onClick={() => setAuthorRole("rider")}
            className={`ws-secondary-button cursor-pointer ${authorRole === "rider" ? "border-[var(--ws-midnight)] bg-[var(--ws-info-soft)]" : ""}`}
          >
            Pasajero
          </button>
        </div>

        {authorRole === "driver" ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--ws-midnight)]">Pasajero a calificar</label>
            <select
              value={selectedPassengerId}
              onChange={(e) => setSelectedPassengerId(e.target.value)}
              className="ws-select"
            >
              {passengers.map((passenger) => (
                <option key={passenger.id} value={passenger.id}>
                  {passenger.name || passenger.id}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--ws-slate)]">El autor será el driver del viaje: {driverName || "sin nombre"}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--ws-midnight)]">Nombre del pasajero</label>
            <input
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              className="ws-input"
              placeholder="Ej. Juan Pérez"
            />
            <p className="text-xs text-[var(--ws-slate)]">La reseña se asociará automáticamente al driver del viaje.</p>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-[var(--ws-slate)] mb-3 font-semibold">Calificación</p>
        <div className="flex gap-2 text-5xl" onMouseLeave={() => setHoveredStar(0)}>
          {[1, 2, 3, 4, 5].map((star) => {
            const activeStar = hoveredStar >= star || rating >= star
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
          placeholder="Contanos sobre la experiencia..."
          className="ws-textarea text-[15px] placeholder:text-slate-400"
        />
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {success && <p className="text-sm text-[var(--ws-success)]">{success}</p>}

      <button
        type="submit"
        disabled={loading || rating === 0 || !canSubmitDriver}
        className="ws-primary-button w-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Creando..." : "Crear reseña"}
      </button>
    </form>
  )
}
