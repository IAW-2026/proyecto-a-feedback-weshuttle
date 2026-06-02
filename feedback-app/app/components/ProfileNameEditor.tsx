"use client"

import { FormEvent, useEffect, useRef, useState } from "react"

interface ProfileNameEditorProps {
  initialName: string | null
}

export default function ProfileNameEditor({ initialName }: ProfileNameEditorProps) {
  const [name, setName] = useState(initialName ?? "")
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Escribí un nombre")
      setMessage(null)
      return
    }

    setIsSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/me/name", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.message || "No se pudo guardar el nombre")
      }

      setName(payload.user?.name ?? trimmedName)
      setMessage("Nombre guardado")
      setEditing(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el nombre")
    } finally {
      setIsSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ws-outline)] bg-white px-4 py-2 shadow-[0_12px_30px_rgba(10,25,47,0.06)]">
        <span className="max-w-[14rem] truncate text-sm font-bold text-[var(--ws-midnight)]">
          {name.trim() || "Sin nombre"}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar nombre"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ws-slate)] transition-colors hover:bg-[var(--ws-info-soft)] hover:text-[var(--ws-midnight)] cursor-pointer"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l8.06-8.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </button>
        {message && <span className="sr-only">{message}</span>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-full border border-[var(--ws-outline)] bg-white px-4 py-2 shadow-[0_12px_30px_rgba(10,25,47,0.06)]">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="ws-input h-9 flex-1 min-w-0 rounded-full border-0 bg-transparent px-0 shadow-none focus:ring-0"
          placeholder="Tu nombre"
          maxLength={80}
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-bold text-[var(--ws-slate)] transition-colors hover:bg-[var(--ws-info-soft)] hover:text-[var(--ws-midnight)] cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-8 items-center justify-center rounded-full bg-[var(--ws-midnight)] px-3 text-xs font-black text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {isSaving ? "..." : "Guardar"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </form>
  )
}