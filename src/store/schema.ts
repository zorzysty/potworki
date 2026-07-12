import type { FactStats } from "../game/adaptive"
import type { CosmeticsState } from "../game/cosmetics"
import { INITIAL_COSMETICS } from "../game/cosmetics"
import type { ExpeditionState } from "../game/expeditions"
import type { FactKey } from "../game/facts"
import { ISKIERKI_CAP, type PendingEgg } from "../game/rewards"
import type { VillageState } from "../game/village"
import { INITIAL_VILLAGE } from "../game/village"

export const SAVE_VERSION = 14

// Wpis ledgera osiągnięć. `seen` jak celebratedStage: false → badge „nowe!" na Home,
// czyszczony przy wejściu na ekran osiągnięć (markAchievementsSeen).
export interface AchievementEntry {
	unlockedAt: number
	seen: boolean
}

// Liczniki zdarzeniowe dla osiągnięć, których nie da się odtworzyć z reszty zapisu
// (zdarzenia ulotne: perfekcyjna runda, poprawne dzielenie, wyklute tęczowe itp.).
export interface AchievementCounters {
	perfectRounds: number
	divCorrect: number
	gapCorrect: number // poprawne pierwsze próby w trybie luki (brakujący czynnik)
	totalStars: number
	rainbowEggsHatched: number
	wishEggsBought: number
	// regularność: ile RÓŻNYCH dni dziecko grało (kumulacyjne, nie streak — przerwa
	// nie zeruje). `lastPlayedDay` to lokalny znacznik dnia (YYYY-M-D) ostatniej rundy;
	// store podbija `daysPlayed` tylko gdy nowa runda wypada w innym dniu niż ostatnia.
	daysPlayed: number
	lastPlayedDay: string
	// ukończone wyprawy potworków — `expedition` czyści się przy powrocie, więc
	// „ile wypraw ukończono" nie jest odtwarzalne z reszty zapisu (wzór wishEggsBought)
	expeditionsCompleted: number
	// ukończone rundy-odwiedziny u Strażnika (016) — runda-wizyta nie zostawia
	// śladu w zapisie po finalizacji, więc licznik (wzór expeditionsCompleted)
	visitRoundsCompleted: number
}

export interface SaveState {
	facts: Partial<Record<FactKey, FactStats>>
	unlockedStage: number
	celebratedStage: number // najwyższy etap, którego animację otwarcia bramy już pokazano (mapa)
	ownedMonsters: Record<number, { hatchedAt: number }>
	iskierki: number
	eggFragments: number // 0–(próg−1), resztki przenoszone między rundami
	eggStarBank: number // suma gwiazdek zebranych przy budowie bieżącego jajka; decyduje o jego kolorze przy domknięciu
	eggsEarned: number // ile jajek z fragmentów już powstało — steruje progiem (fragmentsForEgg)
	pendingEggs: PendingEgg[]
	dreamMonsterId: number | null
	companionId: number | null // ulubiony przyjaciel (siedzi na ekranie głównym, kibicuje); osobny od dreamMonsterId
	totalRounds: number
	achievements: Record<string, AchievementEntry> // zdobyte osiągnięcia (klucz = stabilne id z achievements/catalog)
	achievementStats: AchievementCounters // liczniki zdarzeniowe (patrz wyżej)
	village: VillageState // wioska budowniczych: poziomy budynków, dekoracje, wybrany cel
	cosmetics: CosmeticsState // garderoba: kupione przedmioty ze Sklepiku + założone per potworek
	// potworek w drodze (null = nikt); postęp liczony WYŁĄCZNIE z totalRounds,
	// nigdy zegarem — duration/reward pochodzą z katalogu w src/game/expeditions.ts
	expedition: ExpeditionState | null
}

export const INITIAL_SAVE: SaveState = {
	facts: {},
	unlockedStage: 0,
	celebratedStage: 0,
	ownedMonsters: {},
	iskierki: 0,
	eggFragments: 0,
	eggStarBank: 0,
	eggsEarned: 0,
	pendingEggs: [],
	dreamMonsterId: null,
	companionId: null,
	totalRounds: 0,
	achievements: {},
	achievementStats: {
		perfectRounds: 0,
		divCorrect: 0,
		gapCorrect: 0,
		totalStars: 0,
		rainbowEggsHatched: 0,
		wishEggsBought: 0,
		daysPlayed: 0,
		lastPlayedDay: "",
		expeditionsCompleted: 0,
		visitRoundsCompleted: 0,
	},
	village: INITIAL_VILLAGE,
	cosmetics: INITIAL_COSMETICS,
	expedition: null,
}

export const SAVE_KEYS = Object.keys(INITIAL_SAVE) as (keyof SaveState)[]

// Migracje: MIGRATIONS[v] przeprowadza zapis z wersji v do v+1.
// Wzorzec — gdy podbijasz SAVE_VERSION do N, dodaj:
//   N-1: state => ({ ...(state as Record<string, unknown>), nowePole: wartoscDomyslna }),
export const MIGRATIONS: Record<number, (state: unknown) => unknown> = {
	// v1→v2: dodano eggsEarned. Estymujemy z dotychczasowego postępu (posiadane + w gnieździe),
	// żeby próg fragmentów nie zresetował się do najtańszego — dziecko już sporo wykluło.
	1: (state) => {
		const s = state as Record<string, unknown>
		const owned =
			s.ownedMonsters && typeof s.ownedMonsters === "object"
				? Object.keys(s.ownedMonsters).length
				: 0
		const pending = Array.isArray(s.pendingEggs) ? s.pendingEggs.length : 0
		return { ...s, eggsEarned: owned + pending }
	},
	// v2→v3: dodano celebratedStage (mapa „Kraina Potworków"). Ustawiamy na bieżący
	// unlockedStage, żeby obecni gracze nie dostali animacji dla już otwartych bram.
	2: (state) => {
		const s = state as Record<string, unknown>
		return {
			...s,
			celebratedStage:
				typeof s.unlockedStage === "number" ? s.unlockedStage : 0,
		}
	},
	// v3→v4: PendingEgg zyskał `mode` (tryb, w którym jajko powstało). Istniejące
	// jajka traktujemy jak mnożeniowe — nie dawały dotąd legendarnych tylko-dzielenie.
	3: (state) => {
		const s = state as Record<string, unknown>
		const pendingEggs = Array.isArray(s.pendingEggs)
			? s.pendingEggs.map((egg) =>
					egg && typeof egg === "object" && !("mode" in egg)
						? { ...egg, mode: "mult" }
						: egg,
				)
			: s.pendingEggs
		return { ...s, pendingEggs }
	},
	// v4→v5: dodano eggStarBank (gwiazdki budujące bieżące jajko → jego kolor przy
	// domknięciu). Dotychczasowe fragmenty zaliczamy po 2★ — wartość neutralna: nie
	// karze (postęp dziecka święty), ale i nie rozdaje za darmo tęczowych.
	4: (state) => {
		const s = state as Record<string, unknown>
		const frags = typeof s.eggFragments === "number" ? s.eggFragments : 0
		return { ...s, eggStarBank: frags * 2 }
	},
	// v5→v6: dodano osiągnięcia. Ledger startuje pusty, liczniki zdarzeniowe od zera.
	// Zasłużone osiągnięcia liczone z istniejącego zapisu odblokowuje po cichu (+ iskierki)
	// reconcileAchievements() w store przy starcie — nie tutaj (migracja widzi surowy stan).
	5: (state) => ({
		...(state as Record<string, unknown>),
		achievements: {},
		achievementStats: {
			perfectRounds: 0,
			divCorrect: 0,
			totalStars: 0,
			rainbowEggsHatched: 0,
			wishEggsBought: 0,
		},
	}),
	// v6→v7: licznik regularności (daysPlayed + lastPlayedDay). Dopisujemy do istniejących
	// achievementStats — historii dni nie da się odtworzyć, więc startujemy od zera (dni
	// liczą się dopiero od teraz; uczciwe, nie karze). reconcile go nie odblokuje wstecz.
	6: (state) => {
		const s = state as Record<string, unknown>
		const stats =
			s.achievementStats && typeof s.achievementStats === "object"
				? (s.achievementStats as Record<string, unknown>)
				: {}
		return {
			...s,
			achievementStats: { ...stats, daysPlayed: 0, lastPlayedDay: "" },
		}
	},
	// v7→v8: dodano companionId (ulubiony przyjaciel na ekranie głównym). Start: null —
	// Home renderuje wtedy najnowszego potworka jak dotąd, więc brak przyjaciela niczego
	// nie psuje (zero regresji). Dziecko wybiera przyjaciela w „Moich Potworkach".
	7: (state) => ({
		...(state as Record<string, unknown>),
		companionId: null,
	}),
	// v8→v9: dodano wioskę budowniczych (budynki + dekoracje za iskierki, wybrany
	// cel). Start pusty — dotychczasowe iskierki dziecka zostają nietknięte i od
	// razu ma za co je wydać.
	8: (state) => ({
		...(state as Record<string, unknown>),
		village: { buildings: {}, decorations: [], goalId: null },
	}),
	// v9→v10: licznik gapCorrect (tryb „brakujący czynnik", plan 015). Dopisujemy do
	// istniejących achievementStats od zera — tryb dopiero się pojawia (wzorzec v6→v7).
	9: (state) => {
		const s = state as Record<string, unknown>
		const stats =
			s.achievementStats && typeof s.achievementStats === "object"
				? (s.achievementStats as Record<string, unknown>)
				: {}
		return {
			...s,
			achievementStats: { ...stats, gapCorrect: 0 },
		}
	},
	// v10→v11: dodano garderobę (kosmetyka per-potworek ze Sklepiku, plan 013).
	// Start pusty — przedmioty kupuje się w sklepiku, zakłada w Moich Potworkach.
	10: (state) => ({
		...(state as Record<string, unknown>),
		cosmetics: { owned: [], equipped: {} },
	}),
	// v11→v12: dodano wyprawy potworków (plan 017). Start: nikt nie jest w drodze;
	// licznik ukończonych wypraw od zera (mechanika liczy się od wdrożenia — wzorzec
	// dni-grania, reconcile nie nadrabia wstecz).
	11: (state) => {
		const s = state as Record<string, unknown>
		const stats =
			s.achievementStats && typeof s.achievementStats === "object"
				? (s.achievementStats as Record<string, unknown>)
				: {}
		return {
			...s,
			expedition: null,
			achievementStats: { ...stats, expeditionsCompleted: 0 },
		}
	},
	// v12→v13: wycofano kosmetyk "aura-iskier" (nieudany wizualnie). Właściciel
	// dostaje zwrot pełnej ceny (60✨, cap portfela), wpisy z garderoby znikają —
	// zapis niczego nie traci (postęp dziecka święty). equippedFor dodatkowo
	// filtruje id spoza katalogu, więc nieprzemigrowane resztki są neutralne.
	12: (state) => {
		const s = state as Record<string, unknown>
		const c =
			s.cosmetics && typeof s.cosmetics === "object"
				? (s.cosmetics as Record<string, unknown>)
				: null
		if (!c) return { ...s }
		const owned = Array.isArray(c.owned) ? c.owned : []
		const had = owned.includes("aura-iskier")
		const equippedRaw =
			c.equipped && typeof c.equipped === "object"
				? (c.equipped as Record<string, Record<string, unknown>>)
				: {}
		const equipped: Record<string, Record<string, unknown>> = {}
		for (const [mid, slots] of Object.entries(equippedRaw)) {
			const rest: Record<string, unknown> = {}
			for (const [slot, id] of Object.entries(slots ?? {})) {
				if (id !== "aura-iskier") rest[slot] = id
			}
			equipped[mid] = rest
		}
		const iskierki = typeof s.iskierki === "number" ? s.iskierki : 0
		return {
			...s,
			iskierki: had ? Math.min(ISKIERKI_CAP, iskierki + 60) : iskierki,
			cosmetics: {
				...c,
				owned: owned.filter((id) => id !== "aura-iskier"),
				equipped,
			},
		}
	},
	// v13→v14: licznik rund-odwiedzin u Strażnika (osiągnięcie „gość Strażnika") —
	// wizyt nie da się odtworzyć wstecz, start od zera (wzorzec v6→v7/daysPlayed).
	13: (state) => {
		const s = state as Record<string, unknown>
		const stats =
			s.achievementStats && typeof s.achievementStats === "object"
				? (s.achievementStats as Record<string, unknown>)
				: {}
		return {
			...s,
			achievementStats: { ...stats, visitRoundsCompleted: 0 },
		}
	},
}

export function migrateSave(state: unknown, fromVersion: number): unknown {
	let migrated = state
	for (let v = fromVersion; v < SAVE_VERSION; v++) {
		const step = MIGRATIONS[v]
		if (step) migrated = step(migrated)
	}
	return migrated
}
