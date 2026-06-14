export type EggQuality = "normal" | "silver" | "gold" | "rainbow"
export type Rarity = "common" | "rare" | "epic" | "legendary"

export interface PendingEgg {
	quality: EggQuality | "wish"
}

export const QUALITY_ORDER: readonly EggQuality[] = [
	"normal",
	"silver",
	"gold",
	"rainbow",
]

// Rozkład jakości jajka wg sumy gwiazdek rundy [normal, silver, gold, rainbow] w %.
// Tęczowe tylko z szansą i tylko za komplet 30/30; każdy wiersz sumuje się do 100.
export function qualityOdds(
	roundStars: number,
): readonly [number, number, number, number] {
	if (roundStars >= 30) return [10, 20, 30, 40]
	if (roundStars >= 28) return [20, 30, 50, 0]
	if (roundStars >= 26) return [40, 60, 0, 0]
	return [100, 0, 0, 0]
}

export function eggQuality(roundStars: number, rand: () => number): EggQuality {
	const odds = qualityOdds(roundStars)
	let roll = rand() * 100
	for (let i = 0; i < QUALITY_ORDER.length; i++) {
		roll -= odds[i] ?? 0
		if (roll <= 0) return QUALITY_ORDER[i] as EggQuality
	}
	return "normal"
}

export const RARITY_ORDER: readonly Rarity[] = [
	"common",
	"rare",
	"epic",
	"legendary",
]

// Szanse [common, rare, epic, legendary] w procentach
export const RARITY_ODDS: Record<
	EggQuality,
	readonly [number, number, number, number]
> = {
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

function rollTier(
	odds: readonly [number, number, number, number],
	rand: () => number,
): Rarity {
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
	if (
		dreamId !== null &&
		!owned.has(dreamId) &&
		ctx.rarityOf(dreamId) === tier
	) {
		return dreamId
	}
	const unowned = inTier.filter((id) => !owned.has(id))
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
	const available = RARITY_ORDER.filter((tier) =>
		idsByRarity[tier].some((id) => !owned.has(id)),
	)
	if (available.length === 0) return null // komplet — UI ukrywa przycisk
	const odds = RARITY_ODDS.gold
	const weights = available.map((tier) => odds[RARITY_ORDER.indexOf(tier)] ?? 0)
	const total = weights.reduce((s, w) => s + w, 0)
	let roll = rand() * total
	for (let i = 0; i < available.length; i++) {
		roll -= weights[i] ?? 0
		if (roll <= 0) {
			const tier = available[i] as Rarity
			const unowned = idsByRarity[tier].filter((id) => !owned.has(id))
			return unowned[Math.floor(rand() * unowned.length)] as number
		}
	}
	return null
}
