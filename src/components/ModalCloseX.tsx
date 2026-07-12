// Przypięte „✕" karty-modala (lewy górny róg) — JEDYNY przycisk zamykania
// kart (dawne „Zamknij" na dole długiej karty bywało poza viewportem);
// tap w tło nadal zamyka. Umieszczać na NIEPRZEWIJANYM elemencie
// (relative wrapper karty), nigdy wewnątrz kontenera z overflow —
// inaczej ✕ odpływa ze scrollem albo obcina go clip osi.
export function ModalCloseX({
	onClose,
	label = "Zamknij",
}: {
	onClose: () => void
	label?: string
}) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClose}
			className="absolute -left-2 -top-2 z-10 flex h-12 w-12 touch-manipulation items-center justify-center rounded-full bg-white text-xl font-extrabold text-grape-dark shadow-lg ring-2 ring-violet-200 active:scale-90"
		>
			✕
		</button>
	)
}
