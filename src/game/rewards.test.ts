/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import {
	eggQuality,
	eggQualityScore,
	QUALITY_ORDER,
	qualityOdds,
	RARITY_ODDS,
	rollWish,
} from "./rewards"

describe("qualityOdds", () => {
	test("every row sums to 100", () => {
		for (const s of [0, 10, 25, 26, 27, 28, 29, 30]) {
			const sum = qualityOdds(s).reduce((a, b) => a + b, 0)
			expect(sum).toBe(100)
		}
	})
	test("rainbow only reachable at 30", () => {
		expect(qualityOdds(29)[3]).toBe(0)
		expect(qualityOdds(30)[3]).toBe(40)
	})
	test("threshold table", () => {
		expect(qualityOdds(25)).toEqual([100, 0, 0, 0])
		expect(qualityOdds(26)).toEqual([40, 60, 0, 0])
		expect(qualityOdds(28)).toEqual([20, 30, 50, 0])
		expect(qualityOdds(30)).toEqual([10, 20, 30, 40])
	})
})

describe("RARITY_ODDS", () => {
	test("every quality row sums to 100", () => {
		for (const q of QUALITY_ORDER) {
			const sum = RARITY_ODDS[q].reduce((a, b) => a + b, 0)
			expect(sum).toBe(100)
		}
	})
})

describe("eggQuality", () => {
	test("rainbow at 30 with high roll", () => {
		expect(eggQuality(30, () => 0.999)).toBe("rainbow")
	})
	test("normal at 25 with any roll", () => {
		expect(eggQuality(25, () => 0.999)).toBe("normal")
	})
	test("normal at 30 with zero roll (lowest bucket)", () => {
		expect(eggQuality(30, () => 0)).toBe("normal")
	})
})

describe("eggQualityScore", () => {
	test("komplet 3★ → 30 niezależnie od progu (tęczowe = bezbłędnie)", () => {
		expect(eggQualityScore(30, 10)).toBe(30)
		expect(eggQualityScore(42, 14)).toBe(30)
	})
	test("średnia gwiazdek/fragment skalowana do osi 0–30", () => {
		expect(eggQualityScore(20, 10)).toBe(20) // 2★ średnio
		expect(eggQualityScore(21, 14)).toBe(15) // 1.5★ średnio
		expect(eggQualityScore(14, 14)).toBe(10) // 1★ średnio
		expect(eggQualityScore(0, 14)).toBe(0)
	})
	test("clamp do 0..30 i ochrona przed fragments <= 0", () => {
		expect(eggQualityScore(100, 10)).toBe(30)
		expect(eggQualityScore(-5, 10)).toBe(0)
		expect(eggQualityScore(5, 0)).toBe(0)
	})
	test("duże jajko: jedna skaza nie daje score 30 (tęczowe = bezbłędnie)", () => {
		// próg 22 (jajka 21+): komplet 3★ = bank 66 → 30; jedna 2★ = bank 65 → 29
		expect(eggQualityScore(66, 22)).toBe(30)
		expect(eggQualityScore(65, 22)).toBe(29)
	})
})

describe("rollWish", () => {
	const idsByRarity = {
		common: [0, 1, 2],
		rare: [3, 4],
		epic: [5],
		legendary: [6],
	}
	const rarityOf = (id: number) =>
		id <= 2 ? "common" : id <= 4 ? "rare" : id === 5 ? "epic" : "legendary"
	test("returns dream when set and unowned", () => {
		const ctx = {
			idsByRarity,
			owned: new Set<number>([0]),
			dreamId: 4,
			rarityOf,
			rand: () => 0.5,
		} as const
		expect(rollWish(ctx)).toBe(4)
	})
	test("never returns an owned id when no dream", () => {
		const owned = new Set<number>([0, 1, 3, 5])
		const rand = mulberry32(123)
		for (let i = 0; i < 200; i++) {
			const got = rollWish({
				idsByRarity,
				owned,
				dreamId: null,
				rarityOf,
				rand,
			})
			expect(got === null || !owned.has(got)).toBe(true)
		}
	})
	test("returns null when everything is owned", () => {
		const owned = new Set<number>([0, 1, 2, 3, 4, 5, 6])
		expect(
			rollWish({
				idsByRarity,
				owned,
				dreamId: null,
				rarityOf,
				rand: () => 0.5,
			}),
		).toBeNull()
	})
})
