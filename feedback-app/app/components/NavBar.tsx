"use client"

import { useUser, UserButton } from "@clerk/nextjs"

interface NavbarProps {
  role?: string;
}

export default function Navbar({ role }: NavbarProps) {
  const { user, isSignedIn } = useUser()

  return (
    <header className="sticky top-0 z-50 bg-[#f6f6f6]/80 backdrop-blur-xl border-b border-black/5">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-black tracking-tight">
            WeShuttle
          </h1>

        </div>

        {isSignedIn && (

          <div className="flex items-center gap-4">

            <div className="text-right">

              <p className="text-sm font-medium">
                {user.firstName}
              </p>

              <p className="text-xs text-neutral-500">
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