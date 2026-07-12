import confetti from "canvas-confetti"
import { useEffect, useState } from "react"
import type { BuildingId } from "../../game/village"
import { BUILDINGS_BY_ID } from "../../game/village"
import { BuildingArt } from "./BuildingArt"

// Pełnoekranowa celebracja DUŻEJ budowy (każdy poziom Zamku i każde L3) —
// wzór GateReveal: dwie fazy (budowanie → odsłona), tap zamyka (onDone).
// Mniejsze zakupy dostają zwykły confetti-pop w scenie (hierarchia payoffów).
export function BuildReveal({
	id,
	level,
	onDone,
}: {
	id: BuildingId
	level: number
	onDone: () => void
}) {
	const [revealed, setRevealed] = useState(false)
	const def = BUILDINGS_BY_ID.get(id)

	useEffect(() => {
		const t = setTimeout(() => {
			setRevealed(true)
			confetti({ particleCount: 150, spread: 110, origin: { y: 0.45 } })
		}, 900)
		return () => clearTimeout(t)
	}, [])

	if (!def) return null
	const name = def.levelNames[level - 1] ?? def.name

	return (
		<button
			type="button"
			onClick={onDone}
			className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-slate-900/70 p-6 backdrop-blur-sm"
		>
			<div className="text-2xl font-extrabold text-white/90">
				{revealed ? "Zbudowane! 🎉" : "Budujemy… 🔨"}
			</div>

			<div className="relative flex h-56 w-72 items-center justify-center rounded-3xl bg-white/90 p-4 shadow-2xl">
				{revealed ? (
					<div className="anim-pop-in">
						<BuildingArt id={id} level={level} size={210} />
					</div>
				) : (
					<div className="anim-shake">
						<BuildingArt id={id} level={level} size={210} silhouette />
					</div>
				)}
			</div>

			{revealed && (
				<>
					<div className="anim-pop rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-2xl font-extrabold text-white shadow-lg">
						{name}!
					</div>
					<div className="anim-pop max-w-xs text-center text-lg font-bold text-white/90">
						{def.descriptions[level - 1]}
					</div>
					<div className="anim-bounce-slow text-lg font-extrabold text-white/80">
						👆 Tapnij, żeby wrócić do wioski
					</div>
				</>
			)}
		</button>
	)
}
