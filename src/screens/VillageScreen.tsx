import confetti from "canvas-confetti"
import { useCallback, useMemo, useRef, useState } from "react"
import { BigButton } from "../components/BigButton"
import { GoalProgressBar } from "../components/GoalProgressBar"
import { HelpTip } from "../components/HelpTip"
import { SpeechBubble } from "../components/SpeechBubble"
import { BuildingArt } from "../components/village/BuildingArt"
import { BuildReveal } from "../components/village/BuildReveal"
import { BuildSheet, type SheetView } from "../components/village/BuildSheet"
import { layoutGreenery, layoutPlots } from "../components/village/layout"
import { Resident, type ResidentMode } from "../components/village/Resident"
import {
	BirdsArt,
	BushArt,
	ButterflyArt,
	CloudArt,
	DuckArt,
	FlowerArt,
	type FlowerKind,
	GROUND_Y,
	GrassTuft,
	MeadowTexture,
	MoonArt,
	PedestalArt,
	PlotGround,
	PondArt,
	RainbowArc,
	RoadArt,
	roadXAt,
	SparkleArt,
	SunArt,
	TentArt,
	Terrain,
	TreeArt,
} from "../components/village/Scenery"
import { WanderingMonster, wanderParams } from "../components/WanderingMonster"
import type { CosmeticId } from "../game/cosmetics"
import { expeditionProgress } from "../game/expeditions"
import type { BuildingId, DecorationId } from "../game/village"
import {
	BUILDINGS,
	buildingLevel,
	currentGoal,
	MAX_BUILDING_LEVEL,
	nextLevelCost,
	villageRoster,
} from "../game/village"
import { MONSTER_COUNT, MONSTERS } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame } from "../store/store"

// ---------------------------------------------------------------------------
// Kompozycja sceny: wektorowe niebo (SunArt/MoonArt, CloudArt, RainbowArc pod
// terenem) → Terrain (warstwowe wzgórza + łąka + droga Ścieżki; viewBox 0..100
// rozciągnięty na całą scenę = procenty) → działki z podestami PlotGround i
// zielenią GREENERY na tej samej linii gruntu → łąka (wędrowcy, dekoracje).
// Budynki są scenerią, przed którą żyją potworki — nie ikonami na brzegach
// ekranu. Każdy zakup ZMIENIA scenę (kwiaty na łące, droga, staw, światła),
// nie tylko dodaje obrazek — patrz plans/012 (zasada 2). Sceneria żyje w
// components/village/Scenery.tsx.
// ---------------------------------------------------------------------------

// Działki budynków STOJĄ na linii wzgórz: kontener o zerowej wysokości na
// GROUND_LINE_TOP, każdy plot kotwiczy stopę przez bottom (dy = uniesienie na
// zboczu) — żadnego pływania w powietrzu niezależnie od proporcji ekranu.
// Pozycje i rozmiary w px liczy CZYSTA `layoutPlots` (components/village/
// layout.ts) ze zmierzonego rozmiaru sceny: dwa rzędy z przesunięciem, bez
// nakładania na żadnej szerokości. Z działki zamku wynika brama (start drogi).
const GROUND_LINE_TOP = `${GROUND_Y}%` // linia gruntu należy do Scenery (teren + droga startują na niej)

// mieszkańcy: zbudowany budynek przyciąga jednego z pokazywanych potworków
// (deterministycznie: najstarsi z listy) — wioska jest zamieszkana, nie
// umeblowana. Pozycja względem działki: dx = ułamek szerokości od środka.
const RESIDENT_SPOTS: readonly [
	BuildingId,
	{ dx: number; mode: ResidentMode },
][] = [
	["domki", { dx: 0, mode: "doze" }],
	["plac-zabaw", { dx: -0.3, mode: "play" }],
	["zamek", { dx: 0.05, mode: "guard" }],
	["fontanna", { dx: 0.3, mode: "doze" }],
]

// kwiaty ogródka rozsiane po łące (3 na poziom); e = indeks emoji w palecie
// poziomu; pozycje omijają pas drogi (x ~40–52 przy dole)
const FLOWER_SPOTS = [
	{ l: 14, b: 10, e: 0 },
	{ l: 33, b: 5, e: 1 },
	{ l: 58, b: 13, e: 2 },
	{ l: 72, b: 6, e: 0 },
	{ l: 88, b: 14, e: 1 },
	{ l: 22, b: 22, e: 2 },
	{ l: 36, b: 27, e: 0 },
	{ l: 64, b: 22, e: 1 },
	{ l: 6, b: 18, e: 2 },
]
const FLOWER_PALETTE: Record<number, FlowerKind[]> = {
	1: ["tulip", "daisy", "tulip"],
	2: ["tulip", "daisy", "sunflower"],
	3: ["bell", "daisy", "sunflower"],
}

// ścieżka (dekoracja): kręta droga w terenie (Terrain road) + płaskie kamienie
// NA jej osi — lewa liczona w renderze z `roadXAt` (oś należy do Scenery,
// zależy od zmierzonego gateX), więc kamienie nie zjadą na pobocze; rozmiar
// rośnie ku dołowi (perspektywa jak szerokość drogi)
const STEPPING_STONES = [
	{ b: 44, w: 12 },
	{ b: 37, w: 14 },
	{ b: 29, w: 16 },
	{ b: 21, w: 18 },
	{ b: 13, w: 21 },
	{ b: 5, w: 24 },
]

// kępki trawy na łące (drobny wypełniacz pustych plam)
const GRASS_TUFTS = [
	{ l: 8, b: 28 },
	{ l: 20, b: 13 },
	{ l: 31, b: 33 },
	{ l: 60, b: 27 },
	{ l: 69, b: 10 },
	{ l: 84, b: 30 },
	{ l: 92, b: 8 },
]

// chmury: pozycja + rozmiar + rytm dryfu (null = fallback 22s z klasy)
const CLOUDS: readonly {
	left: string
	top: string
	width: number
	opacity: number
	dur: string | null
	delay: string | null
}[] = [
	{ left: "18%", top: "6%", width: 84, opacity: 0.95, dur: null, delay: null },
	{
		left: "44%",
		top: "2.5%",
		width: 60,
		opacity: 0.7,
		dur: "34s",
		delay: "-9s",
	},
	{
		left: "82%",
		top: "8%",
		width: 100,
		opacity: 0.85,
		dur: "30s",
		delay: "-16s",
	},
]

// gwiazdy nakładki wieczoru
const NIGHT_STARS = [
	{ l: "22%", t: "6%", s: "text-sm", d: "0s" },
	{ l: "36%", t: "12%", s: "text-xs", d: "0.5s" },
	{ l: "52%", t: "4%", s: "text-base", d: "1.1s" },
	{ l: "62%", t: "10%", s: "text-xs", d: "0.8s" },
	{ l: "78%", t: "5%", s: "text-sm", d: "1.6s" },
	{ l: "90%", t: "13%", s: "text-xs", d: "0.3s" },
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
	const cosmetics = useGame((s) => s.cosmetics)
	const buyCosmetic = useGame((s) => s.buyCosmetic)
	const expedition = useGame((s) => s.expedition)
	const totalRounds = useGame((s) => s.totalRounds)

	const [sheet, setSheet] = useState<SheetView | null>(null)
	// dymek postępu wyprawy przy obozie 🏕️ (tap otwiera/zamyka)
	const [showCamp, setShowCamp] = useState(false)
	const [reveal, setReveal] = useState<{
		id: BuildingId
		level: number
	} | null>(null)
	const [cheerNonce, setCheerNonce] = useState(0)
	// wieczór to zabawka (maks latarnie): przełącznik w komponencie, nigdy nie
	// persystowany i nigdy automatyczny
	const [evening, setEvening] = useState(false)

	// pomiar sceny → brama zamku w % sceny (środek + stopa): rozmiary działki
	// w px sprawiają, że brama WĘDRUJE w procentach z rozmiarem ekranu, a droga
	// Ścieżki ma trafiać w nią wszędzie. Callback ref, nie useEffect — scena
	// potrafi zamontować się PÓŹNIEJ (pusty stan → pierwszy potworek), a
	// callback łapie każdy montaż.
	const [scene, setScene] = useState({ w: 1024, h: 700 })
	const sceneObserver = useRef<ResizeObserver | null>(null)
	const sceneRef = useCallback((el: HTMLDivElement | null) => {
		sceneObserver.current?.disconnect()
		sceneObserver.current = null
		if (!el) return
		const update = () => {
			if (el.clientWidth && el.clientHeight)
				setScene({ w: el.clientWidth, h: el.clientHeight })
		}
		update()
		const ro = new ResizeObserver(update)
		ro.observe(el)
		sceneObserver.current = ro
	}, [])
	const plots = useMemo(() => layoutPlots(scene.w, scene.h), [scene])
	const greenery = useMemo(
		() => layoutGreenery(plots, scene.w),
		[plots, scene.w],
	)
	// brama zamku w % sceny: środek działki + stopa; +8 px zakładki chowa
	// początek drogi POD artem zamku (budynki mają wyższy z-index)
	const gate = {
		x: ((plots.zamek.left + plots.zamek.width / 2) / scene.w) * 100,
		y: GROUND_Y - ((plots.zamek.dy + 8) / scene.h) * 100,
	}

	// Skład wioski liczy CZYSTA `villageRoster` (src/game/village.ts — tam żyją
	// reguły i ich testy); ekran dokłada tylko to, co jest jego: które działki
	// mają mieszkańca (pozycje) i parametry animacji wędrówki. Całość w JEDNYM
	// useMemo — memo(WanderingMonster) widzi te same referencje, więc
	// przełączniki UI (evening/sheet/showCamp) nie rekonsyliują ~26 drzew SVG.
	// Deps = dokładnie te wycinki store, które łańcuch czyta (stabilne).
	const { ownedIds, ownedCount, activeSpots, residentIds, wanderers } =
		useMemo(() => {
			const activeSpots = RESIDENT_SPOTS.filter(
				([id]) => buildingLevel(village, id) >= 1,
			)
			const { ownedIds, residentIds, wanderIds } = villageRoster(
				ownedMonsters,
				village,
				{
					travelerId: expedition?.monsterId ?? null,
					companionId,
					residentSpots: activeSpots.length,
				},
			)
			return {
				ownedIds,
				ownedCount: ownedIds.length,
				activeSpots,
				residentIds,
				wanderers: wanderIds.map((id, i) => ({
					id,
					params: wanderParams(id, i),
				})),
			}
		}, [ownedMonsters, village, expedition, companionId])

	const ogrodek = buildingLevel(village, "ogrodek")
	const latarnie = buildingLevel(village, "latarnie")
	const fontanna = buildingLevel(village, "fontanna")
	// noc = wieczorna zabawka aktywna; słońce znika dokładnie wtedy, gdy
	// nakładka z księżycem wchodzi (nigdy oba naraz)
	const night = evening && latarnie >= MAX_BUILDING_LEVEL
	const flowerPalette = FLOWER_PALETTE[ogrodek] ?? FLOWER_PALETTE[1]
	const has = (id: DecorationId) => village.decorations.includes(id)
	const goal = currentGoal(village)
	// obóz wyprawy: postęp x/y rund + imię podróżnika (dymek po tapnięciu)
	const camp = expedition ? expeditionProgress(expedition, totalRounds) : null
	const travelerName = expedition
		? MONSTERS[expedition.monsterId]?.name
		: undefined
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

	// zakup kosmetyki: małe confetti (podpowiedź garderoby pokazuje arkusz)
	const handleBuyCosmetic = (id: CosmeticId) => {
		buyCosmetic(id)
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
		<div className="flex min-h-[var(--app-vh)] flex-col gap-3 p-4">
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
						<GoalProgressBar
							goal={goal}
							iskierki={iskierki}
							goalId={village.goalId}
							prefix="Cel: "
						/>
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
				// przebijają arkusza budowy (z-40) ani pełnoekranowych revealów (z-50).
				// `max-w-5xl mx-auto`: na szerokim laptopie scena jest wyśrodkowaną
				// dioramą, nie rozciągniętym pustkowiem z malutkimi budynkami.
				<div
					ref={sceneRef}
					className="isolate relative mx-auto w-full max-w-5xl flex-1 overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#5eb0f3_0%,#97cff9_16%,#d3ecfc_28%,#fff0d4_36%,#dcefe3_44%)] ring-4 ring-white/40"
				>
					{/* niebo: gradient na kontenerze (błękit → jasny, ciepły
					    horyzont pod górami) + wektorowe słońce, ptaki i chmury —
					    słońce chowa się na wieczór (księżyc przejmuje jego miejsce
					    w nakładce wieczoru; nigdy oba naraz) */}
					{!night && (
						<span className="pointer-events-none absolute left-[3%] top-[2%]">
							<SunArt />
						</span>
					)}
					<span
						className="pointer-events-none absolute left-[60%] top-[12%]"
						style={{ width: "clamp(40px, 6%, 70px)" }}
					>
						<BirdsArt />
					</span>
					{CLOUDS.map((c) => (
						<span
							key={c.left}
							className="anim-cloud-drift pointer-events-none absolute"
							style={{
								left: c.left,
								top: c.top,
								width: c.width,
								opacity: c.opacity,
								animationDuration: c.dur ?? undefined,
								animationDelay: c.delay ?? undefined,
							}}
						>
							<CloudArt />
						</span>
					))}
					{/* tęcza POD terenem (z-1 < z-2): kotwiczona DOŁEM w paśmie gór
					    (bottom 74% = dół łuku na 26% wysokości sceny; szczyty gór sięgają
					    ~16–28%), więc nogi wyrastają zza gór, a łuk jest cały widoczny */}
					{has("tecza") && (
						<span
							className="pointer-events-none absolute bottom-[74%] left-[56%] z-[1] opacity-80"
							style={{ width: "clamp(170px, 30%, 320px)" }}
						>
							<RainbowArc />
						</span>
					)}

					{/* teren: warstwowe wzgórza + łąka + droga (dekoracja „Ścieżka") */}
					<div className="pointer-events-none absolute inset-0 z-[2]">
						<Terrain />
						<MeadowTexture />
						{has("sciezka") && <RoadArt gateX={gate.x} gateY={gate.y} />}
					</div>

					{/* efekty sceny (zakupy zmieniają całą scenę, nie tylko działkę) */}
					<div className="pointer-events-none absolute inset-0 z-[5]">
						{/* kępki trawy — stały wypełniacz łąki */}
						{GRASS_TUFTS.map((t) => (
							<span
								key={`${t.l}-${t.b}`}
								className="absolute"
								style={{ left: `${t.l}%`, bottom: `${t.b}%`, width: 22 }}
							>
								<GrassTuft />
							</span>
						))}
						{/* ścieżka: płaskie kamienie na osi drogi (droga w Terrain) */}
						{has("sciezka") &&
							STEPPING_STONES.map((p) => (
								<span
									key={p.b}
									className="absolute -translate-x-1/2 rounded-full bg-[#f4e4b4] shadow-sm"
									style={{
										left: `${roadXAt(100 - p.b, gate.x, gate.y)}%`,
										bottom: `${p.b}%`,
										width: p.w,
										height: p.w * 0.42,
									}}
								/>
							))}
						{/* kwiaty ogródka na łące */}
						{FLOWER_SPOTS.slice(0, ogrodek * 3).map((f) => (
							<span
								key={`${f.l}-${f.b}`}
								className="absolute block"
								style={{ left: `${f.l}%`, bottom: `${f.b}%`, width: 22 }}
							>
								<FlowerArt kind={flowerPalette?.[f.e] ?? "daisy"} />
							</span>
						))}
						{ogrodek >= 2 && (
							<>
								<span
									className="anim-float absolute block"
									style={{ left: "36%", bottom: "36%", width: 22 }}
								>
									<ButterflyArt />
								</span>
								<span
									className="anim-float absolute block"
									style={{
										left: "70%",
										bottom: "30%",
										width: 18,
										animationDelay: "1.2s",
									}}
								>
									<ButterflyArt color="#9b7cf6" />
								</span>
							</>
						)}
						{ogrodek >= 3 && (
							<span
								className="anim-sparkle absolute block"
								style={{ left: "45%", bottom: "8%", width: 18 }}
							>
								<SparkleArt />
							</span>
						)}
						{/* dekoracje jednorazowe */}
						{has("kwiatki") && (
							<span
								className="absolute flex items-end gap-0.5"
								style={{ left: "58%", bottom: "4%" }}
							>
								<span className="block w-5">
									<FlowerArt kind="daisy" />
								</span>
								<span className="block w-6">
									<FlowerArt kind="tulip" color="#ff8fb0" />
								</span>
								<span className="block w-5">
									<FlowerArt kind="daisy" />
								</span>
							</span>
						)}
						{has("staw") && (
							<span
								className="absolute block"
								style={{
									left: "3%",
									bottom: "2%",
									width: "clamp(110px, 15%, 170px)",
								}}
							>
								<PondArt />
								<span className="anim-swim absolute left-[26%] top-[8%] block w-[22%]">
									<DuckArt />
								</span>
							</span>
						)}
						{has("hustawka") && (
							<span
								className="absolute block"
								style={{
									left: "70%",
									bottom: "15%",
									width: "clamp(52px, 8%, 92px)",
								}}
							>
								<TreeArt variant="spring" swing />
							</span>
						)}
						{has("pomnik") && firstHatchedId !== undefined && (
							<span
								className="absolute flex flex-col items-center"
								style={{ left: "26%", bottom: "8%" }}
							>
								<MonsterSvg id={firstHatchedId} size={38} animate={false} />
								<span className="-mt-1 block w-14">
									<PedestalArt />
								</span>
							</span>
						)}
					</div>

					{/* pas budynków: kontener o zerowej wysokości NA linii wzgórz —
					    każdy budynek kotwiczy stopę do gruntu (bottom: dy) */}
					<div
						className="pointer-events-none absolute inset-x-0 z-20"
						style={{ top: GROUND_LINE_TOP }}
					>
						{/* zieleń w lukach działek: te same kotwice co budynki (stopa
						    przez bottom: dy), więc drzewa STOJĄ na zboczu, nie pływają */}
						{greenery.map((g, i) => (
							<span
								key={`${g.kind}-${i}`}
								aria-hidden="true"
								className="absolute block"
								style={{
									left: g.left,
									bottom: g.dy,
									width: g.width,
									zIndex: g.z,
								}}
							>
								{g.kind === "tree" ? (
									<TreeArt variant={g.variant} />
								) : (
									<BushArt />
								)}
							</span>
						))}
						{BUILDINGS.map((b) => {
							const level = buildingLevel(village, b.id)
							const plot = plots[b.id]
							const cost = nextLevelCost(village, b.id)
							return (
								<button
									key={b.id}
									type="button"
									onClick={() => openPlot(b.id)}
									aria-label={`${b.name}${level === 0 ? " (do zbudowania)" : ""}`}
									className="pointer-events-auto absolute flex min-h-16 min-w-16 touch-manipulation flex-col items-center active:scale-95"
									style={{
										left: plot.left,
										bottom: plot.dy,
										width: plot.width,
										zIndex: plot.z,
									}}
								>
									{/* podest działki pod stopą artu: wydeptany placyk + cień
									    kontaktowy — budynek stoi NA łące, nie jest wklejony */}
									<PlotGround>
										<BuildingArt
											id={b.id}
											level={Math.max(1, level)}
											size="100%"
											silhouette={level === 0}
										/>
									</PlotGround>
									{/* Fontanna Marzeń: odbicie wymarzonego potworka w wodzie
									    (dolna ćwiartka artu = basen) */}
									{b.id === "fontanna" &&
										fontanna >= MAX_BUILDING_LEVEL &&
										dreamMonsterId !== null && (
											<span
												className="pointer-events-none absolute left-1/2 opacity-30"
												style={{
													bottom: "12%",
													width: "26%",
													transform: "translateX(-50%) scaleY(-1)",
												}}
											>
												<MonsterSvg
													id={dreamMonsterId}
													size="100%"
													animate={false}
													className="monster-silhouette"
												/>
											</span>
										)}
									{level === 0 && cost !== null && (
										<span
											className={`-mt-2 rounded-full px-2.5 py-0.5 text-sm font-extrabold shadow ${
												iskierki >= cost
													? "bg-gradient-to-r from-amber-300 to-orange-400 text-white"
													: "bg-white/90 text-slate-500"
											}`}
										>
											✨{cost}
										</span>
									)}
								</button>
							)
						})}
					</div>

					{/* mieszkańcy przy budynkach */}
					{activeSpots.slice(0, residentIds.length).map(([bid, spot], i) => {
						const id = residentIds[i]
						if (id === undefined) return null
						const plot = plots[bid]
						// stoi przed budynkiem, tuż pod jego stopą (tył rzędu = na zboczu)
						const cx = plot.left + plot.width / 2 + spot.dx * plot.width - 27
						return (
							<Resident
								key={id}
								id={id}
								leftPct={(cx / scene.w) * 100}
								bottomPct={100 - GROUND_Y + ((plot.dy - 46) / scene.h) * 100}
								mode={spot.mode}
								cheerNonce={cheerNonce}
							/>
						)
					})}

					{/* wędrowcy */}
					{wanderers.map(({ id, params }, i) => (
						<WanderingMonster
							key={id}
							id={id}
							params={params}
							isCompanion={id === companionId}
							cheerNonce={i < 3 ? cheerNonce : 0}
						/>
					))}

					{/* 🏕️ obóz wyprawy (WYMAGANY, gdy ktoś jest w drodze): namiot +
					    mini-sylwetka podróżnika na stałym skraju łąki — dziecko zawsze
					    wie, GDZIE jest jej potworek; tap → dymek z postępem x/y rund */}
					{expedition && camp && (
						<div
							className="absolute z-[15]"
							style={{ right: "2%", bottom: "2%" }}
						>
							{showCamp && (
								<div className="absolute bottom-full right-0 w-max pb-1">
									{/* dymek postępu wyprawy */}
									<SpeechBubble
										text={`🎒 ${travelerName}: ${camp.done}/${camp.total} rund`}
									/>
								</div>
							)}
							<button
								type="button"
								onClick={() => setShowCamp((v) => !v)}
								aria-label={`${travelerName} jest na wyprawie — pokaż postęp`}
								className="flex min-h-16 min-w-16 touch-manipulation flex-col items-center active:scale-95"
							>
								<span className="block w-14 drop-shadow">
									<TentArt />
								</span>
								<MonsterSvg
									id={expedition.monsterId}
									size={36}
									animate={false}
									className="monster-silhouette opacity-80"
								/>
							</button>
						</div>
					)}

					{/* wieczór (zabawka maks latarni): przygasza scenę, latarnie świecą */}
					{night && (
						<div className="pointer-events-none absolute inset-0 z-[120] bg-gradient-to-b from-indigo-950/70 via-indigo-900/40 to-indigo-950/25">
							{/* księżyc w miejscu słońca (podmiana, nie duet) */}
							<span className="absolute left-[4%] top-[3%]">
								<MoonArt />
							</span>
							{NIGHT_STARS.map((star) => (
								<span
									key={star.l}
									className={`anim-sparkle absolute ${star.s} text-white`}
									style={{ left: star.l, top: star.t, animationDelay: star.d }}
								>
									✦
								</span>
							))}
						</div>
					)}

					{/* winieta: miękki cień przy krawędziach — scena jest dioramą,
					    nie płaskim wypełnieniem; nad wszystkim prócz nakładki wieczoru */}
					<div className="pointer-events-none absolute inset-0 z-[110] rounded-3xl shadow-[inset_0_0_48px_rgba(30,58,42,0.16)]" />

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
					cosmetics={cosmetics}
					iskierki={iskierki}
					onClose={() => setSheet(null)}
					onShowList={() => setSheet({ kind: "list" })}
					onOpenBuilding={(id) => setSheet({ kind: "building", id })}
					onBuild={handleBuild}
					onBuyDecoration={handleBuyDecoration}
					onSetGoal={setVillageGoal}
					onBuyCosmetic={handleBuyCosmetic}
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
