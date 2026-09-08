import { useEffect } from "react"
import { BigButton } from "../components/BigButton"
import { CheerCompanion } from "../components/Companion"
import { Keypad } from "../components/Keypad"
import { MATCHED_MS } from "../components/MemoryBoard"
import { MODE_LABELS, MODE_NAMES } from "../components/modeLabels"
import { PairPicker } from "../components/PairPicker"
import { QuestionCard } from "../components/QuestionCard"
import { StarMeter } from "../components/StarMeter"
import { useScrollLock } from "../components/useScrollLock"
import { guardianOwned } from "../game/collection"
import { REGIONS } from "../monsters/world"
import { useGame } from "../store/store"
import { RoundSummary } from "./RoundSummary"

function PauseIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			width="24"
			height="24"
			fill="currentColor"
			aria-hidden="true"
		>
			<rect x="5" y="3" width="5" height="18" rx="2" />
			<rect x="14" y="3" width="5" height="18" rx="2" />
		</svg>
	)
}

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
	// pauza jest polem RUNDY (ginie razem z nią); wejście wycisza guard
	// w akcjach store — nakładka zasłania tylko keypad, patrz store/
	const paused = round?.paused ?? false
	const setPaused = useGame((s) => s.setPaused)
	useScrollLock(paused)

	const phase = round?.phase
	const mode = round?.mode
	useEffect(() => {
		if (phase !== "correct" || paused) return
		// memory: ostatnia para ma zostać odkryta tyle samo co każda inna
		const timer = setTimeout(nextQuestion, mode === "memory" ? MATCHED_MS : 900)
		return () => clearTimeout(timer)
	}, [phase, paused, mode, nextQuestion])

	if (!round) return null
	if (round.phase === "summary") return <RoundSummary />

	// runda-wizyta: Strażnik odwiedzanej krainy gospodarzem (kibicuje z rogu),
	// sylwetka gdy nieposiadany (precedens: mapa)
	const visitRegion =
		round.visitStage !== null ? REGIONS[round.visitStage] : undefined
	const guardianId = visitRegion?.guardianId

	const cheer =
		round.mode !== "memory" ? (
			<div className="play-companion">
				<CheerCompanion
					inline
					size={56}
					phase={round.phase}
					lastStars={round.lastStars}
					overrideId={guardianId}
					overrideSilhouette={
						guardianId !== undefined &&
						!guardianOwned(visitRegion, ownedMonsters)
					}
				/>
			</div>
		) : null
	return (
		<main className="play-screen" data-mode={round.mode}>
			<header className="play-header">
				<div className="play-mode-icon" aria-hidden="true">
					{MODE_LABELS[round.mode].split(" ")[0]}
				</div>
				<div className="play-heading">
					<h1>{MODE_NAMES[round.mode]}</h1>
					<span>
						{round.mode === "memory"
							? `Pary ${round.matched.length / 2} / ${round.total}`
							: `Pytanie ${round.index + 1} / ${round.total}`}
					</span>
				</div>
				{round.mode !== "pairs" && cheer}
				<button
					type="button"
					onClick={() => setPaused(true)}
					className="play-pause"
					aria-label="Pauza"
				>
					<PauseIcon />
				</button>
			</header>
			<div className="play-rewards">
				<StarMeter stars={round.stars} />
				{visitRegion && (
					<span className="play-visit">
						{visitRegion.emoji} Odwiedziny: {visitRegion.name}
					</span>
				)}
			</div>
			<div className="play-workspace">
				<section
					className="play-question-area"
					aria-label={MODE_NAMES[round.mode]}
				>
					<QuestionCard />
					{round.mode === "pairs" && cheer}
				</section>
				{round.mode !== "feed" && round.mode !== "memory" && (
					<div className="play-input">
						{round.mode === "pairs" ? <PairPicker /> : <Keypad />}
					</div>
				)}
			</div>

			{debugEnabled &&
				round.phase === "answering" &&
				round.index === 0 &&
				round.found.length === 0 &&
				round.seen.length === 0 &&
				!round.missed && (
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
				<div className="play-pause-overlay">
					<div
						className="play-pause-card"
						role="dialog"
						aria-modal="true"
						aria-label="Przerwa"
					>
						<h2>Przerwa</h2>
						<BigButton onClick={() => setPaused(false)} className="play-resume">
							Gram dalej!
						</BigButton>
						<button
							type="button"
							onClick={exitRoundEarly}
							className="play-exit"
						>
							Wróć do menu głównego
						</button>
					</div>
				</div>
			)}
		</main>
	)
}
