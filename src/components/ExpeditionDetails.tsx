import {
	EXPEDITIONS_BY_ID,
	expeditionProgress,
	findChanceLabel,
} from "../game/expeditions"
import { useGame } from "../store/store"
import { BigButton } from "./BigButton"

// Szczegóły trwającej wyprawy + „Zawróć potworka": jedna treść dla modala na
// Home i karty podróżnika w Kolekcji. Czyta store sam; null bez wyprawy.
export function ExpeditionDetails({ onRecalled }: { onRecalled?: () => void }) {
	const expedition = useGame((s) => s.expedition)
	const totalRounds = useGame((s) => s.totalRounds)
	const recallExpedition = useGame((s) => s.recallExpedition)
	const def = expedition ? EXPEDITIONS_BY_ID.get(expedition.typeId) : undefined
	const label = useGame((s) =>
		def ? findChanceLabel(def, s.ownedMonsters) : null,
	)
	if (!expedition || !def) return null
	const progress = expeditionProgress(expedition, totalRounds)

	return (
		<>
			<div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-white/90 p-5 shadow-xl">
				<div className="text-xl font-extrabold text-grape-dark">{def.name}</div>
				<div className="text-sm font-bold text-slate-500">
					{def.description}
				</div>
				<div className="flex items-center justify-between text-lg font-extrabold text-emerald-600">
					<span>W drodze</span>
					<span>
						{progress.done}/{progress.total} rund
					</span>
				</div>
				<div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
					<div
						className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400 transition-[width]"
						style={{ width: `${(progress.done / progress.total) * 100}%` }}
					/>
				</div>
				<div className="text-sm font-bold text-slate-500">
					Każda ukończona runda przybliża powrót — jeszcze{" "}
					{progress.total - progress.done}.
				</div>
				<div className="flex flex-wrap gap-2 pt-1">
					<span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-extrabold text-amber-600">
						+{def.rewardIskierki} ✨
					</span>
					{label && (
						<span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-extrabold text-violet-600">
							{label}
						</span>
					)}
				</div>
			</div>
			<BigButton
				onClick={() => {
					recallExpedition()
					onRecalled?.()
				}}
				variant="secondary"
				className="w-full py-3 text-lg"
			>
				Zawróć potworka
			</BigButton>
		</>
	)
}
