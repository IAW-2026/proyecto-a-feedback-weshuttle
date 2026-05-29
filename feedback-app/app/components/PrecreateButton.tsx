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
      className="ws-primary-button w-full cursor-pointer"
    >
      Empezar simulación de viaje
    </button>
  )
}