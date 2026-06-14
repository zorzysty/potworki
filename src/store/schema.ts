import type { FactStats } from "../game/adaptive"
import type { FactKey } from "../game/facts"
import type { PendingEgg } from "../game/rewards"

export const SAVE_VERSION = 3

export interface SaveState {
	facts: Partial<Record<FactKey, FactStats>>
	unlockedStage: number
	celebratedStage: number // najwyższy etap, którego animację otwarcia bramy już pokazano (mapa)
	ownedMonsters: Record<number, { hatchedAt: number }>
	iskierki: number
	eggFragments: number // 0–(próg−1), resztki przenoszone między rundami
	eggsEarned: number // ile jajek z fragmentów już powstało — steruje progiem (fragmentsForEgg)
	pendingEggs: PendingEgg[]
	dreamMonsterId: number | null
	totalRounds: number
}

export const INITIAL_SAVE: SaveState = {
	facts: {},
	unlockedStage: 0,
	celebratedStage: 0,
	ownedMonsters: {},
	iskierki: 0,
	eggFragments: 0,
	eggsEarned: 0,
	pendingEggs: [],
	dreamMonsterId: null,
	totalRounds: 0,
}

export const SAVE_KEYS = Object.keys(INITIAL_SAVE) as (keyof SaveState)[]

// Migracje: MIGRATIONS[v] przeprowadza zapis z wersji v do v+1.
// Wzorzec — gdy podbijasz SAVE_VERSION do 3, dodaj:
//   2: state => ({ ...(state as SaveStateV2), nowePole: wartoscDomyslna }),
export const MIGRATIONS: Record<number, (state: unknown) => unknown> = {
	// v1→v2: dodano eggsEarned. Estymujemy z dotychczasowego postępu (posiadane + w gnieździe),
	// żeby próg fragmentów nie zresetował się do najtańszego — dziecko już sporo wykluło.
	1: (state) => {
		const s = state as Record<string, unknown>
		const owned =
			s.ownedMonsters && typeof s.ownedMonsters === "object"
				? Object.keys(s.ownedMonsters).length
				: 0
		const pending = Array.isArray(s.pendingEggs) ? s.pendingEggs.length : 0
		return { ...s, eggsEarned: owned + pending }
	},
	// v2→v3: dodano celebratedStage (mapa „Kraina Potworków"). Ustawiamy na bieżący
	// unlockedStage, żeby obecni gracze nie dostali animacji dla już otwartych bram.
	2: (state) => {
		const s = state as Record<string, unknown>
		return {
			...s,
			celebratedStage:
				typeof s.unlockedStage === "number" ? s.unlockedStage : 0,
		}
	},
}

export function migrateSave(state: unknown, fromVersion: number): unknown {
	let migrated = state
	for (let v = fromVersion; v < SAVE_VERSION; v++) {
		const step = MIGRATIONS[v]
		if (step) migrated = step(migrated)
	}
	return migrated
}
