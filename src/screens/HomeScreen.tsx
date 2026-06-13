import { BigButton } from "../components/BigButton"
import { EggView } from "../components/EggView"
import { HelpTip } from "../components/HelpTip"
import { fragmentsForEgg, isMaxStage, unlockedFactors } from "../game/facts"
import { MONSTER_COUNT, MONSTERS } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame } from "../store/store"

const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export function HomeScreen({ debugEnabled }: { debugEnabled: boolean }) {
	const ownedMonsters = useGame(s => s.ownedMonsters)
	const pendingEggs = useGame(s => s.pendingEggs)
	const eggFragments = useGame(s => s.eggFragments)
	const eggsEarned = useGame(s => s.eggsEarned)
	const dreamMonsterId = useGame(s => s.dreamMonsterId)
	const unlockedStage = useGame(s => s.unlockedStage)
	const celebratedStage = useGame(s => s.celebratedStage)
	const startRound = useGame(s => s.startRound)
	const goTo = useGame(s => s.goTo)

	const ownedIds = Object.keys(ownedMonsters).map(Number)
	const ownedCount = ownedIds.length
	const factors = unlockedFactors(unlockedStage)
	const newestOwned = ownedIds.sort(
		(x, y) => (ownedMonsters[y]?.hatchedAt ?? 0) - (ownedMonsters[x]?.hatchedAt ?? 0),
	)[0]
	const firstEgg = pendingEggs[0]
	const eggThreshold = fragmentsForEgg(eggsEarned)
	const hasNewGate = unlockedStage > celebratedStage
	const allGatesOpen = isMaxStage(unlockedStage)

	return (
		<div className="flex min-h-dvh flex-col items-center gap-4 p-5 pt-8">
			<h1 className="bg-gradient-to-r from-grape to-bubblegum bg-clip-text text-6xl font-extrabold text-transparent">
				Potworki
			</h1>

			{ownedCount === MONSTER_COUNT && (
				<div className="anim-pop rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-2 text-xl font-extrabold text-white shadow-lg">
					🏆 Mistrzyni Kolekcji!
				</div>
			)}

			<div className="flex items-end justify-center gap-6">
				{newestOwned !== undefined ? (
					<MonsterSvg id={newestOwned} size={150} />
				) : (
					<div className="anim-float">
						<EggView quality="normal" size={100} />
					</div>
				)}
				{dreamMonsterId !== null && (
					<div className="relative">
						<button
							type="button"
							onPointerDown={() => goTo("collection")}
							className="touch-manipulation flex flex-col items-center active:scale-95"
						>
							<div className="anim-glow rounded-3xl border-4 border-amber-300 bg-white/60 p-2">
								<MonsterSvg
									id={dreamMonsterId}
									size={84}
									animate={false}
									className="monster-silhouette"
								/>
							</div>
							<div className="mt-1 text-sm font-extrabold text-amber-500">Wymarzony ✨</div>
						</button>
						<div className="absolute -right-2 -top-2">
							<HelpTip
								placement="bottom"
								align="right"
								text="To potworek, o którym marzysz. Teraz częściej będzie się wykluwał, a Jajko Życzeń (w „Moich Potworkach”) da ci dokładnie jego. Stuknij obrazek, żeby go obejrzeć."
							/>
						</div>
					</div>
				)}
			</div>
			{newestOwned !== undefined && (
				<div className="-mt-2 text-lg font-extrabold text-grape-dark">
					{MONSTERS[newestOwned]?.name}
				</div>
			)}

			<BigButton onClick={startRound} className="w-full max-w-xs py-6 text-4xl">
				Graj! 🚀
			</BigButton>

			<div className="relative w-full max-w-xs">
			<button
				type="button"
				onPointerDown={() => pendingEggs.length > 0 && goTo("hatch")}
				className="touch-manipulation flex w-full items-center justify-between rounded-3xl bg-white/80 px-5 py-3 shadow-md active:scale-95"
			>
				<div className="text-xl font-extrabold text-slate-600">🪺 Gniazdo</div>
				{firstEgg ? (
					<div className="flex items-center gap-2">
						<div className="anim-wobble" style={{ animationIterationCount: "infinite", animationDuration: "1.4s" }}>
							<EggView quality={firstEgg.quality} size={36} />
						</div>
						<div className="rounded-full bg-bubblegum px-3 py-0.5 text-lg font-extrabold text-white">
							{pendingEggs.length}
						</div>
					</div>
				) : (
					<div className="flex items-center gap-2">
						<div className="h-3 w-24 overflow-hidden rounded-full bg-slate-200">
							<div
								className="h-full rounded-full bg-amber-400 transition-[width]"
								style={{ width: `${(eggFragments / eggThreshold) * 100}%` }}
							/>
						</div>
						<span className="text-sm font-bold text-slate-400">
							{eggFragments}/{eggThreshold}
						</span>
					</div>
				)}
			</button>
				<div className="absolute -right-2 -top-2">
					<HelpTip
						placement="bottom"
						align="right"
						text="Tu czekają twoje jajka. Kiedy pasek się zapełni, do gniazda wskoczy nowe jajko. Stuknij gniazdo, żeby wykluć potworka!"
					/>
				</div>
			</div>

			<BigButton
				onClick={() => goTo("collection")}
				variant="secondary"
				className="w-full max-w-xs"
			>
				Moje Potworki 👾 {ownedCount}/{MONSTER_COUNT}
			</BigButton>

			<div className="relative w-full max-w-xs">
				<BigButton onClick={() => goTo("map")} variant="secondary" className="w-full">
					Kraina Potworków {allGatesOpen ? "👑" : "🗺️"}
				</BigButton>
				{hasNewGate && (
					<div className="anim-pop absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-0.5 text-sm font-extrabold text-white shadow-lg">
						✨ nowa brama!
					</div>
				)}
			</div>

			<div className="mt-auto flex flex-wrap items-center justify-center gap-2 pb-2">
				<HelpTip
					placement="top"
					align="left"
					text="To tabliczki mnożenia. Te z kłódką 🔒 jeszcze śpią. Kiedy dobrze opanujesz odblokowane liczby, kłódka pęknie i pojawi się nowa!"
				/>
				{ALL_TABLES.map(n => (
					<div
						key={n}
						className={`rounded-xl px-3 py-1 text-lg font-extrabold shadow-sm ${
							factors.has(n) ? "bg-white/90 text-grape-dark" : "bg-white/40 text-slate-300"
						}`}
					>
						{factors.has(n) ? `×${n}` : "🔒"}
					</div>
				))}
			</div>

			{debugEnabled && (
				<button
					type="button"
					onPointerDown={() => goTo("debug")}
					className="text-xs font-bold text-slate-400"
				>
					debug
				</button>
			)}
		</div>
	)
}
