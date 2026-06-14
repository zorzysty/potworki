/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { STAGES } from "../game/facts"
import { isDivisionOnly, MONSTER_COUNT, rarityOf } from "./catalog"
import {
	BRIDGE_GUARDIAN_IDS,
	BRIDGE_ORIGIN,
	originOf,
	REGIONS,
	regionOf,
} from "./world"

describe("REGIONS", () => {
	test("jeden region na etap STAGES", () => {
		expect(REGIONS.length).toBe(STAGES.length)
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

	test("każdy common|rare, nie tylko-dzielenie", () => {
		for (const r of REGIONS) {
			expect(["common", "rare"]).toContain(rarityOf(r.guardianId))
			expect(isDivisionOnly(r.guardianId)).toBe(false)
		}
	})

	// Spójność paszportu: strażnik musi „pochodzić" z krainy, której strzeże.
	test("regionOf(guardianId) === stage", () => {
		for (const r of REGIONS) {
			expect(regionOf(r.guardianId)).toBe(r.stage)
		}
	})
})

describe("Most Strażników", () => {
	test("4 legendarne tylko-dzielenie (72–75)", () => {
		expect([...BRIDGE_GUARDIAN_IDS]).toEqual([72, 73, 74, 75])
		for (const id of BRIDGE_GUARDIAN_IDS) {
			expect(rarityOf(id)).toBe("legendary")
			expect(isDivisionOnly(id)).toBe(true)
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

	test("originOf: tylko-dzielenie → Most, reszta → region z polem stage", () => {
		for (const id of BRIDGE_GUARDIAN_IDS) {
			expect(originOf(id)).toBe(BRIDGE_ORIGIN)
		}
		for (let id = 0; id < MONSTER_COUNT; id++) {
			if (isDivisionOnly(id)) continue
			const origin = originOf(id)
			expect(origin === REGIONS[regionOf(id)]).toBe(true)
			expect("stage" in origin).toBe(true)
		}
	})

	test("dyskryminator unii: kind region/bridge", () => {
		expect(BRIDGE_ORIGIN.kind).toBe("bridge")
		expect("stage" in BRIDGE_ORIGIN).toBe(false)
		for (const r of REGIONS) expect(r.kind).toBe("region")
	})
})
