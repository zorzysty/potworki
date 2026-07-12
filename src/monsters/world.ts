import { STAGES } from "../game/facts"
import { isDivisionOnly, isGapOnly } from "./catalog"

// Świat „Krainy Potworków": każdemu etapowi odblokowań (STAGES) odpowiada region
// z nazwą o motywie liczbowym wprowadzanego czynnika i potworkiem-strażnikiem.
// Dane statyczne, czysto prezentacyjne — nie wchodzą do zapisu ani do DNA katalogu.

export interface Region {
	kind: "region" // dyskryminator unii z BRIDGE_ORIGIN (inaczej Region <: bridge → kolaps)
	stage: number // indeks w STAGES
	factor: number // STAGES[stage][0] (etap 0: zestaw bazowy, factor=1)
	name: string
	emoji: string
	blurb: string
	color: string // klasy Tailwind na plakietkę nazwy (literały — skanowane przez JIT)
	guardianId: number // common|rare, !isDivisionOnly, regionOf(id)===stage, unikalny
}

// Indeks regionu po id potworka (= stage). Deterministyczny, nieperystowany —
// „kraina pochodzenia" w paszporcie. Strażnicy dobrani tak, że regionOf(guardianId)
// === stage, więc paszport strażnika wskazuje jego własną krainę.
export function regionOf(id: number): number {
	return id % STAGES.length
}

export const REGIONS: readonly Region[] = [
	{
		kind: "region",
		stage: 0,
		factor: 1,
		name: "Wioska Startowa",
		emoji: "🏡",
		blurb: "Tu zaczyna się Twoja przygoda — dom pierwszych potworków.",
		color: "bg-violet-100 text-violet-600",
		guardianId: 0,
	},
	{
		kind: "region",
		stage: 1,
		factor: 3,
		name: "Trójkątna Piramida",
		emoji: "🔺",
		blurb: "Piramida o trzech ścianach, gdzie wszystko układa się trójkami.",
		color: "bg-orange-100 text-orange-600",
		guardianId: 29,
	},
	{
		kind: "region",
		stage: 2,
		factor: 4,
		name: "Kraina Czterolistnej Koniczyny",
		emoji: "🍀",
		blurb: "Łąki pełne koniczyn, gdzie wszystko rośnie czwórkami.",
		color: "bg-sky-100 text-sky-600",
		guardianId: 30,
	},
	{
		kind: "region",
		stage: 3,
		factor: 6,
		name: "Sześciokątne Plastry Miodu",
		emoji: "🍯",
		blurb: "Sześciokątne plastry brzęczące od pracowitych potworków.",
		color: "bg-amber-100 text-amber-600",
		guardianId: 24,
	},
	{
		kind: "region",
		stage: 4,
		factor: 9,
		name: "Dziewięciogwiezdna Przystań",
		emoji: "🌟",
		blurb: "Przystań pod dziewięcioma gwiazdami, skąd widać cały świat.",
		color: "bg-indigo-100 text-indigo-600",
		guardianId: 25,
	},
	{
		kind: "region",
		stage: 5,
		factor: 7,
		name: "Tęczowy Most Siedmiu Barw",
		emoji: "🌈",
		blurb: "Most z siedmiu barw tęczy, lśniący po każdym deszczu.",
		color: "bg-pink-100 text-pink-600",
		guardianId: 26,
	},
	{
		kind: "region",
		stage: 6,
		factor: 8,
		name: "Ósemkowa Spirala Nieskończoności",
		emoji: "♾️",
		blurb: "Niekończąca się spirala ósemek, która kręci się bez końca.",
		color: "bg-fuchsia-100 text-fuchsia-600",
		guardianId: 27,
	},
]

// Most Strażników: 4 legendarne tylko-dzielenie (id 72–75) strzegące krainy zza Mostu.
export const BRIDGE_GUARDIAN_IDS = [72, 73, 74, 75] as const

// Pochodzenie potworków tylko-dzielenie. Rozróżniane od regionów polem `kind`
// ("bridge" vs "region") — UI sprawdza `origin.kind`, nie brak pola.
export const BRIDGE_ORIGIN = {
	kind: "bridge" as const,
	name: "Kraina za Mostem",
	emoji: "🌉",
	color: "bg-violet-100 text-violet-600",
}

// Pochodzenie potworków tylko-luka (tryb „brakujący czynnik"). Trzeci wariant
// unii pochodzenia (kind "valley"), lustro BRIDGE_ORIGIN. Nazwa = PROPOZYCJA.
export const VALLEY_ORIGIN = {
	kind: "valley" as const,
	name: "Dolina Zagadek",
	emoji: "🧩",
	color: "bg-fuchsia-100 text-fuchsia-600",
}

// Kraina pochodzenia potworka (paszport). Potworki tylko-dzielenie przybywają zza
// Mostu Strażników, tylko-luka — z Doliny Zagadek; żadne z nich nie ma zwykłego
// regionu (id % 7 kłamałby o krainie). Czysta — bez stanu gry.
export function originOf(
	id: number,
): Region | typeof BRIDGE_ORIGIN | typeof VALLEY_ORIGIN {
	if (isDivisionOnly(id)) return BRIDGE_ORIGIN
	if (isGapOnly(id)) return VALLEY_ORIGIN
	return REGIONS[regionOf(id)] as Region
}
