/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import {
	availableCosmetics,
	COSMETICS,
	COSMETICS_BY_ID,
	type CosmeticsState,
	equippedFor,
	INITIAL_COSMETICS,
	isOwned,
	sklepikLevel,
} from "./cosmetics"
import { INITIAL_VILLAGE } from "./village"

const launchTotal = COSMETICS.reduce((s, c) => s + c.cost, 0)

describe("katalog kosmetyki — integralność", () => {
	test("17 przedmiotów (12 z planu 013 + 5 ramek z planu 014), unikalne id", () => {
		expect(COSMETICS.length).toBe(17)
		const ids = COSMETICS.map((c) => c.id)
		expect(new Set(ids).size).toBe(ids.length)
	})
	test("każdy przedmiot: tier ∈ {1,2,3}, slot ∈ {hat, aura, frame}, koszt > 0, nazwa niepusta", () => {
		for (const c of COSMETICS) {
			expect([1, 2, 3]).toContain(c.tier)
			expect(["hat", "aura", "frame"]).toContain(c.slot)
			expect(c.cost).toBeGreaterThan(0)
			expect(c.name.length).toBeGreaterThan(0)
		}
	})
	test("COSMETICS_BY_ID odwzorowuje cały katalog", () => {
		expect(COSMETICS_BY_ID.size).toBe(COSMETICS.length)
		for (const c of COSMETICS) expect(COSMETICS_BY_ID.get(c.id)).toBe(c)
	})
})

describe("katalog kosmetyki — inwarianty ekonomii (decyzje projektowe)", () => {
	test("najtańszy tier 1 ≤ 8 — zakup impulsowy w sesji otwarcia sklepiku", () => {
		const t1 = COSMETICS.filter((c) => c.tier === 1)
		expect(t1.length).toBeGreaterThan(0)
		expect(Math.min(...t1.map((c) => c.cost))).toBeLessThanOrEqual(8)
	})
	test("każdy tier 3 ≥ 45 — cele prestiżowe po komplecie wioski", () => {
		for (const c of COSMETICS.filter((c) => c.tier === 3))
			expect(c.cost).toBeGreaterThanOrEqual(45)
	})
	test("suma katalogu (013 + ramki 014) w przedziale 430–580", () => {
		// Podbite z [300, 450] przy dołożeniu 5 ramek (140✨) w planie 014 —
		// przedział ma łapać dryf 17 przedmiotów (dziś 486✨).
		expect(launchTotal).toBeGreaterThanOrEqual(430)
		expect(launchTotal).toBeLessThanOrEqual(580)
	})
})

describe("ramki kart (plan 014) — integralność", () => {
	const frames = COSMETICS.filter((c) => c.slot === "frame")
	test("dokładnie 5 ramek w katalogu", () => {
		expect(frames.length).toBe(5)
	})
	test("każda ramka: koszt w [10, 60], niepuste cardClasses, tier ∈ {1,2,3}", () => {
		for (const f of frames) {
			expect(f.cost).toBeGreaterThanOrEqual(10)
			expect(f.cost).toBeLessThanOrEqual(60)
			expect(f.cardClasses ?? "").not.toBe("")
			expect([1, 2, 3]).toContain(f.tier)
		}
	})
})

describe("availableCosmetics", () => {
	test("sklepik L0 → pusto; L1 → tylko tier 1; L3 → cały katalog", () => {
		expect(availableCosmetics(0)).toEqual([])
		const t1 = availableCosmetics(1)
		expect(t1.length).toBeGreaterThan(0)
		for (const c of t1) expect(c.tier).toBe(1)
		expect(availableCosmetics(3).length).toBe(COSMETICS.length)
	})
	test("L2 → tiery 1 i 2, bez 3", () => {
		const t2 = availableCosmetics(2)
		for (const c of t2) expect(c.tier).toBeLessThanOrEqual(2)
		expect(t2.length).toBe(COSMETICS.filter((c) => c.tier <= 2).length)
	})
})

describe("sklepikLevel", () => {
	test("pusta wioska → 0; zbudowany sklepik → jego poziom", () => {
		expect(sklepikLevel(INITIAL_VILLAGE)).toBe(0)
		expect(
			sklepikLevel({
				buildings: { sklepik: 2 },
				decorations: [],
				goalId: null,
			}),
		).toBe(2)
	})
})

describe("isOwned / equippedFor", () => {
	const first = COSMETICS[0] as (typeof COSMETICS)[number]
	const state: CosmeticsState = {
		owned: [first.id],
		equipped: { 3: { hat: first.id } },
	}
	test("isOwned: kupiony tak, niekupiony nie", () => {
		expect(isOwned(state, first.id)).toBe(true)
		expect(isOwned(state, "nie-ma-takiego")).toBe(false)
		expect(isOwned(INITIAL_COSMETICS, first.id)).toBe(false)
	})
	test("equippedFor: wpis potworka albo pusty obiekt", () => {
		expect(equippedFor(state, 3)).toEqual({ hat: first.id })
		expect(equippedFor(state, 5)).toEqual({})
		expect(equippedFor(INITIAL_COSMETICS, 3)).toEqual({})
	})
})
