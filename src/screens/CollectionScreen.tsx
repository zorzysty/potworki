import { useState } from "react"
import { BigButton } from "../components/BigButton"
import { HelpTip } from "../components/HelpTip"
import { CARD_THEME, RARITY_META } from "../components/rarity"
import { RARITY_ORDER } from "../game/rewards"
import { isDivisionOnly, MONSTER_COUNT, MONSTERS } from "../monsters/catalog"
import { loreFor } from "../monsters/lore"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { originOf } from "../monsters/world"
import { useGame, wishEggCost } from "../store/store"

// Wyświetlanie po rzadkości (common→legendary), w obrębie rzadkości po id.
// Id nie są już ciągłe po rzadkości (nowe potworki dochodzą na końcu), więc
// sortujemy jawnie zamiast polegać na kolejności id.
const SORTED_MONSTERS = [...MONSTERS].sort(
	(a, b) =>
		RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
		a.id - b.id,
)

export function CollectionScreen() {
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const dreamMonsterId = useGame((s) => s.dreamMonsterId)
	const iskierki = useGame((s) => s.iskierki)
	const setDreamMonster = useGame((s) => s.setDreamMonster)
	const buyWishEgg = useGame((s) => s.buyWishEgg)
	const goTo = useGame((s) => s.goTo)
	const unlockedStage = useGame((s) => s.unlockedStage)
	const [selectedId, setSelectedId] = useState<number | null>(null)

	const ownedCount = Object.keys(ownedMonsters).length
	const allOwned = ownedCount === MONSTER_COUNT
	const cost = wishEggCost({ dreamMonsterId, ownedMonsters })
	const selected = selectedId !== null ? MONSTERS[selectedId] : undefined
	const selectedOwned =
		selectedId !== null ? ownedMonsters[selectedId] : undefined
	// Paszport liczony tylko dla wybranego potworka; krainę nazywamy wyłącznie gdy
	// odblokowana (inaczej zdradziłaby przyszłą tabliczkę → „tajemnica tabliczki").
	const selectedLore = selected ? loreFor(selected.id) : null
	const selectedOrigin = selected ? originOf(selected.id) : null
	const originKnown =
		selectedOrigin !== null &&
		(selectedOrigin.kind === "region"
			? selectedOrigin.stage <= unlockedStage
			: true)
	// Oprawa karty wg rzadkości (ramka/blask całego modala, gradient okna z artem itd.)
	const cardTheme = selected ? CARD_THEME[selected.rarity] : CARD_THEME.common

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
						variant="secondary"
						disabled={iskierki < cost}
						className="flex-1 py-3 text-xl"
					>
						Jajko Życzeń 🌟 — {cost} ✨
						{dreamMonsterId !== null &&
							!(dreamMonsterId in ownedMonsters) &&
							!isDivisionOnly(dreamMonsterId) &&
							" (wymarzony!)"}
					</BigButton>
					<HelpTip
						placement="bottom"
						align="right"
						text="Kupujesz je za iskierki ✨. Masz wymarzonego potworka? Dostaniesz dokładnie jego — na pewno! Nie masz? Wykluje się jakiś nowy potworek, którego jeszcze nie masz. (Sam wymarzony jest za darmo i tylko sprawia, że zwykłe jajka częściej wykluwają właśnie jego.)"
					/>
				</div>
			)}

			<div className="grid grid-cols-3 gap-3 pb-6 min-[420px]:grid-cols-4">
				{SORTED_MONSTERS.map((monster) => {
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
								<div className="anim-sparkle absolute -right-1.5 -top-1.5 text-xl">
									✨
								</div>
							)}
							{isDivisionOnly(monster.id) && (
								<div className="absolute -left-1.5 -top-1.5 rounded-full bg-violet-500 px-2 py-0.5 text-sm font-extrabold text-white shadow">
									÷
								</div>
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
						className={`anim-pop flex max-h-[88vh] w-full max-w-sm flex-col items-center gap-3 overflow-y-auto rounded-[2rem] border-4 bg-white p-5 shadow-2xl ${cardTheme.card}`}
						onClick={(e) => e.stopPropagation()}
					>
						{selectedOwned ? (
							<>
								{/* ===== OKNO Z ARTEM — bohater karty ===== */}
								<div
									className={`relative w-full overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-3 ${cardTheme.window} ${cardTheme.windowBorder}`}
								>
									{/* radialny blask za potworkiem */}
									<div
										className={`pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl ${cardTheme.halo}`}
									/>
									{/* iskry — tylko legendarny */}
									{selected.rarity === "legendary" && (
										<>
											<div className="anim-sparkle pointer-events-none absolute left-2 top-2 text-xl">
												✨
											</div>
											<div className="anim-sparkle pointer-events-none absolute right-2 bottom-2 text-xl">
												✨
											</div>
										</>
									)}
									{/* wstążka rzadkości */}
									<div
										className={`absolute top-2 right-2 z-10 rounded-full px-3 py-1 text-sm font-extrabold shadow ${RARITY_META[selected.rarity].badge}`}
									>
										{RARITY_META[selected.rarity].label}
									</div>
									{isDivisionOnly(selected.id) && (
										<div className="absolute top-2 left-2 z-10 rounded-full bg-violet-500 px-2.5 py-1 text-sm font-extrabold text-white shadow">
											➗
										</div>
									)}
									<div className="relative flex justify-center">
										<MonsterSvg id={selected.id} size={180} animate={true} />
									</div>
								</div>

								{/* ===== BANER: NAZWA + GATUNEK ===== */}
								<div
									className={`flex w-full flex-col items-center gap-1 rounded-2xl px-4 py-3 ${cardTheme.banner}`}
								>
									<div className="text-3xl font-extrabold leading-tight text-slate-700">
										{selected.name}
									</div>
									{selectedLore && (
										<div
											className={`text-base font-extrabold ${cardTheme.accent}`}
										>
											{selectedLore.species}
										</div>
									)}
									{selected.rarity === "legendary" && (
										<div className="anim-rainbow mt-0.5 h-1.5 w-24 rounded-full bg-gradient-to-r from-amber-300 via-pink-300 to-violet-300" />
									)}
								</div>

								{/* ===== OPIS ===== */}
								{selectedLore && (
									<p className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-bold leading-snug text-slate-600">
										{selectedLore.blurb}
									</p>
								)}

								{/* ===== MINI-STATY: kraina pochodzenia + data poznania ===== */}
								<div className="flex w-full items-stretch gap-2">
									{selectedOrigin && (
										<div className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-slate-50 px-2 py-2">
											<span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">
												Pochodzi z
											</span>
											{originKnown ? (
												<span
													className={`w-full rounded-full px-2 py-1 text-center text-xs font-extrabold leading-snug ${selectedOrigin.color}`}
												>
													{selectedOrigin.emoji} {selectedOrigin.name}
												</span>
											) : (
												<span className="w-full rounded-full bg-slate-100 px-2 py-1 text-center text-xs font-extrabold leading-snug text-slate-400">
													🌫️ Z nieodkrytej krainy…
												</span>
											)}
										</div>
									)}
									<div className="flex flex-col items-center justify-between gap-1.5 rounded-2xl bg-slate-50 px-3 py-2">
										<span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">
											Poznany
										</span>
										<span className="-rotate-3 rounded-lg border-2 border-bubblegum/40 px-2 py-0.5 text-xs font-extrabold tracking-wide text-bubblegum">
											{new Date(selectedOwned.hatchedAt).toLocaleDateString(
												"pl-PL",
											)}
										</span>
									</div>
								</div>

								{/* ===== CIEKAWOSTKA jako naklejka ===== */}
								{selectedLore && (
									<div
										className={`-rotate-1 w-full rounded-2xl border-2 px-4 py-2 text-center text-sm font-bold leading-snug ${cardTheme.funFact}`}
									>
										💡 {selectedLore.funFact}
									</div>
								)}
							</>
						) : (
							<>
								<MonsterSvg
									id={selected.id}
									size={180}
									animate={false}
									className="monster-silhouette"
								/>
								<div className="text-3xl font-extrabold text-slate-700">
									???
								</div>
								<div
									className={`rounded-full px-4 py-1 text-lg font-extrabold ${RARITY_META[selected.rarity].badge}`}
								>
									{RARITY_META[selected.rarity].label}
								</div>
								{isDivisionOnly(selected.id) && (
									<div className="rounded-full bg-violet-100 px-4 py-1 text-sm font-extrabold text-violet-600">
										➗ Tylko za dzielenie
									</div>
								)}
								{selected.id === dreamMonsterId ? (
									<BigButton
										onClick={() => {
											setDreamMonster(null)
											setSelectedId(null)
										}}
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
							</>
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
