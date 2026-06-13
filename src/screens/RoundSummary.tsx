import { BigButton } from "../components/BigButton"
import { EGG_LABELS, EggView } from "../components/EggView"
import { StarMeter } from "../components/StarMeter"
import { fragmentsForEgg } from "../game/facts"
import { useGame } from "../store/store"

export function RoundSummary() {
	const round = useGame(s => s.round)
	const pendingEggs = useGame(s => s.pendingEggs)
	const eggFragments = useGame(s => s.eggFragments)
	const eggsEarned = useGame(s => s.eggsEarned)
	const goTo = useGame(s => s.goTo)
	if (!round || round.phase !== "summary") return null

	const eggsThisRound = round.eggsCreated.length
	const quality = round.finalQuality ?? "normal"

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6">
			<div className="anim-pop text-4xl font-extrabold text-grape-dark">Koniec rundy! 🎉</div>

			<div className="w-full max-w-sm rounded-3xl bg-white/90 p-5 shadow-xl">
				<div className="mb-2 text-center text-2xl font-extrabold text-amber-500">
					{round.stars} / 30 ⭐
				</div>
				<StarMeter stars={round.stars} />
			</div>

			{eggsThisRound > 0 ? (
				<div className="anim-fade-up flex flex-col items-center gap-2">
					<div className="flex gap-4">
						{Array.from({ length: eggsThisRound }, (_, i) => (
							<div key={i} className="anim-float" style={{ animationDelay: `${i * 0.4}s` }}>
								<EggView quality={quality} size={90} />
							</div>
						))}
					</div>
					<div className="text-xl font-extrabold text-slate-600">
						{eggsThisRound === 1 ? EGG_LABELS[quality] : `${eggsThisRound} × ${EGG_LABELS[quality]}`}!
					</div>
				</div>
			) : (
				<div className="text-lg font-bold text-slate-500">
					Fragmenty jajka: {eggFragments} / {fragmentsForEgg(eggsEarned)} — tak trzymaj!
				</div>
			)}

			{round.unlockedThisRound && (
				<div className="anim-pop rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-center text-2xl font-extrabold text-white shadow-lg">
					Nowa brama się otwiera! 🎉
				</div>
			)}

			<div className="flex w-full max-w-sm flex-col gap-3 pt-2">
				{round.unlockedThisRound && (
					<BigButton onClick={() => goTo("map")} className="w-full py-5 text-2xl">
						Zobacz, jak otwiera się brama! 🗺️
					</BigButton>
				)}
				{pendingEggs.length > 0 && (
					<BigButton onClick={() => goTo("hatch")} className="w-full py-5 text-3xl">
						Wykluj jajko! 🥚
					</BigButton>
				)}
				<BigButton onClick={() => goTo("home")} variant="secondary" className="w-full">
					Do domku 🏠
				</BigButton>
			</div>
		</div>
	)
}
