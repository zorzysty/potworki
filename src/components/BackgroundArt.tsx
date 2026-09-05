import type { CSSProperties, ReactNode } from "react"
import type { CosmeticId } from "../game/cosmetics"

// Scenki teł potworków (slot "background"): wektorowe SVG 200×200 rysowane
// ZA potworkiem — pełne okno na karcie kolekcji, cały kafel na liście,
// u przyjaciela na Home i jako miniatura w Sklepiku. Konwencje jak w arcie
// wioski: zero emoji, światło z lewej góry, kontur w ciemniejszym tonie.
// Kontener przycina scenę (`slice`), więc najważniejsze elementy siedzą
// w środkowych ~60% viewBoxu — brzegi mogą zniknąć na wąskim/szerokim kaflu.
// Nowe tło = wpis w cosmetics.ts + scena tutaj (SCENES).

export interface SceneProps {
	animate: boolean
	uid: string // prefiks id gradientów/clipów — na liście jest wiele instancji
}

// Ruch = klasy anim-* ze styles.css (transform/opacity); transform-box, bo
// bez niego transform na <g> liczy się od (0,0) całego SVG.
function Anim({
	on,
	cls = "anim-float",
	delay = 0,
	children,
}: {
	on: boolean
	cls?: "anim-float" | "anim-sparkle"
	delay?: number
	children: ReactNode
}) {
	const style: CSSProperties = {
		transformBox: "fill-box",
		transformOrigin: "center",
		animationDelay: `${delay}s`,
	}
	return (
		<g className={on ? cls : undefined} style={style}>
			{children}
		</g>
	)
}

// Czteroramienna gwiazdka (noc, kosmos).
function Star4({
	x,
	y,
	r,
	fill = "#fff",
}: {
	x: number
	y: number
	r: number
	fill?: string
}) {
	const k = r * 0.28
	return (
		<path
			d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r}Z`}
			fill={fill}
		/>
	)
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff">
			<ellipse cx={0} cy={0} rx={18} ry={8} />
			<circle cx={-7} cy={-4} r={8} />
			<circle cx={5} cy={-7} r={10} />
			<ellipse cx={0} cy={3} rx={18} ry={5} fill="#e0f2fe" />
		</g>
	)
}

function Daisy({
	x,
	y,
	petal = "#fff",
	heart = "#fbbf24",
}: {
	x: number
	y: number
	petal?: string
	heart?: string
}) {
	return (
		<g transform={`translate(${x} ${y})`}>
			<path d="M0 0 v14" stroke="#15803d" strokeWidth={2} />
			{[0, 60, 120, 180, 240, 300].map((a) => (
				<ellipse
					key={a}
					cx={0}
					cy={-4.5}
					rx={2.2}
					ry={4.5}
					fill={petal}
					transform={`rotate(${a})`}
				/>
			))}
			<circle r={2.6} fill={heart} />
		</g>
	)
}

function Tulip({ x, y, fill }: { x: number; y: number; fill: string }) {
	return (
		<g transform={`translate(${x} ${y})`}>
			<path d="M0 0 v16" stroke="#15803d" strokeWidth={2} />
			<path d="M-2 8 q-6 -2 -6 -8 q4 2 6 8" fill="#22c55e" />
			<path d="M-5 -2 q0 -9 5 -9 q5 0 5 9 q0 4 -5 4 q-5 0 -5 -4Z" fill={fill} />
			<path
				d="M-3 -3 l3 -5 l3 5"
				fill="none"
				stroke="#fff"
				strokeOpacity={0.4}
				strokeWidth={1.2}
			/>
		</g>
	)
}

function Meadow({ animate, uid }: SceneProps) {
	const sky = `${uid}-sky`
	const rainbow = [
		"#f87171",
		"#fb923c",
		"#fde047",
		"#4ade80",
		"#60a5fa",
		"#a78bfa",
	]
	return (
		<>
			<defs>
				<linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#38bdf8" />
					<stop offset="0.7" stopColor="#bae6fd" />
					<stop offset="1" stopColor="#e0f2fe" />
				</linearGradient>
			</defs>
			<rect width={200} height={200} fill={`url(#${sky})`} />
			{/* słońce z lewej góry */}
			<Anim on={animate} cls="anim-sparkle">
				<circle cx={38} cy={40} r={26} fill="#fef08a" opacity={0.45} />
			</Anim>
			<circle
				cx={38}
				cy={40}
				r={15}
				fill="#fde047"
				stroke="#f59e0b"
				strokeWidth={2}
			/>
			{/* tęcza za wzgórzami */}
			<g fill="none" strokeWidth={3.5} opacity={0.55}>
				{rainbow.map((c, i) => (
					<path
						key={c}
						d={`M${95 - i * 3.5} 130 A${65 - i * 3.5} ${65 - i * 3.5} 0 0 1 ${225 + i * 3.5} 130`}
						stroke={c}
					/>
				))}
			</g>
			<Anim on={animate} delay={0.4}>
				<Cloud x={132} y={38} s={1.1} />
			</Anim>
			<Anim on={animate} delay={1.4}>
				<Cloud x={70} y={72} s={0.7} />
			</Anim>
			{/* wzgórza: tył → przód, coraz ciemniejsze */}
			<path d="M0 118 Q50 88 105 112 T200 104 V200 H0Z" fill="#86efac" />
			<path d="M0 138 Q60 114 110 136 T200 128 V200 H0Z" fill="#4ade80" />
			<path d="M0 168 Q100 154 200 170 V200 H0Z" fill="#22c55e" />
			{/* kępki trawy */}
			<g fill="none" stroke="#15803d" strokeWidth={2} strokeLinecap="round">
				{[22, 58, 96, 138, 172].map((x) => (
					<path
						key={x}
						d={`M${x} 164 l-3 -8 M${x} 164 l0 -10 M${x} 164 l3 -8`}
					/>
				))}
			</g>
			{/* kwiaty */}
			<Daisy x={30} y={146} />
			<Daisy x={168} y={142} petal="#fbcfe8" heart="#f472b6" />
			<Daisy x={112} y={154} petal="#fff" />
			<Tulip x={56} y={150} fill="#f43f5e" />
			<Tulip x={150} y={154} fill="#fb923c" />
			<Tulip x={86} y={142} fill="#c084fc" />
			{/* motyl */}
			<Anim on={animate} delay={0.8}>
				<g transform="translate(150 96) rotate(-12)">
					<ellipse
						cx={-6}
						cy={-2}
						rx={6}
						ry={4.5}
						fill="#fb7185"
						stroke="#be123c"
						strokeWidth={1}
					/>
					<ellipse
						cx={6}
						cy={-2}
						rx={6}
						ry={4.5}
						fill="#fb7185"
						stroke="#be123c"
						strokeWidth={1}
					/>
					<ellipse
						cx={-4.5}
						cy={3.5}
						rx={4}
						ry={3}
						fill="#fdba74"
						stroke="#be123c"
						strokeWidth={1}
					/>
					<ellipse
						cx={4.5}
						cy={3.5}
						rx={4}
						ry={3}
						fill="#fdba74"
						stroke="#be123c"
						strokeWidth={1}
					/>
					<rect
						x={-1.2}
						y={-6}
						width={2.4}
						height={11}
						rx={1.2}
						fill="#5f45c4"
					/>
					<path
						d="M-1 -6 l-3 -4 M1 -6 l3 -4"
						stroke="#5f45c4"
						strokeWidth={1}
					/>
				</g>
			</Anim>
			{/* pszczółka */}
			<Anim on={animate} delay={1.9}>
				<g transform="translate(58 116)">
					<ellipse
						cx={-2}
						cy={-4}
						rx={4}
						ry={2.5}
						fill="#e0f2fe"
						opacity={0.9}
					/>
					<ellipse
						cx={3}
						cy={-4}
						rx={4}
						ry={2.5}
						fill="#e0f2fe"
						opacity={0.9}
					/>
					<ellipse
						rx={6}
						ry={4}
						fill="#fde047"
						stroke="#713f12"
						strokeWidth={1}
					/>
					<path d="M-2 -4 v8 M2 -4 v8" stroke="#713f12" strokeWidth={1.5} />
				</g>
			</Anim>
		</>
	)
}

const NIGHT_STARS = [
	[14, 22, 1.4],
	[34, 58, 1],
	[52, 18, 1.8],
	[78, 40, 1.2],
	[96, 14, 1],
	[118, 52, 1.4],
	[170, 90, 1],
	[186, 30, 1.6],
	[60, 84, 1],
	[150, 110, 1.2],
	[26, 100, 1],
	[110, 90, 1],
	[190, 60, 1],
	[8, 70, 1.2],
	[88, 66, 1.4],
	[40, 36, 1],
] as const
const FIREFLIES = [
	[36, 150, 0],
	[150, 158, 0.5],
	[92, 168, 1],
	[178, 140, 1.5],
	[60, 176, 0.3],
	[124, 146, 0.9],
] as const

const MOON = "M140.6 31.05 A19 19 0 1 0 159.8 56.65 A16 16 0 1 1 140.6 31.05Z"

function Night({ animate, uid }: SceneProps) {
	const sky = `${uid}-nsky`
	const tail = `${uid}-tail`
	return (
		<>
			<defs>
				<linearGradient
					id={sky}
					x1="0"
					y1="0"
					x2="0"
					y2="200"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0" stopColor="#0f0a2e" />
					<stop offset="0.6" stopColor="#312e81" />
					<stop offset="1" stopColor="#6d28d9" />
				</linearGradient>
				<linearGradient id={tail} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#fff" stopOpacity={0} />
					<stop offset="1" stopColor="#fff" />
				</linearGradient>
			</defs>
			<rect width={200} height={200} fill={`url(#${sky})`} />
			{NIGHT_STARS.map(([x, y, r], i) =>
				i % 4 === 0 ? (
					<Anim
						key={`${x}-${y}`}
						on={animate}
						cls="anim-sparkle"
						delay={(i % 5) * 0.3}
					>
						<Star4 x={x} y={y} r={r * 2.6} />
					</Anim>
				) : (
					<circle
						key={`${x}-${y}`}
						cx={x}
						cy={y}
						r={r}
						fill="#fff"
						opacity={0.9}
					/>
				),
			)}
			{/* spadająca gwiazda */}
			<Anim on={animate} cls="anim-sparkle" delay={0.7}>
				<path
					d="M40 66 L88 40"
					stroke={`url(#${tail})`}
					strokeWidth={2.5}
					strokeLinecap="round"
				/>
				<Star4 x={88} y={40} r={4} fill="#fef9c3" />
			</Anim>
			{/* księżyc: sierp jako ścieżka (przecięcie koła r19 i wycięcia r16),
			    poświata = gruby obrys tej samej ścieżki — trzyma kształt sierpa */}
			<g strokeLinejoin="round">
				<path
					d={MOON}
					fill="none"
					stroke="#fde68a"
					strokeWidth={22}
					opacity={0.1}
				/>
				<path
					d={MOON}
					fill="none"
					stroke="#fde68a"
					strokeWidth={10}
					opacity={0.16}
				/>
				<path d={MOON} fill="#fef3c7" />
			</g>
			{/* wzgórza i las — sylwetki */}
			<path d="M0 132 Q50 108 100 128 T200 118 V200 H0Z" fill="#1e1b4b" />
			<g fill="#0b0a24">
				{[
					[22, 128],
					[48, 122],
					[160, 118],
					[184, 124],
				].map(([x, y]) => (
					<path key={x} d={`M${x} ${y} l-9 18 h5 l-8 16 h24 l-8 -16 h5 Z`} />
				))}
			</g>
			<path d="M0 158 Q60 138 110 156 T200 148 V200 H0Z" fill="#0b0a24" />
			{/* domek z zapalonym oknem */}
			<g transform="translate(118 138)">
				<rect x={-11} y={0} width={22} height={16} fill="#1e1b4b" />
				<path d="M-14 0 L0 -12 L14 0Z" fill="#2e1065" />
				<rect x={-4} y={4} width={8} height={7} rx={1} fill="#fde047" />
				<rect x={5} y={-9} width={4} height={7} fill="#1e1b4b" />
			</g>
			{/* świetliki */}
			{FIREFLIES.map(([x, y, d]) => (
				<Anim key={`${x}-${y}`} on={animate} cls="anim-sparkle" delay={d}>
					<circle cx={x} cy={y} r={4} fill="#fde047" opacity={0.3} />
					<circle cx={x} cy={y} r={1.6} fill="#fef9c3" />
				</Anim>
			))}
		</>
	)
}

function Fish({
	x,
	y,
	s = 1,
	body,
	flip = false,
}: {
	x: number
	y: number
	s?: number
	body: string
	flip?: boolean
}) {
	return (
		<g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
			<path d="M12 0 l8 -7 v14Z" fill={body} stroke="#7c2d12" strokeWidth={1} />
			<ellipse rx={13} ry={8} fill={body} stroke="#7c2d12" strokeWidth={1} />
			<path
				d="M-2 -8 q3 8 0 16"
				stroke="#fff"
				strokeOpacity={0.6}
				strokeWidth={2.5}
				fill="none"
			/>
			<circle cx={-7} cy={-2} r={2.4} fill="#fff" />
			<circle cx={-7.6} cy={-2} r={1.2} fill="#1e293b" />
			<path d="M-4 5 q4 3 8 0" stroke="#7c2d12" strokeWidth={1} fill="none" />
		</g>
	)
}

const BUBBLES = [
	[28, 60, 3, 0],
	[40, 40, 2, 0.6],
	[162, 74, 4, 0.3],
	[172, 50, 2.4, 1.1],
	[100, 30, 2.6, 0.9],
	[150, 120, 2, 1.6],
] as const

function Underwater({ animate, uid }: SceneProps) {
	const water = `${uid}-water`
	return (
		<>
			<defs>
				<linearGradient id={water} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#67e8f9" />
					<stop offset="0.55" stopColor="#0ea5e9" />
					<stop offset="1" stopColor="#075985" />
				</linearGradient>
			</defs>
			<rect width={200} height={200} fill={`url(#${water})`} />
			{/* smugi światła z góry */}
			<g fill="#fff" opacity={0.16}>
				<path d="M40 0 h26 L92 200 H30Z" />
				<path d="M96 0 h14 L150 200 h-36Z" />
				<path d="M150 0 h20 L200 120 V60Z" />
			</g>
			{/* piasek z falkami */}
			<path d="M0 154 Q50 144 100 154 T200 148 V200 H0Z" fill="#fcd34d" />
			<g
				fill="none"
				stroke="#f59e0b"
				strokeWidth={1.5}
				strokeOpacity={0.5}
				strokeLinecap="round"
			>
				<path d="M20 170 q8 -4 16 0" />
				<path d="M96 176 q8 -4 16 0" />
				<path d="M156 168 q8 -4 16 0" />
			</g>
			{/* wodorosty */}
			<g fill="none" strokeWidth={5} strokeLinecap="round">
				<Anim on={animate} delay={0.2}>
					<path d="M22 160 q10 -14 0 -28 q-10 -14 0 -28" stroke="#16a34a" />
				</Anim>
				<Anim on={animate} delay={1}>
					<path
						d="M36 164 q-8 -12 0 -24 q8 -12 0 -24"
						stroke="#22c55e"
						strokeWidth={4}
					/>
				</Anim>
				<Anim on={animate} delay={0.6}>
					<path d="M178 158 q10 -14 0 -28 q-10 -14 0 -28" stroke="#16a34a" />
				</Anim>
			</g>
			{/* koralowce */}
			<g fill="none" stroke="#f472b6" strokeWidth={6} strokeLinecap="round">
				<path d="M150 160 v-22 M150 148 l-9 -9 M150 144 l10 -12 M141 139 l-4 -8" />
			</g>
			<g fill="#fb923c" stroke="#c2410c" strokeWidth={1}>
				<ellipse cx={68} cy={158} rx={14} ry={8} />
				<path d="M56 158 q6 -6 12 0 t12 0" fill="none" />
				<path d="M60 153 q4 -4 8 0 t8 0" fill="none" />
			</g>
			{/* rozgwiazda i muszla */}
			<g
				transform="translate(118 164) rotate(15)"
				fill="#f87171"
				stroke="#b91c1c"
				strokeWidth={1}
			>
				<path d="M0 -9 L2.6 -3 L9 -2.6 L4.2 1.8 L5.6 8 L0 4.6 L-5.6 8 L-4.2 1.8 L-9 -2.6 L-2.6 -3Z" />
			</g>
			<g transform="translate(94 166)">
				<path
					d="M-8 3 a8 8 0 0 1 16 0Z"
					fill="#fde68a"
					stroke="#d97706"
					strokeWidth={1}
				/>
				<path
					d="M0 3 v-8 M-5 3 l-2 -6 M5 3 l2 -6"
					stroke="#d97706"
					strokeWidth={1}
				/>
			</g>
			{/* ryby */}
			<Anim on={animate} delay={0.3}>
				<Fish x={60} y={84} body="#fb923c" />
			</Anim>
			<Anim on={animate} delay={1.3}>
				<Fish x={148} y={112} s={0.7} body="#facc15" flip />
			</Anim>
			<Anim on={animate} delay={0.9}>
				<Fish x={118} y={56} s={0.55} body="#60a5fa" />
			</Anim>
			{/* meduza */}
			<Anim on={animate} delay={1.7}>
				<g transform="translate(34 112)">
					<path
						d="M-12 0 a12 12 0 0 1 24 0 q-4 3 -8 0 q-4 3 -8 0 q-4 3 -8 0Z"
						fill="#f9a8d4"
						opacity={0.9}
					/>
					<circle cx={-4} cy={-4} r={1.6} fill="#fff" opacity={0.8} />
					<path
						d="M-7 2 q2 8 -2 14 M0 3 q-2 8 2 14 M7 2 q2 8 -2 14"
						fill="none"
						stroke="#f9a8d4"
						strokeWidth={1.6}
					/>
				</g>
			</Anim>
			{/* bąbelki */}
			{BUBBLES.map(([x, y, r, d]) => (
				<Anim key={`${x}-${y}`} on={animate} delay={d}>
					<circle
						cx={x}
						cy={y}
						r={r}
						fill="#fff"
						fillOpacity={0.25}
						stroke="#fff"
						strokeOpacity={0.8}
						strokeWidth={1}
					/>
				</Anim>
			))}
		</>
	)
}

const SPACE_STARS = [
	[12, 18, 1.2],
	[30, 70, 1],
	[56, 24, 1.6],
	[82, 56, 1],
	[104, 18, 1.4],
	[128, 84, 1],
	[150, 26, 1.8],
	[176, 62, 1.2],
	[190, 130, 1],
	[20, 128, 1.4],
	[60, 150, 1],
	[96, 176, 1.2],
	[140, 172, 1],
	[186, 180, 1.5],
	[70, 104, 1],
	[166, 150, 1],
	[8, 92, 1],
	[44, 184, 1.2],
] as const

function Cosmos({ animate, uid }: SceneProps) {
	const sky = `${uid}-space`
	const neb1 = `${uid}-neb1`
	const neb2 = `${uid}-neb2`
	const ringClip = `${uid}-ring`
	return (
		<>
			<defs>
				<linearGradient id={sky} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#0b0f2a" />
					<stop offset="0.55" stopColor="#2e1065" />
					<stop offset="1" stopColor="#581c87" />
				</linearGradient>
				<radialGradient id={neb1}>
					<stop offset="0" stopColor="#f472b6" stopOpacity={0.45} />
					<stop offset="1" stopColor="#f472b6" stopOpacity={0} />
				</radialGradient>
				<radialGradient id={neb2}>
					<stop offset="0" stopColor="#38bdf8" stopOpacity={0.4} />
					<stop offset="1" stopColor="#38bdf8" stopOpacity={0} />
				</radialGradient>
				<clipPath id={ringClip}>
					<rect x={90} y={96} width={90} height={60} />
				</clipPath>
			</defs>
			<rect width={200} height={200} fill={`url(#${sky})`} />
			{/* mgławice */}
			<ellipse cx={60} cy={60} rx={70} ry={50} fill={`url(#${neb1})`} />
			<ellipse cx={150} cy={150} rx={70} ry={55} fill={`url(#${neb2})`} />
			{SPACE_STARS.map(([x, y, r], i) =>
				i % 3 === 0 ? (
					<Anim
						key={`${x}-${y}`}
						on={animate}
						cls="anim-sparkle"
						delay={(i % 4) * 0.35}
					>
						<Star4 x={x} y={y} r={r * 2.4} />
					</Anim>
				) : (
					<circle
						key={`${x}-${y}`}
						cx={x}
						cy={y}
						r={r}
						fill="#fff"
						opacity={0.9}
					/>
				),
			)}
			{/* planeta z pierścieniem: tylna połowa pierścienia → kula → przednia połowa */}
			<g transform="translate(135 100)">
				<ellipse
					rx={40}
					ry={11}
					fill="none"
					stroke="#fde68a"
					strokeWidth={5}
					transform="rotate(-18)"
				/>
			</g>
			<circle
				cx={135}
				cy={100}
				r={22}
				fill="#c084fc"
				stroke="#6d28d9"
				strokeWidth={2}
			/>
			<g fill="#a855f7" opacity={0.8}>
				<path d="M116 92 q19 -6 38 0 q-19 6 -38 0Z" />
				<path d="M114 106 q21 -5 42 0 q-21 6 -42 0Z" />
			</g>
			<circle cx={127} cy={91} r={5} fill="#fff" opacity={0.35} />
			<g clipPath={`url(#${ringClip})`} transform="translate(135 100)">
				<ellipse
					rx={40}
					ry={11}
					fill="none"
					stroke="#fde68a"
					strokeWidth={5}
					transform="rotate(-18)"
				/>
			</g>
			{/* mała zielona planetka */}
			<circle
				cx={40}
				cy={132}
				r={12}
				fill="#34d399"
				stroke="#047857"
				strokeWidth={2}
			/>
			<g fill="#059669">
				<circle cx={36} cy={128} r={3} />
				<circle cx={44} cy={136} r={2.2} />
				<circle cx={45} cy={126} r={1.5} />
			</g>
			{/* rakieta */}
			<Anim on={animate} delay={0.5}>
				<g transform="translate(66 78) rotate(-35)">
					<path
						d="M-6 6 l-6 10 h6Z M6 6 l6 10 h-6Z"
						fill="#f43f5e"
						stroke="#9f1239"
						strokeWidth={1}
					/>
					<path
						d="M-7 8 v-14 q0 -16 7 -22 q7 6 7 22 v14Z"
						fill="#f8fafc"
						stroke="#475569"
						strokeWidth={1.4}
					/>
					<path
						d="M-7 -6 q0 -16 7 -22 q7 6 7 22Z"
						fill="#f43f5e"
						stroke="#9f1239"
						strokeWidth={1}
					/>
					<circle
						cy={-2}
						r={3.6}
						fill="#38bdf8"
						stroke="#0369a1"
						strokeWidth={1.4}
					/>
					<path d="M-4 10 q4 12 8 0Z" fill="#fb923c" />
					<path d="M-2 10 q2 7 4 0Z" fill="#fde047" />
				</g>
			</Anim>
			{/* kometa */}
			<Anim on={animate} cls="anim-sparkle" delay={1.1}>
				<path
					d="M156 178 L184 156"
					stroke="#bae6fd"
					strokeWidth={3}
					strokeLinecap="round"
					opacity={0.6}
				/>
				<circle cx={156} cy={178} r={4} fill="#e0f2fe" />
			</Anim>
		</>
	)
}

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			<rect x={-2.5} y={-2} width={5} height={8} fill="#7c4a1e" />
			<path
				d="M0 -40 L14 -18 H-14Z M0 -30 L17 -6 H-17Z M0 -18 L20 6 H-20Z"
				fill="#15803d"
			/>
			<path
				d="M0 -40 L9 -26 H-9Z M0 -30 L6 -22 H-6Z"
				fill="#dcfce7"
				opacity={0.9}
			/>
			<path
				d="M-17 -6 q8 -3 17 0 q9 -3 17 0"
				fill="none"
				stroke="#f0f9ff"
				strokeWidth={3}
				strokeLinecap="round"
			/>
		</g>
	)
}

const SNOWFLAKES = [
	[20, 30, 2.2, 0],
	[60, 14, 1.6, 0.5],
	[104, 40, 2.6, 1],
	[150, 20, 1.8, 1.5],
	[184, 70, 2.2, 0.3],
	[40, 90, 1.6, 0.8],
	[130, 76, 1.8, 1.2],
	[88, 110, 2, 1.9],
] as const

function Winter({ animate, uid }: SceneProps) {
	const sky = `${uid}-wsky`
	return (
		<>
			<defs>
				<linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#7dd3fc" />
					<stop offset="0.6" stopColor="#dbeafe" />
					<stop offset="1" stopColor="#f0f9ff" />
				</linearGradient>
			</defs>
			<rect width={200} height={200} fill={`url(#${sky})`} />
			{/* blade zimowe słońce */}
			<circle cx={40} cy={40} r={22} fill="#fef9c3" opacity={0.5} />
			<circle cx={40} cy={40} r={12} fill="#fef3c7" />
			{/* góry w oddali */}
			<path
				d="M0 120 L36 70 L62 104 L96 56 L134 106 L160 78 L200 118 V200 H0Z"
				fill="#93c5fd"
			/>
			<path
				d="M36 70 L48 86 L26 86Z M96 56 L110 74 L82 74Z M160 78 L170 92 L150 92Z"
				fill="#f0f9ff"
			/>
			{/* śnieżne wzgórza z niebieskim cieniem */}
			<path d="M0 134 Q60 112 110 132 T200 124 V200 H0Z" fill="#e0f2fe" />
			<path d="M0 158 Q50 138 100 156 T200 150 V200 H0Z" fill="#fff" />
			<path
				d="M0 158 Q50 138 100 156 T200 150 V158 Q150 148 100 162 T0 166Z"
				fill="#bfdbfe"
				opacity={0.5}
			/>
			<Pine x={28} y={150} s={0.85} />
			<Pine x={176} y={146} s={1} />
			<Pine x={150} y={158} s={0.6} />
			{/* bałwanek */}
			<g transform="translate(62 150)">
				<circle cy={2} r={12} fill="#fff" stroke="#93c5fd" strokeWidth={1.4} />
				<circle cy={-14} r={9} fill="#fff" stroke="#93c5fd" strokeWidth={1.4} />
				<circle cy={-28} r={7} fill="#fff" stroke="#93c5fd" strokeWidth={1.4} />
				<rect x={-6} y={-40} width={12} height={2.5} fill="#1e293b" />
				<rect x={-4} y={-46} width={8} height={7} fill="#1e293b" />
				<path d="M-9 -22 q9 6 18 0 l-2 6 q-7 -3 -14 0Z" fill="#f43f5e" />
				<circle cx={-2.5} cy={-30} r={1.1} fill="#1e293b" />
				<circle cx={2.5} cy={-30} r={1.1} fill="#1e293b" />
				<path d="M0 -28 l7 1.5 l-7 1.5Z" fill="#fb923c" />
				<circle cy={-16} r={1.2} fill="#1e293b" />
				<circle cy={-11} r={1.2} fill="#1e293b" />
				<path
					d="M-9 -14 l-10 -6 M9 -14 l10 -6"
					stroke="#7c4a1e"
					strokeWidth={1.6}
					strokeLinecap="round"
				/>
			</g>
			{/* płatki śniegu */}
			{SNOWFLAKES.map(([x, y, r, d]) => (
				<Anim key={`${x}-${y}`} on={animate} delay={d}>
					<g
						transform={`translate(${x} ${y})`}
						stroke="#fff"
						strokeWidth={r * 0.45}
						strokeLinecap="round"
					>
						<path
							d={`M0 ${-r * 1.6} V${r * 1.6} M${-r * 1.4} ${-r * 0.8} L${r * 1.4} ${r * 0.8} M${-r * 1.4} ${r * 0.8} L${r * 1.4} ${-r * 0.8}`}
						/>
					</g>
				</Anim>
			))}
			{/* iskrzenie śniegu */}
			{(
				[
					[100, 168],
					[136, 174],
					[20, 176],
				] as const
			).map(([x, y], i) => (
				<Anim key={`${x}-${y}`} on={animate} cls="anim-sparkle" delay={i * 0.5}>
					<Star4 x={x} y={y} r={3} fill="#bae6fd" />
				</Anim>
			))}
		</>
	)
}

function Lollipop({
	x,
	y,
	s = 1,
	color,
}: {
	x: number
	y: number
	s?: number
	color: string
}) {
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			<rect
				x={-1.5}
				y={0}
				width={3}
				height={24}
				fill="#fff"
				stroke="#e5e7eb"
				strokeWidth={0.6}
			/>
			<circle r={10} fill={color} stroke="#9d174d" strokeWidth={1.2} />
			<path
				d="M0 0 m-7 0 a7 7 0 0 1 14 0 a5 5 0 0 1 -10 0 a3 3 0 0 1 6 0"
				fill="none"
				stroke="#fff"
				strokeWidth={2}
				strokeLinecap="round"
			/>
		</g>
	)
}

const SPRINKLES = [
	[24, 44, "#f472b6", 20, 0],
	[60, 24, "#60a5fa", -30, 0.4],
	[92, 52, "#fde047", 60, 0.9],
	[150, 30, "#4ade80", -15, 1.3],
	[180, 90, "#f472b6", 40, 0.6],
	[40, 96, "#fb923c", -50, 1.7],
] as const

function Candy({ animate, uid }: SceneProps) {
	const sky = `${uid}-csky`
	return (
		<>
			<defs>
				<linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#f9a8d4" />
					<stop offset="0.6" stopColor="#fce7f3" />
					<stop offset="1" stopColor="#fdf2f8" />
				</linearGradient>
			</defs>
			<rect width={200} height={200} fill={`url(#${sky})`} />
			{/* chmurki z waty cukrowej */}
			<Anim on={animate} delay={0.3}>
				<g fill="#fbcfe8">
					<ellipse cx={140} cy={40} rx={20} ry={9} />
					<circle cx={132} cy={35} r={9} />
					<circle cx={146} cy={32} r={11} />
				</g>
			</Anim>
			<Anim on={animate} delay={1.2}>
				<g fill="#ddd6fe">
					<ellipse cx={54} cy={60} rx={15} ry={7} />
					<circle cx={48} cy={56} r={7} />
					<circle cx={58} cy={53} r={8} />
				</g>
			</Anim>
			{/* pączek-słońce */}
			<g transform="translate(36 48)">
				<circle r={16} fill="#fbbf24" stroke="#b45309" strokeWidth={1.4} />
				<path
					d="M-14 -4 q6 -14 20 -10 q12 4 8 16 q-6 12 -20 6 q-12 -6 -8 -12Z"
					fill="#f472b6"
				/>
				<circle
					r={5}
					fill={`url(#${sky})`}
					stroke="#b45309"
					strokeWidth={1.4}
				/>
				<g stroke="#fff" strokeWidth={1.6} strokeLinecap="round">
					<path d="M-8 -6 l3 -2 M4 -10 l3 1 M8 2 l1 3 M-6 6 l3 1" />
				</g>
			</g>
			{/* wzgórza z miętowych pasków i czekolady */}
			<path d="M0 126 Q60 100 110 122 T200 112 V200 H0Z" fill="#a7f3d0" />
			<path
				d="M0 126 Q60 100 110 122 T200 112 V118 Q150 108 110 128 T0 132Z"
				fill="#6ee7b7"
				opacity={0.7}
			/>
			<path d="M0 140 Q50 122 100 140 T200 134 V200 H0Z" fill="#fda4af" />
			<path d="M0 158 Q100 142 200 160 V200 H0Z" fill="#92400e" />
			<path d="M0 158 Q100 142 200 160 V166 Q100 148 0 164Z" fill="#b45309" />
			{/* lizaki */}
			<Lollipop x={30} y={136} color="#f472b6" />
			<Lollipop x={172} y={132} s={0.85} color="#a78bfa" />
			{/* laska cukrowa */}
			<g transform="translate(92 140)">
				<path
					d="M0 22 V-8 a6 6 0 0 1 12 0"
					fill="none"
					stroke="#fff"
					strokeWidth={5}
					strokeLinecap="round"
				/>
				<path
					d="M0 22 V-8 a6 6 0 0 1 12 0"
					fill="none"
					stroke="#ef4444"
					strokeWidth={5}
					strokeLinecap="round"
					strokeDasharray="4 4"
				/>
			</g>
			{/* babeczka */}
			<g transform="translate(140 148)">
				<path
					d="M-10 0 L-8 12 H8 L10 0Z"
					fill="#fbbf24"
					stroke="#b45309"
					strokeWidth={1}
				/>
				<path d="M-6 2 v9 M0 2 v9 M6 2 v9" stroke="#b45309" strokeWidth={0.8} />
				<path
					d="M-12 0 q4 -12 12 -8 q8 -4 12 8Z"
					fill="#fce7f3"
					stroke="#be185d"
					strokeWidth={1}
				/>
				<circle cy={-8} r={3} fill="#ef4444" />
			</g>
			{/* żelki na wzgórzu */}
			<g stroke="#fff" strokeWidth={1} strokeOpacity={0.7}>
				<path d="M56 140 a6 5 0 0 1 12 0 v4 h-12Z" fill="#4ade80" />
				<path d="M116 136 a5 4 0 0 1 10 0 v3 h-10Z" fill="#60a5fa" />
			</g>
			{/* posypka */}
			{SPRINKLES.map(([x, y, c, a, d]) => (
				<Anim key={`${x}-${y}`} on={animate} delay={d}>
					<rect
						x={x}
						y={y}
						width={7}
						height={2.6}
						rx={1.3}
						fill={c}
						transform={`rotate(${a} ${x} ${y})`}
					/>
				</Anim>
			))}
		</>
	)
}

export const SCENES: Partial<Record<CosmeticId, (p: SceneProps) => ReactNode>> =
	{
		"tlo-laka": Meadow,
		"tlo-noc": Night,
		"tlo-podwodne": Underwater,
		"tlo-kosmos": Cosmos,
		"tlo-zima": Winter,
		"tlo-slodycze": Candy,
	}
