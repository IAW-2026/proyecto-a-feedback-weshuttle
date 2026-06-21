'use client'

import { useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import ReportReviewModal from "./ReportReviewModal"

type ReviewWithDriver = {
  id: string
  pool_id: string
  rating: number | null
  comment: string | null
  createdAt: Date
  enabled_at: Date | null
  completed_at: Date | null
  author: {
    id: string
    name: string | null
  } | null
  reports: {
    id: string
    reporter_user_id: string
  }[]
}

interface Props {
  initialTrips: ReviewWithDriver[]
}

const PAGE_SIZE = 3

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightText(text: string | null | undefined, search: string) {
  const str = text || '—'
  if (!search.trim() || !text) return str

  const regex = new RegExp(`(${escapeRegExp(search)})`, 'gi')
  const parts = str.split(regex)

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

function formatTripDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(date))
}

export default function PassengerTripsList({ initialTrips }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const searchQuery = searchParams.get('search') || ''
  const pageParam = searchParams.get('page') || '1'

  const [searchInput, setSearchInput] = useState(searchQuery)

  // Sync search input with URL params
  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    const params = new URLSearchParams(window.location.search)
    if (val.trim()) {
      params.set('search', val)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.replace(`?${params.toString()}`)
  }

  // 1. Assign static trip numbers to all trips based on their order in initialTrips
  const allTripsWithNumbers = useMemo(() => {
    return initialTrips.map((trip, idx) => ({
      ...trip,
      displayNumber: initialTrips.length - idx,
    }))
  }, [initialTrips])

  // 2. Filter trips by searching Driver name
  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return allTripsWithNumbers
    const q = searchQuery.toLowerCase()

    return allTripsWithNumbers.filter(trip => 
      (trip.author?.name || '').toLowerCase().includes(q)
    )
  }, [allTripsWithNumbers, searchQuery])

  // 3. Paginate
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages)
  const paginatedTrips = filteredTrips.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* TOP CONTROLS (SEARCH & PAGINATION) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* SEARCH BAR */}
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Buscar por nombre de conductor..."
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            className="ws-input pl-10 pr-4 py-2 text-sm w-full"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('page', String(currentPage - 1))
                router.replace(`?${params.toString()}`)
              }}
              disabled={currentPage === 1}
              className="ws-secondary-button h-11 min-h-11 cursor-pointer px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página anterior"
            >
              ←
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search)
                    params.set('page', String(page))
                    router.replace(`?${params.toString()}`)
                  }}
                  className={[
                    "h-11 min-h-11 min-w-11 cursor-pointer rounded-[8px] border px-3 text-sm font-bold transition-all",
                    page === currentPage
                      ? "border-[var(--ws-midnight)] bg-[var(--ws-midnight)] text-white"
                      : "border-[var(--ws-outline)] bg-white text-[var(--ws-midnight)] hover:border-[var(--ws-midnight)]",
                  ].join(" ")}
                  aria-label={`Página ${page}`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('page', String(currentPage + 1))
                router.replace(`?${params.toString()}`)
              }}
              disabled={currentPage === totalPages}
              className="ws-secondary-button h-11 min-h-11 cursor-pointer px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página siguiente"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* TRIP CARDS */}
      {paginatedTrips.length > 0 ? (
        <section className="space-y-6">
          {paginatedTrips.map((trip) => {
            const tripDate = trip.completed_at ?? trip.enabled_at ?? trip.createdAt
            const isReported = trip.reports.length > 0

            return (
              <article key={trip.id} className="ws-card ws-card-large">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="ws-pill ws-pill-info uppercase tracking-wider">
                        Viaje #{trip.displayNumber}
                      </span>

                      <span className="text-neutral-400">•</span>

                      <p className="text-sm text-[var(--ws-slate)]">
                        Pool ID: {trip.pool_id.slice(0, 8)}
                      </p>
                    </div>

                    <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
                      {formatTripDate(tripDate)}
                    </h2>

                    <p className="text-[var(--ws-slate)] leading-relaxed">
                      Feedback recibido del conductor.
                    </p>
                  </div>

                  <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">
                    <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">
                      Calificación
                    </p>
                    <p className="text-2xl font-black text-[var(--ws-success)]">
                      {trip.rating || 0}★
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-sm text-[var(--ws-slate)] mb-1 font-semibold">
                    Conductor
                  </p>
                  <h3 className="text-2xl font-black tracking-tight text-[var(--ws-midnight)]">
                    {highlightText(trip.author?.name || "Conductor", searchQuery)}
                  </h3>
                </div>

                <div className="flex gap-1 text-3xl mb-5 text-green-600">
                  {"★".repeat(trip.rating || 0)}
                </div>

                <p className="text-lg leading-relaxed text-[var(--ws-midnight)]">
                  {trip.comment || "Sin comentario registrado."}
                </p>

                <div className="flex justify-end pt-4 border-t border-[var(--ws-outline)]">
                  <ReportReviewModal
                    reviewId={trip.id}
                    reporterRole="rider"
                    initialIsReported={isReported}
                  />
                </div>
              </article>
            )
          })}

        </section>
      ) : (
        <section className="ws-card ws-card-large">
          <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
            No se encontraron viajes
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
            {searchQuery ? "Ningún viaje coincide con tu búsqueda." : "Todavía no tenés viajes con feedback."}
          </h2>
        </section>
      )}
    </div>
  )
}
