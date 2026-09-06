import type { ReactNode } from "react"
import { ModalCloseX } from "./ModalCloseX"
import { useScrollLock } from "./useScrollLock"

// Powłoka karty-modala (Kolekcja, wyprawa na Home): przyciemnione tło (tap
// zamyka), nieprzewijany wrapper z przypiętym ✕, blokada scrolla dokumentu.
// Przewijany kontener karty (CARD_SHELL) renderuje dziecko — ramka jest jego.
export function CardModal({
	onClose,
	closeLabel,
	children,
}: {
	onClose: () => void
	closeLabel: string
	children: ReactNode
}) {
	useScrollLock()
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm"
			onClick={onClose}
		>
			{/* wrapper nie przewija się, więc ✕ jest zawsze widoczny; limit
			    wysokości z --app-vh (nie vh — na telefonie vh liczy viewport
			    bez paska przeglądarki i karta wychodziła poza ekran) minus p-5 */}
			<div
				className="anim-pop relative flex max-h-[calc(var(--app-vh)-2.5rem)] w-full max-w-sm flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				<ModalCloseX onClose={onClose} label={closeLabel} />
				{children}
			</div>
		</div>
	)
}

// Przewijany kontener karty (overflow-y-auto pozwala mu skurczyć się do
// limitu wrappera); caller dokłada klasę ramki.
export const CARD_SHELL =
	"flex w-full flex-col items-center gap-3 scrollbar-none overflow-y-auto rounded-[2rem] border-4 bg-white p-5 shadow-2xl"
