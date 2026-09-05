/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import { INITIAL_SAVE } from "../store/schema"
import { distributeStars, simulateRound } from "./debug"
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

describe("simulateRound", () => {
	const fixedNow = 1_700_000_000_000

	test("is deterministic given a fixed rand and now", () => {
		const a = simulateRound(INITIAL_SAVE, "mult", 30, mulberry32(7), fixedNow)
		const b = simulateRound(INITIAL_SAVE, "mult", 30, mulberry32(7), fixedNow)
		expect(a).toEqual(b)
	})

	test("runda w fazie summary z dokładnie totalStars; każde pytanie ma attempts >= 1", () => {
		for (const total of [30, 24, 20, 0]) {
			const { patch, round } = simulateRound(
				INITIAL_SAVE,
				"mult",
				total,
				mulberry32(42),
				fixedNow,
			)
			expect(round.phase).toBe("summary")
			expect(round.stars).toBe(total)
			expect(round.asked.length).toBe(10)
			for (const key of round.asked)
				expect(patch.facts?.[key]?.attempts).toBeGreaterThanOrEqual(1)
		}
	})

	test("eggFragments and eggsEarned advance consistently with fragmentsForEgg", () => {
		// threshold for first egg is fragmentsForEgg(0) = 10 = QUESTIONS_PER_ROUND
		const { patch, round } = simulateRound(
			INITIAL_SAVE,
			"mult",
			30,
			mulberry32(99),
			fixedNow,
		)
		expect(patch.eggsEarned).toBe(1)
		expect(patch.eggFragments).toBe(0)
		expect(patch.pendingEggs).toHaveLength(1)
		expect(round.eggsCreated).toEqual([0])
	})

	test("partial accumulation when threshold not reached", () => {
		// eggsEarned=1 → threshold 14 > 10 fragments
		const { patch, round } = simulateRound(
			{ ...INITIAL_SAVE, eggsEarned: 1 },
			"mult",
			20,
			mulberry32(55),
			fixedNow,
		)
		expect(patch.eggsEarned).toBe(1)
		expect(patch.eggFragments).toBe(10)
		expect(patch.pendingEggs).toHaveLength(0)
		expect(round.eggsCreated).toEqual([])
	})

	test("żołd: symulowana runda wypłaca iskierki jak prawdziwa", () => {
		// świeży zapis: lastPlayedDay "" → pierwsza runda dnia; 30★ = dobra+perfekcja;
		// pusta wioska → 1+1+1+1 = 4
		const r = simulateRound(INITIAL_SAVE, "mult", 30, mulberry32(7), fixedNow)
		expect(r.round.wageEarned).toBe(4)
		expect(r.patch.iskierki).toBeGreaterThanOrEqual(4) // + ewentualna tęczowa iskierka
		expect(r.patch.totalRounds).toBe(1)

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
		const r2 = simulateRound(withCastle, "mult", 30, mulberry32(7), fixedNow)
		expect(r2.round.wageEarned).toBe(5)
	})
})
