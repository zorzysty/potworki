/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import { INITIAL_SAVE, SAVE_KEYS } from "../store/schema"
import { shouldUnlockNextStage, stageFacts } from "./adaptive"
import { isCollectionComplete, isNonLegendaryComplete } from "./collection"
import {
	distributeStars,
	nextMasteryStep,
	ownPatch,
	parseSaveJson,
	SCENARIOS,
	simulateRound,
	withMastery,
} from "./debug"
import { STAGES } from "./facts"
import { dayStamp } from "./time"

describe("distributeStars", () => {
	test("all 3s when total equals n*3", () => {
		const result = distributeStars(30, 10)
		expect(result).toHaveLength(10)
		expect(result.every((x) => x === 3)).toBe(true)
		expect(result.reduce((a, b) => a + b, 0)).toBe(30)
	})

	test("sums to 20 and every element is in 0..3", () => {
		const result = distributeStars(20, 10)
		expect(result.reduce((a, b) => a + b, 0)).toBe(20)
		expect(result.every((x) => x >= 0 && x <= 3)).toBe(true)
	})

	test("all zeros when total is 0", () => {
		const result = distributeStars(0, 10)
		expect(result.reduce((a, b) => a + b, 0)).toBe(0)
		expect(result.every((x) => x === 0)).toBe(true)
	})
})

describe("simulateRound", () => {
	const fixedNow = 1_700_000_000_000

	test("is deterministic given a fixed rand and now", () => {
		const a = simulateRound(INITIAL_SAVE, "mult", 30, mulberry32(7), fixedNow)
		const b = simulateRound(INITIAL_SAVE, "mult", 30, mulberry32(7), fixedNow)
		expect(a).toEqual(b)
	})

	test("runda w fazie summary z dokładnie totalStars; każde pytanie ma attempts >= 1", () => {
		for (const total of [30, 24, 20, 0]) {
			const { patch, round } = simulateRound(
				INITIAL_SAVE,
				"mult",
				total,
				mulberry32(42),
				fixedNow,
			)
			expect(round.phase).toBe("summary")
			expect(round.stars).toBe(total)
			expect(round.asked.length).toBe(10)
			for (const key of round.asked)
				expect(patch.facts?.[key]?.attempts).toBeGreaterThanOrEqual(1)
		}
	})

	test("eggFragments and eggsEarned advance consistently with fragmentsForEgg", () => {
		// threshold for first egg is fragmentsForEgg(0) = 10 = QUESTIONS_PER_ROUND
		const { patch, round } = simulateRound(
			INITIAL_SAVE,
			"mult",
			30,
			mulberry32(99),
			fixedNow,
		)
		expect(patch.eggsEarned).toBe(1)
		expect(patch.eggFragments).toBe(0)
		expect(patch.pendingEggs).toHaveLength(1)
		expect(round.eggsCreated).toEqual([0])
	})

	test("partial accumulation when threshold not reached", () => {
		// eggsEarned=1 → threshold 14 > 10 fragments
		const { patch, round } = simulateRound(
			{ ...INITIAL_SAVE, eggsEarned: 1 },
			"mult",
			20,
			mulberry32(55),
			fixedNow,
		)
		expect(patch.eggsEarned).toBe(1)
		expect(patch.eggFragments).toBe(10)
		expect(patch.pendingEggs).toHaveLength(0)
		expect(round.eggsCreated).toEqual([])
	})

	test("żołd: symulowana runda wypłaca iskierki jak prawdziwa", () => {
		// świeży zapis: lastPlayedDay "" → pierwsza runda dnia; 30★ = dobra+perfekcja;
		// pusta wioska → 1+1+1+1 = 4
		const r = simulateRound(INITIAL_SAVE, "mult", 30, mulberry32(7), fixedNow)
		expect(r.round.wageEarned).toBe(4)
		expect(r.patch.iskierki).toBeGreaterThanOrEqual(4) // + ewentualna tęczowa iskierka
		expect(r.patch.totalRounds).toBe(1)

		// zamek L2 + runda tego samego dnia co lastPlayedDay → 1+1+1+2 = 5
		const withCastle = {
			...INITIAL_SAVE,
			village: {
				buildings: { zamek: 2 as number },
				decorations: [],
				goalId: null,
			},
			achievementStats: {
				...INITIAL_SAVE.achievementStats,
				lastPlayedDay: dayStamp(fixedNow),
			},
		}
		const r2 = simulateRound(withCastle, "mult", 30, mulberry32(7), fixedNow)
		expect(r2.round.wageEarned).toBe(5)
	})
})

describe("panel debug: scenariusze i patche", () => {
	const rand = mulberry32(7)
	const now = 1_700_000_000_000

	test("każdy scenariusz daje patch z kluczami SaveState i sensownym stanem", () => {
		for (const sc of SCENARIOS) {
			const patch = sc.apply(INITIAL_SAVE, rand, now)
			for (const key of Object.keys(patch))
				expect((SAVE_KEYS as string[]).includes(key)).toBe(true)
			const save = { ...INITIAL_SAVE, ...patch }
			expect(save.unlockedStage).toBeLessThanOrEqual(STAGES.length - 1)
			expect(save.celebratedStage).toBeLessThanOrEqual(save.unlockedStage)
			if (save.expedition)
				expect(save.expedition.monsterId in save.ownedMonsters).toBe(true)
		}
	})

	test("prawie komplet blokuje Jajko Życzeń, wszystko = pełna kolekcja", () => {
		const near = SCENARIOS.find((s) => s.id === "near-complete")
		const all = SCENARIOS.find((s) => s.id === "everything")
		if (!near || !all) throw new Error("brak scenariusza")
		const nearSave = { ...INITIAL_SAVE, ...near.apply(INITIAL_SAVE, rand, now) }
		expect(isNonLegendaryComplete(nearSave.ownedMonsters)).toBe(true)
		expect(isCollectionComplete(nearSave.ownedMonsters)).toBe(false)
		const allSave = { ...INITIAL_SAVE, ...all.apply(INITIAL_SAVE, rand, now) }
		expect(isCollectionComplete(allSave.ownedMonsters)).toBe(true)
	})

	test("nextMasteryStep cyklicznie, withMastery daje attempts ≥ 1", () => {
		expect(nextMasteryStep(0)).toBe(0.5)
		expect(nextMasteryStep(0.5)).toBe(0.85)
		expect(nextMasteryStep(1)).toBe(0)
		const facts = withMastery({}, ["2x3"], 0.85, now)
		expect(facts["2x3"]?.attempts).toBe(1)
		expect(facts["2x3"]?.mastered).toBe(true)
	})

	test("parseSaveJson: opakowanie persist i surowy stan, śmieci → null", () => {
		expect(parseSaveJson("{nope")).toBeNull()
		expect(parseSaveJson('{"foo":1}')).toBeNull()
		expect(parseSaveJson('{"state":{"iskierki":5},"version":19}')).toEqual({
			iskierki: 5,
		})
		expect(parseSaveJson('{"iskierki":7}')).toEqual({ iskierki: 7 })
	})
})

test("skok do etapu nie otwiera kolejnej bramy od razu", () => {
	const sc = SCENARIOS.find((s) => s.id === "gate-feed")
	if (!sc) throw new Error("brak scenariusza")
	const save = {
		...INITIAL_SAVE,
		...sc.apply(INITIAL_SAVE, mulberry32(1), 1_700_000_000_000),
	}
	expect(shouldUnlockNextStage(save.facts, save.unlockedStage)).toBe(false)
})

describe("panel debug: poprawki z przeglądu", () => {
	const now = 1_700_000_000_000

	test("skok do etapu: najnowsza tabliczka bez flagi mastered", () => {
		const sc = SCENARIOS.find((s) => s.id === "gate-pairs")
		if (!sc) throw new Error("brak scenariusza")
		const save = {
			...INITIAL_SAVE,
			...sc.apply(INITIAL_SAVE, mulberry32(1), now),
		}
		for (const f of stageFacts(save.unlockedStage)) {
			expect(save.facts[f.key]?.mastered).toBe(false)
			expect(save.facts[f.key]?.mastery).toBe(0.4)
		}
	})

	test("ownPatch: wykluty wymarzony zwalnia slot, odebranie zeruje wskaźniki", () => {
		const base = { ...INITIAL_SAVE, dreamMonsterId: 5 }
		const got = ownPatch(base, [5], true, now)
		expect(got.dreamMonsterId).toBeNull()
		const withRefs = {
			...INITIAL_SAVE,
			ownedMonsters: { 3: { hatchedAt: 1 } },
			companionId: 3,
			expedition: { monsterId: 3, typeId: "zwiad" as const, roundsAtStart: 0 },
		}
		const gone = ownPatch(withRefs, [3], false, now)
		expect(gone.companionId).toBeNull()
		expect(gone.expedition).toBeNull()
	})

	test("parseSaveJson migruje opakowany stary zapis", () => {
		const old = {
			state: { ...INITIAL_SAVE, legendaryPity: { mult: 2, div: 0, gap: 0 } },
			version: 16,
		}
		const patch = parseSaveJson(JSON.stringify(old))
		expect(patch?.legendaryPity).toMatchObject({ mult: 2, pairs: 0, feed: 0 })
	})
})
