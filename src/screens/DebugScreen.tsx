import { Fragment, type ReactNode, useState } from "react"
import { ACHIEVEMENTS } from "../achievements/catalog"
import { MODE_LABELS } from "../components/modeLabels"
import { RARITY_META } from "../components/rarity"
import { stageFacts, stageProgress, visitStage } from "../game/adaptive"
import { byRecency, ownedCount } from "../game/collection"
import { COSMETICS } from "../game/cosmetics"
import {
	FULL_VILLAGE,
	MASTERY_STEPS,
	nextMasteryStep,
	ownPatch,
	parseSaveJson,
	SCENARIOS,
	saveOf,
	withMastery,
} from "../game/debug"
import { EXPEDITIONS, expeditionProgress } from "../game/expeditions"
import type { FactKey, GameMode } from "../game/facts"
import {
	ALL_FACTS,
	factKey,
	fragmentsForEgg,
	isMaxStage,
	MODE_UNLOCK_STAGE,
	modeUnlocked,
	STAGES,
	unlockedFactors,
} from "../game/facts"
import type { EggQuality } from "../game/rewards"
import {
	INITIAL_LEGENDARY_PITY,
	ISKIERKI_CAP,
	LEGENDARY_PITY_EVERY,
	QUALITY_ORDER,
	RARITY_ORDER,
	WISH_MODE,
} from "../game/rewards"
import {
	BUILDINGS,
	buildingLevel,
	DECORATIONS,
	INITIAL_VILLAGE,
	MAX_BUILDING_LEVEL,
} from "../game/village"
import {
	DIVISION_ONLY_IDS,
	FEED_ONLY_IDS,
	GAP_ONLY_IDS,
	IDS_BY_RARITY,
	MONSTER_COUNT,
	MONSTERS,
	PAIRS_ONLY_IDS,
} from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { INITIAL_SAVE, SAVE_VERSION } from "../store/schema"
import { type Screen, useGame } from "../store/store"

// Panel deweloperski (?debug): każdy etap gry w ≤2 tapnięcia. Scenariusze
// nadpisują zapis jednym tapem, sekcje niżej strojenie ręczne. Wszystkie
// zmiany idą przez czyste patche (game/debug.ts) i store.debugPatch.
// Świadomie natywna <textarea> (import/eksport zapisu) — to narzędzie
// deweloperskie na laptopie, nie ekran dziecka.

const BTN =
	"touch-manipulation inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700 shadow-[inset_0_-2px_0_#e2e8f0] active:scale-95 disabled:opacity-40"
const BTN_ON =
	"touch-manipulation inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-b from-grape to-grape-dark px-3 text-sm font-bold text-white shadow-[inset_0_-2px_0_#4c37a3] active:scale-95"
const BTN_GO =
	"touch-manipulation inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-xl bg-violet-100 px-3 text-sm font-bold text-grape-dark shadow-[inset_0_-2px_0_#ddd6fe] active:scale-95"
const BTN_WARN =
	"touch-manipulation inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-xl bg-red-100 px-3 text-sm font-bold text-red-700 shadow-[inset_0_-2px_0_#fecaca] active:scale-95"

const MODES = Object.keys(MODE_LABELS) as GameMode[]
const SCREENS: [Screen, string][] = [
	["home", "🏡 Home"],
	["hatch", "🥚 Wyklucie"],
	["collection", "📒 Kolekcja"],
	["achievements", "🏆 Osiągnięcia"],
	["map", "🗺️ Mapa"],
	["village", "🏘️ Wioska"],
]
const EGG_LABEL: Record<EggQuality | "wish", string> = {
	normal: "zwykłe",
	silver: "srebrne",
	gold: "złote",
	rainbow: "🌈 tęczowe",
	wish: "życzeń",
}
const EXCLUSIVE: [string, ReadonlySet<number>][] = [
	["÷", DIVISION_ONLY_IDS],
	["🧩", GAP_ONLY_IDS],
	["=", PAIRS_ONLY_IDS],
	[">", FEED_ONLY_IDS],
]
const BUILDING_NOTE: Partial<Record<string, string>> = {
	"plac-zabaw": "brama wypraw",
	fontanna: "Jajko Życzeń",
	sklepik: "tier kosmetyki",
}

function Card({
	title,
	hint,
	children,
	className = "",
}: {
	title: string
	hint?: string
	children: ReactNode
	className?: string
}) {
	return (
		<section
			className={`flex flex-col gap-2.5 rounded-3xl border-violet-200 border-b-4 bg-white px-4 py-3.5 shadow-md ${className}`}
		>
			<h2 className="flex items-baseline gap-2 font-extrabold text-grape-dark text-sm uppercase tracking-wide">
				{title}
				{hint && (
					<span className="font-semibold text-slate-400 text-xs normal-case tracking-normal">
						{hint}
					</span>
				)}
			</h2>
			{children}
		</section>
	)
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{label && (
				<span className="min-w-[76px] font-bold text-slate-500 text-xs">
					{label}
				</span>
			)}
			{children}
		</div>
	)
}

function Chip({
	icon,
	label,
	value,
}: {
	icon: string
	label?: string
	value: ReactNode
}) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 font-extrabold text-slate-700 text-sm">
			{icon}
			{label && <span className="font-semibold text-slate-400">{label}</span>}
			{value}
		</span>
	)
}

function Stepper({
	value,
	max,
	onChange,
}: {
	value: number
	max: number
	onChange: (v: number) => void
}) {
	return (
		<span className="inline-flex items-center gap-1">
			<button
				type="button"
				className={`${BTN} min-w-9 px-2`}
				disabled={value <= 0}
				onClick={() => onChange(value - 1)}
			>
				−
			</button>
			<span className="min-w-[30px] text-center font-extrabold">{value}</span>
			<button
				type="button"
				className={`${BTN} min-w-9 px-2`}
				disabled={value >= max}
				onClick={() => onChange(value + 1)}
			>
				+
			</button>
		</span>
	)
}

const masteryClass = (m: number | undefined) =>
	m === undefined
		? "bg-slate-100 text-slate-300"
		: m >= 0.85
			? "bg-green-500 text-white"
			: m >= 0.65
				? "bg-green-300"
				: m >= 0.5
					? "bg-amber-400"
					: "bg-amber-200"

export function DebugScreen() {
	const save = useGame((s) => s)
	const {
		facts,
		iskierki,
		unlockedStage,
		celebratedStage,
		totalRounds,
		eggsEarned,
		eggFragments,
		pendingEggs,
		legendaryPity,
		village,
		ownedMonsters,
		expedition,
		achievements,
		companionId,
		dreamMonsterId,
		mode,
		setMode,
		goTo,
		startRound,
		startVisitRound,
		debugSimulateRound,
		debugPatch,
		debugReset,
		recallExpedition,
	} = save
	const [times, setTimes] = useState(1)
	const [json, setJson] = useState("")
	const now = Date.now()
	const threshold = fragmentsForEgg(eggsEarned)
	const unlocked = unlockedFactors(unlockedStage)
	const owned = ownedCount(ownedMonsters)
	const progress = Math.round(stageProgress(facts, unlockedStage) * 100)
	const visited = visitStage(facts, unlockedStage)
	const unlockedAch = Object.keys(achievements).length
	const unclaimed = Object.values(achievements).filter((a) => !a.claimed).length
	const traveller = expedition && MONSTERS[expedition.monsterId]
	const candidate = byRecency(ownedMonsters).find((id) => id !== companionId)

	const patchFacts = (keys: FactKey[], value: number) =>
		debugPatch({ facts: withMastery(facts, keys, value, now) })
	const own = (ids: Iterable<number>, on: boolean) =>
		debugPatch(ownPatch(save, ids, on, now))
	const patchVillage = (v: Partial<typeof village>) =>
		debugPatch({ village: { ...village, ...v } })
	const setBuilding = (id: string, level: number) =>
		patchVillage({ buildings: { ...village.buildings, [id]: level } })
	const exportJson = () => {
		const text = JSON.stringify({ state: saveOf(save), version: SAVE_VERSION })
		setJson(text)
		navigator.clipboard?.writeText(text).catch(() => {})
	}
	const importJson = () => {
		const patch = parseSaveJson(json)
		if (!patch) {
			window.alert("Nie da się sparsować JSON-a zapisu")
			return
		}
		debugPatch(patch)
	}

	return (
		<div className="flex min-h-[var(--app-vh)] select-text flex-col gap-4 p-4 pb-10 text-slate-800">
			<header className="flex flex-wrap items-center gap-3">
				<button type="button" onClick={() => goTo("home")} className={BTN_GO}>
					← Home
				</button>
				<h1 className="font-extrabold text-2xl text-grape-dark">Panel debug</h1>
				<div className="ml-auto flex flex-wrap gap-1.5">
					<Chip
						icon="🚪"
						label="etap"
						value={`${unlockedStage}/${STAGES.length - 1}`}
					/>
					<Chip icon="🔁" label="rundy" value={totalRounds} />
					<Chip icon="✨" value={`${iskierki}/${ISKIERKI_CAP}`} />
					<Chip icon="🥚" label="gniazdo" value={pendingEggs.length} />
					<Chip
						icon="🧩"
						label="fragmenty"
						value={`${eggFragments}/${threshold}`}
					/>
					<Chip icon="👾" value={`${owned}/${MONSTER_COUNT}`} />
					<Chip
						icon="🎯"
						label="pity"
						value={MODES.map(
							(m) => `${MODE_LABELS[m][0]}${legendaryPity[m]}`,
						).join(" ")}
					/>
					{traveller && expedition && (
						<Chip
							icon="🎒"
							value={`${traveller.name} ${expeditionProgress(expedition, totalRounds).done}/${expeditionProgress(expedition, totalRounds).total}`}
						/>
					)}
				</div>
			</header>

			<Card title="Nawigacja" className="!py-2.5">
				<Row label="Idź do">
					{SCREENS.map(([screen, label]) => (
						<button
							key={screen}
							type="button"
							className={BTN_GO}
							onClick={() => goTo(screen)}
						>
							{label}
						</button>
					))}
				</Row>
				<Row label="Tryb">
					{MODES.map((m) => {
						const open = modeUnlocked(m, unlockedStage)
						return (
							<button
								key={m}
								type="button"
								className={m === mode ? BTN_ON : BTN}
								disabled={!open}
								onClick={() => setMode(m)}
							>
								{MODE_LABELS[m]}
								{!open && ` 🔒${MODE_UNLOCK_STAGE[m]}`}
							</button>
						)
					})}
				</Row>
			</Card>

			<Card
				title="Scenariusze"
				hint="jeden tap = gotowy stan gry (nadpisuje zapis)"
			>
				<div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
					{SCENARIOS.map((sc) => (
						<button
							key={sc.id}
							type="button"
							className="touch-manipulation flex flex-col items-start rounded-2xl border-2 border-violet-100 bg-violet-50 px-3 py-2 text-left active:scale-95"
							onClick={() =>
								debugPatch(sc.apply(saveOf(save), Math.random, Date.now()))
							}
						>
							<b className="text-sm">{sc.title}</b>
							<span className="font-semibold text-slate-500 text-xs">
								{sc.hint}
							</span>
						</button>
					))}
				</div>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card title="Runda" hint={`tryb: ${MODE_LABELS[mode]}`}>
					<Row label="Zagraj">
						<button type="button" className={BTN_ON} onClick={startRound}>
							▶ Start rundy
						</button>
						<button
							type="button"
							className={BTN}
							disabled={visited === null}
							onClick={startVisitRound}
						>
							🏡 Runda-wizyta
							{visited === null ? " (brak zaproszenia)" : ` (etap ${visited})`}
						</button>
					</Row>
					<Row label="Zaproszenie">
						{unlockedStage === 0 ? (
							<span className="font-bold text-slate-500 text-xs">
								wizyty od etapu 1 — otwórz bramę
							</span>
						) : (
							Array.from({ length: unlockedStage }, (_, s) => (
								<button
									key={s}
									type="button"
									className={visited === s ? BTN_ON : BTN}
									onClick={() =>
										// odwiedzana = najsłabsza starsza tabliczka, a wizyta
										// odpala się, gdy średnia WSZYSTKICH starszych < progu
										// utrzymania: wybrany etap 0,1, pozostałe starsze 0,5
										debugPatch({
											facts: withMastery(
												withMastery(
													facts,
													Array.from({ length: unlockedStage }, (_, i) => i)
														.filter((i) => i !== s)
														.flatMap((i) => stageFacts(i).map((f) => f.key)),
													0.5,
													now,
												),
												stageFacts(s).map((f) => f.key),
												0.1,
												now,
											),
										})
									}
								>
									osłab etap {s}
								</button>
							))
						)}
					</Row>
					<Row label="Symuluj">
						{[20, 24, 28, 30].map((stars) => (
							<button
								key={stars}
								type="button"
								className={BTN}
								onClick={() => debugSimulateRound(stars, times)}
							>
								+{stars} ⭐
							</button>
						))}
						<span className="font-bold text-slate-500 text-xs">×</span>
						{[1, 5, 10].map((n) => (
							<button
								key={n}
								type="button"
								className={`${n === times ? BTN_ON : BTN} min-w-9 px-2`}
								onClick={() => setTimes(n)}
							>
								{n}
							</button>
						))}
					</Row>
					<Row label="Etap">
						<Stepper
							value={unlockedStage}
							max={STAGES.length - 1}
							onChange={(v) =>
								debugPatch({
									unlockedStage: v,
									celebratedStage: Math.min(celebratedStage, v),
								})
							}
						/>
						<button
							type="button"
							className={BTN}
							disabled={celebratedStage >= unlockedStage}
							onClick={() => debugPatch({ celebratedStage: unlockedStage })}
						>
							uczczony: {celebratedStage}
							{celebratedStage < unlockedStage && " → animacja na mapie"}
						</button>
						<span className="font-bold text-slate-500 text-xs">
							postęp bramy {isMaxStage(unlockedStage) ? "—" : `${progress} %`}
						</span>
					</Row>
				</Card>

				<Card title="Ekonomia">
					<Row label="Iskierki">
						{[-10, 10, 100].map((d) => (
							<button
								key={d}
								type="button"
								className={BTN}
								onClick={() =>
									debugPatch({
										iskierki: Math.max(0, Math.min(ISKIERKI_CAP, iskierki + d)),
									})
								}
							>
								{d > 0 ? `+${d}` : d}
							</button>
						))}
						<button
							type="button"
							className={BTN}
							onClick={() => debugPatch({ iskierki: 0 })}
						>
							= 0
						</button>
						<button
							type="button"
							className={BTN}
							onClick={() => debugPatch({ iskierki: ISKIERKI_CAP })}
						>
							= {ISKIERKI_CAP}
						</button>
					</Row>
					<Row label="+ Jajko">
						{[...QUALITY_ORDER, "wish" as const].map((q) => (
							<button
								key={q}
								type="button"
								className={BTN}
								onClick={() =>
									debugPatch({
										// Jajko Życzeń zawsze z puli mnożeniowej — jak buyWishEgg
										pendingEggs: [
											...pendingEggs,
											{ quality: q, mode: q === "wish" ? WISH_MODE : mode },
										],
									})
								}
							>
								{EGG_LABEL[q]}
							</button>
						))}
						<button
							type="button"
							className={BTN_WARN}
							disabled={pendingEggs.length === 0}
							onClick={() => debugPatch({ pendingEggs: [] })}
						>
							wyczyść gniazdo
						</button>
					</Row>
					<Row label="Fragmenty">
						<button
							type="button"
							className={BTN}
							onClick={() =>
								debugPatch({
									eggFragments: threshold - 1,
									eggStarBank: Math.max(save.eggStarBank, (threshold - 1) * 2),
								})
							}
						>
							próg − 1
						</button>
						<button
							type="button"
							className={BTN}
							onClick={() => debugPatch({ eggStarBank: eggFragments * 3 })}
						>
							bank 3★
						</button>
						<button
							type="button"
							className={BTN}
							onClick={() => debugPatch({ eggFragments: 0, eggStarBank: 0 })}
						>
							= 0
						</button>
					</Row>
					<Row label="Pity">
						<button
							type="button"
							className={BTN}
							onClick={() =>
								debugPatch({
									legendaryPity: {
										...legendaryPity,
										[mode]: LEGENDARY_PITY_EVERY - 1,
									},
								})
							}
						>
							tryb: {LEGENDARY_PITY_EVERY - 1}/{LEGENDARY_PITY_EVERY}
						</button>
						<button
							type="button"
							className={BTN}
							onClick={() =>
								debugPatch({
									legendaryPity: Object.fromEntries(
										MODES.map((m) => [m, LEGENDARY_PITY_EVERY - 1]),
									) as typeof legendaryPity,
								})
							}
						>
							wszystkie {LEGENDARY_PITY_EVERY - 1}/{LEGENDARY_PITY_EVERY}
						</button>
						<button
							type="button"
							className={BTN}
							onClick={() =>
								debugPatch({ legendaryPity: INITIAL_LEGENDARY_PITY })
							}
						>
							= 0
						</button>
					</Row>
				</Card>

				<Card
					title="Mastery"
					hint="tap w komórkę: 0 → 0,5 → 0,85 → 1; tap w nagłówek: cała tabliczka"
				>
					<div className="grid grid-cols-11 gap-[3px]">
						<div />
						{ALL_TABLES.map((n) => (
							<button
								key={n}
								type="button"
								className="h-7 rounded-md font-extrabold text-slate-500 text-xs active:scale-95"
								onClick={() =>
									patchFacts(
										ALL_FACTS.filter((f) => f.a === n || f.b === n).map(
											(f) => f.key,
										),
										nextMasteryStep(facts[factKey(n, n)]?.mastery ?? 0),
									)
								}
							>
								{n}
							</button>
						))}
						{ALL_TABLES.map((a) => (
							<Fragment key={a}>
								<div className="flex h-7 items-center justify-center font-extrabold text-slate-500 text-xs">
									{a}
								</div>
								{ALL_TABLES.map((b) => {
									const key = factKey(a, b)
									const m = facts[key]?.mastery
									const locked = !unlocked.has(a) || !unlocked.has(b)
									return (
										<button
											key={b}
											type="button"
											className={`h-7 rounded-md text-[11px] font-bold active:scale-95 ${locked ? "opacity-40" : ""} ${masteryClass(m)}`}
											onClick={() => patchFacts([key], nextMasteryStep(m ?? 0))}
										>
											{m === undefined ? "—" : m.toFixed(2).slice(1)}
										</button>
									)
								})}
							</Fragment>
						))}
					</div>
					<Row label="Wszystkie">
						{MASTERY_STEPS.map((v) => (
							<button
								key={v}
								type="button"
								className={BTN}
								onClick={() =>
									patchFacts(
										ALL_FACTS.map((f) => f.key),
										v,
									)
								}
							>
								= {v}
							</button>
						))}
						<button
							type="button"
							className={BTN_WARN}
							onClick={() => debugPatch({ facts: {} })}
						>
							wyczyść statystyki
						</button>
					</Row>
				</Card>

				<Card title="Wioska">
					{BUILDINGS.map((b) => (
						<div
							key={b.id}
							className="flex items-center justify-between gap-2 border-slate-100 border-t py-1 font-bold text-sm first:border-t-0"
						>
							<span>
								{b.name}
								{BUILDING_NOTE[b.id] && (
									<span className="ml-1 font-semibold text-slate-400">
										({BUILDING_NOTE[b.id]})
									</span>
								)}
							</span>
							<Stepper
								value={buildingLevel(village, b.id)}
								max={MAX_BUILDING_LEVEL}
								onChange={(v) => setBuilding(b.id, v)}
							/>
						</div>
					))}
					<Row label="Dekoracje">
						{DECORATIONS.map((d) => {
							const has = village.decorations.includes(d.id)
							return (
								<button
									key={d.id}
									type="button"
									className={has ? BTN_ON : BTN}
									onClick={() =>
										patchVillage({
											decorations: has
												? village.decorations.filter((x) => x !== d.id)
												: [...village.decorations, d.id],
										})
									}
								>
									{d.name}
								</button>
							)
						})}
					</Row>
					<Row>
						<button
							type="button"
							className={BTN}
							onClick={() => debugPatch({ village: FULL_VILLAGE })}
						>
							zbuduj wszystko
						</button>
						<button
							type="button"
							className={BTN_WARN}
							onClick={() => debugPatch({ village: INITIAL_VILLAGE })}
						>
							wyburz
						</button>
						<button
							type="button"
							className={BTN}
							onClick={() =>
								debugPatch({
									cosmetics: {
										...save.cosmetics,
										owned: COSMETICS.map((c) => c.id),
									},
								})
							}
						>
							cała garderoba ({save.cosmetics.owned.length}/{COSMETICS.length})
						</button>
					</Row>
				</Card>

				<Card title="Wyprawa">
					{traveller && expedition ? (
						<Row>
							<span className="font-bold text-sm">
								W drodze: {traveller.name} · {expedition.typeId} ·{" "}
								{expeditionProgress(expedition, totalRounds).done}/
								{expeditionProgress(expedition, totalRounds).total} rund
							</span>
							<button
								type="button"
								className={BTN}
								onClick={() => {
									const { total } = expeditionProgress(expedition, totalRounds)
									debugPatch({
										expedition: {
											...expedition,
											roundsAtStart: totalRounds - (total - 1),
										},
									})
								}}
							>
								do powrotu − 1
							</button>
							<button
								type="button"
								className={BTN_WARN}
								onClick={recallExpedition}
							>
								zawróć
							</button>
						</Row>
					) : (
						<Row label="Wyślij">
							{EXPEDITIONS.map((e) => (
								<button
									key={e.id}
									type="button"
									className={BTN}
									disabled={candidate === undefined}
									onClick={() =>
										candidate !== undefined &&
										debugPatch({
											expedition: {
												monsterId: candidate,
												typeId: e.id,
												roundsAtStart: totalRounds,
											},
										})
									}
								>
									{e.name} ({e.durationRounds})
								</button>
							))}
							<span className="font-bold text-slate-500 text-xs">
								{candidate === undefined
									? "brak potworka do wysłania"
									: `wysyła: ${MONSTERS[candidate]?.name} (bez bramy Placu Zabaw)`}
							</span>
						</Row>
					)}
					<Row label="Rundy">
						<button
							type="button"
							className={BTN}
							onClick={() => debugSimulateRound(26)}
						>
							+1 runda (cicho)
						</button>
					</Row>
				</Card>

				<Card
					title="Osiągnięcia"
					hint={`${unlockedAch}/${ACHIEVEMENTS.length} zdobytych, ${unclaimed} do odbioru`}
				>
					<Row>
						<button
							type="button"
							className={BTN}
							onClick={() =>
								debugPatch({
									achievements: Object.fromEntries(
										ACHIEVEMENTS.map((a) => [
											a.id,
											achievements[a.id] ?? { unlockedAt: now, claimed: false },
										]),
									),
								})
							}
						>
							odblokuj wszystkie
						</button>
						<button
							type="button"
							className={BTN}
							onClick={() =>
								debugPatch({
									achievements: Object.fromEntries(
										Object.entries(achievements).map(([id, a]) => [
											id,
											{ ...a, claimed: true },
										]),
									),
								})
							}
						>
							oznacz odebrane
						</button>
						<button
							type="button"
							className={BTN_WARN}
							onClick={() =>
								debugPatch({
									achievements: {},
									achievementStats: INITIAL_SAVE.achievementStats,
								})
							}
						>
							wyzeruj
						</button>
					</Row>
					<h2 className="mt-1 font-extrabold text-grape-dark text-sm uppercase tracking-wide">
						Zapis
					</h2>
					<Row>
						<button type="button" className={BTN} onClick={exportJson}>
							📋 kopiuj JSON
						</button>
						<button
							type="button"
							className={BTN}
							disabled={!json}
							onClick={importJson}
						>
							📥 wczytaj JSON
						</button>
						<button
							type="button"
							className={BTN_WARN}
							onClick={() => {
								if (window.confirm("Na pewno skasować cały zapis?"))
									debugReset()
							}}
						>
							RESET zapisu
						</button>
					</Row>
					<textarea
						value={json}
						onChange={(e) => setJson(e.target.value)}
						spellCheck={false}
						placeholder="wklej tu JSON zapisu (surowy SaveState albo {state, version})"
						className="h-20 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-600"
					/>
				</Card>
			</div>

			<Card
				title="Kolekcja"
				hint={`${owned}/${MONSTER_COUNT} · tap = posiadany/nie · ♥ przyjaciel (posiadany) · ☆ wymarzony (nieposiadany)`}
			>
				<Row>
					{RARITY_ORDER.map((r) => (
						<button
							key={r}
							type="button"
							className={BTN}
							onClick={() => own(IDS_BY_RARITY[r], true)}
						>
							{RARITY_META[r].label.toLowerCase()}
						</button>
					))}
					<button
						type="button"
						className={BTN}
						onClick={() =>
							own(
								[
									...IDS_BY_RARITY.common,
									...IDS_BY_RARITY.rare,
									...IDS_BY_RARITY.epic,
								],
								true,
							)
						}
					>
						nielegendarne
					</button>
					<button
						type="button"
						className={BTN}
						onClick={() =>
							own(
								MONSTERS.map((m) => m.id),
								true,
							)
						}
					>
						wszystkie
					</button>
					<button
						type="button"
						className={BTN_WARN}
						onClick={() =>
							debugPatch({
								ownedMonsters: {},
								companionId: null,
								dreamMonsterId: null,
								expedition: null,
							})
						}
					>
						wyczyść
					</button>
					<span className="ml-2 font-bold text-slate-500 text-xs">
						ekskluzywne:
					</span>
					{EXCLUSIVE.map(([label, ids]) => (
						<button
							key={label}
							type="button"
							className={BTN}
							onClick={() => own(ids, true)}
						>
							{label}
						</button>
					))}
				</Row>
				<div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11">
					{MONSTERS.map((m) => {
						const has = m.id in ownedMonsters
						return (
							<div
								key={m.id}
								className={`flex flex-col items-center rounded-xl border-2 bg-white/75 p-1 ${RARITY_META[m.rarity].border} ${has ? "" : "opacity-60"}`}
							>
								<button
									type="button"
									className="w-full touch-manipulation active:scale-95"
									onClick={() => own([m.id], !has)}
								>
									<div className={has ? "" : "monster-silhouette"}>
										<MonsterSvg id={m.id} size="100%" animate={false} />
									</div>
									<div className="truncate text-[10px] font-bold">
										#{m.id} {m.name}
									</div>
								</button>
								{has ? (
									<button
										type="button"
										className={`rounded px-1 text-xs ${companionId === m.id ? "bg-bubblegum text-white" : "text-slate-300"}`}
										onClick={() =>
											debugPatch({
												companionId: companionId === m.id ? null : m.id,
											})
										}
									>
										♥
									</button>
								) : (
									<button
										type="button"
										className={`rounded px-1 text-xs ${dreamMonsterId === m.id ? "bg-sunny text-slate-800" : "text-slate-300"}`}
										onClick={() =>
											debugPatch({
												dreamMonsterId: dreamMonsterId === m.id ? null : m.id,
											})
										}
									>
										☆
									</button>
								)}
							</div>
						)
					})}
				</div>
			</Card>
		</div>
	)
}

const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
