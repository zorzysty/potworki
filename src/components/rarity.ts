import type { Rarity } from "../game/rewards"

export const RARITY_META: Record<
	Rarity,
	{ label: string; text: string; border: string; badge: string }
> = {
	common: {
		label: "Pospolity",
		text: "text-gray-500",
		border: "border-gray-300",
		badge: "bg-gray-200 text-gray-600",
	},
	rare: {
		label: "Rzadki",
		text: "text-blue-500",
		border: "border-blue-400",
		badge: "bg-blue-100 text-blue-600",
	},
	epic: {
		label: "Epicki",
		text: "text-purple-500",
		border: "border-purple-400",
		badge: "bg-purple-100 text-purple-600",
	},
	legendary: {
		label: "Legendarny",
		text: "text-amber-500",
		border: "border-amber-400",
		badge: "bg-amber-100 text-amber-600",
	},
}

// Oprawa „karty kolekcjonerskiej" paszportu (modal w CollectionScreen) — rzadkość
// napędza cały wygląd karty, nieliniowo: pospolity skromnie/papierowo, a legendarny
// daje złoty blask (anim-glow) i shimmer, by rzadka zdobycz realnie nagradzała dziecko.
// Wstążka rzadkości w oknie nadal używa RARITY_META[rarity].badge (nie duplikujemy).
export const CARD_THEME: Record<
	Rarity,
	{
		card: string // ramka + ewentualny blask całej karty
		window: string // gradient okna z artem
		windowBorder: string
		halo: string // radialny blask za potworkiem
		banner: string // tło banera nazwy
		accent: string // kolor linii gatunku
		funFact: string // naklejka z ciekawostką (bez animacji na tekście — czytelność)
	}
> = {
	common: {
		card: "border-gray-200",
		window: "from-slate-100 to-slate-200",
		windowBorder: "border-slate-200",
		halo: "bg-slate-300/40",
		banner: "bg-slate-50",
		accent: "text-slate-500",
		funFact: "border-slate-200 bg-slate-50 text-slate-500",
	},
	rare: {
		card: "border-blue-300",
		window: "from-sky-200 to-blue-300",
		windowBorder: "border-blue-200",
		halo: "bg-sky-300/50",
		banner: "bg-blue-50",
		accent: "text-blue-500",
		funFact: "border-blue-200 bg-blue-50 text-blue-600",
	},
	epic: {
		card: "border-purple-300",
		window: "from-fuchsia-300 to-violet-400",
		windowBorder: "border-purple-200",
		halo: "bg-fuchsia-300/60",
		banner: "bg-purple-50",
		accent: "text-purple-500",
		funFact: "border-purple-200 bg-purple-50 text-purple-600",
	},
	legendary: {
		card: "anim-glow border-amber-400",
		window: "from-amber-200 via-yellow-300 to-orange-300",
		windowBorder: "border-amber-300",
		halo: "bg-amber-300/70",
		banner: "bg-amber-50",
		accent: "text-amber-500",
		funFact: "border-amber-300 bg-amber-50 text-amber-600",
	},
}
