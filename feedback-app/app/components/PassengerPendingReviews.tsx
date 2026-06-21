"use client"

import { useMemo, useState } from "react"
import CompleteReviewForm from "./CompleteReviewForm"

type PendingReview = {
  id: string
  pool_id: string
  status: string
}

type PoolInfo = {
  destinationName: string
  departureTime: Date
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
              {Array.from({ length: totalPages }, (_, page) => page + 1).map((page) => (
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
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm text-neutral-500 mb-2">
                    Viaje a: <span className="font-bold text-[var(--ws-midnight)]">{poolInfo?.destinationName ?? "Polo Petroquímico"}</span>
                  </p>
                  <h3 className="text-2xl font-black tracking-tight text-[var(--ws-midnight)]">
                    {poolInfo ? new Intl.DateTimeFormat("es-AR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(poolInfo.departureTime)) : "Feedback del viaje"}
                  </h3>
                </div>

                {review.status === "PRECREATED" ? (
                  <div className="ws-pill ws-pill-info">
                    Precreated
                  </div>
                ) : (
                  <div className="ws-pill ws-pill-warning">
                    Pending
                  </div>
                )}
              </div>

              <p className="text-[var(--ws-slate)] mb-6 leading-relaxed">
                Tu viaje con destino a {poolInfo?.destinationName ?? "Polo Petroquímico"} está esperando feedback. Evaluá tu experiencia y ayudá a mejorar futuros viajes.
              </p>

              <CompleteReviewForm reviewId={review.id} poolId={review.pool_id} status={review.status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
