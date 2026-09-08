import type { CSSProperties, ReactNode } from "react"
import { useId } from "react"
import type { BuildingId, DecorationId } from "../../game/village"
import { MAX_BUILDING_LEVEL } from "../../game/village"
import { FlowerGlyph } from "./Scenery"

// Art budynków wioski: poziom = WIDOCZNY wzrost (rozmiar, wieże, światła) —
// żadnych kropek-poziomów; arkusz budowy pokazuje „poziom X/3" tekstem.
// Ręczne SVG w idiomie potworków: gradient materiału, kontur w ciemniejszym
// tonie TEGO materiału (jak palety potworków), bryła przez stałe światło
// z lewej góry (cieniowany prawy bok / prawa połowa dachu), cień kontaktowy
// na gruncie. `size` może być liczbą (px) lub stringiem CSS ("100%") —
// wysokość wynika z viewBox. Sylwetka (silhouette) = jednolity ciemny cień
// budynku (filtr inline, niezależny od klas Tailwinda) — czytelna
// aspiracja à la Heroes 3, nie wyblakły obrazek.

export const DECORATION_EMOJI: Record<DecorationId, string> = {
	kwiatki: "🌼",
	sciezka: "🐾",
	hustawka: "🌳",
	staw: "🦆",
	pomnik: "🗿",
	tecza: "🌈",
}

// "fill" = wypełnij kontener obiema osiami; viewBox + domyślne
// preserveAspectRatio (meet) skalują rysunek bez zniekształceń — jedyny
// niezawodny sposób na wysokie arty (latarnia) w boksach o stałej wysokości
// (wiersze listy, podglądy modali).
function svgStyle(size: number | string): CSSProperties {
	if (size === "fill")
		return { width: "100%", height: "100%", display: "block" }
	return {
		width: typeof size === "number" ? `${size}px` : size,
		height: "auto",
		display: "block",
	}
}

// ---------------------------------------------------------------------------
// Materiały: [jasny, ciemny] gradient + cień boku + kontur
// ---------------------------------------------------------------------------
type Mat = { light: string; dark: string; shade: string; line: string }
const MAT = {
	stone: {
		light: "#f1ecff",
		dark: "#c9bff4",
		shade: "#a394ea",
		line: "#6b52c9",
	},
	gold: {
		light: "#fff4c6",
		dark: "#f6c94f",
		shade: "#dea62a",
		line: "#b07a12",
	},
	cream: {
		light: "#fff9ea",
		dark: "#f8dcab",
		shade: "#e3b877",
		line: "#b5823f",
	},
	wood: {
		light: "#e0b06c",
		dark: "#b07a3e",
		shade: "#8a5a28",
		line: "#6b4318",
	},
	rose: {
		light: "#ffa3bf",
		dark: "#e9517f",
		shade: "#c43a68",
		line: "#a02b55",
	},
	plum: {
		light: "#b19cff",
		dark: "#7c5cf0",
		shade: "#5f45c4",
		line: "#4a33a3",
	},
	teal: {
		light: "#93e3d9",
		dark: "#41b9aa",
		shade: "#2f9488",
		line: "#227067",
	},
	grey: {
		light: "#eef0f7",
		dark: "#c9cfe0",
		shade: "#a3abc4",
		line: "#7a839f",
	},
} satisfies Record<string, Mat>
type MatName = keyof typeof MAT

const GLASS = "#ffe58a"
const GLASS_OFF = "#dcd6fb"
const SHADOW = "#1e3a2a"

// gradienty materiałów: jedna definicja na SVG, id per instancja (useId)
function MatDefs({ uid, names }: { uid: string; names: MatName[] }) {
	return (
		<defs>
			{names.map((n) => (
				<linearGradient
					key={n}
					id={`m-${n}-${uid}`}
					x1="0"
					y1="0"
					x2="0.65"
					y2="1"
				>
					<stop offset="0%" stopColor={MAT[n].light} />
					<stop offset="55%" stopColor={MAT[n].light} />
					<stop offset="100%" stopColor={MAT[n].dark} />
				</linearGradient>
			))}
		</defs>
	)
}
const fillOf = (uid: string, n: MatName) => `url(#m-${n}-${uid})`

// cień kontaktowy na gruncie
function GroundShadow({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
	return (
		<ellipse
			cx={cx}
			cy={cy}
			rx={rx}
			ry={rx * 0.09 + 1.5}
			fill={SHADOW}
			opacity={0.14}
		/>
	)
}

// chorągiewka na iglicy (Heroes lubi proporczyki)
function Pennant({
	x,
	y,
	flip = false,
	color = "#ffd95e",
}: {
	x: number
	y: number
	flip?: boolean
	color?: string
}) {
	const dir = flip ? -13 : 13
	return (
		<g>
			<line
				x1={x}
				y1={y}
				x2={x}
				y2={y - 13}
				stroke="#6b4318"
				strokeWidth={1.5}
				strokeLinecap="round"
			/>
			<path
				d={`M${x} ${y - 13} l${dir} 3.5 l${-dir} 3.5 Z`}
				fill={color}
				stroke="#b07a12"
				strokeWidth={0.9}
				strokeLinejoin="round"
			/>
		</g>
	)
}

// okno łukowe z krzyżem szprosów i parapetem
function ArchWin({
	cx,
	y,
	w = 10,
	lit,
	line,
}: {
	cx: number
	y: number
	w?: number
	lit: boolean
	line: string
}) {
	const h = w * 1.45
	const top = y - h
	return (
		<g>
			<path
				d={`M${cx - w / 2} ${y} v-${h - w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 v${h - w / 2} Z`}
				fill={lit ? GLASS : GLASS_OFF}
				stroke={line}
				strokeWidth={1.4}
			/>
			<g stroke={line} strokeWidth={0.9} opacity={0.6}>
				<line x1={cx} y1={top + 2} x2={cx} y2={y} />
				<line
					x1={cx - w / 2}
					y1={y - h / 2 + 1}
					x2={cx + w / 2}
					y2={y - h / 2 + 1}
				/>
			</g>
			{lit && (
				<rect
					x={cx - w / 2 + 1.5}
					y={top + 2}
					width={w / 2 - 1.5}
					height={h / 2 - 3}
					fill="#ffffff"
					opacity={0.45}
				/>
			)}
			<rect
				x={cx - w / 2 - 1.5}
				y={y - 0.5}
				width={w + 3}
				height={2.2}
				rx={0.8}
				fill={MAT.grey.light}
				stroke={line}
				strokeWidth={0.9}
			/>
		</g>
	)
}

// okrągłe okienko (domki)
function RoundWin({
	cx,
	cy,
	r = 4.5,
	lit,
	line,
}: {
	cx: number
	cy: number
	r?: number
	lit: boolean
	line: string
}) {
	return (
		<g>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill={lit ? GLASS : GLASS_OFF}
				stroke={line}
				strokeWidth={1.4}
			/>
			<g stroke={line} strokeWidth={0.9} opacity={0.6}>
				<line x1={cx - r} y1={cy} x2={cx + r} y2={cy} />
				<line x1={cx} y1={cy - r} x2={cx} y2={cy + r} />
			</g>
			{lit && (
				<circle
					cx={cx - r * 0.35}
					cy={cy - r * 0.35}
					r={r * 0.3}
					fill="#ffffff"
					opacity={0.5}
				/>
			)}
		</g>
	)
}

// drzwi łukowe z deskami i gałką
function Door({
	cx,
	y,
	w = 14,
	mat = "plum",
	line,
}: {
	cx: number
	y: number
	w?: number
	mat?: MatName
	line: string
}) {
	const h = w * 1.5
	return (
		<g>
			<path
				d={`M${cx - w / 2} ${y} v-${h - w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 v${h - w / 2} Z`}
				fill={MAT[mat].dark}
				stroke={line}
				strokeWidth={1.4}
			/>
			<g stroke={MAT[mat].light} strokeWidth={0.9} opacity={0.5}>
				<line x1={cx - w / 4} y1={y - h + w / 2 + 1} x2={cx - w / 4} y2={y} />
				<line x1={cx + w / 4} y1={y - h + w / 2 + 1} x2={cx + w / 4} y2={y} />
			</g>
			<circle cx={cx + w / 4 - 0.5} cy={y - h / 2.6} r={1.3} fill="#ffd95e" />
		</g>
	)
}

// blanki na szczycie muru/wieży
function Crenels({
	x,
	y,
	width,
	fill,
	line,
}: {
	x: number
	y: number
	width: number
	fill: string
	line: string
}) {
	const n = Math.max(2, Math.round(width / 13))
	const step = width / (n * 2 - 1)
	return (
		<g stroke={line} strokeWidth={1.5} strokeLinejoin="round">
			{Array.from({ length: n }, (_, i) => (
				<rect
					key={i}
					x={x + i * step * 2}
					y={y - 7}
					width={step}
					height={9}
					rx={1}
					fill={fill}
				/>
			))}
		</g>
	)
}

// fugi kamienia w prostokącie: poziome spoiny + przesunięte pionowe
function Masonry({
	x,
	y,
	w,
	h,
	color,
	step = 12,
}: {
	x: number
	y: number
	w: number
	h: number
	color: string
	step?: number
}) {
	const rows = Math.floor(h / step)
	return (
		<g stroke={color} strokeWidth={1} opacity={0.22}>
			{Array.from({ length: rows }, (_, r) => {
				const yy = y + (r + 1) * step
				if (yy >= y + h - 2) return null
				const off = r % 2 ? step : step / 2
				const ticks: ReactNode[] = []
				for (let xx = x + off; xx < x + w - 2; xx += step * 1.6) {
					ticks.push(<line key={xx} x1={xx} y1={yy - step} x2={xx} y2={yy} />)
				}
				return (
					<g key={r}>
						<line x1={x + 1} y1={yy} x2={x + w - 1} y2={yy} />
						{ticks}
					</g>
				)
			})}
		</g>
	)
}

// pionowa cylindryczna wieża: korpus (cień z prawej = zaokrąglenie), fugi,
// blanki lub stożkowy dach z gontem
function Tower({
	uid,
	cx,
	w,
	top,
	bottom,
	mat,
	roof,
	roofH,
	flag,
	lit,
	crenel,
}: {
	uid: string
	cx: number
	w: number
	top: number
	bottom: number
	mat: MatName
	roof: MatName
	roofH: number
	flag?: boolean
	lit: boolean
	crenel?: boolean
}) {
	const m = MAT[mat]
	const r = MAT[roof]
	const x = cx - w / 2
	const eave = w + 10
	return (
		<g>
			<defs>
				<linearGradient id={`tower-${uid}-${cx}`}>
					<stop stopColor={m.dark} />
					<stop offset="0.28" stopColor={m.light} />
					<stop offset="0.58" stopColor={m.light} />
					<stop offset="1" stopColor={m.shade} />
				</linearGradient>
			</defs>
			<path
				d={`M${x} ${top} H${x + w} V${bottom - 3} Q${cx} ${bottom + 3} ${x} ${bottom - 3} Z`}
				fill={`url(#tower-${uid}-${cx})`}
				stroke={m.line}
				strokeWidth={1.5}
			/>
			<Masonry x={x} y={top} w={w} h={bottom - top} color={m.line} />
			<path
				d={`M${x - 1} ${bottom - 7} Q${cx} ${bottom - 3} ${x + w + 1} ${bottom - 7} V${bottom - 2} Q${cx} ${bottom + 3} ${x - 1} ${bottom - 2} Z`}
				fill={fillOf(uid, mat)}
				stroke={m.line}
				strokeWidth={1}
			/>
			<path
				d={`M${x} ${top + 5} Q${cx} ${top + 9} ${x + w} ${top + 5} M${x} ${top + 10} Q${cx} ${top + 14} ${x + w} ${top + 10}`}
				fill="none"
				stroke={m.line}
				strokeWidth={0.8}
				opacity={0.4}
			/>
			{crenel ? (
				<Crenels
					x={x - 3}
					y={top}
					width={w + 6}
					fill={fillOf(uid, mat)}
					line={m.line}
				/>
			) : (
				<g>
					{/* okap */}
					<rect
						x={cx - eave / 2}
						y={top - 3}
						width={eave}
						height={5}
						rx={2}
						fill={r.dark}
						stroke={r.line}
						strokeWidth={1.4}
					/>
					<path
						d={`M${cx - eave / 2 + 1} ${top - 3} L${cx} ${top - roofH} L${cx + eave / 2 - 1} ${top - 3} Q${cx} ${top + 3} ${cx - eave / 2 + 1} ${top - 3} Z`}
						fill={fillOf(uid, roof)}
						stroke={r.line}
						strokeWidth={1.8}
						strokeLinejoin="round"
					/>
					<path
						d={`M${cx} ${top - roofH} L${cx + eave / 2 - 1} ${top - 3} L${cx} ${top - 3} Z`}
						fill={r.shade}
						opacity={0.32}
					/>
					{/* rzędy gontu */}
					<g fill="none" stroke={r.line} strokeWidth={0.9} opacity={0.35}>
						<path
							d={`M${cx - eave * 0.22} ${top - roofH * 0.55} Q${cx} ${top - roofH * 0.5} ${cx + eave * 0.22} ${top - roofH * 0.55}`}
						/>
						<path
							d={`M${cx - eave * 0.36} ${top - roofH * 0.28} Q${cx} ${top - roofH * 0.22} ${cx + eave * 0.36} ${top - roofH * 0.28}`}
						/>
					</g>
					<circle
						cx={cx}
						cy={top - roofH}
						r={2.2}
						fill="#ffd95e"
						stroke="#b07a12"
						strokeWidth={0.9}
					/>
					{flag && <Pennant x={cx} y={top - roofH - 1} />}
				</g>
			)}
			<path
				d={`M${cx - w * 0.2} ${top + (bottom - top) * 0.55 + 2} v-${Math.min(12, w * 0.32) * 1.45} q${w * 0.2} -${w * 0.2} ${w * 0.4} 0 v${Math.min(12, w * 0.32) * 1.45} Z`}
				fill={m.shade}
				opacity={0.25}
			/>

			<ArchWin
				cx={cx}
				y={top + (bottom - top) * 0.55}
				w={Math.min(12, w * 0.32)}
				lit={lit}
				line={m.line}
			/>
			{w >= 46 && (
				<g transform={`translate(${cx} ${top + 18})`}>
					<path
						d="M-5 0 H5 V6 Q4 10 0 12 Q-4 10 -5 6 Z"
						fill={fillOf(uid, "plum")}
						stroke={MAT.gold.line}
						strokeWidth={0.8}
					/>
					<path d="M0 3 L2 6 L0 9 L-2 6 Z" fill={MAT.gold.light} />
				</g>
			)}
			{w <= 34 && (
				<g transform={`translate(${cx} ${top + (bottom - top) * 0.55 + 9})`}>
					<path
						d="M-4 0 H4 V14 L0 18 L-4 14 Z"
						fill={fillOf(uid, "plum")}
						stroke={MAT.plum.line}
						strokeWidth={0.8}
					/>
					<path d="M-5 0 H5" stroke={MAT.gold.dark} strokeWidth={1.5} />
					<path d="M0 5 L2 8 L0 11 L-2 8 Z" fill={MAT.gold.light} />
				</g>
			)}
		</g>
	)
}

// ---------------------------------------------------------------------------
// Zamek: L1 wieżyczka z bramką · L2 donżon + 2 wieże + mur · L3 złota cytadela
// ---------------------------------------------------------------------------
function ZamekArt({ level, size }: { level: number; size: number | string }) {
	const uid = useId()
	const gold = level >= 3
	const mat: MatName = gold ? "gold" : "stone"
	const m = MAT[mat]
	const lit = true
	const foot = 168
	return (
		// viewBox zaczyna się na y=-16: iglica i proporczyk złotego donżonu
		// wystają ponad y=0 — bez marginesu szczyt się ucina
		<svg viewBox="0 -16 190 192" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={[mat, "rose", "plum"]} />
			<GroundShadow
				cx={95}
				cy={foot + 3}
				rx={gold ? 88 : level >= 2 ? 66 : 42}
			/>

			{/* skrajne baszty cytadeli (L3) — za murem */}
			{gold && (
				<g>
					<Tower
						uid={uid}
						cx={16}
						w={24}
						top={96}
						bottom={foot}
						mat={mat}
						roof="rose"
						roofH={26}
						lit={lit}
					/>
					<Tower
						uid={uid}
						cx={174}
						w={24}
						top={96}
						bottom={foot}
						mat={mat}
						roof="rose"
						roofH={26}
						lit={lit}
					/>
					{/* girlandy proporczyków między basztami */}
					<path
						d="M28 88 Q60 104 95 92 Q130 104 162 88"
						fill="none"
						stroke="#6b4318"
						strokeWidth={1.2}
					/>
					{[40, 58, 76, 95, 114, 132, 150].map((x, i) => (
						<path
							key={x}
							d={`M${x} ${94 + Math.sin((i / 6) * Math.PI) * 6} l3.5 7 l-7 0 Z`}
							fill={i % 2 ? "#ff6b9a" : "#ffd95e"}
							stroke="#a02b55"
							strokeWidth={0.7}
						/>
					))}
				</g>
			)}

			{/* donżon (zawsze) — za wieżami bocznymi */}
			<Tower
				uid={uid}
				cx={95}
				w={level >= 2 ? 52 : 46}
				top={gold ? 30 : level >= 2 ? 48 : 66}
				bottom={foot}
				mat={mat}
				roof="rose"
				roofH={gold ? 44 : 34}
				flag
				lit={lit}
			/>
			{/* drugie okno donżonu (L2+) */}
			{level >= 2 && (
				<ArchWin cx={95} y={gold ? 78 : 92} w={12} lit={lit} line={m.line} />
			)}

			{/* wieże boczne + mur kurtynowy (L2+) */}
			{level >= 2 && (
				<g>
					<rect
						x={44}
						y={118}
						width={102}
						height={foot - 118}
						fill={fillOf(uid, mat)}
						stroke={m.line}
						strokeWidth={1.8}
					/>
					<Masonry x={44} y={118} w={102} h={foot - 118} color={m.line} />
					<Crenels
						x={44}
						y={118}
						width={102}
						fill={fillOf(uid, mat)}
						line={m.line}
					/>
					<Tower
						uid={uid}
						cx={46}
						w={34}
						top={gold ? 66 : 80}
						bottom={foot}
						mat={mat}
						roof="rose"
						roofH={30}
						flag
						lit={lit}
					/>
					<Tower
						uid={uid}
						cx={144}
						w={34}
						top={gold ? 66 : 80}
						bottom={foot}
						mat={mat}
						roof="rose"
						roofH={30}
						flag
						lit={lit}
					/>
				</g>
			)}

			{/* przedni mur z bramą (zawsze — nawet Wieżyczka ma wejście) */}
			<g>
				<rect
					x={level >= 2 ? 60 : 56}
					y={128}
					width={level >= 2 ? 70 : 78}
					height={foot - 128}
					fill={fillOf(uid, mat)}
					stroke={m.line}
					strokeWidth={1.8}
				/>
				<rect
					x={level >= 2 ? 112 : 116}
					y={129}
					width={level >= 2 ? 17 : 17}
					height={foot - 130}
					fill={m.shade}
					opacity={0.3}
				/>
				<Masonry
					x={level >= 2 ? 60 : 56}
					y={128}
					w={level >= 2 ? 70 : 78}
					h={foot - 128}
					color={m.line}
				/>
				<Crenels
					x={level >= 2 ? 60 : 56}
					y={128}
					width={level >= 2 ? 70 : 78}
					fill={fillOf(uid, mat)}
					line={m.line}
				/>
				{/* A shallow stone threshold grounds the gate. */}
				<path
					d="M80 166 H110 L115 172 H75 Z"
					fill={MAT.grey.light}
					stroke={m.line}
					strokeWidth={1}
				/>
				{/* brama: kamienne obramienie + ciemny łuk + kratownica */}
				<path
					d="M77 168 v-20 a18 18 0 0 1 36 0 v20 Z"
					fill={m.shade}
					opacity={0.5}
				/>
				<path
					d="M77 166 V150 A18 18 0 0 1 113 150 V166"
					fill="none"
					stroke={m.light}
					strokeWidth={5}
				/>
				{[-75, -45, -15, 15, 45, 75].map((angle) => (
					<path
						key={angle}
						d="M95 129 V135"
						transform={`rotate(${angle} 95 150)`}
						stroke={m.line}
						strokeWidth={0.8}
						opacity={0.6}
					/>
				))}
				<path
					d="M80 168 v-18 a15 15 0 0 1 30 0 v18 Z"
					fill="#3b2a6b"
					stroke={m.line}
					strokeWidth={1.4}
				/>
				<g stroke="#8b7ad8" strokeWidth={1} opacity={0.55}>
					<line x1={88} y1={140} x2={88} y2={168} />
					<line x1={95} y1={136} x2={95} y2={168} />
					<line x1={102} y1={140} x2={102} y2={168} />
					<line x1={81} y1={150} x2={109} y2={150} />
					<line x1={81} y1={160} x2={109} y2={160} />
				</g>
				{/* pochodnie przy bramie */}
				<g>
					<line
						x1={72}
						y1={140}
						x2={72}
						y2={150}
						stroke="#6b4318"
						strokeWidth={1.8}
						strokeLinecap="round"
					/>
					<line
						x1={118}
						y1={140}
						x2={118}
						y2={150}
						stroke="#6b4318"
						strokeWidth={1.8}
						strokeLinecap="round"
					/>
					<g data-decor>
						<circle cx={72} cy={137} r={5} fill="#ffb03d" opacity={0.3} />
						<circle cx={118} cy={137} r={5} fill="#ffb03d" opacity={0.3} />
					</g>
					<path
						d="M69.5 140 Q72 130 74.5 140 Z"
						fill="#ffb03d"
						stroke="#e0641c"
						strokeWidth={0.8}
					/>
					<path
						d="M115.5 140 Q118 130 120.5 140 Z"
						fill="#ffb03d"
						stroke="#e0641c"
						strokeWidth={0.8}
					/>
				</g>
			</g>

			{/* iskierki cytadeli */}
			{gold && (
				<g data-decor fill="#ffffff">
					<circle cx={46} cy={50} r={2.2} className="anim-sparkle" />
					<circle
						cx={144}
						cy={48}
						r={1.9}
						className="anim-sparkle"
						style={{ animationDelay: "0.6s" }}
					/>
					<circle
						cx={95}
						cy={-6}
						r={2.4}
						className="anim-sparkle"
						style={{ animationDelay: "1.1s" }}
					/>
					<circle
						cx={16}
						cy={84}
						r={1.7}
						className="anim-sparkle"
						style={{ animationDelay: "1.6s" }}
					/>
					<circle
						cx={174}
						cy={86}
						r={1.7}
						className="anim-sparkle"
						style={{ animationDelay: "0.3s" }}
					/>
				</g>
			)}
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Domki: chatki w 3/4 (front + cieniowany bok), muru pruskiego przybywa
// z poziomem, dym z kominów od L2, girlanda nad miasteczkiem (L3)
// ---------------------------------------------------------------------------
function Cottage({
	uid,
	x,
	lit,
	timber,
	roof,
	smoke,
}: {
	uid: string
	x: number
	lit: boolean
	timber: boolean
	roof: MatName
	smoke: boolean
}) {
	const m = MAT.cream
	const r = MAT[roof]
	return (
		<g
			transform={`translate(${x} 0)`}
			strokeLinejoin="round"
			strokeLinecap="round"
		>
			{/* A plaster gable and a single receding roof plane share the same ridge. */}
			<path
				d="M36 57 L49 49 V85 L36 92 Z"
				fill={m.shade}
				stroke={m.line}
				strokeWidth={1.4}
			/>
			<path
				d="M0 57 L18 33 L36 57 V92 H0 Z"
				fill={fillOf(uid, "cream")}
				stroke={m.line}
				strokeWidth={1.5}
			/>
			<path
				d="M0 86 H36 V92 H0 Z M36 86 L49 79 V85 L36 92 Z"
				fill={MAT.grey.dark}
				stroke={MAT.grey.line}
				strokeWidth={1}
			/>
			<path
				d="M37 62 L45 58 V69 L37 73 Z"
				fill={lit ? GLASS : GLASS_OFF}
				stroke={m.line}
				strokeWidth={1}
			/>
			<path
				d="M41 60 V71 M38 66 L44 63"
				fill="none"
				stroke={m.line}
				strokeWidth={0.8}
			/>
			{timber && (
				<g stroke={MAT.wood.shade} strokeWidth={1.8}>
					<path
						d="M3 59 V85 M33 59 V85 M2 58 H34 M8 54 L18 41 L28 54 M18 42 V55"
						fill="none"
					/>
				</g>
			)}
			<path
				d="M18 33 L31 26 L53 53 L39 60 Z"
				fill={fillOf(uid, roof)}
				stroke={r.line}
				strokeWidth={1.6}
			/>
			<path d="M31 27 L53 53 L45 57 Z" fill={r.shade} opacity={0.35} />
			<g stroke={r.line} strokeWidth={0.8} opacity={0.35} fill="none">
				<path d="M24 40 L37 34 M30 47 L43 41 M36 54 L49 48 M31 37 L34 41 M38 43 L41 47" />
			</g>
			<path
				d="M-3 59 L18 33 L39 59 L53 53"
				fill="none"
				stroke={r.line}
				strokeWidth={4}
			/>
			<path
				d="M-3 58 L18 32 L39 58 L52 52"
				fill="none"
				stroke={r.light}
				strokeWidth={1.8}
			/>
			{/* Chimney emerges from the roof, with its base on the roof slope. */}
			<path
				d="M34 39 V25 H40 V42 Z"
				fill={MAT.grey.dark}
				stroke={MAT.grey.line}
				strokeWidth={1}
			/>
			<rect
				x={33}
				y={23}
				width={8}
				height={3}
				rx={0.8}
				fill={MAT.grey.light}
				stroke={MAT.grey.line}
				strokeWidth={1}
			/>
			{smoke && (
				<g data-decor fill="#ffffff" opacity={0.7}>
					<circle cx={37} cy={18} r={2.5} className="anim-float" />
					<circle
						cx={40}
						cy={11}
						r={1.8}
						className="anim-float"
						style={{ animationDelay: "0.9s" }}
					/>
				</g>
			)}
			<RoundWin cx={18} cy={49} r={3.4} lit={lit} line={m.line} />
			<Door cx={11} y={87} w={11} line={m.line} mat="wood" />
			<rect
				x={4}
				y={88}
				width={15}
				height={3}
				rx={1}
				fill={MAT.grey.light}
				stroke={MAT.grey.line}
				strokeWidth={0.8}
			/>
			<ArchWin cx={26} y={74} w={8} lit={lit} line={m.line} />
			<path d="M20 65 V73 M32 65 V73" stroke={r.shade} strokeWidth={2} />
			<path
				d="M21 78 Q24 74 26 78 Q29 74 32 78"
				fill="none"
				stroke="#579764"
				strokeWidth={2}
			/>
			<g fill="#f681a1">
				<circle cx={23} cy={76} r={1.5} />
				<circle cx={30} cy={76} r={1.5} />
			</g>
			<rect
				x={20}
				y={78}
				width={13}
				height={3.5}
				rx={0.8}
				fill={MAT.wood.dark}
				stroke={MAT.wood.line}
				strokeWidth={0.8}
			/>
		</g>
	)
}

function DomkiArt({ level, size }: { level: number; size: number | string }) {
	const uid = useId()
	const xs = level === 1 ? [58] : level === 2 ? [24, 92] : [5, 59, 113]
	const roofs: MatName[] = ["plum", "rose", "teal"]
	return (
		<svg viewBox="0 0 170 100" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={["cream", "plum", "rose", "teal"]} />
			<GroundShadow
				cx={85}
				cy={95}
				rx={level === 1 ? 34 : level === 2 ? 60 : 82}
			/>
			{/* girlanda nad miasteczkiem (L3) */}
			{level >= 3 && (
				<g>
					<path
						d="M12 18 V47 M158 18 V39"
						stroke={MAT.wood.shade}
						strokeWidth={1.3}
					/>
					<path
						d="M12 18 Q85 34 158 18"
						stroke="#6b4318"
						strokeWidth={1.3}
						fill="none"
					/>
					{[24, 48, 72, 96, 120, 144].map((x, i) => (
						<path
							key={x}
							d={`M${x} ${20 + Math.sin((i / 5) * Math.PI) * 6} l4 8 l-9 -1 Z`}
							fill={i % 2 ? "#ff6b9a" : "#ffd95e"}
							stroke="#a02b55"
							strokeWidth={0.8}
						/>
					))}
				</g>
			)}
			{xs.map((x, i) => (
				<Cottage
					key={x}
					uid={uid}
					x={x}
					lit={i === 0 || level >= 2}
					timber={level >= 2}
					roof={roofs[i % 3] ?? "plum"}
					smoke={level >= 2}
				/>
			))}
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Fontanna: kamienna misa z blokami, dwie czasze, łuki wody z jasnym rdzeniem
// ---------------------------------------------------------------------------
function FontannaArt({
	level,
	size,
}: {
	level: number
	size: number | string
}) {
	const uid = useId()
	const g = MAT.grey
	const bowlY = level === 1 ? 54 : 43
	return (
		<svg viewBox="0 0 120 100" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={["grey", "gold", "teal"]} />
			<defs>
				<linearGradient id={`water-${uid}`} x2="0.8" y2="1">
					<stop stopColor="#d3f5ff" />
					<stop offset="0.55" stopColor={level === 3 ? "#b3c8fa" : "#72cfe4"} />
					<stop offset="1" stopColor={level === 3 ? "#dfa5dd" : "#389ebc"} />
				</linearGradient>
			</defs>
			<GroundShadow cx={60} cy={94} rx={49} />
			{/* The pool is drawn first so the pedestal stands in the water. */}
			<path
				d="M12 79 V87 C18 102 102 102 108 87 V79 Z"
				fill={g.shade}
				stroke={g.line}
				strokeWidth={1.3}
			/>
			<ellipse
				cx={60}
				cy={79}
				rx={48}
				ry={15}
				fill={fillOf(uid, "grey")}
				stroke={g.line}
				strokeWidth={1.4}
			/>
			<ellipse
				cx={60}
				cy={78}
				rx={40}
				ry={10.5}
				fill={`url(#water-${uid})`}
				stroke="#508ba5"
				strokeWidth={1.2}
			/>
			<path
				d="M15 84 C29 97 91 97 105 84"
				fill="none"
				stroke={g.light}
				strokeWidth={2}
			/>
			{[25, 42, 60, 78, 95].map((x) => (
				<path
					key={x}
					d={`M${x} ${92 - Math.abs(60 - x) * 0.1} v5`}
					stroke={g.line}
					strokeWidth={0.9}
					opacity={0.6}
				/>
			))}
			<ellipse cx={60} cy={79} rx={17} ry={4} fill="#3d8eaa" opacity={0.25} />
			<path
				d={`M49 79 Q55 73 55 ${bowlY + 8} H65 Q65 73 71 79 Q60 84 49 79 Z`}
				fill={fillOf(uid, "grey")}
				stroke={g.line}
				strokeWidth={1.2}
			/>
			<path
				d={`M62 ${bowlY + 9} Q61 69 66 78`}
				fill="none"
				stroke={g.shade}
				strokeWidth={2.5}
			/>
			<g transform={`translate(0 ${bowlY})`} stroke={g.line} strokeWidth={1.2}>
				<path d="M37 0 Q40 14 60 15 Q80 14 83 0 Z" fill={fillOf(uid, "grey")} />
				<path
					d="M60 13 Q77 11 81 2"
					fill="none"
					stroke={g.shade}
					strokeWidth={2}
				/>
				<ellipse cx={60} cy={0} rx={23} ry={6} fill={g.light} />
				<ellipse
					cx={60}
					cy={-0.5}
					rx={18}
					ry={3.5}
					fill={`url(#water-${uid})`}
					stroke="#508ba5"
					strokeWidth={0.8}
				/>
			</g>
			{level >= 2 && (
				<g stroke={g.line} strokeWidth={1.2}>
					<path
						d="M55 42 L57 27 H63 L65 42 Q60 45 55 42 Z"
						fill={fillOf(uid, "grey")}
					/>
					<path
						d="M46 24 Q48 34 60 34 Q72 34 74 24"
						fill={fillOf(uid, "grey")}
					/>
					<ellipse cx={60} cy={24} rx={14} ry={4} fill={g.light} />
					<ellipse
						cx={60}
						cy={23.5}
						rx={10}
						ry={2}
						fill="#8fdef0"
						stroke="none"
					/>
				</g>
			)}
			{/* Overflow has a bright core, landing ripples, and an unbroken path. */}
			{[38, 82].map((x) => (
				<g key={x} fill="none" strokeLinecap="round">
					<path
						d={`M${x} ${bowlY} Q${x < 60 ? 29 : 91} ${bowlY + 8} ${x < 60 ? 31 : 89} 78`}
						stroke="#55b5cf"
						strokeWidth={3.5}
					/>
					<path
						d={`M${x} ${bowlY} Q${x < 60 ? 29 : 91} ${bowlY + 8} ${x < 60 ? 31 : 89} 78`}
						stroke="#e0faff"
						strokeWidth={1.3}
					/>
					<ellipse
						cx={x < 60 ? 31 : 89}
						cy={79}
						rx={5}
						ry={1.5}
						stroke="#e0faff"
						strokeWidth={0.9}
					/>
				</g>
			))}
			{level >= 2 && (
				<path
					d="M47 24 Q43 29 44 43 M73 24 Q77 29 76 43"
					fill="none"
					stroke="#c4f5ff"
					strokeWidth={2}
					strokeLinecap="round"
				/>
			)}
			{level === 3 ? (
				<g stroke={MAT.gold.line} strokeWidth={1}>
					<path d="M56 23 L57 15 H63 L64 23 Z" fill={fillOf(uid, "gold")} />
					<path
						d="M60 4 C49 13 55 18 60 18 C65 18 71 13 60 4 Z"
						fill={fillOf(uid, "teal")}
					/>
					<path
						d="M58 9 Q55 13 58 14"
						fill="none"
						stroke="#e4fff3"
						strokeWidth={1.5}
					/>
					<path
						d="M41 49 Q60 60 79 49"
						fill="none"
						stroke={MAT.gold.dark}
						strokeWidth={2}
					/>
				</g>
			) : (
				<path
					d={
						level === 1
							? "M60 32 Q50 42 53 50 M60 32 Q70 42 67 50 M60 32 V51"
							: "M60 10 Q51 16 54 22 M60 10 Q69 16 66 22 M60 10 V22"
					}
					fill="none"
					stroke="#96def0"
					strokeWidth={2.2}
					strokeLinecap="round"
				/>
			)}
			<path
				d="M43 84 q6 2 12 0 M68 74 q5 -2 9 0"
				fill="none"
				stroke="#e5faff"
				strokeWidth={1}
				strokeLinecap="round"
			/>
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Plac zabaw: wieżyczka zjeżdżalni z daszkiem + ślizg z burtą, piaskownica;
// L2 huśtawka na A-ramie, L3 trampolina
// ---------------------------------------------------------------------------
function PlacZabawArt({
	level,
	size,
}: {
	level: number
	size: number | string
}) {
	const uid = useId()
	return (
		<svg viewBox="0 0 170 104" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={["plum", "rose", "teal", "wood"]} />
			<GroundShadow cx={85} cy={97} rx={level === 1 ? 49 : 77} />
			{/* Each activity has a clear footprint; the slide lands beside the tower. */}
			{level >= 2 && (
				<g strokeLinecap="round" strokeLinejoin="round">
					<g fill="none" stroke={MAT.wood.shade} strokeWidth={3.5}>
						<path d="M9 88 L20 36 L32 88 M48 88 L59 36 L70 88" />
						<path d="M14 68 H28 M53 68 H66" strokeWidth={2} />
					</g>
					<path d="M16 36 H63" stroke={MAT.teal.line} strokeWidth={5} />
					<path d="M16 35 H63" stroke={MAT.teal.light} strokeWidth={2} />
					<path
						d="M31 38 V69 M47 38 V69"
						fill="none"
						stroke={MAT.wood.line}
						strokeWidth={1.2}
					/>
					<rect
						x={27}
						y={68}
						width={24}
						height={5}
						rx={2}
						fill={fillOf(uid, "rose")}
						stroke={MAT.rose.line}
						strokeWidth={1.3}
					/>
					<g fill={MAT.gold.light}>
						<circle cx={20} cy={36} r={1.5} />
						<circle cx={59} cy={36} r={1.5} />
					</g>
				</g>
			)}
			<g
				transform={level === 1 ? "translate(-29 0)" : undefined}
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path
					d="M98 86 L137 86 L148 94 H91 Z"
					fill="#f3e2b3"
					stroke="#c7a879"
					strokeWidth={1.2}
				/>
				<path
					d="M91 94 H148 V97 H91 Z"
					fill={MAT.wood.light}
					stroke={MAT.wood.line}
					strokeWidth={0.8}
				/>
				{/* Posts carry the roof above an open, railed platform. */}
				<path
					d="M106 88 V31 M132 88 V31"
					fill="none"
					stroke={MAT.wood.shade}
					strokeWidth={3.5}
				/>
				<path
					d="M107 55 L96 88 M117 55 L108 88 M104 64 H114 M101 73 H111 M98 82 H109"
					fill="none"
					stroke={MAT.wood.dark}
					strokeWidth={2}
				/>
				<rect
					x={102}
					y={52}
					width={34}
					height={5}
					rx={1}
					fill={fillOf(uid, "wood")}
					stroke={MAT.wood.line}
					strokeWidth={1.2}
				/>
				<path
					d="M105 42 H120 M110 43 V51 M117 43 V51"
					fill="none"
					stroke={MAT.teal.line}
					strokeWidth={2}
				/>
				<path
					d="M100 32 L119 15 L138 32 Z"
					fill={fillOf(uid, "rose")}
					stroke={MAT.rose.line}
					strokeWidth={1.5}
				/>
				<path d="M119 15 L138 32 H124 Z" fill={MAT.rose.shade} opacity={0.35} />
				<path d="M100 32 H138" stroke={MAT.rose.line} strokeWidth={2.5} />
				<Pennant x={119} y={15} />
				{/* A broad slide bed with raised edges and a flat run-out. */}
				<path
					d="M123 54 C135 55 137 82 151 85 H159 L163 91 H149 C133 89 130 64 120 60 Z"
					fill={fillOf(uid, "teal")}
					stroke={MAT.teal.line}
					strokeWidth={1.5}
				/>
				<path
					d="M123 55 C135 57 138 84 151 86 H159"
					fill="none"
					stroke={MAT.teal.light}
					strokeWidth={2.5}
				/>
				<path
					d="M120 60 C131 64 133 89 149 91 H163"
					fill="none"
					stroke={MAT.teal.line}
					strokeWidth={2}
				/>
				<path
					d="M123 53 V47 Q123 44 126 46 L130 51"
					fill="none"
					stroke={MAT.teal.line}
					strokeWidth={1.8}
				/>
			</g>
			{level >= 3 && (
				<g strokeLinecap="round">
					<GroundShadow cx={78} cy={98} rx={20} />
					<path
						d="M62 88 V96 M93 88 V96 M72 91 V99 M86 91 V99"
						fill="none"
						stroke={MAT.grey.line}
						strokeWidth={2}
					/>
					<path
						d="M57 85 V88 A21 6 0 0 0 99 88 V85"
						fill={MAT.plum.shade}
						stroke={MAT.plum.line}
						strokeWidth={1.2}
					/>
					<ellipse
						cx={78}
						cy={85}
						rx={21}
						ry={6}
						fill={fillOf(uid, "plum")}
						stroke={MAT.plum.line}
						strokeWidth={1.4}
					/>
					<ellipse
						cx={78}
						cy={84.5}
						rx={16}
						ry={3.5}
						fill="#514976"
						stroke={MAT.plum.light}
						strokeWidth={1}
					/>
					<path
						d="M67 84 Q77 81 87 84"
						fill="none"
						stroke="#8276ad"
						strokeWidth={0.8}
					/>
				</g>
			)}
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Latarnie: kuty słup na cokole, latarenka z daszkiem, ciepła poświata;
// L2+ świetliki
// ---------------------------------------------------------------------------
function LatarnieArt({
	level,
	size,
}: {
	level: number
	size: number | string
}) {
	const uid = useId()
	const lamps = Array.from(
		{ length: level },
		(_, i) => 58 + (i - (level - 1) / 2) * 34,
	)
	return (
		<svg viewBox="0 0 116 100" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={["plum", "gold", "grey"]} />
			<defs>
				<radialGradient id={`glow-${uid}`}>
					<stop stopColor="#ffe9a3" stopOpacity={0.65} />
					<stop offset="1" stopColor="#ffe9a3" stopOpacity={0} />
				</radialGradient>
			</defs>
			{lamps.map((x, i) => (
				<g
					key={x}
					transform={`translate(${x} 0)`}
					strokeLinejoin="round"
					strokeLinecap="round"
				>
					<GroundShadow cx={0} cy={96} rx={12} />
					<circle data-decor cx={0} cy={28} r={22} fill={`url(#glow-${uid})`} />
					<path
						d="M-9 93 L-5 88 H5 L9 93 V96 H-9 Z"
						fill={fillOf(uid, "grey")}
						stroke={MAT.grey.line}
						strokeWidth={1}
					/>
					<path
						d="M-8 93 H8 M4 89 L7 93 V95"
						fill="none"
						stroke={MAT.grey.shade}
						strokeWidth={1}
					/>
					<path
						d="M-3 88 L-1.5 41 H1.5 L3 88 Z"
						fill={fillOf(uid, "plum")}
						stroke={MAT.plum.line}
						strokeWidth={1.2}
					/>
					<path d="M-1 48 V84" stroke={MAT.plum.light} strokeWidth={1} />
					<path
						d="M0 56 Q12 56 10 47 Q9 43 6 46 M0 50 Q-9 50 -8 44"
						fill="none"
						stroke={MAT.plum.line}
						strokeWidth={1.5}
					/>
					<path
						d="M-4 85 H4 M-3 62 H3 M-3 42 H3"
						stroke={MAT.gold.dark}
						strokeWidth={2}
					/>
					{/* A tapered glass chamber, shaded side, and overhanging metal cap. */}
					<path
						d="M-9 22 H9 L6 38 H-6 Z"
						fill="#fff2b9"
						stroke={MAT.plum.line}
						strokeWidth={1.4}
					/>
					<path d="M4 23 H8 L5 37 H2 Z" fill="#f6c45b" />
					<path
						d="M-6 25 L-4 32 M-3 25 L-2 28"
						stroke="#ffffff"
						strokeWidth={1.8}
					/>
					<path
						d="M0 23 V37 M-6 38 H6 L3 42 H-3 Z"
						fill={MAT.plum.dark}
						stroke={MAT.plum.line}
						strokeWidth={1}
					/>
					<path
						d="M-11 22 L-5 15 H5 L11 22 Z"
						fill={fillOf(uid, "plum")}
						stroke={MAT.plum.line}
						strokeWidth={1.3}
					/>
					<path d="M1 15 H5 L11 22 H4 Z" fill={MAT.plum.shade} />
					<path d="M-10 22 H10" stroke={MAT.gold.dark} strokeWidth={1.5} />
					<path d="M0 15 V11" stroke={MAT.plum.line} strokeWidth={1.5} />
					<circle
						cx={0}
						cy={10}
						r={2}
						fill={fillOf(uid, "gold")}
						stroke={MAT.gold.line}
						strokeWidth={0.8}
					/>
					{level >= 2 && (
						<g>
							<path
								d="M7 53 V61 M3 61 H12 L10 68 Q7 70 5 68 Z"
								fill={MAT.wood.dark}
								stroke={MAT.wood.line}
								strokeWidth={0.8}
							/>
							<path
								d="M3 61 Q2 56 6 57 Q9 53 11 59 Q14 58 12 63"
								fill="#70b87a"
								stroke="#478d5a"
								strokeWidth={0.7}
							/>
							<circle
								cx={7}
								cy={59}
								r={1.6}
								fill={i % 2 ? "#ffd968" : "#f798ba"}
							/>
						</g>
					)}
				</g>
			))}
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Ogródek: grządka w drewnianej skrzyni (front + bok), płotek, kwiaty
// z listkami; L2 konewka i motylek, L3 pergola z pnączem i iskierki
// ---------------------------------------------------------------------------
function OgrodekArt({ level, size }: { level: number; size: number | string }) {
	const uid = useId()
	const flowers = [
		{ x: 24, y: 57, kind: "tulip" as const, scale: 0.75 },
		{ x: 48, y: 55, kind: "sunflower" as const, scale: 0.95 },
		{ x: 73, y: 56, kind: "bell" as const, scale: 0.8 },
		...(level >= 2
			? [
					{ x: 36, y: 62, kind: "daisy" as const, scale: 0.65 },
					{ x: 61, y: 63, kind: "tulip" as const, scale: 0.65 },
				]
			: []),
		...(level === 3
			? [
					{ x: 16, y: 62, kind: "bell" as const, scale: 0.65 },
					{ x: 82, y: 61, kind: "daisy" as const, scale: 0.7 },
				]
			: []),
	]
	return (
		<svg viewBox="0 0 110 80" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={["wood", "cream", "teal"]} />
			<GroundShadow cx={55} cy={75} rx={49} />
			{level === 3 && (
				<g strokeLinecap="round" strokeLinejoin="round">
					<path
						d="M13 57 V19 Q13 6 27 6 H77 Q91 6 91 19 V56"
						fill="none"
						stroke={MAT.wood.line}
						strokeWidth={4}
					/>
					<path
						d="M12 56 V19 Q12 5 27 5 H77 Q90 5 90 19 V55"
						fill="none"
						stroke={MAT.wood.light}
						strokeWidth={2}
					/>
					<path
						d="M17 43 L27 33 L17 23 M87 43 L77 33 L87 23"
						fill="none"
						stroke={MAT.wood.dark}
						strokeWidth={1.2}
					/>
					<path
						d="M15 49 Q9 30 21 16 Q34 2 54 8 Q79 2 89 24 Q94 36 87 49"
						fill="none"
						stroke="#4e985e"
						strokeWidth={1.7}
					/>
					{[
						[17, 29, -30],
						[23, 14, 20],
						[40, 7, -15],
						[64, 7, 20],
						[82, 16, 40],
						[90, 34, -20],
					].map(([x, y, r]) => (
						<g key={x} transform={`translate(${x} ${y}) rotate(${r})`}>
							<path
								d="M0 0 Q-8 1 -7 -5 Q-2 -6 0 0 Q2 -7 7 -5 Q7 1 0 0"
								fill="#70b87a"
								stroke="#478d5a"
								strokeWidth={0.6}
							/>
							<circle
								cy={1}
								r={2.8}
								fill="#f698b6"
								stroke="#c76186"
								strokeWidth={0.7}
							/>
							<circle cy={1} r={1} fill="#ffe4a0" />
						</g>
					))}
				</g>
			)}
			{/* Fence recedes behind the planting bed. */}
			<path d="M9 43 H91 M9 52 H91" stroke={MAT.cream.dark} strokeWidth={2.5} />
			{[12, 25, 38, 51, 64, 77, 90].map((x) => (
				<path
					key={x}
					d={`M${x - 2} 57 V39 l2 -3 l2 3 V57 Z`}
					fill={fillOf(uid, "cream")}
					stroke={MAT.cream.line}
					strokeWidth={0.8}
				/>
			))}
			{/* Visible soil plane and joined wooden sides give the bed real depth. */}
			<path
				d="M6 62 L17 54 H95 L85 62 Z"
				fill="#70462e"
				stroke={MAT.wood.line}
				strokeWidth={1}
			/>
			<path
				d="M6 62 H85 V73 H6 Z"
				fill={fillOf(uid, "wood")}
				stroke={MAT.wood.line}
				strokeWidth={1.1}
			/>
			<path
				d="M85 62 L95 54 V65 L85 73 Z"
				fill={MAT.wood.shade}
				stroke={MAT.wood.line}
				strokeWidth={1.1}
			/>
			<path
				d="M7 63 H84 M8 68 H83 M87 64 L93 59"
				fill="none"
				stroke={MAT.wood.light}
				strokeWidth={0.9}
			/>
			<path d="M10 63 V72 M81 63 V72" stroke={MAT.wood.line} strokeWidth={2} />
			<g fill={MAT.grey.light}>
				<circle cx={10} cy={65} r={0.7} />
				<circle cx={81} cy={65} r={0.7} />
			</g>
			{flowers.map(({ x, y, kind, scale }) => (
				<g key={x}>
					<path
						d={`M${x} ${y - 1} Q${x - 8} ${y - 3} ${x - 6} ${y - 9} Q${x - 1} ${y - 8} ${x} ${y - 1} Q${x + 7} ${y - 3} ${x + 6} ${y - 10} Q${x + 1} ${y - 8} ${x} ${y - 1}`}
						fill="#65ac6d"
						stroke="#468653"
						strokeWidth={0.6}
					/>
					<FlowerGlyph kind={kind} x={x} y={y} scale={scale} />
				</g>
			))}
			{level >= 2 && (
				<g stroke={MAT.teal.line} strokeWidth={1.1} strokeLinejoin="round">
					<path
						d="M98 64 Q98 57 103 59 Q108 61 105 69"
						fill="none"
						strokeWidth={1.8}
					/>
					<path d="M94 65 L87 59 L84 61 L93 70" fill={MAT.teal.light} />
					<path
						d="M92 64 H103 L104 74 Q98 77 91 74 Z"
						fill={fillOf(uid, "teal")}
					/>
					<ellipse cx={97.5} cy={64} rx={5.5} ry={1.8} fill={MAT.teal.shade} />
					<path d="M94 68 V72" stroke={MAT.teal.light} />
				</g>
			)}
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Sklepik: L1 stragan (lada, skrzynki, markiza) · L2 sklepik z witryną ·
// L3 dwupiętrowy Dom Mody z lampionami i świecącym szyldem
// ---------------------------------------------------------------------------
function Awning({
	x,
	y,
	w,
	h = 12,
}: {
	x: number
	y: number
	w: number
	h?: number
}) {
	const step = w / 5
	return (
		<g stroke={MAT.rose.line} strokeWidth={1.1} strokeLinejoin="round">
			<path
				d={`M${x + 5} ${y} H${x + w - 5} L${x + w} ${y + h} H${x} Z`}
				fill="#f58bac"
			/>
			{[1, 3].map((i) => (
				<path
					key={i}
					d={`M${x + 5 + (i * (w - 10)) / 5} ${y} h${(w - 10) / 5} L${x + (i + 1) * step} ${y + h} H${x + i * step} Z`}
					fill="#fff4e9"
					stroke="none"
				/>
			))}
			{[0, 1, 2, 3, 4].map((i) => (
				<path
					key={i}
					d={`M${x + i * step} ${y + h} h${step} v2 q${-step / 2} ${step * 0.55} ${-step} 0 Z`}
					fill={i % 2 ? "#fff4e9" : "#e26a94"}
				/>
			))}
			<path
				d={`M${x + 5} ${y} H${x + w - 5} M${x} ${y + h} H${x + w}`}
				fill="none"
			/>
			<path
				d={`M${x + 6} ${y + 1.5} H${x + w - 6}`}
				stroke="#ffffff"
				opacity={0.5}
			/>
		</g>
	)
}

function MiniHat({
	x,
	y,
	color = "#7c5cf0",
}: {
	x: number
	y: number
	color?: string
}) {
	return (
		<g stroke="#4a33a3" strokeWidth={1.2} strokeLinejoin="round">
			<rect x={x - 5} y={y - 10} width={10} height={9} rx={1.5} fill={color} />
			<rect x={x - 8} y={y - 2} width={16} height={3.2} rx={1.6} fill={color} />
			<rect
				x={x - 5}
				y={y - 5}
				width={10}
				height={1.8}
				fill="#ffd95e"
				stroke="none"
			/>
		</g>
	)
}

function Crate({ x, y }: { x: number; y: number }) {
	return (
		<g stroke={MAT.wood.line} strokeWidth={1.2} strokeLinejoin="round">
			<rect x={x} y={y} width={14} height={11} rx={1} fill={MAT.wood.light} />
			<line x1={x} y1={y + 5.5} x2={x + 14} y2={y + 5.5} />
			<line x1={x + 7} y1={y} x2={x + 7} y2={y + 11} />
		</g>
	)
}

function SklepikArt({ level, size }: { level: number; size: number | string }) {
	const uid = useId()
	const tall = level === 3
	const eave = tall ? 32 : 52
	return (
		<svg viewBox="0 0 150 116" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={["cream", "wood", "rose", "plum", "teal"]} />
			<GroundShadow cx={75} cy={111} rx={58} />
			{level === 1 ? (
				<g strokeLinejoin="round">
					<path
						d="M38 102 V37 M111 102 V37 M38 46 H111 M39 61 L52 48 M110 61 L97 48"
						fill="none"
						stroke={MAT.wood.shade}
						strokeWidth={3}
					/>
					<path
						d="M31 79 L41 72 H119 L109 79 Z"
						fill={MAT.wood.light}
						stroke={MAT.wood.line}
						strokeWidth={1.2}
					/>
					<path
						d="M109 79 L119 72 V102 L109 108 Z"
						fill={MAT.wood.shade}
						stroke={MAT.wood.line}
						strokeWidth={1.2}
					/>
					<rect
						x={31}
						y={79}
						width={78}
						height={29}
						rx={1}
						fill={fillOf(uid, "wood")}
						stroke={MAT.wood.line}
						strokeWidth={1.3}
					/>
					<path
						d="M34 82 H107 M34 99 H107 M39 84 V105 M101 84 V105"
						fill="none"
						stroke={MAT.wood.shade}
						strokeWidth={1.3}
					/>
					<path d="M32 80 H108" stroke={MAT.wood.light} strokeWidth={2} />
					<MiniHat x={51} y={76} />
					<MiniHat x={89} y={76} color="#ed769c" />
					<Awning x={25} y={29} w={99} h={17} />
					<path
						d="M65 51 V56 M85 51 V56"
						stroke={MAT.wood.line}
						strokeWidth={1}
					/>
					<rect
						x={61}
						y={55}
						width={28}
						height={10}
						rx={2}
						fill={MAT.cream.light}
						stroke={MAT.wood.line}
						strokeWidth={1}
					/>
					<path
						d="M69 61 H81 M71 59 H79"
						stroke={MAT.rose.dark}
						strokeWidth={1.5}
						strokeLinecap="round"
					/>
					<Crate x={12} y={98} />
					<Crate x={124} y={98} />
					<path
						d="M16 98 Q11 91 17 91 Q22 85 23 93 L23 98"
						fill="#6eae73"
						stroke="#4b8855"
						strokeWidth={0.8}
					/>
				</g>
			) : (
				<g strokeLinejoin="round" strokeLinecap="round">
					{/* A pitched roof with a long ridge and coherent side wall. */}
					<path
						d={`M116 ${eave} L131 ${eave - 8} V101 L116 108 Z`}
						fill={MAT.cream.shade}
						stroke={MAT.cream.line}
						strokeWidth={1.3}
					/>
					<path
						d={`M27 ${eave} V108 H116 V${eave} Z`}
						fill={fillOf(uid, "cream")}
						stroke={MAT.cream.line}
						strokeWidth={1.3}
					/>
					<path
						d={`M20 ${eave} L37 ${eave - 22} H115 L123 ${eave} Z`}
						fill={fillOf(uid, "rose")}
						stroke={MAT.rose.line}
						strokeWidth={1.5}
					/>
					<path
						d={`M115 ${eave - 22} L137 ${eave - 8} L123 ${eave} Z`}
						fill={MAT.rose.shade}
						stroke={MAT.rose.line}
						strokeWidth={1.3}
					/>
					<path
						d={`M25 ${eave - 7} H120 M31 ${eave - 14} H117 M48 ${eave - 20} L45 ${eave - 15} M76 ${eave - 13} L75 ${eave - 8} M99 ${eave - 7} V${eave - 2}`}
						fill="none"
						stroke={MAT.rose.line}
						strokeWidth={0.8}
						opacity={0.35}
					/>
					<path
						d={`M20 ${eave} H123 L137 ${eave - 8}`}
						fill="none"
						stroke={MAT.rose.line}
						strokeWidth={2.5}
					/>
					<path
						d={`M22 ${eave - 1} H122`}
						stroke={MAT.rose.light}
						strokeWidth={1}
					/>
					<path
						d="M27 102 H116 V108 H27 Z M116 102 L131 95 V101 L116 108 Z"
						fill={MAT.grey.dark}
						stroke={MAT.grey.line}
						strokeWidth={0.9}
					/>
					<path
						d={`M31 ${eave + 3} V101 M112 ${eave + 3} V101`}
						stroke={MAT.wood.dark}
						strokeWidth={2}
					/>
					{tall && (
						<g>
							<path d="M28 58 H115" stroke={MAT.wood.shade} strokeWidth={2} />
							<ArchWin cx={48} y={53} w={10} lit line={MAT.cream.line} />
							<ArchWin cx={76} y={53} w={10} lit line={MAT.cream.line} />
							<path
								d="M40 40 V51 M56 40 V51 M68 40 V51 M84 40 V51"
								stroke={MAT.teal.shade}
								strokeWidth={2.4}
							/>
							<path
								d="M41 56 Q48 50 55 56 M69 56 Q76 50 83 56"
								fill="none"
								stroke="#609d68"
								strokeWidth={2.5}
							/>
							<path
								d="M41 56 H55 M69 56 H83"
								stroke={MAT.wood.dark}
								strokeWidth={2.5}
							/>
							<circle cx={47} cy={54} r={1.5} fill="#f293ae" />
							<circle cx={77} cy={54} r={1.5} fill="#ffd96e" />
						</g>
					)}
					<rect
						x={37}
						y={tall ? 70 : 65}
						width={42}
						height={27}
						rx={2}
						fill="#c5e7e4"
						stroke={MAT.teal.line}
						strokeWidth={1.3}
					/>
					<path
						d={
							tall
								? "M40 81 L49 72 M44 84 L56 72"
								: "M40 76 L49 67 M44 79 L56 67"
						}
						stroke="#f4ffff"
						strokeWidth={2}
						opacity={0.8}
					/>
					<path
						d="M58 73 V94 M38 94 H78"
						stroke={MAT.teal.line}
						strokeWidth={1}
					/>
					<MiniHat x={48} y={92} />
					<MiniHat x={68} y={92} color="#ed769c" />
					<rect
						x={34}
						y={96}
						width={48}
						height={3}
						rx={1}
						fill={MAT.cream.light}
						stroke={MAT.cream.line}
						strokeWidth={0.9}
					/>
					<Awning x={33} y={tall ? 61 : 55} w={50} h={10} />
					<Door cx={99} y={103} w={17} mat="teal" line={MAT.teal.line} />
					<path
						d="M89 104 H109 L111 108 H87 Z"
						fill={MAT.grey.light}
						stroke={MAT.grey.line}
						strokeWidth={0.8}
					/>
					{/* Bracket makes the hat sign read as a hanging shop sign. */}
					<path
						d={`M113 ${tall ? 41 : 55} H101 V${tall ? 46 : 60}`}
						fill="none"
						stroke={MAT.wood.line}
						strokeWidth={1.5}
					/>
					<g transform={`translate(101 ${tall ? 54 : 68})`}>
						<circle
							r={8}
							fill={MAT.cream.light}
							stroke={MAT.wood.line}
							strokeWidth={1.1}
						/>
						<g transform="translate(0 3) scale(0.7)">
							<MiniHat x={0} y={0} />
						</g>
					</g>
					<path
						d="M121 68 L127 65 V79 L121 82 Z"
						fill={GLASS}
						stroke={MAT.cream.line}
						strokeWidth={0.9}
					/>
					<path d="M124 67 V80" stroke={MAT.cream.line} strokeWidth={0.8} />
				</g>
			)}
		</svg>
	)
}

// Dispatcher: jeden punkt wejścia dla plotów, arkusza i BuildReveal.
// `level` 1..3 = zbudowany art; `silhouette` = jednolity cień (niezbudowana
// działka na scenie / wiersz listy) — filtr inline, odporny na brak klas.
// Sylwetka gasi WSZYSTKIE ozdoby: grupy oznaczone `data-decor` (poświaty,
// iskierki, dym, świetliki) chowa reguła `.bldg-silhouette [data-decor]`
// w styles.css — półprzezroczyste światła w brightness(0) stawałyby się
// szarymi bańkami/czarnymi kropkami. Nową ozdobę w arcie ZAWSZE oznacz
// `data-decor`, zamiast dodawać jej własny przełącznik.
export function BuildingArt({
	id,
	level,
	size = 90,
	silhouette = false,
}: {
	id: BuildingId
	level: number
	size?: number | string
	silhouette?: boolean
}) {
	const lvl = Math.max(1, Math.min(MAX_BUILDING_LEVEL, level))
	let art: React.ReactElement
	switch (id) {
		case "zamek":
			art = <ZamekArt level={lvl} size={size} />
			break
		case "domki":
			art = <DomkiArt level={lvl} size={size} />
			break
		case "fontanna":
			art = <FontannaArt level={lvl} size={size} />
			break
		case "plac-zabaw":
			art = <PlacZabawArt level={lvl} size={size} />
			break
		case "latarnie":
			art = <LatarnieArt level={lvl} size={size} />
			break
		case "ogrodek":
			art = <OgrodekArt level={lvl} size={size} />
			break
		case "sklepik":
			art = <SklepikArt level={lvl} size={size} />
			break
	}
	if (!silhouette) return art
	return (
		<span
			className="bldg-silhouette"
			style={{
				display: "block",
				width: "100%",
				height: "100%",
				filter: "brightness(0) saturate(0)",
				opacity: 0.3,
			}}
		>
			{art}
		</span>
	)
}
