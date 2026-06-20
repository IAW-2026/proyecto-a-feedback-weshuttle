"use client"

interface ProfileNameEditorProps {
  initialName: string | null
}

export default function ProfileNameEditor({ initialName }: ProfileNameEditorProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ws-outline)] bg-white px-5 py-2 shadow-[0_12px_30px_rgba(10,25,47,0.06)]">
      <span className="max-w-[14rem] truncate text-sm font-bold text-[var(--ws-midnight)]">
        {initialName?.trim() || "Sin nombre"}
      </span>
    </div>
  )
}