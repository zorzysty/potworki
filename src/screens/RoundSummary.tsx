import { useState } from "react"
import { BigButton } from "../components/BigButton"
import { EggReward } from "../components/EggReward"
import { ExpeditionReturn } from "../components/ExpeditionReturn"
import { GoalProgressBar } from "../components/GoalProgressBar"
import { GateReveal } from "../components/gate"
import { MonsterStage } from "../components/MonsterStage"
import { StarMeter } from "../components/StarMeter"
import { useGateReveal } from "../components/useGateReveal"
import { VISIT_BONUS } from "../game/adaptive"
import * as collection from "../game/collection"
import { fragmentsForEgg } from "../game/facts"
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

	return (
		<div className="flex min-h-[var(--app-vh)] flex-col items-center justify-center gap-5 p-6">
			<div className="anim-pop text-4xl font-extrabold text-grape-dark">
				Koniec rundy! 🎉
			</div>

			<div className="w-full max-w-sm rounded-3xl bg-white/90 p-5 shadow-xl">
				<div className="mb-2 text-center text-2xl font-extrabold text-amber-500">
					{round.stars} / 30 ⭐
				</div>
				<StarMeter stars={round.stars} />
			</div>

			{round.wageEarned > 0 && (
				<button
					type="button"
					onClick={() => goTo("village")}
					className="anim-fade-up flex w-full max-w-sm touch-manipulation items-center gap-2 rounded-3xl bg-white/90 px-4 py-2.5 shadow-md active:scale-[0.98]"
				>
					<span className="whitespace-nowrap text-lg font-extrabold text-amber-500">
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

			{round.unlockedThisRound && (
				<div className="anim-pop rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-center text-2xl font-extrabold text-white shadow-lg">
					Nowa brama otwarta! 🎉
				</div>
			)}

			{visitRegion && (
				<div className="anim-pop flex items-center gap-3 rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-3 text-white shadow-lg">
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

			<div className="flex w-full max-w-sm flex-col gap-3 pt-2">
				{pendingEggs.length > 0 && (
					<BigButton
						onClick={() => goTo("hatch")}
						className="w-full py-5 text-3xl"
					>
						Wykluj jajko! 🥚
					</BigButton>
				)}
				<BigButton
					onClick={startRound}
					variant={pendingEggs.length > 0 ? "secondary" : "primary"}
					className="w-full"
				>
					Zagraj kolejną rundę 🚀
				</BigButton>
				<BigButton
					onClick={() => goTo("home")}
					variant="secondary"
					className="w-full"
				>
					Do domku 🏠
				</BigButton>
			</div>

			{/* splash otwarcia bramy gra automatycznie nad podsumowaniem; powrót z
			    wyprawy czeka na jego zamknięcie (dwa payoffy po kolei, nie naraz) */}
			{reveal && <GateReveal stage={reveal.stage} onDone={dismiss} />}
			{!reveal && returnSplash && (
				<ExpeditionReturn
					back={returnSplash}
					onDone={() => setReturnDismissed(true)}
				/>
			)}
		</div>
	)
}
