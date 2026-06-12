import { useState } from "react"
import { BigButton } from "../components/BigButton"
import { HelpTip } from "../components/HelpTip"
import { RARITY_META } from "../components/rarity"
import { MONSTER_COUNT, MONSTERS } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame, wishEggCost } from "../store/store"

export function CollectionScreen() {
	const ownedMonsters = useGame(s => s.ownedMonsters)
	const dreamMonsterId = useGame(s => s.dreamMonsterId)
	const iskierki = useGame(s => s.iskierki)
	const setDreamMonster = useGame(s => s.setDreamMonster)
	const buyWishEgg = useGame(s => s.buyWishEgg)
	const goTo = useGame(s => s.goTo)
	const [selectedId, setSelectedId] = useState<number | null>(null)

	const ownedCount = Object.keys(ownedMonsters).length
	const allOwned = ownedCount === MONSTER_COUNT
	const cost = wishEggCost({ dreamMonsterId, ownedMonsters })
	const selected = selectedId !== null ? MONSTERS[selectedId] : undefined
	const selectedOwned = selectedId !== null ? ownedMonsters[selectedId] : undefined

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
					Moje Potworki {ownedCount}/{MONSTER_COUNT}
				</div>
				<div className="flex items-center gap-1.5">
					<HelpTip
						placement="bottom"
						align="right"
						text="To twoje iskierki ✨. Dostajesz je, gdy z jajka wykluje się potworek, którego już masz. Uzbieraj ich dość, a kupisz Jajko Życzeń!"
					/>
					<div className="rounded-full bg-white/80 px-4 py-2 text-lg font-extrabold text-amber-500 shadow">
						✨ {iskierki}
					</div>
				</div>
			</div>

			{iskierki > 0 && !allOwned && (
				<div className="mx-auto flex w-full max-w-sm items-center gap-2">
					<BigButton
						onClick={buyWishEgg}
						trigger="tap"
						variant="secondary"
						disabled={iskierki < cost}
						className="flex-1 py-3 text-xl"
					>
						Jajko Życzeń 🌟 — {cost} ✨
						{dreamMonsterId !== null && !(dreamMonsterId in ownedMonsters) && " (wymarzony!)"}
					</BigButton>
					<HelpTip
						placement="bottom"
						align="right"
						text="Kupujesz je za iskierki ✨. Masz wymarzonego potworka? Dostaniesz dokładnie jego — na pewno! Nie masz? Wykluje się jakiś nowy potworek, którego jeszcze nie masz. (Sam wymarzony jest za darmo i tylko sprawia, że zwykłe jajka częściej wykluwają właśnie jego.)"
					/>
				</div>
			)}

			<div className="grid grid-cols-3 gap-3 pb-6 min-[420px]:grid-cols-4">
				{MONSTERS.map(monster => {
					const owned = monster.id in ownedMonsters
					const isDream = monster.id === dreamMonsterId
					return (
						<button
							key={monster.id}
							type="button"
							onClick={() => setSelectedId(monster.id)}
							className={`touch-manipulation relative flex flex-col items-center rounded-2xl border-4 bg-white/80 p-2 shadow-sm transition-transform active:scale-95
								${RARITY_META[monster.rarity].border} ${isDream ? "ring-4 ring-amber-300" : ""}`}
						>
							<MonsterSvg
								id={monster.id}
								size="100%"
								animate={false}
								className={owned ? "" : "monster-silhouette"}
							/>
							<div className="mt-1 truncate text-xs font-extrabold text-slate-600">
								{owned ? monster.name : "???"}
							</div>
							{isDream && (
								<div className="anim-sparkle absolute -right-1.5 -top-1.5 text-xl">✨</div>
							)}
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
						className="anim-pop flex w-full max-w-sm flex-col items-center gap-3 rounded-[2rem] bg-white p-6 shadow-2xl"
						onClick={e => e.stopPropagation()}
					>
						<MonsterSvg
							id={selected.id}
							size={180}
							animate={!!selectedOwned}
							className={selectedOwned ? "" : "monster-silhouette"}
						/>
						<div className="text-3xl font-extrabold text-slate-700">
							{selectedOwned ? selected.name : "???"}
						</div>
						<div
							className={`rounded-full px-4 py-1 text-lg font-extrabold ${RARITY_META[selected.rarity].badge}`}
						>
							{RARITY_META[selected.rarity].label}
						</div>
						{selectedOwned ? (
							<div className="text-sm font-bold text-slate-400">
								Wykluty: {new Date(selectedOwned.hatchedAt).toLocaleDateString("pl-PL")}
							</div>
						) : selected.id === dreamMonsterId ? (
							<BigButton
								onClick={() => {
									setDreamMonster(null)
									setSelectedId(null)
								}}
								trigger="tap"
								variant="secondary"
								className="w-full py-3 text-lg"
							>
								Już go nie chcę 💔
							</BigButton>
						) : (
							<div className="flex w-full items-center gap-2">
								<BigButton
									onClick={() => {
										setDreamMonster(selected.id)
										setSelectedId(null)
									}}
									trigger="tap"
									className="flex-1 py-3 text-lg"
								>
									To mój wymarzony potworek! 💖
								</BigButton>
								<HelpTip
									placement="top"
									align="right"
									text="Zaznacz potworka, o którym marzysz. Będzie na ciebie czekał — częściej będzie się wykluwał, a Jajko Życzeń da ci dokładnie jego. Możesz mieć tylko jednego wymarzonego naraz."
								/>
							</div>
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
