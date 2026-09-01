import { useEffect } from "react"
import {
	ACHIEVEMENTS,
	type AchievementDef,
	REWARD_BY_DIFFICULTY,
} from "../achievements/catalog"
import { useGame } from "../store/store"
import { TIER_META } from "./achievementTier"

const BY_ID = new Map<string, AchievementDef>(
	ACHIEVEMENTS.map((a) => [a.id, a]),
)
// jak długo jeden toast jest widoczny zanim ustąpi następnemu z kolejki
const TOAST_MS = 3200

// Powiadomienie „osiągnięcie zdobyte!" w stylu Xbox/Steam. Renderowane globalnie
// (App.tsx, nad ekranami). Kolejka w store (`achievementQueue`) jest zasilana przez
// checkAchievements; tu pokazujemy pierwszy element i po chwili sam ustępuje.
// Kontener ma pointer-events-none (nie psuje keypadu/gry) — dotyk łapie tylko sama
// karta: tap prowadzi na ekran osiągnięć (tam czekają iskierki do odbioru).
export function AchievementToast() {
	const queue = useGame((s) => s.achievementQueue)
	const shift = useGame((s) => s.shiftAchievementToast)
	const goTo = useGame((s) => s.goTo)
	const currentId = queue[0]

	useEffect(() => {
		if (!currentId) return
		const t = setTimeout(shift, TOAST_MS)
		return () => clearTimeout(t)
	}, [currentId, shift])

	if (!currentId) return null
	const def = BY_ID.get(currentId)
	if (!def) return null
	const tier = TIER_META[def.difficulty]

	return (
		<div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3">
			<button
				key={currentId}
				type="button"
				onClick={() => goTo("achievements")}
				className={`anim-toast-in pointer-events-auto flex max-w-sm touch-manipulation items-center gap-3 rounded-2xl border-4 bg-white/95 px-4 py-3 text-left shadow-2xl backdrop-blur transition-transform active:scale-95 ${tier.border}`}
			>
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-3xl">
					{def.icon}
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="text-xs font-extrabold uppercase tracking-wide text-amber-500">
						🏅 Osiągnięcie zdobyte!
					</div>
					<div className="truncate text-lg font-extrabold leading-tight text-slate-700">
						{def.title}
					</div>
				</div>
				<div
					className={`ml-1 shrink-0 rounded-full px-2.5 py-1 text-sm font-extrabold ${tier.badge}`}
				>
					✨ {REWARD_BY_DIFFICULTY[def.difficulty]}
				</div>
			</button>
		</div>
	)
}
