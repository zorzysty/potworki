import { useEffect, useState } from "react"
import {
	ACHIEVEMENTS,
	type AchievementCtx,
	REWARD_BY_DIFFICULTY,
} from "../achievements/catalog"
import { achievementProgress } from "../achievements/evaluate"
import { TIER_META } from "../components/achievementTier"
import { HelpTip } from "../components/HelpTip"
import { useGame } from "../store/store"

export function AchievementsScreen() {
	const state = useGame((s) => s)
	const { achievements, iskierki, goTo, markAchievementsSeen } = state
	const [selectedId, setSelectedId] = useState<string | null>(null)

	// wejście na ekran = osiągnięcia „zobaczone" → znika badge na Home (idempotentne)
	useEffect(() => {
		markAchievementsSeen()
	}, [markAchievementsSeen])

	const ctx: AchievementCtx = { save: state, counters: state.achievementStats }

	const rows = ACHIEVEMENTS.map((def) => {
		const progress = achievementProgress(def, ctx)
		const entry = achievements[def.id]
		return {
			def,
			progress,
			unlocked: entry !== undefined,
			unlockedAt: entry?.unlockedAt ?? 0,
		}
	})
	// kolejność: zdobyte (najnowsze najpierw) → w toku (bliżej końca wyżej) → nierozpoczęte
	rows.sort((a, b) => {
		if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
		if (a.unlocked && b.unlocked) return b.unlockedAt - a.unlockedAt
		return b.progress.ratio - a.progress.ratio
	})

	const unlockedCount = Object.keys(achievements).length
	const selected = selectedId
		? rows.find((r) => r.def.id === selectedId)
		: undefined

	return (
		<div className="flex min-h-dvh flex-col gap-4 p-4">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => goTo("home")}
					className="touch-manipulation rounded-full bg-white/80 px-5 py-2 text-2xl font-extrabold text-grape-dark shadow active:scale-90"
					aria-label="Wróć do domku"
				>
					←
				</button>
				<div className="text-2xl font-extrabold text-grape-dark">
					Osiągnięcia {unlockedCount}/{ACHIEVEMENTS.length}
				</div>
				<div className="flex items-center gap-1.5">
					<HelpTip
						placement="bottom"
						align="right"
						text="To twoje osiągnięcia 🏅. Zdobywasz je za różne sukcesy w grze — a za każde dostajesz iskierki ✨! Pasek pokazuje, jak blisko jesteś."
					/>
					<div className="rounded-full bg-white/80 px-4 py-2 text-lg font-extrabold text-amber-500 shadow">
						✨ {iskierki}
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-2.5 pb-6">
				{rows.map(({ def, progress, unlocked }) => {
					const tier = TIER_META[def.difficulty]
					const shown = Math.min(progress.current, progress.target)
					return (
						<button
							key={def.id}
							type="button"
							onClick={() => setSelectedId(def.id)}
							className={`touch-manipulation flex items-center gap-3 rounded-2xl border-4 bg-white/80 p-3 text-left shadow-sm transition-transform active:scale-95 ${unlocked ? tier.border : "border-slate-300"} ${unlocked ? "" : "opacity-70"}`}
						>
							<div
								className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl ${unlocked ? "" : "grayscale"}`}
							>
								{def.icon}
								{unlocked && (
									<div className="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-sm font-extrabold text-white shadow">
										✓
									</div>
								)}
							</div>
							<div className="flex min-w-0 flex-1 flex-col gap-1">
								<div className="flex items-center justify-between gap-2">
									<div className="truncate text-lg font-extrabold text-slate-700">
										{def.title}
									</div>
									<div
										className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-extrabold ${tier.badge}`}
									>
										✨ {REWARD_BY_DIFFICULTY[def.difficulty]}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
										<div
											className={`h-full rounded-full transition-[width] ${unlocked ? `bg-gradient-to-r ${tier.bar}` : "bg-slate-300"}`}
											style={{ width: `${progress.ratio * 100}%` }}
										/>
									</div>
									<span className="shrink-0 text-sm font-bold text-slate-400">
										{shown}/{progress.target}
									</span>
								</div>
							</div>
						</button>
					)
				})}
			</div>

			{selected && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm"
					onClick={() => setSelectedId(null)}
				>
					<div
						className={`anim-pop flex w-full max-w-sm flex-col items-center gap-3 rounded-[2rem] border-4 bg-white p-6 shadow-2xl ${TIER_META[selected.def.difficulty].border}`}
						onClick={(e) => e.stopPropagation()}
					>
						<div
							className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-6xl ${selected.unlocked ? "" : "grayscale"}`}
						>
							{selected.def.icon}
						</div>
						<div className="text-center text-3xl font-extrabold text-slate-700">
							{selected.def.title}
						</div>
						<div
							className={`rounded-full px-4 py-1 text-lg font-extrabold ${TIER_META[selected.def.difficulty].badge}`}
						>
							{TIER_META[selected.def.difficulty].label} · ✨{" "}
							{REWARD_BY_DIFFICULTY[selected.def.difficulty]}
						</div>
						<p className="text-center text-base font-bold leading-snug text-slate-600">
							{selected.def.description}
						</p>

						<div className="flex w-full items-center gap-2">
							<div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200">
								<div
									className={`h-full rounded-full bg-gradient-to-r transition-[width] ${TIER_META[selected.def.difficulty].bar}`}
									style={{ width: `${selected.progress.ratio * 100}%` }}
								/>
							</div>
							<span className="shrink-0 text-base font-extrabold text-slate-500">
								{Math.min(selected.progress.current, selected.progress.target)}/
								{selected.progress.target}
							</span>
						</div>

						{selected.unlocked ? (
							<div className="flex flex-col items-center gap-1">
								<span className="text-sm font-extrabold text-emerald-500">
									✓ Zdobyte!
								</span>
								<span className="-rotate-3 rounded-lg border-2 border-bubblegum/40 px-2 py-0.5 text-xs font-extrabold tracking-wide text-bubblegum">
									{new Date(selected.unlockedAt).toLocaleDateString("pl-PL")}
								</span>
							</div>
						) : (
							<span className="text-sm font-bold text-slate-400">
								Jeszcze przed tobą — dasz radę! 💪
							</span>
						)}

						<button
							type="button"
							onClick={() => setSelectedId(null)}
							className="touch-manipulation pt-1 text-lg font-bold text-slate-400 active:scale-95"
						>
							Zamknij
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
