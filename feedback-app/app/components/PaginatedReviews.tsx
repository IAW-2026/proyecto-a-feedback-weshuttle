"use client"

import { useMemo, useState } from "react"
import ReportReviewModal from "./ReportReviewModal"

type ReviewItem = {
  id: string
  authorName: string
  reservationId: string | null
  rating: number | null
  comment: string | null
  dateLabel: string
  isReported?: boolean
}

type Props = {
  reviews: ReviewItem[]
  currentUserRole: "driver" | "rider"
}

const pageSize = 3

export default function PaginatedReviews({ reviews, currentUserRole }: Props) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(reviews.length / pageSize))

  const visibleReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return reviews.slice(start, start + pageSize)
  }, [currentPage, reviews])
// constante que define la función goToPage, que se encarga de actualizar 
// el estado currentPage para navegar entre las páginas de reseñas.
  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  if (reviews.length === 0) {
    return null
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--ws-slate)] font-semibold">
          Mostrando {visibleReviews.length} de {reviews.length} reseñas
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="ws-secondary-button h-11 min-h-11 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página anterior"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
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
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ws-secondary-button h-11 min-h-11 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página siguiente"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {visibleReviews.map((review) => (
          <article key={review.id} className="ws-card ws-card-large">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
              <div>
                <p className="text-sm text-[var(--ws-slate)] mb-1 font-semibold">
                  {currentUserRole === "driver" ? "Pasajero" : "Conductor"}
                </p>

                <h2 className="text-2xl font-black tracking-tight text-[var(--ws-midnight)]">
                  {review.authorName}
                </h2>

                {review.reservationId && (
                  <p className="text-sm text-[var(--ws-slate)] mt-2">
                    Reserva {review.reservationId}
                  </p>
                )}
              </div>

              <div className="ws-pill ws-pill-info">
                {review.dateLabel}
              </div>
            </div>

            <div className="flex gap-1 text-3xl mb-5 text-[var(--ws-success)]">
              {"★".repeat(review.rating || 0)}
            </div>

            <div className="space-y-4">
              <p className="text-lg leading-relaxed text-[var(--ws-midnight)]">
                {review.comment || "Sin comentario registrado."}
              </p>

              <div className="flex justify-end pt-4 border-t border-[var(--ws-outline)]">
                <ReportReviewModal 
                  reviewId={review.id} 
                  reporterRole={currentUserRole} 
                  initialIsReported={review.isReported}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}