/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import {
	BUILDINGS,
	buildingLevel,
	canAffordSomething,
	currentGoal,
	DECORATIONS,
	INITIAL_VILLAGE,
	MAX_BUILDING_LEVEL,
	nextLevelCost,
	roundWage,
	type VillageState,
	villageCap,
	villageValue,
} from "./village"

const village = (over: Partial<VillageState> = {}): VillageState => ({
	...INITIAL_VILLAGE,
	buildings: {},
	decorations: [],
	...over,
})

const fullyBuilt = (): VillageState => ({
	buildings: Object.fromEntries(
		BUILDINGS.map((b) => [b.id, MAX_BUILDING_LEVEL]),
	),
	decorations: DECORATIONS.map((d) => d.id),
	goalId: null,
})

const grandTotal =
	BUILDINGS.reduce((s, b) => s + b.costs[0] + b.costs[1] + b.costs[2], 0) +
	DECORATIONS.reduce((s, d) => s + d.cost, 0)

describe("katalog wioski — integralność", () => {
	test("7 budynków i 6 dekoracji, unikalne id", () => {
		expect(BUILDINGS.length).toBe(7)
		expect(DECORATIONS.length).toBe(6)
		const ids = [...BUILDINGS.map((b) => b.id), ...DECORATIONS.map((d) => d.id)]
		expect(new Set(ids).size).toBe(ids.length)
	})
	test("każdy budynek ma 3 rosnące koszty", () => {
		for (const b of BUILDINGS) {
			expect(b.costs.length).toBe(3)
			expect(b.costs[0]).toBeLessThan(b.costs[1])
			expect(b.costs[1]).toBeLessThan(b.costs[2])
		}
	})
	test("każda dekoracja kosztuje > 0", () => {
		for (const d of DECORATIONS) expect(d.cost).toBeGreaterThan(0)
	})
	test("każdy budynek ma 3 nazwy poziomów i 3 opisy", () => {
		for (const b of BUILDINGS) {
			expect(b.levelNames.length).toBe(3)
			expect(b.descriptions.length).toBe(3)
			for (const s of [...b.levelNames, ...b.descriptions, b.name])
				expect(s.length).toBeGreaterThan(0)
		}
	})
})

describe("katalog wioski — inwarianty ekonomii (decyzje projektowe)", () => {
	test("najtańszy budynek L1 ≤ 5 — pierwszy cel w pierwszych sesjach", () => {
		expect(Math.min(...BUILDINGS.map((b) => b.costs[0]))).toBeLessThanOrEqual(5)
	})
	test("zamek L1 ≤ 25 — koło zamachowe kupowalne w pierwszym tygodniu", () => {
		const zamek = BUILDINGS.find((b) => b.id === "zamek")
		expect(zamek).toBeDefined()
		expect((zamek as (typeof BUILDINGS)[number]).costs[0]).toBeLessThanOrEqual(
			25,
		)
	})
	test("każda dekoracja tańsza niż najtańszy budynek L2 — zakupy impulsowe", () => {
		const cheapestL2 = Math.min(...BUILDINGS.map((b) => b.costs[1]))
		for (const d of DECORATIONS) expect(d.cost).toBeLessThan(cheapestL2)
	})
	test("cały zlew (wszystkie poziomy + dekoracje) w przedziale 800–1500", () => {
		expect(grandTotal).toBeGreaterThanOrEqual(800)
		expect(grandTotal).toBeLessThanOrEqual(1500)
	})
	test("sklepik L1 ≤ 20 — sklep otwiera się w połowie wczesnej gry", () => {
		const sklepik = BUILDINGS.find((b) => b.id === "sklepik")
		expect(sklepik).toBeDefined()
		expect(
			(sklepik as (typeof BUILDINGS)[number]).costs[0],
		).toBeLessThanOrEqual(20)
	})
})

describe("nextLevelCost", () => {
	test("niezbudowany → koszt L1; L1 → koszt L2; maks → null", () => {
		const b = BUILDINGS[0]
		if (!b) throw new Error("pusty katalog")
		expect(nextLevelCost(village(), b.id)).toBe(b.costs[0])
		expect(nextLevelCost(village({ buildings: { [b.id]: 1 } }), b.id)).toBe(
			b.costs[1],
		)
		expect(
			nextLevelCost(
				village({ buildings: { [b.id]: MAX_BUILDING_LEVEL } }),
				b.id,
			),
		).toBeNull()
	})
})

describe("roundWage", () => {
	test("pusta wioska: baza 1; progi gwiazdek 15 i 30", () => {
		expect(roundWage(village(), 0, false)).toBe(1)
		expect(roundWage(village(), 14, false)).toBe(1)
		expect(roundWage(village(), 15, false)).toBe(2)
		expect(roundWage(village(), 29, false)).toBe(2)
		expect(roundWage(village(), 30, false)).toBe(3)
	})
	test("bonus pierwszej rundy dnia: +1", () => {
		expect(roundWage(village(), 30, true)).toBe(4)
	})
	test("zamek dodaje swój poziom (koło zamachowe)", () => {
		expect(roundWage(village({ buildings: { zamek: 1 } }), 0, false)).toBe(2)
		expect(roundWage(village({ buildings: { zamek: 3 } }), 30, true)).toBe(7)
	})
})

describe("villageCap", () => {
	test("14 / 18 / 22 / 26 dla domków 0–3", () => {
		expect(villageCap(village())).toBe(14)
		expect(villageCap(village({ buildings: { domki: 1 } }))).toBe(18)
		expect(villageCap(village({ buildings: { domki: 2 } }))).toBe(22)
		expect(villageCap(village({ buildings: { domki: 3 } }))).toBe(26)
	})
})

describe("currentGoal", () => {
	test("pusta wioska bez celu → najtańszy zakup (≤ 5)", () => {
		const goal = currentGoal(village())
		expect(goal).not.toBeNull()
		expect((goal as NonNullable<typeof goal>).cost).toBeLessThanOrEqual(5)
	})
	test("wybrany cel wygrywa z najtańszym, nawet gdy droższy", () => {
		const goal = currentGoal(village({ goalId: "zamek" }))
		expect(goal).toEqual({
			kind: "building",
			id: "zamek",
			name: BUILDINGS.find((b) => b.id === "zamek")?.levelNames[0] as string,
			cost: 20,
		})
	})
	test("cel wskazujący zbudowany-maks budynek → fallback do najtańszego", () => {
		const v = village({
			buildings: { zamek: MAX_BUILDING_LEVEL },
			goalId: "zamek",
		})
		const goal = currentGoal(v)
		expect(goal).not.toBeNull()
		expect((goal as NonNullable<typeof goal>).id).not.toBe("zamek")
	})
	test("cel na ulepszenie pokazuje nazwę NASTĘPNEGO poziomu", () => {
		const b = BUILDINGS[0]
		if (!b) throw new Error("pusty katalog")
		const goal = currentGoal(
			village({ buildings: { [b.id]: 1 }, goalId: b.id }),
		)
		expect((goal as NonNullable<typeof goal>).name).toBe(b.levelNames[1])
		expect((goal as NonNullable<typeof goal>).cost).toBe(b.costs[1])
	})
	test("pomija kupione dekoracje i maksy; komplet → null", () => {
		expect(currentGoal(fullyBuilt())).toBeNull()
		// wszystko oprócz jednej dekoracji → cel = ta dekoracja
		const lastDeco = DECORATIONS[DECORATIONS.length - 1]
		if (!lastDeco) throw new Error("pusty katalog")
		const v = fullyBuilt()
		v.decorations = v.decorations.filter((id) => id !== lastDeco.id)
		expect(currentGoal(v)).toEqual({
			kind: "decoration",
			id: lastDeco.id,
			name: lastDeco.name,
			cost: lastDeco.cost,
		})
	})
})

describe("canAffordSomething", () => {
	test("0 ✨ → nie; od ceny najtańszego celu → tak", () => {
		const cheapest = (currentGoal(village()) as { cost: number }).cost
		expect(canAffordSomething(village(), 0)).toBe(false)
		expect(canAffordSomething(village(), cheapest - 1)).toBe(false)
		expect(canAffordSomething(village(), cheapest)).toBe(true)
	})
	test("komplet → nie, niezależnie od portfela", () => {
		expect(canAffordSomething(fullyBuilt(), 999)).toBe(false)
	})
})

describe("villageValue", () => {
	test("pusta → 0", () => {
		expect(villageValue(village())).toBe(0)
	})
	test("poziomy + dekoracje sumują się z cennika", () => {
		const b = BUILDINGS[0]
		const d = DECORATIONS[0]
		if (!b || !d) throw new Error("pusty katalog")
		const v = village({ buildings: { [b.id]: 2 }, decorations: [d.id] })
		expect(villageValue(v)).toBe(b.costs[0] + b.costs[1] + d.cost)
	})
	test("komplet → cały zlew (ta sama liczba co inwariant przedziału)", () => {
		expect(villageValue(fullyBuilt())).toBe(grandTotal)
	})
})

describe("buildingLevel", () => {
	test("brak wpisu → 0", () => {
		expect(buildingLevel(village(), "fontanna")).toBe(0)
	})
})
