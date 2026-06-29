'use client'

import { useState } from 'react'
import { createReport } from '@/prisma/report-actions'
import Toast from './Toast'

interface ReportReviewModalProps {
  reviewId: string
  reporterRole: 'rider' | 'driver'
  initialIsReported?: boolean
}

export default function ReportReviewModal({ reviewId, reporterRole, initialIsReported = false }: ReportReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [reported, setReported] = useState(initialIsReported)

  // Estado para la notificación de popeo (Toast)
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success'
  })

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setToast(prev => ({ ...prev, show: false }))
    
    // Agregamos los campos ocultos necesarios para la Server Action
    formData.append('reviewId', reviewId)
    formData.append('reporterRole', reporterRole || 'driver')

    const result = await createReport(formData)
    
    setIsPending(false)
    if (result.success) {
      setReported(true)
      setToast({ show: true, msg: 'Reporte enviado con éxito.', type: 'success' })
      // Cerramos el modal automáticamente después de un momento
      setTimeout(() => {
        setIsOpen(false)
      }, 2000)
    } else {
      setToast({ show: true, msg: result.error || 'No se pudo enviar el reporte.', type: 'error' })
    }
  }

  if (reported) {
    return (
      <div className="px-4 py-2 text-[10px] font-black text-slate-400 bg-slate-100 rounded-lg uppercase tracking-[0.2em] border border-slate-200 cursor-not-allowed">
        Reportado
      </div>
    )
  }

  return (
    <>
      <Toast 
        isVisible={toast.show}
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />

      {/* Botón disparador */}
      <button 
        onClick={() => setIsOpen(true)}
        className="ws-secondary-button cursor-pointer px-4 py-2 text-[10px] font-black text-red-500 hover:text-red-700 transition-colors uppercase tracking-[0.2em]"
      >
        Reportar
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl border border-[var(--ws-outline)] animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black mb-2 text-[var(--ws-midnight)] tracking-tight">
              Reportar Reseña
            </h3>
            <p className="text-[var(--ws-slate)] text-sm mb-6 leading-relaxed">
              Si consideras que este comentario es ofensivo o inapropiado, por favor selecciona un motivo para que nuestro equipo lo revise.
            </p>
            
            <form action={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--ws-midnight)] mb-2 opacity-50">
                  Motivo del reporte
                </label>
                <select 
                  name="type" 
                  required
                  className="w-full p-4 border border-[var(--ws-outline)] rounded-[16px] bg-[var(--ws-info-soft)] text-sm font-bold focus:ring-2 focus:ring-red-500 outline-none transition-all cursor-pointer"
                >
                  <option value="SPAM">Spam</option>
                  <option value="CONTENIDO_OFENSIVO">Contenido Ofensivo</option>
                  <option value="INFORMACION_FALSA">Información Falsa</option>
                  <option value="DATOS_PERSONALES">Datos Personales</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--ws-midnight)] mb-2 opacity-50">
                  Detalles adicionales (opcional)
                </label>
                <textarea 
                  name="description"
                  rows={3}
                  placeholder="Cuéntanos más sobre el problema..."
                  className="w-full p-4 border border-[var(--ws-outline)] rounded-[16px] bg-[var(--ws-info-soft)] text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none resize-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-6 py-4 border border-[var(--ws-outline)] rounded-[16px] text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
                  disabled={isPending}
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-[16px] text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-200 disabled:opacity-50 disabled:shadow-none cursor-pointer"
                >
                  {isPending ? 'Enviando...' : 'Reportar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}