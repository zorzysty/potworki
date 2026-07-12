import type { BuildingId, DecorationId, VillageState } from "../../game/village"
import {
	BUILDINGS,
	BUILDINGS_BY_ID,
	buildingLevel,
	DECORATIONS,
	MAX_BUILDING_LEVEL,
	nextLevelCost,
} from "../../game/village"
import { BigButton } from "../BigButton"
import { BuildingArt, DECORATION_EMOJI } from "./BuildingArt"

export type SheetView = { kind: "building"; id: BuildingId } | { kind: "list" }

// Brak środków to NIGDY nie błąd — dystans do celu pokazujemy jako postęp
// i zaproszenie do gry (motywacja, nie porażka).
function ProgressChip({ have, cost }: { have: number; cost: number }) {
	return (
		<div className="flex w-full flex-col items-center gap-1 rounded-3xl bg-violet-50 px-6 py-3">
			<div className="text-xl font-extrabold text-grape-dark">
				✨ {have}/{cost} — graj dalej!
			</div>
			<div className="h-2.5 w-full overflow-hidden rounded-full bg-white">
				<div
					className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-[width]"
					style={{ width: `${Math.min(100, (have / cost) * 100)}%` }}
				/>
			</div>
		</div>
	)
}

function BuildingDetail({
	id,
	village,
	iskierki,
	onBuild,
	onSetGoal,
}: {
	id: BuildingId
	village: VillageState
	iskierki: number
	onBuild: (id: BuildingId) => void
	onSetGoal: (id: BuildingId | null) => void
}) {
	const def = BUILDINGS_BY_ID.get(id)
	if (!def) return null
	const level = buildingLevel(village, id)
	const maxed = level >= MAX_BUILDING_LEVEL
	const cost = nextLevelCost(village, id)
	const showLevel = maxed ? MAX_BUILDING_LEVEL : level + 1
	const isGoal = village.goalId === id

	return (
		<div className="flex flex-col items-center gap-3">
			<div className="text-3xl font-extrabold text-grape-dark">
				{def.levelNames[showLevel - 1]}
			</div>
			<div className="rounded-full bg-violet-100 px-4 py-1 text-sm font-extrabold text-grape-dark">
				poziom {level}/{MAX_BUILDING_LEVEL}
			</div>

			{/* podgląd tego, co POWSTANIE (następny poziom) — w pełnym kolorze,
			    aspiracja ma pokazywać prawdziwą nagrodę */}
			<div className="flex h-44 items-center justify-center">
				<BuildingArt id={id} level={showLevel} size={170} />
			</div>

			<div className="max-w-xs text-center text-lg font-bold text-slate-600">
				{def.descriptions[showLevel - 1]}
			</div>

			{maxed ? (
				<div className="rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-xl font-extrabold text-white shadow">
					Maksymalny poziom! 🏆
				</div>
			) : cost !== null && iskierki >= cost ? (
				<BigButton onClick={() => onBuild(id)} className="w-full max-w-xs">
					{level === 0 ? "Zbuduj!" : "Ulepsz!"} ✨{cost}
				</BigButton>
			) : (
				cost !== null && (
					<>
						<ProgressChip have={iskierki} cost={cost} />
						<button
							type="button"
							onClick={() => onSetGoal(isGoal ? null : id)}
							className={`touch-manipulation rounded-full px-5 py-2.5 text-lg font-extrabold shadow active:scale-95 ${
								isGoal
									? "bg-gradient-to-r from-amber-300 to-orange-400 text-white"
									: "bg-white text-grape-dark ring-2 ring-violet-200"
							}`}
						>
							{isGoal ? "To mój cel! ⭐" : "Mój cel! ⭐"}
						</button>
					</>
				)
			)}
		</div>
	)
}

function BuildingRow({
	id,
	village,
	iskierki,
	onOpen,
}: {
	id: BuildingId
	village: VillageState
	iskierki: number
	onOpen: (id: BuildingId) => void
}) {
	const def = BUILDINGS_BY_ID.get(id)
	if (!def) return null
	const level = buildingLevel(village, id)
	const maxed = level >= MAX_BUILDING_LEVEL
	const cost = nextLevelCost(village, id)
	return (
		<button
			type="button"
			onClick={() => onOpen(id)}
			className="flex w-full touch-manipulation items-center gap-3 rounded-2xl bg-violet-50 p-3 active:scale-[0.98]"
		>
			<div className="w-16 shrink-0">
				<BuildingArt
					id={id}
					level={Math.max(1, level)}
					size={60}
					silhouette={level === 0}
				/>
			</div>
			<div className="flex-1 text-left">
				<div className="text-lg font-extrabold text-grape-dark">
					{
						def.levelNames[
							Math.max(0, (maxed ? MAX_BUILDING_LEVEL : level + 1) - 1)
						]
					}
					{village.goalId === id && " ⭐"}
				</div>
				<div className="text-xs font-bold text-slate-400">
					poziom {level}/{MAX_BUILDING_LEVEL}
				</div>
			</div>
			{maxed ? (
				<div className="text-2xl">🏆</div>
			) : (
				cost !== null && (
					<div
						className={`rounded-full px-3 py-1 text-base font-extrabold ${
							iskierki >= cost
								? "bg-gradient-to-r from-amber-300 to-orange-400 text-white"
								: "bg-white text-slate-400"
						}`}
					>
						✨{cost}
					</div>
				)
			)}
		</button>
	)
}

function DecorationRow({
	id,
	village,
	iskierki,
	onBuy,
}: {
	id: DecorationId
	village: VillageState
	iskierki: number
	onBuy: (id: DecorationId) => void
}) {
	const def = DECORATIONS.find((d) => d.id === id)
	if (!def) return null
	const owned = village.decorations.includes(id)
	const affordable = iskierki >= def.cost
	return (
		<div className="flex w-full items-center gap-3 rounded-2xl bg-violet-50 p-3">
			<div className="w-16 shrink-0 text-center text-3xl">
				{DECORATION_EMOJI[id]}
			</div>
			<div className="flex-1 text-left text-lg font-extrabold text-grape-dark">
				{def.name}
			</div>
			{owned ? (
				<div className="text-2xl">✅</div>
			) : affordable ? (
				<button
					type="button"
					onClick={() => onBuy(id)}
					className="touch-manipulation rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-2 text-base font-extrabold text-white shadow active:scale-95"
				>
					Kup! ✨{def.cost}
				</button>
			) : (
				<div className="rounded-full bg-white px-3 py-1 text-base font-extrabold text-slate-400">
					✨{Math.min(iskierki, def.cost)}/{def.cost}
				</div>
			)}
		</div>
	)
}

// Arkusz budowy (bottom sheet): szczegół budynku albo lista wszystkiego.
// Czysto prezentacyjny — stan i akcje przekazuje VillageScreen.
export function BuildSheet({
	view,
	village,
	iskierki,
	onClose,
	onShowList,
	onOpenBuilding,
	onBuild,
	onBuyDecoration,
	onSetGoal,
}: {
	view: SheetView
	village: VillageState
	iskierki: number
	onClose: () => void
	onShowList: () => void
	onOpenBuilding: (id: BuildingId) => void
	onBuild: (id: BuildingId) => void
	onBuyDecoration: (id: DecorationId) => void
	onSetGoal: (id: BuildingId | null) => void
}) {
	return (
		<div className="fixed inset-0 z-40 flex items-end justify-center">
			<button
				type="button"
				aria-label="Zamknij"
				onClick={onClose}
				className="absolute inset-0 bg-slate-900/40"
			/>
			<div className="relative max-h-[84dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
				<div className="mb-3 flex items-center justify-between">
					{view.kind === "building" ? (
						<button
							type="button"
							onClick={onShowList}
							className="touch-manipulation rounded-full bg-violet-100 px-4 py-2 text-base font-extrabold text-grape-dark active:scale-95"
						>
							‹ wszystko
						</button>
					) : (
						<div className="text-2xl font-extrabold text-grape-dark">
							🛠️ Budowanie
						</div>
					)}
					<div className="rounded-full bg-amber-100 px-4 py-2 text-lg font-extrabold text-amber-600">
						✨ {iskierki}
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Zamknij arkusz"
						className="touch-manipulation rounded-full bg-violet-100 px-4 py-2 text-base font-extrabold text-grape-dark active:scale-95"
					>
						✕
					</button>
				</div>

				{view.kind === "building" ? (
					<BuildingDetail
						id={view.id}
						village={village}
						iskierki={iskierki}
						onBuild={onBuild}
						onSetGoal={onSetGoal}
					/>
				) : (
					<div className="flex flex-col gap-2">
						<div className="text-sm font-extrabold uppercase tracking-wide text-slate-400">
							Budynki
						</div>
						{BUILDINGS.map((b) => (
							<BuildingRow
								key={b.id}
								id={b.id}
								village={village}
								iskierki={iskierki}
								onOpen={onOpenBuilding}
							/>
						))}
						<div className="mt-2 text-sm font-extrabold uppercase tracking-wide text-slate-400">
							Dekoracje
						</div>
						{DECORATIONS.map((d) => (
							<DecorationRow
								key={d.id}
								id={d.id}
								village={village}
								iskierki={iskierki}
								onBuy={onBuyDecoration}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
