import type { SaveState } from "../store/schema"
import type { GameMode, RoundQuestion } from "./facts"
import {
	budgetMs,
	divisorPairs,
	expectedAnswer,
	FACTS_BY_KEY,
	pairBudgetMs,
	QUESTIONS_PER_ROUND,
} from "./facts"
import {
	advance,
	feedAnswer,
	newRound,
	type Rand,
	type RoundStep,
	submitAnswer,
	submitFeed,
	submitPair,
} from "./round"

// Rozkłada sumę gwiazdek na n pytań (każde 0..3): jak najwięcej trójek (szybkie
// odpowiedzi → większy przyrost mastery), reszta wolniej. Dla debug-symulacji rundy.
export function distributeStars(total: number, n: number): number[] {
	const q = new Array<number>(n).fill(3)
	let excess = n * 3 - total
	for (let i = 0; i < n && excess > 0; i++) {
		const cut = Math.min(3, excess)
		q[i] = 3 - cut
		excess -= cut
	}
	return q
}

// Czas odpowiedzi dający dokładnie `stars` gwiazdek (progi ze starsFor).
const ELAPSED_FACTOR = [3, 2, 1.25, 0] as const

// Debug: gra pełną rundę QUESTIONS_PER_ROUND poprawnych odpowiedzi kończącą się
// sumą `totalStars` — TYMI SAMYMI funkcjami co prawdziwa gra (game/round.ts), więc
// nie ma czego lustrzyć. `firstQuestion` = aktualnie wyświetlane pytanie (ekran
// rundy). Zwraca skumulowany patch zapisu i rundę w fazie summary.
export function simulateRound(
	save: SaveState,
	mode: GameMode,
	totalStars: number,
	rand: Rand,
	now: number,
	firstQuestion?: RoundQuestion,
): RoundStep {
	let round = newRound(save, mode, rand, now)
	if (firstQuestion) round = { ...round, question: firstQuestion }
	let cur: SaveState = save
	const patch: Partial<SaveState> = {}
	const apply = (step: RoundStep | null) => {
		if (!step) throw new Error("simulateRound: nieoczekiwana faza rundy")
		Object.assign(patch, step.patch)
		cur = { ...cur, ...step.patch }
		round = step.round
	}
	const perQuestion = distributeStars(totalStars, QUESTIONS_PER_ROUND)
	for (let i = 0; round.phase !== "summary"; i++) {
		const fact = FACTS_BY_KEY.get(round.question.key)
		if (!fact)
			throw new Error(`simulateRound: nieznany fakt ${round.question.key}`)
		const factor = ELAPSED_FACTOR[perQuestion[i] ?? 0] ?? 3
		if (mode === "feed") {
			const rival = FACTS_BY_KEY.get(round.question.rival?.key ?? fact.key)
			const budget = budgetMs(fact) + budgetMs(rival ?? fact)
			apply(
				submitFeed(
					cur,
					round,
					feedAnswer(round.question),
					rand,
					round.startedAt + budget * factor,
				),
			)
		} else if (mode === "pairs") {
			// tryb par: stukamy kolejne pary celu; czas skalowany do sumy budżetów
			const targets = divisorPairs(round.question.a, cur.unlockedStage)
			const budget = targets.reduce((sum, f) => sum + pairBudgetMs(f), 0)
			const at = round.startedAt + budget * factor
			for (const t of targets) apply(submitPair(cur, round, t.a, t.b, rand, at))
		} else {
			const elapsed = budgetMs(fact) * factor
			const answer = String(expectedAnswer(round.question, mode))
			apply(
				submitAnswer(
					cur,
					{ ...round, answer },
					rand,
					round.startedAt + elapsed,
				),
			)
		}
		apply(advance(cur, round, rand, now))
	}
	return { patch, round }
}
