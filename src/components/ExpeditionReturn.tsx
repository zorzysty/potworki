import confetti from "canvas-confetti"
import { useEffect, useState } from "react"
import { EXPEDITIONS_BY_ID } from "../game/expeditions"
import type { RoundState } from "../game/round"
import { MONSTERS } from "../monsters/catalog"
import { MonsterStage } from "./MonsterStage"
import { RARITY_META } from "./rarity"
import { useScrollLock } from "./useScrollLock"

// Splash powrotu z wyprawy (wzór GateReveal): pełny ekran nad podsumowaniem
// rundy, zamykany tapem. Nagroda i znaleziony potworek są już zapisane przy
// finalizacji — ten komponent tylko pokazuje. Sekwencja: podróżnik → po chwili
// znalezisko (gdy jest) z konfetti.
export function ExpeditionReturn({
	back,
	onDone,
}: {
	back: NonNullable<RoundState["expeditionReturn"]>
	onDone: () => void
}) {
	const foundMonster =
		back.foundMonsterId === null ? undefined : MONSTERS[back.foundMonsterId]
	const [revealed, setRevealed] = useState(!foundMonster)
	useScrollLock()

	useEffect(() => {
		confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } })
		if (!foundMonster) return
		const t = setTimeout(() => {
			setRevealed(true)
			confetti({ particleCount: 160, spread: 120, origin: { y: 0.4 } })
		}, 1100)
		return () => clearTimeout(t)
	}, [foundMonster])

	return (
		// tap zamyka dopiero po odsłonięciu znaleziska — wczesny tap (odruch po
		// splashu bramy) nie może zgasić jedynej zapowiedzi nowego potworka
		<button
			type="button"
			onClick={revealed ? onDone : undefined}
			className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-slate-900/70 p-6 backdrop-blur-sm"
		>
			<div className="anim-pop text-3xl font-extrabold text-white/90">
				Powrót z wyprawy! 🎒
			</div>

			<div className="flex items-end justify-center gap-4">
				<div className="anim-float">
					<MonsterStage id={back.monsterId} size={130} />
				</div>
				{foundMonster && revealed && (
					<div className="anim-pop-in">
						<MonsterStage id={foundMonster.id} size={110} />
					</div>
				)}
			</div>

			<div className="anim-pop-in flex w-full max-w-sm flex-col items-center gap-2 rounded-[2.5rem] bg-white/95 p-5 shadow-2xl">
				<div className="text-lg font-extrabold text-slate-500">
					{EXPEDITIONS_BY_ID.get(back.typeId)?.name}
				</div>
				<div className="text-2xl font-extrabold text-amber-500">
					+{back.rewardIskierki} ✨
				</div>
				{foundMonster &&
					(revealed ? (
						<div className="anim-pop flex flex-col items-center gap-1 pt-1">
							<div className="text-xl font-extrabold text-grape-dark">
								Nowy potworek: {foundMonster.name}!
							</div>
							<span
								className={`rounded-full px-3 py-1 text-sm font-extrabold ${RARITY_META[foundMonster.rarity].badge}`}
							>
								{RARITY_META[foundMonster.rarity].label}
							</span>
						</div>
					) : (
						<div className="text-xl font-extrabold text-grape-dark">
							Ktoś przyszedł razem z wyprawą…
						</div>
					))}
			</div>

			{revealed && (
				<div className="anim-bounce-slow text-xl font-extrabold text-white/80">
					Dotknij, aby kontynuować
				</div>
			)}
		</button>
	)
}
