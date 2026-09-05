import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import {
	claimAchievement as claimLedger,
	unlockAchievements,
} from "../achievements/evaluate"
import { decayStats, emptyStats, reachedGoal } from "../game/adaptive"
import { grantMonster, ownedIds } from "../game/collection"
import type { CosmeticId, CosmeticSlot } from "../game/cosmetics"
import { COSMETICS_BY_ID, isOwned, sklepikLevel } from "../game/cosmetics"
import { simulateRound } from "../game/debug"
import type { ExpeditionTypeId } from "../game/expeditions"
import { EXPEDITIONS_BY_ID, expeditionUnlocked } from "../game/expeditions"
import type { FactKey, GameMode } from "../game/facts"

export type { RoundQuestion } from "../game/facts"

import { expectedAnswer, FACTS_BY_KEY, isMaxStage } from "../game/facts"
import type { EggQuality, Rarity } from "../game/rewards"
import {
	credit,
	dupIskierki,
	rollMonsterWithPity,
	rollWish,
	spend,
	WISH_MODE,
} from "../game/rewards"
import type { RoundState } from "../game/round"
import { advance, newRound, newVisitRound, submitAnswer } from "../game/round"
import type { BuildingId, DecorationId } from "../game/village"
import {
	BUILDINGS,
	buildingLevel,
	DECORATIONS,
	DECORATIONS_BY_ID,
	MAX_BUILDING_LEVEL,
	nextLevelCost,
} from "../game/village"
import { wishEgg } from "../game/wishEgg"
import {
	FIRST_MONSTER_ID,
	IDS_BY_RARITY,
	idsByRarityForMode,
	rarityOf,
} from "../monsters/catalog"
import type { SaveState } from "./schema"
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
export type { RoundPhase, RoundState } from "../game/round"

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
	checkAchievements: (silent?: boolean) => void
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
		owned: new Set(ownedIds(state.ownedMonsters)),
		dreamId,
		rarityOf,
		rand: Math.random,
	}
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
				set({
					screen: "round",
					round: newRound(state, state.mode, Math.random, Date.now()),
				})
			},

			// Runda-wizyta u Strażnika (reguły w game/round.ts); bez potrzeby
			// utrzymania karta zaproszenia nie powinna się renderować — wtedy zwykła runda.
			startVisitRound: () => {
				const round = newVisitRound(get(), Math.random, Date.now())
				if (!round) {
					get().startRound()
					return
				}
				set({ screen: "round", round })
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
				if (!round || round.paused) return
				const r = submitAnswer(state, round, Math.random, Date.now())
				if (!r) return
				set({ ...r.patch, round: r.round })
				get().checkAchievements()
			},

			// następne pytanie albo finalizacja (żołd, bonus wizyty, wyprawa, liczniki —
			// kolejność i jeden cap portfela pilnuje game/round.ts)
			nextQuestion: () => {
				const state = get()
				if (!state.round) return
				const r = advance(state, state.round, Math.random, Date.now())
				if (!r) return
				set({ ...r.patch, round: r.round })
				if (r.round.phase === "summary") get().checkAchievements()
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
					const { wallet, gained } = credit(
						state.iskierki,
						dupIskierki(rarityOf(monsterId), egg.quality),
					)
					set({
						pendingEggs,
						legendaryPity,
						iskierki: wallet,
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
						...grantMonster(state, monsterId, Date.now()),
						achievementStats,
						lastHatch: {
							monsterId,
							isNew: true,
							isDream,
							iskierkiGained: 0,
						},
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
				// studnia życzeń (Fontanna L1+) + pula mnożeniowa jeszcze niedomknięta
				const wish = wishEgg(state)
				if (!wish.unlocked || !wish.available) return
				const wallet = spend(state.iskierki, wish.cost)
				if (wallet === null) return
				set({
					iskierki: wallet,
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
				if (cost === null) return
				const wallet = spend(state.iskierki, cost)
				if (wallet === null) return
				set({
					iskierki: wallet,
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
				const def = DECORATIONS_BY_ID.get(id)
				if (!def) return
				if (state.village.decorations.includes(id)) return
				const wallet = spend(state.iskierki, def.cost)
				if (wallet === null) return
				set({
					iskierki: wallet,
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
				const wallet = spend(state.iskierki, def.cost)
				if (wallet === null) return
				set({
					iskierki: wallet,
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
			// `silent` = bez toastów (kolejka „zdobyte!" pokazywana przez AchievementToast).
			checkAchievements: (silent = false) => {
				const s = get()
				const { achievements, newlyUnlocked } = unlockAchievements(
					s,
					Date.now(),
				)
				if (newlyUnlocked.length === 0) return
				set({
					achievements,
					achievementQueue: silent
						? s.achievementQueue
						: [...s.achievementQueue, ...newlyUnlocked],
				})
			},

			// Odbiór iskierek za zdobyte osiągnięcie (tap na ekranie osiągnięć). Jedyne
			// miejsce wypłaty nagrody za osiągnięcie; idempotentne (claimed strzeże).
			claimAchievement: (id) => {
				const s = get()
				const r = claimLedger(s, id)
				if (!r) return
				set({
					achievements: r.achievements,
					iskierki: credit(s.iskierki, r.reward).wallet,
				})
				// portfel mógł przekroczyć próg (np. „Skarbnica iskier" 100 ✨); cicho —
				// dziecko jest na ekranie osiągnięć, nowy wiersz sam się podświetli
				get().reconcileAchievements()
			},

			// Zdejmuje pierwszy toast z kolejki (po wyświetleniu/auto-zniknięciu).
			shiftAchievementToast: () =>
				set((s) => ({ achievementQueue: s.achievementQueue.slice(1) })),

			// Jak checkAchievements, ale bez toastów — przy starcie sesji odblokowuje
			// osiągnięcia, które dziecko już spełnia (po wdrożeniu funkcji / migracji v5→v6),
			// bez lawiny powiadomień; iskierki czekają do odbioru (postęp dziecka jest święty).
			reconcileAchievements: () => get().checkAchievements(true),

			debugSetAllMastery: (value) => {
				const facts = { ...get().facts }
				for (const fact of FACTS_BY_KEY.values()) {
					const prev = facts[fact.key] ?? emptyStats()
					facts[fact.key] = {
						...prev,
						mastery: value,
						mastered: reachedGoal(prev, value),
						attempts: Math.max(1, prev.attempts),
						lastSeen: Date.now(),
					}
				}
				set({ facts })
			},

			// ekran debug: cicho dopisuje efekt jednej rundy do zapisu (bez wchodzenia w rundę)
			// symulowana runda tymi samymi funkcjami co prawdziwa gra (game/debug.ts →
			// game/round.ts): żołd, wyprawa, liczniki — bez rundy na ekranie. Świadomie
			// bez bonusu wizyty i licznika wizyt: to zwykła (nie-wizytowa) runda.
			debugSimulateRound: (totalStars) => {
				const state = get()
				const { patch } = simulateRound(
					state,
					state.mode,
					totalStars,
					Math.random,
					Date.now(),
				)
				set(patch)
				get().checkAchievements()
			},

			// ekran rundy: kończy trwającą rundę z sumą `totalStars` gwiazdek i przechodzi
			// w fazę summary — te same eventy końca rundy co prawdziwe odpowiedzi (jajka
			// tej rundy, animacja bramy, karta powrotu, CTA wyklucia). Rozgrywana od nowa
			// od aktualnego pytania jako zwykła runda (wizyta: bez bonusu i licznika).
			debugFinishRound: (totalStars) => {
				const state = get()
				const { round } = state
				// tylko przed pierwszym commitem (jak przycisk w RoundScreen) — później
				// replay zaliczyłby bieżące pytanie drugi raz
				if (round?.phase !== "answering" || round.index !== 0) return
				const r = simulateRound(
					state,
					round.mode,
					totalStars,
					Math.random,
					Date.now(),
					round.question,
				)
				set({ ...r.patch, round: r.round })
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
				set((s) => ({ iskierki: credit(s.iskierki, amount).wallet })),

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
