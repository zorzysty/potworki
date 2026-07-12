import { MAX_STARS_PER_ROUND } from "./facts"

// Wioska Budowniczych: katalog budynków/dekoracji i czysta ekonomia żołdu.
// WSZYSTKIE liczby strojenia (ceny, formuła żołdu, bonusy) żyją w TYM pliku —
// retuning po obserwacji dziecka to edycja jednego pliku. Testy pilnują
// struktury i przedziałów, nie dokładnych wartości.

export type BuildingId =
	| "ogrodek"
	| "plac-zabaw"
	| "latarnie"
	| "domki"
	| "fontanna"
	| "zamek"
	| "sklepik"

export type DecorationId =
	| "kwiatki"
	| "sciezka"
	| "hustawka"
	| "staw"
	| "pomnik"
	| "tecza"

export const MAX_BUILDING_LEVEL = 3

export interface BuildingDef {
	// Stabilny klucz persystowany w SaveState.village — NIGDY nie zmieniać po
	// wydaniu. Nazwy/opisy można edytować dowolnie (nie wpływają na zapis).
	id: BuildingId
	name: string
	levelNames: [string, string, string]
	// Opis TEGO, co zmieni się w scenie po zbudowaniu danego poziomu —
	// arkusz budowy sprzedaje transformację, nie ikonę.
	descriptions: [string, string, string]
	costs: [number, number, number] // koszt L1 / L2 / L3
}

export interface DecorationDef {
	id: DecorationId // stabilny klucz persystowany — NIGDY nie zmieniać
	name: string
	cost: number
}

// PROPOZYCJE do dopracowania — wszystkie nazwy i opisy dla gracza w jednym
// miejscu; zmiana nazewnictwa nie dotyka zapisu (id są osobne i zamrożone).
export const BUILDINGS: readonly BuildingDef[] = [
	{
		id: "ogrodek",
		name: "Ogródek",
		levelNames: ["Ogródek", "Ogród", "Ogród Cudów"],
		descriptions: [
			"Na łące zakwitną kwiatki!",
			"Przylecą motylki!",
			"Wyrosną tęczowe kwiaty!",
		],
		costs: [5, 15, 40],
	},
	{
		id: "plac-zabaw",
		name: "Plac Zabaw",
		levelNames: ["Zjeżdżalnia", "Plac Zabaw", "Mega Plac Zabaw"],
		descriptions: [
			"Potworki będą zjeżdżać ze zjeżdżalni!",
			"Dojdzie huśtawka dla potworków!",
			"Trampolina — hop, hop!",
		],
		costs: [10, 30, 70],
	},
	{
		id: "latarnie",
		name: "Latarnie",
		levelNames: ["Latarnia", "Aleja Latarni", "Latarnie Świetlików"],
		descriptions: [
			"Ciepłe światełko rozjaśni wioskę.",
			"Przylecą świetliki!",
			"Stuknij latarnię, a zapadnie wieczór (i wróci dzień)!",
		],
		costs: [10, 25, 60],
	},
	{
		id: "domki",
		name: "Domki",
		levelNames: ["Domek", "Domki", "Miasteczko Domków"],
		descriptions: [
			"Potworki dostaną domek i będą w nim przysypiać.",
			"Więcej domków — więcej potworków naraz w wiosce! (Przyda się, gdy będzie was więcej.)",
			"Całe miasteczko! Jeszcze więcej potworków naraz.",
		],
		costs: [15, 40, 90],
	},
	{
		id: "fontanna",
		name: "Fontanna",
		levelNames: ["Fontanna", "Lśniąca Fontanna", "Fontanna Marzeń"],
		descriptions: [
			"Woda zacznie się skrzyć iskierkami.",
			"Potworki będą drzemać przy pluskającej wodzie.",
			"W wodzie odbije się potworek, o którym marzysz!",
		],
		costs: [20, 50, 120],
	},
	{
		id: "zamek",
		name: "Zamek",
		levelNames: ["Wieżyczka", "Zamek", "Zamek Iskierek"],
		descriptions: [
			"+1 ✨ za każdą ukończoną rundę!",
			"+2 ✨ za każdą ukończoną rundę!",
			"+3 ✨ za każdą ukończoną rundę!",
		],
		costs: [20, 100, 250],
	},
	// Sklepik odblokowuje KOSMETYKĘ (kapelusze/aury z src/game/cosmetics.ts):
	// poziom budynku = dostępny tier asortymentu (Heroes-style). Zawsze APPEND —
	// kod działek/testów/osiągnięć iteruje po tablicy.
	{
		id: "sklepik",
		name: "Sklepik",
		levelNames: ["Stragan", "Sklepik", "Dom Mody Potworków"], // PROPOZYCJE
		descriptions: [
			"Kapelusze dla potworków! (Ubierasz w Moich Potworkach.)",
			"Nowe nakrycia głowy i pierwsze aury!",
			"Najpiękniejsze aury i stroje — moda na całą wioskę!",
		],
		costs: [15, 45, 110],
	},
]

// PROPOZYCJE do dopracowania (nazwy dekoracji).
// kwiatki = 5 (nie 4): przy remisie cen automatyczny cel wybiera BUDYNEK
// (ogródek), więc pierwszy cel świeżego gracza transformuje scenę.
export const DECORATIONS: readonly DecorationDef[] = [
	{ id: "kwiatki", name: "Kwiatki", cost: 5 },
	{ id: "sciezka", name: "Ścieżka", cost: 5 },
	{ id: "hustawka", name: "Huśtawka na drzewie", cost: 6 },
	{ id: "staw", name: "Staw z kaczuszką", cost: 8 },
	{ id: "pomnik", name: "Pomnik Pierwszego Potworka", cost: 10 },
	{ id: "tecza", name: "Tęcza", cost: 12 },
]

export const BUILDINGS_BY_ID: ReadonlyMap<BuildingId, BuildingDef> = new Map(
	BUILDINGS.map((b) => [b.id, b]),
)
export const DECORATIONS_BY_ID: ReadonlyMap<DecorationId, DecorationDef> =
	new Map(DECORATIONS.map((d) => [d.id, d]))

// Stan wioski w zapisie (typ należy tu, store go persystuje — wzór EggBankState).
export interface VillageState {
	buildings: Partial<Record<BuildingId, number>> // id → poziom 1..3 (brak = niezbudowany)
	decorations: DecorationId[] // kupione (kolejność bez znaczenia)
	goalId: BuildingId | null // cel wybrany przez dziecko („Mój cel!")
}

export const INITIAL_VILLAGE: VillageState = {
	buildings: {},
	decorations: [],
	goalId: null,
}

export function buildingLevel(v: VillageState, id: BuildingId): number {
	return v.buildings[id] ?? 0
}

// Koszt następnego poziomu (null gdy maks) — jedyne źródło prawdy dla UI i akcji.
export function nextLevelCost(v: VillageState, id: BuildingId): number | null {
	const def = BUILDINGS_BY_ID.get(id)
	if (!def) return null
	const level = buildingLevel(v, id)
	if (level >= MAX_BUILDING_LEVEL) return null
	return def.costs[level] ?? null
}

// Próg „dobrej rundy" dla żołdu: co najmniej połowa gwiazdek. Osiągalny w
// większości zaangażowanych rund — jakość gry ma widocznie ruszać dochód,
// bo sama perfekcja (30/30) jest rzadkością klasy tęczowego jajka.
export const WAGE_GOOD_ROUND_STARS = 15

// Żołd za UKOŃCZONĄ rundę (wyjście w trakcie = 0, jak totalRounds):
//   1 zawsze (wolna runda też zarabia — „szybkość tylko nagradza")
// + 1 za dobrą rundę (≥ połowa gwiazdek)
// + 1 dodatkowo za rundę perfekcyjną (30/30)
// + poziom zamku (0–3) — procent składany: inwestycja przyspiesza zarabianie
// + 1 za pierwszą ukończoną rundę dnia (nagradza obecność; NIGDY nie ma
//   streaka ani kary za przerwę). Ten składnik wycinamy PIERWSZY, gdyby
//   ekonomia okazała się zbyt hojna — stąd osobna flaga.
// Zakres 1..7; cap portfela (ISKIERKI_CAP) egzekwuje store.
export function roundWage(
	v: VillageState,
	stars: number,
	firstRoundToday: boolean,
): number {
	return (
		1 +
		(stars >= WAGE_GOOD_ROUND_STARS ? 1 : 0) +
		(stars >= MAX_STARS_PER_ROUND ? 1 : 0) +
		buildingLevel(v, "zamek") +
		(firstRoundToday ? 1 : 0)
	)
}

// Limit wędrowców renderowanych w wiosce: baza + 4 za każdy poziom domków
// (14/18/22/26). Baza = strojenie wydajności tabletu (do 76 animowanych SVG
// to za dużo), bonus domków = widoczny perk kolekcji.
export const BASE_VILLAGE_CAP = 14
export const CAP_PER_DOMKI_LEVEL = 4

export function villageCap(v: VillageState): number {
	return BASE_VILLAGE_CAP + CAP_PER_DOMKI_LEVEL * buildingLevel(v, "domki")
}

export interface VillageGoal {
	kind: "building" | "decoration"
	id: string
	name: string
	cost: number
}

// Wszystkie jeszcze-niekupione zakupy (następne poziomy budynków + dekoracje).
function remainingGoals(v: VillageState): VillageGoal[] {
	const goals: VillageGoal[] = []
	for (const b of BUILDINGS) {
		const cost = nextLevelCost(v, b.id)
		if (cost !== null) {
			const level = buildingLevel(v, b.id)
			goals.push({
				kind: "building",
				id: b.id,
				// cel pokazuje nazwę poziomu, do którego dziecko zmierza
				name: b.levelNames[level] ?? b.name,
				cost,
			})
		}
	}
	for (const d of DECORATIONS) {
		if (!v.decorations.includes(d.id)) {
			goals.push({ kind: "decoration", id: d.id, name: d.name, cost: d.cost })
		}
	}
	return goals
}

// Bieżący cel: wybrany przez dziecko (goalId → następny poziom tego budynku),
// a gdy brak/maks — najtańszy nieosiągnięty (budynek-poziom lub dekoracja;
// przy remisie wygrywa budynek, kolejność katalogu). null gdy wszystko kupione.
export function currentGoal(v: VillageState): VillageGoal | null {
	if (v.goalId !== null) {
		const def = BUILDINGS_BY_ID.get(v.goalId)
		const cost = nextLevelCost(v, v.goalId)
		if (def && cost !== null) {
			const level = buildingLevel(v, v.goalId)
			return {
				kind: "building",
				id: def.id,
				name: def.levelNames[level] ?? def.name,
				cost,
			}
		}
	}
	const goals = remainingGoals(v)
	let cheapest: VillageGoal | null = null
	for (const goal of goals) {
		if (cheapest === null || goal.cost < cheapest.cost) cheapest = goal
	}
	return cheapest
}

// Czy stać na cokolwiek jeszcze niekupionego (badge „stać cię!" na Home).
export function canAffordSomething(v: VillageState, iskierki: number): boolean {
	return remainingGoals(v).some((goal) => goal.cost <= iskierki)
}

// Suma iskierek zainwestowanych w wioskę (osiągnięte poziomy + dekoracje) —
// panel debug: wydane ≈ villageValue + koszty jajek życzeń, więc pacing da się
// obserwować bez nowych persystowanych liczników.
export function villageValue(v: VillageState): number {
	let total = 0
	for (const b of BUILDINGS) {
		const level = buildingLevel(v, b.id)
		for (let i = 0; i < level; i++) total += b.costs[i] ?? 0
	}
	for (const id of v.decorations) {
		total += DECORATIONS_BY_ID.get(id)?.cost ?? 0
	}
	return total
}
