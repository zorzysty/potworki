import { FIRST_MONSTER_ID, IDS_BY_RARITY, MONSTERS } from "../monsters/catalog"
import type { SaveState } from "../store/schema"
import {
	INITIAL_SAVE,
	migrateSave,
	SAVE_KEYS,
	SAVE_VERSION,
} from "../store/schema"
import { emptyStats, reachedGoal, stageFacts } from "./adaptive"
import { grantMonster } from "./collection"
import { COSMETICS } from "./cosmetics"
import { EXPEDITIONS_BY_ID, type ExpeditionDef } from "./expeditions"
import type { Fact, FactKey, GameMode, RoundQuestion } from "./facts"
import {
	ALL_FACTS,
	budgetMs,
	divisorPairs,
	expectedAnswer,
	FACTS_BY_KEY,
	MODE_UNLOCK_STAGE,
	pairBudgetMs,
	QUESTIONS_PER_ROUND,
	STAGES,
	unlockedFacts,
} from "./facts"
import { ISKIERKI_CAP } from "./rewards"
import {
	advance,
	feedAnswer,
	newRound,
	type Rand,
	type RoundStep,
	submitAnswer,
	submitFeed,
	submitPair,
} from "./round"
import type { VillageState } from "./village"
import { BUILDINGS, DECORATIONS, MAX_BUILDING_LEVEL } from "./village"

// Rozkłada sumę gwiazdek na n pytań (każde 0..3): jak najwięcej trójek (szybkie
// odpowiedzi → większy przyrost mastery), reszta wolniej. Dla debug-symulacji rundy.
export function distributeStars(total: number, n: number): number[] {
	const q = new Array<number>(n).fill(3)
	let excess = n * 3 - total
	for (let i = 0; i < n && excess > 0; i++) {
		const cut = Math.min(3, excess)
		q[i] = 3 - cut
		excess -= cut
	}
	return q
}

// Czas odpowiedzi dający dokładnie `stars` gwiazdek (progi ze starsFor).
const ELAPSED_FACTOR = [3, 2, 1.25, 0] as const

// Debug: gra pełną rundę QUESTIONS_PER_ROUND poprawnych odpowiedzi kończącą się
// sumą `totalStars` — TYMI SAMYMI funkcjami co prawdziwa gra (game/round.ts), więc
// nie ma czego lustrzyć. `firstQuestion` = aktualnie wyświetlane pytanie (ekran
// rundy). Zwraca skumulowany patch zapisu i rundę w fazie summary.
export function simulateRound(
	save: SaveState,
	mode: GameMode,
	totalStars: number,
	rand: Rand,
	now: number,
	firstQuestion?: RoundQuestion,
): RoundStep {
	let round = newRound(save, mode, rand, now)
	if (firstQuestion) round = { ...round, question: firstQuestion }
	let cur: SaveState = save
	const patch: Partial<SaveState> = {}
	const apply = (step: RoundStep | null) => {
		if (!step) throw new Error("simulateRound: nieoczekiwana faza rundy")
		Object.assign(patch, step.patch)
		cur = { ...cur, ...step.patch }
		round = step.round
	}
	const perQuestion = distributeStars(totalStars, QUESTIONS_PER_ROUND)
	for (let i = 0; round.phase !== "summary"; i++) {
		const fact = FACTS_BY_KEY.get(round.question.key)
		if (!fact)
			throw new Error(`simulateRound: nieznany fakt ${round.question.key}`)
		const factor = ELAPSED_FACTOR[perQuestion[i] ?? 0] ?? 3
		if (mode === "feed") {
			const rival = FACTS_BY_KEY.get(round.question.rival?.key ?? fact.key)
			const budget = budgetMs(fact) + budgetMs(rival ?? fact)
			apply(
				submitFeed(
					cur,
					round,
					feedAnswer(round.question),
					rand,
					round.startedAt + budget * factor,
				),
			)
		} else if (mode === "pairs") {
			// tryb par: stukamy kolejne pary celu; czas skalowany do sumy budżetów
			const targets = divisorPairs(round.question.a, cur.unlockedStage)
			const budget = targets.reduce((sum, f) => sum + pairBudgetMs(f), 0)
			const at = round.startedAt + budget * factor
			for (const t of targets) apply(submitPair(cur, round, t.a, t.b, rand, at))
		} else {
			const elapsed = budgetMs(fact) * factor
			const answer = String(expectedAnswer(round.question, mode))
			apply(
				submitAnswer(
					cur,
					{ ...round, answer },
					rand,
					round.startedAt + elapsed,
				),
			)
		}
		apply(advance(cur, round, rand, now))
	}
	return { patch, round }
}

// --- Panel debug: czyste patche zapisu (store nakłada je przez debugPatch) ---

export type Facts = SaveState["facts"]

// Ustawia mastery wskazanych działań (attempts ≥ 1, żeby bramy je „widziały").
export function withMastery(
	facts: Facts,
	keys: Iterable<FactKey>,
	value: number,
	now: number,
): Facts {
	const next = { ...facts }
	for (const key of keys) {
		const prev = next[key] ?? emptyStats()
		next[key] = {
			...prev,
			mastery: value,
			mastered: reachedGoal(prev, value),
			attempts: Math.max(1, prev.attempts),
			lastSeen: now,
		}
	}
	return next
}

// Kolejna wartość po stuknięciu komórki siatki mastery: 0 → 0,5 → 0,85 → 1 → 0.
export const MASTERY_STEPS = [0, 0.5, 0.85, 1] as const
export function nextMasteryStep(current: number): number {
	const i = MASTERY_STEPS.findIndex((s) => current < s - 0.001)
	return MASTERY_STEPS[i === -1 ? 0 : i] ?? 0
}

export function withOwned(
	owned: SaveState["ownedMonsters"],
	ids: Iterable<number>,
	own: boolean,
	now: number,
): SaveState["ownedMonsters"] {
	const next = { ...owned }
	for (const id of ids) {
		if (own) next[id] ??= { hatchedAt: now }
		else delete next[id]
	}
	return next
}

export const FULL_VILLAGE: VillageState = {
	buildings: Object.fromEntries(
		BUILDINGS.map((b) => [b.id, MAX_BUILDING_LEVEL]),
	) as VillageState["buildings"],
	decorations: DECORATIONS.map((d) => d.id),
	goalId: null,
}

const keysOf = (facts: readonly Fact[]): FactKey[] => facts.map((f) => f.key)

// Skok do etapu: brama otwarta i uczczona, starsze tabliczki opanowane, a
// najnowsza dopiero zaczęta (0,4, bez flagi `mastered` — dlatego dwa rozłączne
// zbiory, nie nadpisanie 0,9 → 0,4) — jedna symulowana runda NIE otwiera od
// razu kolejnej bramy.
function atStage(stage: number, now: number): Partial<SaveState> {
	const older = stage > 0 ? keysOf(unlockedFacts(stage - 1)) : []
	return {
		unlockedStage: stage,
		celebratedStage: stage,
		facts: withMastery(
			withMastery({}, older, 0.9, now),
			keysOf(stageFacts(stage)),
			0.4,
			now,
		),
	}
}

// Tylko pola SaveState ze stanu store (scenariusze i eksport nie mogą nieść
// `screen`/`round`/akcji).
export function saveOf(state: SaveState): SaveState {
	return Object.fromEntries(
		SAVE_KEYS.map((k) => [k, state[k]]),
	) as unknown as SaveState
}

// Posiadanie z panelu: dodanie przez `grantMonster` (jedyna reguła przyjęcia —
// zwalnia slot wymarzonego), odebranie zeruje wskaźniki na potworka, którego już
// nie ma (przyjaciel, wyprawa) — zapis zostaje spójny jak w prawdziwej grze.
export function ownPatch(
	save: SaveState,
	ids: Iterable<number>,
	own: boolean,
	now: number,
): Partial<SaveState> {
	let ownedMonsters = save.ownedMonsters
	let dreamMonsterId = save.dreamMonsterId
	if (own) {
		for (const id of ids) {
			if (id in ownedMonsters) continue
			;({ ownedMonsters, dreamMonsterId } = grantMonster(
				{ ownedMonsters, dreamMonsterId },
				id,
				now,
			))
		}
	} else ownedMonsters = withOwned(ownedMonsters, ids, false, now)
	return {
		ownedMonsters,
		dreamMonsterId,
		companionId:
			save.companionId !== null && save.companionId in ownedMonsters
				? save.companionId
				: null,
		expedition:
			save.expedition && save.expedition.monsterId in ownedMonsters
				? save.expedition
				: null,
	}
}

export interface Scenario {
	id: string
	title: string
	hint: string
	apply: (save: SaveState, rand: Rand, now: number) => Partial<SaveState>
}

// Scenariusze nadpisują CAŁY zapis (start od INITIAL_SAVE) — jeden tap = znany stan.
export const SCENARIOS: readonly Scenario[] = [
	{
		id: "fresh",
		title: "🌱 Świeży start",
		hint: "zerowy zapis",
		apply: () => ({ ...INITIAL_SAVE }),
	},
	{
		id: "first-round",
		title: "🐣 Po pierwszej rundzie",
		hint: "1 runda, fragmenty w banku",
		apply: (_s, rand, now) => ({
			...INITIAL_SAVE,
			...simulateRound(INITIAL_SAVE, "mult", 26, rand, now).patch,
		}),
	},
	{
		id: "before-gate",
		title: "🚪 Tuż przed bramą",
		hint: "etap 0, mastery 0,62 — jedna dobra runda otwiera",
		apply: (_s, _r, now) => ({
			...INITIAL_SAVE,
			facts: withMastery({}, keysOf(unlockedFacts(0)), 0.62, now),
			ownedMonsters: withOwned({}, [FIRST_MONSTER_ID], true, now),
		}),
	},
	{
		id: "gate-pairs",
		title: "= Brama 2: Dzielniki",
		hint: "etap 2, tryb par świeżo odblokowany",
		apply: (_s, _r, now) => ({
			...INITIAL_SAVE,
			...atStage(MODE_UNLOCK_STAGE.pairs, now),
			totalRounds: 12,
			ownedMonsters: withOwned({}, IDS_BY_RARITY.common.slice(0, 6), true, now),
		}),
	},
	{
		id: "gate-feed",
		title: "> Brama 4: Porównywanie",
		hint: "etap 4, drugi tryb-zabawa",
		apply: (_s, _r, now) => ({
			...INITIAL_SAVE,
			...atStage(MODE_UNLOCK_STAGE.feed, now),
			totalRounds: 30,
			iskierki: 60,
			ownedMonsters: withOwned({}, IDS_BY_RARITY.common, true, now),
		}),
	},
	{
		id: "max-stage",
		title: "🏰 Ostatnia brama",
		hint: "etap 6, starsze tabliczki opanowane, ×8 dopiero zaczęta",
		apply: (_s, _r, now) => ({
			...INITIAL_SAVE,
			...atStage(STAGES.length - 1, now),
			totalRounds: 60,
			iskierki: 120,
			ownedMonsters: withOwned(
				{},
				[...IDS_BY_RARITY.common, ...IDS_BY_RARITY.rare],
				true,
				now,
			),
		}),
	},
	{
		id: "rich",
		title: "💰 Bogacz",
		hint: "999 ✨, każdy budynek na 1 (Zwiad otwarty)",
		apply: (save) => ({
			...save,
			iskierki: ISKIERKI_CAP,
			village: {
				buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, 1])),
				decorations: [],
				goalId: null,
			},
		}),
	},
	{
		id: "near-complete",
		title: "🧸 Prawie komplet",
		hint: "wszystkie nielegendarne + fontanna — brama Jajka Życzeń",
		apply: (save, _r, now) => ({
			...save,
			...ownPatch(
				{ ...save, ownedMonsters: {} },
				[...IDS_BY_RARITY.common, ...IDS_BY_RARITY.rare, ...IDS_BY_RARITY.epic],
				true,
				now,
			),
			iskierki: ISKIERKI_CAP,
			village: {
				...save.village,
				buildings: { ...save.village.buildings, fontanna: 2 },
			},
		}),
	},
	{
		id: "expedition-back",
		title: "🎒 Wyprawa wraca",
		hint: "Wielka Wyprawa, jedna runda do powrotu",
		apply: (save, _r, now) => {
			const ownedMonsters = withOwned(
				save.ownedMonsters,
				[FIRST_MONSTER_ID, 1],
				true,
				now,
			)
			const monsterId = save.companionId === 1 ? FIRST_MONSTER_ID : 1
			const def = EXPEDITIONS_BY_ID.get("wielka") as ExpeditionDef
			return {
				...save,
				ownedMonsters,
				village: {
					...save.village,
					buildings: {
						...save.village.buildings,
						"plac-zabaw": def.requiredPlacZabaw,
					},
				},
				expedition: {
					monsterId,
					typeId: def.id,
					roundsAtStart: save.totalRounds - (def.durationRounds - 1),
				},
			}
		},
	},
	{
		id: "everything",
		title: "👑 Wszystko",
		hint: "komplet 88, pełna wioska i garderoba, etap 6, 999 ✨",
		apply: (_s, _r, now) => ({
			...INITIAL_SAVE,
			...atStage(STAGES.length - 1, now),
			facts: withMastery(
				{},
				ALL_FACTS.map((f) => f.key),
				1,
				now,
			),
			totalRounds: 150,
			iskierki: ISKIERKI_CAP,
			ownedMonsters: withOwned(
				{},
				MONSTERS.map((m) => m.id),
				true,
				now,
			),
			village: FULL_VILLAGE,
			cosmetics: { owned: COSMETICS.map((c) => c.id), equipped: {} },
		}),
	},
]

// Import zapisu z JSON-a: akceptuje surowy SaveState (traktowany jako bieżąca
// wersja) albo opakowanie zustand persist `{ state, version }` — wtedy przechodzi
// przez migracje jak przy starcie gry; bierze tylko klucze SaveState. null =
// nieparsowalne.
export function parseSaveJson(text: string): Partial<SaveState> | null {
	try {
		const raw = JSON.parse(text) as Record<string, unknown>
		const wrapped = raw?.state && typeof raw.state === "object"
		const src = migrateSave(
			wrapped ? raw.state : raw,
			wrapped && typeof raw.version === "number" ? raw.version : SAVE_VERSION,
		) as Record<string, unknown>
		const patch: Record<string, unknown> = {}
		for (const key of SAVE_KEYS) if (key in src) patch[key] = src[key]
		return Object.keys(patch).length ? (patch as Partial<SaveState>) : null
	} catch {
		return null
	}
}
