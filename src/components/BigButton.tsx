import type { ReactNode } from "react"

interface Props {
	onClick: () => void
	children: ReactNode
	variant?: "primary" | "secondary" | "ghost"
	className?: string
	disabled?: boolean
}

const STYLES = {
	primary:
		"bg-gradient-to-b from-grape to-grape-dark text-white shadow-lg shadow-grape/40 border-b-4 border-grape-dark",
	secondary: "bg-white text-grape-dark shadow-md border-b-4 border-violet-200",
	ghost: "bg-white/50 text-grape-dark",
}

export function BigButton({ onClick, children, variant = "primary", className = "", disabled }: Props) {
	return (
		<button
			type="button"
			disabled={disabled}
			onPointerDown={e => {
				if (e.button !== 0 && e.pointerType === "mouse") return
				onClick()
			}}
			className={`touch-manipulation select-none rounded-3xl px-7 py-4 text-2xl font-extrabold transition-transform active:scale-95 disabled:opacity-40 ${STYLES[variant]} ${className}`}
		>
			{children}
		</button>
	)
}
