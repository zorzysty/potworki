import { useEffect, useState } from "react"
import { BigButton } from "../components/BigButton"
import { Keypad } from "../components/Keypad"
import { QuestionCard } from "../components/QuestionCard"
import { StarMeter } from "../components/StarMeter"
import { useGame } from "../store/store"
import { RoundSummary } from "./RoundSummary"

export function RoundScreen() {
	const round = useGame(s => s.round)
	const nextQuestion = useGame(s => s.nextQuestion)
	const exitRoundEarly = useGame(s => s.exitRoundEarly)
	const [paused, setPaused] = useState(false)

	const phase = round?.phase
	const index = round?.index
	useEffect(() => {
		if (phase !== "correct") return
		const timer = setTimeout(nextQuestion, 900)
		return () => clearTimeout(timer)
	}, [phase, index, nextQuestion])

	if (!round) return null
	if (round.phase === "summary") return <RoundSummary />

	return (
		<div className="flex min-h-dvh flex-col gap-3 p-4 land:mx-auto land:max-w-4xl land:flex-row land:items-center land:gap-8">
			<div className="flex flex-1 flex-col gap-3 land:justify-center">
				<div className="flex items-center justify-between">
					<div className="rounded-full bg-white/70 px-4 py-1 text-lg font-extrabold text-grape-dark">
						Pytanie {round.index + 1} / {round.total}
					</div>
					<button
						type="button"
						onPointerDown={() => setPaused(true)}
						className="touch-manipulation rounded-full bg-white/70 px-4 py-1 text-lg font-extrabold text-grape-dark active:scale-90"
						aria-label="Pauza"
					>
						⏸
					</button>
				</div>
				<StarMeter stars={round.stars} />
				<div className="flex flex-1 items-center land:flex-none">
					<QuestionCard />
				</div>
			</div>
			<div className="land:w-80">
				<Keypad />
			</div>

			{paused && (
				<div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-slate-900/70 p-6 backdrop-blur-sm">
					<div className="text-4xl font-extrabold text-white">Przerwa ⏸</div>
					<BigButton onClick={() => setPaused(false)} className="w-full max-w-xs py-6 text-3xl">
						Gram dalej! 🚀
					</BigButton>
					<button
						type="button"
						onPointerDown={exitRoundEarly}
						className="touch-manipulation rounded-2xl px-5 py-2 text-lg font-bold text-white/70 active:scale-95"
					>
						Koniec na dziś
					</button>
				</div>
			)}
		</div>
	)
}
