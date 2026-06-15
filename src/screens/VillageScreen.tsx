import { BigButton } from "../components/BigButton"
import { HelpTip } from "../components/HelpTip"
import { WanderingMonster, wanderParams } from "../components/WanderingMonster"
import { MONSTER_COUNT } from "../monsters/catalog"
import { useGame } from "../store/store"

// Limit jednocześnie renderowanych wędrowców — do 76 animowanych SVG to dużo dla
// tabletu, więc pokazujemy najnowszych (zawsze z przyjacielem). Strojenie wydajności.
const VILLAGE_CAP = 14

export function VillageScreen() {
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const companionId = useGame((s) => s.companionId)
	const startRound = useGame((s) => s.startRound)
	const goTo = useGame((s) => s.goTo)

	const ownedIds = Object.keys(ownedMonsters).map(Number)
	const ownedCount = ownedIds.length

	// najnowsi do limitu, ale przyjaciel zawsze w komplecie
	const sorted = [...ownedIds].sort(
		(a, b) =>
			(ownedMonsters[b]?.hatchedAt ?? 0) - (ownedMonsters[a]?.hatchedAt ?? 0),
	)
	let shown = sorted.slice(0, VILLAGE_CAP)
	if (
		companionId !== null &&
		companionId in ownedMonsters &&
		!shown.includes(companionId)
	) {
		shown = [companionId, ...shown.slice(0, VILLAGE_CAP - 1)]
	}

	return (
		<div className="flex min-h-dvh flex-col gap-3 p-4">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => goTo("home")}
					className="touch-manipulation rounded-full bg-white/80 px-5 py-2 text-2xl font-extrabold text-grape-dark shadow active:scale-90"
					aria-label="Wróć do domku"
				>
					←
				</button>
				<div className="text-2xl font-extrabold text-grape-dark">Wioska 🏡</div>
				<HelpTip
					placement="bottom"
					align="right"
					text="To dom twoich potworków! Chodzą, bawią się i czekają na ciebie. Stuknij któregoś, żeby się przywitał. Im więcej ich masz, tym żywsza wioska!"
				/>
			</div>

			{ownedCount === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
					<div className="text-6xl">🏡</div>
					<div className="max-w-xs text-lg font-extrabold text-grape-dark">
						Twoja wioska czeka na pierwszego mieszkańca!
					</div>
					<div className="max-w-xs text-sm font-bold text-slate-500">
						Zagraj rundę i wykluj potworka — zamieszka właśnie tu.
					</div>
					<BigButton
						onClick={startRound}
						className="w-full max-w-xs py-4 text-2xl"
					>
						Graj! 🚀
					</BigButton>
				</div>
			) : (
				// SCENA: warstwy tło / dekoracje / potworki. Dekoracje i sceneria to szwy
				// pod przyszły sklepik (wypełni kupionymi przedmiotami) — w v1 statyczne.
				<div className="relative w-full flex-1 overflow-hidden rounded-3xl">
					{/* warstwa 0: tło — trawa u dołu */}
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-emerald-300/80 to-transparent" />
					{/* warstwa 1: dekoracje (sklepik doda kupione) */}
					<div className="pointer-events-none absolute inset-0 z-10">
						<span className="absolute bottom-[2%] left-[4%] text-5xl">🌳</span>
						<span className="absolute right-[6%] bottom-[3%] text-4xl">🌷</span>
						<span className="absolute top-[8%] right-[12%] text-3xl opacity-80">
							☀️
						</span>
					</div>
					{/* warstwa 2: potworki */}
					{shown.map((id, i) => (
						<WanderingMonster
							key={id}
							id={id}
							params={wanderParams(id, i)}
							isCompanion={id === companionId}
						/>
					))}
					{ownedCount === MONSTER_COUNT && (
						<div className="anim-pop absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-2 text-lg font-extrabold text-white shadow-lg">
							🎉 Cała wioska w komplecie!
						</div>
					)}
				</div>
			)}
		</div>
	)
}
