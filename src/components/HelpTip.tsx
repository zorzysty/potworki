import { useState } from "react"

interface Props {
	/** Treść dymka — prostym językiem dla 9-latki. */
	text: string
	/** Etykieta dla czytników ekranu. */
	label?: string
	/** Po której stronie znaczka pojawia się dymek. */
	placement?: "top" | "bottom"
	/** Wyrównanie dymka względem znaczka (zapobiega ucinaniu przy krawędzi). */
	align?: "left" | "center" | "right"
}

// Dotykowy znaczek „?" z dymkiem wyjaśniającym. Stuknięcie otwiera/zamyka,
// stuknięcie obok zamyka (przezroczysta warstwa). Sam znaczek zatrzymuje
// propagację, żeby nie odpalać akcji przycisku, nad którym leży.
export function HelpTip({ text, label = "Co to znaczy?", placement = "bottom", align = "center" }: Props) {
	const [open, setOpen] = useState(false)

	const placeClass = placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
	const alignClass =
		align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -ml-28"

	return (
		<span className="relative inline-flex">
			<button
				type="button"
				aria-label={label}
				aria-expanded={open}
				onClick={e => {
					e.stopPropagation()
					setOpen(o => !o)
				}}
				className="touch-manipulation flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg font-extrabold text-grape shadow ring-2 ring-grape/30 active:scale-90"
			>
				?
			</button>
			{open && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={e => {
							e.stopPropagation()
							setOpen(false)
						}}
					/>
					<div
						className={`anim-pop absolute z-50 w-56 rounded-2xl bg-grape-dark px-4 py-3 text-left text-sm font-bold leading-snug text-white shadow-xl ${placeClass} ${alignClass}`}
						onClick={e => e.stopPropagation()}
					>
						{text}
					</div>
				</>
			)}
		</span>
	)
}
