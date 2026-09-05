// Wyprawy potworków: katalog typów i czysta logika postępu/rozstrzygnięcia.
// Postęp liczy się WYŁĄCZNIE ukończonymi rundami (NIGDY zegarem) — przerwa
// niczego nie kosztuje (zasada z roota: „szybkość tylko nagradza, nigdy nie
// karze"; wyprawa zaparkowana na dwa tygodnie jest dokładnie tam, gdzie
// dziecko ją zostawiło). WSZYSTKIE liczby strojenia (czasy trwania, nagrody,
// szanse znaleziska) żyją w TYM pliku — wzór village.ts. Testy pilnują proporcji
// i przedziałów (≤ 2.5 ✨/rundę, stawka rośnie z długością), nie dokładnych
// wartości. Dźwignie cięcia przy zbyt hojnej ekonomii (kolejno): połowa
// rewardIskierki → znalezisko tylko na `wielka` → dłuższe durationRounds.

import { type OwnedMonsters, poolIds } from "./collection"
import { WISH_MODE } from "./rewards"
import { buildingLevel, type VillageState } from "./village"

export type ExpeditionTypeId = "zwiad" | "wyprawa" | "wielka"

export interface ExpeditionDef {
	id: ExpeditionTypeId // stabilny klucz persystowany w zapisie — NIGDY nie zmieniać
	name: string // PL, dla gracza
	description: string // PL: dokąd i po co
	durationRounds: number // ukończone rundy do powrotu
	rewardIskierki: number
	findChance: number // 0..1 — szansa, że wyprawa wróci z NOWYM potworkiem (nieposiadanym)
	// Wymagany poziom Placu Zabaw (wzór sklepik→tier kosmetyki): potworki
	// trenują kondycję, zanim ruszą w drogę. Jawne pole zamiast indeksu w
	// katalogu — dopisany kiedyś 4. typ musi dostać osiągalny próg świadomie.
	requiredPlacZabaw: number
}

// Nazwy i opisy dla gracza wolno edytować dowolnie; id zamrożone
// (persystowane w SaveState.expedition.typeId), zmiana nazw nie dotyka zapisu.
export const EXPEDITIONS: readonly ExpeditionDef[] = [
	{
		id: "zwiad",
		name: "Zwiad",
		description: "Szybki wypad na skraj łąki — sprawdzić, co słychać.",
		durationRounds: 3,
		rewardIskierki: 4,
		findChance: 0,
		requiredPlacZabaw: 1,
	},
	{
		id: "wyprawa",
		name: "Wyprawa",
		description: "Wędrówka przez wzgórza do sąsiedniej krainy.",
		durationRounds: 7,
		rewardIskierki: 12,
		findChance: 0.25,
		requiredPlacZabaw: 2,
	},
	{
		id: "wielka",
		name: "Wielka Wyprawa",
		description: "Daleka podróż za wszystkie bramy — wróci z nowym potworkiem!",
		durationRounds: 12,
		rewardIskierki: 25,
		findChance: 1,
		requiredPlacZabaw: 3,
	},
]

export const EXPEDITIONS_BY_ID: ReadonlyMap<ExpeditionTypeId, ExpeditionDef> =
	new Map(EXPEDITIONS.map((e) => [e.id, e]))

// Pula znalezisk = pula Jajka Życzeń (mnożeniowa: bez legendarnych
// ekskluzywnych dzielenia/luki — te zdobywa się wyłącznie jajkiem).
export const FINDABLE_IDS: readonly number[] = poolIds(WISH_MODE)

export const findablePoolComplete = (owned: OwnedMonsters): boolean =>
	FINDABLE_IDS.every((id) => id in owned)

// Etykieta obietnicy znaleziska (lista wypraw i szczegóły czytają TĘ SAMĄ
// funkcję). null = nic nie obiecujemy: typ bez szansy albo pula skompletowana.
export function findChanceLabel(
	def: ExpeditionDef,
	owned: OwnedMonsters,
): string | null {
	if (def.findChance <= 0 || findablePoolComplete(owned)) return null
	return def.findChance >= 1
		? "👾 wróci z nowym potworkiem!"
		: "👾 może przyprowadzić nowego potworka"
}

// Stan w zapisie: tylko dane nieodtwarzalne. duration/reward NIE są
// persystowane — pochodzą z katalogu po typeId, więc retuning katalogu dotyczy
// też wypraw w toku (świadomy trade-off: prostota + jeden punkt prawdy;
// skrócenie czasu poniżej postępu w toku = powrót przy następnej rundzie,
// strata niemożliwa).
export interface ExpeditionState {
	monsterId: number
	typeId: ExpeditionTypeId
	roundsAtStart: number // totalRounds w chwili wysłania
}

function defOf(typeId: ExpeditionTypeId): ExpeditionDef {
	// defensywny fallback (id są zamrożone, więc w praktyce zawsze trafia)
	return EXPEDITIONS_BY_ID.get(typeId) ?? (EXPEDITIONS[0] as ExpeditionDef)
}

// Plac Zabaw = brama wypraw (import jednokierunkowy z village.ts — wzór
// cosmetics.ts): typ dostępny, gdy poziom budynku ≥ requiredPlacZabaw.
// Dotyczy WYSYŁANIA — wyprawa już w drodze zawsze dochodzi do końca
// (rozstrzygnięcie i zawrócenie nie sprawdzają bramy; postęp jest święty).
export function expeditionUnlocked(
	v: VillageState,
	typeId: ExpeditionTypeId,
): boolean {
	return buildingLevel(v, "plac-zabaw") >= defOf(typeId).requiredPlacZabaw
}

// Postęp wyprawy: ile ukończonych rund minęło od wysłania (clamp 0..cel).
export function expeditionProgress(
	e: ExpeditionState,
	totalRounds: number,
): { done: number; total: number } {
	const total = defOf(e.typeId).durationRounds
	const done = Math.max(0, Math.min(total, totalRounds - e.roundsAtStart))
	return { done, total }
}

export function isExpeditionDone(
	e: ExpeditionState,
	totalRounds: number,
): boolean {
	const { done, total } = expeditionProgress(e, totalRounds)
	return done >= total
}

// Rozstrzygnięcie powrotu (czyste, rand wstrzykiwany): nagroda z katalogu +
// ewentualne znalezisko — losowy NIEPOSIADANY potworek z puli `allIds`, który
// trafia do kolekcji (null przy komplecie puli; null też, gdy szansa nie
// trafiła). Rozkład jest jednostajny po nieposiadanych (bez wag rzadkości).
export function resolveExpedition(
	e: ExpeditionState,
	ownedIds: ReadonlySet<number>,
	allIds: readonly number[],
	rand: () => number,
): { rewardIskierki: number; foundMonsterId: number | null } {
	const def = defOf(e.typeId)
	const unowned = allIds.filter((id) => !ownedIds.has(id))
	const foundMonsterId =
		unowned.length > 0 && rand() < def.findChance
			? (unowned[Math.floor(rand() * unowned.length)] as number)
			: null
	return { rewardIskierki: def.rewardIskierki, foundMonsterId }
}
