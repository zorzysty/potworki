import confetti from "canvas-confetti"
import { useEffect, useState } from "react"
import { BigButton } from "../components/BigButton"
import { EGG_LABELS, EggView } from "../components/EggView"
import { RARITY_META } from "../components/rarity"
import { MONSTERS } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame } from "../store/store"

export function HatchScreen() {
	const pendingEggs = useGame(s => s.pendingEggs)
	const lastHatch = useGame(s => s.lastHatch)
	const hatchEgg = useGame(s => s.hatchEgg)
	const clearLastHatch = useGame(s => s.clearLastHatch)
	const goTo = useGame(s => s.goTo)
	const [cracks, setCracks] = useState(0)
	const [wobbleNonce, setWobbleNonce] = useState(0)

	const egg = pendingEggs[0]
	const monster = lastHatch ? MONSTERS[lastHatch.monsterId] : undefined

	useEffect(() => {
		if (!lastHatch?.isNew) return
		confetti({ particleCount: 130, spread: 80, origin: { y: 0.55 } })
		if (lastHatch.isDream) {
			const timer = setTimeout(
				() => confetti({ particleCount: 180, spread: 120, origin: { y: 0.4 } }),
				350,
			)
			return () => clearTimeout(timer)
		}
	}, [lastHatch])

	const tapEgg = () => {
		if (!egg) return
		if (cracks >= 2) {
			setCracks(0)
			hatchEgg()
		} else {
			setCracks(c => c + 1)
			setWobbleNonce(n => n + 1)
		}
	}

	const leave = () => {
		clearLastHatch()
		goTo("home")
	}

	return (
		<div className="flex min-h-dvh flex-col items-center p-5">
			<div className="flex w-full items-center justify-between">
				<button
					type="button"
					onPointerDown={leave}
					className="touch-manipulation rounded-full bg-white/20 px-5 py-2 text-2xl font-extrabold text-white active:scale-90"
					aria-label="Wróć do domku"
				>
					←
				</button>
				{pendingEggs.length > 0 && (
					<div className="rounded-full bg-white/20 px-4 py-1 text-lg font-extrabold text-white">
						🥚 {pendingEggs.length}
					</div>
				)}
			</div>

			<div className="flex flex-1 flex-col items-center justify-center gap-5">
				{monster && lastHatch ? (
					<>
						{lastHatch.isNew && (
							<div className="anim-pop rounded-full bg-gradient-to-r from-bubblegum to-orange-400 px-6 py-2 text-2xl font-extrabold text-white shadow-lg">
								{lastHatch.isDream ? "WYMARZONY POTWOREK! 💖" : "NOWY POTWOREK! ✨"}
							</div>
						)}
						<div
							className={`anim-pop-in rounded-[2.5rem] bg-white/95 p-6 shadow-2xl ${
								lastHatch.isDream ? "ring-8 ring-amber-300" : ""
							}`}
						>
							<MonsterSvg id={lastHatch.monsterId} size={210} />
						</div>
						<div className="text-4xl font-extrabold text-white">{monster.name}</div>
						<div
							className={`rounded-full px-4 py-1 text-lg font-extrabold ${RARITY_META[monster.rarity].badge}`}
						>
							{RARITY_META[monster.rarity].label}
						</div>
						{!lastHatch.isNew && (
							<div className="anim-fade-up text-xl font-extrabold text-amber-300">
								Już go masz! Zamienia się w ✨ +{lastHatch.iskierkiGained}{" "}
								{lastHatch.iskierkiGained === 1 ? "iskierkę" : "iskierki"}
							</div>
						)}
						<div className="flex flex-col gap-3 pt-2">
							{pendingEggs.length > 0 ? (
								<BigButton onClick={clearLastHatch} className="px-10 py-5 text-3xl">
									Następne jajko! 🥚
								</BigButton>
							) : (
								<BigButton onClick={leave} className="px-10 py-5 text-3xl">
									Super! 🎉
								</BigButton>
							)}
						</div>
					</>
				) : egg ? (
					<>
						<div className="text-2xl font-extrabold text-white/90">{EGG_LABELS[egg.quality]}</div>
						<button
							type="button"
							onPointerDown={tapEgg}
							className="touch-manipulation active:scale-95"
							aria-label="Tapnij jajko"
						>
							<div key={wobbleNonce} className={wobbleNonce > 0 ? "anim-wobble" : "anim-float"}>
								<EggView quality={egg.quality} cracks={cracks} size={190} />
							</div>
						</button>
						<div className="anim-bounce-slow text-xl font-extrabold text-white/80">
							👆 Tapnij jajko {3 - cracks} {3 - cracks === 1 ? "raz" : "razy"}!
						</div>
					</>
				) : (
					<>
						<div className="text-7xl">🪺</div>
						<div className="text-2xl font-extrabold text-white/90">Gniazdo jest puste</div>
						<div className="text-lg font-bold text-white/60">
							Zagraj rundę, żeby zdobyć nowe jajka!
						</div>
						<BigButton onClick={leave} variant="secondary">
							Do domku 🏠
						</BigButton>
					</>
				)}
			</div>
		</div>
	)
}
