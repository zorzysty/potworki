import { idsByRarityForMode, MONSTER_COUNT } from "../monsters/catalog"
import type { Region } from "../monsters/world"
import type { GameMode } from "./facts"

// Fakty o kolekcji liczone z zapisu — JEDNO miejsce dla komparatora po
// hatchedAt i obu pojęć „komplet" (katalog vs pula trybu). Ekrany czytają
// wyniki, nie liczą ich same.
export type OwnedMonsters = Readonly<Record<number, { hatchedAt: number }>>

export const ownedIds = (owned: OwnedMonsters): number[] =>
	Object.keys(owned).map(Number)

export const ownedCount = (owned: OwnedMonsters): number =>
	Object.keys(owned).length

export const isCollectionComplete = (owned: OwnedMonsters): boolean =>
	ownedCount(owned) === MONSTER_COUNT

// Płaska pula trybu (Jajko Życzeń i znaleziska wypraw losują z mnożeniowej —
// bez legendarnych ekskluzywnych innych trybów); domyka się PRZED kompletem katalogu.
export const poolIds = (mode: GameMode): number[] =>
	Object.values(idsByRarityForMode(mode)).flat()

export const isPoolComplete = (owned: OwnedMonsters, mode: GameMode): boolean =>
	poolIds(mode).every((id) => id in owned)

// Przyjęcie potworka do kolekcji — JEDNA reguła dla wyklucia i znaleziska z
// wyprawy: wpis z hatchedAt + zwolnienie slotu wymarzonego, gdy to on.
export function grantMonster(
	save: { ownedMonsters: OwnedMonsters; dreamMonsterId: number | null },
	id: number,
	now: number,
): { ownedMonsters: OwnedMonsters; dreamMonsterId: number | null } {
	return {
		ownedMonsters: { ...save.ownedMonsters, [id]: { hatchedAt: now } },
		dreamMonsterId: save.dreamMonsterId === id ? null : save.dreamMonsterId,
	}
}

// Od najnowszego do najstarszego; remis w hatchedAt rozstrzyga niższy `id`
// (kolejność katalogu) — deterministycznie, niezależnie od kolejności kluczy.
export function byRecency(owned: OwnedMonsters): number[] {
	return ownedIds(owned).sort(
		(a, b) => (owned[b]?.hatchedAt ?? 0) - (owned[a]?.hatchedAt ?? 0) || a - b,
	)
}

export const newestOwned = (owned: OwnedMonsters): number | undefined =>
	byRecency(owned)[0]

// Pierwszy wyklyty potworek dziecka (pomnik w Wiosce); remis → niższy `id`.
export function firstHatched(owned: OwnedMonsters): number | undefined {
	return ownedIds(owned).sort(
		(a, b) => (owned[a]?.hatchedAt ?? 0) - (owned[b]?.hatchedAt ?? 0) || a - b,
	)[0]
}

// Strażnik krainy posiadany? `undefined` (brak krainy / etap bez wizyty) = nie.
export const guardianOwned = (
	region: Region | undefined,
	owned: OwnedMonsters,
): boolean => region !== undefined && region.guardianId in owned
