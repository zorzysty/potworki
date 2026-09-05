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
			{/* wrapper nie przewija się, więc ✕ jest zawsze widoczny */}
			<div
				className="anim-pop relative w-full max-w-sm"
				onClick={(e) => e.stopPropagation()}
			>
				<ModalCloseX onClose={onClose} label={closeLabel} />
				{children}
			</div>
		</div>
	)
}

// Przewijany kontener karty; caller dokłada klasę ramki.
export const CARD_SHELL =
	"flex max-h-[88vh] w-full flex-col items-center gap-3 scrollbar-none overflow-y-auto rounded-[2rem] border-4 bg-white p-5 shadow-2xl"
