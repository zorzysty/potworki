import { fragmentsForEgg, type GameMode } from "./facts"

export type EggQuality = "normal" | "silver" | "gold" | "rainbow"
export type Rarity = "common" | "rare" | "epic" | "legendary"

export interface PendingEgg {
	quality: EggQuality | "wish"
	// Tryb, w którym jajko powstało — decyduje o puli potworków przy wykluciu
	// (jajko z dzielenia może dać legendarne tylko-dzielenie; mnożeniowe/życzeń nie).
	mode: GameMode
}

export const QUALITY_ORDER: readonly EggQuality[] = [
	"normal",
	"silver",
	"gold",
	"rainbow",
]

// Rozkład jakości jajka wg score 0–30 (eggQualityScore — średnia gwiazdek z całej
// budowy jajka, nie z jednej rundy) [normal, silver, gold, rainbow] w %.
// Tęczowe tylko z szansą i tylko przy score 30; każdy wiersz sumuje się do 100.
export function qualityOdds(
	score: number,
): readonly [number, number, number, number] {
	if (score >= 30) return [10, 20, 30, 40]
	if (score >= 28) return [20, 30, 50, 0]
	if (score >= 26) return [40, 60, 0, 0]
	return [100, 0, 0, 0]
}

export function eggQuality(score: number, rand: () => number): EggQuality {
	const odds = qualityOdds(score)
	let roll = rand() * 100
	for (let i = 0; i < QUALITY_ORDER.length; i++) {
		roll -= odds[i] ?? 0
		if (roll <= 0) return QUALITY_ORDER[i] as EggQuality
	}
	return "normal"
}

// Kolor jajka zależy od gwiazdek zebranych przy JEGO budowie, nie od jednej rundy:
// `starBank` to suma gwiazdek włożonych w `fragments` (= próg) tworzących to jajko.
// Średnia gwiazdek/fragment (0..3) skalujemy do 0..30 — tej samej osi co `eggQuality`.
// floor (nie round): score 30 wymaga banku == fragments×3, więc tęczowe naprawdę tylko
// za komplet 3★ także przy dużych jajkach (round zaokrąglał 29,5 w górę dla progów ≥20).
export function eggQualityScore(starBank: number, fragments: number): number {
	if (fragments <= 0) return 0
	return Math.max(0, Math.min(30, Math.floor((starBank / fragments) * 10)))
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

// Stan ekonomii jajek niesiony między odpowiedziami (commit per odpowiedź).
export interface EggBankState {
	eggFragments: number
	eggStarBank: number
	eggsEarned: number
	iskierki: number
}

// Dokłada jeden fragment + `gained` gwiazdek do bieżącego jajka. Gdy fragmenty
// osiągną próg `fragmentsForEgg(eggsEarned)`, domyka jajko: finalny kolor losowany
// z banku gwiazdek włożonych w jego budowę, reset banku i fragmentów, eggsEarned++,
// iskierka za tęczowe (cap). Czysta: zwraca nowy stan + utworzone jajko (lub null).
export function addEggFragment(
	bank: EggBankState,
	gained: number,
	mode: GameMode,
	rand: () => number,
): { bank: EggBankState; created: PendingEgg | null } {
	const eggFragments = bank.eggFragments + 1
	const eggStarBank = bank.eggStarBank + gained
	const threshold = fragmentsForEgg(bank.eggsEarned)
	if (eggFragments < threshold) {
		return { bank: { ...bank, eggFragments, eggStarBank }, created: null }
	}
	const quality = eggQuality(eggQualityScore(eggStarBank, threshold), rand)
	const iskierki =
		quality === "rainbow"
			? Math.min(ISKIERKI_CAP, bank.iskierki + 1)
			: bank.iskierki
	return {
		bank: {
			eggFragments: 0,
			eggStarBank: 0,
			eggsEarned: bank.eggsEarned + 1,
			iskierki,
		},
		created: { quality, mode },
	}
}
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
