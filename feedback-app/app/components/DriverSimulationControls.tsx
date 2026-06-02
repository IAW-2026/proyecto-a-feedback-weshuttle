"use client"

import { useState } from "react"
import PrecreateButton from "./PrecreateButton"
import CompleteTripButton from "./CompleteTripButton"

type Props = {
	userId: string
}

export default function DriverSimulationControls({ userId }: Props) {
	const [simulationStarted, setSimulationStarted] = useState(false)

	return (
		<>
			<PrecreateButton
				userId={userId}
				onStarted={() => setSimulationStarted(true)}
			/>

			<div className="mt-4">
				<CompleteTripButton
					enabled={simulationStarted}
					onCompleted={() => setSimulationStarted(false)}
				/>
			</div>
		</>
	)
}
