"use client"

import { useRouter } from "next/navigation"

type Props = {
	enabled: boolean
	onCompleted?: () => void
}

export default function CompleteTripButton({ enabled, onCompleted }: Props) {
	const router = useRouter()

	async function handleClick() {
		if (!enabled) {
			return
		}

		const poolId = localStorage.getItem("ws:lastPoolId")
		const sim = localStorage.getItem("ws:simulationStarted")

		if (!poolId || !sim) {
			return
		}

		const response = await fetch("/api/reviews/activate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ pool_id: poolId }),
		})

		if (response.ok) {
			localStorage.removeItem("ws:lastPoolId")
			localStorage.removeItem("ws:simulationStarted")
			onCompleted?.()
			router.refresh()
		}
	}

	return (
		<button
			onClick={handleClick}
			disabled={!enabled}
			aria-disabled={!enabled}
			tabIndex={enabled ? 0 : -1}
			title={enabled ? "Completar viaje y habilitar feedback" : "Inicia simulación de viaje para habilitar"}
				className={`ws-secondary-button w-full transition-all disabled:cursor-not-allowed disabled:opacity-60 ${!enabled ? "opacity-60" : ""}`}
			style={{
				cursor: !enabled ? "not-allowed" : "pointer",
				pointerEvents: "auto",
				backgroundColor: !enabled ? "#E5E7EB" : undefined,
				color: !enabled ? "#6B7280" : undefined,
				filter: !enabled ? "grayscale(20%)" : undefined,
			}}
		>
			{enabled ? "Completar viaje y habilitar feedback" : "Completar viaje (bloqueado)"}
		</button>
	)
}
