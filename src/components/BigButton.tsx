import type { PointerEvent, ReactNode } from "react"

interface Props {
	onClick: () => void
	children: ReactNode
	variant?: "primary" | "secondary" | "ghost"
	className?: string
	disabled?: boolean
	/** "press" = pointerdown (domyślne, ekrany bez scrolla); "tap" = click, na powierzchniach przewijalnych nie odpala się przy starcie przewijania */
	trigger?: "press" | "tap"
}

const STYLES = {
	primary:
		"bg-gradient-to-b from-grape to-grape-dark text-white shadow-lg shadow-grape/40 border-b-4 border-grape-dark",
	secondary: "bg-white text-grape-dark shadow-md border-b-4 border-violet-200",
	ghost: "bg-white/50 text-grape-dark",
}

export function BigButton({
	onClick,
	children,
	variant = "primary",
	className = "",
	disabled,
	trigger = "press",
}: Props) {
	const triggerProps =
		trigger === "tap"
			? { onClick }
			: {
					onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
						if (e.button !== 0 && e.pointerType === "mouse") return
						onClick()
					},
				}
	return (
		<button
			type="button"
			disabled={disabled}
			{...triggerProps}
			className={`touch-manipulation select-none rounded-3xl px-7 py-4 text-2xl font-extrabold transition-transform active:scale-95 disabled:opacity-40 ${STYLES[variant]} ${className}`}
		>
			{children}
		</button>
	)
}
