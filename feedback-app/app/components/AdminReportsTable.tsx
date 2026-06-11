'use client'

import { useState, useMemo } from 'react'
import { updateReportStatus } from '@/prisma/report-actions'

type ReportStatus = 'PENDING' | 'RESUELTO' | 'RECHAZADO'

interface ReportItem {
  id: string
  type: string
  description: string | null
  status: ReportStatus
  createdAt: string
  reporter_role: string
  reporter_user_id: string
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

export default function AdminReportsTable({ initialReports }: Props) {
  const [reports, setReports] = useState(initialReports)
  const [expandedTrips, setExpandedTrips] = useState<Record<string, boolean>>({})
  const [updatingReportId, setIsUpdating] = useState<string | null>(null)

  // Agrupamos los reportes por Pool ID (Viaje)
  const reportsByTrip = useMemo(() => {
    const groups: Record<string, ReportItem[]> = {}
    reports.forEach((report) => {
      const poolId = report.review.pool_id
      if (!groups[poolId]) groups[poolId] = []
      groups[poolId].push(report)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [reports])

  const toggleTrip = (poolId: string) => {
    setExpandedTrips(prev => ({ ...prev, [poolId]: !prev[poolId] }))
  }

  const handleStatusUpdate = async (reportId: string, newStatus: 'RESUELTO' | 'RECHAZADO') => {
    if (newStatus === 'RESUELTO' && !confirm('¿Resolver este reporte? Si la reseña es inapropiada, será marcada para eliminación.')) return
    
    setIsUpdating(reportId)
    const result = await updateReportStatus(reportId, newStatus)
    setIsUpdating(null)

    if (result.success) {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r))
    } else {
      alert(result.error || 'Error al actualizar el estado')
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
    <div className="space-y-6">
      {reportsByTrip.length === 0 ? (
        <div className="ws-card p-12 text-center text-[var(--ws-slate)] font-bold">
          No hay reportes pendientes de revisión.
        </div>
      ) : (
        reportsByTrip.map(([poolId, tripReports]) => (
          <div key={poolId} className="ws-card overflow-hidden">
            {/* Cabecera del Viaje */}
            <button 
              onClick={() => toggleTrip(poolId)}
              className="w-full flex items-center justify-between p-6 bg-slate-50 border-b border-[var(--ws-outline)] cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ws-slate)]">Viaje / Pool ID</span>
                <span className="text-xl font-black text-[var(--ws-midnight)]">{poolId}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="ws-pill ws-pill-info font-black">
                  {tripReports.length} {tripReports.length === 1 ? 'Reporte' : 'Reportes'}
                </span>
                <span className={`text-2xl transition-transform duration-200 ${expandedTrips[poolId] ? 'rotate-180' : ''}`}>
                  ↓
                </span>
              </div>
            </button>

            {/* Lista de Reportes del Viaje */}
            {expandedTrips[poolId] && (
              <div className="p-0 divide-y divide-[var(--ws-outline)]">
                {tripReports.map((report) => (
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
                          ID Reportero: <span className="font-bold">{report.reporter_user_id}</span> 
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
                              className="px-3 py-2 text-[10px] font-black uppercase bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
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
                        <p className="text-[10px] mt-4 opacity-40 font-bold uppercase">Fecha: {new Date(report.createdAt).toLocaleDateString()}</p>
                      </div>

                      <div className="bg-white border border-[var(--ws-outline)] p-4 rounded-xl shadow-sm">
                        <h4 className="text-[10px] font-black uppercase text-[var(--ws-midnight)] opacity-40 mb-2">Reseña Bajo Sospecha</h4>
                        <div className="flex gap-1 text-yellow-400 text-sm mb-2">
                          {'★'.repeat(report.review.rating || 0)}
                        </div>
                        <p className="text-sm text-[var(--ws-midnight)] font-bold mb-1">
                          De {report.review.author.name || 'Anónimo'} a {report.review.recipient.name || 'Anónimo'}
                        </p>
                        <p className="text-sm text-[var(--ws-midnight)]">
                          "{report.review.comment || 'Sin comentario.'}"
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