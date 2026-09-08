import type { ReactNode } from "react"

// Shared navigation shell; callers own the wallet contents and reward animations.
export function CatalogHeader({
	title,
	onBack,
	children,
}: {
	title: string
	onBack: () => void
	children: ReactNode
}) {
	return (
		<header className="catalog-header">
			<button
				type="button"
				onClick={onBack}
				className="map-back touch-manipulation text-2xl font-extrabold text-grape-dark active:scale-90"
				aria-label="Wróć do domku"
			>
				←
			</button>
			<h1>{title}</h1>
			{children}
		</header>
	)
}
