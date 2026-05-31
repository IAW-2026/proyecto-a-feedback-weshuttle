"use client"

import { useState } from "react"

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

export default function AdminReviewsTable({ initialReviews }: { initialReviews: any[] }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews as Review[])
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Review | null>(null)
  const [editRating, setEditRating] = useState<number | null>(null)
  const [editComment, setEditComment] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string | null>(null)

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

  const saveEdit = async (id: string) => {
    const body: any = { admin: true }
    if (typeof editRating !== "undefined" && editRating !== null) body.rating = editRating
    if (typeof editComment !== "undefined") body.comment = editComment
    if (typeof editStatus !== "undefined" && editStatus !== null) body.status = editStatus

    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const updated = await res.json()
      setReviews((cur) => cur.map((r) => (r.id === id ? { ...r, ...updated } : r)))
      closeModal()
    } else {
      console.error('Failed to update review', await res.text())
    }
  }

  const deleteReview = async (id: string) => {
    if (!confirm('¿Eliminar esta reseña? Esta acción no se puede deshacer.')) return

    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' })
    if (res.status === 204) {
      setReviews((cur) => cur.filter((r) => r.id !== id))
      if (selected?.id === id) closeModal()
    } else {
      console.error('Failed to delete review', await res.text())
    }
  }

  function formatTripKeyDate(date: Date) {
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(date)
  }

  function groupReviewsByTrip(reviewsList: Review[]) {
    const groups = new Map<string, { poolId: string; tripDate: Date; reviews: Review[] }>()

    for (const review of reviewsList) {
      const tripDate =
        (review.enabled_at && new Date(review.enabled_at)) ||
        (review.completed_at && new Date(review.completed_at)) ||
        new Date(review.createdAt)

      const existing = groups.get(review.pool_id)
      if (!existing) {
        groups.set(review.pool_id, { poolId: review.pool_id, tripDate, reviews: [review] })
        continue
      }

      existing.reviews.push(review)
      if (tripDate.getTime() > existing.tripDate.getTime()) existing.tripDate = tripDate
    }

    return Array.from(groups.values()).sort((a, b) => b.tripDate.getTime() - a.tripDate.getTime())
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleExpand = (poolId: string) => setExpanded((s) => ({ ...s, [poolId]: !s[poolId] }))

  const grouped = groupReviewsByTrip(reviews)

  return (
    <>
      <div className="space-y-4 admin-crud-table">
        {grouped.length === 0 ? (
          <div className="text-sm text-[var(--ws-slate)]">No hay reseñas para mostrar.</div>
        ) : (
          grouped.map((trip, idx) => {
            const avg = (
              trip.reviews.reduce((a, b) => a + (b.rating || 0), 0) / trip.reviews.length
            ).toFixed(1)

            return (
              <div key={trip.poolId} className="ws-card ws-card-large">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="ws-pill ws-pill-info uppercase tracking-wider">Viaje #{grouped.length - idx}</span>
                      <p className="text-sm text-[var(--ws-slate)]">Pool ID: {trip.poolId}</p>
                    </div>
                    <div className="flex items-center gap-3">
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
                          style={{ transform: expanded[trip.poolId] ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                        >
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    <p className="text-[var(--ws-slate)]">{trip.reviews.length} reseñas — Promedio {avg}★</p>
                  </div>

                  <div className="flex gap-3">
                    <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">
                      <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">Reviews</p>
                      <p className="text-2xl font-black text-[var(--ws-midnight)]">{trip.reviews.length}</p>
                    </div>
                    <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">
                      <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">Promedio</p>
                      <p className="text-2xl font-black text-[var(--ws-success)]">{avg}★</p>
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
                              <td className="p-2 align-top text-sm">{new Date(r.createdAt).toLocaleString()}</td>
                              <td className="p-2 align-top text-sm">{r.author?.name || r.author_user_id}</td>
                              <td className="p-2 align-top text-sm">{r.recipient?.name || r.target_user_id || '—'}</td>
                              <td className="p-2 align-top text-sm">{r.author_role} → {r.recipient_role || '—'}</td>
                              <td className="p-2 align-top text-sm">{r.status}</td>
                              <td className="p-2 align-top text-sm">{r.rating ?? '—'}</td>
                              <td className="p-2 align-top text-sm">{r.comment ? <button type="button" className="text-[var(--ws-midnight)] font-semibold" onClick={() => openModal(r)}>Ver</button> : <span className="text-neutral-400">—</span>}</td>
                              <td className="p-2 align-top text-sm">
                                <div className="flex gap-2">
                                  <button type="button" aria-label="Editar" title="Editar" className="inline-flex items-center justify-center rounded-md p-2 text-[var(--ws-midnight)] hover:bg-neutral-100" onClick={() => openModal(r)}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                  <button type="button" aria-label="Eliminar" title="Eliminar" className="inline-flex items-center justify-center rounded-md p-2 text-red-600 hover:bg-neutral-100" onClick={() => deleteReview(r.id)}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
      </div>

      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-3">Editar reseña</h3>
            <p className="text-sm text-neutral-600 mb-4">{new Date(selected.createdAt).toLocaleString()} — {selected.author?.name || selected.author_user_id}</p>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Rating</label>
              <input type="number" min={0} max={5} value={editRating ?? 0} onChange={(e) => setEditRating(Number(e.target.value))} className="w-24" />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Comentario</label>
              <textarea value={editComment ?? ''} onChange={(e) => setEditComment(e.target.value)} className="w-full h-28 p-2 border rounded" />
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
    </>
  )
}
