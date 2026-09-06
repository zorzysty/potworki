import { useEffect } from "react"
import { newestOwned } from "../game/collection"
import { MEMORY_COLS } from "../game/facts"
import type { RoundState } from "../game/round"
import { FIRST_MONSTER_ID } from "../monsters/catalog"
import { useGame } from "../store/store"
import { MonsterStage } from "./MonsterStage"

// jak długo dopasowana para zostaje odkryta, zanim zniknie (ostatnia para:
// RoundScreen czeka tyle samo przed podsumowaniem)
export const MATCHED_MS = 2000

// Tryb memory: plansza kart; rewersy razem tworzą obrazek przyjaciela (bez
// przyjaciela — najnowszego potworka), pocięty na kafelki. Tap = odkrycie
// (store: flipCard); dopasowana para zostaje odkryta 2 s (albo do następnego
// stuknięcia) i znika na stałe — pusty slot, obrazek ubywa; pomyłka zostaje
// odkryta aż do następnego stuknięcia i wtedy się obraca.
export function MemoryBoard({ round }: { round: RoundState }) {
	const flipCard = useGame((s) => s.flipCard)
	const hideCards = useGame((s) => s.hideCards)
	const companionId = useGame((s) => s.companionId)
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const pictureId =
		companionId ?? newestOwned(ownedMonsters) ?? FIRST_MONSTER_ID
	const { board, open, matched, lastMatched, lastStars, phase, paused } = round
	const mismatch = open.length === 2

	// pauza wstrzymuje timer — para nie znika pod nakładką „Przerwa"
	useEffect(() => {
		if (!lastMatched || paused) return
		const t = setTimeout(hideCards, MATCHED_MS)
		return () => clearTimeout(t)
	}, [lastMatched, paused, hideCards])

	return (
		<div className="relative w-full">
			{/* wiersz podpowiedzi: przez 2 s po parze zamienia się w „+N ⭐" (ten sam
			    slot — dymek nie nachodzi ani na tekst, ani na karty) */}
			<div className="mb-2 flex h-9 items-center justify-center text-center text-lg font-extrabold text-grape-dark">
				{lastMatched ? (
					<span
						key={matched.length}
						className="anim-pop rounded-full bg-emerald-500 px-4 py-1 text-2xl text-white shadow-lg"
					>
						{lastStars > 0 ? `+${lastStars} ⭐` : "Para! 💪"}
					</span>
				) : (
					"Znajdź działanie i jego wynik!"
				)}
			</div>
			{/* szerokość: cała kolumna, ale w poziomie nie wyżej niż ekran — 5 rzędów
			    kart + nagłówek muszą się zmieścić bez przewijania */}
			<div
				className="memory-board mx-auto grid gap-[var(--g)]"
				style={{
					gridTemplateColumns: `repeat(${MEMORY_COLS}, minmax(0, 1fr))`,
					width: "min(100%, calc((var(--app-vh) - 12rem) * 4 / 5))",
				}}
			>
				{board.map((card, i) => {
					const isMatched = matched.includes(i)
					const isOpen = open.includes(i) || lastMatched?.includes(i) === true
					const gone = isMatched && !isOpen
					const col = i % MEMORY_COLS
					const row = Math.floor(i / MEMORY_COLS)
					return (
						<button
							key={`${i}-${card.expr ?? card.value}`}
							type="button"
							onClick={() => flipCard(i)}
							disabled={isMatched || phase !== "answering"}
							tabIndex={gone ? -1 : undefined}
							className={`memory-slot relative aspect-square touch-manipulation ${
								isOpen && mismatch ? "anim-shake" : ""
							}`}
							data-gone={gone}
							aria-label={
								isOpen || isMatched
									? (card.expr ?? String(card.value))
									: "karta"
							}
						>
							<div
								className="memory-card h-full w-full"
								data-up={isOpen || isMatched}
							>
								{/* rewers: kafelek obrazka — potworek rozciągnięty na 4 kolumny
								    i wyśrodkowany w 5 rzędach, przesunięty o pozycję karty */}
								<div className="memory-face overflow-hidden rounded-xl bg-gradient-to-br from-violet-200 to-fuchsia-200 shadow-md ring-2 ring-white/70">
									<MonsterStage
										id={pictureId}
										size="100%"
										animate={false}
										wrapClassName="absolute"
										style={{
											width: "calc(400% + 3 * var(--g))",
											height: "calc(400% + 3 * var(--g))",
											left: `calc(${-col} * (100% + var(--g)))`,
											top: `calc(${0.5 - row} * (100% + var(--g)))`,
										}}
									/>
								</div>
								{/* awers: działanie albo liczba */}
								<div
									className={`memory-face memory-front flex items-center justify-center whitespace-nowrap rounded-xl border-4 px-1 font-extrabold text-slate-700 shadow-md ${
										card.expr === null
											? "border-sunny bg-amber-50 text-3xl sm:text-4xl"
											: card.expr.length > 6
												? "border-violet-200 bg-white text-base sm:text-2xl"
												: "border-violet-200 bg-white text-xl sm:text-2xl"
									}`}
								>
									{card.expr ?? card.value}
								</div>
							</div>
						</button>
					)
				})}
			</div>
		</div>
	)
}
