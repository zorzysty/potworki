import { useEffect, useState } from "react"
import { useGame } from "../store/store"

// Splash otwarcia bramy: decyzja w inicjalizatorze useState (PRZED
// markGatesCelebrated), więc stabilna mimo podwójnego montażu StrictMode.
// `detect` czyta świeży useGame.getState() i zwraca etap do odsłonięcia albo null.
export function useGateReveal(detect: () => { stage: number } | null) {
	const [reveal, setReveal] = useState<{ stage: number } | null>(detect)
	useEffect(() => {
		if (reveal) useGame.getState().markGatesCelebrated()
	}, [reveal])
	return { reveal, dismiss: () => setReveal(null) }
}
