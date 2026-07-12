export type FactKey = `${number}x${number}`

// Tryb rundy: mnożenie, dzielenie albo brakujący czynnik ("gap": 7 × _ = 42).
// Każdy tryb to inny widok tego samego faktu — wspólny postęp.
// TOKEN "gap" jest ZAMROŻONY: persystowany w PendingEgg.mode.
export type GameMode = "mult" | "div" | "gap"

export interface Fact {
	a: number // zawsze a <= b
	b: number
	key: FactKey
}

export function factKey(a: number, b: number): FactKey {
	const lo = Math.min(a, b)
	const hi = Math.max(a, b)
	return `${lo}x${hi}`
}

// 55 działań komutatywnych (a <= b)
export const ALL_FACTS: Fact[] = []
for (let a = 1; a <= 10; a++) {
	for (let b = a; b <= 10; b++) {
		ALL_FACTS.push({ a, b, key: `${a}x${b}` })
	}
}

export const FACTS_BY_KEY = new Map(ALL_FACTS.map((f) => [f.key, f]))

// Etapy odblokowań: etap n = suma czynników z STAGES[0..n]
export const STAGES: readonly (readonly number[])[] = [
	[1, 2, 5, 10],
	[3],
	[4],
	[6],
	[9],
	[7],
	[8],
]

export function unlockedFactors(stage: number): Set<number> {
	const factors = new Set<number>()
	for (let i = 0; i <= Math.min(stage, STAGES.length - 1); i++) {
		for (const f of STAGES[i] ?? []) factors.add(f)
	}
	return factors
}

export function unlockedFacts(stage: number): Fact[] {
	const factors = unlockedFactors(stage)
	return ALL_FACTS.filter((f) => factors.has(f.a) && factors.has(f.b))
}

export function isMaxStage(stage: number): boolean {
	return stage >= STAGES.length - 1
}

// Budżet czasowy: trudniejsze działania oceniane łagodniej
export function budgetMs(fact: Fact): number {
	return 4000 + 800 * fact.b
}

export function starsFor(elapsedMs: number, fact: Fact): 0 | 1 | 2 | 3 {
	const budget = budgetMs(fact)
	if (elapsedMs <= budget) return 3
	if (elapsedMs <= 1.5 * budget) return 2
	if (elapsedMs <= 2.5 * budget) return 1
	return 0
}

export const QUESTIONS_PER_ROUND = 10
export const MAX_QUESTIONS_PER_ROUND = 12
export const MAX_STARS_PER_ROUND = 30

// Próg fragmentów na jajko rośnie z liczbą już zdobytych jajek (wyklucie ma być osiągnięciem):
// 1. jajko = 10, jajka 2–10 = 14, 11–20 = 18, 21–30 = 22, +4 za każdą kolejną dziesiątkę.
export function fragmentsForEgg(eggsEarned: number): number {
	if (eggsEarned <= 0) return 10
	return 14 + 4 * Math.floor(eggsEarned / 10)
}

export interface RoundQuestion {
	key: FactKey
	// w kolejności wyświetlania. Mnożenie: losowa orientacja czynników (a×b).
	// Dzielenie: a = dzielna (iloczyn), b = dzielnik; oczekiwany wynik = a/b.
	// Luka ("gap"): a = ZNANY czynnik, b = iloczyn; oczekiwany wynik = b/a.
	a: number
	b: number
	isRequeue: boolean
}

// Buduje pytanie do wyświetlenia z faktu wg trybu. Mnożenie: losowa orientacja
// czynników. Dzielenie: (a*b) ÷ dzielnik = iloraz; w intro-rundzie nowy czynnik
// wymuszany na pozycji dzielnika (72÷8, nie 72÷9). Luka: znany × _ = iloczyn.
// rand wstrzykiwany — testowalność.
export function makeQuestion(
	fact: Fact,
	isRequeue: boolean,
	mode: GameMode,
	introFactor: number | null,
	rand: () => number,
): RoundQuestion {
	if (mode === "div") {
		const introIsOperand =
			introFactor !== null && (fact.a === introFactor || fact.b === introFactor)
		const divisor = introIsOperand
			? (introFactor as number)
			: rand() < 0.5
				? fact.a
				: fact.b
		return { key: fact.key, a: fact.a * fact.b, b: divisor, isRequeue }
	}
	if (mode === "gap") {
		// znany czynnik widoczny w działaniu; w intro-rundzie wymuszamy nową
		// cyfrę na pozycji ZNANEGO czynnika (dziecko widzi nową liczbę i
		// rozwiązuje o znajomą): 8 × _ = 72, nie 9 × _ = 72
		const introIsOperand =
			introFactor !== null && (fact.a === introFactor || fact.b === introFactor)
		const known = introIsOperand
			? (introFactor as number)
			: rand() < 0.5
				? fact.a
				: fact.b
		return { key: fact.key, a: known, b: fact.a * fact.b, isRequeue }
	}
	const flip = rand() < 0.5
	return {
		key: fact.key,
		a: flip ? fact.b : fact.a,
		b: flip ? fact.a : fact.b,
		isRequeue,
	}
}

// Oczekiwany wynik pytania wg trybu (mnożenie a×b, dzielenie a÷b, luka b÷a).
export function expectedAnswer(q: RoundQuestion, mode: GameMode): number {
	return mode === "div" ? q.a / q.b : mode === "gap" ? q.b / q.a : q.a * q.b
}
