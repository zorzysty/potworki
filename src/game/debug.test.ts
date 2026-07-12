/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import { INITIAL_SAVE } from "../store/schema"
import { distributeStars, simulateRoundOutcome } from "./debug"
import { dayStamp } from "./time"

describe("distributeStars", () => {
	test("all 3s when total equals n*3", () => {
		const result = distributeStars(30, 10)
		expect(result).toHaveLength(10)
		expect(result.every((x) => x === 3)).toBe(true)
		expect(result.reduce((a, b) => a + b, 0)).toBe(30)
	})

	test("sums to 20 and every element is in 0..3", () => {
		const result = distributeStars(20, 10)
		expect(result.reduce((a, b) => a + b, 0)).toBe(20)
		expect(result.every((x) => x >= 0 && x <= 3)).toBe(true)
	})

	test("all zeros when total is 0", () => {
		const result = distributeStars(0, 10)
		expect(result.reduce((a, b) => a + b, 0)).toBe(0)
		expect(result.every((x) => x === 0)).toBe(true)
	})
})

describe("simulateRoundOutcome", () => {
	const fixedNow = 1_700_000_000_000

	test("is deterministic given a fixed rand and now", () => {
		const state = { ...INITIAL_SAVE }
		const a = simulateRoundOutcome(state, 30, mulberry32(7), fixedNow)
		const b = simulateRoundOutcome(state, 30, mulberry32(7), fixedNow)
		expect(a).toEqual(b)
	})

	test("with totalStars=30 and empty facts, asked keys have attempts >= 1", () => {
		const state = { ...INITIAL_SAVE }
		const result = simulateRoundOutcome(state, 30, mulberry32(42), fixedNow)
		expect(result.asked.length).toBeGreaterThan(0)
		for (const key of result.asked) {
			const stats = result.facts[key]
			expect(stats).toBeDefined()
			expect(stats?.attempts).toBeGreaterThanOrEqual(1)
		}
	})

	test("eggFragments and eggsEarned advance consistently with fragmentsForEgg", () => {
		const state = { ...INITIAL_SAVE }
		const result = simulateRoundOutcome(state, 30, mulberry32(99), fixedNow)
		// Each question adds 1 fragment; starting from eggFragments=0, eggsEarned=0
		// threshold for first egg is fragmentsForEgg(0) = 10; QUESTIONS_PER_ROUND = 10
		// so exactly 1 egg should be created
		expect(result.eggsEarned).toBe(1)
		expect(result.eggFragments).toBe(0)
		expect(result.pendingEggs).toHaveLength(1)
		expect(result.createdIndices).toHaveLength(1)
	})

	test("eggFragments and eggsEarned: partial accumulation when threshold not reached", () => {
		// Start with eggsEarned=1, so threshold is fragmentsForEgg(1) = 14
		// With 10 questions from eggFragments=0, we get 10 fragments < 14, no new egg
		const state = { ...INITIAL_SAVE, eggsEarned: 1 }
		const result = simulateRoundOutcome(state, 20, mulberry32(55), fixedNow)
		expect(result.eggsEarned).toBe(1)
		expect(result.eggFragments).toBe(10)
		expect(result.pendingEggs).toHaveLength(0)
		expect(result.createdIndices).toHaveLength(0)
	})

	test("żołd: symulowana runda wypłaca iskierki jak prawdziwa (lustro store)", () => {
		// świeży zapis: lastPlayedDay "" → pierwsza runda dnia; 30★ = dobra+perfekcja;
		// pusta wioska → 1+1+1+1 = 4
		const state = { ...INITIAL_SAVE }
		const result = simulateRoundOutcome(state, 30, mulberry32(7), fixedNow)
		expect(result.wage).toBe(4)
		expect(result.iskierki).toBeGreaterThanOrEqual(4) // + ewentualna tęczowa iskierka

		// zamek L2 + runda tego samego dnia co lastPlayedDay → 1+1+1+2 = 5
		const withCastle = {
			...INITIAL_SAVE,
			village: {
				buildings: { zamek: 2 as number },
				decorations: [],
				goalId: null,
			},
			achievementStats: {
				...INITIAL_SAVE.achievementStats,
				lastPlayedDay: dayStamp(fixedNow),
			},
		}
		const r2 = simulateRoundOutcome(withCastle, 30, mulberry32(7), fixedNow)
		expect(r2.wage).toBe(5)
	})
})
