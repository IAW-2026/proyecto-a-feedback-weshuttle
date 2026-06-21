"use client"

import { useState, useEffect } from "react"
import type { CreateAdminReviewInput, CreatedAdminReview } from "@/lib/reviews/admin-create-review"
import ActionModal from './ActionModal'
import Toast from "./Toast"
import { useRouter, useSearchParams } from "next/navigation"

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function highlightText(text: string | null, search: string) {
  if (!text) return "—"
  if (!search.trim()) return text

  const regex = new RegExp(`(${escapeRegExp(search)})`, "gi")
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-[var(--ws-success-soft)] text-[var(--ws-success)] font-semibold rounded-[2px] px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

type User = {
  id: string
  name: string | null
  role: string
}

type Review = {
  id: string
  pool_id: string
  reservation_id?: string | null
  author_user_id: string
  target_user_id: string | null
  author_role: string
  recipient_role: string | null
  rating: number | null
  comment: string | null
  status: string
  createdAt: string
  enabled_at?: string | null
  completed_at?: string | null
  author: User
  recipient: User | null
}

type TripParticipant = {
  id: string
  name: string | null
  role: "driver" | "rider"
  reservationId: string | null
}

type TripGroup = {
  poolId: string
  tripDate: Date
  reviews: Review[]
  driver: TripParticipant | null
  passengers: TripParticipant[]
}

type CreateMode = "driver" | "rider"

function formatTripKeyDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(date)
}

function toReviewRole(role: TripParticipant["role"]) {
  return role === "driver" ? "driver" : "rider"
}

function groupReviewsByTrip(reviewsList: Review[]) {
  const groups = new Map<string, TripGroup>()

  for (const review of reviewsList) {
    const tripDate =
      (review.enabled_at && new Date(review.enabled_at)) ||
      (review.completed_at && new Date(review.completed_at)) ||
      new Date(review.createdAt)

    const existing = groups.get(review.pool_id)

    if (!existing) {
      const participantMap = new Map<string, TripParticipant>()

      const addParticipant = (user: User | null, reservationId: string | null) => {
        if (!user || (user.role !== "driver" && user.role !== "rider")) return

        const nextRole = user.role as TripParticipant["role"]
        const current = participantMap.get(user.id)

        if (!current) {
          participantMap.set(user.id, {
            id: user.id,
            name: user.name,
            role: nextRole,
            reservationId,
          })
          return
        }

        if (!current.name && user.name) current.name = user.name
        if (!current.reservationId && reservationId) current.reservationId = reservationId
      }

      addParticipant(review.author, review.reservation_id ?? null)
      addParticipant(review.recipient, review.reservation_id ?? null)

      groups.set(review.pool_id, {
        poolId: review.pool_id,
        tripDate,
        reviews: [review],
        driver: null,
        passengers: [],
      })

      const createdGroup = groups.get(review.pool_id)
      if (createdGroup) {
        const participants = Array.from(participantMap.values())
        createdGroup.driver = participants.find((participant) => participant.role === "driver") ?? null
        createdGroup.passengers = participants
          .filter((participant) => participant.role === "rider")
          .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, "es-AR"))
      }

      continue
    }

    existing.reviews.push(review)

    const addParticipant = (user: User | null, reservationId: string | null) => {
      if (!user || (user.role !== "driver" && user.role !== "rider")) return

      const nextRole = user.role as TripParticipant["role"]
      const currentList = nextRole === "driver" ? [existing.driver].filter(Boolean) as TripParticipant[] : existing.passengers
      const current = currentList.find((participant) => participant.id === user.id)

      if (nextRole === "driver") {
        if (!current) {
          existing.driver = {
            id: user.id,
            name: user.name,
            role: nextRole,
            reservationId,
          }
          return
        }

        if (!current.name && user.name) current.name = user.name
        if (!current.reservationId && reservationId) current.reservationId = reservationId
        existing.driver = current
        return
      }

      if (!current) {
        existing.passengers.push({
          id: user.id,
          name: user.name,
          role: nextRole,
          reservationId,
        })
        existing.passengers.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, "es-AR"))
        return
      }

      if (!current.name && user.name) current.name = user.name
      if (!current.reservationId && reservationId) current.reservationId = reservationId
    }

    addParticipant(review.author, review.reservation_id ?? null)
    addParticipant(review.recipient, review.reservation_id ?? null)

    if (tripDate.getTime() > existing.tripDate.getTime()) existing.tripDate = tripDate
  }

  return Array.from(groups.values()).sort((a, b) => b.tripDate.getTime() - a.tripDate.getTime())
}

type Props = {
  initialReviews: any[]
  createReviewAction: (input: CreateAdminReviewInput) => Promise<CreatedAdminReview>
}

export default function AdminReviewsTable({ initialReviews, createReviewAction }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const searchQuery = searchParams.get("search") || ""
  const pageParam = searchParams.get("page") || "1"

  const [reviews, setReviews] = useState<Review[]>(initialReviews as Review[])
  const [searchInput, setSearchInput] = useState(searchQuery)

  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  const handleSearchChange = (val: string) => {
    setSearchInput(val)

    const params = new URLSearchParams(window.location.search)
    if (val.trim()) {
      params.set("search", val)
    } else {
      params.delete("search")
    }
    params.set("page", "1")

    router.replace(`?${params.toString()}`)
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Review | null>(null)
  const [editRating, setEditRating] = useState<number | null>(null)
  const [editComment, setEditComment] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createTrip, setCreateTrip] = useState<TripGroup | null>(null)
  const [createMode, setCreateMode] = useState<CreateMode>("driver")
  const [createPassengerAuthorId, setCreatePassengerAuthorId] = useState<string>("")
  const [createPassengerTargetId, setCreatePassengerTargetId] = useState<string>("")
  const [createRating, setCreateRating] = useState<number>(5)
  const [createComment, setCreateComment] = useState<string>("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSaving, setCreateSaving] = useState(false)

  // Estado para el Toast
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success'
  })

  // Estado para controlar el ActionModal de confirmación/alertas
  const [actionModalConfig, setActionModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
    variant: 'danger' | 'info' | 'success';
  }>({ isOpen: false, title: '', description: '', variant: 'info' });

  const openModal = (r: Review) => {
    setSelected(r)
    setEditRating(r.rating ?? 0)
    setEditComment(r.comment ?? "")
    setEditStatus(r.status)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelected(null)
  }

  const openCreateModal = (trip: TripGroup) => {
    setCreateTrip(trip)
    setCreateMode("driver")
    setCreatePassengerAuthorId(trip.passengers[0]?.id ?? "")
    setCreatePassengerTargetId(trip.passengers[0]?.id ?? "")
    setCreateRating(5)
    setCreateComment("")
    setCreateError(null)
    setCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setCreateModalOpen(false)
    setCreateTrip(null)
    setCreateError(null)
    setCreateSaving(false)
  }

  const saveEdit = async (id: string) => {
    const body: any = { admin: true }
    if (typeof editRating !== "undefined" && editRating !== null) body.rating = editRating
    if (typeof editComment !== "undefined") body.comment = editComment
    if (typeof editStatus !== "undefined" && editStatus !== null) body.status = editStatus

    const res = await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const updated = await res.json()
      setReviews((cur) => cur.map((r) => (r.id === id ? { ...r, ...updated } : r)))
      setToast({ show: true, msg: 'Reseña actualizada con éxito.', type: 'success' })
      closeModal()
    } else {
      console.error("Failed to update review", await res.text())
    }
  }

  const createReview = async () => {
    if (!createTrip) return

    const driver = createTrip.driver
    if (!driver) {
      setCreateError("No se encontró el driver del viaje.")
      return
    }

    const author = createMode === "driver"
      ? driver
      : createTrip.passengers.find((participant) => participant.id === createPassengerAuthorId)

    const target = createMode === "driver"
      ? createTrip.passengers.find((participant) => participant.id === createPassengerTargetId)
      : driver

    if (!author || !target) {
      setCreateError("Seleccioná participantes válidos para crear la reseña.")
      return
    }

    if (author.id === target.id) {
      setCreateError("El autor y el destinatario no pueden ser el mismo usuario.")
      return
    }

    if (createRating < 1 || createRating > 5) {
      setCreateError("La calificación debe estar entre 1 y 5.")
      return
    }

    const reservationId =
      createMode === "driver"
        ? target.reservationId
        : author.reservationId

    setCreateSaving(true)
    setCreateError(null)

    try {
      const created = await createReviewAction({
        pool_id: createTrip.poolId,
        reservation_id: reservationId,
        author_user_id: author.id,
        author_role: toReviewRole(author.role),
        target_user_id: target.id,
        target_role: toReviewRole(target.role),
        author_name: author.name,
        target_name: target.name,
        rating: createRating,
        comment: createComment.trim() ? createComment.trim() : null,
        trip_date: createTrip.tripDate.toISOString(),
      })

      setReviews((cur) => [created, ...cur])
      setToast({ show: true, msg: 'Nueva reseña creada en el sistema.', type: 'success' })
      closeCreateModal()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la reseña."
      setCreateError(message)
    } finally {
      setCreateSaving(false)
    }
  }

  const executeDeleteReview = async (id: string) => {
    const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" })
    if (res.status === 204) {
      setReviews((cur) => cur.filter((r) => r.id !== id))
      setToast({ show: true, msg: 'Reseña eliminada permanentemente.', type: 'success' })
      if (selected?.id === id) closeModal()
    } else {
      const errorText = await res.text()
      console.error("Failed to delete review", errorText)
      setActionModalConfig({
        isOpen: true,
        title: 'Error',
        description: 'No se pudo eliminar la reseña. Inténtalo de nuevo más tarde.',
        variant: 'danger'
      })
    }
  }

  const deleteReview = (id: string) => {
    setActionModalConfig({
      isOpen: true,
      title: '¿Eliminar esta reseña?',
      description: 'Esta acción no se puede deshacer y la reseña desaparecerá permanentemente del sistema.',
      variant: 'danger',
      onConfirm: () => executeDeleteReview(id)
    })
  }

  const toggleExpand = (poolId: string) => setExpanded((s) => ({ ...s, [poolId]: !s[poolId] }))

  const allGrouped = groupReviewsByTrip(reviews).map((trip, idx, arr) => ({
    ...trip,
    displayNumber: arr.length - idx
  }))

  const grouped = allGrouped.filter((trip) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()

    // Check if driver matches
    const driverMatch = trip.driver?.name?.toLowerCase().includes(q) || trip.driver?.id?.toLowerCase().includes(q)
    if (driverMatch) return true

    // Check if any passenger matches
    const passengerMatch = trip.passengers.some(
      (p) => p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q)
    )
    if (passengerMatch) return true

    // Check if any review author/recipient matches
    const reviewMatch = trip.reviews.some((r) => {
      const authorName = (r.author?.name || r.author_user_id || "").toLowerCase()
      const recipientName = (r.recipient?.name || r.target_user_id || "").toLowerCase()
      return authorName.includes(q) || recipientName.includes(q)
    })
    return reviewMatch
  })

  const ITEMS_PER_PAGE = 5
  const totalPages = Math.ceil(grouped.length / ITEMS_PER_PAGE)
  const currentPage = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages || 1)
  const paginatedTrips = grouped.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <>
      <Toast
        isVisible={toast.show}
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />

      <ActionModal
        isOpen={actionModalConfig.isOpen}
        title={actionModalConfig.title}
        description={actionModalConfig.description}
        variant={actionModalConfig.variant}
        onConfirm={actionModalConfig.onConfirm}
        onClose={() => setActionModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="space-y-4 admin-crud-table">
        {/* SEARCH BAR */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por nombre de autor o reseñado..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="ws-input pl-10 pr-4 py-2 text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {paginatedTrips.length === 0 ? (
          <div className="text-sm text-[var(--ws-slate)]">No se encontraron reseñas que coincidan con la búsqueda.</div>
        ) : (
          paginatedTrips.map((trip, idx) => {
            const average = (
              trip.reviews.reduce((a, b) => a + (b.rating || 0), 0) / trip.reviews.length
            ).toFixed(1)

            const absoluteIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx

            return (
              <div key={trip.poolId} className="ws-card ws-card-large">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="ws-pill ws-pill-info uppercase tracking-wider">Viaje #{trip.displayNumber}</span>
                      <p className="text-sm text-[var(--ws-slate)]">Pool ID: {trip.poolId}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-2xl font-black text-[var(--ws-midnight)]">{formatTripKeyDate(trip.tripDate)}</span>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md p-2 text-[var(--ws-midnight)] hover:bg-neutral-100"
                        onClick={() => toggleExpand(trip.poolId)}
                        aria-label="Expandir viaje"
                        aria-expanded={!!expanded[trip.poolId]}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="transition-transform duration-150"
                          style={{ transform: expanded[trip.poolId] ? "rotate(0deg)" : "rotate(-90deg)" }}
                        >
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-[var(--ws-outline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ws-midnight)] hover:bg-neutral-100"
                        onClick={() => openCreateModal(trip)}
                      >
                        Crear reseña
                      </button>
                    </div>

                    <p className="text-[var(--ws-slate)] mt-2">{trip.reviews.length} reseñas — Promedio {average}★</p>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">
                      <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">Reviews</p>
                      <p className="text-2xl font-black text-[var(--ws-midnight)]">{trip.reviews.length}</p>
                    </div>
                    <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">
                      <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">Promedio</p>
                      <p className="text-2xl font-black text-[var(--ws-success)]">{average}★</p>
                    </div>
                  </div>
                </div>

                {expanded[trip.poolId] && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-sm text-[var(--ws-slate)]">
                          <th className="p-2">Fecha</th>
                          <th className="p-2">Autor</th>
                          <th className="p-2">Destinatario</th>
                          <th className="p-2">Rol</th>
                          <th className="p-2">Estado</th>
                          <th className="p-2">Rating</th>
                          <th className="p-2">Comentario</th>
                          <th className="p-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trip.reviews.map((r) => (
                          <tr key={r.id} className="border-t last:border-b">
                            <td className="p-2 align-top text-sm">{new Date(r.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</td>
                            <td className="p-2 align-top text-sm">{highlightText(r.author?.name || r.author_user_id, searchQuery)}</td>
                            <td className="p-2 align-top text-sm">{highlightText(r.recipient?.name || r.target_user_id, searchQuery)}</td>
                            <td className="p-2 align-top text-sm">{r.author_role} → {r.recipient_role || "—"}</td>
                            <td className="p-2 align-top text-sm">{r.status}</td>
                            <td className="p-2 align-top text-sm">{r.rating ?? "—"}</td>
                            <td className="p-2 align-top text-sm">
                              {r.comment ? (
                                <button type="button" className="text-[var(--ws-midnight)] font-semibold" onClick={() => openModal(r)}>
                                  Ver
                                </button>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                            <td className="p-2 align-top text-sm">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  aria-label="Editar"
                                  title="Editar"
                                  className="inline-flex items-center justify-center rounded-md p-2 text-[var(--ws-midnight)] hover:bg-neutral-100"
                                  onClick={() => openModal(r)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </button>
                                <button
                                  type="button"
                                  aria-label="Eliminar"
                                  title="Eliminar"
                                  className="inline-flex items-center justify-center rounded-md p-2 text-red-600 hover:bg-neutral-100"
                                  onClick={() => deleteReview(r.id)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--ws-outline)] pt-6 mt-6">
            <div className="text-sm text-[var(--ws-slate)]">
              Mostrando página <span className="font-semibold text-[var(--ws-midnight)]">{currentPage}</span> de <span className="font-semibold text-[var(--ws-midnight)]">{totalPages}</span> ({grouped.length} viajes en total)
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search)
                  params.set("page", String(currentPage - 1))
                  router.replace(`?${params.toString()}`)
                }}
                className="px-4 py-2 border border-[var(--ws-outline)] rounded-lg text-sm font-bold text-[var(--ws-midnight)] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search)
                  params.set("page", String(currentPage + 1))
                  router.replace(`?${params.toString()}`)
                }}
                className="px-4 py-2 border border-[var(--ws-outline)] rounded-lg text-sm font-bold text-[var(--ws-midnight)] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-3">Editar reseña</h3>
            <p className="text-sm text-neutral-600 mb-4">
              {new Date(selected.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} — {selected.author?.name || selected.author_user_id}
            </p>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Rating</label>
              <input type="number" min={0} max={5} value={editRating ?? 0} onChange={(e) => setEditRating(Number(e.target.value))} className="w-24" />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Comentario</label>
              <textarea value={editComment ?? ""} onChange={(e) => setEditComment(e.target.value)} className="w-full h-28 p-2 border rounded" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select value={editStatus ?? selected.status} onChange={(e) => setEditStatus(e.target.value)} className="px-2 py-1">
                <option>PRECREATED</option>
                <option>PENDING</option>
                <option>COMPLETED</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="ws-danger-button" onClick={() => { deleteReview(selected.id) }}>Eliminar</button>
              <button type="button" className="ws-secondary-button" onClick={closeModal}>Cancelar</button>
              <button type="button" className="ws-primary-button" onClick={() => saveEdit(selected.id)}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {createModalOpen && createTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-3">Crear reseña dentro del viaje</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Pool ID: {createTrip.poolId} — {formatTripKeyDate(createTrip.tripDate)}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Tipo de autor</label>
              <select
                value={createMode}
                onChange={(e) => setCreateMode(e.target.value as CreateMode)}
                className="ws-select"
              >
                <option value="driver">Driver del viaje</option>
                <option value="rider">Pasajero del viaje</option>
              </select>
            </div>

            {createMode === "driver" ? (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Pasajero a calificar</label>
                <select
                  value={createPassengerTargetId}
                  onChange={(e) => setCreatePassengerTargetId(e.target.value)}
                  className="ws-select"
                >
                  {createTrip.passengers.map((passenger) => (
                    <option key={passenger.id} value={passenger.id}>
                      {passenger.name || passenger.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--ws-slate)] mt-2">
                  El autor será {createTrip.driver?.name || createTrip.driver?.id || "el driver del viaje"}.
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Pasajero autor</label>
                <select
                  value={createPassengerAuthorId}
                  onChange={(e) => setCreatePassengerAuthorId(e.target.value)}
                  className="ws-select"
                >
                  {createTrip.passengers.map((passenger) => (
                    <option key={passenger.id} value={passenger.id}>
                      {passenger.name || passenger.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--ws-slate)] mt-2">
                  El destinatario será {createTrip.driver?.name || createTrip.driver?.id || "el driver del viaje"}.
                </p>
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Rating</label>
              <input
                type="number"
                min={1}
                max={5}
                value={createRating}
                onChange={(e) => setCreateRating(Number(e.target.value))}
                className="ws-input w-24"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Comentario</label>
              <textarea
                value={createComment}
                onChange={(e) => setCreateComment(e.target.value)}
                className="ws-textarea"
              />
            </div>

            {createError && (
              <p className="mb-4 text-sm font-semibold text-red-600">{createError}</p>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" className="ws-secondary-button" onClick={closeCreateModal}>Cancelar</button>
              <button type="button" className="ws-primary-button" onClick={createReview} disabled={createSaving}>
                {createSaving ? "Creando..." : "Crear reseña"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
