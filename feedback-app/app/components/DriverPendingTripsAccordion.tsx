"use client"

import { useMemo, useState } from "react"
import CompleteReviewForm from "./CompleteReviewForm"

type PendingReviewItem = {
	id: string
	recipientName: string | null
	createdAt: string
}

type PendingTripGroup = {
	poolId: string
	date: string
	reviews: PendingReviewItem[]
}

type Props = {
	trips: PendingTripGroup[]
}

const pageSize = 3

export default function DriverPendingTripsAccordion({ trips }: Props) {
	const [expandedPoolId, setExpandedPoolId] = useState<string | null>(trips[0]?.poolId ?? null)
	const [currentPageByTrip, setCurrentPageByTrip] = useState<Record<string, number>>({})

	const totalTrips = trips.length

	const toggleTrip = (poolId: string) => {
		setExpandedPoolId((current) => (current === poolId ? null : poolId))
	}

	const setPage = (poolId: string, page: number, totalPages: number) => {
		setCurrentPageByTrip((current) => ({
			...current,
			[poolId]: Math.min(Math.max(page, 1), totalPages),
		}))
	}

	if (totalTrips === 0) {
		return null
	}

	return (
		<div className="space-y-8">
			{trips.map((trip, index) => {
				const isExpanded = expandedPoolId === trip.poolId
				const totalPages = Math.max(1, Math.ceil(trip.reviews.length / pageSize))
				const currentPage = Math.min(currentPageByTrip[trip.poolId] ?? 1, totalPages)
				const start = (currentPage - 1) * pageSize
				const visibleReviews = trip.reviews.slice(start, start + pageSize)

				return (
					<article key={trip.poolId} className="ws-card overflow-hidden">
						<button
							type="button"
							onClick={() => toggleTrip(trip.poolId)}
							className="w-full cursor-pointer bg-slate-50 px-8 py-4 border-b border-[var(--ws-outline)] flex items-center justify-between gap-4 text-left"
							aria-expanded={isExpanded}
						>
							<div>
								<p className="text-xs font-bold text-[var(--ws-slate)] uppercase tracking-widest mb-2">
									Viaje
								</p>
								<p className="text-2xl font-black tracking-tight text-[var(--ws-midnight)] leading-tight">
									{new Intl.DateTimeFormat("es-AR", {
										dateStyle: "medium",
										timeStyle: "short",
									}).format(new Date(trip.date))}
								</p>
								<p className="text-sm text-[var(--ws-slate)] mt-1 leading-relaxed">
									Pool ID: {trip.poolId}
								</p>
							</div>

							<div className="flex items-center gap-3 shrink-0">
								<span
									className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ws-outline)] bg-white text-[var(--ws-midnight)] transition-transform cursor-pointer ${
										isExpanded ? "rotate-90" : ""
									}`}
									aria-hidden="true"
								>
									→
								</span>
							</div>
						</button>

						{isExpanded && (
							<div className="p-4 sm:p-6 space-y-5">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<p className="text-sm text-[var(--ws-slate)] font-semibold">
										Mostrando {visibleReviews.length} de {trip.reviews.length} formularios
									</p>

									{totalPages > 1 && (
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => setPage(trip.poolId, currentPage - 1, totalPages)}
												disabled={currentPage === 1}
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
														onClick={() => setPage(trip.poolId, page, totalPages)}
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
												onClick={() => setPage(trip.poolId, currentPage + 1, totalPages)}
												disabled={currentPage === totalPages}
												className="ws-secondary-button h-11 min-h-11 cursor-pointer px-4 disabled:opacity-40 disabled:cursor-not-allowed"
												aria-label="Página siguiente"
											>
												→
											</button>
										</div>
									)}
								</div>

								<div className="space-y-4">
									{visibleReviews.map((review) => (
										<div key={review.id} className="bg-white rounded-[12px] p-6 border border-[var(--ws-outline)]">
											<div className="flex items-start justify-between mb-6 gap-4">
												<div>
													<p className="text-sm text-[var(--ws-midnight)] font-bold">CALIFICAR A:</p>
													<h3 className="text-xl font-black tracking-tight text-[var(--ws-midnight)]">
														{review.recipientName || "Pasajero"}
													</h3>
												</div>

												<div className="ws-pill ws-pill-warning shrink-0">
													Pending
												</div>
											</div>

											<CompleteReviewForm reviewId={review.id} />
										</div>
									))}
								</div>
							</div>
						)}
					</article>
				)
			})}
		</div>
	)
}
