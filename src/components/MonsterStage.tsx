import type { CSSProperties, ReactNode } from "react"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { EquippedOverlay } from "./CosmeticArt"

interface Props {
	id: number
	size?: number | string
	// true: potworek żyje w SVG (bob/mruganie/kapelusz); false: w pełni statyczny
	// (kafle listy); "outer": podskok robi CALLER na wrapperze HTML (Wioska —
	// kompozytor zamiast przemalowywania SVG), więc SVG i kapelusz stoją, ale
	// drobinki aury (tanie spany HTML) dalej pływają
	animate?: boolean | "outer"
	className?: string // przekazywane do MonsterSvg (np. monster-silhouette)
	style?: CSSProperties
	wrapClassName?: string // klasy kontenera (np. w-full dla kafla listy)
	// --- szwy kosmetyki (Sklepik) ---
	overlay?: ReactNode // nakładki reakcji (serca, iskry, znacznik) NA WIERZCHU stroju
}

// Cienki wrapper wokół zamrożonego MonsterSvg i JEDYNY chokepoint kosmetyki:
// założony strój (kapelusz/aura) Stage dokłada SAM — każdy potworek narysowany
// przez Stage nosi to, co ma w garderobie (nieposiadany nic nie ma → zero DOM).
// Reakcje emocjonalne przychodzą jako `overlay` i malują się NAD strojem —
// rodzeństwo SVG, nigdy zmiana twarzy (DNA potworków jest zamrożone). Tła
// (slot "background") Stage nie rysuje: to warstwa całego kontenera u callera
// (scena hero na Home, karta/kafel w Kolekcji); wioska i wędrowcy są bez tła.
// `align-top`: w kontenerze blokowym inline-flex nie zostawia szczeliny linii.
export function MonsterStage({
	id,
	size = 160,
	animate = true,
	className,
	style,
	wrapClassName = "",
	overlay,
}: Props) {
	return (
		<div
			className={`relative inline-flex justify-center align-top ${wrapClassName}`}
			style={style}
		>
			{/* w-full: przy size="100%" i szerszym wrapperze (kafel listy) SVG
			    liczy procent z tego diva — bez tego kurczył się i siedział z lewej */}
			<div className="relative w-full">
				<MonsterSvg
					id={id}
					size={size}
					animate={animate === true}
					className={className}
				/>
			</div>
			<div className="pointer-events-none absolute inset-0">
				<EquippedOverlay monsterId={id} animate={animate} />
				{overlay}
			</div>
		</div>
	)
}
