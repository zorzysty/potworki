import { expectedAnswer } from "../game/facts"
import { useGame } from "../store/store"

export function QuestionCard() {
	const round = useGame((s) => s.round)
	if (!round) return null
	const { question, phase, answer, lastStars, shakeNonce, mode } = round
	const op = mode === "div" ? "÷" : "×"
	// dla luki: brakujący czynnik (podświetlany w rytuale przepisania)
	const result = expectedAnswer(question, mode)
	// styl pojedynczego pola odpowiedzi (w luce siedzi INLINE w równaniu)
	const boxTone =
		phase === "correct"
			? "border-emerald-300 bg-emerald-50 text-emerald-600"
			: "border-violet-200 bg-violet-50 text-grape-dark"

	return (
		<div
			key={`q-${round.index}-${shakeNonce}`}
			className={`relative flex w-full flex-col items-center gap-4 rounded-3xl bg-white/90 p-6 shadow-xl
				${phase === "wrong" && shakeNonce > 0 ? "anim-shake" : ""}
				${phase === "correct" ? "ring-4 ring-emerald-300" : ""}`}
		>
			{phase === "wrong" ? (
				<>
					<div className="text-4xl font-extrabold text-slate-700">
						{mode === "gap" ? (
							// rozwiązane równanie z podświetlonym brakującym czynnikiem
							<>
								{question.a} ×{" "}
								<span className="rounded-xl bg-amber-100 px-3 text-amber-600">
									{result}
								</span>{" "}
								= {question.b}
							</>
						) : (
							<>
								{question.a} {op} {question.b} ={" "}
								<span className="rounded-xl bg-amber-100 px-3 text-amber-600">
									{result}
								</span>
							</>
						)}
					</div>
					<div className="text-lg font-bold text-slate-400">
						Przepisz wynik:
					</div>
				</>
			) : mode === "gap" ? (
				// luka w samym równaniu — okienko JEST polem odpowiedzi (wpisywane
				// cyfry pojawiają się w nim na żywo; osobnego pola poniżej nie ma)
				<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-5xl font-extrabold tracking-wide text-slate-700">
					<span>{question.a}</span>
					<span>×</span>
					<span
						className={`inline-flex h-20 min-w-24 items-center justify-center rounded-2xl border-4 border-dashed px-3 ${boxTone}`}
					>
						{answer || <span className="text-violet-200">_</span>}
					</span>
					<span>=</span>
					<span>{question.b}</span>
				</div>
			) : (
				<div className="text-5xl font-extrabold tracking-wide text-slate-700">
					{question.a} {op} {question.b} = ?
				</div>
			)}

			{/* pole odpowiedzi pod równaniem — w luce (poza rytuałem przepisania)
			    ukryte: jedynym polem jest okienko w równaniu (nigdy dwa naraz) */}
			{(mode !== "gap" || phase === "wrong") && (
				<div
					className={`flex h-20 w-44 items-center justify-center rounded-2xl border-4 border-dashed text-5xl font-extrabold ${boxTone}`}
				>
					{answer || <span className="text-violet-200">_</span>}
				</div>
			)}

			{phase === "correct" && (
				<div className="anim-pop pointer-events-none absolute -top-6 right-6 rounded-full bg-emerald-500 px-4 py-1 text-2xl font-extrabold text-white shadow-lg">
					{lastStars > 0 ? `+${lastStars} ⭐` : "Dobrze! 💪"}
				</div>
			)}
		</div>
	)
}
