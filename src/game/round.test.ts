import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import type { SaveState } from "../store/schema"
import { INITIAL_SAVE } from "../store/schema"
import { VISIT_BONUS } from "./adaptive"
import {
	budgetMs,
	divisorPairs,
	expectedAnswer,
	FACTS_BY_KEY,
	MAX_QUESTIONS_PER_ROUND,
	pairBudgetMs,
} from "./facts"
import { ISKIERKI_CAP } from "./rewards"
import {
	advance,
	feedAnswer,
	newRound,
	type RoundState,
	type RoundStep,
	submitAnswer,
	submitFeed,
	submitPair,
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
): RoundStep {
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

describe("runda: tryb par (pairs)", () => {
	const SAVE: SaveState = { ...INITIAL_SAVE, unlockedStage: 3 } // 1,2,5,10,3,4,6
	// pytanie o zadany fakt (cel = jego iloczyn)
	const withTarget = (round: RoundState, key: "3x4" | "2x10"): RoundState => ({
		...round,
		question: {
			key,
			a:
				(FACTS_BY_KEY.get(key) as { a: number; b: number }).a *
				(FACTS_BY_KEY.get(key) as { a: number; b: number }).b,
			b: 0,
			isRequeue: false,
		},
	})

	test("dwie pary: pierwsza uczy i czeka, druga domyka pytanie z fragmentem i 3★", () => {
		const round = withTarget(newRound(SAVE, "pairs", rand, NOW), "3x4")
		expect(divisorPairs(12, 3).length).toBe(2)
		const first = submitPair(SAVE, round, 4, 3, rand, NOW + 1000)
		if (!first) throw new Error("null")
		expect(first.round.phase).toBe("answering")
		expect(first.round.found).toEqual(["3x4"])
		expect(first.round.picked).toBeNull()
		expect(first.round.lastPair).toEqual([4, 3]) // kolejność stuknięć
		expect(first.patch.facts?.["3x4"]?.correct).toBe(1)
		expect(first.patch.eggFragments).toBeUndefined() // fragment dopiero po komplecie
		const save1 = { ...SAVE, ...first.patch }
		// ta sama para drugi raz = nic
		expect(submitPair(save1, first.round, 3, 4, rand, NOW + 1500)).toBeNull()
		const second = submitPair(save1, first.round, 6, 2, rand, NOW + 2000)
		if (!second) throw new Error("null")
		expect(second.round.phase).toBe("correct")
		expect(second.round.lastStars).toBe(3)
		expect(second.round.stars).toBe(3)
		expect(second.patch.eggFragments).toBe(1)
		expect(second.patch.facts?.["2x6"]?.correct).toBe(1)
		expect(second.patch.achievementStats?.totalStars).toBe(3)
		expect(first.patch.achievementStats?.pairsCorrect).toBe(1)
		expect(second.patch.achievementStats?.pairsCorrect).toBe(2)
	})

	test("pomyłka: uczy na minus stuknięty fakt, 0★, powtórka celu, pytanie gra się dalej", () => {
		const round = withTarget(newRound(SAVE, "pairs", rand, NOW), "2x10")
		const miss = submitPair(SAVE, round, 4, 6, rand, NOW + 500) // 24 ≠ 20
		if (!miss) throw new Error("null")
		expect(miss.round.phase).toBe("answering")
		expect(miss.round.missed).toBe(true)
		expect(miss.round.shakeNonce).toBe(1)
		expect(miss.round.total).toBe(11)
		expect(miss.round.requeues[3]).toBe("2x10")
		expect(miss.patch.facts?.["4x6"]?.attempts).toBe(1)
		expect(miss.patch.facts?.["4x6"]?.correct).toBe(0)
		expect(miss.round.pairAt).toBe(NOW + 500) // namysł nad pomyłką nie obciąża następnej pary
		let save = { ...SAVE, ...miss.patch }
		let r = miss.round
		for (const [x, y] of [
			[10, 2],
			[5, 4],
		] as const) {
			const step = submitPair(save, r, x, y, rand, NOW + 1000)
			if (!step) throw new Error("null")
			save = { ...save, ...step.patch }
			r = step.round
		}
		expect(r.phase).toBe("correct")
		expect(r.lastStars).toBe(0)
		expect(save.eggFragments).toBe(1) // szybkość tylko nagradza: fragment mimo pomyłki
		// druga pomyłka w tym samym pytaniu nie dokłada kolejnej powtórki
		const again = submitPair(SAVE, miss.round, 4, 6, rand, NOW + 600)
		expect(again?.round.total).toBe(11)
	})

	test("advance zeruje stan par i omija cele o tym samym iloczynie", () => {
		const round = withTarget(newRound(SAVE, "pairs", rand, NOW), "3x4")
		let step = submitPair(SAVE, round, 3, 4, rand, NOW + 100)
		if (!step) throw new Error("null")
		step = submitPair(
			{ ...SAVE, ...step.patch },
			step.round,
			2,
			6,
			rand,
			NOW + 200,
		)
		if (!step) throw new Error("null")
		const next = advance(
			{ ...SAVE, ...step.patch },
			step.round,
			rand,
			NOW + 300,
		)
		if (!next) throw new Error("null")
		expect(next.round.found).toEqual([])
		expect(next.round.missed).toBe(false)
		expect(next.round.picked).toBeNull()
		expect(next.round.pairAt).toBe(NOW + 300)
		expect(next.round.lastPair).toBeNull()
		expect(next.round.shakeNonce).toBe(0)
		expect(next.round.question.a).not.toBe(12) // 2×6 też omijane, nie tylko 3×4
	})

	test("budżet pary luźniejszy niż faktu: komplet w 1,5× sumy budżetów faktów = 3★, mastery szybko", () => {
		const round = withTarget(newRound(SAVE, "pairs", rand, NOW), "3x4")
		const [f1, f2] = divisorPairs(12, 3)
		if (!f1 || !f2) throw new Error("brak par")
		expect(pairBudgetMs(f1)).toBeGreaterThan(budgetMs(f1))
		const t1 = NOW + 1.5 * budgetMs(f1)
		let step = submitPair(SAVE, round, f1.a, f1.b, rand, t1)
		if (!step) throw new Error("null")
		expect(step.patch.facts?.[f1.key]?.mastery).toBeCloseTo(0.3) // gain „szybko"
		step = submitPair(
			{ ...SAVE, ...step.patch },
			step.round,
			f2.a,
			f2.b,
			rand,
			t1 + 1.5 * budgetMs(f2),
		)
		expect(step?.round.lastStars).toBe(3)
	})

	test("intro-runda par: plan bez dwóch faktów o tym samym iloczynie", () => {
		// etap 2 świeżo otwarty (żaden fakt z 4 bez próby) → plan intro
		const save: SaveState = { ...INITIAL_SAVE, unlockedStage: 2 }
		for (let seed = 1; seed <= 20; seed++) {
			const r = newRound(save, "pairs", mulberry32(seed), NOW)
			expect(r.plan).not.toBeNull()
			const products = (r.plan ?? []).map((k) => {
				const f = FACTS_BY_KEY.get(k)
				return f ? f.a * f.b : 0
			})
			expect(new Set(products).size).toBe(products.length)
		}
	})

	test("submitPair poza trybem par / w innej fazie = null", () => {
		const mult = newRound(SAVE, "mult", rand, NOW)
		expect(submitPair(SAVE, mult, 3, 4, rand, NOW)).toBeNull()
		const pairs = {
			...newRound(SAVE, "pairs", rand, NOW),
			phase: "correct" as const,
		}
		expect(submitPair(SAVE, pairs, 3, 4, rand, NOW)).toBeNull()
	})
})

describe("runda: tryb karmienia (feed)", () => {
	const SAVE: SaveState = { ...INITIAL_SAVE, unlockedStage: 4 }
	const feedQ = (round: RoundState, swap: boolean): RoundState => ({
		...round,
		question: {
			key: "6x9",
			a: 6,
			b: 9,
			isRequeue: false,
			rival: { key: "5x10", a: 5, b: 10 },
			swap,
		},
	})

	test("feedAnswer: strona z większym iloczynem wg swap", () => {
		const r = newRound(SAVE, "feed", rand, NOW)
		expect(feedAnswer(feedQ(r, false).question)).toBe(0) // 54 po lewej
		expect(feedAnswer(feedQ(r, true).question)).toBe(1) // 54 po prawej
	})

	test("newRound/advance w feed: pytanie zawsze ma rywala o innym iloczynie", () => {
		let round = newRound(SAVE, "feed", rand, NOW)
		let save = SAVE
		for (let i = 0; i < 10; i++) {
			const q = round.question
			const rival = q.rival
			if (!rival) throw new Error("brak rywala")
			expect(rival.a * rival.b).not.toBe(q.a * q.b)
			const step = submitFeed(save, round, feedAnswer(q), rand, NOW + 100)
			if (!step) throw new Error("null")
			save = { ...save, ...step.patch }
			const next = advance(save, step.round, rand, NOW + 200)
			if (!next) throw new Error("null")
			round = next.round
			if (round.phase === "summary") break
		}
	})

	test("trafienie: oba fakty uczą się, 3★, fragment, feedCorrect+1", () => {
		const round = feedQ(newRound(SAVE, "feed", rand, NOW), true)
		const step = submitFeed(SAVE, round, 1, rand, NOW + 1000)
		if (!step) throw new Error("null")
		expect(step.round.phase).toBe("correct")
		expect(step.round.lastStars).toBe(3)
		expect(step.patch.facts?.["6x9"]?.correct).toBe(1)
		expect(step.patch.facts?.["5x10"]?.correct).toBe(1)
		expect(step.patch.eggFragments).toBe(1)
		expect(step.patch.achievementStats?.feedCorrect).toBe(1)
	})

	test("pomyłka: tylko fakt pytania na minus, faza wrong + powtórka, rytuał = właściwa strona", () => {
		const round = feedQ(newRound(SAVE, "feed", rand, NOW), false)
		const miss = submitFeed(SAVE, round, 1, rand, NOW + 500)
		if (!miss) throw new Error("null")
		expect(miss.round.phase).toBe("wrong")
		expect(miss.round.total).toBe(11)
		expect(miss.round.requeues[3]).toBe("6x9")
		expect(miss.patch.facts?.["6x9"]?.correct).toBe(0)
		expect(miss.patch.facts?.["5x10"]).toBeUndefined()
		expect(miss.patch.eggFragments).toBe(1) // fragment mimo pomyłki
		expect(miss.patch.achievementStats?.feedCorrect).toBe(0)
		const save = { ...SAVE, ...miss.patch }
		const again = submitFeed(save, miss.round, 1, rand, NOW + 600)
		expect(again?.round.phase).toBe("wrong")
		expect(again?.round.shakeNonce).toBe(2)
		const ok = submitFeed(save, miss.round, 0, rand, NOW + 700)
		expect(ok?.patch).toEqual({})
		expect(ok?.round.phase).toBe("correct")
		expect(ok?.round.lastStars).toBe(0)
	})

	test("submitFeed poza trybem karmienia = null", () => {
		const mult = newRound(SAVE, "mult", rand, NOW)
		expect(submitFeed(SAVE, mult, 0, rand, NOW)).toBeNull()
	})
})
