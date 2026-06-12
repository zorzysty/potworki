import type { FactStats } from "../game/adaptive"
import type { FactKey } from "../game/facts"
import type { PendingEgg } from "../game/rewards"

export const SAVE_VERSION = 1

export interface SaveState {
	facts: Partial<Record<FactKey, FactStats>>
	unlockedStage: number
	ownedMonsters: Record<number, { hatchedAt: number }>
	iskierki: number
	eggFragments: number // 0–4, resztki przenoszone między rundami
	pendingEggs: PendingEgg[]
	dreamMonsterId: number | null
	totalRounds: number
}

export const INITIAL_SAVE: SaveState = {
	facts: {},
	unlockedStage: 0,
	ownedMonsters: {},
	iskierki: 0,
	eggFragments: 0,
	pendingEggs: [],
	dreamMonsterId: null,
	totalRounds: 0,
}

export const SAVE_KEYS = Object.keys(INITIAL_SAVE) as (keyof SaveState)[]

// Migracje: MIGRATIONS[v] przeprowadza zapis z wersji v do v+1.
// Wzorzec — gdy podbijasz SAVE_VERSION do 2, dodaj:
//   1: state => ({ ...(state as SaveStateV1), nowePole: wartoscDomyslna }),
export const MIGRATIONS: Record<number, (state: unknown) => unknown> = {}

export function migrateSave(state: unknown, fromVersion: number): unknown {
	let migrated = state
	for (let v = fromVersion; v < SAVE_VERSION; v++) {
		const step = MIGRATIONS[v]
		if (step) migrated = step(migrated)
	}
	return migrated
}
