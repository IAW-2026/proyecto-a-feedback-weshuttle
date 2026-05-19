"use client"

type Props = {
  userId: string
}

export default function PrecreateButton({ userId }: Props) {
  console.log("PROP USER ID:", userId)
  
  async function handleClick() {
    console.log("USER ID:", userId)

    const response = await fetch("/api/reviews/precreate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        pool_id: crypto.randomUUID(),
        driver_user_id: userId,
      }),
    })

    if (response.ok) {
      window.location.reload()
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