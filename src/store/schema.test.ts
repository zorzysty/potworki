/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { INITIAL_SAVE, migrateSave, SAVE_VERSION } from "./schema"

// ---------------------------------------------------------------------------
// Łańcuch migracji zapisu — najważniejszy test w tym pliku.
// Regresja tutaj = dziecko traci dane po deployu.
// ---------------------------------------------------------------------------

describe("migrateSave", () => {
	test("brak migracji przy aktualnej wersji", () => {
		const x = { foo: "bar", iskierki: 5 }
		expect(migrateSave(x, SAVE_VERSION)).toEqual(x)
	})

	test("pełny łańcuch v1→v8: eggsEarned, celebratedStage, mode jajek, eggStarBank, osiągnięcia, companionId, dane zachowane", () => {
		const v1 = {
			ownedMonsters: {
				0: { hatchedAt: 0 },
				5: { hatchedAt: 0 },
			},
			pendingEggs: [{ quality: "normal" }],
			unlockedStage: 2,
			iskierki: 7,
		}
		const result = migrateSave(v1, 1) as Record<string, unknown>
		// 2 posiadane + 1 w gnieździe = 3
		expect(result.eggsEarned).toBe(3)
		// celebratedStage z unlockedStage = 2
		expect(result.celebratedStage).toBe(2)
		// v3→v4: jajko dostaje mode "mult"
		expect(result.pendingEggs).toEqual([{ quality: "normal", mode: "mult" }])
		// v4→v5: brak eggFragments w v1 → eggStarBank 0
		expect(result.eggStarBank).toBe(0)
		// v5→v6 + v6→v7: osiągnięcia — pusty ledger + zerowe liczniki (z daysPlayed)
		expect(result.achievements).toEqual({})
		expect(result.achievementStats).toEqual({
			perfectRounds: 0,
			divCorrect: 0,
			totalStars: 0,
			rainbowEggsHatched: 0,
			wishEggsBought: 0,
			daysPlayed: 0,
			lastPlayedDay: "",
		})
		// v7→v8: companionId startuje null (brak przyjaciela)
		expect(result.companionId).toBeNull()
		// dane oryginalne zachowane
		expect(result.iskierki).toBe(7)
		expect(result.unlockedStage).toBe(2)
	})

	test("v5→v8: dodaje pusty ledger osiągnięć, zerowe liczniki i companionId, reszta zachowana", () => {
		const v5 = {
			iskierki: 4,
			totalRounds: 9,
			ownedMonsters: { 0: { hatchedAt: 1 } },
		}
		const result = migrateSave(v5, 5) as Record<string, unknown>
		expect(result.achievements).toEqual({})
		expect(result.achievementStats).toEqual({
			perfectRounds: 0,
			divCorrect: 0,
			totalStars: 0,
			rainbowEggsHatched: 0,
			wishEggsBought: 0,
			daysPlayed: 0,
			lastPlayedDay: "",
		})
		expect(result.companionId).toBeNull()
		expect(result.iskierki).toBe(4)
		expect(result.totalRounds).toBe(9)
	})

	test("v6→v7: dopisuje daysPlayed + lastPlayedDay do istniejących liczników", () => {
		const v6 = {
			iskierki: 3,
			achievementStats: {
				perfectRounds: 2,
				divCorrect: 4,
				totalStars: 30,
				rainbowEggsHatched: 1,
				wishEggsBought: 0,
			},
		}
		const result = migrateSave(v6, 6) as Record<string, unknown>
		expect(result.achievementStats).toEqual({
			perfectRounds: 2,
			divCorrect: 4,
			totalStars: 30,
			rainbowEggsHatched: 1,
			wishEggsBought: 0,
			daysPlayed: 0,
			lastPlayedDay: "",
		})
		expect(result.iskierki).toBe(3)
	})

	test("v6→v7: brak achievementStats nie wywraca migracji", () => {
		const result = migrateSave({ iskierki: 9 }, 6) as Record<string, unknown>
		expect(result.achievementStats).toEqual({
			daysPlayed: 0,
			lastPlayedDay: "",
		})
		expect(result.iskierki).toBe(9)
	})

	test("v7→v8: dodaje companionId null, reszta zachowana", () => {
		const v7 = { iskierki: 5, dreamMonsterId: 3, totalRounds: 12 }
		const result = migrateSave(v7, 7) as Record<string, unknown>
		expect(result.companionId).toBeNull()
		// nie myli się z dreamMonsterId (osobne pola)
		expect(result.dreamMonsterId).toBe(3)
		expect(result.iskierki).toBe(5)
		expect(result.totalRounds).toBe(12)
	})

	test("częściowy łańcuch v2→v5: celebratedStage + mode jajek + eggStarBank, eggsEarned nie", () => {
		const v2 = {
			unlockedStage: 1,
			foo: "bar",
			pendingEggs: [{ quality: "gold" }],
		}
		const result = migrateSave(v2, 2) as Record<string, unknown>
		expect(result.celebratedStage).toBe(1)
		expect(result.foo).toBe("bar")
		// MIGRATIONS[1] nie uruchamiane — eggsEarned NIE dodane
		expect("eggsEarned" in result).toBe(false)
		// v3→v4: istniejące jajka dostają mode "mult"
		expect(result.pendingEggs).toEqual([{ quality: "gold", mode: "mult" }])
		// v4→v5: eggStarBank dodane (brak eggFragments → 0)
		expect(result.eggStarBank).toBe(0)
	})

	test("v4→v5: eggStarBank z dotychczasowych fragmentów (×2)", () => {
		const v4 = { eggFragments: 5, iskierki: 2 }
		const result = migrateSave(v4, 4) as Record<string, unknown>
		expect(result.eggStarBank).toBe(10)
		expect(result.iskierki).toBe(2)
		expect(result.eggFragments).toBe(5)
	})

	test("v4→v5: brak eggFragments → eggStarBank 0", () => {
		const result = migrateSave({ foo: 1 }, 4) as Record<string, unknown>
		expect(result.eggStarBank).toBe(0)
	})

	test("v3→v4: każde jajko bez mode dostaje 'mult', istniejące mode zachowane", () => {
		const v3 = {
			pendingEggs: [
				{ quality: "normal" },
				{ quality: "wish" },
				{ quality: "rainbow", mode: "div" },
			],
		}
		const result = migrateSave(v3, 3) as Record<string, unknown>
		expect(result.pendingEggs).toEqual([
			{ quality: "normal", mode: "mult" },
			{ quality: "wish", mode: "mult" },
			{ quality: "rainbow", mode: "div" },
		])
	})

	test("v3→v4: brak pendingEggs nie wywraca migracji", () => {
		const result = migrateSave({ iskierki: 3 }, 3) as Record<string, unknown>
		expect(result.iskierki).toBe(3)
	})

	test("fallback: brak unlockedStage → celebratedStage === 0", () => {
		const result = migrateSave({}, 2) as Record<string, unknown>
		expect(result.celebratedStage).toBe(0)
	})
})

// ---------------------------------------------------------------------------
// Tripwire kształtu INITIAL_SAVE.
// Zmiana tej listy oznacza, że kształt zapisu się zmienił — trzeba podbić
// SAVE_VERSION, dodać wpis w MIGRATIONS i test migracji tutaj.
// ---------------------------------------------------------------------------

describe("INITIAL_SAVE shape-lock", () => {
	test("INITIAL_SAVE zawiera dokładnie oczekiwany zestaw kluczy", () => {
		expect(Object.keys(INITIAL_SAVE).sort()).toEqual([
			"achievementStats",
			"achievements",
			"celebratedStage",
			"companionId",
			"dreamMonsterId",
			"eggFragments",
			"eggStarBank",
			"eggsEarned",
			"facts",
			"iskierki",
			"ownedMonsters",
			"pendingEggs",
			"totalRounds",
			"unlockedStage",
		])
	})
})
