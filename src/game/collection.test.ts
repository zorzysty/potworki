import { describe, expect, test } from "bun:test"
import { MONSTER_COUNT } from "../monsters/catalog"
import { REGIONS } from "../monsters/world"
import {
	byRecency,
	firstHatched,
	guardianOwned,
	isCollectionComplete,
	isPoolComplete,
	newestOwned,
} from "./collection"

const owned = {
	5: { hatchedAt: 30 },
	2: { hatchedAt: 10 },
	9: { hatchedAt: 30 },
	0: { hatchedAt: 10 },
}

describe("collection", () => {
	test("byRecency: najnowsze pierwsze, remis → niższy id", () => {
		expect(byRecency(owned)).toEqual([5, 9, 0, 2])
		expect(newestOwned(owned)).toBe(5)
		expect(newestOwned({})).toBeUndefined()
	})

	test("firstHatched: najstarszy, remis → niższy id", () => {
		expect(firstHatched(owned)).toBe(0)
	})

	test("komplet katalogu vs komplet puli mnożeniowej", () => {
		const all = Object.fromEntries(
			Array.from({ length: MONSTER_COUNT }, (_, id) => [id, { hatchedAt: 1 }]),
		)
		expect(isCollectionComplete(all)).toBe(true)
		expect(isCollectionComplete(owned)).toBe(false)
		expect(isPoolComplete(all, "mult")).toBe(true)
		expect(isPoolComplete(owned, "mult")).toBe(false)
	})

	test("guardianOwned: brak krainy = false", () => {
		const region = REGIONS[1]
		expect(region).toBeDefined()
		expect(guardianOwned(undefined, owned)).toBe(false)
		expect(guardianOwned(region, owned)).toBe(false)
		expect(
			guardianOwned(region, { [region?.guardianId ?? -1]: { hatchedAt: 1 } }),
		).toBe(true)
	})
})
