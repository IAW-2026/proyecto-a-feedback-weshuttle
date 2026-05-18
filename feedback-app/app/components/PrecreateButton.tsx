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
      className="w-full bg-blue-600 text-white p-3 font-semibold hover:bg-blue-700"
    >
      Simular inicio de viaje
    </button>
  )
}