/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { ALL_FACTS, STAGES } from "../game/facts"
import { MONSTER_COUNT } from "../monsters/catalog"
import type { AchievementCounters, SaveState } from "../store/schema"
import { INITIAL_SAVE } from "../store/schema"
import {
	ACHIEVEMENTS,
	type AchievementCtx,
	REWARD_BY_DIFFICULTY,
} from "./catalog"
import { evaluateAchievements } from "./evaluate"

const maxCounters: AchievementCounters = {
	perfectRounds: 5,
	divCorrect: 100,
	totalStars: 1000,
	rainbowEggsHatched: 3,
	wishEggsBought: 2,
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
	achievementStats: maxCounters,
}
const maxCtx: AchievementCtx = { save: maxSave, counters: maxCounters }
const emptyCtx: AchievementCtx = {
	save: INITIAL_SAVE,
	counters: INITIAL_SAVE.achievementStats,
}

const TOTAL_REWARD = ACHIEVEMENTS.reduce(
	(s, a) => s + REWARD_BY_DIFFICULTY[a.difficulty],
	0,
)

describe("evaluateAchievements", () => {
	test("czysty zapis → nic nie odblokowane, 0 iskierek", () => {
		const r = evaluateAchievements(emptyCtx, new Set())
		expect(r.newlyUnlocked).toEqual([])
		expect(r.iskierkiReward).toBe(0)
	})

	test("maksymalny zapis → wszystkie 25 + pełna nagroda (255)", () => {
		const r = evaluateAchievements(maxCtx, new Set())
		expect(r.newlyUnlocked.length).toBe(ACHIEVEMENTS.length)
		expect(r.iskierkiReward).toBe(TOTAL_REWARD)
		expect(r.iskierkiReward).toBe(255)
	})

	test("idempotencja: już zdobyte nie wpadają ponownie ani nie naliczają iskierek", () => {
		const all = new Set(ACHIEVEMENTS.map((a) => a.id))
		const r = evaluateAchievements(maxCtx, all)
		expect(r.newlyUnlocked).toEqual([])
		expect(r.iskierkiReward).toBe(0)
	})

	test("częściowy postęp: tylko spełnione, z poprawną nagrodą", () => {
		// 1 runda + 1 potworek → odblokowuje 'pierwsza-runda' i 'pierwszy-potwor' (po 5)
		const save: SaveState = {
			...INITIAL_SAVE,
			totalRounds: 1,
			ownedMonsters: { 0: { hatchedAt: 0 } },
		}
		const r = evaluateAchievements(
			{ save, counters: save.achievementStats },
			new Set(),
		)
		expect(r.newlyUnlocked.sort()).toEqual([
			"pierwsza-runda",
			"pierwszy-potwor",
		])
		expect(r.iskierkiReward).toBe(
			REWARD_BY_DIFFICULTY.easy + REWARD_BY_DIFFICULTY.easy,
		)
	})

	test("częściowy postęp pomija to, co już w alreadyUnlocked", () => {
		const save: SaveState = { ...INITIAL_SAVE, totalRounds: 1 }
		const r = evaluateAchievements(
			{ save, counters: save.achievementStats },
			new Set(["pierwsza-runda"]),
		)
		expect(r.newlyUnlocked).toEqual([])
		expect(r.iskierkiReward).toBe(0)
	})
})
