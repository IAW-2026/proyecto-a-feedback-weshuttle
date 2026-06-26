'use client'

import { useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

type ReviewWithRecipient = {
  id: string
  pool_id: string
  rating: number | null
  comment: string | null
  createdAt: Date
  enabled_at: Date | null
  completed_at: Date | null
  recipient: {
    id: string
    name: string | null
  } | null
}

interface Props {
  initialReviews: ReviewWithRecipient[]
}

async function downloadXLSX(filename: string, sheetName: string, headers: string[], rows: any[][]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Configure columns and estimated widths
  worksheet.columns = headers.map((h, i) => {
    let width = 16;
    if (h === "Comentario") width = 45;
    else if (h.includes("ID") || h.includes("Reseña")) width = 22;
    else if (h.includes("Fecha")) width = 20;
    else if (h.includes("Nombre") || h.includes("Conductor")) width = 22;
    return {
      header: h,
      key: `col_${i}`,
      width: width
    };
  });

  // Add rows
  worksheet.addRows(rows);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" } // Midnight Blue
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Style data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const isEven = rowNumber % 2 === 0;
    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Zebra striping
      if (isEven) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" }
        };
      }

      // Thin borders
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };

      cell.font = { name: "Segoe UI", size: 10 };

      // Formatting based on header type
      const headerName = headers[colNumber - 1];
      if (headerName === "Comentario") {
        cell.alignment = { wrapText: true, vertical: "top", horizontal: "left" };
        const textLen = cell.value ? String(cell.value).length : 0;
        if (textLen > 45) {
          const approxLines = Math.ceil(textLen / 40);
          row.height = Math.max(row.height || 22, approxLines * 16 + 10);
        }
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Format rating with star visual representation
      if (headerName === "Calificación" && cell.value !== null && cell.value !== undefined) {
        const ratingVal = Number(cell.value);
        if (!isNaN(ratingVal)) {
          cell.value = `${ratingVal.toFixed(1)} ★`;
          if (ratingVal >= 4.0) {
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF15803D" } };
          } else if (ratingVal <= 2.0) {
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFB91C1C" } };
          }
        }
      }
    });
  });

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(date))
}

export default function PassengerSentReviewsList({ initialReviews }: Props) {
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

  // 1. Assign static trip numbers to all reviews based on their order in initialReviews
  const allReviewsWithNumbers = useMemo(() => {
    return initialReviews.map((review, idx) => ({
      ...review,
      displayNumber: initialReviews.length - idx,
    }))
  }, [initialReviews])

  // 2. Filter reviews by searching Conductor name (recipient)
  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return allReviewsWithNumbers
    const q = searchQuery.toLowerCase()

    return allReviewsWithNumbers.filter(review => 
      (review.recipient?.name || '').toLowerCase().includes(q)
    )
  }, [allReviewsWithNumbers, searchQuery])

  // 3. Paginate
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages)
  const paginatedReviews = filteredReviews.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleExportAllReviews = () => {
    const headers = [
      "ID Reseña",
      "Fecha Creación",
      "Pool ID",
      "Conductor Destinatario",
      "Calificación",
      "Comentario"
    ];

    const rows = filteredReviews.map((r) => [
      r.id,
      new Date(r.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
      r.pool_id,
      r.recipient?.name || r.recipient?.id || "Conductor",
      r.rating !== null ? Number(r.rating) : null,
      r.comment || ""
    ]);

    const formattedDate = new Date()
      .toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
      .replace(/\//g, "-");
    const filename = searchQuery.trim()
      ? `resenas_enviadas_filtradas_${searchQuery.trim().replace(/\s+/g, "_")}_${formattedDate}.xlsx`
      : `todas_las_resenas_enviadas_${formattedDate}.xlsx`;

    downloadXLSX(filename, "Reseñas Enviadas", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* TOP CONTROLS (SEARCH & PAGINATION) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* SEARCH BAR & EXPORT */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:max-w-xl">
          <div className="relative flex-1">
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
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-[var(--ws-outline)] bg-[var(--ws-info-soft)] text-[var(--ws-midnight)] px-4 py-2 h-11 text-sm font-bold hover:bg-neutral-100 transition-all cursor-pointer whitespace-nowrap"
            onClick={handleExportAllReviews}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2" style={{ color: "#16A34A" }}>
              <path d="M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Exportar todas las reseñas enviadas
          </button>
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

      {/* REVIEW CARDS */}
      {paginatedReviews.length > 0 ? (
        <section className="space-y-6">
          {paginatedReviews.map((review) => {
            const tripDate = review.completed_at ?? review.enabled_at ?? review.createdAt

            return (
              <article key={review.id} className="ws-card ws-card-large">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="ws-pill ws-pill-info uppercase tracking-wider">
                        Reseña #{review.displayNumber}
                      </span>

                      <span className="text-neutral-400">•</span>

                      <p className="text-sm text-[var(--ws-slate)]">
                        Pool ID: {review.pool_id.slice(0, 8)}
                      </p>
                    </div>

                    <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
                      {formatTripDate(tripDate)}
                    </h2>

                    <p className="text-[var(--ws-slate)] leading-relaxed">
                      Feedback enviado al conductor.
                    </p>
                  </div>

                  <div className="bg-[var(--ws-info-soft)] rounded-[12px] px-5 py-4 border border-[var(--ws-outline)]">
                    <p className="text-xs text-[var(--ws-slate)] mb-1 font-semibold">
                      Calificación enviada
                    </p>
                    <p className="text-2xl font-black text-[var(--ws-success)]">
                      {review.rating || 0}★
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-sm text-[var(--ws-slate)] mb-1 font-semibold">
                    Conductor destinatario
                  </p>
                  <h3 className="text-2xl font-black tracking-tight text-[var(--ws-midnight)]">
                    {highlightText(review.recipient?.name || "Conductor", searchQuery)}
                  </h3>
                </div>

                <div className="flex gap-1 text-3xl mb-5 text-green-600">
                  {"★".repeat(review.rating || 0)}
                </div>

                <p className="text-lg leading-relaxed text-[var(--ws-midnight)]">
                  {review.comment || "Sin comentario registrado."}
                </p>
              </article>
            )
          })}

        </section>
      ) : (
        <section className="ws-card ws-card-large">
          <p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
            No se encontraron reseñas
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
            {searchQuery ? "Ninguna reseña coincide con tu búsqueda." : "Todavía no enviaste ninguna reseña."}
          </h2>
        </section>
      )}
    </div>
  )
}
