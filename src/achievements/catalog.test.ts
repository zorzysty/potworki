/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { ALL_FACTS, STAGES } from "../game/facts"
import { BUILDINGS, MAX_BUILDING_LEVEL } from "../game/village"
import { MONSTER_COUNT } from "../monsters/catalog"
import type { AchievementCounters, SaveState } from "../store/schema"
import { INITIAL_SAVE } from "../store/schema"
import {
	ACHIEVEMENTS,
	type AchievementCtx,
	REWARD_BY_DIFFICULTY,
} from "./catalog"
import { achievementProgress } from "./evaluate"

// Zapis spełniający KAŻDE osiągnięcie: pełna kolekcja, maks etap, wszystkie działania
// opanowane, duże liczniki zdarzeniowe.
const maxCounters: AchievementCounters = {
	perfectRounds: 25,
	divCorrect: 200,
	gapCorrect: 50,
	totalStars: 1500,
	rainbowEggsHatched: 3,
	wishEggsBought: 5,
	daysPlayed: 21,
	lastPlayedDay: "2026-1-1",
}
const maxSave: SaveState = {
	...INITIAL_SAVE,
	facts: Object.fromEntries(
		ALL_FACTS.map((f) => [
			f.key,
			{ attempts: 5, correct: 5, streak: 5, mastery: 1, lastSeen: 0 },
		]),
	),
	ownedMonsters: Object.fromEntries(
		Array.from({ length: MONSTER_COUNT }, (_, id) => [id, { hatchedAt: 0 }]),
	),
	unlockedStage: STAGES.length - 1,
	eggsEarned: 100,
	totalRounds: 100,
	iskierki: 1000,
	achievementStats: maxCounters,
	village: {
		buildings: Object.fromEntries(
			BUILDINGS.map((b) => [b.id, MAX_BUILDING_LEVEL]),
		),
		decorations: [],
		goalId: null,
	},
}
const maxCtx: AchievementCtx = { save: maxSave, counters: maxCounters }
const emptyCtx: AchievementCtx = {
	save: INITIAL_SAVE,
	counters: INITIAL_SAVE.achievementStats,
}

describe("ACHIEVEMENTS catalog", () => {
	test("jest dokładnie 46 osiągnięć", () => {
		expect(ACHIEVEMENTS.length).toBe(46)
	})

	test("id są unikalne", () => {
		const ids = ACHIEVEMENTS.map((a) => a.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	// Tripwire: id są persystowane w SaveState.achievements — rename/usunięcie psuje
	// zapis dziecka. Zmiana tej listy musi być świadoma (i przemyślana migracja).
	test("lista id zamrożona (kolejność z catalog)", () => {
		expect(ACHIEVEMENTS.map((a) => a.id)).toEqual([
			"pierwsza-runda",
			"pierwszy-potwor",
			"pierwsze-jajko",
			"pierwsze-dzielenie",
			"kolekcja-5",
			"brama-1",
			"opanuj-5",
			"kolekcja-15",
			"pierwszy-legendarny",
			"komplet-pospolitych",
			"jajka-10",
			"jajko-zyczen",
			"mistrz-siodemek",
			"opanuj-30",
			"dzielenie-50",
			"rundy-25",
			"gwiazdki-500",
			"kolekcja-40",
			"kolekcja-komplet",
			"komplet-epickich",
			"teczowe-jajko",
			"opanuj-wszystko",
			"wszystkie-bramy",
			"straznik-mostu",
			"bez-pomylki",
			"mistrz-osemek",
			"skarbnica-iskier",
			"kolekcjoner-teczy",
			"jajka-25",
			"jajka-zyczen-5",
			"dni-grania",
			"komplet-rzadkich",
			"komplet-legendarnych",
			"straznicy-krain",
			"wszyscy-straznicy-mostu",
			"mistrz-dzielenia",
			"perfekcyjne-25",
			"rundy-100",
			"gwiazdki-1500",
			"dni-grania-14",
			"dni-grania-21",
			"pierwsza-budowla",
			"wioska-w-rozkwicie",
			"wielki-budowniczy",
			"pierwsza-luka",
			"luka-50",
		])
	})

	test("każde ma poprawną trudność i niepuste teksty", () => {
		for (const a of ACHIEVEMENTS) {
			expect(REWARD_BY_DIFFICULTY[a.difficulty]).toBeGreaterThan(0)
			expect(a.title.length).toBeGreaterThan(0)
			expect(a.description.length).toBeGreaterThan(0)
			expect(a.icon.length).toBeGreaterThan(0)
		}
	})

	test("na czystym zapisie: target>0, current>=0, nic nie zdobyte", () => {
		for (const a of ACHIEVEMENTS) {
			const p = achievementProgress(a, emptyCtx)
			expect(p.target).toBeGreaterThan(0)
			expect(p.current).toBeGreaterThanOrEqual(0)
			expect(p.unlocked).toBe(false)
		}
	})

	test("na maksymalnym zapisie: wszystkie zdobyte", () => {
		for (const a of ACHIEVEMENTS) {
			expect(achievementProgress(a, maxCtx).unlocked).toBe(true)
		}
	})

	test("ratio jest w zakresie 0..1", () => {
		for (const a of ACHIEVEMENTS) {
			const p = achievementProgress(a, maxCtx)
			expect(p.ratio).toBeGreaterThanOrEqual(0)
			expect(p.ratio).toBeLessThanOrEqual(1)
		}
	})
})
