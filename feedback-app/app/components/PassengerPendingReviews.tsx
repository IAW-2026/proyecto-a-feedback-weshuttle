"use client"

import { useMemo, useState } from "react"
import CompleteReviewForm from "./CompleteReviewForm"

type PendingReview = {
  id: string
  pool_id: string
  status: string
  recipient: {
    name: string | null
  }
}

type PoolInfo = {
  destinationName: string
  departureTime: Date
  driverName?: string
}

type Props = {
  reviews: PendingReview[]
  poolDetails: Record<string, PoolInfo>
}

const pageSize = 3

export default function PassengerPendingReviews({ reviews, poolDetails }: Props) {
  const [currentPage, setCurrentPage] = useState(1)

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const timeA = poolDetails[a.pool_id]?.departureTime
        ? new Date(poolDetails[a.pool_id].departureTime).getTime()
        : 0
      const timeB = poolDetails[b.pool_id]?.departureTime
        ? new Date(poolDetails[b.pool_id].departureTime).getTime()
        : 0
      return timeB - timeA
    })
  }, [reviews, poolDetails])

  const totalPages = Math.max(1, Math.ceil(sortedReviews.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  
  // Sliding window of 5 buttons centered around activePage
  const half = Math.floor(5 / 2)
  let winStart = Math.max(1, activePage - half)
  let winEnd = winStart + 4
  if (winEnd > totalPages) {
    winEnd = totalPages
    winStart = Math.max(1, winEnd - 4)
  }
  const pageWindow = Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i)

  const visibleReviews = useMemo(() => {
    const start = (activePage - 1) * pageSize
    return sortedReviews.slice(start, start + pageSize)
  }, [activePage, sortedReviews])

  const setPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  if (reviews.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--ws-slate)] font-semibold">
          Mostrando {visibleReviews.length} de {sortedReviews.length} formularios
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(activePage - 1)}
              disabled={activePage === 1}
              className="ws-secondary-button h-11 min-h-11 cursor-pointer px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página anterior"
            >
              ←
            </button>

            <div className="flex items-center gap-2">
              {pageWindow.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setPage(page)}
                  className={[
                    "h-11 min-h-11 min-w-11 cursor-pointer rounded-[8px] border px-3 text-sm font-bold transition-all",
                    page === activePage
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
              onClick={() => setPage(activePage + 1)}
              disabled={activePage === totalPages}
              className="ws-secondary-button h-11 min-h-11 cursor-pointer px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página siguiente"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {visibleReviews.map((review) => {
          const poolInfo = poolDetails[review.pool_id]
          return (
            <div key={review.id} className="ws-card ws-card-large">
              <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                  <p className="text-sm text-[var(--ws-midnight)] font-bold">CALIFICAR AL CONDUCTOR:</p>
                  <h3 className="text-2xl font-black tracking-tight text-[var(--ws-midnight)]">
                    {poolInfo?.driverName || review.recipient.name || "Conductor"}
                  </h3>
                  <p className="text-xs text-[var(--ws-slate)] mt-2">
                    Viaje a: <span className="font-semibold text-[var(--ws-midnight)]">{poolInfo?.destinationName ?? "Polo Petroquímico"}</span>
                  </p>
                  <p className="text-xs text-[var(--ws-slate)] mt-1">
                    Fecha: <span className="font-semibold text-[var(--ws-midnight)]">{poolInfo ? new Intl.DateTimeFormat("es-AR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "America/Argentina/Buenos_Aires",
                    }).format(new Date(poolInfo.departureTime)) : "Fecha del viaje"}</span>
                  </p>
                </div>

                {review.status === "PRECREATED" ? (
                  <div className="ws-pill ws-pill-info shrink-0">
                    Precreated
                  </div>
                ) : (
                  <div className="ws-pill ws-pill-warning shrink-0">
                    Pending
                  </div>
                )}
              </div>

              <CompleteReviewForm reviewId={review.id} poolId={review.pool_id} status={review.status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
