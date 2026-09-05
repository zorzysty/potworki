import { useEffect, useState } from "react"
import { byRecency } from "../game/collection"
import { divisorPairs, expectedAnswer, FACTS_BY_KEY } from "../game/facts"
import { feedAnswer } from "../game/round"
import { FIRST_MONSTER_ID } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame } from "../store/store"
import { MonsterStage } from "./MonsterStage"

// jak długo stuknięta para (pośrednia albo błędna) zostaje w okienkach
const PAIR_FLASH_MS = 700

export function QuestionCard() {
	const round = useGame((s) => s.round)
	const unlockedStage = useGame((s) => s.unlockedStage)
	if (!round) return null
	if (round.mode === "pairs")
		return <PairsCard round={round} unlockedStage={unlockedStage} />
	if (round.mode === "feed") return <FeedCard round={round} />
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

// Tryb par: cel (iloczyn) = [pierwszy żeton] × [_]; znalezione pary lądują
// pod równaniem jako zielone pigułki. Pomyłka tylko trzęsie kartą — pytanie
// gra się dalej (fazy „wrong" tu nie ma).
function PairsCard({
	round,
	unlockedStage,
}: {
	round: NonNullable<ReturnType<typeof useGame.getState>["round"]>
	unlockedStage: number
}) {
	const { question, phase, picked, found, lastStars, shakeNonce, lastPair } =
		round
	const targets = divisorPairs(question.a, unlockedStage).length
	const left = targets - found.length
	// para pokazana w okienkach: w fazie „correct" do przejścia dalej, po parze
	// pośredniej/pomyłce przez chwilę; nowy stuknięty żeton przerywa pokaz
	const [flash, setFlash] = useState<[number, number] | null>(null)
	useEffect(() => {
		if (!lastPair) return
		setFlash(lastPair)
		const t = setTimeout(() => setFlash(null), PAIR_FLASH_MS)
		return () => clearTimeout(t)
	}, [lastPair])
	const shown =
		picked !== null
			? [picked, null]
			: phase === "correct"
				? (lastPair ?? [null, null])
				: (flash ?? [null, null])
	// rozmiary skalowane, by „100 = [_] × [_]" mieściło się w jednej linii na telefonie
	const box =
		"inline-flex h-16 min-w-16 items-center justify-center rounded-2xl border-4 border-dashed px-2 sm:h-20 sm:min-w-24 sm:px-3 " +
		(phase === "correct"
			? "border-emerald-300 bg-emerald-50 text-emerald-600"
			: "border-violet-200 bg-violet-50 text-grape-dark")
	return (
		<div
			key={`q-${round.index}-${shakeNonce}`}
			className={`relative flex w-full flex-col items-center gap-4 rounded-3xl bg-white/90 p-6 shadow-xl
				${shakeNonce > 0 ? "anim-shake" : ""}
				${phase === "correct" ? "ring-4 ring-emerald-300" : ""}`}
		>
			<div className="flex flex-nowrap items-center justify-center gap-x-2 text-4xl font-extrabold tracking-wide text-slate-700 sm:gap-x-3 sm:text-5xl">
				<span>{question.a}</span>
				<span>=</span>
				<span className={box}>
					{shown[0] ?? <span className="text-violet-200">_</span>}
				</span>
				<span>×</span>
				<span className={box}>
					{shown[1] ?? <span className="text-violet-200">_</span>}
				</span>
			</div>
			{/* „duchy" par: jeden slot na każdą parę do znalezienia (maks 2) —
			    znaleziona zamienia się w zieloną pigułkę; rząd o stałej wysokości,
			    więc karta nie zmienia rozmiaru między pytaniami ani fazami */}
			<div className="flex h-10 items-center justify-center gap-2">
				{found.map((key) => {
					const f = FACTS_BY_KEY.get(key)
					return (
						<span
							key={key}
							className="anim-pop rounded-full bg-emerald-100 px-4 py-1 text-2xl font-extrabold text-emerald-600"
						>
							{f?.a} × {f?.b} ✓
						</span>
					)
				})}
				{Array.from({ length: left }, (_, i) => (
					<span
						key={`ghost-${i}`}
						className="rounded-full border-2 border-dashed border-violet-200 px-4 py-1 text-2xl font-extrabold text-violet-200"
					>
						_ × _
					</span>
				))}
			</div>
			{phase === "correct" && (
				<div className="anim-pop pointer-events-none absolute -top-6 right-6 rounded-full bg-emerald-500 px-4 py-1 text-2xl font-extrabold text-white shadow-lg">
					{lastStars > 0 ? `+${lastStars} ⭐` : "Dobrze! 💪"}
				</div>
			)}
		</div>
	)
}

// Tryb porównywania: dwa potworki (inna para z kolekcji co pytanie — rotacja
// po `round.index`, brakujące jako sylwetki) trzymają po działaniu — tap w tego z większą liczbą = ciastko.
// Faza „wrong": karta odsłania oba wyniki i podświetla większy; tap w niego to
// rytuał (store: feedSide). Faza „correct": nakarmiony dostaje ciastko.
function FeedCard({
	round,
}: {
	round: NonNullable<ReturnType<typeof useGame.getState>["round"]>
}) {
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const feedSide = useGame((s) => s.feedSide)
	const { question, phase, lastStars, shakeNonce } = round
	const own = { a: question.a, b: question.b }
	const rival = question.rival ?? own
	const sides = question.swap ? [rival, own] : [own, rival]
	const bigger = feedAnswer(question)
	const revealed = phase === "wrong" || phase === "correct"
	const owned = byRecency(ownedMonsters)
	const first = (2 * round.index) % Math.max(1, owned.length)
	const feeders: (number | null)[] = [
		owned[first] ?? null,
		owned.length > 1 ? (owned[(first + 1) % owned.length] ?? null) : null,
	]

	return (
		<div
			key={`q-${round.index}-${shakeNonce}`}
			className={`relative flex w-full flex-col items-center gap-3 rounded-3xl bg-white/90 p-4 shadow-xl sm:p-6
				${phase === "wrong" && shakeNonce > 0 ? "anim-shake" : ""}
				${phase === "correct" ? "ring-4 ring-emerald-300" : ""}`}
		>
			<div className="text-center text-lg font-extrabold leading-tight text-slate-500">
				Kto przyniósł większą liczbę?
				<br /> Daj mu ciastko!
			</div>
			<div className="flex w-full gap-3">
				{sides.map((side, i) => {
					const isBigger = i === bigger
					const id = feeders[i] ?? null
					const fallbackId = i === 0 ? FIRST_MONSTER_ID : FIRST_MONSTER_ID + 1
					return (
						<button
							key={`${i}-${side.a}x${side.b}`}
							type="button"
							onClick={() => feedSide(i as 0 | 1)}
							disabled={phase === "correct"}
							className={`flex min-h-16 flex-1 touch-manipulation flex-col items-center gap-1 rounded-3xl border-4 px-2 py-3 transition-transform active:scale-95 ${
								revealed && isBigger
									? "border-emerald-300 bg-emerald-50"
									: "border-violet-100 bg-violet-50"
							}`}
						>
							{id !== null ? (
								<MonsterStage
									id={id}
									size={96}
									animate={false}
									overlay={
										phase === "correct" && isBigger ? (
											<span className="anim-pop absolute -top-2 right-0 text-4xl">
												🍪
											</span>
										) : null
									}
								/>
							) : (
								<MonsterSvg
									id={fallbackId}
									size={96}
									animate={false}
									className="monster-silhouette"
								/>
							)}
							<span className="text-4xl font-extrabold tracking-wide text-slate-700 sm:text-5xl">
								{side.a} × {side.b}
							</span>
							{/* stałe miejsce na wynik — bez skoku karty przy odsłonie */}
							<span
								className={`h-8 text-2xl font-extrabold ${
									revealed && isBigger ? "text-emerald-600" : "text-slate-400"
								}`}
							>
								{revealed ? `= ${side.a * side.b}` : ""}
							</span>
						</button>
					)
				})}
			</div>
			{phase === "correct" && (
				<div className="anim-pop pointer-events-none absolute -top-6 right-6 rounded-full bg-emerald-500 px-4 py-1 text-2xl font-extrabold text-white shadow-lg">
					{lastStars > 0 ? `+${lastStars} ⭐` : "Dobrze! 💪"}
				</div>
			)}
		</div>
	)
}
