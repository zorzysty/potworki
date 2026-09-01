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
// Krzywa łagodna, nie schodek: dziecko poprawne, ale nie zawsze w budżecie 3★
// (średnio ~2,3★ → score 23) ma widzieć kolorowe jajka, a nie wieczne zwykłe —
// kolor to jedyna widoczna nagroda za jakość gry. Tęczowe tylko z szansą i tylko
// od score 28 (≥ 2,8★ średnio: co najwyżej kilka 2★ na całe jajko). Każdy wiersz
// sumuje się do 100.
export function qualityOdds(
	score: number,
): readonly [number, number, number, number] {
	if (score >= 30) return [10, 20, 30, 40]
	if (score >= 28) return [20, 30, 40, 10]
	if (score >= 26) return [30, 45, 25, 0]
	if (score >= 23) return [50, 40, 10, 0]
	if (score >= 20) return [70, 30, 0, 0]
	if (score >= 16) return [85, 15, 0, 0]
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
// floor (nie round): score 30 wymaga banku == fragments×3, więc pełne 40 % na tęczowe
// naprawdę tylko za komplet 3★ także przy dużych jajkach (round zaokrąglał 29,5 w górę).
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
	normal: [68, 24, 6, 2],
	silver: [50, 35, 10, 5],
	gold: [28, 42, 20, 10],
	rainbow: [10, 40, 30, 20],
}

export const ISKIERKI_FOR_DUP: Record<Rarity, number> = {
	common: 1,
	rare: 2,
	epic: 3,
	legendary: 5,
}

// Duplikat płaci wg rzadkości × jakość jajka: po domknięciu tierów ~90 % wykluć
// to duplikaty, a kolor jajka to jedyna nagroda za jakość gry — złote jajko
// z pospolitym w środku nie może być warte 1 ✨. Jajko Życzeń bez mnożnika
// (duplikat z niego to tylko wyścig o ostatniego brakującego).
export const DUP_QUALITY_MULT: Record<PendingEgg["quality"], number> = {
	normal: 1,
	silver: 2,
	gold: 3,
	rainbow: 5,
	wish: 1,
}

export function dupIskierki(
	rarity: Rarity,
	quality: PendingEgg["quality"],
): number {
	return ISKIERKI_FOR_DUP[rarity] * DUP_QUALITY_MULT[quality]
}

export const ISKIERKI_CAP = 999

// Pula Jajka Życzeń: mnożeniowa — legendarne ekskluzywne trybów nie są do kupienia.
export const WISH_MODE: GameMode = "mult"

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
	// Math.max: po obniżeniu progu (retuning) jajko w toku może mieć więcej
	// fragmentów niż próg — score liczymy z faktycznie zebranych, żeby nadmiar
	// banku nie dawał darmowego score 30. Retuning dotyczy jajek w toku od razu,
	// bez migracji (wzór wypraw).
	const quality = eggQuality(
		eggQualityScore(eggStarBank, Math.max(threshold, eggFragments)),
		rand,
	)
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
// Cena BAZOWA pierwszego Jajka Życzeń (dalej rośnie — patrz wishEggPrice).
export const WISH_COST: Record<Rarity, number> = {
	common: 10,
	rare: 10,
	epic: 20,
	legendary: 30,
}
export const WISH_COST_NO_DREAM = 10

// Progresja: każde KOLEJNE Jajko Życzeń kosztuje o `WISH_COST_STEP` więcej niż
// poprzednie — jajko ma zostać wielkim życzeniem, nie zakupem co dwie rundy.
// `WISH_SURCHARGE_MAX` ogranicza samą DOPŁATĘ, nie cenę końcową: sufit jest
// obowiązkowy (bez niego cena przerosłaby cap portfela 999 i przycisk zostałby
// martwy na zawsze — zamknięta droga, nie wyzwanie), ale gdyby capował cenę,
// wszystkie bazy zlałyby się w jedną liczbę i premia za rzadkość wymarzonego
// po cichu by zniknęła. Tak cena maksymalna = baza + dopłata (≤ 130 ✨ < 999),
// a różnice wg rzadkości zostają na zawsze. Gałki strojenia: obie stałe + bazy.
export const WISH_COST_STEP = 10
export const WISH_SURCHARGE_MAX = 100

// Podłoga ceny PO zniżce fontanny (wysokość zniżki w village.ts): jajko
// nigdy nie jest darmowe — życzenie ma kosztować choć garść iskierek, inaczej
// pierwsze jajko bez wymarzonego (baza 10) przy Fontannie Marzeń (−10)
// spadłoby do zera. Podłoga siedzi WEWNĄTRZ wishEggPrice, żeby żaden
// przyszły konsument ceny nie mógł jej zgubić.
export const WISH_PRICE_FLOOR = 5

export function wishEggPrice(
	base: number,
	bought: number,
	discount = 0,
): number {
	const surcharge = WISH_COST_STEP * Math.max(0, bought)
	return Math.max(
		WISH_PRICE_FLOOR,
		base + Math.min(WISH_SURCHARGE_MAX, surcharge) - discount,
	)
}

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

// Ochrona przed pechem („pity"): `pity` = jajka z rund od ostatniego legendarnego
// w tym trybie; na progu następne gwarantuje tier legendarny, o ile pula trybu ma
// jeszcze nieposiadanego legendarnego — bez tego gwarancja dawałaby duplikaty.
// 12 ≈ szansa legendarnego ×~3 w najgorszym razie; zamienia loterię w cel.
export const LEGENDARY_PITY_EVERY = 12
export type LegendaryPity = Record<GameMode, number>
export const INITIAL_LEGENDARY_PITY: LegendaryPity = { mult: 0, div: 0, gap: 0 }

export function rollMonsterWithPity(
	quality: EggQuality,
	ctx: RollContext,
	pity: number,
): { id: number; pity: number } {
	let tier = rollTier(RARITY_ODDS[quality], ctx.rand)
	if (
		tier !== "legendary" &&
		pity + 1 >= LEGENDARY_PITY_EVERY &&
		ctx.idsByRarity.legendary.some((id) => !ctx.owned.has(id))
	) {
		tier = "legendary"
	}
	return {
		id: pickInTier(tier, ctx),
		pity: tier === "legendary" ? 0 : pity + 1,
	}
}

// Jajko Życzeń: z wymarzonym → dokładnie on; bez → losowy NIEPOSIADANY (złote szanse,
// re-roll z renormalizacją wśród tierów, w których coś jeszcze zostało). Pula
// wyczerpana (kupione, gdy brakował jeden, a domknęło go inne jajko z gniazda)
// → zwykłe złote losowanie, czyli duplikat jak z każdego jajka po komplecie.
export function rollWish(ctx: RollContext): number {
	const { idsByRarity, owned, dreamId, rand } = ctx
	if (dreamId !== null && !owned.has(dreamId)) return dreamId
	const available = RARITY_ORDER.filter((tier) =>
		idsByRarity[tier].some((id) => !owned.has(id)),
	)
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
	// pula wyczerpana (available puste) albo dryf zmiennoprzecinkowy → duplikat
	return pickInTier(rollTier(odds, rand), ctx)
}
