import type { Fact, FactKey } from "./facts"
import { budgetMs, STAGES, unlockedFacts } from "./facts"

export interface FactStats {
	attempts: number // tylko pierwsze próby
	correct: number
	streak: number
	mastery: number // 0..1 — jedyny score
	lastSeen: number
}

export function emptyStats(): FactStats {
	return { attempts: 0, correct: 0, streak: 0, mastery: 0, lastSeen: 0 }
}

const DAY_MS = 86_400_000

// Leniwy decay na starcie sesji — nigdy dla działań bez prób
export function decayStats(stats: FactStats, now: number): FactStats {
	if (stats.attempts === 0) return stats
	const days = Math.floor((now - stats.lastSeen) / DAY_MS)
	if (days < 1) return stats
	return { ...stats, mastery: stats.mastery * 0.97 ** Math.min(days, 30) }
}

// Aktualizacja po pierwszej próbie („szybko" = budżet 3 gwiazdek)
export function applyAnswer(
	stats: FactStats,
	fact: Fact,
	correctAnswer: boolean,
	elapsedMs: number,
	now: number,
): FactStats {
	const next = { ...stats, attempts: stats.attempts + 1, lastSeen: now }
	if (correctAnswer) {
		const fast = elapsedMs <= budgetMs(fact)
		const gain = fast ? 0.3 : 0.15
		next.mastery = stats.mastery + (1 - stats.mastery) * gain
		next.correct = stats.correct + 1
		next.streak = stats.streak + 1
	} else {
		next.mastery = stats.mastery * 0.5
		next.streak = 0
	}
	return next
}

function weightOf(stats: FactStats): number {
	const base = (1 - stats.mastery) ** 2 + 0.05
	return stats.attempts === 0 ? base * 2.5 : base
}

// Losowanie ważone; exclude = ostatnio zadane (powtórki po błędzie omijają tę funkcję)
export function pickNextFact(
	facts: Partial<Record<FactKey, FactStats>>,
	stage: number,
	exclude: FactKey[],
	rand: () => number,
): Fact {
	const pool = unlockedFacts(stage)
	const excluded = new Set(exclude)
	let candidates = pool.filter((f) => !excluded.has(f.key))
	if (candidates.length === 0) candidates = pool
	const weights = candidates.map((f) => weightOf(facts[f.key] ?? emptyStats()))
	const total = weights.reduce((s, w) => s + w, 0)
	let roll = rand() * total
	for (let i = 0; i < candidates.length; i++) {
		roll -= weights[i] ?? 0
		if (roll <= 0) return candidates[i] as Fact
	}
	return candidates[candidates.length - 1] as Fact
}

// Próg opanowania najnowszej tabliczki (warunek główny bramy)
export const UNLOCK_THRESHOLD = 0.65
// Próg utrzymania starszych tabliczek — nie mogą spaść poniżej, inaczej brama czeka
export const MAINTAIN_THRESHOLD = 0.5

// Działania definiujące bramę etapu = NAJNOWSZA tabliczka (etap 0 = zestaw bazowy).
// Każda brama dotyczy świeżo wprowadzonej tabliczki, więc postęp startuje od zera po
// każdym otwarciu. Selekcja (`pickNextFact` po całej puli) + decay nadal powtarzają stare
// tabliczki, a warunek hybrydowy pilnuje, by nie podupadły.
export function stageFacts(stage: number): Fact[] {
	if (stage <= 0) return unlockedFacts(0)
	const factor = STAGES[stage]?.[0]
	if (factor === undefined) return []
	// działania z tym czynnikiem, dostępne dopiero od tego etapu (czynnik jest tu nowy)
	return unlockedFacts(stage).filter((f) => f.a === factor || f.b === factor)
}

function meanMastery(
	facts: Partial<Record<FactKey, FactStats>>,
	pool: Fact[],
): number {
	if (pool.length === 0) return 0
	let sum = 0
	for (const f of pool) sum += facts[f.key]?.mastery ?? 0
	return sum / pool.length
}

// starsze, już odblokowane tabliczki (wszystko poza najnowszą)
function olderFacts(stage: number): Fact[] {
	return stage >= 1 ? unlockedFacts(stage - 1) : []
}

// Średnie mastery działań definiujących bramę etapu (najnowsza tabliczka)
export function averageMastery(
	facts: Partial<Record<FactKey, FactStats>>,
	stage: number,
): number {
	return meanMastery(facts, stageFacts(stage))
}

// Stare tabliczki spadły poniżej progu utrzymania → trzeba je odświeżyć, by ruszyć bramę
export function needsMaintenance(
	facts: Partial<Record<FactKey, FactStats>>,
	stage: number,
): boolean {
	const old = olderFacts(stage)
	return old.length > 0 && meanMastery(facts, old) < MAINTAIN_THRESHOLD
}

// Odblokowanie (hybryda): najnowsza tabliczka spróbowana w całości i opanowana (avg ≥ próg)
// ORAZ starsze tabliczki nie spadły poniżej progu utrzymania.
export function shouldUnlockNextStage(
	facts: Partial<Record<FactKey, FactStats>>,
	stage: number,
): boolean {
	const pool = stageFacts(stage)
	if (pool.length === 0) return false
	for (const f of pool) {
		const stats = facts[f.key]
		if (!stats || stats.attempts === 0) return false
	}
	if (averageMastery(facts, stage) < UNLOCK_THRESHOLD) return false
	return !needsMaintenance(facts, stage)
}

// Postęp 0..1 do otwarcia NASTĘPNEJ bramy = min(postęp najnowszej tabliczki, utrzymanie
// starszych). Najnowsza: capowana do ≤0.95, dopóki któreś jej działanie nie ma próby.
// Utrzymanie: normalnie 1 (stare świeże) → kryształy startują od zera i rosną z nową
// tabliczką; gdy stare podupadną, składnik utrzymania przyhamowuje pasek.
// stageProgress === 1 zachodzi dokładnie wtedy, gdy shouldUnlockNextStage === true.
export function stageProgress(
	facts: Partial<Record<FactKey, FactStats>>,
	stage: number,
): number {
	const pool = stageFacts(stage)
	if (pool.length === 0) return 1
	const base = Math.min(1, averageMastery(facts, stage) / UNLOCK_THRESHOLD)
	const allAttempted = pool.every((f) => (facts[f.key]?.attempts ?? 0) > 0)
	const newProgress = allAttempted ? base : Math.min(base, 0.95)
	const old = olderFacts(stage)
	const maint =
		old.length === 0
			? 1
			: Math.min(1, meanMastery(facts, old) / MAINTAIN_THRESHOLD)
	return Math.min(newProgress, maint)
}
