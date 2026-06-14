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

	test("pełny łańcuch v1→v4: eggsEarned, celebratedStage, mode jajek, dane zachowane", () => {
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
		// dane oryginalne zachowane
		expect(result.iskierki).toBe(7)
		expect(result.unlockedStage).toBe(2)
	})

	test("częściowy łańcuch v2→v4: celebratedStage dodane + jajka dostają mode, eggsEarned nie", () => {
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
			"celebratedStage",
			"dreamMonsterId",
			"eggFragments",
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
