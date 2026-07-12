/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import {
	EXPEDITIONS,
	EXPEDITIONS_BY_ID,
	type ExpeditionState,
	expeditionProgress,
	isExpeditionDone,
	resolveExpedition,
} from "./expeditions"

const trip = (over: Partial<ExpeditionState> = {}): ExpeditionState => ({
	monsterId: 0,
	typeId: "zwiad",
	roundsAtStart: 0,
	...over,
})

describe("katalog wypraw — integralność", () => {
	test("3 typy, unikalne id, mapa spójna z tablicą", () => {
		expect(EXPEDITIONS.length).toBe(3)
		const ids = EXPEDITIONS.map((e) => e.id)
		expect(new Set(ids).size).toBe(ids.length)
		for (const e of EXPEDITIONS) expect(EXPEDITIONS_BY_ID.get(e.id)).toBe(e)
	})
	test("czasy trwania > 0 i rosnące; nagrody rosnące", () => {
		for (let i = 0; i < EXPEDITIONS.length; i++) {
			const e = EXPEDITIONS[i] as (typeof EXPEDITIONS)[number]
			expect(e.durationRounds).toBeGreaterThan(0)
			if (i > 0) {
				const prev = EXPEDITIONS[i - 1] as (typeof EXPEDITIONS)[number]
				expect(e.durationRounds).toBeGreaterThan(prev.durationRounds)
				expect(e.rewardIskierki).toBeGreaterThan(prev.rewardIskierki)
			}
		}
	})
	test("każdy typ ma niepuste teksty i tropChance w 0..1", () => {
		for (const e of EXPEDITIONS) {
			expect(e.name.length).toBeGreaterThan(0)
			expect(e.description.length).toBeGreaterThan(0)
			expect(e.tropChance).toBeGreaterThanOrEqual(0)
			expect(e.tropChance).toBeLessThanOrEqual(1)
		}
	})
})

describe("katalog wypraw — inwarianty ekonomii (decyzje projektowe)", () => {
	test("✨/runda ≤ 2.5 dla każdego typu — wyprawa nigdy nie przegania żołdu", () => {
		for (const e of EXPEDITIONS) {
			expect(e.rewardIskierki / e.durationRounds).toBeLessThanOrEqual(2.5)
		}
	})
	test("stawka ✨/runda rośnie ściśle z długością — dłuższa podróż się opłaca", () => {
		for (let i = 1; i < EXPEDITIONS.length; i++) {
			const prev = EXPEDITIONS[i - 1] as (typeof EXPEDITIONS)[number]
			const e = EXPEDITIONS[i] as (typeof EXPEDITIONS)[number]
			expect(e.rewardIskierki / e.durationRounds).toBeGreaterThan(
				prev.rewardIskierki / prev.durationRounds,
			)
		}
	})
	test("najkrótsza wyprawa ≤ 3 rundy — pierwszy powrót w jednej-dwóch sesjach", () => {
		expect(
			Math.min(...EXPEDITIONS.map((e) => e.durationRounds)),
		).toBeLessThanOrEqual(3)
	})
})

describe("expeditionProgress", () => {
	test("0 w chwili wysłania; total z katalogu", () => {
		for (const e of EXPEDITIONS) {
			const p = expeditionProgress(trip({ typeId: e.id, roundsAtStart: 7 }), 7)
			expect(p.done).toBe(0)
			expect(p.total).toBe(e.durationRounds)
		}
	})
	test("clamp: daleko za celem done === total; nigdy poniżej 0", () => {
		const e = trip({ typeId: "zwiad", roundsAtStart: 10 })
		expect(expeditionProgress(e, 999).done).toBe(3)
		// totalRounds < roundsAtStart nie powinno się zdarzyć, ale clamp trzyma 0
		expect(expeditionProgress(e, 5).done).toBe(0)
	})
	test("monotonicznie rośnie z totalRounds", () => {
		const e = trip({ typeId: "wielka", roundsAtStart: 3 })
		let prev = -1
		for (let r = 3; r < 20; r++) {
			const { done } = expeditionProgress(e, r)
			expect(done).toBeGreaterThanOrEqual(prev)
			prev = done
		}
	})
})

describe("isExpeditionDone — granica", () => {
	test("false na duration−1, true na duration (każdy typ)", () => {
		for (const e of EXPEDITIONS) {
			const s = trip({ typeId: e.id, roundsAtStart: 0 })
			expect(isExpeditionDone(s, e.durationRounds - 1)).toBe(false)
			expect(isExpeditionDone(s, e.durationRounds)).toBe(true)
		}
	})
})

describe("resolveExpedition", () => {
	const allIds = Array.from({ length: 20 }, (_, i) => i)
	const none: ReadonlySet<number> = new Set()

	test("nagroda zgadza się z katalogiem (każdy typ)", () => {
		for (const e of EXPEDITIONS) {
			const r = resolveExpedition(
				trip({ typeId: e.id }),
				none,
				allIds,
				() => 0.5,
			)
			expect(r.rewardIskierki).toBe(e.rewardIskierki)
		}
	})
	test("zwiad (tropChance 0) → trop zawsze null, nawet przy rand → 0", () => {
		const r = resolveExpedition(
			trip({ typeId: "zwiad" }),
			none,
			allIds,
			() => 0,
		)
		expect(r.tropMonsterId).toBeNull()
	})
	test("wyprawa: rand wysoki → null, rand niski → trop", () => {
		const high = resolveExpedition(
			trip({ typeId: "wyprawa" }),
			none,
			allIds,
			() => 0.99,
		)
		expect(high.tropMonsterId).toBeNull()
		const rolls = [0.1, 0]
		const low = resolveExpedition(
			trip({ typeId: "wyprawa" }),
			none,
			allIds,
			() => rolls.shift() ?? 0,
		)
		expect(low.tropMonsterId).toBe(0)
	})
	test("wielka (tropChance 1) → trop zawsze, gdy coś nieposiadane", () => {
		const r = resolveExpedition(
			trip({ typeId: "wielka" }),
			none,
			allIds,
			() => 0.999,
		)
		expect(r.tropMonsterId).not.toBeNull()
	})
	test("trop NIGDY nie jest posiadanym id (200 seedowanych losowań)", () => {
		const owned: ReadonlySet<number> = new Set(
			allIds.filter((id) => id % 2 === 0),
		)
		const rand = mulberry32(0xdead)
		for (let i = 0; i < 200; i++) {
			const r = resolveExpedition(
				trip({ typeId: "wielka" }),
				owned,
				allIds,
				rand,
			)
			expect(r.tropMonsterId).not.toBeNull()
			expect(owned.has(r.tropMonsterId as number)).toBe(false)
		}
	})
	test("komplet kolekcji → trop null (nagroda zostaje)", () => {
		const all: ReadonlySet<number> = new Set(allIds)
		const r = resolveExpedition(
			trip({ typeId: "wielka" }),
			all,
			allIds,
			() => 0,
		)
		expect(r.tropMonsterId).toBeNull()
		expect(r.rewardIskierki).toBe(
			EXPEDITIONS_BY_ID.get("wielka")?.rewardIskierki as number,
		)
	})
})
