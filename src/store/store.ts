import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
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
import { simulateRoundOutcome } from "../game/debug"
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
	ISKIERKI_CAP,
	ISKIERKI_FOR_DUP,
	rollMonster,
	rollWish,
	WISH_COST,
	WISH_COST_NO_DREAM,
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
} from "../game/village"
import {
	FIRST_MONSTER_ID,
	IDS_BY_RARITY,
	idsByRarityForMode,
	isDivisionOnly,
	rarityOf,
} from "../monsters/catalog"
import type { AchievementCounters, AchievementEntry, SaveState } from "./schema"
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
	// runda-wizyta u Strażnika: etap odwiedzanej (najsłabszej starszej) tabliczki —
	// wybiera region/Strażnika i włącza podziękowanie (+VISIT_BONUS ✨) przy finalizacji.
	// Efemeryczne (RoundState nie jest persystowany). null = zwykła runda.
	visitStage: number | null
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
	buyWishEgg: () => void
	buildVillage: (id: BuildingId) => void
	buyDecoration: (id: DecorationId) => void
	setVillageGoal: (id: BuildingId | null) => void
	applyDecay: () => void
	markGatesCelebrated: () => void
	checkAchievements: () => void
	markAchievementsSeen: () => void
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

// Pula losowania potworków zależna od trybu jajka: jajko z dzielenia widzi pełny
// katalog (w tym legendarne tylko-dzielenie), jajko mnożeniowe/życzeń — bez nich.
// Wymarzony potworek tylko-dzielenie nie ma priorytetu w trybie mnożenia (gdyby
// został wybrany jako dream), bo i tak nie ma go w przefiltrowanej puli.
function rollContext(state: SaveState, mode: GameMode) {
	const dreamId =
		mode === "mult" &&
		state.dreamMonsterId !== null &&
		isDivisionOnly(state.dreamMonsterId)
			? null
			: state.dreamMonsterId
	return {
		idsByRarity: idsByRarityForMode(mode),
		owned: new Set(Object.keys(state.ownedMonsters).map(Number)),
		dreamId,
		rarityOf,
		rand: Math.random,
	}
}

export function wishEggCost(
	state: Pick<SaveState, "dreamMonsterId" | "ownedMonsters">,
): number {
	const dream = state.dreamMonsterId
	// jajko życzeń losuje z puli mnożeniowej → wymarzony tylko-dzielenie go nie
	// dotyczy (zdobywa się go realną grą w dzielenie), więc liczymy jak bez dreamu
	if (dream === null || dream in state.ownedMonsters || isDivisionOnly(dream))
		return WISH_COST_NO_DREAM
	return WISH_COST[rarityOf(dream)]
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
	return {
		...current,
		...p,
		achievementStats: {
			...current.achievementStats,
			...(p.achievementStats ?? {}),
		},
		// ta sama siatka bezpieczeństwa dla wioski (zapis v9 bez pola po dev-HMR
		// nie może dać undefined.buildings)
		village: {
			...current.village,
			...(p.village ?? {}),
		},
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
			// sesyjny badge „stać cię!" na Home
			goTo: (screen) =>
				set((s) => ({
					screen,
					round: screen === "round" ? s.round : null,
					villageVisited: s.villageVisited || screen === "village",
				})),

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
					},
				})
			},

			pressDigit: (digit) => {
				const { round } = get()
				if (!round || (round.phase !== "answering" && round.phase !== "wrong"))
					return
				if (round.answer.length >= 3) return
				const answer = round.answer + String(digit)
				set({ round: { ...round, answer } })
				// auto-submit: gdy wpisano tyle cyfr, ile ma oczekiwany wynik
				const digits = String(expectedAnswer(round.question, round.mode)).length
				if (answer.length >= digits) get().pressConfirm()
			},

			pressBackspace: () => {
				const { round } = get()
				if (!round || (round.phase !== "answering" && round.phase !== "wrong"))
					return
				set({ round: { ...round, answer: round.answer.slice(0, -1) } })
			},

			pressConfirm: () => {
				const state = get()
				const { round } = state
				if (!round || round.answer === "") return
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
				// poprawne pierwsze próby w dzieleniu liczymy osobno
				const achievementStats = {
					...state.achievementStats,
					totalStars: state.achievementStats.totalStars + gained,
					divCorrect:
						state.achievementStats.divCorrect +
						(correct && round.mode === "div" ? 1 : 0),
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
					const achievementStats = bumpDaysPlayed(
						{
							...state.achievementStats,
							perfectRounds:
								state.achievementStats.perfectRounds +
								(round.stars === MAX_STARS_PER_ROUND ? 1 : 0),
						},
						now,
					)
					set({
						unlockedStage,
						totalRounds: state.totalRounds + 1,
						iskierki: Math.min(
							ISKIERKI_CAP,
							state.iskierki + wageEarned + visitBonus,
						),
						achievementStats,
						round: {
							...round,
							phase: "summary",
							asked,
							unlockedThisRound,
							wageEarned,
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
				const monsterId =
					egg.quality === "wish"
						? rollWish(ctx)
						: ctx.owned.size === 0
							? FIRST_MONSTER_ID
							: rollMonster(egg.quality, ctx)
				const pendingEggs = state.pendingEggs.filter((_, i) => i !== index)
				if (monsterId === null) {
					set({ pendingEggs })
					return
				}
				if (monsterId in state.ownedMonsters) {
					const gained = ISKIERKI_FOR_DUP[rarityOf(monsterId)]
					set({
						pendingEggs,
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
			setCompanion: (id) => set({ companionId: id }),

			buyWishEgg: () => {
				const state = get()
				const cost = wishEggCost(state)
				if (state.iskierki < cost) return
				set({
					iskierki: state.iskierki - cost,
					// jajko życzeń = pula mnożeniowa (legendarne tylko-dzielenie nie do kupienia)
					pendingEggs: [
						...state.pendingEggs,
						{ quality: "wish", mode: "mult" },
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

			// Sprawdza i odblokowuje świeżo spełnione osiągnięcia (badge „nowe!" → seen:false)
			// + dolicza iskierki (cap). Wołane na końcu akcji zmieniających stan. Idempotentne:
			// te już w ledgerze są pomijane (alreadyUnlocked).
			checkAchievements: () => {
				const s = get()
				const { newlyUnlocked, iskierkiReward } = evaluateAchievements(
					{ save: s, counters: s.achievementStats },
					new Set(Object.keys(s.achievements)),
				)
				if (newlyUnlocked.length === 0) return
				const now = Date.now()
				const achievements = { ...s.achievements }
				for (const id of newlyUnlocked)
					achievements[id] = { unlockedAt: now, seen: false }
				set({
					achievements,
					iskierki: Math.min(ISKIERKI_CAP, s.iskierki + iskierkiReward),
					// kolejka toastów „zdobyte!" (efemeryczna) — pokazuje je AchievementToast.
					// reconcileAchievements NIE dokłada tu nic (odblokowania startowe są ciche).
					achievementQueue: [...s.achievementQueue, ...newlyUnlocked],
				})
			},

			// Zdejmuje pierwszy toast z kolejki (po wyświetleniu/auto-zniknięciu).
			shiftAchievementToast: () =>
				set((s) => ({ achievementQueue: s.achievementQueue.slice(1) })),

			// Czyści badge „nowe osiągnięcie!" na Home (wejście na ekran osiągnięć).
			// Idempotentne — bezpieczne na podwójny montaż StrictMode.
			markAchievementsSeen: () => {
				const current = get().achievements
				if (!Object.values(current).some((a) => !a.seen)) return
				const achievements: Record<string, AchievementEntry> = {}
				for (const [id, e] of Object.entries(current))
					achievements[id] = e.seen ? e : { ...e, seen: true }
				set({ achievements })
			},

			// Jak checkAchievements, ale po cichu (seen:true) — przy starcie sesji odblokowuje
			// osiągnięcia, które dziecko już spełnia (po wdrożeniu funkcji / migracji v5→v6),
			// bez lawiny powiadomień, a iskierki za nie dolicza (postęp dziecka jest święty).
			reconcileAchievements: () => {
				const s = get()
				const { newlyUnlocked, iskierkiReward } = evaluateAchievements(
					{ save: s, counters: s.achievementStats },
					new Set(Object.keys(s.achievements)),
				)
				if (newlyUnlocked.length === 0) return
				const now = Date.now()
				const achievements = { ...s.achievements }
				for (const id of newlyUnlocked)
					achievements[id] = { unlockedAt: now, seen: true }
				set({
					achievements,
					iskierki: Math.min(ISKIERKI_CAP, s.iskierki + iskierkiReward),
				})
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
				set({
					facts: o.facts,
					eggFragments: o.eggFragments,
					eggStarBank: o.eggStarBank,
					eggsEarned: o.eggsEarned,
					pendingEggs: o.pendingEggs,
					iskierki: o.iskierki,
					unlockedStage: o.unlockedStage,
					totalRounds: state.totalRounds + 1,
					achievementStats: bumpDaysPlayed(state.achievementStats, Date.now()),
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
				set({
					facts: o.facts,
					eggFragments: o.eggFragments,
					eggStarBank: o.eggStarBank,
					eggsEarned: o.eggsEarned,
					pendingEggs: o.pendingEggs,
					iskierki: o.iskierki,
					unlockedStage: o.unlockedStage,
					totalRounds: state.totalRounds + 1,
					// symulacja nie przechodzi przez pressConfirm/nextQuestion, więc liczniki
					// zdarzeniowe ustawiamy tu wprost — by dało się przetestować z ekranu debug
					achievementStats: bumpDaysPlayed(
						{
							...state.achievementStats,
							totalStars: state.achievementStats.totalStars + totalStars,
							perfectRounds:
								state.achievementStats.perfectRounds +
								(totalStars === MAX_STARS_PER_ROUND ? 1 : 0),
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
