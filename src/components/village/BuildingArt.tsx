import type { CSSProperties, ReactNode } from "react"
import { useId } from "react"
import type { BuildingId, DecorationId } from "../../game/village"
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
					x2="0"
					y2="1"
				>
					<stop offset="0%" stopColor={MAT[n].light} />
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
			<rect
				x={x}
				y={top}
				width={w}
				height={bottom - top}
				rx={2}
				fill={fillOf(uid, mat)}
				stroke={m.line}
				strokeWidth={1.8}
			/>
			<rect
				x={x + w * 0.68}
				y={top + 1}
				width={w * 0.3}
				height={bottom - top - 2}
				rx={1.5}
				fill={m.shade}
				opacity={0.35}
			/>
			<rect
				x={x + 1.5}
				y={top + 1}
				width={w * 0.14}
				height={bottom - top - 2}
				rx={1}
				fill="#ffffff"
				opacity={0.28}
			/>
			<Masonry x={x} y={top} w={w} h={bottom - top} color={m.line} />
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
						d={`M${cx - eave / 2 + 1} ${top - 3} L${cx} ${top - roofH} L${cx + eave / 2 - 1} ${top - 3} Z`}
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
			<ArchWin
				cx={cx}
				y={top + (bottom - top) * 0.55}
				w={Math.min(12, w * 0.32)}
				lit={lit}
				line={m.line}
			/>
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
	const lit = gold
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
				{/* brama: kamienne obramienie + ciemny łuk + kratownica */}
				<path
					d="M77 168 v-20 a18 18 0 0 1 36 0 v20 Z"
					fill={m.shade}
					opacity={0.5}
				/>
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
	const foot = 92
	const top = 56
	return (
		<g>
			{/* bok (prawy, w cieniu) */}
			<path
				d={`M${x + 38} ${top} L${x + 50} ${top - 6} L${x + 50} ${foot - 6} L${x + 38} ${foot} Z`}
				fill={m.dark}
				stroke={m.line}
				strokeWidth={1.6}
				strokeLinejoin="round"
			/>
			<path
				d={`M${x + 38} ${top} L${x + 50} ${top - 6} L${x + 50} ${foot - 6} L${x + 38} ${foot} Z`}
				fill={m.shade}
				opacity={0.45}
			/>
			{/* front */}
			<rect
				x={x}
				y={top}
				width={38}
				height={foot - top}
				fill={fillOf(uid, "cream")}
				stroke={m.line}
				strokeWidth={1.6}
			/>
			{/* podmurówka */}
			<rect
				x={x}
				y={foot - 6}
				width={38}
				height={6}
				fill={MAT.grey.dark}
				stroke={m.line}
				strokeWidth={1.2}
			/>
			{timber && (
				<g
					stroke={MAT.wood.shade}
					strokeWidth={2}
					strokeLinecap="round"
					opacity={0.85}
				>
					<line x1={x + 3} y1={top + 2} x2={x + 3} y2={foot - 7} />
					<line x1={x + 35} y1={top + 2} x2={x + 35} y2={foot - 7} />
					<line x1={x + 3} y1={top + 18} x2={x + 35} y2={top + 18} />
					<line x1={x + 3} y1={top + 18} x2={x + 12} y2={top + 3} />
					<line x1={x + 35} y1={top + 18} x2={x + 26} y2={top + 3} />
				</g>
			)}
			{/* dach: bok (ciemniejszy, z gontem) + szczyt frontowy */}
			<path
				d={`M${x + 19} ${top - 26} L${x + 31} ${top - 32} L${x + 54} ${top - 6} L${x + 42} ${top} Z`}
				fill={r.shade}
				stroke={r.line}
				strokeWidth={1.6}
				strokeLinejoin="round"
			/>
			<g stroke={r.light} strokeWidth={0.9} opacity={0.35} fill="none">
				<path d={`M${x + 24} ${top - 20} L${x + 36} ${top - 26}`} />
				<path d={`M${x + 31} ${top - 12} L${x + 43} ${top - 18}`} />
				<path d={`M${x + 38} ${top - 4} L${x + 50} ${top - 10}`} />
			</g>
			<path
				d={`M${x - 4} ${top + 1} L${x + 19} ${top - 26} L${x + 42} ${top + 1} Z`}
				fill={fillOf(uid, roof)}
				stroke={r.line}
				strokeWidth={1.8}
				strokeLinejoin="round"
			/>
			<path
				d={`M${x + 19} ${top - 26} L${x + 42} ${top + 1} L${x + 19} ${top + 1} Z`}
				fill={r.shade}
				opacity={0.25}
			/>
			<rect
				x={x - 5}
				y={top - 1}
				width={48}
				height={3.5}
				rx={1.5}
				fill={r.dark}
				stroke={r.line}
				strokeWidth={1.2}
			/>
			{/* komin + dym */}
			<rect
				x={x + 26}
				y={top - 22}
				width={7}
				height={12}
				fill={MAT.grey.dark}
				stroke={MAT.grey.line}
				strokeWidth={1.2}
			/>
			<rect
				x={x + 25}
				y={top - 24}
				width={9}
				height={3}
				rx={1}
				fill={MAT.grey.light}
				stroke={MAT.grey.line}
				strokeWidth={1.2}
			/>
			{smoke && (
				<g data-decor fill="#ffffff" opacity={0.8}>
					<circle cx={x + 30} cy={top - 30} r={3} className="anim-float" />
					<circle
						cx={x + 33}
						cy={top - 38}
						r={2.2}
						className="anim-float"
						style={{ animationDelay: "0.9s" }}
					/>
				</g>
			)}
			{/* drzwi + okno + skrzynka z kwiatami */}
			<Door cx={x + 12} y={foot - 6} w={12} line={m.line} />
			<RoundWin cx={x + 28} cy={top + 12} lit={lit} line={m.line} />
			<rect
				x={x + 22}
				y={top + 26}
				width={13}
				height={4}
				rx={1}
				fill={MAT.wood.dark}
				stroke={MAT.wood.line}
				strokeWidth={1}
			/>
			<g>
				<circle cx={x + 25} cy={top + 25} r={2} fill="#ff6b9a" />
				<circle cx={x + 29} cy={top + 24} r={2} fill="#ffd95e" />
				<circle cx={x + 33} cy={top + 25} r={2} fill="#ff6b9a" />
			</g>
		</g>
	)
}

function DomkiArt({ level, size }: { level: number; size: number | string }) {
	const uid = useId()
	const xs = level === 1 ? [56] : level === 2 ? [22, 90] : [4, 58, 112]
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
						d="M8 22 Q85 6 162 22"
						stroke="#6b4318"
						strokeWidth={1.3}
						fill="none"
					/>
					{[24, 48, 72, 96, 120, 144].map((x, i) => (
						<path
							key={x}
							d={`M${x} ${18 - Math.sin((i / 5) * Math.PI) * 5} l4 8 l-9 -1 Z`}
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
					roof={roofs[(i + level) % 3] ?? "plum"}
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
	const rainbow = level >= 3
	const g = MAT.grey
	return (
		<svg viewBox="0 0 120 100" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={["grey"]} />
			<defs>
				<linearGradient id={`fw-${uid}`} x1="0" y1="0" x2="1" y2="0">
					{rainbow ? (
						<>
							<stop offset="0%" stopColor="#8fdcff" />
							<stop offset="50%" stopColor="#d4c6ff" />
							<stop offset="100%" stopColor="#ffb3d1" />
						</>
					) : (
						<>
							<stop offset="0%" stopColor="#9fe1ff" />
							<stop offset="100%" stopColor="#4cb8ee" />
						</>
					)}
				</linearGradient>
			</defs>
			<GroundShadow cx={60} cy={95} rx={50} />
			{/* strugi wody: ciemniejszy obrys + jasny rdzeń */}
			{[
				"M60 22 C46 30 42 48 40 66",
				"M60 22 C74 30 78 48 80 66",
				...(level >= 2
					? [
							"M60 20 C60 36 60 50 60 58",
							"M60 24 C52 34 49 50 48 64",
							"M60 24 C68 34 71 50 72 64",
						]
					: []),
			].map((d, i) => (
				<g key={d} fill="none" strokeLinecap="round">
					<path d={d} stroke="#3d93c9" strokeWidth={i < 2 ? 4.2 : 3} />
					<path d={d} stroke="#c9f0ff" strokeWidth={i < 2 ? 1.6 : 1.1} />
				</g>
			))}
			{/* kolumna z dwiema czaszami */}
			<g stroke={g.line} strokeWidth={1.6}>
				<rect x={54} y={40} width={12} height={34} fill={fillOf(uid, "grey")} />
				<rect
					x={62}
					y={41}
					width={4}
					height={32}
					fill={g.shade}
					opacity={0.4}
					stroke="none"
				/>
				<ellipse cx={60} cy={41} rx={17} ry={5.5} fill={g.light} />
				<path
					d="M43 41 a17 5.5 0 0 0 34 0 v3 a17 6 0 0 1 -34 0 Z"
					fill={g.dark}
				/>
				<ellipse
					cx={60}
					cy={40}
					rx={12}
					ry={3}
					fill="#9fe1ff"
					stroke="none"
					opacity={0.9}
				/>
				<rect x={56} y={26} width={8} height={14} fill={fillOf(uid, "grey")} />
				<ellipse cx={60} cy={26} rx={9} ry={3} fill={g.light} />
				<circle cx={60} cy={19} r={4.5} fill="#bfe9ff" />
			</g>
			{/* basen: cembrowina z bloków + woda */}
			<g stroke={g.line} strokeWidth={1.6}>
				<ellipse cx={60} cy={80} rx={50} ry={13} fill={g.dark} />
				<path
					d="M10 80 a50 13 0 0 0 100 0 v6 a50 13 0 0 1 -100 0 Z"
					fill={g.shade}
					opacity={0.5}
					stroke="none"
				/>
				<ellipse cx={60} cy={78} rx={46} ry={11} fill={fillOf(uid, "grey")} />
				<ellipse
					cx={60}
					cy={77}
					rx={38}
					ry={8}
					fill={`url(#fw-${uid})`}
					stroke="#3d93c9"
				/>
			</g>
			{/* bloki cembrowiny */}
			<g stroke={g.line} strokeWidth={0.9} opacity={0.35}>
				{[18, 30, 42, 54, 66, 78, 90, 102].map((x) => (
					<line key={x} x1={x} y1={87} x2={x + 2} y2={92} />
				))}
			</g>
			{/* falki i bliki na wodzie */}
			<g
				fill="none"
				stroke="#ffffff"
				strokeWidth={1.2}
				strokeLinecap="round"
				opacity={0.75}
			>
				<path d="M30 76 q5 -1.5 10 0" />
				<path d="M78 79 q6 -1.5 12 0" />
			</g>
			<g data-decor fill="#ffffff">
				<circle cx={40} cy={74} r={2} className="anim-sparkle" />
				{level >= 2 && (
					<circle
						cx={80}
						cy={76}
						r={2.2}
						className="anim-sparkle"
						style={{ animationDelay: "0.7s" }}
					/>
				)}
				{rainbow && (
					<>
						<circle
							cx={60}
							cy={72}
							r={2.4}
							className="anim-sparkle"
							style={{ animationDelay: "1.3s" }}
						/>
						<circle
							cx={60}
							cy={10}
							r={2}
							className="anim-sparkle"
							style={{ animationDelay: "0.4s" }}
						/>
					</>
				)}
			</g>
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
			<GroundShadow cx={85} cy={99} rx={76} />
			{/* piaskownica pod zjeżdżalnią */}
			<ellipse
				cx={110}
				cy={92}
				rx={44}
				ry={7}
				fill="#f3e2b3"
				stroke="#d9c08a"
				strokeWidth={1.2}
			/>
			{/* wieżyczka zjeżdżalni */}
			<g stroke={MAT.wood.line} strokeWidth={2} strokeLinecap="round">
				<line
					x1={140}
					y1={94}
					x2={140}
					y2={40}
					stroke={MAT.wood.dark}
					strokeWidth={4}
				/>
				<line
					x1={158}
					y1={94}
					x2={158}
					y2={40}
					stroke={MAT.wood.dark}
					strokeWidth={4}
				/>
				{[52, 64, 76, 88].map((y) => (
					<line
						key={y}
						x1={140}
						y1={y}
						x2={158}
						y2={y}
						stroke={MAT.wood.dark}
						strokeWidth={2.4}
					/>
				))}
			</g>
			<rect
				x={128}
				y={36}
				width={38}
				height={8}
				rx={2}
				fill={fillOf(uid, "wood")}
				stroke={MAT.wood.line}
				strokeWidth={1.6}
			/>
			{/* daszek namiotowy */}
			<path
				d="M124 36 L147 14 L170 36 Z"
				fill={fillOf(uid, "rose")}
				stroke={MAT.rose.line}
				strokeWidth={1.8}
				strokeLinejoin="round"
			/>
			<path d="M147 14 L170 36 L147 36 Z" fill={MAT.rose.shade} opacity={0.3} />
			<Pennant x={147} y={14} color="#ffd95e" />
			{/* ślizg: burty + rynna z blikiem */}
			<path
				d="M130 42 Q104 84 66 92"
				stroke={MAT.plum.line}
				strokeWidth={15}
				strokeLinecap="round"
				fill="none"
			/>
			<path
				d="M130 42 Q104 84 66 92"
				stroke={MAT.plum.dark}
				strokeWidth={11}
				strokeLinecap="round"
				fill="none"
			/>
			<path
				d="M130 42 Q104 84 66 92"
				stroke="#ffd95e"
				strokeWidth={6}
				strokeLinecap="round"
				fill="none"
			/>
			<path
				d="M128 44 Q104 82 70 90"
				stroke="#fff3b8"
				strokeWidth={1.6}
				strokeLinecap="round"
				fill="none"
				opacity={0.8}
			/>
			{/* podpora ślizgu */}
			<line
				x1={96}
				y1={76}
				x2={96}
				y2={94}
				stroke={MAT.wood.dark}
				strokeWidth={3}
				strokeLinecap="round"
			/>
			{/* huśtawka (L2+) — A-rama */}
			{level >= 2 && (
				<g strokeLinecap="round">
					<path
						d="M6 94 L22 30 M40 94 L24 30"
						stroke={MAT.rose.dark}
						strokeWidth={4}
						fill="none"
					/>
					<path
						d="M6 94 L22 30 M40 94 L24 30"
						stroke={MAT.rose.line}
						strokeWidth={1.2}
						fill="none"
						opacity={0.5}
					/>
					<line
						x1={14}
						y1={30}
						x2={60}
						y2={30}
						stroke={MAT.plum.dark}
						strokeWidth={4}
					/>
					<line
						x1={14}
						y1={30}
						x2={60}
						y2={30}
						stroke={MAT.plum.line}
						strokeWidth={1.2}
						opacity={0.5}
					/>
					<path
						d="M52 94 L58 30 M64 94 L60 30"
						stroke={MAT.rose.dark}
						strokeWidth={4}
						fill="none"
					/>
					<line
						x1={30}
						y1={30}
						x2={30}
						y2={66}
						stroke="#6b4318"
						strokeWidth={1.6}
					/>
					<line
						x1={44}
						y1={30}
						x2={44}
						y2={66}
						stroke="#6b4318"
						strokeWidth={1.6}
					/>
					<rect
						x={25}
						y={65}
						width={24}
						height={6}
						rx={3}
						fill={fillOf(uid, "teal")}
						stroke={MAT.teal.line}
						strokeWidth={1.4}
					/>
				</g>
			)}
			{/* trampolina (L3) */}
			{level >= 3 && (
				<g>
					<line
						x1={74}
						y1={94}
						x2={80}
						y2={80}
						stroke={MAT.grey.line}
						strokeWidth={2.4}
						strokeLinecap="round"
					/>
					<line
						x1={124}
						y1={94}
						x2={118}
						y2={80}
						stroke={MAT.grey.line}
						strokeWidth={2.4}
						strokeLinecap="round"
					/>
					<ellipse
						cx={99}
						cy={78}
						rx={27}
						ry={8}
						fill={MAT.plum.dark}
						stroke={MAT.plum.line}
						strokeWidth={1.8}
					/>
					<ellipse
						cx={99}
						cy={76.5}
						rx={21}
						ry={5}
						fill={fillOf(uid, "plum")}
						stroke={MAT.plum.line}
						strokeWidth={1.2}
					/>
					<g data-decor fill="#ffffff">
						<circle cx={84} cy={62} r={2} className="anim-sparkle" />
						<circle
							cx={114}
							cy={58}
							r={1.8}
							className="anim-sparkle"
							style={{ animationDelay: "0.8s" }}
						/>
					</g>
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
	// stały viewBox (szerokość alei L3): L1/L2 to mniej latarni wyśrodkowanych
	// w tym samym pudle — wysokość artu nie zależy od poziomu (układ działek
	// liczy proporcje z jednego viewBoxu)
	const vbWidth = 116
	const lamps = Array.from(
		{ length: level },
		(_, i) => vbWidth / 2 + (i - (level - 1) / 2) * 34,
	)
	const line = MAT.plum.line
	return (
		<svg
			viewBox={`0 0 ${vbWidth} 100`}
			style={svgStyle(size)}
			aria-hidden="true"
		>
			<GroundShadow cx={vbWidth / 2} cy={97} rx={10 + level * 17} />
			{lamps.map((x, i) => (
				<g key={x}>
					{/* poświata (dwuwarstwowa — naprawdę świeci) */}
					<g data-decor>
						<circle cx={x} cy={24} r={19} fill="#ffd95e" opacity={0.2} />
						<circle cx={x} cy={24} r={11} fill="#ffe9a3" opacity={0.45} />
					</g>
					{/* cokół */}
					<path
						d={`M${x - 8} 96 h16 l-3 -6 h-10 Z`}
						fill={MAT.grey.dark}
						stroke={MAT.grey.line}
						strokeWidth={1.4}
						strokeLinejoin="round"
					/>
					{/* słup z pierścieniami */}
					<line
						x1={x}
						y1={90}
						x2={x}
						y2={34}
						stroke={MAT.plum.shade}
						strokeWidth={4.4}
						strokeLinecap="round"
					/>
					<line
						x1={x - 1}
						y1={88}
						x2={x - 1}
						y2={36}
						stroke="#ffffff"
						strokeWidth={1}
						opacity={0.35}
						strokeLinecap="round"
					/>
					<g fill={MAT.plum.dark} stroke={line} strokeWidth={1}>
						<rect x={x - 3.5} y={80} width={7} height={3} rx={1} />
						<rect x={x - 3.5} y={44} width={7} height={3} rx={1} />
					</g>
					{/* zawijas */}
					<path
						d={`M${x} 46 q9 -1 9 -9`}
						fill="none"
						stroke={line}
						strokeWidth={1.8}
						strokeLinecap="round"
					/>
					{/* latarenka: korpus szklany + ramki + daszek */}
					<g stroke={line} strokeWidth={1.6} strokeLinejoin="round">
						<path d={`M${x - 7} 32 h14 l-2 -14 h-10 Z`} fill="#fff6d0" />
						<path
							d={`M${x - 7} 32 h14 l1 2 h-16 Z`}
							fill={MAT.plum.dark}
							strokeWidth={1.2}
						/>
						<path
							d={`M${x - 8} 18 L${x} 9 L${x + 8} 18 Z`}
							fill={MAT.plum.dark}
						/>
						<path
							d={`M${x} 9 L${x + 8} 18 L${x} 18 Z`}
							fill={MAT.plum.shade}
							opacity={0.5}
							stroke="none"
						/>
					</g>
					<line
						x1={x}
						y1={18}
						x2={x}
						y2={32}
						stroke={line}
						strokeWidth={0.8}
						opacity={0.5}
					/>
					<circle
						cx={x}
						cy={9}
						r={1.6}
						fill="#ffd95e"
						stroke="#b07a12"
						strokeWidth={0.8}
					/>
					<ellipse cx={x} cy={25} rx={2.8} ry={3.4} fill="#ffb020" />
					<ellipse cx={x} cy={24} rx={1.3} ry={1.8} fill="#fff6d0" />
					{/* świetliki (L2+) */}
					{level >= 2 && (
						<circle
							data-decor
							cx={x + 13}
							cy={46 + i * 7}
							r={1.9}
							fill="#fff3b0"
							className="anim-firefly"
							style={{ animationDelay: `${i * 0.9}s` }}
						/>
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
	const flowers: {
		x: number
		kind: "tulip" | "daisy" | "sunflower" | "bell"
		s: number
	}[] = [
		{ x: 24, kind: "tulip", s: 1 },
		{ x: 50, kind: "sunflower", s: 1.15 },
		{ x: 76, kind: "tulip", s: 1 },
		...(level >= 2
			? [
					{ x: 37, kind: "bell" as const, s: 0.95 },
					{ x: 63, kind: "daisy" as const, s: 0.95 },
				]
			: []),
		...(level >= 3
			? [
					{ x: 12, kind: "daisy" as const, s: 0.9 },
					{ x: 88, kind: "bell" as const, s: 0.9 },
				]
			: []),
	]
	return (
		<svg viewBox="0 0 110 80" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={["wood", "cream"]} />
			<GroundShadow cx={55} cy={76} rx={50} />
			{/* pergola (L3) */}
			{level >= 3 && (
				<g>
					<path
						d="M14 62 V22 Q14 10 30 10 H80 Q96 10 96 22 V62"
						fill="none"
						stroke={MAT.wood.dark}
						strokeWidth={3.5}
						strokeLinecap="round"
					/>
					<path
						d="M14 62 V22 Q14 10 30 10 H80 Q96 10 96 22 V62"
						fill="none"
						stroke={MAT.wood.line}
						strokeWidth={1}
						opacity={0.5}
					/>
					{/* pnącze z kwiatkami */}
					<path
						d="M18 40 Q14 28 24 16 Q40 8 60 12 Q80 8 92 22 Q96 32 92 42"
						fill="none"
						stroke="#5bb96f"
						strokeWidth={2}
					/>
					{[
						[22, 24],
						[34, 12],
						[58, 11],
						[82, 14],
						[93, 30],
					].map(([x, y]) => (
						<circle
							key={`${x}-${y}`}
							cx={x}
							cy={y}
							r={2.4}
							fill="#ff8fb0"
							stroke="#c9508a"
							strokeWidth={0.8}
						/>
					))}
					<g data-decor fill="#ffffff">
						<circle cx={26} cy={30} r={1.8} className="anim-sparkle" />
						<circle
							cx={86}
							cy={24}
							r={1.8}
							className="anim-sparkle"
							style={{ animationDelay: "0.8s" }}
						/>
					</g>
				</g>
			)}
			{/* płotek sztachetowy z tyłu */}
			<g stroke={MAT.cream.line} strokeWidth={1.3} strokeLinejoin="round">
				{[6, 20, 34, 48, 62, 76, 90, 104].map((x) => (
					<path
						key={x}
						d={`M${x - 2.5} 60 v-16 l2.5 -4 l2.5 4 v16 Z`}
						fill={fillOf(uid, "cream")}
					/>
				))}
				<line
					x1={2}
					y1={49}
					x2={108}
					y2={49}
					stroke={MAT.cream.dark}
					strokeWidth={3.5}
				/>
				<line x1={2} y1={49} x2={108} y2={49} strokeWidth={1} />
			</g>
			{/* skrzynia grządki: bok + front + ziemia */}
			<path
				d="M8 74 L4 68 H98 L102 74 Z"
				fill={MAT.wood.light}
				stroke={MAT.wood.line}
				strokeWidth={1.3}
				strokeLinejoin="round"
			/>
			<path d="M4 58 H98 V68 H4 Z" fill="#8a5a3a" />
			<rect
				x={4}
				y={62}
				width={94}
				height={8}
				rx={1.5}
				fill={fillOf(uid, "wood")}
				stroke={MAT.wood.line}
				strokeWidth={1.4}
			/>
			<rect
				x={80}
				y={63}
				width={17}
				height={6}
				fill={MAT.wood.shade}
				opacity={0.35}
			/>
			<line
				x1={6}
				y1={64}
				x2={96}
				y2={64}
				stroke="#ffffff"
				strokeWidth={0.8}
				opacity={0.35}
			/>
			<ellipse cx={51} cy={60} rx={45} ry={4} fill="#7a4a24" />
			{/* kwiaty */}
			{flowers.map(({ x, kind, s }) => (
				<FlowerGlyph key={x} kind={kind} x={x} y={60} scale={s} />
			))}
			{/* konewka (L2) */}
			{level >= 2 && (
				<g stroke={MAT.teal.line} strokeWidth={1.3} strokeLinejoin="round">
					<rect
						x={92}
						y={66}
						width={12}
						height={9}
						rx={2}
						fill={MAT.teal.dark}
					/>
					<path
						d="M92 68 L84 63"
						fill="none"
						strokeWidth={2}
						strokeLinecap="round"
					/>
					<path d="M104 68 q6 1 3 7" fill="none" />
					<circle cx={83} cy={62.5} r={2} fill={MAT.teal.light} />
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
	const n = 5
	const step = w / n
	return (
		<g stroke={MAT.rose.line} strokeWidth={1.5}>
			<rect x={x} y={y} width={w} height={h} rx={3} fill="#ff8fb0" />
			{Array.from({ length: Math.floor(n / 2) }, (_, i) => (
				<rect
					key={i}
					x={x + (i * 2 + 1) * step}
					y={y}
					width={step}
					height={h}
					fill="#fff1f2"
					stroke="none"
				/>
			))}
			<rect
				x={x}
				y={y}
				width={w}
				height={h * 0.35}
				fill="#ffffff"
				opacity={0.3}
				stroke="none"
			/>
			{Array.from({ length: n }, (_, i) => (
				<path
					key={`f${i}`}
					d={`M${x + i * step} ${y + h} a${step / 2} ${step / 2} 0 0 0 ${step} 0`}
					fill={i % 2 ? "#fff1f2" : "#ff8fb0"}
				/>
			))}
			<rect x={x} y={y} width={w} height={h} rx={3} fill="none" />
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
	const boutique = level >= 3
	const m = MAT.cream
	return (
		<svg viewBox="0 0 150 116" style={svgStyle(size)} aria-hidden="true">
			<MatDefs uid={uid} names={["cream", "wood", "rose", "plum"]} />
			<GroundShadow cx={75} cy={112} rx={level === 1 ? 52 : 62} />

			{level === 1 ? (
				// L1 stragan: lada z desek (front + bok), słupki, markiza, towar
				<g>
					<line
						x1={36}
						y1={80}
						x2={36}
						y2={34}
						stroke={MAT.wood.dark}
						strokeWidth={3.5}
						strokeLinecap="round"
					/>
					<line
						x1={112}
						y1={80}
						x2={112}
						y2={34}
						stroke={MAT.wood.dark}
						strokeWidth={3.5}
						strokeLinecap="round"
					/>
					<path
						d="M114 78 L124 72 L124 102 L114 108 Z"
						fill={MAT.wood.shade}
						stroke={MAT.wood.line}
						strokeWidth={1.4}
						strokeLinejoin="round"
					/>
					<rect
						x={30}
						y={78}
						width={84}
						height={30}
						rx={2}
						fill={fillOf(uid, "wood")}
						stroke={MAT.wood.line}
						strokeWidth={1.6}
					/>
					<g stroke={MAT.wood.line} strokeWidth={0.9} opacity={0.35}>
						<line x1={32} y1={88} x2={112} y2={88} />
						<line x1={32} y1={98} x2={112} y2={98} />
					</g>
					<rect
						x={30}
						y={78}
						width={84}
						height={4}
						fill="#ffffff"
						opacity={0.3}
					/>
					{/* towar */}
					<MiniHat x={54} y={76} />
					<MiniHat x={90} y={76} color="#ff5e8a" />
					<Crate x={8} y={97} />
					<Crate x={128} y={97} />
					<circle
						cx={15}
						cy={95}
						r={3.5}
						fill="#ff6b6b"
						stroke="#a02b55"
						strokeWidth={0.9}
					/>
					<circle
						cx={135}
						cy={95}
						r={3.5}
						fill="#ffd23f"
						stroke="#b07a12"
						strokeWidth={0.9}
					/>
					<Awning x={24} y={26} w={100} />
				</g>
			) : (
				// L2 sklepik / L3 butik: budynek z witryną, markizą i szyldem
				<g>
					{/* bok (prawy, w cieniu) */}
					<path
						d={`M124 ${boutique ? 20 : 46} L136 ${boutique ? 14 : 40} L136 102 L124 108 Z`}
						fill={m.shade}
						opacity={0.9}
						stroke={m.line}
						strokeWidth={1.6}
						strokeLinejoin="round"
					/>
					{/* piętro butiku (L3) */}
					{boutique && (
						<g>
							<rect
								x={26}
								y={20}
								width={98}
								height={32}
								fill={fillOf(uid, "cream")}
								stroke={m.line}
								strokeWidth={1.6}
							/>
							<ArchWin cx={50} y={44} w={12} lit line={m.line} />
							<ArchWin cx={100} y={44} w={12} lit line={m.line} />
							{/* balkonik */}
							<rect
								x={64}
								y={40}
								width={22}
								height={3}
								rx={1}
								fill={MAT.wood.dark}
								stroke={MAT.wood.line}
								strokeWidth={1}
							/>
							<g stroke={MAT.plum.line} strokeWidth={1.1}>
								{[67, 71, 75, 79, 83].map((x) => (
									<line key={x} x1={x} y1={30} x2={x} y2={40} />
								))}
								<line x1={65} y1={30} x2={85} y2={30} strokeWidth={1.6} />
							</g>
							<ArchWin cx={75} y={40} w={12} lit line={m.line} />
						</g>
					)}
					{/* dach: bok + front */}
					<path
						d={
							boutique
								? "M75 4 L88 -2 L140 14 L124 20 Z"
								: "M75 28 L88 22 L140 40 L124 46 Z"
						}
						fill={MAT.rose.shade}
						stroke={MAT.rose.line}
						strokeWidth={1.6}
						strokeLinejoin="round"
					/>
					<path
						d={boutique ? "M22 20 L75 4 L128 20 Z" : "M20 46 L75 28 L130 46 Z"}
						fill={fillOf(uid, "rose")}
						stroke={MAT.rose.line}
						strokeWidth={1.8}
						strokeLinejoin="round"
					/>
					<path
						d={boutique ? "M75 4 L128 20 L75 20 Z" : "M75 28 L130 46 L75 46 Z"}
						fill={MAT.rose.shade}
						opacity={0.25}
					/>
					<rect
						x={20}
						y={boutique ? 18 : 44}
						width={110}
						height={4}
						rx={1.5}
						fill={MAT.rose.dark}
						stroke={MAT.rose.line}
						strokeWidth={1.2}
					/>
					{boutique && <Pennant x={75} y={4} color="#ff6b9a" />}
					{/* parter */}
					<rect
						x={26}
						y={boutique ? 52 : 48}
						width={98}
						height={boutique ? 56 : 60}
						fill={fillOf(uid, "cream")}
						stroke={m.line}
						strokeWidth={1.6}
					/>
					<rect
						x={26}
						y={102}
						width={98}
						height={6}
						fill={MAT.grey.dark}
						stroke={m.line}
						strokeWidth={1.2}
					/>
					{/* witryna z towarem */}
					<rect
						x={34}
						y={boutique ? 66 : 62}
						width={40}
						height={28}
						rx={2.5}
						fill="#e9e3ff"
						stroke={m.line}
						strokeWidth={1.5}
					/>
					<rect
						x={36}
						y={boutique ? 68 : 64}
						width={14}
						height={12}
						fill="#ffffff"
						opacity={0.45}
					/>
					<line
						x1={36}
						y1={boutique ? 88 : 84}
						x2={72}
						y2={boutique ? 88 : 84}
						stroke={MAT.wood.dark}
						strokeWidth={2}
					/>
					<MiniHat x={46} y={boutique ? 88 : 84} />
					<MiniHat x={62} y={boutique ? 88 : 84} color="#ff5e8a" />
					{boutique && (
						<circle
							data-decor
							cx={54}
							cy={72}
							r={2.6}
							fill="#ffd95e"
							stroke="#b07a12"
							strokeWidth={1}
							className="anim-sparkle"
						/>
					)}
					<Awning x={30} y={boutique ? 54 : 50} w={48} h={11} />
					{/* drzwi + szyld z kapeluszem */}
					<Door cx={104} y={102} w={16} line={m.line} />
					{boutique && (
						<circle
							data-decor
							cx={104}
							cy={72}
							r={13}
							fill="#ffd95e"
							opacity={0.28}
						/>
					)}
					<line
						x1={104}
						y1={60}
						x2={104}
						y2={64}
						stroke={MAT.wood.line}
						strokeWidth={1.4}
					/>
					<circle
						cx={104}
						cy={72}
						r={8.5}
						fill={boutique ? "#ffd95e" : "#fff7ed"}
						stroke={m.line}
						strokeWidth={1.5}
					/>
					<MiniHat x={104} y={76} color="#5f45c4" />
					{/* lampiony butiku */}
					{boutique && (
						<g>
							{[30, 120].map((x) => (
								<g key={x}>
									<line
										x1={x}
										y1={52}
										x2={x}
										y2={58}
										stroke={MAT.wood.line}
										strokeWidth={1.2}
									/>
									<circle
										data-decor
										cx={x}
										cy={62}
										r={7}
										fill="#ffb03d"
										opacity={0.3}
									/>
									<ellipse
										cx={x}
										cy={62}
										rx={3.2}
										ry={4.2}
										fill="#ffb03d"
										stroke="#b07a12"
										strokeWidth={1}
									/>
								</g>
							))}
						</g>
					)}
				</g>
			)}

			{/* iskierki mody (L3) */}
			{boutique && (
				<g data-decor fill="#ffffff">
					<circle cx={30} cy={30} r={2} className="anim-sparkle" />
					<circle
						cx={118}
						cy={36}
						r={1.8}
						className="anim-sparkle"
						style={{ animationDelay: "0.7s" }}
					/>
					<circle
						cx={75}
						cy={-6}
						r={2.2}
						className="anim-sparkle"
						style={{ animationDelay: "1.3s" }}
					/>
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
	const lvl = Math.max(1, Math.min(3, level))
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
