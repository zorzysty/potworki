import type { Difficulty } from "../achievements/catalog"

// Oprawa wizualna osiągnięcia wg trudności (mirror RARITY_META): etykieta PL,
// ramka kafla i plakietka nagrody. Logika nagród (ile iskierek) żyje w domenie
// `achievements/` (REWARD_BY_DIFFICULTY) — tu są tylko style.
export const TIER_META: Record<
	Difficulty,
	{
		label: string
		border: string
		badge: string
		bar: string
		tint: string // gradient panelu-bohatera w modalu (jasny odcień trudności)
		accent: string // kolor tekstu etykiety trudności
	}
> = {
	easy: {
		label: "Łatwe",
		border: "border-emerald-300",
		badge: "bg-emerald-100 text-emerald-600",
		bar: "from-emerald-300 to-emerald-500",
		tint: "from-emerald-100 to-emerald-200",
		accent: "text-emerald-600",
	},
	medium: {
		label: "Średnie",
		border: "border-sky-300",
		badge: "bg-sky-100 text-sky-600",
		bar: "from-sky-300 to-sky-500",
		tint: "from-sky-100 to-sky-200",
		accent: "text-sky-600",
	},
	hard: {
		label: "Trudne",
		border: "border-amber-400",
		badge: "bg-amber-100 text-amber-600",
		bar: "from-amber-300 to-orange-400",
		tint: "from-amber-100 via-yellow-100 to-orange-200",
		accent: "text-amber-600",
	},
	// Najwyższy tier (25 iskierek) — premium fiolet/fuksja z anim-glow (jak karta
	// legendarnego potworka), wizualnie ponad złotym „Trudne". Tylko endgame szczyty.
	legendary: {
		label: "Legendarne",
		border: "anim-glow border-fuchsia-400",
		badge: "bg-fuchsia-100 text-fuchsia-600",
		bar: "from-fuchsia-400 via-violet-400 to-purple-500",
		tint: "from-fuchsia-100 via-violet-100 to-purple-200",
		accent: "text-fuchsia-600",
	},
}
