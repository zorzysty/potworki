import { ALL_FACTS, isMaxStage, STAGES } from "../game/facts"
import {
	DIVISION_ONLY_IDS,
	IDS_BY_RARITY,
	MONSTER_COUNT,
} from "../monsters/catalog"
import { REGIONS } from "../monsters/world"
import type { AchievementCounters, SaveState } from "../store/schema"

// Trudność steruje nagrodą w iskierkach.
export type Difficulty = "easy" | "medium" | "hard" | "legendary"

export const REWARD_BY_DIFFICULTY: Record<Difficulty, number> = {
	easy: 5,
	medium: 10,
	hard: 15,
	legendary: 25,
}

// Próg „opanowanego" działania dla osiągnięć — wyżej niż UNLOCK_THRESHOLD (0.65),
// bo „opanować" to coś więcej niż „odblokować następną bramę". Mastery rośnie
// asymptotycznie (cap ~0.95), więc 0.8 ≈ kilka szybkich poprawnych odpowiedzi.
export const MASTERY_GOAL = 0.8

// Kontekst oceny: trwały zapis + liczniki zdarzeniowe (oba z SaveState).
export interface AchievementCtx {
	save: SaveState
	counters: AchievementCounters
}

export interface AchievementDef {
	// Stabilny klucz persystowany w SaveState.achievements — NIGDY nie zmieniać po
	// wydaniu (zapis dziecka odwołuje się do id). Tytuł/opis można edytować dowolnie.
	id: string
	title: string // PL, dla gracza (robocze — do dopracowania)
	description: string // PL, dla gracza
	icon: string // emoji
	difficulty: Difficulty
	// Czysta funkcja postępu — current>=target ⇒ zdobyte; current/target ⇒ pasek.
	progress: (ctx: AchievementCtx) => { current: number; target: number }
}

// --- helpery liczące z zapisu (czyste) ---

function ownedCount(save: SaveState): number {
	return Object.keys(save.ownedMonsters).length
}

function ownedOfRarity(
	save: SaveState,
	rarity: keyof typeof IDS_BY_RARITY,
): number {
	return IDS_BY_RARITY[rarity].filter((id) => id in save.ownedMonsters).length
}

function masteredCount(save: SaveState): number {
	return ALL_FACTS.filter(
		(f) => (save.facts[f.key]?.mastery ?? 0) >= MASTERY_GOAL,
	).length
}

// Działania zawierające dany czynnik (cała „tabliczka ×n", 10 sztuk).
function factsForFactor(n: number): number {
	return ALL_FACTS.filter((f) => f.a === n || f.b === n).length
}

function masteredForFactor(save: SaveState, n: number): number {
	return ALL_FACTS.filter(
		(f) =>
			(f.a === n || f.b === n) &&
			(save.facts[f.key]?.mastery ?? 0) >= MASTERY_GOAL,
	).length
}

function ownedDivisionOnly(save: SaveState): number {
	let n = 0
	for (const id of DIVISION_ONLY_IDS) if (id in save.ownedMonsters) n++
	return n
}

// Ilu strażników krain (po jednym na region) już posiadamy.
function ownedGuardians(save: SaveState): number {
	return REGIONS.filter((r) => r.guardianId in save.ownedMonsters).length
}

const MAX_STAGE = STAGES.length - 1

// 41 osiągnięć. Tytuły/opisy są robocze (do dopracowania); id są stabilne.
// Trudność (easy/medium/hard/legendary → 5/10/15/25 iskierek) jest per-wpis w polu
// `difficulty`; kolejność tablicy = tripwire persystencji, nie grupowanie wg trudności.
export const ACHIEVEMENTS: readonly AchievementDef[] = [
	{
		id: "pierwsza-runda",
		title: "Pierwszy krok",
		description: "Zagraj swoją pierwszą rundę.",
		icon: "🎮",
		difficulty: "easy",
		progress: ({ save }) => ({ current: save.totalRounds, target: 1 }),
	},
	{
		id: "pierwszy-potwor",
		title: "Nowy przyjaciel",
		description: "Zdobądź swojego pierwszego potworka.",
		icon: "👾",
		difficulty: "easy",
		progress: ({ save }) => ({ current: ownedCount(save), target: 1 }),
	},
	{
		id: "pierwsze-jajko",
		title: "Jajko gotowe!",
		description: "Uzbieraj swoje pierwsze jajko.",
		icon: "🥚",
		difficulty: "easy",
		progress: ({ save }) => ({ current: save.eggsEarned, target: 1 }),
	},
	{
		id: "pierwsze-dzielenie",
		title: "Dzielę i rządzę",
		description: "Odpowiedz poprawnie w trybie dzielenia.",
		icon: "➗",
		difficulty: "easy",
		progress: ({ counters }) => ({ current: counters.divCorrect, target: 1 }),
	},
	{
		id: "kolekcja-5",
		title: "Mała drużyna",
		description: "Zbierz 5 potworków.",
		icon: "🐣",
		difficulty: "easy",
		progress: ({ save }) => ({ current: ownedCount(save), target: 5 }),
	},
	{
		id: "brama-1",
		title: "Odkrywca krain",
		description: "Otwórz swoją pierwszą nową bramę.",
		icon: "🚪",
		difficulty: "easy",
		progress: ({ save }) => ({ current: save.unlockedStage, target: 1 }),
	},
	{
		id: "opanuj-5",
		title: "Pierwsze sukcesy",
		description: "Opanuj 5 różnych działań.",
		icon: "✨",
		difficulty: "easy",
		progress: ({ save }) => ({ current: masteredCount(save), target: 5 }),
	},

	{
		id: "kolekcja-15",
		title: "Kolekcjoner",
		description: "Zbierz 15 potworków.",
		icon: "📦",
		difficulty: "medium",
		progress: ({ save }) => ({ current: ownedCount(save), target: 15 }),
	},
	{
		id: "pierwszy-legendarny",
		title: "Legenda!",
		description: "Zdobądź swojego pierwszego legendarnego potworka.",
		icon: "👑",
		difficulty: "medium",
		progress: ({ save }) => ({
			current: ownedOfRarity(save, "legendary"),
			target: 1,
		}),
	},
	{
		id: "komplet-pospolitych",
		title: "Komplet pospolitych",
		description: "Zbierz wszystkie pospolite potworki.",
		icon: "🤍",
		difficulty: "hard",
		progress: ({ save }) => ({
			current: ownedOfRarity(save, "common"),
			target: IDS_BY_RARITY.common.length,
		}),
	},
	{
		id: "jajka-10",
		title: "Gospodarz gniazda",
		description: "Uzbieraj 10 jajek.",
		icon: "🪺",
		difficulty: "medium",
		progress: ({ save }) => ({ current: save.eggsEarned, target: 10 }),
	},
	{
		id: "jajko-zyczen",
		title: "Spełnione życzenie",
		description: "Wyczaruj Jajko Życzeń.",
		icon: "🌟",
		difficulty: "medium",
		progress: ({ counters }) => ({
			current: counters.wishEggsBought,
			target: 1,
		}),
	},
	{
		id: "mistrz-siodemek",
		title: "Mistrz siódemek",
		description: "Opanuj całą tabliczkę z siódemką.",
		icon: "7️⃣",
		difficulty: "medium",
		progress: ({ save }) => ({
			current: masteredForFactor(save, 7),
			target: factsForFactor(7),
		}),
	},
	{
		id: "opanuj-30",
		title: "Połowa drogi",
		description: "Opanuj 30 różnych działań.",
		icon: "📈",
		difficulty: "medium",
		progress: ({ save }) => ({ current: masteredCount(save), target: 30 }),
	},
	{
		id: "dzielenie-50",
		title: "As dzielenia",
		description: "Odpowiedz poprawnie 50 razy w trybie dzielenia.",
		icon: "🧮",
		difficulty: "medium",
		progress: ({ counters }) => ({ current: counters.divCorrect, target: 50 }),
	},
	{
		id: "rundy-25",
		title: "Wytrwały",
		description: "Zagraj 25 rund.",
		icon: "🔥",
		difficulty: "medium",
		progress: ({ save }) => ({ current: save.totalRounds, target: 25 }),
	},
	{
		id: "gwiazdki-500",
		title: "Łowca gwiazd",
		description: "Zbierz łącznie 500 gwiazdek.",
		icon: "⭐",
		difficulty: "medium",
		progress: ({ counters }) => ({ current: counters.totalStars, target: 500 }),
	},

	{
		id: "kolekcja-40",
		title: "Wielki łowca",
		description: "Zbierz 40 potworków.",
		icon: "🏹",
		difficulty: "hard",
		progress: ({ save }) => ({ current: ownedCount(save), target: 40 }),
	},
	{
		id: "kolekcja-komplet",
		title: "Mistrz Kolekcji",
		description: "Zbierz wszystkie potworki.",
		icon: "🏆",
		difficulty: "legendary",
		progress: ({ save }) => ({
			current: ownedCount(save),
			target: MONSTER_COUNT,
		}),
	},
	{
		id: "komplet-epickich",
		title: "Komplet epickich",
		description: "Zbierz wszystkie epickie potworki.",
		icon: "💜",
		difficulty: "hard",
		progress: ({ save }) => ({
			current: ownedOfRarity(save, "epic"),
			target: IDS_BY_RARITY.epic.length,
		}),
	},
	{
		id: "teczowe-jajko",
		title: "Tęczowa niespodzianka",
		description: "Wykluj tęczowe jajko.",
		icon: "🌈",
		difficulty: "medium",
		progress: ({ counters }) => ({
			current: counters.rainbowEggsHatched,
			target: 1,
		}),
	},
	{
		id: "opanuj-wszystko",
		title: "Mistrz tabliczki",
		description: "Opanuj wszystkie działania.",
		icon: "🧠",
		difficulty: "legendary",
		progress: ({ save }) => ({
			current: masteredCount(save),
			target: ALL_FACTS.length,
		}),
	},
	{
		id: "wszystkie-bramy",
		title: "Władca Krain",
		description: "Otwórz wszystkie bramy.",
		icon: "🗺️",
		difficulty: "hard",
		progress: ({ save }) => ({
			current: isMaxStage(save.unlockedStage) ? MAX_STAGE : save.unlockedStage,
			target: MAX_STAGE,
		}),
	},
	{
		id: "straznik-mostu",
		title: "Strażnik Mostu",
		description: "Zdobądź legendarnego potworka tylko z dzielenia.",
		icon: "🌉",
		difficulty: "hard",
		progress: ({ save }) => ({ current: ownedDivisionOnly(save), target: 1 }),
	},
	{
		id: "bez-pomylki",
		title: "Bez pomyłki!",
		description: "Zakończ rundę z kompletem gwiazdek (30/30).",
		icon: "💯",
		difficulty: "medium",
		progress: ({ counters }) => ({
			current: counters.perfectRounds,
			target: 1,
		}),
	},

	{
		id: "mistrz-osemek",
		title: "Mistrz ósemek",
		description: "Opanuj całą tabliczkę z ósemką.",
		icon: "8️⃣",
		difficulty: "hard",
		progress: ({ save }) => ({
			current: masteredForFactor(save, 8),
			target: factsForFactor(8),
		}),
	},
	{
		id: "skarbnica-iskier",
		title: "Skarbnica iskier",
		description: "Uzbieraj 100 iskierek.",
		icon: "💰",
		difficulty: "medium",
		progress: ({ save }) => ({ current: save.iskierki, target: 100 }),
	},
	{
		id: "kolekcjoner-teczy",
		title: "Kolekcjoner tęczy",
		description: "Wykluj 3 tęczowe jajka.",
		icon: "🦄",
		difficulty: "hard",
		progress: ({ counters }) => ({
			current: counters.rainbowEggsHatched,
			target: 3,
		}),
	},
	{
		id: "jajka-25",
		title: "Pełne gniazdo",
		description: "Uzbieraj 25 jajek.",
		icon: "🐥",
		difficulty: "hard",
		progress: ({ save }) => ({ current: save.eggsEarned, target: 25 }),
	},
	{
		id: "jajka-zyczen-5",
		title: "Mistrz życzeń",
		description: "Wyczaruj 5 Jajek Życzeń.",
		icon: "🌠",
		difficulty: "hard",
		progress: ({ counters }) => ({
			current: counters.wishEggsBought,
			target: 5,
		}),
	},
	{
		id: "dni-grania",
		title: "Codzienny trening",
		description: "Zagraj w 7 różnych dni.",
		icon: "📅",
		difficulty: "medium",
		progress: ({ counters }) => ({ current: counters.daysPlayed, target: 7 }),
	},
	{
		id: "komplet-rzadkich",
		title: "Komplet rzadkich",
		description: "Zbierz wszystkie rzadkie potworki.",
		icon: "💎",
		difficulty: "hard",
		progress: ({ save }) => ({
			current: ownedOfRarity(save, "rare"),
			target: IDS_BY_RARITY.rare.length,
		}),
	},
	{
		id: "komplet-legendarnych",
		title: "Komplet legendarnych",
		description: "Zbierz wszystkie legendarne potworki.",
		icon: "💛",
		difficulty: "legendary",
		progress: ({ save }) => ({
			current: ownedOfRarity(save, "legendary"),
			target: IDS_BY_RARITY.legendary.length,
		}),
	},
	{
		id: "straznicy-krain",
		title: "Strażnicy Krain",
		description: "Zdobądź strażnika każdej krainy.",
		icon: "🛡️",
		difficulty: "hard",
		progress: ({ save }) => ({
			current: ownedGuardians(save),
			target: REGIONS.length,
		}),
	},
	{
		id: "wszyscy-straznicy-mostu",
		title: "Strażnicy Mostu",
		description: "Zdobądź wszystkie legendarne potworki z dzielenia.",
		icon: "🐉",
		difficulty: "hard",
		progress: ({ save }) => ({
			current: ownedDivisionOnly(save),
			target: DIVISION_ONLY_IDS.size,
		}),
	},
	{
		id: "mistrz-dzielenia",
		title: "Mistrz dzielenia",
		description: "Odpowiedz poprawnie 200 razy w trybie dzielenia.",
		icon: "🎓",
		difficulty: "hard",
		progress: ({ counters }) => ({
			current: counters.divCorrect,
			target: 200,
		}),
	},
	{
		id: "perfekcyjne-25",
		title: "Perfekcjonista",
		description: "Zakończ 25 rund z kompletem gwiazdek (30/30).",
		icon: "🎯",
		difficulty: "hard",
		progress: ({ counters }) => ({
			current: counters.perfectRounds,
			target: 25,
		}),
	},
	{
		id: "rundy-100",
		title: "Niezłomny",
		description: "Zagraj 100 rund.",
		icon: "💪",
		difficulty: "hard",
		progress: ({ save }) => ({ current: save.totalRounds, target: 100 }),
	},
	{
		id: "gwiazdki-1500",
		title: "Łowca konstelacji",
		description: "Zbierz łącznie 1500 gwiazdek.",
		icon: "🌟",
		difficulty: "hard",
		progress: ({ counters }) => ({
			current: counters.totalStars,
			target: 1500,
		}),
	},
	{
		id: "dni-grania-14",
		title: "Codzienny trening II",
		description: "Zagraj w 14 różnych dni.",
		icon: "📆",
		difficulty: "hard",
		progress: ({ counters }) => ({ current: counters.daysPlayed, target: 14 }),
	},
	{
		id: "dni-grania-21",
		title: "Codzienny trening III",
		description: "Zagraj w 21 różnych dni.",
		icon: "🗓️",
		difficulty: "legendary",
		progress: ({ counters }) => ({ current: counters.daysPlayed, target: 21 }),
	},
]
