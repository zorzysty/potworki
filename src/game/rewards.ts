export type EggQuality = "normal" | "silver" | "gold" | "rainbow"
export type Rarity = "common" | "rare" | "epic" | "legendary"

export interface PendingEgg {
	quality: EggQuality | "wish"
}

export function eggQuality(roundStars: number): EggQuality {
	if (roundStars >= 30) return "rainbow" // tylko za komplet 30/30
	if (roundStars >= 27) return "gold"
	if (roundStars >= 22) return "silver"
	return "normal"
}

export const RARITY_ORDER: readonly Rarity[] = ["common", "rare", "epic", "legendary"]

// Szanse [common, rare, epic, legendary] w procentach
export const RARITY_ODDS: Record<EggQuality, readonly [number, number, number, number]> = {
	normal: [70, 24, 5, 1],
	silver: [50, 35, 12, 3],
	gold: [30, 42, 20, 8],
	rainbow: [12, 40, 33, 15],
}

export const ISKIERKI_FOR_DUP: Record<Rarity, number> = {
	common: 1,
	rare: 2,
	epic: 3,
	legendary: 5,
}

export const ISKIERKI_CAP = 99
export const WISH_COST: Record<Rarity, number> = {
	common: 10,
	rare: 10,
	epic: 20,
	legendary: 30,
}
export const WISH_COST_NO_DREAM = 10

function rollTier(odds: readonly [number, number, number, number], rand: () => number): Rarity {
	let roll = rand() * 100
	for (let i = 0; i < 4; i++) {
		roll -= odds[i] ?? 0
		if (roll <= 0) return RARITY_ORDER[i] as Rarity
	}
	return "legendary"
}

interface RollContext {
	idsByRarity: Record<Rarity, readonly number[]>
	owned: ReadonlySet<number>
	dreamId: number | null
	rarityOf: (id: number) => Rarity
	rand: () => number
}

function pickInTier(tier: Rarity, ctx: RollContext): number {
	const { idsByRarity, owned, dreamId, rand } = ctx
	const inTier = idsByRarity[tier]
	// Priorytet wymarzonego: wylosowany tier == tier wymarzonego → wykluwa się wymarzony
	if (dreamId !== null && !owned.has(dreamId) && ctx.rarityOf(dreamId) === tier) {
		return dreamId
	}
	const unowned = inTier.filter(id => !owned.has(id))
	const pool = unowned.length > 0 ? unowned : inTier
	return pool[Math.floor(rand() * pool.length)] as number
}

export function rollMonster(quality: EggQuality, ctx: RollContext): number {
	return pickInTier(rollTier(RARITY_ODDS[quality], ctx.rand), ctx)
}

// Jajko Życzeń: z wymarzonym → dokładnie on; bez → losowy NIEPOSIADANY (złote szanse,
// re-roll z renormalizacją wśród tierów, w których coś jeszcze zostało)
export function rollWish(ctx: RollContext): number | null {
	const { idsByRarity, owned, dreamId, rand } = ctx
	if (dreamId !== null && !owned.has(dreamId)) return dreamId
	const available = RARITY_ORDER.filter(tier =>
		idsByRarity[tier].some(id => !owned.has(id)),
	)
	if (available.length === 0) return null // 48/48 — UI ukrywa przycisk
	const odds = RARITY_ODDS.gold
	const weights = available.map(tier => odds[RARITY_ORDER.indexOf(tier)] ?? 0)
	const total = weights.reduce((s, w) => s + w, 0)
	let roll = rand() * total
	for (let i = 0; i < available.length; i++) {
		roll -= weights[i] ?? 0
		if (roll <= 0) {
			const tier = available[i] as Rarity
			const unowned = idsByRarity[tier].filter(id => !owned.has(id))
			return unowned[Math.floor(rand() * unowned.length)] as number
		}
	}
	return null
}
