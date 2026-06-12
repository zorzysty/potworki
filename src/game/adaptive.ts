import type { Fact, FactKey } from "./facts"
import { budgetMs, unlockedFacts } from "./facts"

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
	let candidates = pool.filter(f => !excluded.has(f.key))
	if (candidates.length === 0) candidates = pool
	const weights = candidates.map(f => weightOf(facts[f.key] ?? emptyStats()))
	const total = weights.reduce((s, w) => s + w, 0)
	let roll = rand() * total
	for (let i = 0; i < candidates.length; i++) {
		roll -= weights[i] ?? 0
		if (roll <= 0) return candidates[i] as Fact
	}
	return candidates[candidates.length - 1] as Fact
}

// Odblokowanie etapu: każde odblokowane działanie spróbowane i średnie mastery >= 0.65
export function shouldUnlockNextStage(
	facts: Partial<Record<FactKey, FactStats>>,
	stage: number,
): boolean {
	const pool = unlockedFacts(stage)
	let sum = 0
	for (const f of pool) {
		const stats = facts[f.key]
		if (!stats || stats.attempts === 0) return false
		sum += stats.mastery
	}
	return sum / pool.length >= 0.65
}
