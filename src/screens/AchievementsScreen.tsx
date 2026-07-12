import { useEffect, useState } from "react"
import {
	ACHIEVEMENTS,
	type AchievementCtx,
	type AchievementDef,
	REWARD_BY_DIFFICULTY,
} from "../achievements/catalog"
import {
	type AchievementProgress,
	achievementProgress,
} from "../achievements/evaluate"
import { TIER_META } from "../components/achievementTier"
import { HelpTip } from "../components/HelpTip"
import { ModalCloseX } from "../components/ModalCloseX"
import { useGame } from "../store/store"

interface AchievementRow {
	def: AchievementDef
	progress: AchievementProgress
	unlocked: boolean
	unlockedAt: number
}

export function AchievementsScreen() {
	const state = useGame((s) => s)
	const { achievements, iskierki, goTo, markAchievementsSeen, debugReset } =
		state
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [confirmReset, setConfirmReset] = useState(false)

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
	// kolejność: najpierw zdobyte→niezdobyte, potem wg trudności (łatwe→legendarne, przez
	// rosnącą nagrodę 5/10/15/25); remisy zachowują kolejność z katalogu (stabilny sort)
	rows.sort((a, b) => {
		if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
		return (
			REWARD_BY_DIFFICULTY[a.def.difficulty] -
			REWARD_BY_DIFFICULTY[b.def.difficulty]
		)
	})

	const unlockedCount = Object.keys(achievements).length
	const selected = selectedId
		? rows.find((r) => r.def.id === selectedId)
		: undefined

	return (
		<div className="flex min-h-[var(--app-vh)] flex-col gap-4 p-4">
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
											className={`h-full rounded-full transition-[width] ${unlocked ? `bg-gradient-to-r ${tier.bar}` : "bg-slate-600"}`}
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

			<button
				type="button"
				onClick={() => setConfirmReset(true)}
				className="mx-auto mb-2 touch-manipulation rounded-full border-2 border-red-300 bg-white/70 px-6 py-3 text-base font-extrabold text-red-500 shadow-sm transition-transform active:scale-95"
			>
				Zacznij od nowa
			</button>

			{selected && (
				<AchievementModal row={selected} onClose={() => setSelectedId(null)} />
			)}

			{confirmReset && (
				<ResetModal
					onConfirm={debugReset}
					onCancel={() => setConfirmReset(false)}
				/>
			)}
		</div>
	)
}

// Potwierdzenie skasowania całego postępu. Destrukcyjne i nieodwracalne — duże,
// rozdzielone cele dotykowe (anuluj domyślnie wyróżniony), żeby dziecko nie
// wyzerowało gry przypadkiem. Po potwierdzeniu `debugReset` wraca na ekran domku.
function ResetModal({
	onConfirm,
	onCancel,
}: {
	onConfirm: () => void
	onCancel: () => void
}) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm"
			onClick={onCancel}
		>
			<div
				className="anim-pop flex w-full max-w-sm flex-col gap-4 rounded-[2rem] border-4 border-red-300 bg-white p-6 text-center shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="text-6xl">⚠️</div>
				<div className="text-2xl font-extrabold leading-tight text-slate-700">
					Zacznij od nowa?
				</div>
				<p className="rounded-2xl bg-red-50 px-4 py-3 text-base font-bold leading-snug text-slate-600">
					Skasujesz cały postęp: potworki, jajka, iskierki i osiągnięcia. Tego
					nie da się cofnąć!
				</p>
				<button
					type="button"
					onClick={onConfirm}
					className="touch-manipulation rounded-2xl bg-red-500 px-6 py-4 text-xl font-extrabold text-white shadow active:scale-95"
				>
					Tak, kasuj wszystko
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="touch-manipulation text-lg font-extrabold text-slate-500 active:scale-95"
				>
					Nie, zostaw
				</button>
			</div>
		</div>
	)
}

// Karta szczegółu osiągnięcia (modal). Układ w strefach zamiast pionowego „dumpu":
// panel-bohater z ikoną + odznaką nagrody, nagłówek (tytuł + trudność), opis,
// sekcja postępu, stopka ze statusem. Zdobyte = kolory trudności; niezdobyte = szaro.
function AchievementModal({
	row,
	onClose,
}: {
	row: AchievementRow
	onClose: () => void
}) {
	const { def, progress, unlocked, unlockedAt } = row
	const tier = TIER_META[def.difficulty]
	const shown = Math.min(progress.current, progress.target)

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className={`anim-pop relative flex w-full max-w-sm flex-col gap-4 rounded-[2rem] border-4 bg-white p-5 shadow-2xl ${unlocked ? tier.border : "border-slate-300"}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* karta się nie przewija, więc ✕ może siedzieć na niej wprost */}
				<ModalCloseX onClose={onClose} />
				{/* ===== PANEL-BOHATER: ikona + odznaka nagrody w rogu ===== */}
				<div
					className={`relative flex items-center justify-center rounded-3xl bg-gradient-to-br py-9 ${unlocked ? tier.tint : "from-slate-100 to-slate-200"}`}
				>
					<span
						className={`text-7xl ${unlocked ? "" : "opacity-40 grayscale"}`}
					>
						{def.icon}
					</span>
					<div
						className={`absolute top-3 right-3 rounded-full px-3 py-1 text-sm font-extrabold shadow ${tier.badge}`}
					>
						✨ {REWARD_BY_DIFFICULTY[def.difficulty]}
					</div>
					{unlocked ? (
						<div className="absolute -bottom-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-500 text-lg font-extrabold text-white shadow-lg ring-4 ring-white">
							✓
						</div>
					) : (
						<div className="absolute top-3 left-3 text-2xl opacity-50">🔒</div>
					)}
				</div>

				{/* ===== NAGŁÓWEK: tytuł + trudność ===== */}
				<div className="flex flex-col items-center gap-0.5 pt-1">
					<div className="text-center text-3xl font-extrabold leading-tight text-slate-700">
						{def.title}
					</div>
					<div
						className={`text-sm font-extrabold uppercase tracking-wide ${tier.accent}`}
					>
						{tier.label}
					</div>
				</div>

				{/* ===== OPIS ===== */}
				<p className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-base font-bold leading-snug text-slate-600">
					{def.description}
				</p>

				{/* ===== POSTĘP ===== */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wide text-slate-400">
							Postęp
						</span>
						<span className="text-sm font-extrabold text-slate-500">
							{shown}/{progress.target}
						</span>
					</div>
					<div className="h-4 overflow-hidden rounded-full bg-slate-200">
						<div
							className={`h-full rounded-full transition-[width] ${unlocked ? `bg-gradient-to-r ${tier.bar}` : "bg-slate-300"}`}
							style={{ width: `${progress.ratio * 100}%` }}
						/>
					</div>
				</div>

				{/* ===== STOPKA: data zdobycia albo zachęta ===== */}
				{unlocked ? (
					<div className="flex items-center justify-center gap-2 text-sm font-extrabold text-emerald-500">
						Zdobyte
						<span className="-rotate-3 rounded-lg border-2 border-bubblegum/40 px-2 py-0.5 text-xs tracking-wide text-bubblegum">
							{new Date(unlockedAt).toLocaleDateString("pl-PL")}
						</span>
					</div>
				) : (
					<div className="text-center text-sm font-bold text-slate-400">
						Jeszcze przed tobą — dasz radę! 💪
					</div>
				)}
			</div>
		</div>
	)
}
