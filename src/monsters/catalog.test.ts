/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import {
	DIVISION_ONLY_IDS,
	FIRST_MONSTER_ID,
	GAP_ONLY_IDS,
	IDS_BY_RARITY,
	idsByRarityForMode,
	isDivisionOnly,
	isGapOnly,
	MONSTER_COUNT,
	MONSTERS,
	rarityOf,
} from "./catalog"

describe("MONSTER_COUNT and MONSTERS", () => {
	test("MONSTER_COUNT === 80", () => {
		expect(MONSTER_COUNT).toBe(80)
	})

	test("MONSTERS.length === 80", () => {
		expect(MONSTERS.length).toBe(80)
	})

	test("FIRST_MONSTER_ID === 0 and is common", () => {
		expect(FIRST_MONSTER_ID).toBe(0)
		expect(rarityOf(0)).toBe("common")
	})
})

describe("rarity distribution", () => {
	test("common: 36, rare: 21, epic: 11, legendary: 12", () => {
		expect(IDS_BY_RARITY.common.length).toBe(36)
		expect(IDS_BY_RARITY.rare.length).toBe(21)
		expect(IDS_BY_RARITY.epic.length).toBe(11)
		// 4 oryginalne (45,46,47,71) + 4 tylko-dzielenie (72–75) + 4 tylko-luka (76–79)
		expect(IDS_BY_RARITY.legendary.length).toBe(12)
	})
})

describe("DNA uniqueness", () => {
	test("all 80 DNA signatures are unique", () => {
		const sigs = MONSTERS.map(
			(m) =>
				`${m.dna.body}-${m.dna.palette}-${m.dna.eyes}-${m.dna.mouth}-${m.dna.topper}-${m.dna.pattern}-${m.dna.accessory}`,
		)
		const unique = new Set(sigs)
		expect(unique.size).toBe(80)
	})

	test("all 80 names are unique", () => {
		const names = MONSTERS.map((m) => m.name)
		const unique = new Set(names)
		expect(unique.size).toBe(80)
	})
})

describe("legendary and epic DNA rules", () => {
	test("every legendary has accessory=crown and palette=7", () => {
		for (const id of IDS_BY_RARITY.legendary) {
			const m = MONSTERS[id]
			if (!m) throw new Error(`monster ${id} not found`)
			expect(m.dna.accessory).toBe("crown")
			expect(m.dna.palette).toBe(7)
		}
	})

	test("every epic has palette=6 and accessory wings or aura", () => {
		for (const id of IDS_BY_RARITY.epic) {
			const m = MONSTERS[id]
			if (!m) throw new Error(`monster ${id} not found`)
			expect(m.dna.palette).toBe(6)
			expect(["wings", "aura"]).toContain(m.dna.accessory)
		}
	})
})

describe("division-only legendaries", () => {
	test("DIVISION_ONLY_IDS = {72,73,74,75} i wszystkie są legendarne", () => {
		expect([...DIVISION_ONLY_IDS].sort((a, b) => a - b)).toEqual([
			72, 73, 74, 75,
		])
		for (const id of DIVISION_ONLY_IDS) {
			expect(rarityOf(id)).toBe("legendary")
			expect(isDivisionOnly(id)).toBe(true)
		}
	})

	test("macierz pul per tryb: każdy blok ekskluzywny widoczny tylko dla swojego trybu", () => {
		const mult = idsByRarityForMode("mult")
		const div = idsByRarityForMode("div")
		const gap = idsByRarityForMode("gap")
		// mnożenie/życzenia: 4 legendarne (oryginalne), zero ekskluzywnych
		expect(mult.legendary.length).toBe(4)
		// div i gap: baza + własny blok ekskluzywny (4+4)
		expect(div.legendary.length).toBe(8)
		expect(gap.legendary.length).toBe(8)
		for (const id of DIVISION_ONLY_IDS) {
			expect(mult.legendary).not.toContain(id)
			expect(div.legendary).toContain(id)
			expect(gap.legendary).not.toContain(id)
		}
		for (const id of GAP_ONLY_IDS) {
			expect(mult.legendary).not.toContain(id)
			expect(div.legendary).not.toContain(id)
			expect(gap.legendary).toContain(id)
		}
		// pozostałe tiery identyczne we wszystkich trybach
		expect(mult.common).toEqual(div.common)
		expect(mult.rare).toEqual(div.rare)
		expect(mult.epic).toEqual(div.epic)
		expect(gap.common).toEqual(div.common)
		expect(gap.rare).toEqual(div.rare)
		expect(gap.epic).toEqual(div.epic)
	})
})

describe("gap-only legendaries", () => {
	test("GAP_ONLY_IDS = {76,77,78,79} i wszystkie są legendarne", () => {
		expect([...GAP_ONLY_IDS].sort((a, b) => a - b)).toEqual([76, 77, 78, 79])
		for (const id of GAP_ONLY_IDS) {
			expect(rarityOf(id)).toBe("legendary")
			expect(isGapOnly(id)).toBe(true)
			expect(isDivisionOnly(id)).toBe(false)
		}
	})
})

describe("frozen catalog signature", () => {
	const signature = MONSTERS.map(
		(m) =>
			`${m.id}:${m.name}:${m.dna.body}-${m.dna.palette}-${m.dna.eyes}-${m.dna.mouth}-${m.dna.topper}-${m.dna.pattern}-${m.dna.accessory}`,
	).join("|")

	test("frozen catalog signature is unchanged", () => {
		expect(signature).toBe(
			"0:Bzypuś:2-0-2-3-0-3-none|1:Migtka:5-1-4-1-0-2-none|2:Łapsio:0-2-4-0-0-3-none|3:Migmek:1-3-1-0-2-0-none|4:Gutka:2-4-3-2-4-3-none|5:Plutka:5-5-1-0-1-2-none|6:Ciapcio:5-1-1-1-3-0-none|7:Pimnek:5-2-3-1-1-2-none|8:Ciapbek:1-3-1-0-3-3-none|9:Bzylka:1-4-0-3-1-0-none|10:Bzynek:3-5-0-2-2-3-none|11:Pluluś:3-0-4-2-3-3-none|12:Ciaplka:0-2-2-3-4-2-none|13:Ciappuś:5-3-2-3-3-3-none|14:Tuptka:3-4-3-0-1-0-none|15:Pimbek:0-5-3-0-4-3-none|16:Klunek:1-0-2-1-1-1-none|17:Zygpuś:2-1-4-3-3-3-none|18:Łapnek:2-3-0-3-4-1-none|19:Chrucio:5-4-4-0-2-3-none|20:Miglka:1-5-4-2-3-2-none|21:Pykmek:5-0-4-0-2-3-none|22:Chruzia:2-1-2-1-2-1-none|23:Bzyfik:5-2-1-2-0-3-none|24:Migpuś:1-4-2-2-3-0-none|25:Zygluś:0-5-3-2-3-2-none|26:Pykfik:2-0-3-0-2-2-none|27:Zyglka:0-1-0-2-0-1-none|28:Zygcio:4-2-0-1-1-1-none|29:Chrumek:3-3-3-2-1-3-none|30:Mrupek:0-5-3-1-2-0-none|31:Zygmek:5-0-4-0-1-1-none|32:Ciapnek:4-1-3-0-4-1-none|33:Zygnek:5-2-2-2-0-1-none|34:Klusio:0-3-2-2-1-1-none|35:Klufik:2-4-2-3-0-0-none|36:Guluś:1-0-3-1-2-2-none|37:Migcio:2-1-2-2-3-2-none|38:Bulfik:0-6-0-3-3-3-wings|39:Mrumek:2-6-0-2-4-1-wings|40:Pimtka:1-6-0-0-1-3-aura|41:Pimzia:0-6-2-1-4-2-aura|42:Klumek:1-6-2-1-0-1-aura|43:Fizia:2-6-1-3-3-0-aura|44:Tuppek:0-6-1-0-0-1-aura|45:Wielki Ciapzia:4-7-2-0-4-2-crown|46:Królewski Migzia:5-7-2-1-2-3-crown|47:Wielki Tuppuś:1-7-0-1-3-1-crown|48:Migpek:0-2-4-1-1-2-none|49:Fruzia:4-3-4-3-4-2-none|50:Pimluś:2-4-4-1-1-0-none|51:Pimpek:0-5-3-3-2-2-none|52:Plubek:0-0-2-2-3-3-none|53:Pykpek:1-1-4-3-1-2-none|54:Klupuś:2-3-4-1-3-2-none|55:Mrusio:0-4-1-0-0-0-none|56:Ciappek:3-5-3-2-1-2-none|57:Pykpuś:1-0-0-2-1-1-none|58:Gumek:4-1-3-1-1-2-none|59:Bulmek:5-2-3-0-2-3-none|60:Bulluś:4-4-1-2-4-0-none|61:Gubek:0-5-2-2-4-2-none|62:Kluluś:1-0-2-2-3-0-none|63:Zygsio:4-1-4-1-2-1-none|64:Klulka:3-2-4-2-2-3-none|65:Plusio:3-3-2-2-4-2-none|66:Frutka:5-5-3-2-1-2-none|67:Bzyzia:1-6-2-1-2-0-aura|68:Gupuś:2-6-1-1-2-2-aura|69:Ciapmek:2-6-4-3-2-3-wings|70:Fibek:1-6-1-1-0-0-aura|71:Złoty Mrunek:0-7-0-0-2-1-crown|72:Wielki Ciapfik:1-7-0-3-1-0-crown|73:Królewski Tupluś:5-7-3-2-2-0-crown|74:Wielki Bulpek:0-7-0-1-2-1-crown|75:Królewski Mrufik:4-7-4-1-0-3-crown|76:Królewski Plulka:1-7-0-2-4-2-crown|77:Wielki Mrupuś:4-7-4-0-3-3-crown|78:Złoty Łapfik:2-7-3-3-3-3-crown|79:Królewski Pimsio:0-7-2-1-3-3-crown",
		)
	})
})
