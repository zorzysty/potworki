/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { STAGES } from "../game/facts"
import {
	DIVISION_ONLY_IDS,
	FEED_ONLY_IDS,
	GAP_ONLY_IDS,
	isDivisionOnly,
	isFeedOnly,
	isGapOnly,
	isPairsOnly,
	MONSTER_COUNT,
	rarityOf,
} from "./catalog"
import {
	BRIDGE_DIVIDER_IDS,
	BRIDGE_ORIGIN,
	ISLAND_ORIGIN,
	ORCHARD_ORIGIN,
	originOf,
	REGIONS,
	regionOf,
	VALLEY_ORIGIN,
} from "./world"

describe("REGIONS", () => {
	test("jeden region na etap STAGES", () => {
		expect(REGIONS.length).toBe(STAGES.length)
	})

	test("każdy region ma dopełniacz nazwy do zdania o Strażniku", () => {
		for (const r of REGIONS) {
			expect(r.nameGenitive.length).toBeGreaterThan(0)
			// dopełniacz MUSI się różnić od mianownika — inaczej ktoś dopisał region
			// kopiując `name` i zaproszenie znów brzmi „Strażnik Wioska Startowa…"
			expect(r.nameGenitive).not.toBe(r.name)
		}
	})

	test("stage = indeks, factor = STAGES[stage][0]", () => {
		REGIONS.forEach((r, i) => {
			expect(r.stage).toBe(i)
			// possible-undefined indeks po stronie expect(), konkret w toBe()
			expect(STAGES[i]?.[0]).toBe(r.factor)
		})
	})

	test("nazwa/emoji/blurb niepuste", () => {
		for (const r of REGIONS) {
			expect(r.name.length).toBeGreaterThan(0)
			expect(r.emoji.length).toBeGreaterThan(0)
			expect(r.blurb.length).toBeGreaterThan(0)
		}
	})
})

describe("strażnicy", () => {
	test("unikalni", () => {
		const ids = REGIONS.map((r) => r.guardianId)
		expect(new Set(ids).size).toBe(ids.length)
	})

	test("każdy common|rare, nie ekskluzywny (tylko-dzielenie/tylko-luka)", () => {
		for (const r of REGIONS) {
			expect(["common", "rare"]).toContain(rarityOf(r.guardianId))
			expect(isDivisionOnly(r.guardianId)).toBe(false)
			expect(isGapOnly(r.guardianId)).toBe(false)
		}
	})

	// Spójność paszportu: strażnik musi „pochodzić" z krainy, której strzeże.
	test("regionOf(guardianId) === stage", () => {
		for (const r of REGIONS) {
			expect(regionOf(r.guardianId)).toBe(r.stage)
		}
	})
})

describe("Most Dzielników", () => {
	test("4 legendarne tylko-Dzielniki (80–83)", () => {
		expect([...BRIDGE_DIVIDER_IDS]).toEqual([80, 81, 82, 83])
		for (const id of BRIDGE_DIVIDER_IDS) {
			expect(rarityOf(id)).toBe("legendary")
			expect(isPairsOnly(id)).toBe(true)
		}
	})
})

describe("regionOf / originOf", () => {
	test("regionOf pokrywa 0..6 dla całego katalogu", () => {
		const seen = new Set<number>()
		for (let id = 0; id < MONSTER_COUNT; id++) {
			const r = regionOf(id)
			expect(r).toBeGreaterThanOrEqual(0)
			expect(r).toBeLessThan(STAGES.length)
			seen.add(r)
		}
		expect(seen.size).toBe(STAGES.length)
	})

	test("originOf: tylko-Dzielniki → Most, tylko-dzielenie → Wyspa, tylko-luka → Dolina, reszta → region", () => {
		for (const id of BRIDGE_DIVIDER_IDS) {
			expect(originOf(id)).toBe(BRIDGE_ORIGIN)
		}
		for (const id of DIVISION_ONLY_IDS) {
			expect(originOf(id)).toBe(ISLAND_ORIGIN)
		}
		for (const id of GAP_ONLY_IDS) {
			expect(originOf(id)).toBe(VALLEY_ORIGIN)
		}
		for (const id of FEED_ONLY_IDS) {
			expect(originOf(id)).toBe(ORCHARD_ORIGIN)
		}
		for (let id = 0; id < MONSTER_COUNT; id++) {
			if (
				isDivisionOnly(id) ||
				isGapOnly(id) ||
				isPairsOnly(id) ||
				isFeedOnly(id)
			)
				continue
			const origin = originOf(id)
			expect(origin === REGIONS[regionOf(id)]).toBe(true)
			expect("stage" in origin).toBe(true)
		}
	})

	test("dyskryminator unii: kind region/bridge/valley", () => {
		expect(BRIDGE_ORIGIN.kind).toBe("bridge")
		expect("stage" in BRIDGE_ORIGIN).toBe(false)
		expect(VALLEY_ORIGIN.kind).toBe("valley")
		expect("stage" in VALLEY_ORIGIN).toBe(false)
		expect(ISLAND_ORIGIN.kind).toBe("island")
		expect(ORCHARD_ORIGIN.kind).toBe("orchard")
		expect("stage" in ORCHARD_ORIGIN).toBe(false)
		expect("stage" in ISLAND_ORIGIN).toBe(false)
		for (const r of REGIONS) expect(r.kind).toBe("region")
	})
})
