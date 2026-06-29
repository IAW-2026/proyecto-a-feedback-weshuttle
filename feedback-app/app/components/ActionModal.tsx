'use client'

interface ActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'info' | 'success'
  showCancel?: boolean
}

export default function ActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cerrar",
  variant = 'info',
  showCancel = true
}: ActionModalProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: "bg-red-600 hover:bg-red-700 shadow-red-200",
    info: "bg-[var(--ws-midnight)] hover:opacity-90 shadow-gray-200",
    success: "bg-green-600 hover:bg-green-700 shadow-green-200"
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="
          bg-white
          rounded-[24px]
          p-8
          w-full
          max-w-md
          shadow-2xl
          border
          border-[var(--ws-outline)]
          animate-[slideIn_2.5s_cubic-bezier(0.22,1,0.36,1)]
        "
      >
        <div className="mb-6">
          <h3 className="text-2xl font-black mb-2 text-[var(--ws-midnight)] tracking-tight">
            {title}
          </h3>
          <p className="text-[var(--ws-slate)] text-sm leading-relaxed font-medium">
            {description}
          </p>
        </div>

        <div className="flex gap-3">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-[var(--ws-outline)] rounded-[16px] text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
            >
              {cancelText}
            </button>
          )}

          {onConfirm && (
            <button
              type="button"
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`flex-1 px-6 py-4 text-white rounded-[16px] text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg cursor-pointer ${variantStyles[variant]}`}
            >
              {confirmText}
            </button>
          )}

          {!onConfirm && (
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-6 py-4 text-white rounded-[16px] text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg cursor-pointer ${variantStyles[variant]}`}
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}