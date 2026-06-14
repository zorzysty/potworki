/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import {
	addEggFragment,
	eggQuality,
	eggQualityScore,
	ISKIERKI_CAP,
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

describe("addEggFragment", () => {
	const emptyBank = {
		eggFragments: 0,
		eggStarBank: 0,
		eggsEarned: 0,
		iskierki: 0,
	}

	test("poniżej progu: akumuluje fragment i gwiazdki, created === null", () => {
		const { bank, created } = addEggFragment(emptyBank, 3, "mult", () => 0)
		expect(created).toBeNull()
		expect(bank.eggFragments).toBe(1)
		expect(bank.eggStarBank).toBe(3)
		expect(bank.eggsEarned).toBe(0)
		expect(bank.iskierki).toBe(0)
	})

	test("na progu (jajko #1, próg=10): domyka jajko i resetuje bank", () => {
		const bank9 = {
			eggFragments: 9,
			eggStarBank: 20,
			eggsEarned: 0,
			iskierki: 0,
		}
		const { bank, created } = addEggFragment(bank9, 3, "mult", () => 0)
		expect(created).not.toBeNull()
		expect(bank.eggFragments).toBe(0)
		expect(bank.eggStarBank).toBe(0)
		expect(bank.eggsEarned).toBe(1)
		expect(created?.mode).toBe("mult")
	})

	test("eggsEarned zwiększa się o 1 przy domknięciu", () => {
		const bank9 = {
			eggFragments: 9,
			eggStarBank: 0,
			eggsEarned: 0,
			iskierki: 0,
		}
		const { bank } = addEggFragment(bank9, 0, "div", () => 0)
		expect(bank.eggsEarned).toBe(1)
	})

	test("tryb jajka zachowany w created.mode", () => {
		const bank9 = {
			eggFragments: 9,
			eggStarBank: 0,
			eggsEarned: 0,
			iskierki: 0,
		}
		const { created } = addEggFragment(bank9, 0, "div", () => 0)
		expect(created?.mode).toBe("div")
	})

	test("tęczowe: iskierki rośnie o 1", () => {
		// próg=10, bank=27+3=30, threshold=10 → score=30 → rand=0.999 → rainbow
		const bank9 = {
			eggFragments: 9,
			eggStarBank: 27,
			eggsEarned: 0,
			iskierki: 5,
		}
		const { bank, created } = addEggFragment(bank9, 3, "mult", () => 0.999)
		expect(created?.quality).toBe("rainbow")
		expect(bank.iskierki).toBe(6)
	})

	test("tęczowe przy ISKIERKI_CAP: iskierki zatrzymuje się na capie", () => {
		const bank9 = {
			eggFragments: 9,
			eggStarBank: 27,
			eggsEarned: 0,
			iskierki: ISKIERKI_CAP,
		}
		const { bank } = addEggFragment(bank9, 3, "mult", () => 0.999)
		expect(bank.iskierki).toBe(ISKIERKI_CAP)
	})

	test("non-rainbow: iskierki się nie zmienia", () => {
		// rand=0 → normal quality (roll=0 → 0-10<0 → normal)
		const bank9 = {
			eggFragments: 9,
			eggStarBank: 0,
			eggsEarned: 0,
			iskierki: 7,
		}
		const { bank } = addEggFragment(bank9, 0, "mult", () => 0)
		expect(bank.iskierki).toBe(7)
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
