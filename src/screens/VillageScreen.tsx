import confetti from "canvas-confetti"
import { useState } from "react"
import { BigButton } from "../components/BigButton"
import { HelpTip } from "../components/HelpTip"
import { BuildingArt } from "../components/village/BuildingArt"
import { BuildReveal } from "../components/village/BuildReveal"
import { BuildSheet, type SheetView } from "../components/village/BuildSheet"
import { Resident, type ResidentMode } from "../components/village/Resident"
import { WanderingMonster, wanderParams } from "../components/WanderingMonster"
import type { BuildingId, DecorationId } from "../game/village"
import {
	BUILDINGS,
	buildingLevel,
	currentGoal,
	MAX_BUILDING_LEVEL,
	nextLevelCost,
	villageCap,
} from "../game/village"
import { MONSTER_COUNT } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame } from "../store/store"

// ---------------------------------------------------------------------------
// Kompozycja sceny: pas nieba (słońce, tęcza, poświata latarni) → pas budynków
// (górna 1/3, 6 działek) → łąka (wędrowcy, ścieżka, dekoracje). Budynki są
// scenerią, przed którą żyją potworki — nie ikonami na brzegach ekranu.
// Każdy zakup ZMIENIA scenę (kwiaty na łące, ścieżka, światła), nie tylko
// dodaje obrazek — patrz plans/012 (zasada 2).
// ---------------------------------------------------------------------------

// działki budynków: left w %, rozmiar artu w px (cele dotykowe ≥ 64 px)
const PLOTS: Record<BuildingId, { left: number; top: number; size: number }> = {
	domki: { left: 1, top: 11, size: 88 },
	"plac-zabaw": { left: 16, top: 15, size: 88 },
	zamek: { left: 37, top: 2, size: 96 },
	fontanna: { left: 61, top: 13, size: 72 },
	latarnie: { left: 79, top: 8, size: 84 },
	ogrodek: { left: 83, top: 37, size: 60 },
}

// mieszkańcy: zbudowany budynek przyciąga jednego z pokazywanych potworków
// (deterministycznie: najstarsi z listy) — wioska jest zamieszkana, nie umeblowana
const RESIDENT_SPOTS: readonly [
	BuildingId,
	{ leftPct: number; bottomPct: number; mode: ResidentMode },
][] = [
	["domki", { leftPct: 7, bottomPct: 50, mode: "doze" }],
	["plac-zabaw", { leftPct: 24, bottomPct: 46, mode: "play" }],
	["zamek", { leftPct: 47, bottomPct: 49, mode: "guard" }],
	["fontanna", { leftPct: 68, bottomPct: 45, mode: "doze" }],
]

// kwiaty ogródka rozsiane po łące (3 na poziom); e = indeks emoji w palecie poziomu
const FLOWER_SPOTS = [
	{ l: 14, b: 10, e: 0 },
	{ l: 33, b: 5, e: 1 },
	{ l: 55, b: 12, e: 2 },
	{ l: 72, b: 6, e: 0 },
	{ l: 88, b: 14, e: 1 },
	{ l: 22, b: 22, e: 2 },
	{ l: 44, b: 26, e: 0 },
	{ l: 64, b: 22, e: 1 },
	{ l: 6, b: 18, e: 2 },
]
const FLOWER_PALETTE: Record<number, string[]> = {
	1: ["🌷", "🌼", "🌷"],
	2: ["🌷", "🌼", "🌻"],
	3: ["🌺", "🌼", "🌻"],
}

// ścieżka (dekoracja): kamyki od zamku w dół łąki
const PEBBLES = [
	{ l: 49, b: 38 },
	{ l: 45, b: 31 },
	{ l: 51, b: 24 },
	{ l: 46, b: 17 },
	{ l: 52, b: 10 },
	{ l: 47, b: 3 },
]

export function VillageScreen() {
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const companionId = useGame((s) => s.companionId)
	const dreamMonsterId = useGame((s) => s.dreamMonsterId)
	const village = useGame((s) => s.village)
	const iskierki = useGame((s) => s.iskierki)
	const startRound = useGame((s) => s.startRound)
	const goTo = useGame((s) => s.goTo)
	const buildVillage = useGame((s) => s.buildVillage)
	const buyDecoration = useGame((s) => s.buyDecoration)
	const setVillageGoal = useGame((s) => s.setVillageGoal)

	const [sheet, setSheet] = useState<SheetView | null>(null)
	const [reveal, setReveal] = useState<{
		id: BuildingId
		level: number
	} | null>(null)
	const [cheerNonce, setCheerNonce] = useState(0)
	// wieczór to zabawka (maks latarnie): przełącznik w komponencie, nigdy nie
	// persystowany i nigdy automatyczny
	const [evening, setEvening] = useState(false)

	const ownedIds = Object.keys(ownedMonsters).map(Number)
	const ownedCount = ownedIds.length

	// najnowsi do limitu (limit rośnie z domkami), ale przyjaciel zawsze w komplecie
	const cap = villageCap(village)
	const sorted = [...ownedIds].sort(
		(a, b) =>
			(ownedMonsters[b]?.hatchedAt ?? 0) - (ownedMonsters[a]?.hatchedAt ?? 0),
	)
	let shown = sorted.slice(0, cap)
	if (
		companionId !== null &&
		companionId in ownedMonsters &&
		!shown.includes(companionId)
	) {
		shown = [companionId, ...shown.slice(0, cap - 1)]
	}

	// mieszkańcy: budynki z RESIDENT_SPOTS przygarniają potworki z końca listy
	// (przyjaciel — początek listy — zawsze zostaje wędrowcem)
	const activeSpots = RESIDENT_SPOTS.filter(
		([id]) => buildingLevel(village, id) >= 1,
	)
	const residentCount = Math.min(
		activeSpots.length,
		Math.max(0, shown.length - 1),
	)
	const residentIds = shown.slice(shown.length - residentCount)
	const wanderIds = shown.slice(0, shown.length - residentCount)

	const ogrodek = buildingLevel(village, "ogrodek")
	const latarnie = buildingLevel(village, "latarnie")
	const fontanna = buildingLevel(village, "fontanna")
	const flowerPalette = FLOWER_PALETTE[ogrodek] ?? FLOWER_PALETTE[1]
	const has = (id: DecorationId) => village.decorations.includes(id)
	const goal = currentGoal(village)
	// pomnik przedstawia PIERWSZEGO wyklutego potworka dziecka
	const firstHatchedId = [...ownedIds].sort(
		(a, b) =>
			(ownedMonsters[a]?.hatchedAt ?? 0) - (ownedMonsters[b]?.hatchedAt ?? 0),
	)[0]

	const handleBuild = (id: BuildingId) => {
		const newLevel = buildingLevel(village, id) + 1
		buildVillage(id)
		setSheet(null)
		setCheerNonce((n) => n + 1)
		// hierarchia celebracji: każdy poziom Zamku i każde L3 = pełny ekran;
		// reszta = confetti w scenie (jak wyklucie < brama)
		if (id === "zamek" || newLevel >= MAX_BUILDING_LEVEL) {
			setReveal({ id, level: newLevel })
		} else {
			confetti({ particleCount: 70, spread: 70, origin: { y: 0.55 } })
		}
	}

	const handleBuyDecoration = (id: DecorationId) => {
		buyDecoration(id)
		setCheerNonce((n) => n + 1)
		confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } })
	}

	const openPlot = (id: BuildingId) => {
		// maks latarnie stają się zabawką: tap przełącza dzień/wieczór
		// (arkusz latarni nadal dostępny z listy 🛠️)
		if (id === "latarnie" && latarnie >= MAX_BUILDING_LEVEL) {
			setEvening((e) => !e)
			return
		}
		setSheet({ kind: "building", id })
	}

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
				<div className="text-2xl font-extrabold text-grape-dark">Wioska 🏡</div>
				<HelpTip
					placement="bottom"
					align="right"
					text="To dom twoich potworków! Zbieraj ✨ iskierki i buduj — każdy budynek zmienia wioskę, a potworki się do niego wprowadzą. Stuknij szary zarys, żeby zobaczyć, co możesz zbudować!"
				/>
			</div>

			{/* pasek budowniczego: portfel + następny cel + arkusz budowy */}
			<div className="flex items-center gap-2">
				<div className="rounded-full bg-white/85 px-4 py-2 text-lg font-extrabold text-amber-500 shadow-sm">
					✨ {iskierki}
				</div>
				{goal ? (
					<button
						type="button"
						onClick={() =>
							goal.kind === "building"
								? setSheet({ kind: "building", id: goal.id as BuildingId })
								: setSheet({ kind: "list" })
						}
						className="flex min-w-0 flex-1 touch-manipulation items-center gap-2 rounded-full bg-white/85 px-4 py-2 shadow-sm active:scale-[0.98]"
					>
						<span className="truncate text-sm font-extrabold text-grape-dark">
							Cel: {goal.name}
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
					</button>
				) : (
					<div className="flex-1 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-2 text-center text-sm font-extrabold text-white shadow-sm">
						🏆 Wioska w pełnej krasie!
					</div>
				)}
				<button
					type="button"
					onClick={() => setSheet({ kind: "list" })}
					aria-label="Otwórz budowanie"
					className="touch-manipulation rounded-full bg-white/85 px-4 py-2 text-lg shadow-sm active:scale-95"
				>
					🛠️
				</button>
			</div>

			{ownedCount === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
					<div className="text-6xl">🏡</div>
					<div className="max-w-xs text-lg font-extrabold text-grape-dark">
						Twoja wioska czeka na pierwszego mieszkańca!
					</div>
					<div className="max-w-xs text-sm font-bold text-slate-500">
						Zagraj rundę i wykluj potworka — zamieszka właśnie tu.
					</div>
					<BigButton
						onClick={startRound}
						className="w-full max-w-xs py-4 text-2xl"
					>
						Graj! 🚀
					</BigButton>
				</div>
			) : (
				// `isolate`: z-indexy wędrowców (do ~96) zostają WEWNĄTRZ sceny — nie
				// przebijają arkusza budowy (z-40) ani pełnoekranowych revealów (z-50)
				<div className="isolate relative w-full flex-1 overflow-hidden rounded-3xl">
					{/* niebo */}
					<div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-sky-200/60 to-transparent" />
					<span className="pointer-events-none absolute left-[5%] top-[3%] text-3xl opacity-80">
						☀️
					</span>
					{has("tecza") && (
						<span className="pointer-events-none absolute left-[50%] top-[1%] text-6xl opacity-90">
							🌈
						</span>
					)}
					{/* łąka */}
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-emerald-300/80 to-transparent" />

					{/* efekty sceny (zakupy zmieniają całą scenę, nie tylko działkę) */}
					<div className="pointer-events-none absolute inset-0 z-[5]">
						{/* ścieżka: kamyki od zamku przez łąkę */}
						{has("sciezka") &&
							PEBBLES.map((p) => (
								<span
									key={`${p.l}-${p.b}`}
									className="absolute h-3 w-6 rounded-full bg-amber-100/90 shadow-sm"
									style={{ left: `${p.l}%`, bottom: `${p.b}%` }}
								/>
							))}
						{/* kwiaty ogródka na łące */}
						{FLOWER_SPOTS.slice(0, ogrodek * 3).map((f) => (
							<span
								key={`${f.l}-${f.b}`}
								className="absolute text-xl"
								style={{ left: `${f.l}%`, bottom: `${f.b}%` }}
							>
								{flowerPalette?.[f.e] ?? "🌼"}
							</span>
						))}
						{ogrodek >= 2 && (
							<>
								<span
									className="anim-float absolute text-lg"
									style={{ left: "36%", bottom: "36%" }}
								>
									🦋
								</span>
								<span
									className="anim-float absolute text-base"
									style={{ left: "70%", bottom: "30%", animationDelay: "1.2s" }}
								>
									🦋
								</span>
							</>
						)}
						{ogrodek >= 3 && (
							<span
								className="anim-sparkle absolute text-base"
								style={{ left: "45%", bottom: "8%" }}
							>
								✨
							</span>
						)}
						{/* dekoracje jednorazowe */}
						{has("kwiatki") && (
							<span
								className="absolute text-xl"
								style={{ left: "58%", bottom: "4%" }}
							>
								🌼🌸🌼
							</span>
						)}
						{has("staw") && (
							<span
								className="absolute flex h-10 w-24 items-center justify-center rounded-full border-2 border-sky-400/40 bg-sky-300/70"
								style={{ left: "6%", bottom: "5%" }}
							>
								<span className="anim-float text-xl">🦆</span>
							</span>
						)}
						{has("hustawka") && (
							<span
								className="absolute text-5xl"
								style={{ left: "72%", bottom: "18%" }}
							>
								🌳
							</span>
						)}
						{has("pomnik") && firstHatchedId !== undefined && (
							<span
								className="absolute flex flex-col items-center"
								style={{ left: "26%", bottom: "8%" }}
							>
								<MonsterSvg
									id={firstHatchedId}
									size={38}
									animate={false}
									className="monster-silhouette opacity-70"
								/>
								<span className="-mt-1 h-3 w-12 rounded bg-slate-300/90 shadow-sm" />
							</span>
						)}
						{/* Fontanna Marzeń: odbicie wymarzonego potworka w wodzie */}
						{fontanna >= MAX_BUILDING_LEVEL && dreamMonsterId !== null && (
							<span
								className="absolute opacity-40"
								style={{ left: "64.5%", top: "24%", transform: "scaleY(-1)" }}
							>
								<MonsterSvg
									id={dreamMonsterId}
									size={30}
									animate={false}
									className="monster-silhouette"
								/>
							</span>
						)}
					</div>

					{/* pas budynków: 6 działek; sylwetka z ceną = cel do zdobycia */}
					<div className="pointer-events-none absolute inset-0 z-20">
						{BUILDINGS.map((b) => {
							const level = buildingLevel(village, b.id)
							const plot = PLOTS[b.id]
							const cost = nextLevelCost(village, b.id)
							return (
								<button
									key={b.id}
									type="button"
									onClick={() => openPlot(b.id)}
									aria-label={`${b.name}${level === 0 ? " (do zbudowania)" : ""}`}
									className="pointer-events-auto absolute flex min-h-16 min-w-16 touch-manipulation flex-col items-center active:scale-95"
									style={{ left: `${plot.left}%`, top: `${plot.top}%` }}
								>
									{level === 0 ? (
										<>
											<span className="opacity-40 grayscale">
												<BuildingArt id={b.id} level={1} size={plot.size} />
											</span>
											{cost !== null && (
												<span
													className={`-mt-1 rounded-full px-2 py-0.5 text-xs font-extrabold shadow-sm ${
														iskierki >= cost
															? "bg-gradient-to-r from-amber-300 to-orange-400 text-white"
															: "bg-white/85 text-slate-400"
													}`}
												>
													✨{cost}
												</span>
											)}
										</>
									) : (
										<BuildingArt id={b.id} level={level} size={plot.size} />
									)}
								</button>
							)
						})}
					</div>

					{/* mieszkańcy przy budynkach */}
					{activeSpots.slice(0, residentCount).map(([, spot], i) => {
						const id = residentIds[i]
						if (id === undefined) return null
						return (
							<Resident
								key={id}
								id={id}
								leftPct={spot.leftPct}
								bottomPct={spot.bottomPct}
								mode={spot.mode}
								cheerNonce={cheerNonce}
							/>
						)
					})}

					{/* wędrowcy */}
					{wanderIds.map((id, i) => (
						<WanderingMonster
							key={id}
							id={id}
							params={wanderParams(id, i)}
							isCompanion={id === companionId}
							cheerNonce={i < 3 ? cheerNonce : 0}
						/>
					))}

					{/* wieczór (zabawka maks latarni): przygasza scenę, latarnie świecą */}
					{evening && latarnie >= MAX_BUILDING_LEVEL && (
						<div className="pointer-events-none absolute inset-0 z-[120] bg-gradient-to-b from-indigo-950/60 via-indigo-900/35 to-indigo-950/20">
							<span className="absolute right-[8%] top-[4%] text-3xl">🌙</span>
							<span className="anim-sparkle absolute left-[22%] top-[6%] text-sm text-white">
								✦
							</span>
							<span
								className="anim-sparkle absolute left-[62%] top-[10%] text-xs text-white"
								style={{ animationDelay: "0.8s" }}
							>
								✦
							</span>
						</div>
					)}

					{ownedCount === MONSTER_COUNT && (
						<div className="anim-pop absolute left-1/2 top-2 z-[130] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-2 text-lg font-extrabold text-white shadow-lg">
							🎉 Cała wioska w komplecie!
						</div>
					)}
				</div>
			)}

			{sheet && (
				<BuildSheet
					view={sheet}
					village={village}
					iskierki={iskierki}
					onClose={() => setSheet(null)}
					onShowList={() => setSheet({ kind: "list" })}
					onOpenBuilding={(id) => setSheet({ kind: "building", id })}
					onBuild={handleBuild}
					onBuyDecoration={handleBuyDecoration}
					onSetGoal={setVillageGoal}
				/>
			)}

			{reveal && (
				<BuildReveal
					id={reveal.id}
					level={reveal.level}
					onDone={() => setReveal(null)}
				/>
			)}
		</div>
	)
}
