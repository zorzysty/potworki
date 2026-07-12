import { BigButton } from "../components/BigButton"
import { EquippedOverlay } from "../components/CosmeticArt"
import { EggReward } from "../components/EggReward"
import { GateReveal } from "../components/gate"
import { MonsterStage } from "../components/MonsterStage"
import { RARITY_META } from "../components/rarity"
import { StarMeter } from "../components/StarMeter"
import { useGateReveal } from "../components/useGateReveal"
import { VISIT_BONUS } from "../game/adaptive"
import { fragmentsForEgg } from "../game/facts"
import { currentGoal } from "../game/village"
import { rarityOf } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
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
	const dreamMonsterId = useGame((s) => s.dreamMonsterId)
	const setDreamMonster = useGame((s) => s.setDreamMonster)
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
	// żołd + postęp do celu budowy: podsumowanie to moment decyzji „jeszcze jedna
	// runda?" — dziecko widzi, że TA runda przybliżyła cel (iskierki są już po żołdzie)
	const goal = currentGoal(village)
	// runda-wizyta: Strażnik dziękuje osobnym bannerem (+VISIT_BONUS ✨ już
	// doliczone przy finalizacji; chip żołdu zostaje czystym żołdem)
	const visitRegion =
		round.visitStage !== null ? REGIONS[round.visitStage] : undefined
	const guardianOwned =
		visitRegion !== undefined && visitRegion.guardianId in ownedMonsters
	// powrót z wyprawy: nagroda już doliczona przy finalizacji; trop pokazuje
	// TYLKO sylwetkę + rzadkość (nigdy imię — konwencja „???" do wyklucia)
	const back = round.expeditionReturn
	const tropRarity =
		back?.tropMonsterId != null ? rarityOf(back.tropMonsterId) : null

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
							<span className="truncate text-sm font-extrabold text-grape-dark">
								{goal.name}
								{village.goalId !== null && village.goalId === goal.id && " ⭐"}
							</span>
							<span className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-200">
								<span
									className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-[width]"
									style={{
										width: `${Math.min(100, (iskierki / goal.cost) * 100)}%`,
									}}
								/>
							</span>
							<span className="whitespace-nowrap text-sm font-extrabold text-amber-500">
								{Math.min(iskierki, goal.cost)}/{goal.cost}
							</span>
						</>
					) : (
						<span className="text-sm font-extrabold text-grape-dark">
							iskierki za rundę!
						</span>
					)}
				</button>
			)}

			{/* karta powrotu z wyprawy — POD chipem żołdu, rodzeństwo EggReward
			    (kontrakt animacji jajka nietknięty); kompaktowa karta, nie pełny
			    ekran (hierarchia payoffów: pełny ekran tylko dla rzadszych zdarzeń) */}
			{back && (
				<div className="anim-pop flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-white/90 p-4 shadow-lg">
					<div className="flex items-center gap-3">
						{/* powracający nosi swój strój — przez MonsterStage */}
						<MonsterStage
							id={back.monsterId}
							size={72}
							overlay={<EquippedOverlay monsterId={back.monsterId} />}
						/>
						{/* PROPOZYCJA do dopracowania — powitanie z wyprawy */}
						<div className="flex-1 text-lg font-extrabold leading-tight text-grape-dark">
							Wrócił(a) z wyprawy!{" "}
							<span className="whitespace-nowrap text-amber-500">
								+{back.rewardIskierki} ✨
							</span>
						</div>
					</div>
					{back.tropMonsterId !== null && tropRarity !== null && (
						<div className="flex items-center gap-3 rounded-2xl bg-violet-50 px-3 py-2">
							{/* trop: sylwetka + rzadkość, NIGDY imię (tajemnica do wyklucia) */}
							<MonsterSvg
								id={back.tropMonsterId}
								size={52}
								animate={false}
								className="monster-silhouette"
							/>
							<div className="flex min-w-0 flex-1 flex-col items-start gap-1">
								{/* PROPOZYCJA do dopracowania — tekst tropu */}
								<span className="text-sm font-extrabold leading-tight text-slate-600">
									Ktoś tajemniczy zostawił ślad!
								</span>
								<span
									className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${RARITY_META[tropRarity].badge}`}
								>
									{RARITY_META[tropRarity].label}
								</span>
							</div>
							{/* oferta TYLKO przy pustym slocie wymarzonego — nigdy podmiana
							    wybranego przez dziecko (decyzja maintainera) */}
							{dreamMonsterId === null && (
								<button
									type="button"
									onClick={() => setDreamMonster(back.tropMonsterId)}
									className="touch-manipulation min-h-16 shrink-0 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-400 px-3 py-2 text-sm font-extrabold text-white shadow active:scale-95"
								>
									Ustaw jako
									<br />
									wymarzonego! ✨
								</button>
							)}
						</div>
					)}
				</div>
			)}

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

			{visitRegion && (
				<div className="anim-pop flex items-center gap-3 rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-3 text-white shadow-lg">
					<MonsterSvg
						id={visitRegion.guardianId}
						size={48}
						className={guardianOwned ? undefined : "monster-silhouette"}
					/>
					{/* PROPOZYCJA do dopracowania — podziękowanie Strażnika */}
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

			{/* splash otwarcia bramy gra automatycznie nad podsumowaniem */}
			{reveal && <GateReveal stage={reveal.stage} onDone={dismiss} />}
		</div>
	)
}
