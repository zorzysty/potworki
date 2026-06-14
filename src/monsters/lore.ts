import { type Dna, MONSTERS, mulberry32 } from "./catalog"

// Opis („lore") potworka wyprowadzany DETERMINISTYCZNIE z jego DNA. To czysta
// prezentacja — tekst nie wchodzi do zapisu (zapisujemy tylko monsterId) ani do
// zamrożonej sygnatury katalogu, więc wolno go swobodnie ulepszać.
//
// Banki muszą mieć dokładnie tyle wpisów, ile wariantów danego pola DNA — bez
// fallbacków `?? …`, żeby brak wpisu wyszedł w teście, a nie cicho dał "undefined".
// Frazy zaczynające zdanie pisane WIELKĄ literą, środkowe (po „i"/„a") małą.

// body 0–5 — rzeczowniki-gatunki RODZAJU MĘSKIEGO (zgodność z przymiotnikiem palety)
const BODY = [
	"Glutek", // 0 blob
	"Kuleczniak", // 1 kula
	"Gruszkostwór", // 2 gruszka
	"Fasolniak", // 3 fasolka
	"Tyczkowiec", // 4 wysoki
	"Pyzak", // 5 pyzaty kwadrat
]

// palette 0–7 — przymiotniki r.m. (małą literą; 6 = epic galaktyczna, 7 = legendary tęczowa)
const PALETTE = [
	"leśny", // 0 zielona
	"ognisty", // 1 pomarańczowa
	"lodowy", // 2 niebieska
	"słoneczny", // 3 żółta
	"cukierkowy", // 4 różowa
	"śliwkowy", // 5 fioletowa
	"galaktyczny", // 6
	"tęczowy", // 7
]

// eyes 0–4 — zaczynają zdanie (WIELKA litera)
const EYES = [
	"Patrzy na świat dwojgiem okrągłych oczu", // 0
	"Spogląda jednym wielkim okiem", // 1
	"Przymyka senne oczka", // 2
	"Ma roziskrzone spojrzenie", // 3
	"Widzi wszystko trojgiem oczu", // 4
]

// mouth 0–3 — środek zdania (mała litera)
const MOUTH = [
	"uśmiecha się delikatnie", // 0
	"śmieje się na całego", // 1
	"błyska ząbkami", // 2
	"pokazuje języczek", // 3
]

// topper 0–4 — zaczynają zdanie (WIELKA litera). 0 = brak ozdoby (Topper → null).
// UWAGA: dla korony NIE używamy tego banku (korona zastępuje topper w renderze).
const TOPPER = [
	"Nie nosi nic na głowie", // 0
	"Ma parę zakręconych różków", // 1
	"Strzyże spiczastymi uszkami", // 2
	"Macha czułkiem z kuleczką", // 3
	"Wypuszcza zielony listek na czubku", // 4
]

// pattern 0–3 — środek zdania (mała litera). 0 = brak wzoru (PatternLayer → null).
const PATTERN = [
	"ma gładziutką skórę", // 0
	"jest w kolorowe kropki", // 1
	"nosi zabawne paski", // 2
	"ma jasną łatkę na boku", // 3
]

// accessory → przymiotnik do nazwy gatunku (aura/none bez prefiksu)
const ACCESSORY_ADJ: Record<Dna["accessory"], string> = {
	none: "",
	wings: "Skrzydlaty",
	aura: "",
	crown: "Królewski",
}

// accessory → dodatkowe zdanie zgodne z tym, co NAPRAWDĘ widać (MonsterSvg):
// aura renderuje się dla "aura" i "crown"; skrzydła dla "wings".
const ACCESSORY_EXTRA: Record<Dna["accessory"], string> = {
	none: "",
	wings: "Rozkłada wielkie skrzydła.",
	aura: "Otacza go migocząca aura.",
	crown: "Otacza go królewska aura.",
}

// Ciekawostki NIEZALEŻNE od DNA (by nie zmyślać o nierenderowanych detalach).
// Seed XOR-owany inną stałą niż seedy DNA/imion w catalog.ts.
const FUN_FACTS = [
	"Czy wiesz, że uwielbia liczyć gwiazdy przed snem?",
	"Czy wiesz, że najbardziej lubi liczbę, którą właśnie ćwiczysz?",
	"Czy wiesz, że potrafi kichnąć tęczą?",
	"Czy wiesz, że zbiera kolorowe kamyki do swojej kolekcji?",
	"Czy wiesz, że mruczy, kiedy jest zadowolony?",
	"Czy wiesz, że śpi zwinięty w kłębek jak ciasteczko?",
	"Czy wiesz, że jego ulubiona przekąska to chrupiące zera?",
	"Czy wiesz, że tupie do rytmu tabliczki mnożenia?",
	"Czy wiesz, że chowa skarby pod poduszką?",
	"Czy wiesz, że potrafi poprawić humor jednym uśmiechem?",
]

export interface MonsterLore {
	species: string
	blurb: string
	funFact: string
}

export function loreFor(id: number): MonsterLore {
	const monster = MONSTERS[id]
	if (!monster) return { species: "", blurb: "", funFact: "" }
	const { dna } = monster

	const species = [
		ACCESSORY_ADJ[dna.accessory],
		BODY[dna.body],
		PALETTE[dna.palette],
	]
		.filter(Boolean)
		.join(" ")

	// korona zastępuje topper w renderze → opisuj koronę, nie ukryty topper
	const ornament =
		dna.accessory === "crown" ? "Nosi błyszczącą koronę" : TOPPER[dna.topper]

	const blurb = [
		`To ${species}.`,
		`${EYES[dna.eyes]} i ${MOUTH[dna.mouth]}.`,
		`${ornament}, a ${PATTERN[dna.pattern]}.`,
		ACCESSORY_EXTRA[dna.accessory],
	]
		.filter(Boolean)
		.join(" ")

	const idx = Math.floor(mulberry32(id ^ 0x105e)() * FUN_FACTS.length)
	const funFact = FUN_FACTS[idx] ?? ""

	return { species, blurb, funFact }
}
