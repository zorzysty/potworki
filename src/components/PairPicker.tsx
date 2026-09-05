import { useEffect, useState } from "react"
import { unlockedFactors } from "../game/facts"
import { useGame } from "../store/store"

const FLASH_MS = 220

// Żetony trybu par: odblokowane liczby 1–10; pierwszy stuknięty czeka
// (podświetlony), drugi zatwierdza parę — ten sam żeton dwa razy daje kwadrat
// (6×6). Zamiennik Keypadu na ekranie rundy; klawiatura fizyczna trafia w te
// same akcje (pressDigit → pickFactor w store).
export function PairPicker() {
	const round = useGame((s) => s.round)
	const unlockedStage = useGame((s) => s.unlockedStage)
	const pickFactor = useGame((s) => s.pickFactor)
	// drugi żeton pary zatwierdza ją natychmiast (picked wraca do null), więc bez
	// tego dziecko nie widziałoby, że stuknięcie „weszło" — krótki błysk lokalnie
	const [flash, setFlash] = useState<number | null>(null)
	useEffect(() => {
		if (flash === null) return
		const t = setTimeout(() => setFlash(null), FLASH_MS)
		return () => clearTimeout(t)
	}, [flash])
	if (!round) return null
	const factors = [...unlockedFactors(unlockedStage)].sort((a, b) => a - b)
	const active = round.phase === "answering"
	return (
		<div className="grid w-full grid-cols-5 gap-2">
			{factors.map((n) => {
				const picked = round.picked === n || flash === n
				return (
					<button
						key={n}
						type="button"
						onClick={() => {
							setFlash(n)
							pickFactor(n)
						}}
						disabled={!active}
						className={`min-h-16 touch-manipulation select-none rounded-2xl border-b-4 text-3xl font-extrabold shadow-md transition-transform active:scale-90 active:border-b-2 ${
							picked
								? "border-fuchsia-700 bg-gradient-to-b from-fuchsia-400 to-fuchsia-600 text-white"
								: "border-violet-100 bg-white text-slate-700"
						}`}
					>
						{n}
					</button>
				)
			})}
		</div>
	)
}
