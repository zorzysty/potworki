import { BigButton } from "../components/BigButton"
import { EggView } from "../components/EggView"
import {
	CRYSTALS,
	Crystal,
	GateReveal,
	gateFactor,
	litCrystals,
} from "../components/gate"
import { HelpTip } from "../components/HelpTip"
import { useGateReveal } from "../components/useGateReveal"
import { needsMaintenance, stageProgress } from "../game/adaptive"
import { isMaxStage, STAGES } from "../game/facts"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame } from "../store/store"

// łącznik ścieżki między węzłami
function Trail() {
	return (
		<div className="mx-auto h-8 w-1 rounded-full border-l-4 border-dashed border-white/60" />
	)
}

export function MapScreen() {
	const unlockedStage = useGame((s) => s.unlockedStage)
	const facts = useGame((s) => s.facts)
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const startRound = useGame((s) => s.startRound)
	const goTo = useGame((s) => s.goTo)

	// świeżo otwarta brama do uczczenia — decyzja podjęta przy pierwszym renderze,
	// PRZED mutacją store, więc stabilna mimo podwójnego montażu StrictMode.
	// Po odblokowaniu w rundzie splash gra już w podsumowaniu; tu zostaje jako
	// zapas dla ścieżki debug (debugOpenGate / debugSimulateRound).
	const { reveal, dismiss } = useGateReveal(() => {
		const s = useGame.getState()
		return s.unlockedStage > s.celebratedStage
			? { stage: s.unlockedStage }
			: null
	})

	const maxStage = isMaxStage(unlockedStage)
	const lit = litCrystals(stageProgress(facts, unlockedStage))
	const refresh = needsMaintenance(facts, unlockedStage) // stare tabliczki przygasły
	const gatesLeft = STAGES.length - 1 - unlockedStage // nieotwarte bramy (z bieżącą)

	const ownedIds = Object.keys(ownedMonsters).map(Number)
	const traveler = ownedIds.sort(
		(a, b) =>
			(ownedMonsters[b]?.hatchedAt ?? 0) - (ownedMonsters[a]?.hatchedAt ?? 0),
	)[0]

	// zdobyte krainy: etapy unlockedStage..1 (od najnowszej), etap 0 = wioska
	const conquered: number[] = []
	for (let st = unlockedStage; st >= 1; st--) conquered.push(st)

	return (
		<div className="flex min-h-dvh flex-col gap-3 p-4">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => goTo("home")}
					className="touch-manipulation rounded-full bg-white/80 px-5 py-2 text-2xl font-extrabold text-grape-dark shadow active:scale-90"
					aria-label="Wróć do domku"
				>
					←
				</button>
				<div className="text-2xl font-extrabold text-grape-dark">
					Kraina Potworków 🗺️
				</div>
				<HelpTip
					placement="bottom"
					align="right"
					text="To Twoja wyprawa! Każda brama kryje nową tabliczkę. Graj i zdobywaj kryształy — gdy zapalą się wszystkie, brama otworzy się sama i poznasz nową krainę!"
				/>
			</div>

			{/* mgliste krainy w oddali */}
			{!maxStage && gatesLeft > 1 && (
				<div className="flex flex-col items-center gap-1 pt-1 opacity-70">
					<div className="flex items-end gap-3">
						{[0, 1].map((i) => (
							<div
								key={i}
								className="h-12 w-10 rounded-t-2xl bg-gradient-to-b from-slate-300 to-slate-400 shadow-inner"
								style={{ opacity: 0.6 - i * 0.2 }}
							/>
						))}
					</div>
					<div className="text-sm font-bold text-slate-400">
						dalej śpią kolejne krainy… (jeszcze {gatesLeft}{" "}
						{gatesLeft === 1 ? "brama" : "bram"})
					</div>
					<Trail />
				</div>
			)}

			{/* front wyprawy: aktualna brama albo finał */}
			{maxStage ? (
				<div className="anim-pop flex flex-col items-center gap-3 rounded-[2rem] bg-gradient-to-b from-amber-300 to-orange-400 p-6 text-center shadow-xl">
					<div className="text-6xl">👑</div>
					<div className="text-2xl font-extrabold text-white">
						Cała Kraina zdobyta!
					</div>
					<div className="text-lg font-bold text-white/90">
						Wszystkie tabliczki są Twoje 🎉
					</div>
					<BigButton
						onClick={startRound}
						className="mt-1 w-full max-w-xs py-4 text-2xl"
					>
						Graj dalej! 🚀
					</BigButton>
				</div>
			) : (
				<div className="flex flex-col items-center">
					{/* kryształy nad łukiem */}
					<div className="flex items-end justify-center gap-1 px-2">
						{Array.from({ length: CRYSTALS }, (_, i) => (
							<Crystal key={i} lit={i < lit} index={i} />
						))}
					</div>

					{/* portal-brama */}
					<div className="relative -mt-1">
						<div className="rounded-t-[3rem] rounded-b-2xl bg-gradient-to-b from-violet-400 to-fuchsia-500 p-2.5 shadow-xl">
							<div className="relative flex h-44 w-40 items-center justify-center overflow-hidden rounded-t-[2.6rem] rounded-b-xl bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-950">
								<div className="anim-float text-5xl font-extrabold text-white/80">
									? ?
								</div>
								{/* szron/mgła zakrywająca tajemnicę */}
								<div className="pointer-events-none absolute inset-0 bg-white/15 backdrop-blur-[2px]" />
							</div>
						</div>
						{/* potwórek-podróżnik u stóp bramy */}
						<div className="absolute -bottom-2 -left-7">
							{traveler !== undefined ? (
								<MonsterSvg id={traveler} size={72} />
							) : (
								<div className="anim-float">
									<EggView quality="normal" size={48} />
								</div>
							)}
						</div>
					</div>

					<div className="mt-3 rounded-full bg-white/80 px-4 py-1 text-lg font-extrabold text-amber-500 shadow-sm">
						Kryształy: {lit}/{CRYSTALS}
					</div>
					<div className="mt-1 max-w-xs text-center text-sm font-bold text-slate-500">
						{refresh
							? "Starsze tabliczki przygasły 🌙 — poćwicz je, żeby brama się otworzyła!"
							: lit === 0
								? "Zagraj rundę, żeby zacząć zbierać kryształy!"
								: "Każda runda dokłada kryształów. Komplet otworzy bramę!"}
					</div>
					<BigButton
						onClick={startRound}
						className="mt-3 w-full max-w-xs py-4 text-2xl"
					>
						Graj, by ją otworzyć! 🚀
					</BigButton>
				</div>
			)}

			<Trail />

			{/* zdobyte krainy */}
			<div className="flex flex-col items-center gap-0">
				{conquered.map((st, i) => {
					const f = gateFactor(st)
					return (
						<div key={st} className="flex flex-col items-center">
							{i > 0 && <Trail />}
							<div className="flex items-center gap-3 rounded-3xl border-b-4 border-emerald-300 bg-white/90 px-5 py-3 shadow-md">
								<div className="text-3xl font-extrabold text-grape-dark">
									×{f}
								</div>
								<div className="rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-extrabold text-emerald-600">
									zdobyta ✓
								</div>
							</div>
						</div>
					)
				})}

				{/* wioska startowa */}
				{conquered.length > 0 && <Trail />}
				<div className="flex flex-col items-center gap-1 rounded-3xl border-b-4 border-violet-200 bg-white/90 px-5 py-3 shadow-md">
					<div className="text-lg font-extrabold text-grape-dark">
						🏡 Wioska startowa
					</div>
					<div className="flex gap-1.5">
						{STAGES[0]?.map((f) => (
							<div
								key={f}
								className="rounded-lg bg-violet-100 px-2 py-0.5 text-base font-extrabold text-grape-dark"
							>
								×{f}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* animacja otwarcia bramy (zapas dla ścieżki debug — w grze gra w podsumowaniu) */}
			{reveal && <GateReveal stage={reveal.stage} onDone={dismiss} />}
		</div>
	)
}
