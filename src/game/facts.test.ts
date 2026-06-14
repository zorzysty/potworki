/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import {
	ALL_FACTS,
	budgetMs,
	expectedAnswer,
	FACTS_BY_KEY,
	fragmentsForEgg,
	isMaxStage,
	makeQuestion,
	STAGES,
	starsFor,
	unlockedFacts,
} from "./facts"

describe("ALL_FACTS", () => {
	test("has exactly 55 facts", () => {
		expect(ALL_FACTS.length).toBe(55)
	})

	test("every fact has a <= b and key matches AxB format", () => {
		for (const f of ALL_FACTS) {
			expect(f.a <= f.b).toBe(true)
			expect(f.key).toBe(`${f.a}x${f.b}`)
		}
	})

	test("all 55 keys are unique", () => {
		const keys = ALL_FACTS.map((f) => f.key)
		const unique = new Set(keys)
		expect(unique.size).toBe(55)
	})
})

describe("FACTS_BY_KEY", () => {
	test("size is 55", () => {
		expect(FACTS_BY_KEY.size).toBe(55)
	})
})

describe("unlockedFacts", () => {
	test("stage 0 unlocks exactly 10 facts", () => {
		expect(unlockedFacts(0).length).toBe(10)
	})

	test("monotonic: each stage's set is a superset of the previous", () => {
		for (let s = 1; s < STAGES.length; s++) {
			const prev = new Set(unlockedFacts(s - 1).map((f) => f.key))
			const curr = new Set(unlockedFacts(s).map((f) => f.key))
			for (const k of prev) {
				expect(curr.has(k)).toBe(true)
			}
		}
	})

	test("max stage unlocks all 55 facts", () => {
		const all = unlockedFacts(STAGES.length - 1)
		expect(all.length).toBe(55)
	})
})

describe("isMaxStage", () => {
	test("returns true at last stage", () => {
		expect(isMaxStage(STAGES.length - 1)).toBe(true)
	})

	test("returns false at stage 0", () => {
		expect(isMaxStage(0)).toBe(false)
	})
})

describe("budgetMs", () => {
	test("budget = 4000 + 800 * b", () => {
		const f = { a: 2, b: 7, key: "2x7" as const }
		expect(budgetMs(f)).toBe(4000 + 800 * 7)
	})
})

describe("starsFor", () => {
	test("at or under budget → 3 stars", () => {
		const f = { a: 2, b: 7, key: "2x7" as const }
		const budget = budgetMs(f)
		expect(starsFor(budget, f)).toBe(3)
	})

	test("at 1.5x budget → 2 stars", () => {
		const f = { a: 2, b: 7, key: "2x7" as const }
		const budget = budgetMs(f)
		expect(starsFor(1.5 * budget, f)).toBe(2)
	})

	test("at 2.5x budget → 1 star", () => {
		const f = { a: 2, b: 7, key: "2x7" as const }
		const budget = budgetMs(f)
		expect(starsFor(2.5 * budget, f)).toBe(1)
	})

	test("over 2.5x budget → 0 stars", () => {
		const f = { a: 2, b: 7, key: "2x7" as const }
		const budget = budgetMs(f)
		expect(starsFor(2.5 * budget + 1, f)).toBe(0)
	})
})

describe("fragmentsForEgg", () => {
	test("first egg costs 10 fragments", () => {
		expect(fragmentsForEgg(0)).toBe(10)
	})

	test("second egg costs 14 fragments", () => {
		expect(fragmentsForEgg(1)).toBe(14)
	})

	test("11th egg costs 18 fragments", () => {
		expect(fragmentsForEgg(10)).toBe(18)
	})

	test("21st egg costs 22 fragments", () => {
		expect(fragmentsForEgg(20)).toBe(22)
	})
})

describe("makeQuestion", () => {
	const fact = { a: 4, b: 9, key: "4x9" as const }

	describe("mult mode", () => {
		test("rand=0.9 → nie odwraca (a===fact.a, b===fact.b)", () => {
			const q = makeQuestion(fact, false, "mult", null, () => 0.9)
			expect(q.a).toBe(4)
			expect(q.b).toBe(9)
			expect(q.key).toBe("4x9")
			expect(q.isRequeue).toBe(false)
		})

		test("rand=0 → odwraca czynniki (a===fact.b, b===fact.a)", () => {
			const q = makeQuestion(fact, false, "mult", null, () => 0)
			expect(q.a).toBe(9)
			expect(q.b).toBe(4)
		})

		test("isRequeue jest przekazywane poprawnie", () => {
			const q = makeQuestion(fact, true, "mult", null, () => 0.9)
			expect(q.isRequeue).toBe(true)
		})
	})

	describe("div mode", () => {
		test("dzielna to iloczyn czynników", () => {
			const q = makeQuestion(fact, false, "div", null, () => 0)
			expect(q.a).toBe(36) // 4*9
		})

		test("rand=0 → dzielnik to fact.a", () => {
			const q = makeQuestion(fact, false, "div", null, () => 0)
			expect(q.b).toBe(4)
		})

		test("rand=0.9 → dzielnik to fact.b", () => {
			const q = makeQuestion(fact, false, "div", null, () => 0.9)
			expect(q.b).toBe(9)
		})

		test("iloraz jest liczbą całkowitą w 1..10", () => {
			for (const r of [0, 0.9]) {
				const q = makeQuestion(fact, false, "div", null, () => r)
				const quotient = q.a / q.b
				expect(Number.isInteger(quotient)).toBe(true)
				expect(quotient).toBeGreaterThanOrEqual(1)
				expect(quotient).toBeLessThanOrEqual(10)
			}
		})

		test("intro: nowy czynnik wymuszony na pozycji dzielnika (rand ignorowany)", () => {
			// introFactor = 8, fact = {a:8, b:9} → dzielnik = 8, niezależnie od rand
			const fact89 = { a: 8, b: 9, key: "8x9" as const }
			const q = makeQuestion(fact89, false, "div", 8, () => 0.9)
			expect(q.a).toBe(72)
			expect(q.b).toBe(8)
			expect(expectedAnswer(q, "div")).toBe(9)
		})

		test("intro: introFactor jest fact.b → dzielnik = introFactor", () => {
			const fact89 = { a: 8, b: 9, key: "8x9" as const }
			const q = makeQuestion(fact89, false, "div", 9, () => 0)
			expect(q.b).toBe(9)
		})

		test("intro: introFactor nie należy do fact → dzielnik losowy (rand=0 → fact.a)", () => {
			const fact89 = { a: 8, b: 9, key: "8x9" as const }
			const q = makeQuestion(fact89, false, "div", 7, () => 0)
			expect(q.b).toBe(8) // rand=0 < 0.5 → fact.a
		})
	})
})

describe("expectedAnswer", () => {
	test("mult: zwraca a*b", () => {
		const q = { key: "4x9" as const, a: 4, b: 9, isRequeue: false }
		expect(expectedAnswer(q, "mult")).toBe(36)
	})

	test("div: zwraca a/b", () => {
		const q = { key: "4x9" as const, a: 36, b: 4, isRequeue: false }
		expect(expectedAnswer(q, "div")).toBe(9)
	})
})
