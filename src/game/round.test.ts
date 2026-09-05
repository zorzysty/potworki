import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import type { SaveState } from "../store/schema"
import { INITIAL_SAVE } from "../store/schema"
import { VISIT_BONUS } from "./adaptive"
import {
	budgetMs,
	expectedAnswer,
	FACTS_BY_KEY,
	MAX_QUESTIONS_PER_ROUND,
} from "./facts"
import { ISKIERKI_CAP } from "./rewards"
import {
	advance,
	newRound,
	type RoundState,
	type RoundStep,
	submitAnswer,
} from "./round"
import { dayStamp } from "./time"

const NOW = 1_700_000_000_000
const rand = mulberry32(1)

// Odpowiada na bieżące pytanie (poprawnie/błędnie) po `elapsed` ms i nakłada patch.
function answer(
	save: SaveState,
	round: RoundState,
	correct: boolean,
	elapsed = 0,
): RoundStep & { committed: boolean } {
	const expected = expectedAnswer(round.question, round.mode)
	const r = submitAnswer(
		save,
		{ ...round, answer: String(correct ? expected : expected + 1) },
		rand,
		round.startedAt + elapsed,
	)
	if (!r) throw new Error("submitAnswer zwrócił null")
	return r
}

function play(
	save: SaveState,
	round: RoundState,
	step: (
		i: number,
		round: RoundState,
	) => { correct: boolean; elapsed?: number },
): { save: SaveState; round: RoundState } {
	let cur = save
	let r = round
	for (let i = 0; r.phase !== "summary"; i++) {
		const { correct, elapsed } = step(i, r)
		let a = answer(cur, r, correct, elapsed)
		cur = { ...cur, ...a.patch }
		r = a.round
		if (r.phase === "wrong") {
			// rytuał przepisania: bez commitu, przejście w "correct"
			a = answer(cur, r, true)
			expect(a.committed).toBe(false)
			expect(a.patch).toEqual({})
			r = a.round
		}
		const n = advance(cur, r, rand, NOW + 1000 * (i + 1))
		if (!n) throw new Error("advance zwrócił null")
		cur = { ...cur, ...n.patch }
		r = n.round
	}
	return { save: cur, round: r }
}

describe("runda: pytania i powtórki", () => {
	test("10 poprawnych szybkich = 30★, 10 pytań, summary", () => {
		const { round } = play(
			INITIAL_SAVE,
			newRound(INITIAL_SAVE, "mult", rand, NOW),
			() => ({
				correct: true,
			}),
		)
		expect(round.stars).toBe(30)
		expect(round.total).toBe(10)
		expect(round.asked.length).toBe(10)
	})

	test("błąd: powtórka za 3 pytania, total+1 (cap 12), poprawna powtórka max 1★", () => {
		let seen: RoundState[] = []
		const { round } = play(
			INITIAL_SAVE,
			newRound(INITIAL_SAVE, "mult", rand, NOW),
			(i, r) => {
				seen.push(r)
				return { correct: i > 2 } // trzy pierwsze błędne
			},
		)
		expect(round.total).toBe(12) // 10 + 3 pomyłki, ale cap 12
		const requeues = seen.filter((r) => r.question.isRequeue)
		expect(requeues.length).toBe(2)
		// powtórka poprawna i szybka: dokładnie 1★ (a nie 3)
		const before = seen.find((r) => r.question.isRequeue)
		expect(before).toBeDefined()
		if (before) {
			const a = answer(INITIAL_SAVE, before, true, 0)
			expect(a.round.lastStars).toBe(1)
		}
		seen = []
	})

	test("szybkość tylko nagradza: wolna poprawna odpowiedź daje fragment i pełną naukę przy 0★", () => {
		const round = newRound(INITIAL_SAVE, "mult", rand, NOW)
		const fact = FACTS_BY_KEY.get(round.question.key)
		if (!fact) throw new Error("brak faktu")
		const slow = answer(INITIAL_SAVE, round, true, budgetMs(fact) * 10)
		expect(slow.round.lastStars).toBe(0)
		expect(slow.patch.eggFragments).toBe(1)
		expect(slow.patch.facts?.[fact.key]?.correct).toBe(1)
		// błędna odpowiedź też daje fragment
		const wrong = answer(INITIAL_SAVE, round, false)
		expect(wrong.patch.eggFragments).toBe(1)
	})
})

describe("runda: finalizacja", () => {
	test("kolejność: bonus pierwszej rundy dnia liczony PRZED podbiciem dnia; daysPlayed+1; totalRounds+1", () => {
		const yesterday: SaveState = {
			...INITIAL_SAVE,
			achievementStats: {
				...INITIAL_SAVE.achievementStats,
				lastPlayedDay: "2000-1-1",
				daysPlayed: 3,
			},
		}
		const { save, round } = play(
			yesterday,
			newRound(yesterday, "mult", rand, NOW),
			() => ({
				correct: true,
			}),
		)
		expect(save.achievementStats.lastPlayedDay).toBe(dayStamp(NOW + 10_000))
		expect(save.achievementStats.daysPlayed).toBe(4)
		expect(save.totalRounds).toBe(1)
		expect(save.achievementStats.perfectRounds).toBe(1)
		// żołd pierwszej rundy dnia w pustej wiosce: 1 baza + 1 dobra + 1 perfekcja + 1 dzień
		expect(round.wageEarned).toBe(4)
		// ta sama runda tego samego dnia raz jeszcze: bez bonusu dnia
		const again = play(
			save,
			newRound(save, "mult", rand, NOW + 20_000),
			() => ({ correct: true }),
		)
		expect(again.round.wageEarned).toBe(3)
		expect(again.save.achievementStats.daysPlayed).toBe(4)
	})

	test("jeden cap portfela dla żołdu + bonusu wizyty + nagrody wyprawy", () => {
		const rich: SaveState = { ...INITIAL_SAVE, iskierki: ISKIERKI_CAP - 1 }
		const visit: RoundState = {
			...newRound(rich, "mult", rand, NOW),
			visitStage: 0,
		}
		const { save, round } = play(rich, visit, () => ({ correct: true }))
		expect(round.wageEarned + VISIT_BONUS).toBeGreaterThan(1)
		expect(save.iskierki).toBe(ISKIERKI_CAP)
		expect(save.achievementStats.visitRoundsCompleted).toBe(1)
	})

	test("jajko domknięte w rundzie: eggsCreated wskazuje indeks w pendingEggs (za już czekającym)", () => {
		// eggFragments=9 → 1. odpowiedź domyka jajko; próg 14 — drugie nie zdąży
		const save: SaveState = {
			...INITIAL_SAVE,
			eggFragments: 9,
			pendingEggs: [{ quality: "normal", mode: "mult" }],
		}
		const { save: after, round } = play(
			save,
			newRound(save, "mult", rand, NOW),
			() => ({
				correct: true,
			}),
		)
		expect(round.eggsCreated).toEqual([1])
		expect(after.pendingEggs.length).toBe(2)
		expect(after.eggFragments).toBe(9) // 10 odpowiedzi − 1 na domknięcie
	})

	test("advance poza fazą correct = null; submitAnswer bez odpowiedzi = null", () => {
		const round = newRound(INITIAL_SAVE, "mult", rand, NOW)
		expect(advance(INITIAL_SAVE, round, rand, NOW)).toBeNull()
		expect(submitAnswer(INITIAL_SAVE, round, rand, NOW)).toBeNull()
		expect(MAX_QUESTIONS_PER_ROUND).toBe(12)
	})
})
