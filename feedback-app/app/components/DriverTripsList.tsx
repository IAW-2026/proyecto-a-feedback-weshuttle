'use client'

import { useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

type DriverTripReview = {
  id: string
  pool_id: string
  rating: number | null
  createdAt: Date
  enabled_at: Date | null
  completed_at: Date | null
  author: {
    id: string
    name: string | null
  } | null
}

type TripGroup = {
  poolId: string
  tripDate: Date
  reviews: DriverTripReview[]
  displayNumber?: number
  matchedAuthor?: string | null
}

interface Props {
  initialReviews: DriverTripReview[]
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

function formatTripKeyDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(date))
}

function groupReviewsByTrip(reviews: DriverTripReview[]) {
  const groups = new Map<string, TripGroup>()

  for (const review of reviews) {
    const tripDate =
      review.enabled_at ??
      review.completed_at ??
      review.createdAt

    const existingGroup = groups.get(review.pool_id)

    if (!existingGroup) {
      groups.set(review.pool_id, {
        poolId: review.pool_id,
        tripDate,
        reviews: [review],
      })
      continue
    }

    existingGroup.reviews.push(review)

    if (new Date(tripDate).getTime() > new Date(existingGroup.tripDate).getTime()) {
      existingGroup.tripDate = tripDate
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime()
  )
}

export default function DriverTripsList({ initialReviews }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const searchQuery = searchParams.get('search') || ''
  const pageParam = searchParams.get('page') || '1'

  const [searchInput, setSearchInput] = useState(searchQuery)

  // Sync input on external navigation
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

  // 1. Group all reviews to assign static trip numbers
  const allGrouped = useMemo(() => {
    const grouped = groupReviewsByTrip(initialReviews)
    return grouped.map((trip, idx, arr) => ({
      ...trip,
      displayNumber: arr.length - idx,
    }))
  }, [initialReviews])

  // 2. Filter grouped trips by searching passenger names
  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return allGrouped
    const q = searchQuery.toLowerCase()

    return allGrouped
      .map(trip => {
        // Find if any passenger matches the search query
        const matchingReview = trip.reviews.find(r => 
          (r.author?.name || '').toLowerCase().includes(q)
        )
        return {
          ...trip,
          matchedAuthor: matchingReview?.author?.name || null
        }
      })
      .filter(trip => trip.matchedAuthor !== null)
  }, [allGrouped, searchQuery])

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
            placeholder="Buscar por nombre de pasajero..."
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

      {/* TRIP LIST */}
      {paginatedTrips.length > 0 ? (
        <section className="space-y-6">
          {paginatedTrips.map((trip) => {
            const average = (
              trip.reviews.reduce((a, b) => a + (b.rating || 0), 0) / trip.reviews.length
            ).toFixed(1)

            return (
              <Link
                key={trip.poolId}
                href={`/dashboard/driver/trips/${trip.poolId}`}
                className="block"
              >
                <article className="ws-card ws-card-large transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(10,25,47,0.1)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="ws-pill ws-pill-info uppercase tracking-wider">
                          Viaje #{trip.displayNumber}
                        </span>

                        <span className="text-neutral-400">•</span>

                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[var(--ws-slate)]">
                            Pool ID: {trip.poolId}
                          </p>
                          {trip.matchedAuthor && (
                            <span className="text-xs bg-[var(--ws-success-soft)] text-[var(--ws-success)] font-black rounded-lg px-2.5 py-1 uppercase tracking-wider">
                              Coincidencia: {highlightText(trip.matchedAuthor, searchQuery)}
                            </span>
                          )}
                        </div>
                      </div>

                      <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
                        {formatTripKeyDate(trip.tripDate)}
                      </h2>

                      <p className="text-[var(--ws-slate)] leading-relaxed">
                        Ver opiniones y feedback de pasajeros.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">
                        <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">
                          Reviews
                        </p>
                        <p className="text-2xl font-black text-[var(--ws-midnight)]">
                          {trip.reviews.length}
                        </p>
                      </div>

                      <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">
                        <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">
                          Promedio
                        </p>
                        <p className="text-2xl font-black text-[var(--ws-success)]">
                          {average}★
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            )
          })}

        </section>
      ) : (
        <section className="ws-card ws-card-large">
          <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
            No se encontraron viajes
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
            {searchQuery ? "Ningún viaje coincide con tu búsqueda." : "Cuando lleguen reseñas, van a aparecer agrupadas acá."}
          </h2>
        </section>
      )}
    </div>
  )
}
