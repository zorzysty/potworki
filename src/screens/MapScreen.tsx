import { Fragment, type ReactNode } from "react"
import { BigButton } from "../components/BigButton"
import { EggView } from "../components/EggView"
import { CRYSTALS, GateArch, GateReveal, litCrystals } from "../components/gate"
import { HelpTip } from "../components/HelpTip"
import { useGateReveal } from "../components/useGateReveal"
import { needsMaintenance, stageProgress } from "../game/adaptive"
import { isMaxStage, STAGES } from "../game/facts"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { BRIDGE_GUARDIAN_IDS, REGIONS, type Region } from "../monsters/world"
import type { SaveState } from "../store/schema"
import { useGame } from "../store/store"

// kręta ścieżka z kamieni-kropek między przystankami wyprawy. Kotwice są
// PRZYBLIŻONE z rozmysłem — ścieżka ma wędrować w stronę wyspy, nie celować
// w jej środek na każdej szerokości ekranu.
type Side = "left" | "center" | "right"
const TRAIL_X: Record<Side, number> = { left: 195, center: 240, right: 285 }

function Trail({ from, to }: { from: Side; to: Side }) {
	const d = `M ${TRAIL_X[from]} -6 C ${TRAIL_X[from]} 34 ${TRAIL_X[to]} 26 ${TRAIL_X[to]} 66`
	return (
		<svg
			viewBox="0 0 480 60"
			preserveAspectRatio="none"
			className="h-14 w-full shrink-0"
			aria-hidden="true"
		>
			<path
				d={d}
				fill="none"
				stroke="#000000"
				strokeOpacity={0.07}
				strokeWidth={14}
				strokeLinecap="round"
				strokeDasharray="0.1 22"
				transform="translate(0 2.5)"
			/>
			<path
				d={d}
				fill="none"
				stroke="#ffffff"
				strokeOpacity={0.9}
				strokeWidth={9}
				strokeLinecap="round"
				strokeDasharray="0.1 22"
			/>
		</svg>
	)
}

// zasłonka niezdobytego strażnika — „tajemniczy do odkrycia", nie szara sylwetka
function MysteryGuardian({ size }: { size: number }) {
	return (
		<div
			className="flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-400/60 bg-white/70 font-extrabold text-slate-400"
			style={{ width: size, height: size, fontSize: size * 0.45 }}
		>
			?
		</div>
	)
}

// mgliste przyszłe krainy: chmury + sylwetki śpiących bram w oddali
function FutureLands({ gatesLeft }: { gatesLeft: number }) {
	return (
		<div className="relative flex flex-col items-center gap-1 pb-1 pt-1">
			<div
				aria-hidden
				className="anim-float pointer-events-none absolute -top-1 left-[10%] h-8 w-24 rounded-full bg-white/80 blur-md"
			/>
			<div
				aria-hidden
				className="anim-float pointer-events-none absolute top-7 right-[8%] h-8 w-28 rounded-full bg-white/70 blur-md"
				style={{ animationDelay: "-1.6s" }}
			/>
			<div className="relative flex items-end gap-4">
				<span
					aria-hidden
					className="anim-float absolute top-1 -right-8 text-xl opacity-70"
				>
					💤
				</span>
				{[0, 1].map((i) => (
					<div
						key={i}
						className="relative overflow-hidden rounded-t-full bg-gradient-to-b from-slate-300 to-slate-400 shadow-inner"
						style={{
							width: 42 - i * 8,
							height: 50 - i * 10,
							opacity: 0.65 - i * 0.25,
						}}
					>
						<div className="absolute inset-x-[22%] top-[30%] bottom-0 rounded-t-full bg-slate-500/50" />
					</div>
				))}
			</div>
			<div className="relative rounded-full bg-white/80 px-4 py-1 text-sm font-bold text-slate-500 shadow-sm">
				dalej śpią kolejne krainy… (jeszcze {gatesLeft}{" "}
				{gatesLeft === 1 ? "brama" : gatesLeft <= 4 ? "bramy" : "bram"})
			</div>
		</div>
	)
}

// wyspa-kraina: tematyczna sceneria (region.scenery), strażnik i tabliczka z nazwą
function RegionIsland({
	region,
	guardianOwned,
	side,
	badge,
}: {
	region: Region
	guardianOwned: boolean
	side: Side
	badge: ReactNode
}) {
	const scene = region.scenery
	return (
		<div
			className={`relative w-[88%] max-w-sm overflow-hidden rounded-[2.2rem] border-b-8 border-black/10 bg-gradient-to-b px-4 py-3 shadow-lg ${scene.panel} ${
				side === "right" ? "self-end rotate-1" : "self-start -rotate-1"
			}`}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 select-none"
			>
				<span className="absolute right-3 top-1 text-3xl opacity-60">
					{scene.deco[0]}
				</span>
				<span className="absolute right-14 bottom-0 text-xl opacity-50">
					{scene.deco[1]}
				</span>
				<span className="absolute left-1/2 top-1 text-base opacity-40">
					{scene.deco[2]}
				</span>
			</div>
			<div className="relative flex items-center gap-3">
				<div className="flex shrink-0 flex-col items-center">
					{guardianOwned ? (
						<MonsterSvg id={region.guardianId} size={56} animate={false} />
					) : (
						<MysteryGuardian size={52} />
					)}
					<div
						aria-hidden
						className="-mt-1.5 h-2 w-12 rounded-[50%] bg-black/10"
					/>
				</div>
				<div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
					<span
						className={`rounded-2xl bg-white/90 px-3 py-1 text-[15px] font-extrabold leading-tight shadow-sm ${scene.accent}`}
					>
						{region.emoji} {region.name}
					</span>
					{badge}
				</div>
			</div>
		</div>
	)
}

// łuk pomostu: środkowi strażnicy stoją wyżej (wartości dobrane do krzywej SVG)
const BRIDGE_DY = [0, -12, -12, 0]

// Most Strażników: prawdziwy mostek nad wodą, strażnicy stoją na pomoście
function GuardianBridge({
	ownedMonsters,
}: {
	ownedMonsters: SaveState["ownedMonsters"]
}) {
	const bridgeOwned = BRIDGE_GUARDIAN_IDS.filter(
		(id) => id in ownedMonsters,
	).length
	return (
		<div className="relative w-full max-w-sm self-center overflow-hidden rounded-[2.2rem] border-b-8 border-black/10 bg-gradient-to-b from-sky-200 via-sky-300 to-blue-400 px-4 pb-3 pt-3 shadow-lg">
			<div className="relative z-10 flex items-center justify-center gap-1.5">
				<span className="rounded-2xl bg-white/90 px-3 py-1 text-[15px] font-extrabold text-fuchsia-600 shadow-sm">
					🌉 Most Strażników
				</span>
				<HelpTip
					placement="top"
					align="right"
					text="Te cztery potworki strzegą Mostu. Zdobędziesz je tylko grając w dzielenie ➗!"
				/>
			</div>
			<div className="relative mt-1 h-28">
				<svg
					viewBox="0 0 320 96"
					preserveAspectRatio="none"
					className="absolute inset-x-0 bottom-0 h-24 w-full"
					aria-hidden="true"
				>
					{/* fale */}
					<path
						d="M0 78 Q 20 72 40 78 T 80 78 T 120 78 T 160 78 T 200 78 T 240 78 T 280 78 T 320 78"
						fill="none"
						stroke="#ffffff"
						strokeOpacity={0.35}
						strokeWidth={3}
					/>
					<path
						d="M0 88 Q 20 82 40 88 T 80 88 T 120 88 T 160 88 T 200 88 T 240 88 T 280 88 T 320 88"
						fill="none"
						stroke="#ffffff"
						strokeOpacity={0.5}
						strokeWidth={3}
					/>
					{/* słupki poręczy */}
					{[
						[28.8, 48.6, 68.6],
						[94.4, 41.4, 61.4],
						[160, 39, 59],
						[225.6, 41.4, 61.4],
						[291.2, 48.6, 68.6],
					].map(([x, y1, y2]) => (
						<line
							key={x}
							x1={x}
							y1={y1}
							x2={x}
							y2={y2}
							stroke="#e879f9"
							strokeWidth={4}
							strokeLinecap="round"
						/>
					))}
					{/* pomost */}
					<path
						d="M -4 74 Q 160 44 324 74"
						fill="none"
						stroke="#a21caf"
						strokeWidth={17}
						strokeLinecap="round"
					/>
					<path
						d="M -4 72 Q 160 42 324 72"
						fill="none"
						stroke="#d946ef"
						strokeWidth={12}
						strokeLinecap="round"
					/>
				</svg>
				{/* strażnicy stoją na łuku pomostu */}
				<div className="absolute inset-x-0 bottom-7 flex items-end justify-center gap-2">
					{BRIDGE_GUARDIAN_IDS.map((id, i) => (
						<div
							key={id}
							style={{ transform: `translateY(${BRIDGE_DY[i]}px)` }}
						>
							{id in ownedMonsters ? (
								<MonsterSvg id={id} size={52} animate={false} />
							) : (
								<MysteryGuardian size={46} />
							)}
						</div>
					))}
				</div>
			</div>
			<div className="relative z-10 -mt-1 flex justify-center">
				<span className="rounded-full bg-white/85 px-3 py-0.5 text-sm font-extrabold text-fuchsia-600 shadow-sm">
					{bridgeOwned}/{BRIDGE_GUARDIAN_IDS.length} ✨
				</span>
			</div>
		</div>
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

	// szlak pod bramą jako JEDNA lista węzłów (krainy → wioska → most) z bokiem
	// zygzaka per węzeł — ścieżka między węzłami wynika z sąsiedztwa na liście
	const sideOf = (i: number): Side => (i % 2 === 0 ? "left" : "right")
	const nodes: { key: string; side: Side; el: ReactNode }[] = []
	for (const [i, st] of conquered.entries()) {
		const region = REGIONS[st]
		if (!region) continue
		nodes.push({
			key: `region-${st}`,
			side: sideOf(i),
			el: (
				<RegionIsland
					region={region}
					guardianOwned={region.guardianId in ownedMonsters}
					side={sideOf(i)}
					badge={
						<span
							className={`rounded-full bg-white/80 px-3 py-0.5 text-sm font-extrabold shadow-sm ${region.scenery.accent}`}
						>
							×{region.factor} zdobyta ✓
						</span>
					}
				/>
			),
		})
	}
	const village = REGIONS[0]
	if (village) {
		nodes.push({
			key: "village",
			side: sideOf(conquered.length),
			el: (
				<RegionIsland
					region={village}
					guardianOwned={true}
					side={sideOf(conquered.length)}
					badge={
						<div className="flex flex-wrap gap-1">
							{STAGES[0]?.map((f) => (
								<span
									key={f}
									className="rounded-lg bg-white/85 px-2 py-0.5 text-sm font-extrabold text-grape-dark shadow-sm"
								>
									×{f}
								</span>
							))}
						</div>
					}
				/>
			),
		})
	}
	nodes.push({
		key: "bridge",
		side: "center",
		el: <GuardianBridge ownedMonsters={ownedMonsters} />,
	})

	return (
		// max-w-lg celowo TAKŻE w landscape (App uncapuje przez land:max-w-none):
		// mapa ma zostać wąskim pionowym szlakiem również na laptopie
		<div className="mx-auto flex min-h-[var(--app-vh)] w-full max-w-lg flex-col p-4 pb-10">
			<div className="mb-1 flex items-center justify-between">
				<button
					type="button"
					onClick={() => goTo("home")}
					className="touch-manipulation rounded-full bg-white/80 px-5 py-2 text-2xl font-extrabold text-grape-dark shadow active:scale-90"
					aria-label="Wróć do domku"
				>
					←
				</button>
				<div className="text-2xl font-extrabold text-grape-dark">
					Mapa Świata 🗺️
				</div>
				<HelpTip
					placement="bottom"
					align="right"
					text="To Twoja wyprawa! Każda brama kryje nową tabliczkę. Graj i zdobywaj kryształy — gdy zapalą się wszystkie, brama otworzy się sama i poznasz nową krainę!"
				/>
			</div>

			{/* mgliste krainy w oddali */}
			{!maxStage && gatesLeft > 1 && (
				<>
					<FutureLands gatesLeft={gatesLeft} />
					<Trail from="center" to="center" />
				</>
			)}

			{/* front wyprawy: aktualna brama albo finał */}
			{maxStage ? (
				<div className="anim-pop flex flex-col items-center gap-3 self-center rounded-[2.2rem] border-b-8 border-black/10 bg-gradient-to-b from-amber-300 to-orange-400 p-6 text-center shadow-xl">
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
					<div className="relative">
						{/* pagórek, na którym stoi brama */}
						<div
							aria-hidden
							className="absolute -bottom-3 left-1/2 h-10 w-72 -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-emerald-200/90 to-emerald-300/90 shadow-inner"
						/>
						<GateArch lit={lit} width={196} mist="on">
							<div className="anim-float text-5xl font-extrabold text-white/80 blur-[2px]">
								? ?
							</div>
						</GateArch>
						{/* potwórek-podróżnik u stóp bramy */}
						<div className="absolute -bottom-1 -left-10">
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

			{/* szlak: zdobyte krainy → wioska startowa → Most Strażników */}
			{nodes.map((node, i) => (
				<Fragment key={node.key}>
					<Trail from={nodes[i - 1]?.side ?? "center"} to={node.side} />
					{node.el}
				</Fragment>
			))}

			{/* animacja otwarcia bramy (zapas dla ścieżki debug — w grze gra w podsumowaniu) */}
			{reveal && <GateReveal stage={reveal.stage} onDone={dismiss} />}
		</div>
	)
}
