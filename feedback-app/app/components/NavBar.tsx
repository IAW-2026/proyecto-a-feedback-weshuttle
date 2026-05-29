"use client"

import Link from "next/link"
import { useUser, UserButton } from "@clerk/nextjs"

interface NavbarProps {
  role?: string;
}

export default function Navbar({ role }: NavbarProps) {

  const { user, isSignedIn } = useUser()

  const homeHref =
    role === "DRIVER"
      ? "/dashboard/driver"
      : "/dashboard"

  return (

    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[var(--ws-outline)] shadow-[0_2px_12px_rgba(10,25,47,0.06)]">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

        <Link href={homeHref}>

          <h1 className="ws-brand hover:opacity-80 transition-opacity cursor-pointer">
            WeShuttle
          </h1>

        </Link>

        {isSignedIn && (

          <div className="flex items-center gap-4">

            <div className="text-right">

              <p className="text-sm font-bold text-[var(--ws-midnight)]">
                {user.firstName}
              </p>

              <p className="text-xs text-[var(--ws-slate)]">
                {role || user.publicMetadata.role as string || "User"}
              </p>

            </div>

            <UserButton />

          </div>

        )}

      </div>

    </header>

  )
}