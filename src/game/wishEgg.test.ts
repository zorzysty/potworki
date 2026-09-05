import { describe, expect, test } from "bun:test"
import { WISH_COST, WISH_COST_NO_DREAM } from "./rewards"
import { type WishEggState, wishEgg } from "./wishEgg"

// Wymarzony: 0 = pierwszy potworek (mnożeniowy), 76 = tylko-luka. Fontanna L1
// odblokowuje studnię; brak zniżki na L1 (zniżka rośnie z poziomem).
const base = (over: Partial<WishEggState> = {}): WishEggState => ({
	dreamMonsterId: null,
	ownedMonsters: {},
	achievementStats: { wishEggsBought: 0 } as WishEggState["achievementStats"],
	village: { buildings: { fontanna: 1 }, decorations: [], goalId: null },
	...over,
})

describe("wishEgg", () => {
	test("wymarzony w puli podbija cenę i włącza etykietę — jednym polem", () => {
		const w = wishEgg(base({ dreamMonsterId: 0 }))
		expect(w.dreamApplies).toBe(true)
		expect(w.cost).toBe(WISH_COST.common)
	})

	test("wymarzony posiadany albo ekskluzywny trybu = liczony jak bez dreamu", () => {
		expect(wishEgg(base({ dreamMonsterId: 76 })).dreamApplies).toBe(false)
		expect(wishEgg(base({ dreamMonsterId: 76 })).cost).toBe(WISH_COST_NO_DREAM)
		expect(
			wishEgg(
				base({ dreamMonsterId: 0, ownedMonsters: { 0: { hatchedAt: 1 } } }),
			).dreamApplies,
		).toBe(false)
	})

	test("bez fontanny: zablokowane, ale pula dostępna", () => {
		const w = wishEgg(
			base({ village: { buildings: {}, decorations: [], goalId: null } }),
		)
		expect(w.unlocked).toBe(false)
		expect(w.available).toBe(true)
	})
})
