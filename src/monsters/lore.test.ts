/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { MONSTER_COUNT, MONSTERS } from "./catalog"
import { loreFor } from "./lore"

describe("loreFor", () => {
	test("deterministyczne (ten sam id → ten sam wynik)", () => {
		for (const id of [0, 12, 45, 60, 72, 75]) {
			expect(loreFor(id)).toEqual(loreFor(id))
		}
	})

	test("dla całego katalogu: pola niepuste, bez 'undefined', blurb to pełne zdania", () => {
		for (let id = 0; id < MONSTER_COUNT; id++) {
			const lore = loreFor(id)
			expect(lore.species.length).toBeGreaterThan(0)
			expect(lore.blurb.length).toBeGreaterThan(0)
			expect(lore.funFact.length).toBeGreaterThan(0)
			// brak luk w bankach → żadne pole nie wpisze "undefined"
			expect(JSON.stringify(lore)).not.toContain("undefined")
			// blurb złożony z ≥2 zdań i kończy się kropką
			expect(lore.blurb.endsWith(".")).toBe(true)
			expect((lore.blurb.match(/\./g) ?? []).length).toBeGreaterThanOrEqual(2)
		}
	})

	// Banki tablicowe nie mają luk: katalog pokrywa pełen zakres każdego pola DNA,
	// a pętla „bez undefined" wyżej przechodzi → indeksy zawsze trafiają we wpis.
	test("katalog pokrywa pełny zakres pól DNA (gwarancja sensu testu wyżej)", () => {
		const vals = (pick: (m: (typeof MONSTERS)[number]) => number) =>
			new Set(MONSTERS.map(pick))
		expect(vals((m) => m.dna.body)).toEqual(new Set([0, 1, 2, 3, 4, 5]))
		expect(vals((m) => m.dna.palette)).toEqual(
			new Set([0, 1, 2, 3, 4, 5, 6, 7]),
		)
		expect(vals((m) => m.dna.eyes)).toEqual(new Set([0, 1, 2, 3, 4]))
		expect(vals((m) => m.dna.mouth)).toEqual(new Set([0, 1, 2, 3]))
		expect(vals((m) => m.dna.topper)).toEqual(new Set([0, 1, 2, 3, 4]))
		expect(vals((m) => m.dna.pattern)).toEqual(new Set([0, 1, 2, 3]))
	})

	test("przymiotnik gatunku per-accessory", () => {
		for (let id = 0; id < MONSTER_COUNT; id++) {
			const { species } = loreFor(id)
			switch (MONSTERS[id]?.dna.accessory) {
				case "crown":
					expect(species.startsWith("Królewski ")).toBe(true)
					break
				case "wings":
					expect(species.startsWith("Skrzydlaty ")).toBe(true)
					break
				default: // none | aura → bez prefiksu (zaczyna rzeczownikiem BODY)
					expect(species.startsWith("Królewski ")).toBe(false)
					expect(species.startsWith("Skrzydlaty ")).toBe(false)
			}
		}
	})

	// Anty-kłamstwo: korona zastępuje topper w renderze → legendarne opisują koronę.
	test("legendarne opisują koronę, nie ukryty topper", () => {
		for (let id = 0; id < MONSTER_COUNT; id++) {
			if (MONSTERS[id]?.dna.accessory !== "crown") continue
			expect(loreFor(id).blurb).toContain("Nosi błyszczącą koronę")
		}
	})

	test("funFact zróżnicowany w katalogu", () => {
		const facts = new Set<string>()
		for (let id = 0; id < MONSTER_COUNT; id++) facts.add(loreFor(id).funFact)
		expect(facts.size).toBeGreaterThan(1)
	})
})
