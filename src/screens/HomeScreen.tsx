import { useState } from "react"
import { ACHIEVEMENTS } from "../achievements/catalog"
import { BigButton } from "../components/BigButton"
import { CARD_SHELL, CardModal } from "../components/CardModal"
import { Companion } from "../components/Companion"
import { EggView } from "../components/EggView"
import { ExpeditionDetails } from "../components/ExpeditionDetails"
import { HelpTip } from "../components/HelpTip"
import { MonsterStage } from "../components/MonsterStage"
import { MODE_LABELS, MODE_ROWS } from "../components/modeLabels"
import { VISIT_BONUS, visitStage } from "../game/adaptive"
import * as collection from "../game/collection"
import { expeditionProgress } from "../game/expeditions"
import {
	fragmentsForEgg,
	isMaxStage,
	MODE_UNLOCK_STAGE,
	modeUnlocked,
	STAGES,
	unlockedFactors,
} from "../game/facts"
import { canAffordSomething } from "../game/village"
import { MONSTER_COUNT, MONSTERS } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { REGIONS } from "../monsters/world"
import { useGame } from "../store/store"

const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export function HomeScreen({ debugEnabled }: { debugEnabled: boolean }) {
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const pendingEggs = useGame((s) => s.pendingEggs)
	const eggFragments = useGame((s) => s.eggFragments)
	const eggsEarned = useGame((s) => s.eggsEarned)
	const dreamMonsterId = useGame((s) => s.dreamMonsterId)
	const companionId = useGame((s) => s.companionId)
	const unlockedStage = useGame((s) => s.unlockedStage)
	const celebratedStage = useGame((s) => s.celebratedStage)
	const achievements = useGame((s) => s.achievements)
	const village = useGame((s) => s.village)
	const iskierki = useGame((s) => s.iskierki)
	const villageVisited = useGame((s) => s.villageVisited)
	const facts = useGame((s) => s.facts)
	const expedition = useGame((s) => s.expedition)
	const totalRounds = useGame((s) => s.totalRounds)
	const mode = useGame((s) => s.mode)
	const setMode = useGame((s) => s.setMode)
	const startRound = useGame((s) => s.startRound)
	const startVisitRound = useGame((s) => s.startVisitRound)
	const goTo = useGame((s) => s.goTo)
	// modal szczegółów wyprawy (z chipa) — stan sesyjny ekranu, nie store
	const [expeditionOpen, setExpeditionOpen] = useState(false)

	const ownedCount = collection.ownedCount(ownedMonsters)
	const factors = unlockedFactors(unlockedStage)
	// bohater Home = przyjaciel (jeśli wybrany i posiadany), inaczej najnowszy potworek
	const newestOwned = collection.newestOwned(ownedMonsters)
	const companionPresent = companionId !== null && companionId in ownedMonsters
	const heroId = companionPresent ? (companionId as number) : newestOwned
	const firstEgg = pendingEggs[0]
	const eggThreshold = fragmentsForEgg(eggsEarned)
	const hasNewGate = unlockedStage > celebratedStage
	const allGatesOpen = isMaxStage(unlockedStage)
	const unlockedAchievements = Object.keys(achievements).length
	// badge trwa, dopóki są iskierki do odbioru (wyjątek od „gaśnie po zobaczeniu":
	// to odbiór nagrody, nie zajawka)
	const hasNewAchievements = Object.values(achievements).some((a) => !a.claimed)
	// badge sesyjny: znika po pierwszej wizycie w wiosce (nie może stać się
	// tapetą, gdy dochód przegoni wydatki), wraca w nowej sesji jeśli nadal stać
	const canBuild = !villageVisited && canAffordSomething(village, iskierki)
	// zaproszenie Strażnika: najsłabsza starsza tabliczka podupadła → ciepła
	// karta-oferta (nigdy obowiązek — bez badge'a i licznika, znika sama, gdy
	// mastery wróci). Zasada „maks jedna proaktywna karta na Home": zaproszenie
	// ma pierwszeństwo (plans/README.md, Shared-surface governance).
	const visited = visitStage(facts, unlockedStage)
	const visitRegion = visited !== null ? REGIONS[visited] : undefined
	const guardianOwned = collection.guardianOwned(visitRegion, ownedMonsters)
	// chip postępu wyprawy: pasywny status POD gniazdem; zasada „maks jedna
	// proaktywna karta na Home" — USTĘPUJE zaproszeniu Strażnika, gdy oba by
	// grały; „Graj!" nigdy nie spada niżej (plans/README.md, governance)
	const trip =
		expedition && !visitRegion
			? expeditionProgress(expedition, totalRounds)
			: null
	const travelerName = expedition
		? MONSTERS[expedition.monsterId]?.name
		: undefined

	return (
		<div className="flex min-h-[var(--app-vh)] flex-col items-center gap-4 p-5 pt-8">
			<h1 className="bg-gradient-to-r from-grape to-bubblegum bg-clip-text text-6xl font-extrabold text-transparent">
				Potworki
			</h1>

			{collection.isCollectionComplete(ownedMonsters) && (
				<div className="anim-pop rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-2 text-xl font-extrabold text-white shadow-lg">
					🏆 Mistrzyni Kolekcji!
				</div>
			)}

			<div className="flex items-end justify-center gap-6">
				{companionPresent ? (
					<Companion size={150} />
				) : newestOwned !== undefined ? (
					<MonsterStage id={newestOwned} size={150} />
				) : (
					<div className="anim-float">
						<EggView quality="normal" size={100} />
					</div>
				)}
				{dreamMonsterId !== null && (
					<div className="relative">
						<button
							type="button"
							onClick={() => goTo("collection")}
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
							<div className="mt-1 text-sm font-extrabold text-amber-500">
								Wymarzony ✨
							</div>
						</button>
						<div className="absolute -right-2 -top-2">
							<HelpTip
								placement="bottom"
								align="right"
								text="To potworek, o którym marzysz. Teraz częściej będzie się wykluwał, a Jajko Życzeń (w „Moich Potworkach”, gdy zbudujesz Fontannę w Wiosce) da ci dokładnie jego. Stuknij obrazek, żeby go obejrzeć."
							/>
						</div>
					</div>
				)}
			</div>
			{heroId !== undefined && (
				<div className="-mt-2 text-lg font-extrabold text-grape-dark">
					{MONSTERS[heroId]?.name}
				</div>
			)}
			{companionId === null && ownedCount >= 3 && (
				<button
					type="button"
					onClick={() => goTo("collection")}
					className="anim-fade-up -mt-1 touch-manipulation rounded-full bg-white/70 px-4 py-1 text-sm font-extrabold text-grape-dark shadow active:scale-95"
				>
					Wybierz swojego przyjaciela 💛
				</button>
			)}

			<div className="relative w-full max-w-xs">
				<div className="flex flex-col gap-1.5 rounded-3xl bg-white/50 p-1.5">
					{/* etykiety trybów — tokeny mult/div/gap/pairs są KODEM i nie zmieniają się
					    (persystowane w jajkach). Rząd 1: bazowe widoki faktu; rząd 2: nowe
					    zabawy odblokowywane bramami (MODE_UNLOCK_STAGE) — zamknięta to
					    zajawka z chipem 🔒, nie wyszarzony przycisk */}
					{MODE_ROWS.map((row) => (
						<div key={row[0]} className="flex gap-1.5">
							{row.map((value) =>
								modeUnlocked(value, unlockedStage) ? (
									<button
										key={value}
										type="button"
										onClick={() => setMode(value)}
										className={`min-h-16 flex-1 touch-manipulation rounded-2xl px-1 py-3 text-base font-extrabold transition-transform active:scale-95 ${
											mode === value
												? "bg-gradient-to-b from-grape to-grape-dark text-white shadow-md"
												: "text-grape-dark"
										}`}
									>
										{MODE_LABELS[value]}
									</button>
								) : (
									<div
										key={value}
										className="flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-base font-extrabold text-grape-dark"
									>
										<span>{MODE_LABELS[value]}</span>
										<span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-500">
											🔒 otworzy brama ×{STAGES[MODE_UNLOCK_STAGE[value]]?.[0]}
										</span>
									</div>
								),
							)}
						</div>
					))}
				</div>
				<div className="absolute -right-2 -top-2">
					{/* tekst pomocy przełącznika trybów */}
					<HelpTip
						placement="bottom"
						align="right"
						text="Wybierz, czego chcesz ćwiczyć: mnożenie, dzielenie albo zgadywanie brakującej liczby. Niektóre wyjątkowe potworki wykluwają się tylko z takich jajek! W Dzielnikach szukasz wszystkich par liczb, które dają wynik, a w Porównywaniu dajesz ciastko potworkowi, który przyniósł większą liczbę — każda zabawa ma swoje wyjątkowe potworki. Nowe zabawy otwierają kolejne bramy."
					/>
				</div>
			</div>

			<BigButton onClick={startRound} className="w-full max-w-xs py-6 text-4xl">
				Graj! 🚀
			</BigButton>

			{visitRegion && (
				<button
					type="button"
					onClick={startVisitRound}
					className="anim-fade-up touch-manipulation flex w-full max-w-xs items-center gap-3 rounded-3xl bg-white/80 px-4 py-3 text-left shadow-md active:scale-95"
				>
					<MonsterStage
						id={visitRegion.guardianId}
						size={44}
						className={guardianOwned ? undefined : "monster-silhouette"}
					/>
					<div className="min-w-0 flex-1">
						{/* teksty zaproszenia Strażnika */}
						<div className="text-base font-extrabold leading-tight text-grape-dark">
							Strażnik {visitRegion.nameGenitive} zaprasza cię w odwiedziny!{" "}
							{visitRegion.emoji}
						</div>
						<div className="mt-0.5 text-sm font-bold text-slate-500">
							Tabliczka ×{visitRegion.factor} — w nagrodę +{VISIT_BONUS} ✨
						</div>
						{!guardianOwned && (
							<div className="text-xs font-bold text-slate-400">
								Poznasz go, gdy go wyklujesz!
							</div>
						)}
					</div>
				</button>
			)}

			{/* CTA wyklucia pojawia się TYLKO gdy czekają jajka (jedyna droga do
			    ekranu hatch z Home); stały status fragmentów jajka mieszka w
			    przycisku „Moje Potworki" poniżej */}
			{firstEgg && (
				<button
					type="button"
					onClick={() => goTo("hatch")}
					className="touch-manipulation flex min-h-16 w-full max-w-xs select-none items-center justify-center gap-3 rounded-3xl border-b-4 border-orange-500 bg-gradient-to-b from-amber-300 to-orange-400 px-5 py-3 text-2xl font-extrabold text-white shadow-lg shadow-orange-300/40 transition-transform active:scale-95"
				>
					<div
						className="anim-wobble"
						style={{
							animationIterationCount: "infinite",
							animationDuration: "1.4s",
						}}
					>
						<EggView quality={firstEgg.quality} size={36} />
					</div>
					<span>Wykluj jajko!</span>
					{pendingEggs.length > 1 && (
						<span className="rounded-full bg-white/90 px-3 py-0.5 text-lg text-orange-500">
							{pendingEggs.length}
						</span>
					)}
				</button>
			)}

			{trip && (
				<button
					type="button"
					onClick={() => setExpeditionOpen(true)}
					className="touch-manipulation flex min-h-16 w-full max-w-xs items-center gap-2 rounded-3xl bg-white/80 px-4 py-2 shadow-md active:scale-95"
				>
					<span className="text-xl">🎒</span>
					{/* chip postępu wyprawy */}
					<span className="truncate text-sm font-extrabold text-grape-dark">
						{travelerName}: {trip.done}/{trip.total} rund
					</span>
					<span className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-200">
						<span
							className="block h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400 transition-[width]"
							style={{ width: `${(trip.done / trip.total) * 100}%` }}
						/>
					</span>
				</button>
			)}

			<div className="relative w-full max-w-xs">
				<BigButton
					onClick={() => goTo("collection")}
					variant="secondary"
					className="w-full"
				>
					<div>
						Moje Potworki 👾 {ownedCount}/{MONSTER_COUNT}
					</div>
					{/* stały status fragmentów jajka (🪺 + pasek + x/y) — zawsze
					    widoczny, także gdy jajka już czekają w gnieździe */}
					<div className="mt-1.5 flex items-center gap-2">
						<span className="text-base leading-none">🪺</span>
						<span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
							<span
								className="block h-full rounded-full bg-amber-400 transition-[width]"
								style={{
									width: `${Math.min(100, (eggFragments / eggThreshold) * 100)}%`,
								}}
							/>
						</span>
						<span className="text-xs font-bold text-slate-400">
							{Math.min(eggFragments, eggThreshold)}/{eggThreshold}
						</span>
					</div>
				</BigButton>
				<div className="absolute -right-2 -top-2">
					<HelpTip
						placement="bottom"
						align="right"
						text="W środku znajdziesz wszystkie swoje potworki. Pasek na dole pokazuje, ile brakuje do nowego jajka — kiedy się zapełni, pojawi się przycisk do wyklucia!"
					/>
				</div>
			</div>

			<div className="relative w-full max-w-xs">
				<BigButton
					onClick={() => goTo("village")}
					variant="secondary"
					className="w-full"
				>
					Wioska 🏡
				</BigButton>
				{canBuild && (
					<div className="anim-pop absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-0.5 text-sm font-extrabold text-white shadow-lg">
						✨ stać cię na budowę!
					</div>
				)}
			</div>

			<div className="relative w-full max-w-xs">
				<BigButton
					onClick={() => goTo("map")}
					variant="secondary"
					className="w-full"
				>
					Mapa Świata {allGatesOpen ? "👑" : "🗺️"}
				</BigButton>
				{hasNewGate && (
					<div className="anim-pop absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-0.5 text-sm font-extrabold text-white shadow-lg">
						✨ nowa brama!
					</div>
				)}
			</div>

			<div className="relative w-full max-w-xs">
				<BigButton
					onClick={() => goTo("achievements")}
					variant="secondary"
					className="w-full"
				>
					Osiągnięcia 🏅 {unlockedAchievements}/{ACHIEVEMENTS.length}
				</BigButton>
				{hasNewAchievements && (
					<div className="anim-pop absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-0.5 text-sm font-extrabold text-white shadow-lg">
						✨ nowe osiągnięcie!
					</div>
				)}
			</div>

			<div className="mt-auto flex flex-wrap items-center justify-center gap-2 pb-2">
				<HelpTip
					placement="top"
					align="left"
					text="To tabliczki mnożenia. Te z kłódką 🔒 jeszcze śpią. Kiedy dobrze opanujesz odblokowane liczby, kłódka pęknie i pojawi się nowa!"
				/>
				{ALL_TABLES.map((n) => (
					<div
						key={n}
						className={`rounded-xl px-3 py-1 text-lg font-extrabold shadow-sm ${
							factors.has(n)
								? "bg-white/90 text-grape-dark"
								: "bg-white/40 text-slate-300"
						}`}
					>
						{factors.has(n) ? `×${n}` : "🔒"}
					</div>
				))}
			</div>

			{debugEnabled && (
				<button
					type="button"
					onClick={() => goTo("debug")}
					className="text-xs font-bold text-slate-400"
				>
					debug
				</button>
			)}

			{expeditionOpen && expedition && (
				<CardModal
					onClose={() => setExpeditionOpen(false)}
					closeLabel="Zamknij wyprawę"
				>
					<div className={`${CARD_SHELL} border-emerald-200`}>
						<div className="anim-float">
							<MonsterStage id={expedition.monsterId} size={150} />
						</div>
						<div className="text-2xl font-extrabold text-grape-dark">
							{travelerName}
						</div>
						<ExpeditionDetails onRecalled={() => setExpeditionOpen(false)} />
					</div>
				</CardModal>
			)}
		</div>
	)
}
