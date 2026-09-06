import { useLayoutEffect, useRef, useState } from "react"

interface Props {
	/** Treść dymka — prostym językiem dla 9-latki. */
	text: string
	/** Etykieta dla czytników ekranu. */
	label?: string
	/** Preferowana strona znaczka; dymek przeskakuje na drugą, gdy tu nie zmieści się w oknie. */
	placement?: "top" | "bottom"
	/** Preferowane wyrównanie względem znaczka; dymek i tak jest dosuwany do wnętrza okna. */
	align?: "left" | "center" | "right"
}

const MARGIN = 8

// Dotykowy znaczek „?" z dymkiem wyjaśniającym. Stuknięcie otwiera/zamyka,
// stuknięcie obok zamyka (przezroczysta warstwa). Sam znaczek zatrzymuje
// propagację, żeby nie odpalać akcji przycisku, nad którym leży.
// Dymek jest `fixed` i pozycjonowany z prostokąta znaczka: nie ucina go ani
// overflow przodków, ani krawędź ekranu (placement/align to tylko preferencje).
export function HelpTip({
	text,
	label = "Co to znaczy?",
	placement = "bottom",
	align = "center",
}: Props) {
	const [open, setOpen] = useState(false)
	const badge = useRef<HTMLButtonElement>(null)
	const tip = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!open) return
		const b = badge.current?.getBoundingClientRect()
		const el = tip.current
		if (!b || !el) return
		const vw = window.innerWidth
		const vh = window.innerHeight
		const w = el.offsetWidth
		const h = el.offsetHeight
		const wanted =
			align === "left"
				? b.left
				: align === "right"
					? b.right - w
					: b.left + b.width / 2 - w / 2
		const left = Math.min(Math.max(MARGIN, wanted), vw - w - MARGIN)
		const above = b.top - MARGIN - h
		const below = b.bottom + MARGIN
		let top = placement === "top" ? above : below
		if (top < MARGIN) top = below
		if (top + h > vh - MARGIN) top = Math.max(MARGIN, above)
		el.style.left = `${left}px`
		el.style.top = `${top}px`
		// przewinięcie odkleiłoby dymek od znaczka — zamykamy
		const close = () => setOpen(false)
		window.addEventListener("scroll", close, { capture: true, once: true })
		return () => window.removeEventListener("scroll", close, { capture: true })
	}, [open, align, placement])

	return (
		<span className="relative inline-flex">
			<button
				ref={badge}
				type="button"
				aria-label={label}
				aria-expanded={open}
				onClick={(e) => {
					e.stopPropagation()
					setOpen((o) => !o)
				}}
				className="touch-manipulation flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg font-extrabold text-grape shadow ring-2 ring-grape/30 active:scale-90"
			>
				?
			</button>
			{open && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={(e) => {
							e.stopPropagation()
							setOpen(false)
						}}
					/>
					<div
						ref={tip}
						className="anim-pop fixed z-50 w-56 max-w-[calc(100vw-16px)] rounded-2xl bg-grape-dark px-4 py-3 text-left text-sm font-bold leading-snug text-white shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						{text}
					</div>
				</>
			)}
		</span>
	)
}
