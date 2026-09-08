import { useGame } from "../store/store"

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function Keypad() {
	const pressDigit = useGame((s) => s.pressDigit)
	const pressBackspace = useGame((s) => s.pressBackspace)
	const pressConfirm = useGame((s) => s.pressConfirm)
	const hasAnswer = useGame((s) => (s.round?.answer.length ?? 0) > 0)

	const keyClass = "play-key"

	return (
		<div className="play-keypad">
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
				className="play-key play-key-confirm"
				data-ready={hasAnswer}
				onClick={pressConfirm}
				aria-label="Zatwierdź"
			>
				✓
			</button>
		</div>
	)
}
