// Wyprawy potworków: katalog typów i czysta logika postępu/rozstrzygnięcia.
// Postęp liczy się WYŁĄCZNIE ukończonymi rundami (NIGDY zegarem) — przerwa
// niczego nie kosztuje (zasada z roota: „szybkość tylko nagradza, nigdy nie
// karze"; wyprawa zaparkowana na dwa tygodnie jest dokładnie tam, gdzie
// dziecko ją zostawiło). WSZYSTKIE liczby strojenia (czasy trwania, nagrody,
// szanse tropu) żyją w TYM pliku — wzór village.ts. Testy pilnują proporcji
// i przedziałów (≤ 2.5 ✨/rundę, stawka rośnie z długością), nie dokładnych
// wartości. Dźwignie cięcia przy zbyt hojnej ekonomii (kolejno): połowa
// rewardIskierki → trop tylko na `wielka` → dłuższe durationRounds.

export type ExpeditionTypeId = "zwiad" | "wyprawa" | "wielka"

export interface ExpeditionDef {
	id: ExpeditionTypeId // stabilny klucz persystowany w zapisie — NIGDY nie zmieniać
	name: string // PL, dla gracza
	description: string // PL: dokąd i po co
	durationRounds: number // ukończone rundy do powrotu
	rewardIskierki: number
	tropChance: number // 0..1 — szansa na trop (wskazówkę o nieposiadanym potworku)
}

// PROPOZYCJE do dopracowania — nazwy i opisy dla gracza; id zamrożone
// (persystowane w SaveState.expedition.typeId), zmiana nazw nie dotyka zapisu.
export const EXPEDITIONS: readonly ExpeditionDef[] = [
	{
		id: "zwiad",
		name: "Zwiad",
		description: "Szybki wypad na skraj łąki — sprawdzić, co słychać.",
		durationRounds: 3,
		rewardIskierki: 4,
		tropChance: 0,
	},
	{
		id: "wyprawa",
		name: "Wyprawa",
		description: "Wędrówka przez wzgórza do sąsiedniej krainy.",
		durationRounds: 7,
		rewardIskierki: 12,
		tropChance: 0.25,
	},
	{
		id: "wielka",
		name: "Wielka Wyprawa",
		description: "Daleka podróż za wszystkie bramy — wróci z tropem!",
		durationRounds: 12,
		rewardIskierki: 25,
		tropChance: 1,
	},
]

export const EXPEDITIONS_BY_ID: ReadonlyMap<ExpeditionTypeId, ExpeditionDef> =
	new Map(EXPEDITIONS.map((e) => [e.id, e]))

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
// ewentualny trop — losowy NIEPOSIADANY potworek (wzór rollWish: null przy
// komplecie kolekcji; null też, gdy szansa nie trafiła).
export function resolveExpedition(
	e: ExpeditionState,
	ownedIds: ReadonlySet<number>,
	allIds: readonly number[],
	rand: () => number,
): { rewardIskierki: number; tropMonsterId: number | null } {
	const def = defOf(e.typeId)
	const unowned = allIds.filter((id) => !ownedIds.has(id))
	const tropMonsterId =
		unowned.length > 0 && rand() < def.tropChance
			? (unowned[Math.floor(rand() * unowned.length)] as number)
			: null
	return { rewardIskierki: def.rewardIskierki, tropMonsterId }
}
