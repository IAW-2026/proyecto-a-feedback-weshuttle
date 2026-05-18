"use client"

export default function PrecreateButton() {

  async function handleClick() {

    const response = await fetch("/api/reviews/precreate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        pool_id: "pool_1",
        driver_user_id: "driver_1",
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
      Start simulated ride
    </button>
  )
}