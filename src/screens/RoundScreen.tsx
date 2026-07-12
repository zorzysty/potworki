import { useEffect, useState } from "react"
import { BigButton } from "../components/BigButton"
import { CheerCompanion } from "../components/Companion"
import { Keypad } from "../components/Keypad"
import { QuestionCard } from "../components/QuestionCard"
import { StarMeter } from "../components/StarMeter"
import { REGIONS } from "../monsters/world"
import { useGame } from "../store/store"
import { RoundSummary } from "./RoundSummary"

export function RoundScreen({
	debugEnabled = false,
}: {
	debugEnabled?: boolean
}) {
	const round = useGame((s) => s.round)
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const nextQuestion = useGame((s) => s.nextQuestion)
	const exitRoundEarly = useGame((s) => s.exitRoundEarly)
	const debugFinishRound = useGame((s) => s.debugFinishRound)
	const [paused, setPaused] = useState(false)

	const phase = round?.phase
	useEffect(() => {
		if (phase !== "correct") return
		const timer = setTimeout(nextQuestion, 900)
		return () => clearTimeout(timer)
	}, [phase, nextQuestion])

	if (!round) return null
	if (round.phase === "summary") return <RoundSummary />

	// runda-wizyta: Strażnik odwiedzanej krainy gospodarzem (kibicuje z rogu),
	// sylwetka gdy nieposiadany (precedens: mapa)
	const visitRegion =
		round.visitStage !== null ? REGIONS[round.visitStage] : undefined
	const guardianId = visitRegion?.guardianId

	return (
		<div className="flex min-h-[var(--app-vh)] flex-col gap-3 p-4 land:mx-auto land:max-w-4xl land:flex-row land:items-center land:gap-8">
			<div className="flex flex-1 flex-col gap-3 land:justify-center">
				<div className="flex items-center justify-between gap-2">
					<div className="whitespace-nowrap rounded-full bg-white/70 px-4 py-1 text-lg font-extrabold text-grape-dark">
						Pytanie {round.index + 1} / {round.total}
					</div>
					{visitRegion && (
						// PROPOZYCJA do dopracowania — pigułka regionu rundy-wizyty
						<div className="min-w-0 flex-1 truncate rounded-full bg-white/70 px-3 py-1 text-center text-sm font-extrabold text-grape-dark">
							{visitRegion.emoji} Odwiedziny: {visitRegion.name}
						</div>
					)}
					<button
						type="button"
						onClick={() => setPaused(true)}
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

			{/* przyjaciel kibicuje z rogu (gdy wybrany) — nigdy nie zasłania karty;
			    w rundzie-wizycie zamiast niego kibicuje Strażnik regionu */}
			<CheerCompanion
				phase={round.phase}
				lastStars={round.lastStars}
				overrideId={guardianId}
				overrideSilhouette={
					guardianId !== undefined && !(guardianId in ownedMonsters)
				}
			/>

			{debugEnabled && round.phase === "answering" && round.index === 0 && (
				<div className="fixed right-2 bottom-2 z-40 flex flex-col items-end gap-1">
					<span className="text-[10px] font-bold text-grape-dark/60">
						debug: zakończ rundę
					</span>
					<div className="flex gap-1">
						{[20, 26, 28, 30].map((stars) => (
							<button
								key={stars}
								type="button"
								onClick={() => debugFinishRound(stars)}
								className="touch-manipulation rounded-lg bg-white/80 px-2 py-1 text-xs font-bold text-slate-700 shadow active:scale-95"
							>
								+{stars} ⭐
							</button>
						))}
					</div>
				</div>
			)}

			{paused && (
				<div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-slate-900/70 p-6 backdrop-blur-sm">
					<div className="text-4xl font-extrabold text-white">Przerwa ⏸</div>
					<BigButton
						onClick={() => setPaused(false)}
						className="w-full max-w-xs py-6 text-3xl"
					>
						Gram dalej! 🚀
					</BigButton>
					<button
						type="button"
						onClick={exitRoundEarly}
						className="touch-manipulation rounded-2xl px-5 py-2 text-lg font-bold text-white/70 active:scale-95"
					>
						Koniec na dziś
					</button>
				</div>
			)}
		</div>
	)
}
