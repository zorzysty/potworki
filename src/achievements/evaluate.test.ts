/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { ALL_FACTS, STAGES } from "../game/facts"
import { BUILDINGS, DECORATIONS, MAX_BUILDING_LEVEL } from "../game/village"
import { MONSTER_COUNT } from "../monsters/catalog"
import type { AchievementCounters, SaveState } from "../store/schema"
import { INITIAL_SAVE } from "../store/schema"
import { ACHIEVEMENTS, REWARD_BY_DIFFICULTY } from "./catalog"
import {
	achievementRows,
	claimAchievement,
	unlockAchievements,
} from "./evaluate"

const maxCounters: AchievementCounters = {
	perfectRounds: 25,
	divCorrect: 200,
	gapCorrect: 50,
	totalStars: 1500,
	rainbowEggsHatched: 3,
	wishEggsBought: 5,
	daysPlayed: 21,
	lastPlayedDay: "2026-1-1",
	expeditionsCompleted: 10,
	visitRoundsCompleted: 5,
	pairsCorrect: 500,
	feedCorrect: 500,
}
const maxSave: SaveState = {
	...INITIAL_SAVE,
	facts: Object.fromEntries(
		ALL_FACTS.map((f) => [
			f.key,
			{
				attempts: 5,
				correct: 5,
				streak: 5,
				mastery: 1,
				lastSeen: 0,
				mastered: true,
			},
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
	cosmetics: {
		owned: ["kokarda", "aura-teczy"],
		equipped: { 0: { hat: "kokarda", aura: "aura-teczy" } },
	},
	village: {
		buildings: Object.fromEntries(
			BUILDINGS.map((b) => [b.id, MAX_BUILDING_LEVEL]),
		),
		decorations: DECORATIONS.map((d) => d.id),
		goalId: null,
	},
}

describe("unlockAchievements", () => {
	test("czysty zapis → nic nie odblokowane, ledger bez zmian", () => {
		const r = unlockAchievements(INITIAL_SAVE, 7)
		expect(r.newlyUnlocked).toEqual([])
		expect(r.achievements).toEqual({})
	})

	test("maksymalny zapis → wszystkie 63, każde nieodebrane ze stemplem now", () => {
		const r = unlockAchievements(maxSave, 7)
		expect(r.newlyUnlocked.length).toBe(ACHIEVEMENTS.length)
		for (const id of r.newlyUnlocked)
			expect(r.achievements[id]).toEqual({ unlockedAt: 7, claimed: false })
	})

	test("idempotencja: ponowne wywołanie na zwróconym ledgerze nic nie dodaje", () => {
		const first = unlockAchievements(maxSave, 7)
		const again = unlockAchievements(
			{ ...maxSave, achievements: first.achievements },
			8,
		)
		expect(again.newlyUnlocked).toEqual([])
		expect(again.achievements).toEqual(first.achievements)
	})

	test("częściowy postęp: tylko spełnione; już zapisane pomijane", () => {
		// 1 runda + 1 potworek → 'pierwsza-runda' i 'pierwszy-potwor'
		const save: SaveState = {
			...INITIAL_SAVE,
			totalRounds: 1,
			ownedMonsters: { 0: { hatchedAt: 0 } },
		}
		expect(unlockAchievements(save, 1).newlyUnlocked.sort()).toEqual([
			"pierwsza-runda",
			"pierwszy-potwor",
		])
		const partial = {
			...save,
			achievements: { "pierwsza-runda": { unlockedAt: 0, claimed: true } },
		}
		expect(unlockAchievements(partial, 1).newlyUnlocked).toEqual([
			"pierwszy-potwor",
		])
	})
})

describe("claimAchievement", () => {
	test("wypłaca nagrodę wg trudności raz; niezdobyte/odebrane/nieznane = null", () => {
		const save = {
			achievements: { "pierwsza-runda": { unlockedAt: 0, claimed: false } },
		}
		const r = claimAchievement(save, "pierwsza-runda")
		expect(r?.reward).toBe(REWARD_BY_DIFFICULTY.easy)
		expect(r?.achievements["pierwsza-runda"]?.claimed).toBe(true)
		expect(claimAchievement(r ?? save, "pierwsza-runda")).toBeNull()
		expect(claimAchievement(save, "kolekcja-80")).toBeNull()
		expect(claimAchievement(save, "nie-ma-takiego")).toBeNull()
	})
})

describe("achievementRows", () => {
	test("kolejność: do odebrania → zdobyte → niezdobyte, w grupie wg nagrody", () => {
		const save: SaveState = {
			...INITIAL_SAVE,
			achievements: {
				"pierwsza-runda": { unlockedAt: 0, claimed: false },
				"pierwszy-potwor": { unlockedAt: 0, claimed: true },
			},
		}
		const rows = achievementRows(save)
		expect(rows.length).toBe(ACHIEVEMENTS.length)
		expect(rows[0]?.def.id).toBe("pierwsza-runda")
		expect(rows[1]?.def.id).toBe("pierwszy-potwor")
		const rest = rows.slice(2)
		expect(rest.every((r) => !r.unlocked)).toBe(true)
		const rewards = rest.map((r) => REWARD_BY_DIFFICULTY[r.def.difficulty])
		expect(rewards).toEqual([...rewards].sort((a, b) => a - b))
	})

	test("zdobyte zostaje zdobyte: pasek pełny, choć zasób spadł", () => {
		// „Skarbnica iskier" (100 ✨) zdobyta, iskierki wydane do zera
		const save: SaveState = {
			...INITIAL_SAVE,
			iskierki: 0,
			achievements: { "skarbnica-iskier": { unlockedAt: 0, claimed: true } },
		}
		const row = achievementRows(save).find(
			(r) => r.def.id === "skarbnica-iskier",
		)
		expect(row?.unlocked).toBe(true)
		expect(row?.progress.current).toBe(100)
		expect(row?.progress.ratio).toBe(1)
	})
})
