import { type CSSProperties, useEffect, useState } from "react"
import type { GameMode } from "../game/facts"
import type { PendingEgg } from "../game/rewards"
import { EGG_LABELS, EggView } from "./EggView"

interface Props {
	roundStars: number // gwiazdki tej rundy (0–30) — dla jajka JESZCZE w budowie
	completedEgg: PendingEgg | null // jajko domknięte w tej rundzie (≤1; kolor już finalny)
	threshold: number // próg fragmentów na bieżące jajko (fragmentsForEgg)
	fragmentsNow: number // fragmenty po rundzie
	fragmentsAdded: number // fragmenty dorzucone w tej rundzie (= liczba pytań)
	mode: GameMode // znacznik „÷" dla jajka z dzielenia
}

// Ile gwiazdek „sypie się" w gotowe jajko — oddaje JEGO klasę (blask z całej budowy,
// nie tylko rundy domykającej). Inaczej runda za 30★, która tylko domyka stare słabe
// jajko, sypałaby 30 gwiazdek nad „zwykłym" jajkiem — kolor zależy od banku z wielu rund.
const STARS_FOR_QUALITY: Record<PendingEgg["quality"], number> = {
	normal: 7,
	silver: 14,
	gold: 22,
	rainbow: 30,
	wish: 30,
}

// Koniec rundy: gwiazdki wlatują w jajko i je rozświetlają. Gotowe jajko odsłania finalny
// kolor (zależny od WSZYSTKICH gwiazdek włożonych w jego budowę) — liczba sypiących się
// gwiazdek oddaje tę klasę. Jajko w budowie pokazuje pasek fragmentów i to, że gwiazdki
// tej rundy czekają w środku na resztę (to one, nie liczba fragmentów, dają kolor).
export function EggReward({
	roundStars,
	completedEgg,
	threshold,
	fragmentsNow,
	fragmentsAdded,
	mode,
}: Props) {
	const isComplete = completedEgg !== null
	const quality = completedEgg?.quality ?? "normal"
	const starCount = isComplete
		? STARS_FOR_QUALITY[quality]
		: Math.max(0, Math.min(30, Math.round(roundStars)))
	// gwiazdki lądują kolejno; po ostatniej odsłaniamy jajko
	const showerMs = starCount > 0 ? (starCount - 1) * 50 + 700 : 250
	const [done, setDone] = useState(false)
	const [fill, setFill] = useState(false)

	useEffect(() => {
		const t = setTimeout(() => setDone(true), showerMs)
		return () => clearTimeout(t)
	}, [showerMs])

	useEffect(() => {
		const t = setTimeout(() => setFill(true), 120)
		return () => clearTimeout(t)
	}, [])

	return (
		<div className="anim-fade-up flex flex-col items-center gap-3">
			<div className="relative flex h-44 w-44 items-end justify-center">
				{/* deszcz gwiazdek (clip, by nie malować nad kartą wyniku); znika po odsłonie */}
				{!done && (
					<div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
						{Array.from({ length: starCount }, (_, i) => (
							<span
								key={i}
								className="anim-star-fall absolute bottom-12 left-1/2 text-2xl"
								style={
									{
										"--sx": `${((i % 7) - 3) * 24}px`,
										animationDelay: `${i * 0.05}s`,
										marginLeft: "-0.5em",
									} as CSSProperties
								}
							>
								⭐
							</span>
						))}
					</div>
				)}

				{!done ? (
					// jajko ładuje się gwiazdkami — ciepła poświata
					<div className="anim-glow rounded-[44%]">
						<EggView quality="normal" size={120} className="opacity-90" />
					</div>
				) : isComplete ? (
					// odsłona gotowego jajka w jego finalnym kolorze
					<div className="anim-egg-reveal relative">
						<EggView quality={quality} size={120} />
						<span className="anim-sparkle absolute top-1 -left-1 text-2xl">
							✨
						</span>
						<span
							className="anim-sparkle absolute top-7 -right-1 text-xl"
							style={{ animationDelay: "0.3s" }}
						>
							✨
						</span>
						<span
							className="anim-sparkle absolute right-4 -bottom-1 text-lg"
							style={{ animationDelay: "0.6s" }}
						>
							✨
						</span>
						{mode === "div" && (
							<span className="absolute -bottom-1 -left-1 rounded-full bg-grape px-2 py-0.5 text-sm font-extrabold text-white shadow">
								÷
							</span>
						)}
					</div>
				) : (
					// jajko jeszcze nie gotowe — gwiazdki czekają w środku
					<EggView quality="normal" size={120} className="opacity-90" />
				)}
			</div>

			{!isComplete && (
				<div className="flex w-full max-w-xs flex-col items-center gap-1">
					<div className="h-4 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
						<div
							className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-700 ease-out"
							style={{
								width: `${Math.min(100, ((fill ? fragmentsNow : Math.max(0, fragmentsNow - fragmentsAdded)) / threshold) * 100)}%`,
							}}
						/>
					</div>
					<div className="text-lg font-extrabold text-slate-600">
						Fragmenty jajka: {fragmentsNow} / {threshold}
					</div>
					<div className="text-center text-sm font-bold text-slate-500">
						Gwiazdki czekają w jajku — uzbieraj resztę, a one zdecydują, jak
						będzie ładne! ✨
					</div>
				</div>
			)}

			{/* nazwę/kolor jajka zdradzamy DOPIERO przy odsłonie (done), nie wcześniej */}
			{isComplete && !done && (
				<div className="text-center text-base font-bold text-slate-500">
					Gwiazdki wlatują do jajka… ✨
				</div>
			)}
			{isComplete && done && (
				<div className="anim-pop flex flex-col items-center gap-1">
					<div className="text-xl font-extrabold text-slate-700">
						{EGG_LABELS[quality]}!
					</div>
					<div className="text-center text-sm font-bold text-slate-500">
						Wszystkie gwiazdki włożone w to jajko rozświetliły je ✨
					</div>
				</div>
			)}
		</div>
	)
}
