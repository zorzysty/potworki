import type { VillageState } from "./village"
import { buildingLevel } from "./village"

// Kosmetyka per-potworek (Sklepik, plan 013): kapelusze i aury kupowane raz
// za iskierki, zakładane DOWOLNEMU posiadanemu potworkowi (ubieranie jest
// darmowe i nielimitowane — hojność trzyma zabawę w przebieranki, nie grind).
// Katalog jest append-friendly: nowe przedmioty = nowe wpisy + art, zero zmian
// schematu zapisu (id to stabilne stringi). To zaprojektowany powtarzalny zlew
// iskierek po komplecie wioski i kolekcji.
//
// Czysty moduł: bez losowości, zegara i DOM. Jednokierunkowy import
// z village.ts (buildingLevel) — bez cyklu.

export type CosmeticSlot = "hat" | "aura" | "frame"
export type CosmeticId = string // stabilne kebab-case id, NIGDY nie zmieniać

export interface CosmeticDef {
	id: CosmeticId
	name: string // PROPOZYCJE do dopracowania
	slot: CosmeticSlot
	tier: 1 | 2 | 3 // dostępny gdy poziom sklepiku >= tier
	cost: number
	// Pola ramek (slot "frame", plan 014) — oprawa karty kolekcjonerskiej:
	// cardClasses podstawia się za CARD_THEME[rarity].card na kontenerze modala
	// (rzadkość zostaje czytelna: wstążka RARITY_META.badge i kafle siatki
	// nietknięte), cornerEmoji to opcjonalne emoji w GÓRNYCH rogach okna z artem.
	cardClasses?: string
	cornerEmoji?: string
}

// Katalog startowy: 12 przedmiotów = 346✨ (tiery 31 + 105 + 210).
// Ceny poniżej cen L3 budynków — kapelusz nigdy nie przebija ulepszenia Zamku.
// PROPOZYCJE do dopracowania (nazwy); id zamrożone (persystowane w zapisie).
export const COSMETICS: readonly CosmeticDef[] = [
	{
		id: "czapka-z-pomponem",
		name: "Czapka z pomponem",
		slot: "hat",
		tier: 1,
		cost: 5,
	},
	{ id: "kokarda", name: "Kokarda", slot: "hat", tier: 1, cost: 6 },
	{
		id: "kapelusz-slomkowy",
		name: "Kapelusz słomkowy",
		slot: "hat",
		tier: 1,
		cost: 8,
	},
	{
		id: "czapka-urodzinowa",
		name: "Czapka urodzinowa",
		slot: "hat",
		tier: 1,
		cost: 12,
	},
	{ id: "melonik", name: "Melonik", slot: "hat", tier: 2, cost: 15 },
	{ id: "wianek", name: "Wianek", slot: "hat", tier: 2, cost: 20 },
	{
		id: "aura-serduszek",
		name: "Aura serduszek",
		slot: "aura",
		tier: 2,
		cost: 30,
	},
	{
		id: "aura-gwiazdek",
		name: "Aura gwiazdek",
		slot: "aura",
		tier: 2,
		cost: 40,
	},
	{
		id: "kapelusz-czarodzieja",
		name: "Kapelusz czarodzieja",
		slot: "hat",
		tier: 3,
		cost: 45,
	},
	{
		id: "korona-lodowa",
		name: "Korona lodowa",
		slot: "hat",
		tier: 3,
		cost: 50,
	},
	{ id: "aura-teczy", name: "Aura tęczy", slot: "aura", tier: 3, cost: 55 },
	{ id: "aura-iskier", name: "Aura iskier", slot: "aura", tier: 3, cost: 60 },
	// Ramki kart kolekcjonerskich (plan 014): oprawa modala posiadanego
	// potworka, kupowana raz, zakładana per potworek (slot "frame").
	// PROPOZYCJE do dopracowania (nazwy); id zamrożone (persystowane w zapisie).
	// Razem 140✨ → suma katalogu 486✨ (testowany przedział [430, 580]).
	{
		id: "rama-kwiatki",
		name: "Ramka w Kwiatki",
		slot: "frame",
		tier: 1,
		cost: 15,
		cardClasses: "border-rose-300",
		cornerEmoji: "🌸",
	},
	{
		id: "rama-serduszka",
		name: "Ramka z Serduszek",
		slot: "frame",
		tier: 1,
		cost: 20,
		cardClasses: "border-pink-400",
		cornerEmoji: "💖",
	},
	{
		// złota oprawa = legendarny szyk (anim-glow) dla KAŻDEGO ulubieńca
		id: "rama-zlota",
		name: "Złota Rama",
		slot: "frame",
		tier: 1,
		cost: 25,
		cardClasses: "anim-glow border-amber-400",
	},
	{
		id: "rama-gwiezdna",
		name: "Gwiezdna Rama",
		slot: "frame",
		tier: 2,
		cost: 30,
		cardClasses: "border-indigo-400",
		cornerEmoji: "✨",
	},
	{
		// tęczowy gradient krawędzi: klasa .frame-teczowa w styles.css
		// (padding-box trick — Tailwind nie umie gradientować border-color)
		id: "rama-teczowa",
		name: "Tęczowa Rama",
		slot: "frame",
		tier: 3,
		cost: 50,
		cardClasses: "frame-teczowa border-transparent",
	},
]

export const COSMETICS_BY_ID: ReadonlyMap<CosmeticId, CosmeticDef> = new Map(
	COSMETICS.map((c) => [c.id, c]),
)

// Stan garderoby w zapisie (typ tu, store persystuje — wzór VillageState).
export interface CosmeticsState {
	owned: CosmeticId[]
	// monsterId → założone per slot; brak wpisu = nic nie założone
	equipped: Record<number, Partial<Record<CosmeticSlot, CosmeticId>>>
}

export const INITIAL_COSMETICS: CosmeticsState = { owned: [], equipped: {} }

// Dostępne w sklepiku przy danym poziomie budynku (tier <= level).
export function availableCosmetics(sklepikLevel: number): CosmeticDef[] {
	return COSMETICS.filter((c) => c.tier <= sklepikLevel)
}

// Poziom sklepiku wprost ze stanu wioski — cienki helper dla UI/akcji.
export function sklepikLevel(v: VillageState): number {
	return buildingLevel(v, "sklepik")
}

export function isOwned(c: CosmeticsState, id: CosmeticId): boolean {
	return c.owned.includes(id)
}

export function equippedFor(
	c: CosmeticsState,
	monsterId: number,
): Partial<Record<CosmeticSlot, CosmeticId>> {
	return c.equipped[monsterId] ?? {}
}
