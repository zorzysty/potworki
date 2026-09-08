import { useState } from "react"
import { BigButton } from "../components/BigButton"
import { EggReward } from "../components/EggReward"
import { ExpeditionReturn } from "../components/ExpeditionReturn"
import { GoalProgressBar } from "../components/GoalProgressBar"
import { GateReveal } from "../components/gate"
import { MonsterStage } from "../components/MonsterStage"
import { MODE_NAMES } from "../components/modeLabels"
import { useGateReveal } from "../components/useGateReveal"
import { VISIT_BONUS } from "../game/adaptive"
import * as collection from "../game/collection"
import {
	fragmentsForEgg,
	MAX_STARS_PER_ROUND,
	MODE_UNLOCK_STAGE,
} from "../game/facts"
import { currentGoal } from "../game/village"
import { REGIONS } from "../monsters/world"
import { useGame } from "../store/store"

export function RoundSummary() {
	const round = useGame((s) => s.round)
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const pendingEggs = useGame((s) => s.pendingEggs)
	const eggFragments = useGame((s) => s.eggFragments)
	const eggsEarned = useGame((s) => s.eggsEarned)
	const village = useGame((s) => s.village)
	const iskierki = useGame((s) => s.iskierki)
	const unlockedStage = useGame((s) => s.unlockedStage)
	const goTo = useGame((s) => s.goTo)
	const startRound = useGame((s) => s.startRound)

	// brama odblokowana w tej rundzie → splash gra od razu, bez klikania.
	// Decyzja w inicjalizatorze useState (PRZED markGatesCelebrated), więc stabilna
	// mimo podwójnego montażu StrictMode; uczczenie zdejmuje plakietkę/animację z mapy.
	const { reveal, dismiss } = useGateReveal(() => {
		const s = useGame.getState()
		return s.round?.unlockedThisRound ? { stage: s.unlockedStage } : null
	})

	// splash powrotu z wyprawy nad podsumowaniem (gra PO splashu bramy)
	const [returnDismissed, setReturnDismissed] = useState(false)

	if (round?.phase !== "summary") return null
	const returnSplash = returnDismissed ? null : round.expeditionReturn

	const eggsThisRound = round.eggsCreated.length
	const lastCreatedIndex = round.eggsCreated[eggsThisRound - 1]
	const completedEgg =
		lastCreatedIndex !== undefined
			? (pendingEggs[lastCreatedIndex] ?? null)
			: null
	// żołd + postęp do celu budowy: podsumowanie to moment decyzji „jeszcze jedna
	// runda?" — dziecko widzi, że TA runda przybliżyła cel (iskierki są już po żołdzie)
	const goal = currentGoal(village)
	// runda-wizyta: Strażnik dziękuje osobnym bannerem (+VISIT_BONUS ✨ już
	// doliczone przy finalizacji; chip żołdu zostaje czystym żołdem)
	const visitRegion =
		round.visitStage !== null ? REGIONS[round.visitStage] : undefined
	const guardianOwned = collection.guardianOwned(visitRegion, ownedMonsters)
	// brama otwarta w tej rundzie odblokowała nową zabawę na Home
	const unlockedMode = round.unlockedThisRound
		? (
				Object.keys(MODE_UNLOCK_STAGE) as (keyof typeof MODE_UNLOCK_STAGE)[]
			).find((m) => MODE_UNLOCK_STAGE[m] === unlockedStage)
		: undefined

	return (
		<main className="round-summary">
			<section className="summary-card">
				<header className="summary-heading">
					<span className="summary-mode">{MODE_NAMES[round.mode]}</span>
					<h1 className="anim-pop">Koniec rundy! 🎉</h1>
				</header>
				<div className="summary-content">
					<div className="summary-results">
						<div className="summary-score">
							<div className="summary-score-value">
								<strong>{round.stars}</strong>
								<span> / {MAX_STARS_PER_ROUND} ⭐</span>
							</div>
							<div
								className="summary-score-track"
								role="progressbar"
								aria-label="Gwiazdki"
								aria-valuenow={round.stars}
								aria-valuemin={0}
								aria-valuemax={MAX_STARS_PER_ROUND}
							>
								<div
									style={{
										width: `${Math.min(100, (round.stars / MAX_STARS_PER_ROUND) * 100)}%`,
									}}
								/>
							</div>
						</div>

						{round.wageEarned > 0 && (
							<button
								type="button"
								onClick={() => goTo("village")}
								className="summary-wage anim-fade-up touch-manipulation active:scale-[0.98]"
							>
								<span className="summary-wage-value whitespace-nowrap text-lg font-extrabold">
									+{round.wageEarned} ✨
								</span>
								{goal ? (
									<>
										<span className="text-slate-300">→</span>
										<GoalProgressBar
											goal={goal}
											iskierki={iskierki}
											goalId={village.goalId}
										/>
									</>
								) : (
									<span className="text-sm font-extrabold text-grape-dark">
										iskierki za rundę!
									</span>
								)}
							</button>
						)}

						{round.unlockedThisRound && (
							<div className="summary-notice anim-pop">
								Nowa brama otwarta! 🎉
								{unlockedMode && (
									<div className="mt-1 text-lg">
										Nowa zabawa na start: {MODE_NAMES[unlockedMode]}!
									</div>
								)}
							</div>
						)}

						{visitRegion && (
							<div className="summary-notice summary-visit anim-pop">
								<MonsterStage
									id={visitRegion.guardianId}
									size={48}
									className={guardianOwned ? undefined : "monster-silhouette"}
								/>
								{/* podziękowanie Strażnika */}
								<div className="text-xl font-extrabold leading-tight">
									Strażnik dziękuje za odwiedziny! 💛 +{VISIT_BONUS} ✨
								</div>
							</div>
						)}
					</div>
					<div className="summary-egg">
						{/* gdy brama otwiera się w tej rundzie (albo ktoś wraca z wyprawy),
			    splash (z-50) zasłania całość — odpalamy animację jajka dopiero po
			    jego zamknięciu, by dziecko ją zobaczyło */}
						{!reveal && !returnSplash && (
							<EggReward
								roundStars={round.stars}
								completedEgg={completedEgg}
								threshold={fragmentsForEgg(eggsEarned)}
								fragmentsNow={eggFragments}
								fragmentsAdded={round.total}
								mode={round.mode}
							/>
						)}
					</div>
				</div>
				<div className="summary-actions">
					{pendingEggs.length > 0 && (
						<BigButton
							onClick={() => goTo("hatch")}
							className="summary-primary"
						>
							Wykluj jajko! 🥚
						</BigButton>
					)}
					<BigButton
						onClick={startRound}
						variant={pendingEggs.length > 0 ? "secondary" : "primary"}
						className={
							pendingEggs.length > 0 ? "summary-secondary" : "summary-primary"
						}
					>
						Zagraj kolejną rundę 🚀
					</BigButton>
					<BigButton
						onClick={() => goTo("home")}
						variant="secondary"
						className="summary-home"
					>
						Do domku 🏠
					</BigButton>
				</div>
			</section>
			{/* splash otwarcia bramy gra automatycznie nad podsumowaniem; powrót z
			    wyprawy czeka na jego zamknięcie (dwa payoffy po kolei, nie naraz) */}
			{reveal && <GateReveal stage={reveal.stage} onDone={dismiss} />}
			{!reveal && returnSplash && (
				<ExpeditionReturn
					back={returnSplash}
					onDone={() => setReturnDismissed(true)}
				/>
			)}
		</main>
	)
}
