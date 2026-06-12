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
