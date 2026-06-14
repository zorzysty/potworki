import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { applyAnswer, decayStats, emptyStats, pickNextFact, shouldUnlockNextStage } from "../game/adaptive"
import type { Fact, FactKey } from "../game/facts"
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
import { FIRST_MONSTER_ID, IDS_BY_RARITY, rarityOf } from "../monsters/catalog"
import type { SaveState } from "./schema"
import { INITIAL_SAVE, migrateSave, SAVE_KEYS, SAVE_VERSION } from "./schema"

export type Screen = "home" | "round" | "hatch" | "collection" | "map" | "debug"
export type RoundPhase = "answering" | "correct" | "wrong" | "summary"

export interface RoundQuestion {
	key: FactKey
	a: number // w kolejności wyświetlania (losowa orientacja)
	b: number
	isRequeue: boolean
}

export interface RoundState {
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

	goTo: (screen: Screen) => void
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
	debugOwnRarity: (rarity: Rarity) => void
	debugAddIskierki: (amount: number) => void
	debugAddEgg: (quality: EggQuality) => void
	debugOpenGate: () => void
	debugReset: () => void
}

function makeQuestion(fact: Fact, isRequeue: boolean): RoundQuestion {
	const flip = Math.random() < 0.5
	return { key: fact.key, a: flip ? fact.b : fact.a, b: flip ? fact.a : fact.b, isRequeue }
}

function rollContext(state: SaveState) {
	return {
		idsByRarity: IDS_BY_RARITY,
		owned: new Set(Object.keys(state.ownedMonsters).map(Number)),
		dreamId: state.dreamMonsterId,
		rarityOf,
		rand: Math.random,
	}
}

export function wishEggCost(state: Pick<SaveState, "dreamMonsterId" | "ownedMonsters">): number {
	const dream = state.dreamMonsterId
	if (dream === null || dream in state.ownedMonsters) return WISH_COST_NO_DREAM
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

			// stan rundy żyje tylko na ekranie rundy
			goTo: screen => set(s => ({ screen, round: screen === "round" ? s.round : null })),

			startRound: () => {
				const state = get()
				const fact = pickNextFact(state.facts, state.unlockedStage, [], Math.random)
				set({
					screen: "round",
					round: {
						index: 0,
						total: QUESTIONS_PER_ROUND,
						question: makeQuestion(fact, false),
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

			pressDigit: digit => {
				const { round } = get()
				if (!round || (round.phase !== "answering" && round.phase !== "wrong")) return
				if (round.answer.length >= 3) return
				const answer = round.answer + String(digit)
				set({ round: { ...round, answer } })
				// auto-submit: gdy wpisano tyle cyfr, ile ma oczekiwany wynik
				const digits = String(round.question.a * round.question.b).length
				if (answer.length >= digits) get().pressConfirm()
			},

			pressBackspace: () => {
				const { round } = get()
				if (!round || (round.phase !== "answering" && round.phase !== "wrong")) return
				set({ round: { ...round, answer: round.answer.slice(0, -1) } })
			},

			pressConfirm: () => {
				const state = get()
				const { round } = state
				if (!round || round.answer === "") return
				const q = round.question
				const product = q.a * q.b
				const correct = Number(round.answer) === product

				if (round.phase === "wrong") {
					// przepisywanie poprawnego wyniku — czysty rytuał utrwalający
					if (correct) {
						set({ round: { ...round, phase: "correct", lastStars: 0, answer: round.answer } })
					} else {
						set({ round: { ...round, answer: "", shakeNonce: round.shakeNonce + 1 } })
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
				const facts = { ...state.facts, [q.key]: applyAnswer(stats, fact, correct, elapsed, now) }

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
					// prowizoryczna jakość z gwiazdek-dotąd; finalna nadawana na końcu rundy
					pendingEggs = [...pendingEggs, { quality: eggQuality(stars) }]
					eggsCreated.push(pendingEggs.length - 1)
				}

				if (correct) {
					set({
						facts,
						eggFragments,
						eggsEarned,
						pendingEggs,
						round: { ...round, phase: "correct", stars, lastStars: gained, eggsCreated },
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
				if (!round || round.phase !== "correct") return
				const asked = [...round.asked, round.question.key]
				const nextIndex = round.index + 1

				if (nextIndex >= round.total) {
					// koniec rundy: finalna jakość dla jajek z tej rundy + check odblokowania
					const finalQuality = eggQuality(round.stars)
					const pendingEggs = state.pendingEggs.map((egg, i) =>
						round.eggsCreated.includes(i) ? { ...egg, quality: finalQuality } : egg,
					)
					const iskierki =
						finalQuality === "rainbow" ? Math.min(ISKIERKI_CAP, state.iskierki + 1) : state.iskierki
					let unlockedStage = state.unlockedStage
					let unlockedThisRound = false
					if (!isMaxStage(unlockedStage) && shouldUnlockNextStage(state.facts, unlockedStage)) {
						unlockedStage++
						unlockedThisRound = true
					}
					set({
						pendingEggs,
						iskierki,
						unlockedStage,
						totalRounds: state.totalRounds + 1,
						round: { ...round, phase: "summary", asked, finalQuality, unlockedThisRound },
					})
					return
				}

				const requeuedKey = round.requeues[nextIndex]
				const requeuedFact = requeuedKey ? FACTS_BY_KEY.get(requeuedKey) : undefined
				const fact =
					requeuedFact ?? pickNextFact(state.facts, state.unlockedStage, asked.slice(-3), Math.random)
				set({
					round: {
						...round,
						index: nextIndex,
						question: makeQuestion(fact, requeuedFact !== undefined),
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
				const ctx = rollContext(state)
				const monsterId =
					egg.quality === "wish" ? rollWish(ctx)
					: ctx.owned.size === 0 ? FIRST_MONSTER_ID
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
						lastHatch: { monsterId, isNew: false, isDream: false, iskierkiGained: gained },
					})
				} else {
					const isDream = state.dreamMonsterId === monsterId
					set({
						pendingEggs,
						ownedMonsters: { ...state.ownedMonsters, [monsterId]: { hatchedAt: Date.now() } },
						dreamMonsterId: isDream ? null : state.dreamMonsterId,
						lastHatch: { monsterId, isNew: true, isDream, iskierkiGained: 0 },
					})
				}
			},

			clearLastHatch: () => set({ lastHatch: null }),

			setDreamMonster: id => set({ dreamMonsterId: id }),

			buyWishEgg: () => {
				const state = get()
				const cost = wishEggCost(state)
				if (state.iskierki < cost) return
				set({
					iskierki: state.iskierki - cost,
					pendingEggs: [...state.pendingEggs, { quality: "wish" }],
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
			markGatesCelebrated: () => set(s => ({ celebratedStage: s.unlockedStage })),

			debugSetAllMastery: value => {
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

			debugOwnRarity: rarity => {
				const owned = { ...get().ownedMonsters }
				for (const id of IDS_BY_RARITY[rarity]) {
					owned[id] ??= { hatchedAt: Date.now() }
				}
				set({ ownedMonsters: owned })
			},

			debugAddIskierki: amount =>
				set(s => ({ iskierki: Math.min(ISKIERKI_CAP, s.iskierki + amount) })),

			debugAddEgg: quality => set(s => ({ pendingEggs: [...s.pendingEggs, { quality }] })),

			// otwiera kolejną bramę bez ruszania celebratedStage → wejście na mapę odpala animację
			debugOpenGate: () =>
				set(s => (isMaxStage(s.unlockedStage) ? {} : { unlockedStage: s.unlockedStage + 1 })),

			debugReset: () => set({ ...INITIAL_SAVE, round: null, lastHatch: null, screen: "home" }),
		}),
		{
			name: "potworki-save",
			version: SAVE_VERSION,
			storage: createJSONStorage(safeStorage),
			partialize: state =>
				Object.fromEntries(SAVE_KEYS.map(key => [key, state[key]])) as unknown as GameState,
			migrate: (persisted, fromVersion) => migrateSave(persisted, fromVersion) as GameState,
		},
	),
)

// decay raz na załadowanie strony (sesję)
useGame.getState().applyDecay()
