import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import {
	applyAnswer,
	decayStats,
	emptyStats,
	introRoundPlan,
	isIntroRound,
	newlyUnlockedFactor,
	pickNextFact,
	shouldUnlockNextStage,
} from "../game/adaptive"
import { simulateRoundOutcome } from "../game/debug"
import type { Fact, FactKey, GameMode } from "../game/facts"
import {
	FACTS_BY_KEY,
	fragmentsForEgg,
	isMaxStage,
	MAX_QUESTIONS_PER_ROUND,
	QUESTIONS_PER_ROUND,
	starsFor,
} from "../game/facts"
import type { EggQuality, Rarity } from "../game/rewards"
import {
	eggQuality,
	ISKIERKI_CAP,
	ISKIERKI_FOR_DUP,
	rollMonster,
	rollWish,
	WISH_COST,
	WISH_COST_NO_DREAM,
} from "../game/rewards"
import {
	FIRST_MONSTER_ID,
	IDS_BY_RARITY,
	idsByRarityForMode,
	isDivisionOnly,
	rarityOf,
} from "../monsters/catalog"
import type { SaveState } from "./schema"
import { INITIAL_SAVE, migrateSave, SAVE_KEYS, SAVE_VERSION } from "./schema"

export type Screen = "home" | "round" | "hatch" | "collection" | "map" | "debug"
export type RoundPhase = "answering" | "correct" | "wrong" | "summary"

export interface RoundQuestion {
	key: FactKey
	// w kolejności wyświetlania. Mnożenie: losowa orientacja czynników (a×b).
	// Dzielenie: a = dzielna (iloczyn), b = dzielnik; oczekiwany wynik = a/b.
	a: number
	b: number
	isRequeue: boolean
}

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
	eggsCreated: number[] // indeksy w pendingEggs utworzone w tej rundzie
	finalQuality: EggQuality | null
	unlockedThisRound: boolean
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

	goTo: (screen: Screen) => void
	setMode: (mode: GameMode) => void
	startRound: () => void
	pressDigit: (digit: number) => void
	pressBackspace: () => void
	pressConfirm: () => void
	nextQuestion: () => void
	exitRoundEarly: () => void
	hatchEgg: (index?: number) => void
	clearLastHatch: () => void
	setDreamMonster: (id: number | null) => void
	buyWishEgg: () => void
	applyDecay: () => void
	markGatesCelebrated: () => void

	debugSetAllMastery: (value: number) => void
	debugSimulateRound: (totalStars: number) => void
	debugFinishRound: (totalStars: number) => void
	debugOwnRarity: (rarity: Rarity) => void
	debugAddIskierki: (amount: number) => void
	debugAddEgg: (quality: EggQuality) => void
	debugOpenGate: () => void
	debugReset: () => void
}

function makeQuestion(
	fact: Fact,
	isRequeue: boolean,
	mode: GameMode,
	introFactor: number | null,
): RoundQuestion {
	if (mode === "div") {
		// dzielenie: (a*b) ÷ dzielnik = iloraz. Po odblokowaniu czynnika ma on być
		// w działaniu (dzielnik), nie w wyniku → 72÷8, nie 72÷9. Poza tym dzielnik losowy.
		const introIsOperand =
			introFactor !== null && (fact.a === introFactor || fact.b === introFactor)
		const divisor = introIsOperand
			? (introFactor as number)
			: Math.random() < 0.5
				? fact.a
				: fact.b
		return { key: fact.key, a: fact.a * fact.b, b: divisor, isRequeue }
	}
	const flip = Math.random() < 0.5
	return {
		key: fact.key,
		a: flip ? fact.b : fact.a,
		b: flip ? fact.a : fact.b,
		isRequeue,
	}
}

// Oczekiwany wynik pytania zależnie od trybu (mnożenie: a×b, dzielenie: a÷b).
function expectedAnswer(q: RoundQuestion, mode: GameMode): number {
	return mode === "div" ? q.a / q.b : q.a * q.b
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

export const useGame = create<GameState>()(
	persist(
		(set, get) => ({
			...INITIAL_SAVE,
			screen: "home",
			round: null,
			lastHatch: null,
			mode: "mult",

			// stan rundy żyje tylko na ekranie rundy
			goTo: (screen) =>
				set((s) => ({ screen, round: screen === "round" ? s.round : null })),

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
						question: makeQuestion(firstFact, false, mode, introFactor),
						phase: "answering",
						answer: "",
						stars: 0,
						lastStars: 0,
						startedAt: Date.now(),
						asked: [],
						requeues: {},
						shakeNonce: 0,
						eggsCreated: [],
						finalQuality: null,
						unlockedThisRound: false,
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

				// fragment przyznany niezależnie od wyniku — postęp nigdy nie przepada
				let eggFragments = state.eggFragments + 1
				let pendingEggs = state.pendingEggs
				let eggsEarned = state.eggsEarned
				const eggsCreated = [...round.eggsCreated]
				if (eggFragments >= fragmentsForEgg(eggsEarned)) {
					eggFragments = 0
					eggsEarned++
					// prowizoryczna jakość z gwiazdek-dotąd; finalna nadawana na końcu rundy.
					// tryb jajka = tryb rundy → decyduje o puli przy wykluciu
					pendingEggs = [
						...pendingEggs,
						{ quality: eggQuality(stars, Math.random), mode: round.mode },
					]
					eggsCreated.push(pendingEggs.length - 1)
				}

				if (correct) {
					set({
						facts,
						eggFragments,
						eggsEarned,
						pendingEggs,
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
						eggsEarned,
						pendingEggs,
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
			},

			nextQuestion: () => {
				const state = get()
				const { round } = state
				if (round?.phase !== "correct") return
				const asked = [...round.asked, round.question.key]
				const nextIndex = round.index + 1

				if (nextIndex >= round.total) {
					// koniec rundy: finalna jakość dla jajek z tej rundy + check odblokowania
					const finalQuality = eggQuality(round.stars, Math.random)
					const pendingEggs = state.pendingEggs.map((egg, i) =>
						round.eggsCreated.includes(i)
							? { ...egg, quality: finalQuality }
							: egg,
					)
					const iskierki =
						finalQuality === "rainbow"
							? Math.min(ISKIERKI_CAP, state.iskierki + 1)
							: state.iskierki
					let unlockedStage = state.unlockedStage
					let unlockedThisRound = false
					if (
						!isMaxStage(unlockedStage) &&
						shouldUnlockNextStage(state.facts, unlockedStage)
					) {
						unlockedStage++
						unlockedThisRound = true
					}
					set({
						pendingEggs,
						iskierki,
						unlockedStage,
						totalRounds: state.totalRounds + 1,
						round: {
							...round,
							phase: "summary",
							asked,
							finalQuality,
							unlockedThisRound,
						},
					})
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
						),
						phase: "answering",
						answer: "",
						lastStars: 0,
						startedAt: Date.now(),
						asked,
					},
				})
			},

			// „Koniec na dziś": fragmenty i mastery już zapisane; jajka zachowują
			// prowizoryczną jakość; runda się nie liczy do totalRounds
			exitRoundEarly: () => set({ round: null, screen: "home" }),

			// wykluwa wybrane jajko (gracz wybiera kolejność w gnieździe); domyślnie pierwsze
			hatchEgg: (index = 0) => {
				const state = get()
				const egg = state.pendingEggs[index]
				if (!egg) return
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
						lastHatch: { monsterId, isNew: true, isDream, iskierkiGained: 0 },
					})
				}
			},

			clearLastHatch: () => set({ lastHatch: null }),

			setDreamMonster: (id) => set({ dreamMonsterId: id }),

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
					screen: "hatch",
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
					eggsEarned: o.eggsEarned,
					pendingEggs: o.pendingEggs,
					iskierki: o.iskierki,
					unlockedStage: o.unlockedStage,
					totalRounds: state.totalRounds + 1,
				})
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
					eggsEarned: o.eggsEarned,
					pendingEggs: o.pendingEggs,
					iskierki: o.iskierki,
					unlockedStage: o.unlockedStage,
					totalRounds: state.totalRounds + 1,
					round: {
						...round,
						index: QUESTIONS_PER_ROUND,
						phase: "summary",
						answer: "",
						stars: totalStars,
						asked: o.asked,
						eggsCreated: o.createdIndices,
						finalQuality: o.finalQuality,
						unlockedThisRound: o.unlockedThisRound,
					},
				})
			},

			debugOwnRarity: (rarity) => {
				const owned = { ...get().ownedMonsters }
				for (const id of IDS_BY_RARITY[rarity]) {
					owned[id] ??= { hatchedAt: Date.now() }
				}
				set({ ownedMonsters: owned })
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

			debugReset: () =>
				set({
					...INITIAL_SAVE,
					round: null,
					lastHatch: null,
					screen: "home",
					mode: "mult",
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
		},
	),
)

// decay raz na załadowanie strony (sesję)
useGame.getState().applyDecay()
