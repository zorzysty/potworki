import { Fragment, type ReactNode } from "react"
import { BigButton } from "../components/BigButton"
import { EggView } from "../components/EggView"
import { CRYSTALS, GateArch, GateReveal, litCrystals } from "../components/gate"
import { HelpTip } from "../components/HelpTip"
import { MapIslandArt, MapPortalArt } from "../components/MapArt"
import { MonsterStage } from "../components/MonsterStage"
import { useGateReveal } from "../components/useGateReveal"
import { needsMaintenance, stageProgress } from "../game/adaptive"
import { guardianOwned, newestOwned } from "../game/collection"
import { isMaxStage, STAGES } from "../game/facts"
import { BRIDGE_DIVIDER_IDS, REGIONS, type Region } from "../monsters/world"
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
			className="map-trail w-full shrink-0"
			aria-hidden="true"
		>
			<path
				d={d}
				fill="none"
				stroke="#688f9a"
				strokeOpacity={0.2}
				strokeWidth={14}
				strokeLinecap="round"
				strokeDasharray="0.1 22"
				transform="translate(0 2.5)"
			/>
			<path
				d={d}
				fill="none"
				stroke="#fff8e8"
				strokeOpacity={0.9}
				strokeWidth={9}
				strokeLinecap="round"
				strokeDasharray="0.1 22"
			/>
		</svg>
	)
}

// zasłonka niezdobytego potworka (strażnik krainy, Dzielnik) — „tajemniczy do odkrycia", nie szara sylwetka
function MysteryMonster({ size }: { size: number }) {
	return (
		<div
			className="flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-400/60 bg-white/70 font-extrabold text-slate-400"
			style={{ width: size, height: size, fontSize: size * 0.45 }}
		>
			?
		</div>
	)
}

// Distant lands remain a compact teaser above the current gate.
function FutureLands({ gatesLeft }: { gatesLeft: number }) {
	return (
		<div className="map-future">
			<svg viewBox="0 0 44 36" aria-hidden="true">
				<path
					d="M4 32V16a10 10 0 0 1 20 0v16m4 0V21a7 7 0 0 1 14 0v11"
					fill="#c2c3d4"
					stroke="#aaaec4"
					strokeWidth="2"
				/>
				<path
					d="M11 32V17a3 3 0 0 1 6 0v15m16 0V21a2 2 0 0 1 4 0v11"
					fill="#8e96b0"
				/>
			</svg>
			<span>
				dalej śpią kolejne krainy… (jeszcze {gatesLeft}{" "}
				{gatesLeft === 1 ? "brama" : gatesLeft <= 4 ? "bramy" : "bram"})
			</span>
		</div>
	)
}

// wyspa-kraina: wektorowa sceneria etapu (MapArt), strażnik i podpis z nazwą
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
	return (
		<article className={`map-island map-island-${side}`}>
			<div className="map-island-scene">
				<MapIslandArt stage={region.stage} />
				<div className="map-guardian">
					{guardianOwned ? (
						<MonsterStage id={region.guardianId} size={62} animate={false} />
					) : (
						<MysteryMonster size={52} />
					)}
				</div>
			</div>
			<div className="map-island-caption">
				<h2
					className={`text-[17px] font-extrabold leading-tight ${region.scenery.accent}`}
				>
					{region.emoji} {region.name}
				</h2>
				{badge}
			</div>
		</article>
	)
}

// łuk pomostu: środkowi strażnicy stoją wyżej (wartości dobrane do krzywej SVG)
const BRIDGE_DY = [0, -12, -12, 0]

// Most Dzielników: prawdziwy mostek nad wodą, Dzielniki stoją na pomoście
function DividerBridge({
	ownedMonsters,
}: {
	ownedMonsters: SaveState["ownedMonsters"]
}) {
	const bridgeOwned = BRIDGE_DIVIDER_IDS.filter(
		(id) => id in ownedMonsters,
	).length
	// bez overflow-hidden: dymek HelpTip musi wystawać ponad kartę; scena i tak
	// nie wychodzi poza zaokrąglenia (SVG przycina się do własnego viewportu)
	return (
		<div className="map-bridge relative w-full max-w-sm self-center px-4 pb-3 pt-3">
			<div className="relative z-10 flex items-center justify-center gap-1.5">
				<span className="rounded-2xl bg-white/90 px-3 py-1 text-[15px] font-extrabold text-teal-800 shadow-sm">
					🌉 Most Dzielników
				</span>
				<HelpTip
					placement="top"
					align="right"
					text="Te cztery Dzielniki mieszkają na Moście. Zdobędziesz je tylko grając w ich zabawę — Dzielniki — którą otwiera brama ×4!"
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
						stroke="#fff8e8"
						strokeOpacity={0.35}
						strokeWidth={3}
					/>
					<path
						d="M0 88 Q 20 82 40 88 T 80 88 T 120 88 T 160 88 T 200 88 T 240 88 T 280 88 T 320 88"
						fill="none"
						stroke="#fff8e8"
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
							stroke="#caa47f"
							strokeWidth={4}
							strokeLinecap="round"
						/>
					))}
					{/* pomost */}
					<path
						d="M -4 74 Q 160 44 324 74"
						fill="none"
						stroke="#806c66"
						strokeWidth={17}
						strokeLinecap="round"
					/>
					<path
						d="M -4 72 Q 160 42 324 72"
						fill="none"
						stroke="#b99173"
						strokeWidth={12}
						strokeLinecap="round"
					/>
				</svg>
				{/* Dzielniki stoją na łuku pomostu */}
				<div className="absolute inset-x-0 bottom-7 flex items-end justify-center gap-2">
					{BRIDGE_DIVIDER_IDS.map((id, i) => (
						<div
							key={id}
							style={{ transform: `translateY(${BRIDGE_DY[i]}px)` }}
						>
							{id in ownedMonsters ? (
								<MonsterStage id={id} size={52} animate={false} />
							) : (
								<MysteryMonster size={46} />
							)}
						</div>
					))}
				</div>
			</div>
			<div className="relative z-10 -mt-1 flex justify-center">
				<span className="rounded-full bg-white/85 px-3 py-0.5 text-sm font-extrabold text-teal-800 shadow-sm">
					{bridgeOwned}/{BRIDGE_DIVIDER_IDS.length} ✨
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

	const traveler = newestOwned(ownedMonsters)

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
					guardianOwned={guardianOwned(region, ownedMonsters)}
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
		el: <DividerBridge ownedMonsters={ownedMonsters} />,
	})

	return (
		// max-w-lg celowo TAKŻE w landscape (App uncapuje przez land:max-w-none):
		// mapa ma zostać wąskim pionowym szlakiem również na laptopie
		<div className="world-map mx-auto flex min-h-[var(--app-vh)] w-full max-w-lg flex-col p-4 pb-10">
			<header className="map-header">
				<button
					type="button"
					onClick={() => goTo("home")}
					className="map-back touch-manipulation text-2xl font-extrabold text-grape-dark active:scale-90"
					aria-label="Wróć do domku"
				>
					←
				</button>
				<h1 className="text-2xl font-extrabold text-grape-dark">
					Mapa Świata 🗺️
				</h1>
				<HelpTip
					placement="bottom"
					align="right"
					text="To Twoja wyprawa! Każda brama kryje nową tabliczkę. Graj i zdobywaj kryształy — gdy zapalą się wszystkie, brama otworzy się sama i poznasz nową krainę!"
				/>
			</header>

			{/* mgliste krainy w oddali */}
			{!maxStage && gatesLeft > 1 && <FutureLands gatesLeft={gatesLeft} />}

			{/* front wyprawy: aktualna brama albo finał */}
			{maxStage ? (
				<div className="map-complete anim-pop flex w-full flex-col items-center gap-3 p-6 text-center">
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
				<section className="map-frontier" aria-label="Aktualna brama">
					<div className="map-portal-scene">
						<MapPortalArt />
						<div className="map-portal">
							<GateArch lit={lit} width={158} mist="on">
								<div className="anim-float text-5xl font-extrabold text-white/80 blur-[2px]">
									? ?
								</div>
							</GateArch>
							{/* potwórek-podróżnik u stóp bramy */}
							<div className="absolute -bottom-1 -left-10">
								{traveler !== undefined ? (
									<MonsterStage id={traveler} size={72} />
								) : (
									<div className="anim-float">
										<EggView quality="normal" size={48} />
									</div>
								)}
							</div>
						</div>
					</div>
					<div className="map-gate-details">
						<div className="map-crystal-count">
							Kryształy: {lit}/{CRYSTALS}
						</div>
						<div className="map-crystal-meter" aria-hidden="true">
							{Array.from({ length: CRYSTALS }, (_, i) => (
								<svg key={i} viewBox="0 0 24 28" data-lit={i < lit}>
									<path d="M7 2h10l5 8-10 16L2 10Z" />
									<path d="m7 2 2 8 3 16 3-16 2-8M2 10h20" fill="none" />
								</svg>
							))}
						</div>
						<div className="map-gate-hint">
							{refresh
								? "Starsze tabliczki przygasły 🌙 — poćwicz je, żeby brama się otworzyła!"
								: lit === 0
									? "Zagraj rundę, żeby zacząć zbierać kryształy!"
									: "Każda runda dokłada kryształów. Komplet otworzy bramę!"}
						</div>
						<BigButton
							onClick={startRound}
							className="map-play w-full py-4 text-xl"
						>
							Graj, by ją otworzyć! 🚀
						</BigButton>
					</div>
				</section>
			)}

			{/* szlak: zdobyte krainy → wioska startowa → Most Dzielników */}
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
