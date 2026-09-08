import {
	type CSSProperties,
	type MouseEvent,
	useEffect,
	useRef,
	useState,
} from "react"
import { REWARD_BY_DIFFICULTY } from "../achievements/catalog"
import { type AchievementRow, achievementRows } from "../achievements/evaluate"
import { TIER_META } from "../components/achievementTier"
import { CardModal } from "../components/CardModal"
import { HelpTip } from "../components/HelpTip"
import { HomeArt } from "../components/HomeArt"
import { useScrollLock } from "../components/useScrollLock"
import { useGame } from "../store/store"

// The CSS flight and arrival timers share these timings. Rewards are persisted
// immediately; only the displayed balance waits for the individual landings.
const FLY_MS = 850
const FLY_STAGGER_MS = 105
const SETTLE_MS = 650

interface Flight {
	id: string
	x: number
	y: number
	from: number
	reward: number
	count: number
}

export function AchievementsScreen() {
	const state = useGame((s) => s)
	const { iskierki, goTo, claimAchievement, debugReset } = state
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [filter, setFilter] = useState<
		"all" | "claimable" | "locked" | "unlocked"
	>("all")
	const [confirmReset, setConfirmReset] = useState(false)
	const counterRef = useRef<HTMLSpanElement>(null)
	const [flight, setFlight] = useState<Flight | null>(null)
	const [target, setTarget] = useState<{ x: number; y: number } | null>(null)
	const [arrived, setArrived] = useState(0)
	useEffect(() => {
		if (!flight) return
		const timers: ReturnType<typeof setTimeout>[] = []
		// Measure after the modal has restored the document's scroll position.
		const settle = () => setFlight(null)
		const frame = requestAnimationFrame(() => {
			const rect = counterRef.current?.getBoundingClientRect()
			if (!rect) {
				setFlight(null)
				return
			}
			window.addEventListener("resize", settle)
			window.addEventListener("scroll", settle, { passive: true })
			setTarget({
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
			})
			for (let i = 0; i < flight.count; i++) {
				timers.push(
					setTimeout(() => setArrived(i + 1), FLY_MS + i * FLY_STAGGER_MS),
				)
			}
			timers.push(
				setTimeout(
					() => setFlight(null),
					FLY_MS + (flight.count - 1) * FLY_STAGGER_MS + SETTLE_MS,
				),
			)
		})
		// A changed viewport must never leave particles flying to a stale target.
		return () => {
			cancelAnimationFrame(frame)
			for (const timer of timers) clearTimeout(timer)
			window.removeEventListener("resize", settle)
			window.removeEventListener("scroll", settle)
		}
	}, [flight])
	const collected = flight
		? Math.floor((flight.reward * arrived) / flight.count)
		: 0
	const shownIskierki = flight ? flight.from + collected : iskierki
	const claim = (id: string, event: MouseEvent<HTMLButtonElement>) => {
		const rect = event.currentTarget.getBoundingClientRect()
		const before = useGame.getState().iskierki
		claimAchievement(id)
		const after = useGame.getState().iskierki
		setSelectedId(null)
		if (after === before) return
		setArrived(0)
		setTarget(null)
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setFlight(null)
			return
		}
		// A quick second claim carries any still-travelling value into the new burst.
		const reward = after - shownIskierki
		setFlight({
			id,
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2,
			from: shownIskierki,
			reward,
			count: Math.min(reward, 10),
		})
	}

	const rows = achievementRows(state)

	const unlockedCount = rows.filter((row) => row.unlocked).length
	const readyCount = rows.filter((row) => row.claimable).length
	const readyReward = rows.reduce(
		(sum, row) =>
			sum + (row.claimable ? REWARD_BY_DIFFICULTY[row.def.difficulty] : 0),
		0,
	)
	const visibleRows = rows.filter(
		(row) =>
			filter === "all" ||
			(filter === "claimable"
				? row.claimable
				: filter === "unlocked"
					? row.unlocked
					: !row.unlocked),
	)
	const filters = [
		{ id: "all", label: "Wszystkie", count: rows.length },
		{ id: "claimable", label: "Do odebrania", count: readyCount },
		{ id: "locked", label: "W trakcie", count: rows.length - unlockedCount },
		{ id: "unlocked", label: "Zdobyte", count: unlockedCount },
	] as const
	const selected = selectedId
		? rows.find((r) => r.def.id === selectedId)
		: undefined

	return (
		<main className="achievements-screen">
			<header className="achievements-header">
				<button
					type="button"
					onClick={() => goTo("home")}
					className="map-back touch-manipulation text-2xl font-extrabold text-grape-dark active:scale-90"
					aria-label="Wróć do domku"
				>
					←
				</button>
				<h1>Osiągnięcia</h1>
				<div className="achievements-wallet" data-collecting={!!flight}>
					<span
						className="achievements-wallet-icon"
						ref={counterRef}
						aria-hidden="true"
					>
						<span
							key={`${flight?.id}-${arrived}`}
							className={arrived > 0 && flight ? "anim-spark-catch" : ""}
						>
							✨
						</span>
						{flight && arrived > 0 && (
							<span
								key={`ring-${flight.id}-${arrived}`}
								className="anim-spark-ring"
							/>
						)}
					</span>
					<span
						className="achievements-wallet-value"
						aria-hidden="true"
						style={{ minWidth: `${String(iskierki).length}ch` }}
					>
						<span
							key={shownIskierki}
							className={flight && arrived > 0 ? "anim-spark-count" : ""}
						>
							{shownIskierki}
						</span>
					</span>
					{flight && arrived > 0 && (
						<span className="achievements-wallet-gain" aria-hidden="true">
							+{collected}
						</span>
					)}
					<span className="sr-only" role="status">
						{iskierki} iskierek
					</span>
				</div>
			</header>

			<section className="achievements-hero" aria-label="Postęp osiągnięć">
				<div className="achievements-trophy" aria-hidden="true">
					<HomeArt kind="achievements" />
				</div>
				<div className="achievements-summary">
					<div className="achievements-summary-heading">
						<h2>
							Zdobyte{" "}
							<strong>
								{unlockedCount}
								<span>/{rows.length}</span>
							</strong>
						</h2>
						<HelpTip
							placement="bottom"
							align="right"
							text="To twoje osiągnięcia 🏅. Zdobywasz je za różne sukcesy w grze — a za każde dostajesz iskierki ✨! Pasek pokazuje, jak blisko jesteś."
						/>
					</div>
					<progress
						className="achievements-total-progress"
						aria-label="Zdobyte osiągnięcia"
						value={unlockedCount}
						max={rows.length}
					/>
					<p>
						{readyCount > 0 ? (
							<>
								Do odebrania <strong>✨ {readyReward}</strong>
							</>
						) : unlockedCount === rows.length ? (
							"Cała kolekcja zdobyta! 🏅"
						) : (
							"Jeszcze przed tobą — dasz radę! 💪"
						)}
					</p>
				</div>
			</section>

			<div
				className="achievements-filters"
				role="group"
				aria-label="Filtruj osiągnięcia"
			>
				{filters.map(({ id, label, count }) => (
					<button
						type="button"
						key={id}
						className="achievements-filter"
						aria-pressed={filter === id}
						onClick={() => setFilter(id)}
					>
						{label}
						<span>{count}</span>
					</button>
				))}
			</div>

			<div className="achievements-grid">
				{visibleRows.map((row) => (
					<AchievementCard
						key={row.def.id}
						row={row}
						onSelect={() => setSelectedId(row.def.id)}
					/>
				))}
			</div>
			{visibleRows.length === 0 && (
				<div className="achievements-empty" role="status">
					<HomeArt kind="achievements" />
					<p>
						{filter === "claimable"
							? "Nie ma teraz nagród do odebrania."
							: filter === "unlocked"
								? "Jeszcze przed tobą — dasz radę! 💪"
								: "Cała kolekcja zdobyta! 🏅"}
					</p>
					<button
						className="achievements-empty-button"
						type="button"
						onClick={() => setFilter("all")}
					>
						Wszystkie
					</button>
				</div>
			)}

			<button
				type="button"
				onClick={() => setConfirmReset(true)}
				className="achievements-reset mx-auto mb-2 touch-manipulation rounded-full border-2 border-red-300 bg-white/70 px-6 py-3 text-base font-extrabold text-red-500 shadow-sm transition-transform active:scale-95"
			>
				Zacznij od nowa
			</button>

			{flight && target && (
				<div
					key={flight.id}
					className="pointer-events-none fixed inset-0 z-[70]"
					aria-hidden="true"
				>
					{Array.from({ length: flight.count }, (_, i) => {
						const angle = (i / flight.count) * Math.PI * 2
						const dx = target.x - flight.x
						const dy = target.y - flight.y
						return (
							<span
								key={i}
								className="anim-claim-fly"
								style={
									{
										left: flight.x,
										top: flight.y,
										"--sx": `${Math.cos(angle) * 48}px`,
										"--sy": `${Math.sin(angle) * 32 - 24}px`,
										"--mx": `${dx * 0.45 + Math.cos(angle) * 65}px`,
										"--my": `${dy * 0.35 - 55}px`,
										"--fx": `${dx}px`,
										"--fy": `${dy}px`,
										animationDuration: `${FLY_MS}ms`,
										animationDelay: `${i * FLY_STAGGER_MS}ms`,
									} as CSSProperties
								}
							>
								<svg viewBox="0 0 32 32">
									<path
										d="M16 1 20 11 31 16 20 20 16 31 12 20 1 16 12 11Z"
										fill="#ffd569"
										stroke="#fff6ce"
										strokeWidth="2"
									/>
									<path d="m16 8 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#fffbea" />
								</svg>
							</span>
						)
					})}
				</div>
			)}

			{selected && (
				<AchievementModal
					row={selected}
					onClose={() => setSelectedId(null)}
					onClaim={(event) => claim(selected.def.id, event)}
				/>
			)}

			{confirmReset && (
				<ResetModal
					onConfirm={debugReset}
					onCancel={() => setConfirmReset(false)}
				/>
			)}
		</main>
	)
}

function AchievementCard({
	row,
	onSelect,
}: {
	row: AchievementRow
	onSelect: () => void
}) {
	const { def, progress, unlocked, claimable } = row
	const tier = TIER_META[def.difficulty]
	return (
		<button
			type="button"
			onClick={onSelect}
			className="achievement-card"
			data-state={claimable ? "ready" : unlocked ? "earned" : "locked"}
		>
			<span
				className={`achievement-medallion bg-gradient-to-br ${tier.tint}`}
				aria-hidden="true"
			>
				{def.icon}
				<span className="achievement-seal">
					{claimable ? "✦" : unlocked ? "✓" : "·"}
				</span>
			</span>
			<span className="achievement-card-copy">
				<span className={`achievement-tier ${tier.accent}`}>{tier.label}</span>
				<span className="achievement-title">{def.title}</span>
				<span className="achievement-description">{def.description}</span>
			</span>
			<span className="achievement-card-progress">
				<span className="achievement-progress-label">
					<span>{unlocked ? "Zdobyte" : "Postęp"}</span>
					<span>
						{Math.min(progress.current, progress.target)}/{progress.target}
					</span>
				</span>
				<span className="achievement-progress-track" aria-hidden="true">
					<span
						className={`bg-gradient-to-r ${tier.bar}`}
						style={{ width: `${progress.ratio * 100}%` }}
					/>
				</span>
			</span>
			<span className="achievement-card-footer">
				<span className={`achievement-reward ${tier.badge}`}>
					✨ {REWARD_BY_DIFFICULTY[def.difficulty]}
				</span>
				<span>
					{claimable ? "Odbierz →" : unlocked ? "Zdobyte ✓" : "Zobacz →"}
				</span>
			</span>
		</button>
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

// The detail card shares tier colors with the collection; the claim button
// remains the measured origin of the spark flight.
function AchievementModal({
	row,
	onClose,
	onClaim,
}: {
	row: AchievementRow
	onClose: () => void
	onClaim: (event: MouseEvent<HTMLButtonElement>) => void
}) {
	const { def, progress, unlocked, unlockedAt, claimable } = row
	const tier = TIER_META[def.difficulty]
	const shown = Math.min(progress.current, progress.target)

	return (
		<CardModal onClose={onClose} closeLabel="Zamknij">
			<div
				className="achievement-detail scrollbar-none"
				data-state={claimable ? "ready" : unlocked ? "earned" : "locked"}
				role="dialog"
				aria-modal="true"
				aria-labelledby="achievement-detail-title"
			>
				<div className="achievement-detail-hero">
					<div className="achievement-detail-reward">
						✨ {REWARD_BY_DIFFICULTY[def.difficulty]}
					</div>
					<svg
						className="achievement-detail-ornament"
						viewBox="0 0 320 190"
						aria-hidden="true"
					>
						<circle
							cx="160"
							cy="95"
							r="77"
							fill="none"
							stroke="currentColor"
							strokeOpacity=".14"
						/>
						<circle
							cx="160"
							cy="95"
							r="88"
							fill="none"
							stroke="currentColor"
							strokeOpacity=".18"
							strokeDasharray="2 10"
						/>
						<g fill="currentColor">
							<path d="m48 57 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm218 46 4 10 10 4-10 4-4 10-4-10-10-4 10-4ZM80 139l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
							<circle cx="244" cy="48" r="2.5" />
							<circle cx="57" cy="115" r="2" />
						</g>
						<path
							d="m124 123-9 51 23-10 14 14 9-51m-2 0 9 51 14-14 23 10-9-51"
							fill="#c49a59"
							stroke="#ffe3a3"
							strokeWidth="2"
						/>
					</svg>
					<div
						className={`achievement-detail-medal bg-gradient-to-br ${tier.tint}`}
						aria-hidden="true"
					>
						<span>{def.icon}</span>
						<span className="achievement-detail-seal">
							{unlocked ? "✓" : "🔒"}
						</span>
					</div>
					<span className={`achievement-detail-tier ${tier.badge}`}>
						{tier.label}
					</span>
				</div>

				<div className="achievement-detail-body">
					<div className="achievement-detail-heading">
						<h2 id="achievement-detail-title">{def.title}</h2>
						<p>{def.description}</p>
					</div>

					<div className="achievement-detail-progress">
						<div className="achievement-detail-progress-label">
							<span>Postęp</span>
							<strong>
								{shown}
								<span> / {progress.target}</span>
							</strong>
						</div>
						<div
							className="achievement-detail-track"
							role="progressbar"
							aria-label="Postęp"
							aria-valuenow={shown}
							aria-valuemin={0}
							aria-valuemax={progress.target}
						>
							<div
								className={`bg-gradient-to-r ${tier.bar}`}
								style={{ width: `${progress.ratio * 100}%` }}
							/>
						</div>
					</div>

					{claimable && (
						<button
							type="button"
							onClick={onClaim}
							className="achievement-detail-claim"
						>
							Odbierz {REWARD_BY_DIFFICULTY[def.difficulty]} iskierek ✨
						</button>
					)}

					{unlocked ? (
						<div className="achievement-detail-status">
							<span>✓ Zdobyte</span>
							<time dateTime={new Date(unlockedAt).toISOString()}>
								{new Date(unlockedAt).toLocaleDateString("pl-PL")}
							</time>
						</div>
					) : (
						<p className="achievement-detail-encouragement">
							Jeszcze przed tobą — dasz radę! 💪
						</p>
					)}
				</div>
			</div>
		</CardModal>
	)
}
