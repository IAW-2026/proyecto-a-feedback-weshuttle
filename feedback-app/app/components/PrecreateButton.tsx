"use client"

import { useRouter } from "next/navigation"

type Props = {
  userId: string
  onStarted?: (poolId: string) => void
}

export default function PrecreateButton({ userId, onStarted }: Props) {
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
      const data = await response.json()
      if (data?.pool_id) {
        	localStorage.setItem("ws:lastPoolId", data.pool_id)
        	// mark that simulation was explicitly started by the user
        	localStorage.setItem("ws:simulationStarted", "1")
        onStarted?.(data.pool_id)
      }

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