/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import type { FactStats } from "./adaptive"
import {
	applyAnswer,
	decayStats,
	emptyStats,
	needsMaintenance,
	pickNextFact,
	shouldUnlockNextStage,
	stageFacts,
	stageProgress,
} from "./adaptive"
import type { FactKey } from "./facts"
import { budgetMs, unlockedFacts } from "./facts"

const NOW = 1_000_000
const DAY = 86_400_000

describe("emptyStats", () => {
	test("returns all-zero stats", () => {
		const s = emptyStats()
		expect(s.attempts).toBe(0)
		expect(s.correct).toBe(0)
		expect(s.streak).toBe(0)
		expect(s.mastery).toBe(0)
		expect(s.lastSeen).toBe(0)
	})
})

describe("applyAnswer", () => {
	const f = { a: 3, b: 4, key: "3x4" as const }

	test("correct fast answer: mastery 0.30, attempts 1, correct 1, streak 1", () => {
		const result = applyAnswer(emptyStats(), f, true, 0, NOW)
		expect(result.mastery).toBeCloseTo(0.3)
		expect(result.attempts).toBe(1)
		expect(result.correct).toBe(1)
		expect(result.streak).toBe(1)
	})

	test("correct slow answer: mastery 0.15", () => {
		const result = applyAnswer(emptyStats(), f, true, 10 * budgetMs(f), NOW)
		expect(result.mastery).toBeCloseTo(0.15)
	})

	test("wrong answer: mastery halved, streak reset", () => {
		const stats = { ...emptyStats(), mastery: 0.5, attempts: 1 }
		const result = applyAnswer(stats, f, false, 0, NOW)
		expect(result.mastery).toBeCloseTo(0.25)
		expect(result.streak).toBe(0)
	})
})

describe("decayStats", () => {
	test("no decay when attempts === 0", () => {
		const stats = { ...emptyStats(), attempts: 0, mastery: 0.9, lastSeen: 0 }
		const result = decayStats(stats, NOW * 1000)
		expect(result.mastery).toBe(0.9)
	})

	test("no decay when less than 1 day has passed", () => {
		const stats = { ...emptyStats(), attempts: 1, mastery: 0.9, lastSeen: NOW }
		const result = decayStats(stats, NOW + DAY / 2)
		expect(result.mastery).toBe(0.9)
	})

	test("one day decay: mastery * 0.97", () => {
		const stats = { ...emptyStats(), attempts: 1, mastery: 1, lastSeen: 0 }
		const result = decayStats(stats, 1 * DAY)
		expect(result.mastery).toBeCloseTo(0.97)
	})

	test("100 days decay: capped at 30 days, mastery * 0.97^30", () => {
		const stats = { ...emptyStats(), attempts: 1, mastery: 1, lastSeen: 0 }
		const result = decayStats(stats, 100 * DAY)
		expect(result.mastery).toBeCloseTo(0.97 ** 30)
	})
})

describe("stageFacts", () => {
	test("stage 0 has 10 facts", () => {
		expect(stageFacts(0).length).toBe(10)
	})

	test("stage 1 has 5 facts (factor 3)", () => {
		expect(stageFacts(1).length).toBe(5)
	})
})

// Helper: build a facts record with all facts in a pool at given mastery.
// allHigh = populate every fact in unlockedFacts(stage) at high mastery;
// exceptions override specific keys.
function buildFacts(
	stage: number,
	defaultMastery: number,
	exceptions: Partial<Record<FactKey, FactStats>> = {},
): Partial<Record<FactKey, FactStats>> {
	const facts: Partial<Record<FactKey, FactStats>> = {}
	for (const f of unlockedFacts(stage)) {
		facts[f.key] = { ...emptyStats(), attempts: 1, mastery: defaultMastery }
	}
	for (const [k, v] of Object.entries(exceptions) as [FactKey, FactStats][]) {
		facts[k] = v
	}
	return facts
}

describe("shouldUnlockNextStage / stageProgress equivalence", () => {
	const stage1Gate = stageFacts(1)

	test("all stage-1 gate facts high mastery + older facts high mastery → unlock and progress=1", () => {
		// Need ALL unlockedFacts(1) at high mastery to satisfy maintenance too
		const facts = buildFacts(1, 0.9)
		expect(stageProgress(facts, 1)).toBe(1)
		expect(shouldUnlockNextStage(facts, 1)).toBe(true)
	})

	test("one stage-1 gate fact has attempts=0 → no unlock, progress <= 0.95", () => {
		const firstKey = stage1Gate[0]?.key
		if (!firstKey) throw new Error("no stage1Gate facts")
		const facts = buildFacts(1, 0.9, { [firstKey]: emptyStats() } as Partial<
			Record<FactKey, FactStats>
		>)
		expect(stageProgress(facts, 1)).toBeLessThanOrEqual(0.95)
		expect(shouldUnlockNextStage(facts, 1)).toBe(false)
	})

	test("low mastery on gate facts → no unlock and progress < 1", () => {
		// All unlocked high mastery except gate facts which are low
		const facts = buildFacts(1, 0.9)
		for (const f of stage1Gate) {
			facts[f.key] = { ...emptyStats(), attempts: 1, mastery: 0.3 }
		}
		expect(stageProgress(facts, 1)).toBeLessThan(1)
		expect(shouldUnlockNextStage(facts, 1)).toBe(false)
	})

	test("stageProgress equivalence property: progress===1 iff shouldUnlock===true", () => {
		// Scenario A: all attempted, high mastery → both true
		const factsA = buildFacts(1, 0.9)
		expect(stageProgress(factsA, 1) === 1).toBe(
			shouldUnlockNextStage(factsA, 1),
		)

		// Scenario B: one unattempted gate fact
		const firstKey = stage1Gate[0]?.key
		if (!firstKey) throw new Error("no stage1Gate facts")
		const factsB = buildFacts(1, 0.9, {
			[firstKey]: emptyStats(),
		} as Partial<Record<FactKey, FactStats>>)
		expect(stageProgress(factsB, 1) === 1).toBe(
			shouldUnlockNextStage(factsB, 1),
		)

		// Scenario C: low mastery on gate facts
		const factsC = buildFacts(1, 0.9)
		for (const f of stage1Gate) {
			factsC[f.key] = { ...emptyStats(), attempts: 1, mastery: 0.3 }
		}
		expect(stageProgress(factsC, 1) === 1).toBe(
			shouldUnlockNextStage(factsC, 1),
		)
	})
})

describe("stageProgress invariants", () => {
	test("stageProgress is always in [0,1]", () => {
		const facts = buildFacts(1, 0.5)
		const p = stageProgress(facts, 1)
		expect(p).toBeGreaterThanOrEqual(0)
		expect(p).toBeLessThanOrEqual(1)
	})

	test("stageProgress <= 0.95 when any gate fact has attempts === 0", () => {
		const stage1Gate = stageFacts(1)
		const firstKey = stage1Gate[0]?.key
		if (!firstKey) throw new Error("no stage1Gate facts")
		const facts = buildFacts(1, 0.99, {
			[firstKey]: emptyStats(),
		} as Partial<Record<FactKey, FactStats>>)
		expect(stageProgress(facts, 1)).toBeLessThanOrEqual(0.95)
	})
})

describe("needsMaintenance", () => {
	const stage0Facts = unlockedFacts(0)

	test("false at stage 0 (no older facts)", () => {
		expect(needsMaintenance({}, 0)).toBe(false)
	})

	test("true at stage 1 when stage-0 facts have low mastery", () => {
		const facts: Partial<Record<FactKey, FactStats>> = {}
		for (const f of stage0Facts) {
			facts[f.key] = { ...emptyStats(), attempts: 1, mastery: 0.1 }
		}
		expect(needsMaintenance(facts, 1)).toBe(true)
	})

	test("false at stage 1 when stage-0 facts have high mastery", () => {
		const facts: Partial<Record<FactKey, FactStats>> = {}
		for (const f of stage0Facts) {
			facts[f.key] = { ...emptyStats(), attempts: 1, mastery: 0.9 }
		}
		expect(needsMaintenance(facts, 1)).toBe(false)
	})
})

describe("pickNextFact selection bias", () => {
	test("low-mastery fact is picked most often (>50%) in 2000 draws", () => {
		const stage1All = unlockedFacts(1)
		const stage1Gate = stageFacts(1)
		const lowKey = stage1Gate[0]?.key
		if (!lowKey) throw new Error("no stage1Gate facts")

		// All stage-1 pool facts at high mastery except the one low-mastery gate fact
		const facts: Partial<Record<FactKey, FactStats>> = {}
		for (const f of stage1All) {
			facts[f.key] = { ...emptyStats(), attempts: 1, mastery: 0.99 }
		}
		facts[lowKey] = { ...emptyStats(), attempts: 1, mastery: 0 }

		const rand = mulberry32(42)
		const counts: Record<string, number> = {}
		for (let i = 0; i < 2000; i++) {
			const picked = pickNextFact(facts, 1, [], rand)
			counts[picked.key] = (counts[picked.key] ?? 0) + 1
		}

		const lowCount = counts[lowKey] ?? 0
		const topKey = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]

		expect(topKey).toBe(lowKey)
		expect(lowCount / 2000).toBeGreaterThan(0.5)
	})
})
