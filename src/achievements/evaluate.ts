import {
	ACHIEVEMENTS,
	type AchievementCtx,
	type AchievementDef,
	REWARD_BY_DIFFICULTY,
} from "./catalog"

export interface AchievementProgress {
	current: number
	target: number
	unlocked: boolean
	ratio: number // 0..1, do paska postępu
}

export function achievementProgress(
	def: AchievementDef,
	ctx: AchievementCtx,
): AchievementProgress {
	const { current, target } = def.progress(ctx)
	const unlocked = current >= target
	const ratio = target > 0 ? Math.min(1, current / target) : 1
	return { current, target, unlocked, ratio }
}

// Jedyne wejście używane przez store. Zwraca osiągnięcia świeżo spełnione (nieobecne
// w `alreadyUnlocked`) i sumę iskierek za nie. Idempotentne: ponowne wywołanie z tym
// samym `alreadyUnlocked` rozszerzonym o poprzedni wynik nie przyznaje nic ponownie.
export function evaluateAchievements(
	ctx: AchievementCtx,
	alreadyUnlocked: ReadonlySet<string>,
): { newlyUnlocked: string[]; iskierkiReward: number } {
	const newlyUnlocked: string[] = []
	let iskierkiReward = 0
	for (const def of ACHIEVEMENTS) {
		if (alreadyUnlocked.has(def.id)) continue
		const { current, target } = def.progress(ctx)
		if (current >= target) {
			newlyUnlocked.push(def.id)
			iskierkiReward += REWARD_BY_DIFFICULTY[def.difficulty]
		}
	}
	return { newlyUnlocked, iskierkiReward }
}
