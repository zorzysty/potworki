const FIRST = [
	"Mru",
	"Pim",
	"Bul",
	"Klu",
	"Fi",
	"Gu",
	"Łap",
	"Ciap",
	"Pyk",
	"Fru",
	"Chru",
	"Mig",
	"Tup",
	"Zyg",
	"Plu",
	"Bzy",
]

const SECOND = [
	"mek",
	"puś",
	"lka",
	"cio",
	"zia",
	"bek",
	"tka",
	"luś",
	"pek",
	"sio",
	"nek",
	"fik",
]

const HONORIFICS = ["Złoty", "Wielki", "Królewski"]

// Deterministyczne, wywoływane w kolejności id — dedupe przez Set
export function generateName(
	rand: () => number,
	legendary: boolean,
	used: Set<string>,
): string {
	const first = FIRST[Math.floor(rand() * FIRST.length)] as string
	let secondIdx = Math.floor(rand() * SECOND.length)
	let name = first + SECOND[secondIdx]
	while (used.has(name)) {
		secondIdx = (secondIdx + 1) % SECOND.length
		name = first + SECOND[secondIdx]
	}
	used.add(name)
	if (legendary) {
		const honorific = HONORIFICS[Math.floor(rand() * HONORIFICS.length)]
		return `${honorific} ${name}`
	}
	return name
}
