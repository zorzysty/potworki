import type { CSSProperties, ReactNode } from "react"
import { MonsterSvg } from "../monsters/MonsterSvg"

interface Props {
	id: number
	size?: number | string
	animate?: boolean
	className?: string // przekazywane do MonsterSvg (np. monster-silhouette)
	style?: CSSProperties
	// --- szwy kosmetyki (Sklepik) ---
	background?: ReactNode // tło ZA potworkiem (slot "background", EquippedBackground)
	overlay?: ReactNode // akcesoria/reakcje NA WIERZCHU (pointer-events-none)
	frame?: string // klasy ramki karty (np. CARD_THEME[rarity].card)
}

// Cienki wrapper wokół zamrożonego MonsterSvg i JEDYNY chokepoint kosmetyki:
// reakcje emocjonalne (serca, iskry) i strój renderujemy jako `overlay`, tło jako
// `background` — rodzeństwo SVG, nigdy zmiana twarzy (DNA potworków jest zamrożone).
export function MonsterStage({
	id,
	size = 160,
	animate = true,
	className,
	style,
	background,
	overlay,
	frame = "",
}: Props) {
	return (
		<div className={`relative inline-flex ${frame}`} style={style}>
			{background && (
				<div className="pointer-events-none absolute inset-0">{background}</div>
			)}
			{/* relative: potworek ma malować się NAD absolutnym tłem (kolejność DOM
			    nie wystarcza — element pozycjonowany wygrywa z niepozycjonowanym) */}
			<div className="relative">
				<MonsterSvg
					id={id}
					size={size}
					animate={animate}
					className={className}
				/>
			</div>
			{overlay && (
				<div className="pointer-events-none absolute inset-0">{overlay}</div>
			)}
		</div>
	)
}
