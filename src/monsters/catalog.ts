import type { Rarity } from "../game/rewards"
import { generateName } from "./names"

// UWAGA: NIGDY nie zmieniać seeda ani kodu generacji po wydaniu —
// zapisujemy tylko monsterId, więc zmiana = inna kolekcja na urządzeniu dziecka.
const GLOBAL_SEED = 0x9077_0421

export function mulberry32(seed: number): () => number {
	let s = seed
	return () => {
		s = (s + 0x6d2b79f5) | 0
		let t = Math.imul(s ^ (s >>> 15), 1 | s)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export interface Dna {
	body: number // 0–5
	palette: number // 0–7 (6 = galaktyczna dla epickich, 7 = tęczowa dla legendarnych)
	eyes: number // 0–4
	mouth: number // 0–3
	topper: number // 0–4
	pattern: number // 0–3
	accessory: "none" | "wings" | "aura" | "crown"
}

export interface Monster {
	id: number
	rarity: Rarity
	dna: Dna
	name: string
}

export const MONSTER_COUNT = 72

// Szerokość kroku salta w seedzie kolizji DNA — ZAMROŻONA na 48 (pierwotne
// MONSTER_COUNT). Odpięta od MONSTER_COUNT, by dodawanie potworków nie zmieniało
// DNA istniejących sztuk, które potrzebowały salt>0.
const SALT_STRIDE = 48

export function rarityOf(id: number): Rarity {
	if (id >= 48) {
		// nowe potworki 48–71 (decyzja: +12 common, +7 rare, +4 epic, +1 legendary)
		if (id >= 71) return "legendary" // 71
		if (id >= 67) return "epic" // 67–70
		if (id >= 60) return "rare" // 60–66
		return "common" // 48–59
	}
	// ZAMROŻONE granice 0–47
	if (id >= 45) return "legendary"
	if (id >= 38) return "epic"
	if (id >= 24) return "rare"
	return "common"
}

// Wyprowadzone z rarityOf — grupuje wszystkie id po rzadkości (niezbędnie
// niesąsiadujące zakresy po dodaniu nowych potworków).
export const IDS_BY_RARITY: Record<Rarity, readonly number[]> = (() => {
	const map: Record<Rarity, number[]> = { common: [], rare: [], epic: [], legendary: [] }
	for (let id = 0; id < MONSTER_COUNT; id++) map[rarityOf(id)].push(id)
	return map
})()

function rollDna(rand: () => number, rarity: Rarity, id: number): Dna {
	// paleta przydzielana po id (przekątna), nie losowo — równy rozkład kolorów
	const palette =
		rarity === "legendary" ? 7
		: rarity === "epic" ? 6
		: (id + Math.floor(id / 6)) % 6
	const accessory: Dna["accessory"] =
		rarity === "legendary" ? "crown"
		: rarity === "epic" ? (rand() < 0.5 ? "wings" : "aura")
		: "none"
	return {
		body: Math.floor(rand() * 6),
		palette,
		eyes: Math.floor(rand() * 5),
		mouth: Math.floor(rand() * 4),
		topper: Math.floor(rand() * 5),
		pattern: Math.floor(rand() * 4),
		accessory,
	}
}

function dnaSignature(dna: Dna): string {
	return `${dna.body}-${dna.palette}-${dna.eyes}-${dna.mouth}-${dna.topper}-${dna.pattern}-${dna.accessory}`
}

function buildCatalog(): Monster[] {
	const usedNames = new Set<string>()
	const usedDna = new Set<string>()
	return Array.from({ length: MONSTER_COUNT }, (_, id) => {
		const rarity = rarityOf(id)
		// kolizja wyglądu → deterministyczny bump salta
		let salt = 0
		let dna: Dna
		do {
			const rng = mulberry32(GLOBAL_SEED ^ Math.imul(id + salt * SALT_STRIDE, 0x9e3779b9))
			dna = rollDna(rng, rarity, id)
			salt++
		} while (usedDna.has(dnaSignature(dna)))
		usedDna.add(dnaSignature(dna))
		const nameRng = mulberry32(GLOBAL_SEED ^ Math.imul(id + 1000, 0x85ebca6b))
		const name = generateName(nameRng, rarity === "legendary", usedNames)
		return { id, rarity, dna, name }
	})
}

export const MONSTERS: readonly Monster[] = buildCatalog()

// Gwarantowany pierwszy potworek (gdy kolekcja pusta) — słodki pospolity
export const FIRST_MONSTER_ID = 0
