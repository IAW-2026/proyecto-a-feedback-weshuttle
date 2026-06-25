"use client"

import Link from "next/link"
import { useUser, UserButton } from "@clerk/nextjs"

interface NavbarProps {
  role?: string;
  displayName?: string | null;
}

export default function Navbar({ role, displayName }: NavbarProps) {

  const { user, isSignedIn } = useUser()

  const cleanDisplayName = (displayName === "Pasajero (Usuario de Clerk)" || displayName === "Conductor de Prueba (Clerk)" || displayName?.includes("Usuario de Clerk"))
    ? null
    : displayName

  const homeHref =
    role === "driver"
      ? "/dashboard/driver"
      : "/dashboard"

  return (

    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[var(--ws-outline)] shadow-[0_2px_12px_rgba(10,25,47,0.06)]">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

        <Link href={homeHref} className="flex items-center gap-3 hover:opacity-85 transition-opacity">
          <div className="flex items-center justify-center w-11 h-11 bg-white rounded-xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-1.5 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 22 34 L 35 75 L 50 45 L 65 75 L 78 34"
                fill="none"
                stroke="#0c59cf"
                strokeWidth="13"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="22" cy="30" r="8.5" fill="#e63946" />
              <circle cx="50" cy="40" r="8.5" fill="#f59e0b" />
              <circle cx="78" cy="30" r="8.5" fill="#10b981" />
            </svg>
          </div>
          <span className="ws-brand">
            WeShuttle
          </span>
        </Link>
 
        {isSignedIn && (

          <div className="flex items-center gap-4">

            <div className="text-right">

              <p className="text-sm font-bold text-[var(--ws-midnight)]">
                {cleanDisplayName?.trim() || user?.firstName || user?.username || "Usuario"}
              </p>

              <p className="text-xs text-[var(--ws-slate)]">
                {role || user?.publicMetadata?.role as string || "User"}
              </p>

            </div>

            <UserButton />

          </div>

        )}

      </div>

    </header>

  )
}