import type { CSSProperties, ReactNode } from "react"
import { MonsterSvg } from "../monsters/MonsterSvg"

interface Props {
	id: number
	size?: number | string
	animate?: boolean
	className?: string // przekazywane do MonsterSvg (np. monster-silhouette)
	style?: CSSProperties
	// --- szwy pod przyszły sklepik (kosmetyka), w v1 nieużywane ---
	background?: ReactNode // tło/scenka ZA potworkiem (np. kupione tło)
	overlay?: ReactNode // akcesoria/reakcje NA WIERZCHU (pointer-events-none)
	frame?: string // klasy ramki karty (np. CARD_THEME[rarity].card)
}

// Cienki wrapper wokół zamrożonego MonsterSvg i JEDYNY chokepoint kosmetyki:
// reakcje emocjonalne (serca, iskry) renderujemy jako `overlay` — rodzeństwo SVG,
// nigdy zmiana twarzy (DNA potworków jest zamrożone). Sklepik później wypełni
// `background`/`overlay`/`frame`, bez ruszania tego komponentu ani MonsterSvg.
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
			<MonsterSvg id={id} size={size} animate={animate} className={className} />
			{overlay && (
				<div className="pointer-events-none absolute inset-0">{overlay}</div>
			)}
		</div>
	)
}
