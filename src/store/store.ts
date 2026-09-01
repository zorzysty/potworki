import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { ACHIEVEMENTS, REWARD_BY_DIFFICULTY } from "../achievements/catalog"
import { evaluateAchievements } from "../achievements/evaluate"
import {
	applyAnswer,
	decayStats,
	emptyStats,
	introRoundPlan,
	isIntroRound,
	newlyUnlockedFactor,
	pickNextFact,
	shouldUnlockNextStage,
	VISIT_BONUS,
	visitRoundPlan,
	visitStage,
} from "../game/adaptive"
import type { CosmeticId, CosmeticSlot } from "../game/cosmetics"
import { COSMETICS_BY_ID, isOwned, sklepikLevel } from "../game/cosmetics"
import { simulateRoundOutcome } from "../game/debug"
import type { ExpeditionTypeId } from "../game/expeditions"
import {
	EXPEDITIONS_BY_ID,
	expeditionUnlocked,
	isExpeditionDone,
	resolveExpedition,
} from "../game/expeditions"
import type { Fact, FactKey, GameMode, RoundQuestion } from "../game/facts"

export type { RoundQuestion } from "../game/facts"

import {
	expectedAnswer,
	FACTS_BY_KEY,
	isMaxStage,
	MAX_QUESTIONS_PER_ROUND,
	MAX_STARS_PER_ROUND,
	makeQuestion,
	QUESTIONS_PER_ROUND,
	starsFor,
} from "../game/facts"
import type { EggQuality, Rarity } from "../game/rewards"
import {
	addEggFragment,
	dupIskierki,
	ISKIERKI_CAP,
	rollMonsterWithPity,
	rollWish,
	WISH_COST,
	WISH_COST_NO_DREAM,
	WISH_MODE,
	wishEggPrice,
} from "../game/rewards"
import { dayStamp } from "../game/time"
import type { BuildingId, DecorationId } from "../game/village"
import {
	BUILDINGS,
	buildingLevel,
	DECORATIONS,
	MAX_BUILDING_LEVEL,
	nextLevelCost,
	roundWage,
	wishEggDiscount,
	wishEggUnlocked,
} from "../game/village"
import {
	FIRST_MONSTER_ID,
	IDS_BY_RARITY,
	idsByRarityForMode,
	isDivisionOnly,
	isGapOnly,
	MONSTERS,
	rarityOf,
} from "../monsters/catalog"
import type { AchievementCounters, SaveState } from "./schema"
import { INITIAL_SAVE, migrateSave, SAVE_KEYS, SAVE_VERSION } from "./schema"

export type Screen =
	| "home"
	| "round"
	| "hatch"
	| "collection"
	| "achievements"
	| "map"
	| "village"
	| "debug"
export type RoundPhase = "answering" | "correct" | "wrong" | "summary"

export interface RoundState {
	mode: GameMode
	// czynnik świeżo odblokowany w tej rundzie (pierwsza runda po bramie) — featurowany
	// w połowie pytań; w dzieleniu wymusza go na pozycji dzielnika. null = zwykła runda.
	introFactor: number | null
	// gdy ustawiony: ułożony plan działań pytań bazowych intro-rundy (5 nowych + 5 starych),
	// konsumowany pozycyjnie (planPos); powtórki po błędzie nie ruszają planu.
	plan: FactKey[] | null
	planPos: number
	index: number
	total: number
	question: RoundQuestion
	phase: RoundPhase
	answer: string
	stars: number
	lastStars: number
	startedAt: number
	asked: FactKey[]
	requeues: Record<number, FactKey>
	shakeNonce: number
	eggsCreated: number[] // indeksy w pendingEggs utworzone w tej rundzie (kolor jajka jest finalny już od utworzenia)
	unlockedThisRound: boolean
	wageEarned: number // żołd przyznany przy finalizacji (faza summary); 0 do końca rundy
	// PAUZA („Przerwa ⏸"): siedzi na rundzie, nie obok niej — ginie razem z nią,
	// więc nie da się jej przenieść na następną rundę (żadne zerowanie w akcjach
	// nawigacji). Wycisza wejście u źródła: guardy w pressDigit/pressBackspace/
	// pressConfirm. Nakładka RoundScreen zasłania tylko keypad, a globalny
	// `keydown` w App.tsx żyje obok niej — bez guardu wpisywałby cyfry, a
	// auto-submit zatwierdzałby odpowiedzi (błędna połowi mastery: kara za
	// przerwę, wprost przeciw zasadzie roota „nigdy nie karze").
	paused: boolean
	// runda-wizyta u Strażnika: etap odwiedzanej (najsłabszej starszej) tabliczki —
	// wybiera region/Strażnika i włącza podziękowanie (+VISIT_BONUS ✨) przy finalizacji.
	// Efemeryczne (RoundState nie jest persystowany). null = zwykła runda.
	visitStage: number | null
	// powrót z wyprawy rozstrzygnięty przy finalizacji TEJ rundy (karta w
	// podsumowaniu): nagroda już doliczona do iskierek; trop = wskazówka o
	// nieposiadanym potworku (null gdy brak). Efemeryczne jak wageEarned —
	// bez migracji. null = nikt nie wrócił w tej rundzie.
	expeditionReturn: {
		monsterId: number
		rewardIskierki: number
		tropMonsterId: number | null
	} | null
}

export interface HatchResult {
	monsterId: number
	isNew: boolean
	isDream: boolean
	iskierkiGained: number
}

interface GameState extends SaveState {
	screen: Screen
	round: RoundState | null
	lastHatch: HatchResult | null
	mode: GameMode // efemeryczny przełącznik mnożenie/dzielenie (Home), reset do "mult"
	achievementQueue: string[] // efemeryczna kolejka id osiągnięć do pokazania jako toast „zdobyte!"
	// efemeryczne: czy w tej sesji odwiedzono wioskę — gasi badge „stać cię!" na Home
	// do końca sesji (badge nie może stać się tapetą, gdy dochód przegoni wydatki)
	villageVisited: boolean

	goTo: (screen: Screen) => void
	setPaused: (paused: boolean) => void
	setMode: (mode: GameMode) => void
	startRound: () => void
	startVisitRound: () => void
	pressDigit: (digit: number) => void
	pressBackspace: () => void
	pressConfirm: () => void
	nextQuestion: () => void
	exitRoundEarly: () => void
	hatchEgg: (index?: number) => void
	clearLastHatch: () => void
	setDreamMonster: (id: number | null) => void
	setCompanion: (id: number | null) => void
	sendExpedition: (monsterId: number, typeId: ExpeditionTypeId) => void
	recallExpedition: () => void
	buyWishEgg: () => void
	buildVillage: (id: BuildingId) => void
	buyDecoration: (id: DecorationId) => void
	setVillageGoal: (id: BuildingId | null) => void
	buyCosmetic: (id: CosmeticId) => void
	equipCosmetic: (
		monsterId: number,
		slot: CosmeticSlot,
		id: CosmeticId | null,
	) => void
	applyDecay: () => void
	markGatesCelebrated: () => void
	checkAchievements: () => void
	claimAchievement: (id: string) => void
	reconcileAchievements: () => void
	shiftAchievementToast: () => void

	debugSetAllMastery: (value: number) => void
	debugSimulateRound: (totalStars: number) => void
	debugFinishRound: (totalStars: number) => void
	debugOwnRarity: (rarity: Rarity) => void
	debugAddIskierki: (amount: number) => void
	debugAddEgg: (quality: EggQuality) => void
	debugOpenGate: () => void
	debugBuildAll: () => void
	debugReset: () => void
}

// Znacznik dnia mieszka w czystym src/game/time.ts (żołd i debug-symulacja go
// potrzebują bez cyklu importów); re-eksport dla dotychczasowych konsumentów.
export { dayStamp } from "../game/time"

// Podbija licznik dni gry przy PIERWSZEJ ukończonej rundzie danego dnia (kumulacyjnie,
// nie streak — przerwa nie zeruje). Wołane wszędzie tam, gdzie rośnie totalRounds.
function bumpDaysPlayed(
	stats: AchievementCounters,
	now: number,
): AchievementCounters {
	const today = dayStamp(now)
	if (stats.lastPlayedDay === today) return stats
	return { ...stats, daysPlayed: stats.daysPlayed + 1, lastPlayedDay: today }
}

// Pula tropu z wyprawy: WSZYSTKIE id katalogu (wskazówka może dotyczyć każdego
// nieposiadanego — także ekskluzywnych trybów, bo wymarzonym może być każdy).
const ALL_MONSTER_IDS: readonly number[] = MONSTERS.map((m) => m.id)

// Rozstrzygnięcie powrotu wyprawy przy finalizacji rundy (totalRounds+1 =
// właśnie ukończona runda); matematyka w src/game/expeditions.ts. Gdy nikt nie
// wraca — stan wyprawy bez zmian, reward 0. Wspólne dla nextQuestion i ścieżek
// debug (debugFinishRound płaci i pokazuje kartę powrotu; debugSimulateRound
// płaci po cichu — nie ma rundy, więc nie ma expeditionReturn).
function settleExpedition(state: SaveState): {
	expedition: SaveState["expedition"]
	expeditionReturn: RoundState["expeditionReturn"]
	reward: number
} {
	const e = state.expedition
	if (!e || !isExpeditionDone(e, state.totalRounds + 1)) {
		return { expedition: e, expeditionReturn: null, reward: 0 }
	}
	const r = resolveExpedition(
		e,
		new Set(Object.keys(state.ownedMonsters).map(Number)),
		ALL_MONSTER_IDS,
		Math.random,
	)
	return {
		expedition: null,
		expeditionReturn: { monsterId: e.monsterId, ...r },
		reward: r.rewardIskierki,
	}
}

// Liczniki zdarzeniowe podbijane o DELTĘ (lastPlayedDay nie jest liczbą i ma
// własny mechanizm — bumpDaysPlayed).
type CounterDeltas = Partial<
	Record<
		{
			[K in keyof AchievementCounters]: AchievementCounters[K] extends number
				? K
				: never
		}[keyof AchievementCounters],
		number
	>
>

// Wspólne domknięcie rundy dla trzech ścieżek finalizacji (nextQuestion /
// debugFinishRound / debugSimulateRound): rozstrzygnięta wyprawa, JEDEN
// wspólny cap portfela, totalRounds, liczniki dni i wypraw. Rozmyślne RÓŻNICE
// ścieżek (bonus wizyty, totalStars/perfectRounds, visitRoundsCompleted —
// tylko realna gra) wchodzą przez argumenty, więc są widoczne w miejscu
// wywołania. `counterDeltas` to PRZYROSTY (ile dołożyć), nie wartości: ścieżki
// nie muszą znać bazy, a delta na liczniku, który helper podbija sam (wyprawy),
// SUMUJE się zamiast go po cichu nadpisać. Nowe źródło dochodu lub licznik
// końca rundy przechodzi TĘDY — nigdy przez edycję jednej ścieżki.
function roundClosePatch(
	state: Pick<SaveState, "totalRounds" | "achievementStats">,
	settled: ReturnType<typeof settleExpedition>,
	// pełny dochód rundy PRZED capem (bez nagrody wyprawy — tę dolicza helper)
	iskierkiBeforeCap: number,
	counterDeltas: CounterDeltas,
	now: number,
) {
	const stats = { ...state.achievementStats }
	const deltas: CounterDeltas = {
		...counterDeltas,
		expeditionsCompleted:
			(counterDeltas.expeditionsCompleted ?? 0) +
			(settled.expeditionReturn !== null ? 1 : 0),
	}
	for (const [key, delta] of Object.entries(deltas) as [
		keyof CounterDeltas,
		number,
	][]) {
		stats[key] = stats[key] + delta
	}
	return {
		iskierki: Math.min(ISKIERKI_CAP, iskierkiBeforeCap + settled.reward),
		totalRounds: state.totalRounds + 1,
		expedition: settled.expedition,
		achievementStats: bumpDaysPlayed(stats, now),
	}
}

// Pula losowania potworków zależna od trybu jajka (idsByRarityForMode w
// src/monsters/). Wymarzony ma priorytet tylko, gdy jest w puli trybu jajka —
// potworek ekskluzywny innego trybu nie może się wykluć „na życzenie" z cudzego
// jajka (pickInTier nie sprawdza sam przynależności dreamu do puli).
function rollContext(state: SaveState, mode: GameMode) {
	const idsByRarity = idsByRarityForMode(mode)
	const dreamId =
		state.dreamMonsterId !== null &&
		idsByRarity[rarityOf(state.dreamMonsterId)].includes(state.dreamMonsterId)
			? state.dreamMonsterId
			: null
	return {
		idsByRarity,
		owned: new Set(Object.keys(state.ownedMonsters).map(Number)),
		dreamId,
		rarityOf,
		rand: Math.random,
	}
}

const WISH_POOL: readonly number[] = Object.values(
	idsByRarityForMode(WISH_MODE),
).flat()

// Czy Jajko Życzeń ma jeszcze kogo wykluć (pula mnożeniowa domyka się przed
// kompletem katalogu) — jedyne źródło prawdy dla guardu kupna i przycisku w UI.
export function wishEggAvailable(
	ownedMonsters: SaveState["ownedMonsters"],
): boolean {
	return WISH_POOL.some((id) => !(id in ownedMonsters))
}

// Cena Jajka Życzeń = baza (wg wymarzonego) + progresja za już kupione.
// Licznik `wishEggsBought` żyje w `achievementStats` i znaczy dokładnie „ile
// jajek życzeń kupiono" — używamy go zamiast dokładać bliźniacze pole do
// zapisu (zero zmian kształtu `SaveState`, zero migracji). Skutek uboczny jest
// zamierzony: kto już kupował, płaci od razu wyższą stawkę.
export function wishEggCost(
	state: Pick<
		SaveState,
		"dreamMonsterId" | "ownedMonsters" | "achievementStats" | "village"
	>,
): number {
	const dream = state.dreamMonsterId
	// jajko życzeń losuje z puli mnożeniowej → wymarzony ekskluzywny dla innego
	// trybu (tylko-dzielenie / tylko-luka) go nie dotyczy (zdobywa się go realną
	// grą w swoim trybie), więc liczymy jak bez dreamu
	const base =
		dream === null ||
		dream in state.ownedMonsters ||
		isDivisionOnly(dream) ||
		isGapOnly(dream)
			? WISH_COST_NO_DREAM
			: WISH_COST[rarityOf(dream)]
	// zniżka fontanny (studnia życzeń) schodzi z ceny końcowej; podłogę
	// WISH_PRICE_FLOOR egzekwuje samo wishEggPrice (rewards.ts)
	return wishEggPrice(
		base,
		state.achievementStats.wishEggsBought,
		wishEggDiscount(state.village),
	)
}

// localStorage opakowany w try/catch (tryb prywatny Safari rzuca na setItem);
// uszkodzony JSON traktowany jak brak zapisu
function safeStorage(): Storage {
	const memory = new Map<string, string>()
	return {
		getItem: (key: string) => {
			try {
				const raw = localStorage.getItem(key)
				if (raw !== null) JSON.parse(raw)
				return raw
			} catch {
				return memory.get(key) ?? null
			}
		},
		setItem: (key: string, value: string) => {
			try {
				localStorage.setItem(key, value)
			} catch {
				memory.set(key, value)
			}
		},
		removeItem: (key: string) => {
			try {
				localStorage.removeItem(key)
			} catch {
				memory.delete(key)
			}
		},
		clear: () => {},
		key: () => null,
		length: 0,
	}
}

// Domyślny merge zustand jest PŁYTKI: utrwalony `achievementStats` (cały obiekt)
// nadpisałby świeży z INITIAL_SAVE, więc zapis bez nowego licznika (np. ostemplowany
// nową SAVE_VERSION zanim doszła migracja — zdarza się przy dev-HMR) dałby `undefined`
// → NaN na pasku osiągnięcia. Deep-merge tego jednego zagnieżdżonego rekordu backfilluje
// braki z domyślnych liczników. Reszta pól (top-level) jak w domyślnym merge.
export function mergePersisted(
	persisted: unknown,
	current: GameState,
): GameState {
	const p = (persisted ?? {}) as Partial<GameState>
	// zagnieżdżone rekordy: zapis bez pola (po dev-HMR) nie może dać undefined.x
	const nested = <T extends object>(
		base: T,
		patch: Partial<T> | undefined,
	): T => ({ ...base, ...(patch ?? {}) }) as T
	return {
		...current,
		...p,
		achievementStats: nested(current.achievementStats, p.achievementStats),
		village: nested(current.village, p.village),
		cosmetics: nested(current.cosmetics, p.cosmetics),
		legendaryPity: nested(current.legendaryPity, p.legendaryPity),
	}
}

export const useGame = create<GameState>()(
	persist(
		(set, get) => ({
			...INITIAL_SAVE,
			screen: "home",
			round: null,
			lastHatch: null,
			mode: "mult",
			achievementQueue: [],
			villageVisited: false,

			// stan rundy żyje tylko na ekranie rundy; wejście do wioski gasi
			// sesyjny badge „stać cię!" na Home; wejście na osiągnięcia gasi toasty
			// (toast jest klikalny i prowadzi właśnie tu — reszta kolejki jest zbędna)
			goTo: (screen) =>
				set((s) => ({
					screen,
					round: screen === "round" ? s.round : null,
					villageVisited: s.villageVisited || screen === "village",
					achievementQueue: screen === "achievements" ? [] : s.achievementQueue,
				})),

			// pauza jest polem rundy, więc ginie razem z nią (patrz RoundState)
			setPaused: (paused) => {
				const { round } = get()
				if (round) set({ round: { ...round, paused } })
			},

			setMode: (mode) => set({ mode }),

			startRound: () => {
				const state = get()
				const mode = state.mode
				const stage = state.unlockedStage
				// pierwsza runda po odblokowaniu czynnika: ułóż plan 5 nowych + 5 starych
				// działań (mocne mieszanie), zamiast pozwolić nowej cyfrze zdominować pulę
				const intro = isIntroRound(state.facts, stage)
				const introFactor = intro ? newlyUnlockedFactor(stage) : null
				const plan = intro
					? introRoundPlan(
							state.facts,
							stage,
							QUESTIONS_PER_ROUND,
							Math.random,
						).map((f) => f.key)
					: null
				const firstFact =
					(plan?.[0] && FACTS_BY_KEY.get(plan[0])) ??
					pickNextFact(state.facts, stage, [], Math.random)
				set({
					screen: "round",
					round: {
						mode,
						paused: false,
						introFactor,
						plan,
						planPos: 1,
						index: 0,
						total: QUESTIONS_PER_ROUND,
						question: makeQuestion(
							firstFact,
							false,
							mode,
							introFactor,
							Math.random,
						),
						phase: "answering",
						answer: "",
						stars: 0,
						lastStars: 0,
						startedAt: Date.now(),
						asked: [],
						requeues: {},
						shakeNonce: 0,
						eggsCreated: [],
						unlockedThisRound: false,
						wageEarned: 0,
						visitStage: null,
						expeditionReturn: null,
					},
				})
			},

			// Runda-wizyta u Strażnika: powtórka starszych tabliczek opowiedziana jako
			// odwiedziny w krainie najsłabszej z nich. Mechanika identyczna ze zwykłą
			// rundą (mastery, gwiazdki, jajka, żołd); różnice: plan z visitRoundPlan
			// (połowa z odwiedzanej tabliczki, reszta ze starszych), tryb PRZYPIĘTY do
			// "mult" (zaproszenie mówi „tabliczka ×N", pytania muszą się zgadzać —
			// przełącznik Home zostaje nietknięty dla późniejszych zwykłych rund)
			// i podziękowanie Strażnika (+VISIT_BONUS ✨) przy finalizacji.
			startVisitRound: () => {
				const state = get()
				const stage = state.unlockedStage
				const visited = visitStage(state.facts, stage)
				// defensywnie: bez potrzeby utrzymania karta zaproszenia nie powinna
				// się renderować — wtedy zwykła runda
				if (visited === null) {
					get().startRound()
					return
				}
				const plan = visitRoundPlan(
					state.facts,
					visited,
					stage,
					QUESTIONS_PER_ROUND,
					Math.random,
				).map((f) => f.key)
				const firstFact = plan[0] ? FACTS_BY_KEY.get(plan[0]) : undefined
				if (!firstFact) {
					get().startRound()
					return
				}
				set({
					screen: "round",
					round: {
						mode: "mult",
						paused: false,
						introFactor: null,
						plan,
						planPos: 1,
						index: 0,
						total: QUESTIONS_PER_ROUND,
						question: makeQuestion(firstFact, false, "mult", null, Math.random),
						phase: "answering",
						answer: "",
						stars: 0,
						lastStars: 0,
						startedAt: Date.now(),
						asked: [],
						requeues: {},
						shakeNonce: 0,
						eggsCreated: [],
						unlockedThisRound: false,
						wageEarned: 0,
						visitStage: visited,
						expeditionReturn: null,
					},
				})
			},

			// Pauza wycisza wejście u ŹRÓDŁA: nakładka zasłania keypad, ale globalny
			// `keydown` w App.tsx jej nie widzi — bez tego guardu klawisz w trakcie
			// przerwy wpisywałby cyfrę i auto-submit zatwierdzałby odpowiedź.
			pressDigit: (digit) => {
				const { round } = get()
				if (!round || round.paused) return
				if (round.phase !== "answering" && round.phase !== "wrong") return
				if (round.answer.length >= 3) return
				const answer = round.answer + String(digit)
				set({ round: { ...round, answer } })
				// auto-submit: gdy wpisano tyle cyfr, ile ma oczekiwany wynik
				const digits = String(expectedAnswer(round.question, round.mode)).length
				if (answer.length >= digits) get().pressConfirm()
			},

			pressBackspace: () => {
				const { round } = get()
				if (!round || round.paused) return
				if (round.phase !== "answering" && round.phase !== "wrong") return
				set({ round: { ...round, answer: round.answer.slice(0, -1) } })
			},

			pressConfirm: () => {
				const state = get()
				const { round } = state
				if (!round || round.paused || round.answer === "") return
				const q = round.question
				const expected = expectedAnswer(q, round.mode)
				const correct = Number(round.answer) === expected

				if (round.phase === "wrong") {
					// przepisywanie poprawnego wyniku — czysty rytuał utrwalający
					if (correct) {
						set({
							round: {
								...round,
								phase: "correct",
								lastStars: 0,
								answer: round.answer,
							},
						})
					} else {
						set({
							round: { ...round, answer: "", shakeNonce: round.shakeNonce + 1 },
						})
					}
					return
				}
				if (round.phase !== "answering") return

				// pierwsza próba — commit statystyk i fragmentu od razu (zamknięcie
				// karty w środku rundy nie traci nauki)
				const now = Date.now()
				const elapsed = now - round.startedAt
				const fact = FACTS_BY_KEY.get(q.key)
				if (!fact) return
				const stats = state.facts[q.key] ?? emptyStats()
				const facts = {
					...state.facts,
					[q.key]: applyAnswer(stats, fact, correct, elapsed, now),
				}

				// błędne działanie (powtórka) daje maks. 1 gwiazdkę, nawet jeśli poprawka jest szybka
				const earned = correct ? starsFor(elapsed, fact) : 0
				const gained = q.isRequeue ? Math.min(1, earned) : earned
				const stars = round.stars + gained

				// liczniki osiągnięć: kariera gwiazdek rośnie zawsze (gained=0 nieszkodliwe),
				// poprawne pierwsze próby w dzieleniu i w luce liczymy osobno
				const achievementStats = {
					...state.achievementStats,
					totalStars: state.achievementStats.totalStars + gained,
					divCorrect:
						state.achievementStats.divCorrect +
						(correct && round.mode === "div" ? 1 : 0),
					gapCorrect:
						state.achievementStats.gapCorrect +
						(correct && round.mode === "gap" ? 1 : 0),
				}

				// fragment + gwiazdki niezależnie od wyniku — postęp nigdy nie przepada.
				// addEggFragment domyka jajko po przekroczeniu progu (finalny kolor z banku).
				const { bank, created } = addEggFragment(
					{
						eggFragments: state.eggFragments,
						eggStarBank: state.eggStarBank,
						eggsEarned: state.eggsEarned,
						iskierki: state.iskierki,
					},
					gained,
					round.mode,
					Math.random,
				)
				const { eggFragments, eggStarBank, eggsEarned, iskierki } = bank
				let pendingEggs = state.pendingEggs
				const eggsCreated = [...round.eggsCreated]
				if (created) {
					pendingEggs = [...pendingEggs, created]
					eggsCreated.push(pendingEggs.length - 1)
				}

				if (correct) {
					set({
						facts,
						eggFragments,
						eggStarBank,
						eggsEarned,
						pendingEggs,
						iskierki,
						achievementStats,
						round: {
							...round,
							phase: "correct",
							stars,
							lastStars: gained,
							eggsCreated,
						},
					})
				} else {
					// powtórka błędnego działania za 3 pytania (max 12 pytań w rundzie)
					const requeues = { ...round.requeues }
					let total = round.total
					if (!q.isRequeue && total < MAX_QUESTIONS_PER_ROUND) {
						const at = Math.min(round.index + 3, total)
						requeues[at] = q.key
						total++
					}
					set({
						facts,
						eggFragments,
						eggStarBank,
						eggsEarned,
						pendingEggs,
						iskierki,
						achievementStats,
						round: {
							...round,
							phase: "wrong",
							answer: "",
							stars,
							lastStars: 0,
							requeues,
							total,
							eggsCreated,
							shakeNonce: round.shakeNonce + 1,
						},
					})
				}
				get().checkAchievements()
			},

			nextQuestion: () => {
				const state = get()
				const { round } = state
				if (round?.phase !== "correct") return
				const asked = [...round.asked, round.question.key]
				const nextIndex = round.index + 1

				if (nextIndex >= round.total) {
					// koniec rundy: jajka mają już finalny kolor z chwili domknięcia
					// (eggStarBank), iskierka za tęczowe też już przyznana — zostaje
					// sprawdzenie odblokowania, policzenie rundy i żołd
					let unlockedStage = state.unlockedStage
					let unlockedThisRound = false
					if (
						!isMaxStage(unlockedStage) &&
						shouldUnlockNextStage(state.facts, unlockedStage)
					) {
						unlockedStage++
						unlockedThisRound = true
					}
					const now = Date.now()
					// PRZED bumpDaysPlayed — bump nadpisuje lastPlayedDay, a bonus dnia
					// liczy się względem stanu sprzed tej rundy
					const firstRoundToday =
						state.achievementStats.lastPlayedDay !== dayStamp(now)
					const wageEarned = roundWage(
						state.village,
						round.stars,
						firstRoundToday,
					)
					// podziękowanie Strażnika za rundę-wizytę — OSOBNO od żołdu
					// (wageEarned zostaje czystym żołdem; podsumowanie pokazuje bonus
					// własną linią). Ścieżki debug (debugFinishRound/debugSimulateRound)
					// omijają ten blok — świadomie nie płacą bonusu.
					const visitBonus = round.visitStage !== null ? VISIT_BONUS : 0
					// wyprawa wraca? (totalRounds+1 = właśnie ukończona runda) — PO
					// żołdzie; nagroda dolicza się do tej samej, RAZ capowanej sumy
					// co żołd i bonus wizyty (dwa niezależne źródła dochodu)
					const settled = settleExpedition(state)
					set({
						unlockedStage,
						...roundClosePatch(
							state,
							settled,
							state.iskierki + wageEarned + visitBonus,
							{
								perfectRounds: round.stars === MAX_STARS_PER_ROUND ? 1 : 0,
								// rundy-wizyty liczą się tylko na realnej ścieżce finalizacji
								// (ścieżki debug świadomie pomijają — jak bonus wizyty)
								visitRoundsCompleted: round.visitStage !== null ? 1 : 0,
							},
							now,
						),
						round: {
							...round,
							phase: "summary",
							asked,
							unlockedThisRound,
							wageEarned,
							expeditionReturn: settled.expeditionReturn,
						},
					})
					get().checkAchievements()
					return
				}

				const requeuedKey = round.requeues[nextIndex]
				const requeuedFact = requeuedKey
					? FACTS_BY_KEY.get(requeuedKey)
					: undefined
				// pytanie bazowe (nie powtórka): w intro-rundzie bierz z planu, inaczej selekcja
				let planPos = round.planPos
				let baseFact: Fact | undefined
				if (!requeuedFact) {
					if (round.plan) {
						const planKey = round.plan[planPos]
						baseFact = planKey ? FACTS_BY_KEY.get(planKey) : undefined
						planPos++
					}
					baseFact ??= pickNextFact(
						state.facts,
						state.unlockedStage,
						asked.slice(-3),
						Math.random,
					)
				}
				const fact = requeuedFact ?? (baseFact as Fact)
				set({
					round: {
						...round,
						index: nextIndex,
						planPos,
						question: makeQuestion(
							fact,
							requeuedFact !== undefined,
							round.mode,
							round.introFactor,
							Math.random,
						),
						phase: "answering",
						answer: "",
						lastStars: 0,
						startedAt: Date.now(),
						asked,
					},
				})
			},

			// „Koniec na dziś": fragmenty, mastery i eggStarBank już zapisane (commit
			// per odpowiedź), jajka mają już finalny kolor; runda nie liczy się do totalRounds
			exitRoundEarly: () => set({ round: null, screen: "home" }),

			// wykluwa wybrane jajko (gracz wybiera kolejność w gnieździe); domyślnie pierwsze
			hatchEgg: (index = 0) => {
				const state = get()
				const egg = state.pendingEggs[index]
				if (!egg) return
				// osiągnięcie „tęczowe jajko" — liczone w chwili wyklucia
				const achievementStats =
					egg.quality === "rainbow"
						? {
								...state.achievementStats,
								rainbowEggsHatched:
									state.achievementStats.rainbowEggsHatched + 1,
							}
						: state.achievementStats
				const ctx = rollContext(state, egg.mode)
				// pity tylko dla jajek z rund (Jajko Życzeń i gwarantowany pierwszy
				// potworek nie ruszają licznika trybu)
				let monsterId: number
				let legendaryPity = state.legendaryPity
				if (egg.quality === "wish") {
					monsterId = rollWish(ctx)
				} else if (ctx.owned.size === 0) {
					monsterId = FIRST_MONSTER_ID
				} else {
					const r = rollMonsterWithPity(
						egg.quality,
						ctx,
						state.legendaryPity[egg.mode],
					)
					monsterId = r.id
					legendaryPity = { ...state.legendaryPity, [egg.mode]: r.pity }
				}
				const pendingEggs = state.pendingEggs.filter((_, i) => i !== index)
				if (monsterId in state.ownedMonsters) {
					const gained = dupIskierki(rarityOf(monsterId), egg.quality)
					set({
						pendingEggs,
						legendaryPity,
						iskierki: Math.min(ISKIERKI_CAP, state.iskierki + gained),
						achievementStats,
						lastHatch: {
							monsterId,
							isNew: false,
							isDream: false,
							iskierkiGained: gained,
						},
					})
				} else {
					const isDream = state.dreamMonsterId === monsterId
					set({
						pendingEggs,
						legendaryPity,
						ownedMonsters: {
							...state.ownedMonsters,
							[monsterId]: { hatchedAt: Date.now() },
						},
						dreamMonsterId: isDream ? null : state.dreamMonsterId,
						achievementStats,
						lastHatch: { monsterId, isNew: true, isDream, iskierkiGained: 0 },
					})
				}
				get().checkAchievements()
			},

			clearLastHatch: () => set({ lastHatch: null }),

			setDreamMonster: (id) => set({ dreamMonsterId: id }),

			// ulubiony przyjaciel (Home + kibicowanie); czysto prezentacyjny, brak
			// interakcji z pulą losowań — dlatego, w odróżnieniu od dreamMonsterId,
			// bez guardów isDivisionOnly (każdy posiadany potworek może nim być).
			// Przyjaciel nie może być jednocześnie podróżnikiem (lustro guardu w
			// sendExpedition — tam przyjaciel nie wyrusza, tu podróżnik nie zostaje
			// przyjacielem; inaczej wioska renderowałaby go podwójnie: na łące i w
			// obozie 🏕️). Guard w store jest źródłem prawdy; UI pokazuje łagodne
			// wyjaśnienie zamiast przycisku.
			setCompanion: (id) => {
				if (id !== null && id === get().expedition?.monsterId) return
				set({ companionId: id })
			},

			// Wysyła potworka na wyprawę (postęp = ukończone rundy, patrz
			// src/game/expeditions.ts). Guardy (ciche no-op): jedna wyprawa naraz,
			// tylko posiadany potworek, NIGDY przyjaciel (zostaje w domu — to on
			// mieszka na Home i kibicuje w rundach). Ten guard jest źródłem prawdy;
			// UI pokazuje łagodne wyjaśnienia zamiast zablokowanych przycisków.
			sendExpedition: (monsterId, typeId) => {
				const state = get()
				if (state.expedition !== null) return
				if (!(monsterId in state.ownedMonsters)) return
				if (monsterId === state.companionId) return
				if (!EXPEDITIONS_BY_ID.has(typeId)) return
				// brama Placu Zabaw dotyczy tylko wysłania — wyprawa w drodze
				// zawsze dochodzi do końca (rozstrzygnięcie nie sprawdza bramy)
				if (!expeditionUnlocked(state.village, typeId)) return
				set({
					expedition: { monsterId, typeId, roundsAtStart: state.totalRounds },
				})
			},

			// Zawrócenie z wyprawy: darmowe i natychmiastowe — bez nagrody i bez
			// kary (pomyłki muszą być odwracalne; zero lock-in anxiety).
			recallExpedition: () => set({ expedition: null }),

			buyWishEgg: () => {
				const state = get()
				// studnia życzeń: Jajko Życzeń kupuje się przy fontannie (L1+)
				if (!wishEggUnlocked(state.village)) return
				if (!wishEggAvailable(state.ownedMonsters)) return
				const cost = wishEggCost(state)
				if (state.iskierki < cost) return
				set({
					iskierki: state.iskierki - cost,
					pendingEggs: [
						...state.pendingEggs,
						{ quality: "wish", mode: WISH_MODE },
					],
					achievementStats: {
						...state.achievementStats,
						wishEggsBought: state.achievementStats.wishEggsBought + 1,
					},
					screen: "hatch",
				})
				get().checkAchievements()
			},

			// Budowa/ulepszenie budynku (wzór buyWishEgg: brak środków = ciche no-op).
			// Kupno celu dziecka („Mój cel!") czyści goalId — cel osiągnięty.
			buildVillage: (id) => {
				const state = get()
				const cost = nextLevelCost(state.village, id)
				if (cost === null || state.iskierki < cost) return
				set({
					iskierki: state.iskierki - cost,
					village: {
						...state.village,
						buildings: {
							...state.village.buildings,
							[id]: buildingLevel(state.village, id) + 1,
						},
						goalId: state.village.goalId === id ? null : state.village.goalId,
					},
				})
				get().checkAchievements()
			},

			buyDecoration: (id) => {
				const state = get()
				const def = DECORATIONS.find((d) => d.id === id)
				if (!def) return
				if (state.village.decorations.includes(id)) return
				if (state.iskierki < def.cost) return
				set({
					iskierki: state.iskierki - def.cost,
					village: {
						...state.village,
						decorations: [...state.village.decorations, id],
					},
				})
				get().checkAchievements()
			},

			// cienki setter celu budowy (wzór setDreamMonster); UI nie oferuje celu
			// na zbudowanym-maks budynku, a currentGoal i tak ma na to fallback
			setVillageGoal: (id) =>
				set((s) => ({ village: { ...s.village, goalId: id } })),

			// Kupno przedmiotu ze Sklepiku (wzór buildVillage): nieznane id / już
			// kupiony / tier ponad poziom sklepiku / brak środków = ciche no-op.
			buyCosmetic: (id) => {
				const state = get()
				const def = COSMETICS_BY_ID.get(id)
				if (!def) return
				if (isOwned(state.cosmetics, id)) return
				if (def.tier > sklepikLevel(state.village)) return
				if (state.iskierki < def.cost) return
				set({
					iskierki: state.iskierki - def.cost,
					cosmetics: {
						...state.cosmetics,
						owned: [...state.cosmetics.owned, id],
					},
				})
				get().checkAchievements()
			},

			// Zakłada/zdejmuje kosmetykę (garderoba w Moich Potworkach): tylko
			// KUPIONE przedmioty na tylko POSIADANE potworki; null zdejmuje slot.
			// Ubieranie jest darmowe i nielimitowane (jeden przedmiot może nosić
			// wiele potworków naraz — hojność, nie grind).
			equipCosmetic: (monsterId, slot, id) => {
				const state = get()
				if (!(monsterId in state.ownedMonsters)) return
				if (id !== null) {
					const def = COSMETICS_BY_ID.get(id)
					if (!def || def.slot !== slot) return
					if (!isOwned(state.cosmetics, id)) return
				}
				const forMonster = {
					...(state.cosmetics.equipped[monsterId] ?? {}),
				}
				if (id === null) delete forMonster[slot]
				else forMonster[slot] = id
				set({
					cosmetics: {
						...state.cosmetics,
						equipped: {
							...state.cosmetics.equipped,
							[monsterId]: forMonster,
						},
					},
				})
			},

			applyDecay: () => {
				const now = Date.now()
				const facts = { ...get().facts }
				for (const key of Object.keys(facts) as FactKey[]) {
					const stats = facts[key]
					if (stats) facts[key] = decayStats(stats, now)
				}
				set({ facts })
			},

			// mapa pokazała animację otwarcia bramy aż do bieżącego etapu
			markGatesCelebrated: () =>
				set((s) => ({ celebratedStage: s.unlockedStage })),

			// Sprawdza i odblokowuje świeżo spełnione osiągnięcia (badge „nowe!" do odbioru).
			// Iskierek NIE wypłaca — odbiera je claimAchievement. Wołane na końcu akcji
			// zmieniających stan. Idempotentne: te już w ledgerze są pomijane (alreadyUnlocked).
			checkAchievements: () => {
				const s = get()
				const { newlyUnlocked } = evaluateAchievements(
					{ save: s, counters: s.achievementStats },
					new Set(Object.keys(s.achievements)),
				)
				if (newlyUnlocked.length === 0) return
				const now = Date.now()
				const achievements = { ...s.achievements }
				for (const id of newlyUnlocked)
					achievements[id] = { unlockedAt: now, claimed: false }
				set({
					achievements,
					// kolejka toastów „zdobyte!" (efemeryczna) — pokazuje je AchievementToast.
					// reconcileAchievements NIE dokłada tu nic (odblokowania startowe są ciche).
					achievementQueue: [...s.achievementQueue, ...newlyUnlocked],
				})
			},

			// Odbiór iskierek za zdobyte osiągnięcie (tap na ekranie osiągnięć). Jedyne
			// miejsce wypłaty nagrody za osiągnięcie; idempotentne (claimed strzeże).
			claimAchievement: (id) => {
				const s = get()
				const entry = s.achievements[id]
				const def = ACHIEVEMENTS.find((a) => a.id === id)
				if (!entry || entry.claimed || !def) return
				set({
					achievements: {
						...s.achievements,
						[id]: { ...entry, claimed: true },
					},
					iskierki: Math.min(
						ISKIERKI_CAP,
						s.iskierki + REWARD_BY_DIFFICULTY[def.difficulty],
					),
				})
			},

			// Zdejmuje pierwszy toast z kolejki (po wyświetleniu/auto-zniknięciu).
			shiftAchievementToast: () =>
				set((s) => ({ achievementQueue: s.achievementQueue.slice(1) })),

			// Jak checkAchievements, ale bez toastów — przy starcie sesji odblokowuje
			// osiągnięcia, które dziecko już spełnia (po wdrożeniu funkcji / migracji v5→v6),
			// bez lawiny powiadomień; iskierki czekają do odbioru (postęp dziecka jest święty).
			reconcileAchievements: () => {
				const s = get()
				const { newlyUnlocked } = evaluateAchievements(
					{ save: s, counters: s.achievementStats },
					new Set(Object.keys(s.achievements)),
				)
				if (newlyUnlocked.length === 0) return
				const now = Date.now()
				const achievements = { ...s.achievements }
				for (const id of newlyUnlocked)
					achievements[id] = { unlockedAt: now, claimed: false }
				set({ achievements })
			},

			debugSetAllMastery: (value) => {
				const facts = { ...get().facts }
				for (const fact of FACTS_BY_KEY.values()) {
					const prev = facts[fact.key] ?? emptyStats()
					facts[fact.key] = {
						...prev,
						mastery: value,
						attempts: Math.max(1, prev.attempts),
						lastSeen: Date.now(),
					}
				}
				set({ facts })
			},

			// ekran debug: cicho dopisuje efekt jednej rundy do zapisu (bez wchodzenia w rundę)
			debugSimulateRound: (totalStars) => {
				const state = get()
				const o = simulateRoundOutcome(
					state,
					totalStars,
					Math.random,
					Date.now(),
					undefined,
					state.mode,
				)
				// wyprawa rozstrzyga się jak w prawdziwej rundzie, ale PO CICHU —
				// symulacja nie ma rundy, więc karta powrotu (expeditionReturn) nie
				// istnieje; nagroda i licznik idą normalnie
				const settled = settleExpedition(state)
				set({
					facts: o.facts,
					eggFragments: o.eggFragments,
					eggStarBank: o.eggStarBank,
					eggsEarned: o.eggsEarned,
					pendingEggs: o.pendingEggs,
					unlockedStage: o.unlockedStage,
					// o.iskierki niesie już żołd i tęczowe z symulacji; bez bumpów
					// ścieżkowych (symulacja omija pressConfirm i nie jest rundą-wizytą)
					...roundClosePatch(state, settled, o.iskierki, {}, Date.now()),
				})
				get().checkAchievements()
			},

			// ekran rundy: kończy trwającą rundę z sumą `totalStars` gwiazdek i przechodzi
			// w fazę summary — odpala te same eventy końca rundy co prawdziwe odpowiedzi
			// (jajka tej rundy, ewentualna animacja bramy, CTA wyklucia)
			debugFinishRound: (totalStars) => {
				const state = get()
				const { round } = state
				if (!round) return
				const o = simulateRoundOutcome(
					state,
					totalStars,
					Math.random,
					Date.now(),
					FACTS_BY_KEY.get(round.question.key),
					round.mode,
				)
				// wyprawa rozstrzyga się jak przy prawdziwej finalizacji — runda
				// wchodzi w summary z pełnymi eventami, więc karta powrotu też gra
				const settled = settleExpedition(state)
				set({
					facts: o.facts,
					eggFragments: o.eggFragments,
					eggStarBank: o.eggStarBank,
					eggsEarned: o.eggsEarned,
					pendingEggs: o.pendingEggs,
					unlockedStage: o.unlockedStage,
					// symulacja nie przechodzi przez pressConfirm/nextQuestion, więc liczniki
					// zdarzeniowe ustawiamy tu wprost — by dało się przetestować z ekranu
					// debug. visitRoundsCompleted ŚWIADOMIE pomijany (jak bonus wizyty) —
					// rundy-wizyty liczą się tylko na realnej ścieżce finalizacji.
					...roundClosePatch(
						state,
						settled,
						o.iskierki,
						{
							totalStars,
							perfectRounds: totalStars === MAX_STARS_PER_ROUND ? 1 : 0,
						},
						Date.now(),
					),
					round: {
						...round,
						index: QUESTIONS_PER_ROUND,
						phase: "summary",
						answer: "",
						stars: totalStars,
						asked: o.asked,
						eggsCreated: o.createdIndices,
						unlockedThisRound: o.unlockedThisRound,
						wageEarned: o.wage,
						expeditionReturn: settled.expeditionReturn,
					},
				})
				get().checkAchievements()
			},

			debugOwnRarity: (rarity) => {
				const owned = { ...get().ownedMonsters }
				for (const id of IDS_BY_RARITY[rarity]) {
					owned[id] ??= { hatchedAt: Date.now() }
				}
				set({ ownedMonsters: owned })
				get().checkAchievements()
			},

			debugAddIskierki: (amount) =>
				set((s) => ({ iskierki: Math.min(ISKIERKI_CAP, s.iskierki + amount) })),

			debugAddEgg: (quality) =>
				set((s) => ({
					pendingEggs: [...s.pendingEggs, { quality, mode: s.mode }],
				})),

			// otwiera kolejną bramę bez ruszania celebratedStage → wejście na mapę odpala animację
			debugOpenGate: () =>
				set((s) =>
					isMaxStage(s.unlockedStage)
						? {}
						: { unlockedStage: s.unlockedStage + 1 },
				),

			// stawia całą wioskę BEZ wydawania iskierek — narzędzie do testów
			// wizualnych (pełna scena jednym stuknięciem, wzór debugOwnRarity)
			debugBuildAll: () =>
				set({
					village: {
						buildings: Object.fromEntries(
							BUILDINGS.map((b) => [b.id, MAX_BUILDING_LEVEL]),
						),
						decorations: DECORATIONS.map((d) => d.id),
						goalId: null,
					},
				}),

			debugReset: () =>
				set({
					...INITIAL_SAVE,
					round: null,
					lastHatch: null,
					screen: "home",
					mode: "mult",
					achievementQueue: [],
					villageVisited: false,
				}),
		}),
		{
			name: "potworki-save",
			version: SAVE_VERSION,
			storage: createJSONStorage(safeStorage),
			partialize: (state) =>
				Object.fromEntries(
					SAVE_KEYS.map((key) => [key, state[key]]),
				) as unknown as GameState,
			migrate: (persisted, fromVersion) =>
				migrateSave(persisted, fromVersion) as GameState,
			merge: (persisted, current) => mergePersisted(persisted, current),
		},
	),
)

// decay raz na załadowanie strony (sesję)
useGame.getState().applyDecay()
// po cichu odblokuj osiągnięcia już zasłużone (po wdrożeniu funkcji / migracji v5→v6)
useGame.getState().reconcileAchievements()
