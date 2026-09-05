import { type CSSProperties, useEffect, useRef, useState } from "react"
import { REWARD_BY_DIFFICULTY } from "../achievements/catalog"
import { type AchievementRow, achievementRows } from "../achievements/evaluate"
import { TIER_META } from "../components/achievementTier"
import { CardModal } from "../components/CardModal"
import { HelpTip } from "../components/HelpTip"
import { useScrollLock } from "../components/useScrollLock"
import { useGame } from "../store/store"

// Lot iskierek po odbiorze (zgrane z .anim-claim-fly w styles.css): rozprysk ze środka ekranu,
// potem lot do licznika w nagłówku. Licznik podskakuje z nową wartością, gdy dolecą.
const FLY_MS = 1600
const FLY_STAGGER_MS = 100
const FLY_COUNT = 8
const FLY_TOTAL_MS = FLY_MS + FLY_STAGGER_MS * (FLY_COUNT - 1)

interface Flight {
	id: string
	x: number // środek kafla (viewport)
	y: number
	dx: number // wektor do licznika iskierek
	dy: number
	from: number // stan licznika przed odbiorem (pokazywany do przylotu iskierek)
	landed: boolean
}

export function AchievementsScreen() {
	const state = useGame((s) => s)
	const { achievements, iskierki, goTo, claimAchievement, debugReset } = state
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [confirmReset, setConfirmReset] = useState(false)
	const counterRef = useRef<HTMLDivElement>(null)
	const [flight, setFlight] = useState<Flight | null>(null)
	// dwa etapy: przylot (licznik podskakuje) → sprzątnięcie warstwy lotu
	useEffect(() => {
		if (!flight) return
		const t = flight.landed
			? setTimeout(() => setFlight(null), FLY_TOTAL_MS - FLY_MS)
			: setTimeout(
					() => setFlight((f) => (f ? { ...f, landed: true } : f)),
					FLY_MS,
				)
		return () => clearTimeout(t)
	}, [flight])
	const shownIskierki = flight && !flight.landed ? flight.from : iskierki
	// odbiór z modala: modal znika, iskierki startują ze środka ekranu i lecą do licznika
	const claim = (id: string) => {
		const x = window.innerWidth / 2
		const y = window.innerHeight / 2
		const c = counterRef.current?.getBoundingClientRect()
		setFlight({
			id,
			x,
			y,
			dx: c ? c.left + c.width / 2 - x : 0,
			dy: c ? c.top + c.height / 2 - y : 0,
			from: iskierki,
			landed: false,
		})
		claimAchievement(id)
		setSelectedId(null)
	}

	const rows = achievementRows(state)

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
					Osiągnięcia {unlockedCount}/{rows.length}
				</div>
				<div className="flex items-center gap-1.5">
					<HelpTip
						placement="bottom"
						align="right"
						text="To twoje osiągnięcia 🏅. Zdobywasz je za różne sukcesy w grze — a za każde dostajesz iskierki ✨! Pasek pokazuje, jak blisko jesteś."
					/>
					<div
						ref={counterRef}
						key={shownIskierki}
						className={`rounded-full bg-white/80 px-4 py-2 text-lg font-extrabold text-amber-500 shadow ${flight?.landed ? "anim-pop" : ""}`}
					>
						✨ {shownIskierki}
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-2.5 pb-6">
				{rows.map(({ def, progress, unlocked, claimable }) => {
					const tier = TIER_META[def.difficulty]
					const shown = Math.min(progress.current, progress.target)
					return (
						<button
							key={def.id}
							type="button"
							onClick={() => setSelectedId(def.id)}
							className={`touch-manipulation flex items-center gap-3 rounded-2xl border-4 p-3 text-left shadow-sm transition-transform active:scale-95 ${claimable ? "anim-claim-ready border-amber-400 bg-amber-50" : unlocked ? `bg-white/80 ${tier.border}` : "border-slate-300 bg-white/80 opacity-70"}`}
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
										className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-extrabold ${claimable ? "anim-bounce-slow bg-amber-400 text-white shadow" : tier.badge}`}
									>
										{claimable ? "Odbierz " : ""}✨{" "}
										{REWARD_BY_DIFFICULTY[def.difficulty]}
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

			{/* warstwa lotu iskierek: fixed POZA kaflami (transform kafla w :active
			    uczyniłby go containing blockiem dla fixed) */}
			{flight && (
				<div
					className="pointer-events-none fixed z-[70]"
					style={{ left: flight.x, top: flight.y }}
				>
					{Array.from({ length: FLY_COUNT }, (_, i) => {
						const a = (i / FLY_COUNT) * 2 * Math.PI
						return (
							<span
								key={i}
								className="anim-claim-fly absolute text-2xl"
								style={
									{
										"--sx": `${Math.cos(a) * 44}px`,
										"--sy": `${Math.sin(a) * 44}px`,
										"--fx": `${flight.dx}px`,
										"--fy": `${flight.dy}px`,
										animationDelay: `${i * FLY_STAGGER_MS}ms`,
									} as CSSProperties
								}
							>
								✨
							</span>
						)
					})}
				</div>
			)}

			{selected && (
				<AchievementModal
					row={selected}
					onClose={() => setSelectedId(null)}
					onClaim={() => claim(selected.def.id)}
				/>
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
	useScrollLock()
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
	onClaim,
}: {
	row: AchievementRow
	onClose: () => void
	onClaim: () => void
}) {
	const { def, progress, unlocked, unlockedAt, claimable } = row
	const tier = TIER_META[def.difficulty]
	const shown = Math.min(progress.current, progress.target)

	return (
		<CardModal onClose={onClose} closeLabel="Zamknij">
			<div
				className={`flex w-full flex-col gap-4 rounded-[2rem] border-4 bg-white p-5 shadow-2xl ${unlocked ? tier.border : "border-slate-300"}`}
			>
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

				{claimable && (
					<button
						type="button"
						onClick={onClaim}
						className="anim-bounce-slow touch-manipulation rounded-2xl bg-amber-400 px-6 py-4 text-xl font-extrabold text-white shadow-lg active:scale-95"
					>
						Odbierz {REWARD_BY_DIFFICULTY[def.difficulty]} iskierek ✨
					</button>
				)}

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
		</CardModal>
	)
}
