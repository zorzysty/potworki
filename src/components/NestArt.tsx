import { type CSSProperties, type ReactNode, useId, useMemo } from "react"

// Gniazdo na ekranie wyklucia: wektorowa miska z plecionych gałązek w idiomie
// artu wioski (gradienty, kontur w ciemniejszym tonie materiału, światło
// z lewej góry). Dwie warstwy SVG w jednym wrapperze: tył (dno + tylny
// brzeg) POD jajkami i przód (przedni brzeg, słoma, listki, piórko) NAD
// nimi, więc jajka wyglądają na zanurzone w gnieździe. Gałązki generowane
// deterministycznie (stały seed) — bogaty splot bez ręcznego rysowania.
// Współrzędne viewBoxu 0..100 = procenty wrappera: sloty jajek (NEST_SLOTS)
// są w tych samych jednostkach, więc HatchScreen pozycjonuje je przez %.

const VW = 400
const VH = 300
const CX = 200
const CY = 145
// wieniec = pas między wewnętrzną (otwór miski) a zewnętrzną elipsą;
// z przodu grubszy niż z tyłu (patrzymy lekko z góry)
const RXI = 138
const RYI = 50
const RXO = 178
const RYO_FRONT = 88
const RYO_BACK = 70

const TWIGS = ["#6B4423", "#8B5A2B", "#A0703C", "#B9834A", "#C99A63"]
const SHADE = ["#4A2E17", "#5C3A1E", "#6B4423", "#7A5030"]

// slot jajka w % wrappera: środek x, dolna krawędź y, szerokość. Kolejność
// od środka na zewnątrz — jajko i zajmuje slot i (wybór to podświetlenie,
// nie przestawianie). Przedni rząd zanurzony w wieńcu (dolna część jajka
// schowana za przednią warstwą), tylny rząd wyżej i za nim.
export interface NestSlot {
	cx: number
	bottom: number
	w: number
	z: number
}
export const NEST_SLOTS: readonly NestSlot[] = [
	{ cx: 41, bottom: 72, w: 21, z: 2 },
	{ cx: 59, bottom: 72, w: 21, z: 2 },
	{ cx: 22, bottom: 70, w: 21, z: 2 },
	{ cx: 78, bottom: 70, w: 21, z: 2 },
	{ cx: 50, bottom: 62, w: 19, z: 1 },
	{ cx: 31, bottom: 61, w: 19, z: 1 },
	{ cx: 69, bottom: 61, w: 19, z: 1 },
	{ cx: 12, bottom: 59, w: 18, z: 1 },
	{ cx: 88, bottom: 59, w: 18, z: 1 },
]

function mulberry(seed: number) {
	let a = seed
	return () => {
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// punkt na wieńcu: kąt a, r ∈ [0,1] od krawędzi wewnętrznej do zewnętrznej
// (poza zakresem = sterczy do środka/na zewnątrz); ryo = zewnętrzna półoś y
const pt = (a: number, r: number, ryo: number) =>
	[
		CX + Math.cos(a) * (RXI + (RXO - RXI) * r),
		CY + Math.sin(a) * (RYI + (ryo - RYI) * r),
	] as const

interface Twig {
	d: string
	w: number
	c: string
}

// gałązki wzdłuż łuku brzegu: krótkie, lekko wygięte łuki na różnych
// promieniach (splot) + co któraś ukośna „przeplatająca" się przez wieniec
function twigs(
	seed: number,
	a0: number,
	a1: number,
	n: number,
	palette: string[],
	ryo: number,
	rMin = -0.05,
	rMax = 1.05,
): Twig[] {
	const rnd = mulberry(seed)
	const out: Twig[] = []
	const band = rMax - rMin
	for (let i = 0; i < n; i++) {
		const a = a0 + (a1 - a0) * ((i + rnd() * 0.8) / n)
		const span = 0.16 + rnd() * 0.3
		const r0 = rMin + rnd() * band
		const r1 = rnd() < 0.35 ? rMin + rnd() * band : r0 + (rnd() - 0.5) * 0.25
		const p0 = pt(a, r0, ryo)
		const p2 = pt(a + span, r1, ryo)
		const m = pt(a + span / 2, (r0 + r1) / 2 + (rnd() - 0.5) * 0.4, ryo)
		out.push({
			d: `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q${m[0].toFixed(1)} ${m[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`,
			w: 2.5 + rnd() * 4,
			c: palette[Math.floor(rnd() * palette.length)] as string,
		})
	}
	return out
}

// źdźbła słomy: cienkie, jasne, sterczące z wieńca na zewnątrz
function straws(
	seed: number,
	a0: number,
	a1: number,
	n: number,
	ryo: number,
): Twig[] {
	const rnd = mulberry(seed)
	const out: Twig[] = []
	for (let i = 0; i < n; i++) {
		const a = a0 + (a1 - a0) * rnd()
		const p0 = pt(a, 0.5 + rnd() * 0.6, ryo)
		const len = 18 + rnd() * 28
		const dir = a + (rnd() - 0.5) * 1.2
		const p2 = [
			p0[0] + Math.cos(dir) * len,
			p0[1] + Math.sin(dir) * len * 0.7,
		] as const
		const m = [
			(p0[0] + p2[0]) / 2 + (rnd() - 0.5) * 12,
			(p0[1] + p2[1]) / 2 - rnd() * 8,
		] as const
		out.push({
			d: `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q${m[0].toFixed(1)} ${m[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`,
			w: 1.4 + rnd() * 1.2,
			c: rnd() < 0.5 ? "#E9C46A" : "#F4D58D",
		})
	}
	return out
}

const Strokes = ({ list, opacity = 1 }: { list: Twig[]; opacity?: number }) => (
	<g fill="none" strokeLinecap="round" opacity={opacity}>
		{list.map((t, i) => (
			<path key={i} d={t.d} stroke={t.c} strokeWidth={t.w} />
		))}
	</g>
)

function Leaf({
	x,
	y,
	rot,
	size = 1,
}: {
	x: number
	y: number
	rot: number
	size?: number
}) {
	return (
		<g transform={`translate(${x} ${y}) rotate(${rot}) scale(${size})`}>
			<path
				d="M0 0 C10 -14 30 -14 40 0 C30 12 10 12 0 0 Z"
				fill="#6BAF4F"
				stroke="#3F7A2E"
				strokeWidth={2}
				strokeLinejoin="round"
			/>
			<path
				d="M3 0 L37 0"
				stroke="#3F7A2E"
				strokeWidth={1.5}
				strokeLinecap="round"
			/>
			<path
				d="M4 -1 C12 -9 24 -10 32 -4"
				stroke="#9BD37F"
				strokeWidth={2}
				strokeLinecap="round"
				fill="none"
			/>
		</g>
	)
}

function Feather({ x, y, rot }: { x: number; y: number; rot: number }) {
	return (
		<g transform={`translate(${x} ${y}) rotate(${rot})`}>
			<path
				d="M0 0 C4 -14 12 -26 22 -34 C34 -40 42 -36 44 -30 C40 -18 28 -6 8 4 Z"
				fill="#FFFFFF"
				stroke="#D8D2E8"
				strokeWidth={1.5}
				strokeLinejoin="round"
			/>
			<g stroke="#E4DFF0" strokeWidth={1.2} strokeLinecap="round" fill="none">
				<path d="M2 0 C14 -12 26 -22 40 -30" />
				<path d="M12 -8 L16 -18 M20 -14 L26 -26 M28 -20 L36 -32" />
			</g>
		</g>
	)
}

const PI = Math.PI
const BACK = twigs(7, PI + 0.05, 2 * PI - 0.05, 40, SHADE, RYO_BACK)
const BACK_LIGHT = twigs(
	9,
	PI + 0.1,
	2 * PI - 0.1,
	14,
	TWIGS,
	RYO_BACK,
	0.2,
	0.9,
)
// korpus miski pod przednim wieńcem: gałązki „opadające" poniżej krawędzi
const BODY = twigs(29, 0.1, PI - 0.1, 36, SHADE, RYO_FRONT + 34, 0.9, 1.05)
const FRONT_DEEP = twigs(11, 0, PI, 40, SHADE, RYO_FRONT)
const FRONT = twigs(13, -0.1, PI + 0.1, 70, TWIGS, RYO_FRONT)
const FRONT_LIGHT = twigs(
	17,
	-0.05,
	PI + 0.05,
	26,
	["#D2A972", "#E0BB86"],
	RYO_FRONT,
	0.1,
	0.8,
)
const STRAW_BACK = straws(19, PI + 0.2, 2 * PI - 0.2, 16, RYO_BACK)
const STRAW_FRONT = straws(23, 0.1, PI - 0.1, 22, RYO_FRONT)

export function NestArt({
	children,
	className = "",
	style,
}: {
	children?: ReactNode
	className?: string
	style?: CSSProperties
}) {
	const uid = useId()
	const ids = useMemo(
		() => ({ bowl: `nest-bowl-${uid}`, rim: `nest-rim-${uid}` }),
		[uid],
	)
	const box = `0 0 ${VW} ${VH}`
	return (
		<div
			className={`relative w-full ${className}`}
			style={{ aspectRatio: `${VW} / ${VH}`, ...style }}
		>
			{/* TYŁ: dno miski + tylny brzeg (w cieniu) */}
			<svg
				viewBox={box}
				className="absolute inset-0 h-full w-full"
				aria-hidden="true"
			>
				<defs>
					<radialGradient id={ids.bowl} cx="50%" cy="35%" r="65%">
						<stop offset="0%" stopColor="#5C3A1E" />
						<stop offset="70%" stopColor="#3E2613" />
						<stop offset="100%" stopColor="#2A1A0C" />
					</radialGradient>
				</defs>
				{/* cień pod gniazdem */}
				<ellipse
					cx={CX}
					cy={CY + RYO_FRONT + 36}
					rx={RXO}
					ry={24}
					fill="#00000055"
				/>
				{/* tylny wieniec (w cieniu) */}
				<path
					d={`M${CX - RXO} ${CY} A${RXO} ${RYO_BACK} 0 0 1 ${CX + RXO} ${CY} L${CX + RXI} ${CY} A${RXI} ${RYI} 0 0 0 ${CX - RXI} ${CY} Z`}
					fill="#4A2E17"
				/>
				<Strokes list={BACK} />
				<Strokes list={BACK_LIGHT} opacity={0.6} />
				<Strokes list={STRAW_BACK} opacity={0.7} />
				{/* dno gniazda */}
				<ellipse cx={CX} cy={CY} rx={RXI} ry={RYI} fill={`url(#${ids.bowl})`} />
				{/* mech i słoma na dnie */}
				<g fill="none" strokeLinecap="round" opacity={0.55}>
					<path
						d="M100 135 Q140 125 176 137"
						stroke="#E9C46A"
						strokeWidth={2}
					/>
					<path
						d="M226 131 Q262 121 300 135"
						stroke="#F4D58D"
						strokeWidth={2}
					/>
					<path
						d="M130 159 Q200 145 270 161"
						stroke="#C99A63"
						strokeWidth={2.5}
					/>
					<path
						d="M160 171 Q200 181 244 169"
						stroke="#8B5A2B"
						strokeWidth={2.5}
					/>
				</g>
			</svg>

			{/* JAJKA — pozycjonowane przez HatchScreen wg NEST_SLOTS */}
			{children}

			{/* PRZÓD: przedni wieniec nad jajkami */}
			<svg
				viewBox={box}
				className="pointer-events-none absolute inset-0 h-full w-full"
				aria-hidden="true"
				style={{ zIndex: 10 }}
			>
				<defs>
					<linearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" stopColor="#A0703C" />
						<stop offset="100%" stopColor="#6B4423" />
					</linearGradient>
				</defs>
				{/* korpus miski pod wieńcem */}
				<path
					d={`M${CX - RXO} ${CY} A${RXO} ${RYO_FRONT + 34} 0 0 0 ${CX + RXO} ${CY} A${RXO} ${RYO_FRONT} 0 0 1 ${CX - RXO} ${CY} Z`}
					fill="#3E2613"
				/>
				<Strokes list={BODY} opacity={0.9} />
				{/* przedni wieniec */}
				<path
					d={`M${CX - RXO} ${CY} A${RXO} ${RYO_FRONT} 0 0 0 ${CX + RXO} ${CY} L${CX + RXI} ${CY} A${RXI} ${RYI} 0 0 1 ${CX - RXI} ${CY} Z`}
					fill={`url(#${ids.rim})`}
				/>
				<Strokes list={FRONT_DEEP} />
				<Strokes list={FRONT} />
				<Strokes list={FRONT_LIGHT} opacity={0.75} />
				<Strokes list={STRAW_FRONT} opacity={0.9} />
				{/* sterczące gałązki po bokach */}
				<g fill="none" stroke="#6B4423" strokeWidth={3.5} strokeLinecap="round">
					<path d="M30 157 C12 143 6 127 10 111" />
					<path d="M14 129 C6 125 2 119 2 111" />
					<path d="M370 155 C388 143 394 129 390 113" />
					<path d="M388 129 C396 125 398 117 398 109" />
					<path d="M60 221 C44 231 30 235 20 231" />
					<path d="M340 223 C356 233 370 237 380 233" />
				</g>
				<Leaf x={356} y={185} rot={-30} size={0.95} />
				<Leaf x={40} y={179} rot={200} size={0.85} />
				<Leaf x={292} y={225} rot={14} size={0.75} />
				<Leaf x={92} y={231} rot={172} size={0.65} />
				<Feather x={150} y={258} rot={-8} />
			</svg>
		</div>
	)
}
