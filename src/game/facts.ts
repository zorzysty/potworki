export type FactKey = `${number}x${number}`

// Tryb rundy: mnożenie, dzielenie, brakujący czynnik ("gap": 7 × _ = 42),
// pary dzielników ("pairs": 24 = ? × ? — wszystkie pary z odblokowanych liczb)
// albo porównywanie ("feed": które z dwóch działań daje więcej?).
// Każdy tryb to inny widok tych samych faktów — wspólny postęp.
// TOKENY są ZAMROŻONE: persystowane w PendingEgg.mode i legendaryPity.
export type GameMode = "mult" | "div" | "gap" | "pairs" | "feed"

// Etap (brama), od którego tryb jest dostępny na Home. Nowe tryby wchodzą co
// drugą bramę, żeby dziecko co jakiś czas odkrywało coś nowego, a pula
// odblokowanych liczb była już dość bogata, by tryb miał sens (pary z samych
// {1,2,5,10} są nudne; z 3 i 4 pojawiają się 12, 20, 8…; porównywanie z 6 i 9
// daje ciasne porównania w rodzaju 6×9 vs 5×10).
export const MODE_UNLOCK_STAGE: Record<GameMode, number> = {
	mult: 0,
	div: 0,
	gap: 0,
	pairs: 2,
	feed: 4,
}

export const modeUnlocked = (mode: GameMode, stage: number): boolean =>
	stage >= MODE_UNLOCK_STAGE[mode]

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

// Wszystkie odblokowane działania o danym iloczynie — cele pytania w trybie
// par (np. 24 → 3×8 i 4×6, gdy 3, 4, 6 i 8 są odblokowane). Z czynnikami ≤ 10
// nigdy więcej niż 2 pary.
export function divisorPairs(product: number, stage: number): Fact[] {
	return unlockedFacts(stage).filter((f) => f.a * f.b === product)
}

// Rywal do porównania w trybie porównywania: odblokowany fakt o INNYM iloczynie,
// możliwie bliskim (z kilku losowych kandydatów wygrywa najbliższy) — ciasne
// porównania (6×9 vs 5×10) uczą więcej niż 2×3 vs 9×9. Bez ważenia mastery.
export const RIVAL_SAMPLES = 3

export function pickRival(fact: Fact, stage: number, rand: () => number): Fact {
	const product = fact.a * fact.b
	const pool = unlockedFacts(stage).filter((f) => f.a * f.b !== product)
	if (pool.length === 0) return fact
	let best = pool[Math.floor(rand() * pool.length)] as Fact
	for (let i = 1; i < RIVAL_SAMPLES; i++) {
		const c = pool[Math.floor(rand() * pool.length)] as Fact
		if (Math.abs(c.a * c.b - product) < Math.abs(best.a * best.b - product))
			best = c
	}
	return best
}

export function isMaxStage(stage: number): boolean {
	return stage >= STAGES.length - 1
}

// Budżet czasowy: trudniejsze działania oceniane łagodniej
export function budgetMs(fact: Fact): number {
	return 4000 + 800 * fact.b
}

export function starsFor(elapsedMs: number, fact: Fact): 0 | 1 | 2 | 3 {
	return starsForBudget(elapsedMs, budgetMs(fact))
}

// Tryb par: szukanie pary na żetonach trwa dłużej niż przypomnienie sobie
// wyniku (dziecko przegląda do 10 liczb, przy dwóch parach dwa razy), więc
// budżet pary to wielokrotność budżetu faktu — inaczej pasek gwiazdek pełzał,
// choć dziecko grało dobrze. Ta sama gałka dla gwiazdek i dla oceny „szybko"
// w mastery. Strojenie tutaj.
export const PAIRS_BUDGET_MULT = 2

export function pairBudgetMs(fact: Fact): number {
	return PAIRS_BUDGET_MULT * budgetMs(fact)
}

// Gwiazdki względem dowolnego budżetu (pary dzielników sumują budżety par).
export function starsForBudget(
	elapsedMs: number,
	budget: number,
): 0 | 1 | 2 | 3 {
	if (elapsedMs <= budget) return 3
	if (elapsedMs <= 1.5 * budget) return 2
	if (elapsedMs <= 2.5 * budget) return 1
	return 0
}

export const QUESTIONS_PER_ROUND = 10
export const MAX_QUESTIONS_PER_ROUND = 12
export const MAX_STARS_PER_ROUND = 30

// Próg fragmentów na jajko rośnie z liczbą już zdobytych jajek (wyklucie ma być
// osiągnięciem): 1. jajko = 10, jajka 2–10 = 14, 11–20 = 18, od 21. = 22 (cap).
// Cap, bo bez niego pętla nagrody rozciągała się bez końca (jajko co 6–7 rund
// przy 150. jajku), a właśnie wtedy zostają najtrudniejsze cele kolekcji.
export const EGG_THRESHOLD_CAP = 22

export function fragmentsForEgg(eggsEarned: number): number {
	if (eggsEarned <= 0) return 10
	return Math.min(EGG_THRESHOLD_CAP, 14 + 4 * Math.floor(eggsEarned / 10))
}

export interface RoundQuestion {
	key: FactKey
	// w kolejności wyświetlania. Mnożenie: losowa orientacja czynników (a×b).
	// Dzielenie: a = dzielna (iloczyn), b = dzielnik; oczekiwany wynik = a/b.
	// Luka ("gap"): a = ZNANY czynnik, b = iloczyn; oczekiwany wynik = b/a.
	// Pary ("pairs"): a = iloczyn (cel), b nieużywane (0); odpowiedź to para
	// czynników (round.ts: submitPair), nie liczba.
	// Porównywanie ("feed"): a×b = działanie faktu pytania, `rival` = drugie
	// działanie (inny iloczyn), `swap` = fakt pytania wyświetlany po PRAWEJ;
	// odpowiedź to strona (round.ts: submitFeed).
	a: number
	b: number
	isRequeue: boolean
	rival?: { key: FactKey; a: number; b: number }
	swap?: boolean
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
	rival?: Fact,
): RoundQuestion {
	if (mode === "feed") {
		const r = rival ?? pickRival(fact, STAGES.length - 1, rand)
		const flipA = rand() < 0.5
		const flipB = rand() < 0.5
		return {
			key: fact.key,
			a: flipA ? fact.b : fact.a,
			b: flipA ? fact.a : fact.b,
			isRequeue,
			rival: { key: r.key, a: flipB ? r.b : r.a, b: flipB ? r.a : r.b },
			swap: rand() < 0.5,
		}
	}
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
	if (mode === "pairs") {
		return { key: fact.key, a: fact.a * fact.b, b: 0, isRequeue }
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

// Oczekiwany wynik pytania wg trybu (mnożenie a×b, dzielenie a÷b, luka b÷a;
// pary: iloczyn-cel — sam w sobie nie jest odpowiedzią, patrz submitPair).
export function expectedAnswer(q: RoundQuestion, mode: GameMode): number {
	if (mode === "div") return q.a / q.b
	if (mode === "gap") return q.b / q.a
	if (mode === "pairs") return q.a
	return q.a * q.b // także "feed": iloczyn działania pytania
}
