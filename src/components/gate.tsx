import confetti from "canvas-confetti"
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useId,
	useState,
} from "react"
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

// fasetowany klejnot we współrzędnych 32×34 (środek ~(16,17)) — osadzany
// w gniazdach łuku bramy przez <g transform>. Gradient zapalonego klejnotu
// jest wspólny dla całej bramy (jeden <defs> w GateArch, id = gradId).
const GEM = "M9 5 H23 L29 13 L16 32 L3 13 Z" // kontur szlifu brylantowego

function GemBody({ lit, gradId }: { lit: boolean; gradId: string }) {
	if (!lit) {
		// zgaszony — przygaszone „gniazdo" klejnotu
		return (
			<>
				<path
					d={GEM}
					fill="#cbd5e1"
					fillOpacity={0.4}
					stroke="#94a3b8"
					strokeOpacity={0.6}
					strokeWidth={1.5}
					strokeLinejoin="round"
				/>
				<polygon points="9,5 23,5 21,13 11,13" fill="#94a3b8" opacity={0.18} />
			</>
		)
	}
	return (
		<>
			<path
				d={GEM}
				fill={`url(#${gradId})`}
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
		</>
	)
}

// geometria łuku w viewBox 200×240 — policzona RAZ przy załadowaniu modułu
// (zależy wyłącznie od stałych poniżej; okno portalu wycina się z tych samych
// liczb, więc strojenie promieni nie rozjedzie SVG i HTML-owego wnętrza)
const ARCH_CX = 100
const ARCH_CY = 112 // linia, z której wyrasta półkole łuku
const ARCH_R_IN = 58 // promień otworu portalu
const ARCH_R_OUT = 88 // promień zewnętrzny pierścienia kamieni
const ARCH_R_GEM = 73 // promień, na którym siedzą gniazda kryształów
const ARCH_STONE_COUNT = 7
const STONE_OUTLINE = "#6d28d9"

function archPoint(r: number, deg: number): readonly [number, number] {
	const a = (deg * Math.PI) / 180
	return [ARCH_CX + r * Math.cos(a), ARCH_CY - r * Math.sin(a)]
}

// klin kamienia (wycinek pierścienia) między kątami a1 > a2 (stopnie)
function stonePath(a1: number, a2: number): string {
	const [x1, y1] = archPoint(ARCH_R_IN, a1)
	const [x2, y2] = archPoint(ARCH_R_OUT, a1)
	const [x3, y3] = archPoint(ARCH_R_OUT, a2)
	const [x4, y4] = archPoint(ARCH_R_IN, a2)
	return `M ${x1} ${y1} L ${x2} ${y2} A ${ARCH_R_OUT} ${ARCH_R_OUT} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${ARCH_R_IN} ${ARCH_R_IN} 0 0 0 ${x1} ${y1} Z`
}

const ARCH_STONES = Array.from({ length: ARCH_STONE_COUNT }, (_, i) => {
	const a1 = 180 - (i * 180) / ARCH_STONE_COUNT - 1.5 // szczelina między klinami
	const a2 = 180 - ((i + 1) * 180) / ARCH_STONE_COUNT + 1.5
	return {
		d: stonePath(a1, a2),
		// zwornik (środkowy klin) jaśniejszy — klasyka kamiennego łuku
		fill: i === 3 ? "#c084fc" : i % 2 ? "#8b5cf6" : "#a78bfa",
	}
})

// gniazda kryształów wzdłuż łuku, skrajne schodzą na filary
const GEM_SLOTS = Array.from({ length: CRYSTALS }, (_, i) => {
	const deg = 197 - (i * 214) / (CRYSTALS - 1)
	const [x, y] = archPoint(ARCH_R_GEM, deg)
	return { x, y, rot: 90 - deg }
})

// bloki filarów: 3 rzędy po obu stronach, od linii łuku do ziemi
const PILLAR_BLOCKS = [0, 1, 2].flatMap((row) => [
	{ x: ARCH_CX - ARCH_R_OUT, y: ARCH_CY + row * 40, row },
	{ x: ARCH_CX + ARCH_R_IN, y: ARCH_CY + row * 40, row },
])

// okno portalu (HTML pod SVG): wchodzi 4 jednostki POD kamienie, dół 6 nad ziemią
const WINDOW_OVERLAP = 4
const WINDOW_STYLE: CSSProperties = {
	left: `${((ARCH_CX - ARCH_R_IN - WINDOW_OVERLAP) / 200) * 100}%`,
	right: `${((ARCH_CX - ARCH_R_IN - WINDOW_OVERLAP) / 200) * 100}%`,
	top: `${((ARCH_CY - ARCH_R_IN - WINDOW_OVERLAP) / 240) * 100}%`,
	bottom: `${(6 / 240) * 100}%`,
	borderRadius: "999px 999px 14px 14px",
}

// Kamienny łuk-portal z gniazdami kryształów — współdzielony wygląd bramy
// (MapScreen i GateReveal). `children` renderują się WE WNĘTRZU portalu
// (ciemne okno z magiczną poświatą); `mist` to wspólna mgiełka tajemnicy nad
// wnętrzem ("on" = stała, "clearing" = znika przy odsłonie) — celowo BEZ
// backdrop-blur: filtr nad animowanym wnętrzem rastruje tło co klatkę, więc
// rozmycie daje blur-[2px] na samym „? ?" u callera. Czysto prezentacyjny.
export function GateArch({
	lit,
	width,
	mist,
	children,
}: {
	lit: number
	width: number
	mist?: "on" | "clearing"
	children?: ReactNode
}) {
	const uid = useId()
	const gemGrad = `gem-${uid}`

	return (
		<div className="relative" style={{ width, height: width * 1.2 }}>
			{/* wnętrze portalu — ciemne okno z magiczną poświatą */}
			<div
				className="absolute flex items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-950"
				style={WINDOW_STYLE}
			>
				<div
					aria-hidden
					className="anim-float absolute -left-4 top-8 h-16 w-16 rounded-full bg-fuchsia-500/40 blur-xl"
				/>
				<div
					aria-hidden
					className="anim-float absolute -right-3 bottom-6 h-20 w-20 rounded-full bg-sky-400/30 blur-xl"
					style={{ animationDelay: "-1.4s" }}
				/>
				{children}
				{mist && (
					<div
						className={`pointer-events-none absolute inset-0 bg-white/15 ${
							mist === "clearing" ? "anim-mist-clear" : ""
						}`}
					/>
				)}
			</div>
			{/* kamienie, filary i klejnoty nad otworem */}
			<svg
				viewBox="0 0 200 240"
				className="pointer-events-none absolute inset-0 h-full w-full"
				aria-hidden="true"
			>
				<defs>
					<linearGradient id={gemGrad} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#fff3b0" />
						<stop offset="55%" stopColor="#ffcf45" />
						<stop offset="100%" stopColor="#f0950e" />
					</linearGradient>
				</defs>
				{PILLAR_BLOCKS.map((b, i) => (
					<rect
						key={i}
						x={b.x}
						y={b.y}
						width={ARCH_R_OUT - ARCH_R_IN}
						height={40}
						rx={7}
						fill={b.row % 2 ? "#8b5cf6" : "#a78bfa"}
						stroke={STONE_OUTLINE}
						strokeWidth={3.5}
					/>
				))}
				{/* płyty fundamentu */}
				<rect
					x={ARCH_CX - ARCH_R_OUT - 6}
					y={228}
					width={42}
					height={11}
					rx={5.5}
					fill="#7c3aed"
					stroke={STONE_OUTLINE}
					strokeWidth={3}
				/>
				<rect
					x={ARCH_CX + ARCH_R_IN - 6}
					y={228}
					width={42}
					height={11}
					rx={5.5}
					fill="#7c3aed"
					stroke={STONE_OUTLINE}
					strokeWidth={3}
				/>
				{ARCH_STONES.map((s, i) => (
					<path
						key={i}
						d={s.d}
						fill={s.fill}
						stroke={STONE_OUTLINE}
						strokeWidth={3.5}
						strokeLinejoin="round"
					/>
				))}
				{GEM_SLOTS.map((g, i) => {
					const isLit = i < lit
					return (
						<g
							key={i}
							transform={`translate(${g.x} ${g.y}) rotate(${g.rot}) scale(0.82) translate(-16 -17)`}
							style={
								isLit
									? { filter: "drop-shadow(0 0 5px rgb(255 200 70 / 0.85))" }
									: undefined
							}
						>
							<GemBody lit={isLit} gradId={gemGrad} />
						</g>
					)
				})}
			</svg>
		</div>
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

			<div className="relative">
				<GateArch
					lit={CRYSTALS}
					width={210}
					mist={revealed ? "clearing" : "on"}
				>
					{revealed ? (
						<div className="anim-pop-in text-6xl font-extrabold text-sunny">
							×{gateFactor(stage)}
						</div>
					) : (
						<div className="text-5xl font-extrabold text-white/80 blur-[2px]">
							? ?
						</div>
					)}
				</GateArch>
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
