/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import {
	addEggFragment,
	DUP_QUALITY_MULT,
	dupIskierki,
	eggQuality,
	eggQualityScore,
	ISKIERKI_CAP,
	ISKIERKI_FOR_DUP,
	LEGENDARY_PITY_EVERY,
	QUALITY_ORDER,
	qualityOdds,
	RARITY_ODDS,
	rollMonsterWithPity,
	rollWish,
	WISH_COST,
	WISH_COST_NO_DREAM,
	WISH_COST_STEP,
	WISH_PRICE_FLOOR,
	WISH_SURCHARGE_MAX,
	wishEggPrice,
} from "./rewards"

describe("wishEggPrice", () => {
	test("pierwsze jajko = baza, każde kolejne o krok drożej", () => {
		expect(wishEggPrice(WISH_COST_NO_DREAM, 0)).toBe(WISH_COST_NO_DREAM)
		for (let bought = 1; bought <= 5; bought++)
			expect(wishEggPrice(WISH_COST_NO_DREAM, bought)).toBe(
				WISH_COST_NO_DREAM + WISH_COST_STEP * bought,
			)
	})

	test("progresja zachowuje strukturę cen wg rzadkości wymarzonego", () => {
		expect(wishEggPrice(WISH_COST.legendary, 3)).toBe(
			wishEggPrice(WISH_COST.common, 3) +
				(WISH_COST.legendary - WISH_COST.common),
		)
	})

	test("zniżka (fontanna) schodzi z ceny końcowej, podłoga trzyma cenę > 0", () => {
		expect(wishEggPrice(WISH_COST_NO_DREAM, 0, 5)).toBe(WISH_COST_NO_DREAM - 5)
		// baza 10 − zniżka 10 → podłoga, nigdy za darmo
		expect(wishEggPrice(WISH_COST_NO_DREAM, 0, 10)).toBe(WISH_PRICE_FLOOR)
		// premia za rzadkość wymarzonego przeżywa zniżkę
		expect(wishEggPrice(WISH_COST.legendary, 0, 10)).toBe(
			WISH_COST.legendary - 10,
		)
		// bez zniżki (domyślny parametr) cena jak dotąd
		expect(wishEggPrice(WISH_COST_NO_DREAM, 2)).toBe(
			WISH_COST_NO_DREAM + 2 * WISH_COST_STEP,
		)
	})

	test("sufit dopłaty trzyma cenę w zasięgu portfela (cap 999)", () => {
		for (const base of Object.values(WISH_COST)) {
			expect(wishEggPrice(base, 999)).toBe(base + WISH_SURCHARGE_MAX)
			expect(wishEggPrice(base, 999)).toBeLessThanOrEqual(ISKIERKI_CAP)
		}
	})

	test("premia za rzadkość NIE znika po wejściu w sufit", () => {
		// sufit ogranicza dopłatę, nie cenę końcową — gdyby capował cenę,
		// wszystkie bazy zlałyby się w jedną liczbę i wymarzony legendarny
		// kosztowałby tyle co brak wymarzonego
		for (const bought of [17, 25, 500]) {
			expect(wishEggPrice(WISH_COST.legendary, bought)).toBe(
				wishEggPrice(WISH_COST_NO_DREAM, bought) +
					(WISH_COST.legendary - WISH_COST_NO_DREAM),
			)
			expect(wishEggPrice(WISH_COST.legendary, bought)).toBeGreaterThan(
				wishEggPrice(WISH_COST_NO_DREAM, bought),
			)
		}
	})
})

describe("qualityOdds", () => {
	test("every row sums to 100", () => {
		for (let s = 0; s <= 30; s++) {
			const sum = qualityOdds(s).reduce((a, b) => a + b, 0)
			expect(sum).toBe(100)
		}
	})
	test("tęczowe tylko od score 28, pełna szansa tylko przy 30", () => {
		expect(qualityOdds(27)[3]).toBe(0)
		expect(qualityOdds(28)[3]).toBeGreaterThan(0)
		expect(qualityOdds(30)[3]).toBe(40)
	})
	test("krzywa łagodna: srebrne od 16, złote od 23, zwykłe poniżej 16", () => {
		expect(qualityOdds(15)).toEqual([100, 0, 0, 0])
		expect(qualityOdds(16)[1]).toBeGreaterThan(0)
		expect(qualityOdds(22)[2]).toBe(0)
		expect(qualityOdds(23)[2]).toBeGreaterThan(0)
	})
	test("monotoniczna: wyższy score nigdy nie zwiększa szansy na zwykłe", () => {
		for (let s = 1; s <= 30; s++) {
			expect(qualityOdds(s)[0]).toBeLessThanOrEqual(qualityOdds(s - 1)[0])
		}
	})
})

describe("dupIskierki", () => {
	test("zwykłe jajko i Jajko Życzeń = tabela rzadkości bez mnożnika", () => {
		expect(dupIskierki("common", "normal")).toBe(ISKIERKI_FOR_DUP.common)
		expect(dupIskierki("epic", "wish")).toBe(ISKIERKI_FOR_DUP.epic)
	})
	test("mnożnik rośnie z jakością jajka", () => {
		let prev = 0
		for (const q of QUALITY_ORDER) {
			expect(DUP_QUALITY_MULT[q]).toBeGreaterThan(prev)
			prev = DUP_QUALITY_MULT[q]
		}
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
	test("normal at 15 with any roll", () => {
		expect(eggQuality(15, () => 0.999)).toBe("normal")
	})
	test("normal at 30 with zero roll (lowest bucket)", () => {
		expect(eggQuality(30, () => 0)).toBe("normal")
	})
})

describe("eggQualityScore", () => {
	test("komplet 3★ → 30 niezależnie od progu (pełna szansa na tęczowe = bezbłędnie)", () => {
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
	test("duże jajko: jedna skaza nie daje score 30", () => {
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

	test("nadmiar fragmentów po obniżeniu progu: score z faktycznie zebranych, nie darmowe 30", () => {
		// próg 22 (eggsEarned 30), a jajko ma już 25 fragmentów z 2★ każdy
		const bank = {
			eggFragments: 25,
			eggStarBank: 50,
			eggsEarned: 30,
			iskierki: 0,
		}
		const { bank: after, created } = addEggFragment(
			bank,
			2,
			"mult",
			() => 0.999,
		)
		expect(created).not.toBeNull()
		expect(after.eggFragments).toBe(0)
		// 52★ / 26 fragmentów = 2★ → score 20 → nigdy tęczowe (rand 0.999 dałoby je przy 30)
		expect(created?.quality).not.toBe("rainbow")
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

// wspólna mini-pula dla testów losowania (rollMonsterWithPity, rollWish)
const idsByRarity = {
	common: [0, 1, 2],
	rare: [3, 4],
	epic: [5],
	legendary: [6, 7],
}
const rarityOf = (id: number) =>
	id <= 2 ? "common" : id <= 4 ? "rare" : id === 5 ? "epic" : "legendary"

describe("rollMonsterWithPity", () => {
	const ctx = (owned: number[]) => ({
		idsByRarity,
		owned: new Set(owned),
		dreamId: null,
		rarityOf,
		rand: () => 0, // rollTier → zawsze common
	})
	test("poniżej progu: zwykły los, licznik rośnie", () => {
		const r = rollMonsterWithPity("normal", ctx([]), 3)
		expect(rarityOf(r.id)).toBe("common")
		expect(r.pity).toBe(4)
	})
	test("na progu: gwarantowany legendarny, licznik wraca do zera", () => {
		const r = rollMonsterWithPity("normal", ctx([]), LEGENDARY_PITY_EVERY - 1)
		expect(rarityOf(r.id)).toBe("legendary")
		expect(r.pity).toBe(0)
	})
	test("brak nieposiadanych legendarnych w puli: pity nie wymusza tieru", () => {
		const r = rollMonsterWithPity("normal", ctx([6, 7]), 50)
		expect(rarityOf(r.id)).toBe("common")
	})
	test("naturalny legendarny też zeruje licznik", () => {
		const r = rollMonsterWithPity(
			"normal",
			{ ...ctx([]), rand: () => 0.999 },
			5,
		)
		expect(rarityOf(r.id)).toBe("legendary")
		expect(r.pity).toBe(0)
	})
})

describe("rollWish", () => {
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
			expect(owned.has(got)).toBe(false)
		}
	})
	test("pula wyczerpana → zwykłe losowanie (duplikat), nigdy brak potworka", () => {
		const owned = new Set<number>([0, 1, 2, 3, 4, 5, 6, 7])
		const got = rollWish({
			idsByRarity,
			owned,
			dreamId: null,
			rarityOf,
			rand: () => 0.5,
		})
		expect(owned.has(got)).toBe(true)
	})
})
