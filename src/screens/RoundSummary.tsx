import { BigButton } from "../components/BigButton"
import { EggReward } from "../components/EggReward"
import { GateReveal } from "../components/gate"
import { StarMeter } from "../components/StarMeter"
import { useGateReveal } from "../components/useGateReveal"
import { fragmentsForEgg } from "../game/facts"
import { useGame } from "../store/store"

export function RoundSummary() {
	const round = useGame((s) => s.round)
	const pendingEggs = useGame((s) => s.pendingEggs)
	const eggFragments = useGame((s) => s.eggFragments)
	const eggsEarned = useGame((s) => s.eggsEarned)
	const goTo = useGame((s) => s.goTo)
	const startRound = useGame((s) => s.startRound)

	// brama odblokowana w tej rundzie → splash gra od razu, bez klikania.
	// Decyzja w inicjalizatorze useState (PRZED markGatesCelebrated), więc stabilna
	// mimo podwójnego montażu StrictMode; uczczenie zdejmuje plakietkę/animację z mapy.
	const { reveal, dismiss } = useGateReveal(() => {
		const s = useGame.getState()
		return s.round?.unlockedThisRound ? { stage: s.unlockedStage } : null
	})

	if (round?.phase !== "summary") return null

	const eggsThisRound = round.eggsCreated.length
	const lastCreatedIndex = round.eggsCreated[eggsThisRound - 1]
	const completedEgg =
		lastCreatedIndex !== undefined
			? (pendingEggs[lastCreatedIndex] ?? null)
			: null

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6">
			<div className="anim-pop text-4xl font-extrabold text-grape-dark">
				Koniec rundy! 🎉
			</div>

			<div className="w-full max-w-sm rounded-3xl bg-white/90 p-5 shadow-xl">
				<div className="mb-2 text-center text-2xl font-extrabold text-amber-500">
					{round.stars} / 30 ⭐
				</div>
				<StarMeter stars={round.stars} />
			</div>

			{/* gdy brama otwiera się w tej rundzie, GateReveal (z-50) zasłania całość —
			    odpalamy animację jajka dopiero po jej zamknięciu, by dziecko ją zobaczyło */}
			{!reveal && (
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

			{/* splash otwarcia bramy gra automatycznie nad podsumowaniem */}
			{reveal && <GateReveal stage={reveal.stage} onDone={dismiss} />}
		</div>
	)
}
