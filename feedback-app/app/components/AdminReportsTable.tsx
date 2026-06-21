'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { updateReportStatus } from '@/prisma/report-actions'
import ActionModal from './ActionModal'
import Toast from './Toast'

type ReportStatus = 'PENDING' | 'RESUELTO' | 'RECHAZADO'

interface ReportItem {
  id: string
  type: string
  description: string | null
  status: ReportStatus
  createdAt: string
  reporter_role: string
  reporter_user_id: string
  reporter_name: string | null
  review: {
    id: string
    pool_id: string
    comment: string | null
    rating: number | null
    author: { name: string | null }
    recipient: { name: string | null }
  }
}

interface Props {
  initialReports: ReportItem[]
}

const PAGE_SIZE = 5

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

export default function AdminReportsTable({ initialReports }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const searchQuery = searchParams.get('search') || ''
  const pageParam = searchParams.get('page') || '1'
  const roleParam = (searchParams.get('role') || 'all') as 'all' | 'rider' | 'driver'

  const [reports, setReports] = useState(initialReports)
  const [expandedTrips, setExpandedTrips] = useState<Record<string, boolean>>({})
  const [updatingReportId, setIsUpdating] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(searchQuery)

  // Sync input with URL on external navigation
  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  // Estado para el Toast
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success'
  })

  // Estado para controlar el ActionModal
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
    variant: 'danger' | 'info' | 'success';
  }>({ isOpen: false, title: '', description: '', variant: 'info' });

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search)
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '' || val === 'all') {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })
    params.set('page', '1')
    router.replace(`?${params.toString()}`)
  }

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

  const handleRoleChange = (role: 'all' | 'rider' | 'driver') => {
    updateParams({ role: role === 'all' ? null : role })
  }

  // 1. Apply role filter
  const roleFiltered = useMemo(() => {
    return roleParam === 'all'
      ? reports
      : reports.filter(r => r.reporter_role === roleParam)
  }, [reports, roleParam])

  // 2. Group by pool
  const allGroups: Array<{ poolId: string; tripReports: ReportItem[]; displayNumber: number }> = useMemo(() => {
    const groups: Record<string, ReportItem[]> = {}
    roleFiltered.forEach(report => {
      const poolId = report.review.pool_id
      if (!groups[poolId]) groups[poolId] = []
      groups[poolId].push(report)
    })
    const sorted = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    return sorted.map(([poolId, tripReports], idx, arr) => ({
      poolId,
      tripReports,
      displayNumber: arr.length - idx
    }))
  }, [roleFiltered])

  // 3. Apply search filter at trip level
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return allGroups
    const q = searchQuery.toLowerCase()
    return allGroups.filter(({ tripReports }) =>
      tripReports.some(report => {
        const authorName = (report.review.author.name || '').toLowerCase()
        const recipientName = (report.review.recipient.name || '').toLowerCase()
        const reporterName = (report.reporter_name || report.reporter_user_id || '').toLowerCase()
        return authorName.includes(q) || recipientName.includes(q) || reporterName.includes(q)
      })
    )
  }, [allGroups, searchQuery])

  // 4. Paginate
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages)
  const visibleTrips = filteredGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const toggleTrip = (poolId: string) => {
    setExpandedTrips(prev => ({ ...prev, [poolId]: !prev[poolId] }))
  }

  const executeStatusUpdate = async (reportId: string, newStatus: 'RESUELTO' | 'RECHAZADO') => {
    setIsUpdating(reportId)
    const result = await updateReportStatus(reportId, newStatus)
    setIsUpdating(null)

    if (result.success) {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r))
      setToast({
        show: true,
        msg: newStatus === 'RESUELTO' ? 'Reporte resuelto y reseña ocultada.' : 'Reporte rechazado correctamente.',
        type: 'success'
      })
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Error',
        description: result.error || 'No se pudo actualizar el estado del reporte.',
        variant: 'danger'
      })
    }
  }

  const handleStatusUpdate = (reportId: string, newStatus: 'RESUELTO' | 'RECHAZADO') => {
    if (newStatus === 'RESUELTO') {
      setModalConfig({
        isOpen: true,
        title: '¿Resolver reporte?',
        description: 'Al resolver este reporte, la reseña ofensiva será ocultada permanentemente para los usuarios.',
        variant: 'info',
        onConfirm: () => executeStatusUpdate(reportId, newStatus)
      })
    } else {
      setModalConfig({
        isOpen: true,
        title: '¿Rechazar reporte?',
        description: 'Si rechazas el reporte, la reseña permanecerá visible y el reporte se marcará como cerrado.',
        variant: 'danger',
        onConfirm: () => executeStatusUpdate(reportId, newStatus)
      })
    }
  }

  const getStatusPill = (status: ReportStatus) => {
    switch (status) {
      case 'PENDING': return 'ws-pill-warning'
      case 'RESUELTO': return 'ws-pill-success'
      case 'RECHAZADO': return 'bg-gray-200 text-gray-600'
      default: return ''
    }
  }

  return (
    <div className="space-y-6 relative">
      <Toast
        isVisible={toast.show}
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />

      <ActionModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        description={modalConfig.description}
        variant={modalConfig.variant}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* TOOLBAR: Search + Role filter + Pagination */}
      <div className="flex flex-col gap-4">

        {/* Search bar */}
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Buscar por nombre de autor, destinatario..."
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

        {/* Role pills + pagination */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-[var(--ws-outline)] shadow-sm">
          <div className="flex gap-2">
            {(['all', 'rider', 'driver'] as const).map(r => (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${roleParam === r ? 'bg-[var(--ws-midnight)] text-white' : 'bg-transparent text-[var(--ws-slate)] hover:bg-slate-50'}`}
              >
                {r === 'all' ? 'Todos' : r === 'rider' ? 'Pasajeros' : 'Conductores'}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2 pr-2">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search)
                  params.set('page', String(currentPage - 1))
                  router.replace(`?${params.toString()}`)
                }}
                disabled={currentPage === 1}
                className="ws-secondary-button h-10 w-10 p-0 flex items-center justify-center disabled:opacity-40 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-[10px] font-black text-[var(--ws-slate)] uppercase px-2">
                Pág. {currentPage} / {totalPages}
                {searchQuery && <span className="ml-1 opacity-60">({filteredGroups.length} viajes)</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search)
                  params.set('page', String(currentPage + 1))
                  router.replace(`?${params.toString()}`)
                }}
                disabled={currentPage === totalPages}
                className="ws-secondary-button h-10 w-10 p-0 flex items-center justify-center disabled:opacity-40 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trip cards */}
      {visibleTrips.length === 0 ? (
        <div className="ws-card p-12 text-center text-[var(--ws-slate)] font-bold">
          {searchQuery ? 'No se encontraron reportes que coincidan con la búsqueda.' : 'No hay reportes que coincidan con el filtro.'}
        </div>
      ) : (
        visibleTrips.map(({ poolId, tripReports, displayNumber }) => (
          <div key={poolId} className="ws-card overflow-hidden">
            {/* Cabecera del Viaje */}
            <button
              onClick={() => toggleTrip(poolId)}
              className="w-full flex items-center justify-between p-6 bg-slate-50 border-b border-[var(--ws-outline)] cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-3">
                  <span className="ws-pill ws-pill-info uppercase tracking-wider text-[10px] font-black">Viaje #{displayNumber}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ws-slate)]">Pool ID</span>
                </div>
                <span className="text-base font-black text-[var(--ws-midnight)]">{poolId}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="ws-pill ws-pill-info font-black">
                  {tripReports.length} {tripReports.length === 1 ? 'Reporte' : 'Reportes'}
                </span>
                <div className={`transition-transform duration-200 ${expandedTrips[poolId] ? 'rotate-180' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Lista de Reportes del Viaje */}
            {expandedTrips[poolId] && (
              <div className="p-0 divide-y divide-[var(--ws-outline)]">
                {tripReports.map(report => (
                  <div key={report.id} className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`ws-pill ${getStatusPill(report.status)} text-[10px] font-black uppercase tracking-tighter`}>
                            {report.status}
                          </span>
                          <span className="text-red-600 font-black text-xs uppercase tracking-widest">
                            {report.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--ws-midnight)] font-medium">
                          Reportado por:{' '}
                          <span className="font-bold">
                            {highlightText(report.reporter_name || report.reporter_user_id, searchQuery)}
                          </span>
                          <span className="opacity-50 ml-1 text-xs">({report.reporter_role})</span>
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {report.status !== 'RESUELTO' && report.status !== 'RECHAZADO' && (
                          <>
                            <button
                              disabled={!!updatingReportId}
                              onClick={() => handleStatusUpdate(report.id, 'RECHAZADO')}
                              className="px-3 py-2 text-[10px] font-black uppercase bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                            >
                              Rechazar
                            </button>
                            <button
                              disabled={!!updatingReportId}
                              onClick={() => handleStatusUpdate(report.id, 'RESUELTO')}
                              className="px-3 py-2 text-[10px] font-black uppercase bg-[var(--ws-midnight)] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                            >
                              Resolver
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Contenido del Reporte y de la Reseña */}
                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-[var(--ws-outline)]">
                      <div className="bg-[var(--ws-info-soft)] p-4 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-[var(--ws-midnight)] opacity-40 mb-2">Detalles del Reporte</h4>
                        <p className="text-sm text-[var(--ws-midnight)] italic">
                          {report.description || 'Sin descripción adicional.'}
                        </p>
                        <p className="text-[10px] mt-4 opacity-40 font-bold uppercase">Fecha: {new Date(report.createdAt).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</p>
                      </div>

                      <div className="bg-white border border-[var(--ws-outline)] p-4 rounded-xl shadow-sm">
                        <h4 className="text-[10px] font-black uppercase text-[var(--ws-midnight)] opacity-40 mb-2">Reseña Bajo Sospecha</h4>
                        <div className="flex gap-1 text-yellow-400 text-sm mb-2">
                          {'★'.repeat(report.review.rating || 0)}
                        </div>
                        <p className="text-sm text-[var(--ws-midnight)] font-bold mb-1">
                          De{' '}
                          {highlightText(report.review.author.name || 'Anónimo', searchQuery)}
                          {' '}a{' '}
                          {highlightText(report.review.recipient.name || 'Anónimo', searchQuery)}
                        </p>
                        <p className="text-sm text-[var(--ws-midnight)]">
                          &ldquo;{report.review.comment || 'Sin comentario.'}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}