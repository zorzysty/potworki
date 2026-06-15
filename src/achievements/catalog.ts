import { ALL_FACTS, isMaxStage, STAGES } from "../game/facts"
import {
  DIVISION_ONLY_IDS,
  IDS_BY_RARITY,
  MONSTER_COUNT,
} from "../monsters/catalog"
import type { AchievementCounters, SaveState } from "../store/schema"

// Trudność steruje nagrodą w iskierkach.
export type Difficulty = "easy" | "medium" | "hard"

export const REWARD_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 15,
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

const MAX_STAGE = STAGES.length - 1

// 25 osiągnięć. Tytuły/opisy są robocze (do dopracowania); id są stabilne.
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ===== ŁATWE (5 iskierek) =====
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

  // ===== ŚREDNIE (10 iskierek) =====
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
    difficulty: "medium",
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

  // ===== TRUDNE (15 iskierek) =====
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
    difficulty: "hard",
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
    difficulty: "hard",
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
    difficulty: "hard",
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
    difficulty: "easy",
    progress: ({ counters }) => ({
      current: counters.perfectRounds,
      target: 1,
    }),
  },
]
