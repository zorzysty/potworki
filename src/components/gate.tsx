import confetti from "canvas-confetti"
import { useEffect, useId, useState } from "react"
import { STAGES } from "../game/facts"
import { REGIONS } from "../monsters/world"

export const CRYSTALS = 8

// liczba zapalonych kryształów; komplet (8/8) tylko gdy brama naprawdę gotowa
export function litCrystals(progress: number): number {
	return progress >= 1
		? CRYSTALS
		: Math.min(CRYSTALS - 1, Math.floor(progress * CRYSTALS))
}

// czynnik (cyfra) ukryty za bramą danego etapu (etapy 1+ mają jeden czynnik)
export function gateFactor(stage: number): number | undefined {
	return STAGES[stage]?.[0]
}

// fasetowany klejnot; łuk (translateY) na wrapperze, by nie kolidował z animacją iskry
const GEM = "M9 5 H23 L29 13 L16 32 L3 13 Z" // kontur szlifu brylantowego
export function Crystal({ lit, index }: { lit: boolean; index: number }) {
	const uid = useId()
	const dy = Math.round(Math.abs(index - (CRYSTALS - 1) / 2) ** 2 * 0.9) // środek wyżej, końce niżej
	if (!lit) {
		// zgaszony — przygaszone „gniazdo" klejnotu
		return (
			<span
				className="inline-block"
				style={{ transform: `translateY(${dy}px)` }}
			>
				<svg viewBox="0 0 32 34" width={22} height={24} aria-hidden="true">
					<path
						d={GEM}
						fill="#cbd5e1"
						fillOpacity={0.35}
						stroke="#94a3b8"
						strokeOpacity={0.55}
						strokeWidth={1.5}
						strokeLinejoin="round"
					/>
					<polygon
						points="9,5 23,5 21,13 11,13"
						fill="#94a3b8"
						opacity={0.18}
					/>
				</svg>
			</span>
		)
	}
	return (
		<span
			className="inline-block"
			style={{
				transform: `translateY(${dy}px)`,
				filter: "drop-shadow(0 0 5px rgb(255 200 70 / 0.85))",
			}}
		>
			<svg viewBox="0 0 32 34" width={22} height={24} aria-hidden="true">
				<defs>
					<linearGradient id={`gem-${uid}`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#fff3b0" />
						<stop offset="55%" stopColor="#ffcf45" />
						<stop offset="100%" stopColor="#f0950e" />
					</linearGradient>
				</defs>
				<path
					d={GEM}
					fill={`url(#gem-${uid})`}
					stroke="#b9770a"
					strokeWidth={1.2}
					strokeLinejoin="round"
				/>
				{/* fasety: stolik jasny, pawilon ciemniejszy → głębia */}
				<polygon points="9,5 23,5 21,13 11,13" fill="#fff6cf" opacity={0.95} />
				<polygon points="11,13 21,13 16,32" fill="#f5b21f" opacity={0.5} />
				<polygon points="21,13 29,13 16,32" fill="#e8930f" opacity={0.55} />
				<polygon points="23,5 29,13 21,13" fill="#f3a81c" opacity={0.45} />
				{/* połysk fasetek */}
				<path
					d="M3 13 H29 M9 5 L11 13 M23 5 L21 13"
					stroke="#ffffff"
					strokeOpacity={0.35}
					strokeWidth={0.8}
					fill="none"
				/>
				{/* iskra */}
				<circle
					cx={12}
					cy={9}
					r={1.7}
					fill="#ffffff"
					opacity={0.9}
					className="anim-sparkle"
					style={{ transformBox: "fill-box", transformOrigin: "center" }}
				/>
			</svg>
		</span>
	)
}

// pełnoekranowy splash otwarcia bramy: dwie fazy (otwieranie → odsłona czynnika).
// Caller decyduje, kiedy go pokazać i co zrobić po tapnięciu (onDone); uczczenie
// (markGatesCelebrated) należy do callera, by komponent był reużywalny.
export function GateReveal({
	stage,
	onDone,
}: {
	stage: number
	onDone: () => void
}) {
	const [revealed, setRevealed] = useState(false)

	useEffect(() => {
		confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 } })
		const t = setTimeout(() => {
			setRevealed(true)
			confetti({ particleCount: 130, spread: 120, origin: { y: 0.4 } })
		}, 900)
		return () => clearTimeout(t)
	}, [])

	return (
		<button
			type="button"
			onClick={onDone}
			className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-slate-900/70 p-6 backdrop-blur-sm"
		>
			<div className="text-2xl font-extrabold text-white/90">
				{revealed ? "Nowa kraina!" : "Brama się otwiera…"}
			</div>

			<div className="relative flex flex-col items-center">
				<div className="flex items-end justify-center gap-1">
					{Array.from({ length: CRYSTALS }, (_, i) => (
						<Crystal key={i} lit index={i} />
					))}
				</div>
				<div className="relative -mt-1 rounded-t-[3rem] rounded-b-2xl bg-gradient-to-b from-violet-400 to-fuchsia-500 p-2.5 shadow-2xl">
					<div className="relative flex h-48 w-44 items-center justify-center overflow-hidden rounded-t-[2.6rem] rounded-b-xl bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-950">
						{revealed ? (
							<div className="anim-pop-in text-6xl font-extrabold text-sunny">
								×{gateFactor(stage)}
							</div>
						) : (
							<div className="text-5xl font-extrabold text-white/80">? ?</div>
						)}
						{/* mgła znika przy odsłonięciu */}
						<div
							className={`pointer-events-none absolute inset-0 bg-white/20 backdrop-blur-[2px] ${
								revealed ? "anim-mist-clear" : ""
							}`}
						/>
					</div>
				</div>
				{/* rozbłysk portalu */}
				{!revealed && (
					<div className="anim-gate-flash pointer-events-none absolute inset-0 m-auto h-40 w-40 rounded-full bg-white blur-md" />
				)}
			</div>

			{revealed && (
				<>
					{REGIONS[stage] && (
						<div className="anim-pop text-2xl font-extrabold text-white">
							{REGIONS[stage].emoji} {REGIONS[stage].name}
						</div>
					)}
					<div className="anim-pop rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-2xl font-extrabold text-white shadow-lg">
						Nowa tabliczka: ×{gateFactor(stage)}! 🎊
					</div>
					<div className="anim-bounce-slow text-lg font-extrabold text-white/80">
						👆 Tapnij, żeby iść dalej
					</div>
				</>
			)}
		</button>
	)
}
