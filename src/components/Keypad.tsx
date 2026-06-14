import { useGame } from "../store/store"

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function Keypad() {
	const pressDigit = useGame((s) => s.pressDigit)
	const pressBackspace = useGame((s) => s.pressBackspace)
	const pressConfirm = useGame((s) => s.pressConfirm)
	const hasAnswer = useGame((s) => (s.round?.answer.length ?? 0) > 0)

	const keyClass =
		"touch-manipulation select-none rounded-2xl bg-white text-3xl font-extrabold text-slate-700 " +
		"shadow-md border-b-4 border-violet-100 min-h-16 transition-transform active:scale-90 active:border-b-2"

	return (
		<div className="grid w-full grid-cols-3 gap-2">
			{KEYS.map((digit) => (
				<button
					key={digit}
					type="button"
					className={keyClass}
					onClick={() => pressDigit(digit)}
				>
					{digit}
				</button>
			))}
			<button
				type="button"
				className={`${keyClass} text-2xl`}
				onClick={pressBackspace}
				aria-label="Usuń cyfrę"
			>
				⌫
			</button>
			<button type="button" className={keyClass} onClick={() => pressDigit(0)}>
				0
			</button>
			<button
				type="button"
				className={`touch-manipulation select-none rounded-2xl text-3xl font-extrabold text-white
					shadow-md border-b-4 min-h-16 transition-transform active:scale-90 active:border-b-2
					${hasAnswer ? "bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-700" : "bg-emerald-200 border-emerald-300"}`}
				onClick={pressConfirm}
				aria-label="Zatwierdź"
			>
				✓
			</button>
		</div>
	)
}
