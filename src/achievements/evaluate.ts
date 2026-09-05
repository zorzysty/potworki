import type { AchievementEntry, SaveState } from "../store/schema"
import {
	ACHIEVEMENTS,
	ACHIEVEMENTS_BY_ID,
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

const ctxOf = (save: SaveState): AchievementCtx => ({
	save,
	counters: save.achievementStats,
})

// --- ledger: czyste funkcje nad SaveState.achievements; store tylko nakłada patch ---

// Dopisuje do ledgera osiągnięcia właśnie spełnione (nieobecne w zapisie).
// Idempotentne: ponowne wywołanie na zwróconym ledgerze nic nie dodaje. Czy
// odblokowanie jest „głośne" (toast) decyduje wywołujący — tu tylko ledger.
export function unlockAchievements(
	save: SaveState,
	now: number,
): { achievements: Record<string, AchievementEntry>; newlyUnlocked: string[] } {
	const ctx = ctxOf(save)
	const achievements = { ...save.achievements }
	const newlyUnlocked: string[] = []
	for (const def of ACHIEVEMENTS) {
		if (def.id in achievements) continue
		const { current, target } = def.progress(ctx)
		if (current >= target) {
			achievements[def.id] = { unlockedAt: now, claimed: false }
			newlyUnlocked.push(def.id)
		}
	}
	return { achievements, newlyUnlocked }
}

// Odbiór nagrody: null = nic do odebrania (niezdobyte, już odebrane, nieznane id).
export function claimAchievement(
	save: Pick<SaveState, "achievements">,
	id: string,
): { achievements: Record<string, AchievementEntry>; reward: number } | null {
	const entry = save.achievements[id]
	const def = ACHIEVEMENTS_BY_ID.get(id)
	if (!entry || entry.claimed || !def) return null
	return {
		achievements: { ...save.achievements, [id]: { ...entry, claimed: true } },
		reward: REWARD_BY_DIFFICULTY[def.difficulty],
	}
}

export interface AchievementRow {
	def: AchievementDef
	progress: AchievementProgress
	unlocked: boolean
	claimable: boolean // zdobyte, iskierki jeszcze nieodebrane
	unlockedAt: number
}

// Wiersze ekranu osiągnięć. Kolejność: do odebrania → zdobyte → niezdobyte, potem
// wg trudności (łatwe→legendarne, przez rosnącą nagrodę); remisy zachowują
// kolejność z katalogu (stabilny sort).
export function achievementRows(save: SaveState): AchievementRow[] {
	const ctx = ctxOf(save)
	const rows = ACHIEVEMENTS.map((def): AchievementRow => {
		const live = achievementProgress(def, ctx)
		const entry = save.achievements[def.id]
		// zdobyte zostaje zdobyte: pasek pełny nawet gdy zasób spadł (wydane
		// iskierki) albo target urósł (ledger append-only) — inaczej ✓ przy 30/50
		const progress =
			entry === undefined ? live : { ...live, current: live.target, ratio: 1 }
		return {
			def,
			progress,
			unlocked: entry !== undefined,
			claimable: entry !== undefined && !entry.claimed,
			unlockedAt: entry?.unlockedAt ?? 0,
		}
	})
	rows.sort((a, b) => {
		if (a.claimable !== b.claimable) return a.claimable ? -1 : 1
		if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
		return (
			REWARD_BY_DIFFICULTY[a.def.difficulty] -
			REWARD_BY_DIFFICULTY[b.def.difficulty]
		)
	})
	return rows
}
