import type { Difficulty } from "../achievements/catalog"

// Oprawa wizualna osiągnięcia wg trudności (mirror RARITY_META): etykieta PL,
// ramka kafla i plakietka nagrody. Logika nagród (ile iskierek) żyje w domenie
// `achievements/` (REWARD_BY_DIFFICULTY) — tu są tylko style.
export const TIER_META: Record<
	Difficulty,
	{ label: string; border: string; badge: string; bar: string }
> = {
	easy: {
		label: "Łatwe",
		border: "border-emerald-300",
		badge: "bg-emerald-100 text-emerald-600",
		bar: "from-emerald-300 to-emerald-500",
	},
	medium: {
		label: "Średnie",
		border: "border-sky-300",
		badge: "bg-sky-100 text-sky-600",
		bar: "from-sky-300 to-sky-500",
	},
	hard: {
		label: "Trudne",
		border: "border-amber-400",
		badge: "bg-amber-100 text-amber-600",
		bar: "from-amber-300 to-orange-400",
	},
}
