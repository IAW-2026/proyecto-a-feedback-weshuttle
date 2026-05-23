"use client"

import { useRouter } from "next/navigation"

type Props = {
  userId: string
}

export default function PrecreateButton({ userId }: Props) {
  const router = useRouter()
  
  async function handleClick() {
    const response = await fetch("/api/reviews/precreate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        pool_id: crypto.randomUUID(),
        driver_user_id: userId,
        started_at: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      router.refresh()
    }
  }

  return (
    <button
      onClick={handleClick}
      className="
      w-full
      h-14
      rounded-full
      bg-blue-600
      text-white
      font-medium
      text-[15px]
      hover:bg-blue-700
      transition-all
      duration-200
      cursor-pointer
      "
    >
      Empezar simulación de viaje
    </button>
  )
}