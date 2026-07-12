import type { CSSProperties } from "react"
import { useId } from "react"
import type { BuildingId, DecorationId } from "../../game/village"

// Art budynków wioski: poziom = WIDOCZNY wzrost (rozmiar, wieże, światła) —
// żadnych kropek-poziomów; arkusz budowy pokazuje „poziom X/3" tekstem.
// Ręczne SVG w idiomie potworków (gradienty z palety, zaokrąglenia, gruby
// kontur). `size` może być liczbą (px) lub stringiem CSS ("100%") — wysokość
// wynika z viewBox. Sylwetka (silhouette) = jednolity ciemny cień budynku
// (filtr inline, niezależny od klas Tailwinda) — czytelna aspiracja à la
// Heroes 3, nie wyblakły obrazek.

export const DECORATION_EMOJI: Record<DecorationId, string> = {
	kwiatki: "🌼",
	sciezka: "🐾",
	hustawka: "🌳",
	staw: "🦆",
	pomnik: "🗿",
	tecza: "🌈",
}

const OUTLINE = "#5f45c4"
const STONE_LINE = "#ffffff"

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

// chorągiewka na iglicy (Heroes lubi proporczyki)
function Pennant({
	x,
	y,
	flip = false,
}: {
	x: number
	y: number
	flip?: boolean
}) {
	const dir = flip ? -14 : 14
	return (
		<g>
			<line
				x1={x}
				y1={y}
				x2={x}
				y2={y - 12}
				stroke={OUTLINE}
				strokeWidth={1.6}
			/>
			<path
				d={`M${x} ${y - 12} l${dir} 3.5 l${-dir} 3.5 Z`}
				fill="#ffd95e"
				stroke={OUTLINE}
				strokeWidth={1}
			/>
		</g>
	)
}

// okno łukowe
function ArchWindow({
	x,
	y,
	w = 10,
	lit,
}: {
	x: number
	y: number
	w?: number
	lit: boolean
}) {
	const h = w * 1.5
	return (
		<path
			d={`M${x - w / 2} ${y + h / 2} v-${h / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 v${h / 2} Z`}
			fill={lit ? "#ffd95e" : "#ede9fe"}
			stroke={OUTLINE}
			strokeWidth={1.4}
		/>
	)
}

// blanki na szczycie muru/wieży
function Crenels({
	x,
	y,
	width,
	fill,
}: {
	x: number
	y: number
	width: number
	fill: string
}) {
	const n = Math.max(2, Math.round(width / 14))
	const step = width / (n * 2 - 1)
	return (
		<g stroke={OUTLINE} strokeWidth={1.6}>
			{Array.from({ length: n }, (_, i) => (
				<rect
					key={i}
					x={x + i * step * 2}
					y={y}
					width={step}
					height={8}
					fill={fill}
				/>
			))}
		</g>
	)
}

function ZamekArt({ level, size }: { level: number; size: number | string }) {
	const uid = useId()
	const gold = level >= 3
	const wall = `url(#zamek-w-${uid})`
	const roof = `url(#zamek-r-${uid})`
	return (
		// viewBox zaczyna się na y=-20: dach złotego donżonu (apex y=-4) i jego
		// proporczyk (do y=-16) wystają ponad y=0 — bez marginesu szczyt się ucina
		<svg viewBox="0 -20 170 152" style={svgStyle(size)} aria-hidden="true">
			<defs>
				<linearGradient id={`zamek-w-${uid}`} x1="0" y1="0" x2="0" y2="1">
					{gold ? (
						<>
							<stop offset="0%" stopColor="#ffedb0" />
							<stop offset="100%" stopColor="#eeb42f" />
						</>
					) : (
						<>
							<stop offset="0%" stopColor="#cabcfd" />
							<stop offset="100%" stopColor="#8b6cf5" />
						</>
					)}
				</linearGradient>
				<linearGradient id={`zamek-r-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ff8fb0" />
					<stop offset="100%" stopColor="#e84a7a" />
				</linearGradient>
			</defs>

			{/* cień pod budowlą */}
			<ellipse cx={85} cy={128} rx={62} ry={4} fill="#1e293b" opacity={0.08} />

			{/* skrajne baszty (tylko L3 — cytadela) */}
			{gold && (
				<g stroke={OUTLINE} strokeWidth={1.8}>
					<rect x={6} y={88} width={18} height={40} rx={2} fill={wall} />
					<path d="M2 88 L15 70 L28 88 Z" fill={roof} />
					<rect x={146} y={88} width={18} height={40} rx={2} fill={wall} />
					<path d="M142 88 L155 70 L168 88 Z" fill={roof} />
				</g>
			)}

			{/* boczne wieże + mury (od L2) */}
			{level >= 2 && (
				<g stroke={OUTLINE} strokeWidth={2}>
					{/* mury łączące (za wieżami) */}
					<rect
						x={40}
						y={92}
						width={90}
						height={36}
						fill={wall}
						opacity={0.92}
					/>
					<Crenels x={40} y={86} width={90} fill={wall} />
					{/* wieże */}
					<rect x={24} y={62} width={28} height={66} rx={3} fill={wall} />
					<rect x={118} y={62} width={28} height={66} rx={3} fill={wall} />
					<path d="M18 62 L38 34 L58 62 Z" fill={roof} />
					<path d="M112 62 L132 34 L152 62 Z" fill={roof} />
					<Pennant x={38} y={34} flip />
					<Pennant x={132} y={34} />
					<ArchWindow x={38} y={84} lit={gold} />
					<ArchWindow x={132} y={84} lit={gold} />
					{/* pasy kamienia */}
					<g stroke={STONE_LINE} strokeOpacity={0.3} strokeWidth={1.4}>
						<line x1={26} y1={96} x2={50} y2={96} />
						<line x1={120} y1={96} x2={144} y2={96} />
					</g>
				</g>
			)}

			{/* wieża główna (zawsze) — donżon */}
			<g stroke={OUTLINE} strokeWidth={2}>
				<rect
					x={64}
					y={gold ? 26 : 40}
					width={42}
					height={gold ? 76 : 62}
					rx={3}
					fill={wall}
				/>
				<Crenels x={62} y={gold ? 20 : 34} width={46} fill={wall} />
				<path
					d={gold ? "M56 20 L85 -4 L114 20 Z" : "M56 34 L85 12 L114 34 Z"}
					fill={roof}
				/>
				{/* pasy kamienia */}
				<g stroke={STONE_LINE} strokeOpacity={0.3} strokeWidth={1.4}>
					<line x1={66} y1={gold ? 56 : 66} x2={104} y2={gold ? 56 : 66} />
					<line x1={66} y1={gold ? 80 : 84} x2={104} y2={gold ? 80 : 84} />
				</g>
			</g>
			<Pennant x={85} y={gold ? -4 : 12} />
			<ArchWindow x={85} y={gold ? 44 : 58} w={12} lit={gold} />

			{/* przedni mur z bramą (zawsze — nawet Wieżyczka ma wejście) */}
			<g stroke={OUTLINE} strokeWidth={2}>
				<rect x={52} y={100} width={66} height={28} fill={wall} />
				<Crenels x={52} y={94} width={66} fill={wall} />
				<path
					d="M72 128 v-14 a13 13 0 0 1 26 0 v14 Z"
					fill="#4c1d95"
					opacity={0.9}
				/>
				{/* deski bramy */}
				<g stroke="#c4b5fd" strokeWidth={1} opacity={0.5}>
					<line x1={79} y1={110} x2={79} y2={128} />
					<line x1={85} y1={106} x2={85} y2={128} />
					<line x1={91} y1={110} x2={91} y2={128} />
				</g>
			</g>

			{/* iskierki cytadeli */}
			{gold && (
				<g fill="#ffffff">
					<circle cx={38} cy={50} r={2.2} className="anim-sparkle" />
					<circle
						cx={132}
						cy={48}
						r={1.9}
						className="anim-sparkle"
						style={{ animationDelay: "0.6s" }}
					/>
					<circle
						cx={85}
						cy={8}
						r={2.4}
						className="anim-sparkle"
						style={{ animationDelay: "1.1s" }}
					/>
					<circle
						cx={15}
						cy={80}
						r={1.7}
						className="anim-sparkle"
						style={{ animationDelay: "1.6s" }}
					/>
				</g>
			)}
		</svg>
	)
}

function DomkiArt({ level, size }: { level: number; size: number | string }) {
	const uid = useId()
	const xs = level === 1 ? [52] : level === 2 ? [20, 84] : [0, 52, 104]
	return (
		<svg viewBox="0 0 148 92" style={svgStyle(size)} aria-hidden="true">
			<defs>
				<linearGradient id={`dom-b-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#fef3c7" />
					<stop offset="100%" stopColor="#fbbf77" />
				</linearGradient>
				<linearGradient id={`dom-r-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#8b6cf5" />
					<stop offset="100%" stopColor="#6d4fd8" />
				</linearGradient>
			</defs>
			<ellipse cx={74} cy={89} rx={64} ry={3.5} fill="#1e293b" opacity={0.08} />
			{/* chorągiewki nad miasteczkiem (L3) */}
			{level >= 3 && (
				<g>
					<path
						d="M6 26 Q74 12 142 26"
						stroke={OUTLINE}
						strokeWidth={1.5}
						fill="none"
					/>
					{[22, 48, 74, 100, 126].map((x, i) => (
						<path
							key={x}
							d={`M${x} ${20 - (i % 2) * 2} l4.5 9 l-10 -1 Z`}
							fill={i % 2 ? "#ff5e8a" : "#ffd95e"}
							stroke={OUTLINE}
							strokeWidth={1}
						/>
					))}
				</g>
			)}
			{xs.map((x, i) => (
				<g key={x} stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
					{/* komin + dymek (od L2 domki są „zamieszkane" na full) */}
					<rect x={x + 29} y={30} width={7} height={14} fill="#a78bfa" />
					{level >= 2 && (
						<g stroke="none" fill="#e2e8f0" opacity={0.8}>
							<circle cx={x + 33} cy={24} r={3} className="anim-float" />
							<circle
								cx={x + 36}
								cy={17}
								r={2.2}
								className="anim-float"
								style={{ animationDelay: "0.9s" }}
							/>
						</g>
					)}
					<rect
						x={x + 4}
						y={50}
						width={36}
						height={38}
						rx={3}
						fill={`url(#dom-b-${uid})`}
					/>
					<path
						d={`M${x - 2} 52 L${x + 22} 28 L${x + 46} 52 Z`}
						fill={`url(#dom-r-${uid})`}
					/>
					{/* drzwi z gałką + okrągłe okno */}
					<path
						d={`M${x + 15} 88 v-13 a7 7 0 0 1 14 0 v13 Z`}
						fill="#7c5cf0"
						opacity={0.85}
					/>
					<circle cx={x + 26} cy={80} r={1.3} fill="#ffd95e" stroke="none" />
					<circle
						cx={x + 22}
						cy={58}
						r={4.5}
						fill={i === 0 || level >= 2 ? "#ffd95e" : "#ede9fe"}
						strokeWidth={1.4}
					/>
				</g>
			))}
		</svg>
	)
}

function FontannaArt({
	level,
	size,
}: {
	level: number
	size: number | string
}) {
	const uid = useId()
	const rainbow = level >= 3
	return (
		<svg viewBox="0 0 110 96" style={svgStyle(size)} aria-hidden="true">
			<defs>
				<linearGradient id={`font-w-${uid}`} x1="0" y1="0" x2="1" y2="0">
					{rainbow ? (
						<>
							<stop offset="0%" stopColor="#7dd3fc" />
							<stop offset="50%" stopColor="#c4b5fd" />
							<stop offset="100%" stopColor="#f9a8d4" />
						</>
					) : (
						<>
							<stop offset="0%" stopColor="#7dd3fc" />
							<stop offset="100%" stopColor="#38bdf8" />
						</>
					)}
				</linearGradient>
			</defs>
			<ellipse cx={55} cy={92} rx={48} ry={3.5} fill="#1e293b" opacity={0.08} />
			{/* strugi wody */}
			<g stroke="#38bdf8" strokeWidth={3.5} strokeLinecap="round" fill="none">
				<path d="M55 26 C43 34 39 50 37 70" />
				<path d="M55 26 C67 34 71 50 73 70" />
				{level >= 2 && (
					<>
						<path d="M55 24 C55 40 55 54 55 62" />
						<path d="M55 28 C48 38 45 52 44 66" strokeWidth={2.2} />
						<path d="M55 28 C62 38 65 52 66 66" strokeWidth={2.2} />
					</>
				)}
			</g>
			{/* górna czasza + postument */}
			<g stroke={OUTLINE} strokeWidth={2}>
				<circle cx={55} cy={21} r={5} fill="#bae6fd" />
				<ellipse cx={55} cy={40} rx={17} ry={5.5} fill="#e2e8f0" />
				<rect x={49} y={40} width={12} height={28} fill="#cbd5e1" />
				{/* basen z kamienną obwódką */}
				<ellipse cx={55} cy={76} rx={44} ry={14} fill="#e2e8f0" />
				<ellipse cx={55} cy={73} rx={36} ry={10} fill={`url(#font-w-${uid})`} />
			</g>
			{/* ząbki kamiennej cembrowiny */}
			<g stroke={OUTLINE} strokeWidth={1} opacity={0.35}>
				{[20, 34, 48, 62, 76, 90].map((x) => (
					<line key={x} x1={x} y1={84} x2={x + 3} y2={88} />
				))}
			</g>
			{/* iskierki na wodzie */}
			<g fill="#ffffff">
				<circle cx={38} cy={72} r={2} className="anim-sparkle" />
				{level >= 2 && (
					<circle
						cx={70}
						cy={74}
						r={2.2}
						className="anim-sparkle"
						style={{ animationDelay: "0.7s" }}
					/>
				)}
				{rainbow && (
					<circle
						cx={55}
						cy={69}
						r={2.4}
						className="anim-sparkle"
						style={{ animationDelay: "1.3s" }}
					/>
				)}
			</g>
		</svg>
	)
}

function PlacZabawArt({
	level,
	size,
}: {
	level: number
	size: number | string
}) {
	return (
		<svg viewBox="0 0 160 96" style={svgStyle(size)} aria-hidden="true">
			<ellipse cx={80} cy={92} rx={70} ry={3.5} fill="#1e293b" opacity={0.08} />
			{/* zjeżdżalnia (zawsze): kolorowa wieżyczka + ślizg */}
			<g stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round">
				<line x1={134} y1={90} x2={134} y2={28} />
				<line x1={148} y1={90} x2={148} y2={28} />
				<line x1={134} y1={46} x2={148} y2={46} />
				<line x1={134} y1={62} x2={148} y2={62} />
				<line x1={134} y1={78} x2={148} y2={78} />
				<rect x={126} y={20} width={30} height={10} rx={4} fill="#7c5cf0" />
			</g>
			<path
				d="M128 30 Q94 46 68 88"
				stroke="#ffd95e"
				strokeWidth={12}
				strokeLinecap="round"
				fill="none"
			/>
			<path
				d="M128 30 Q94 46 68 88"
				stroke="#f59e0b"
				strokeWidth={3}
				strokeLinecap="round"
				fill="none"
				strokeDasharray="2 10"
				opacity={0.7}
			/>
			{/* huśtawka (L2+) */}
			{level >= 2 && (
				<g stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round">
					<line x1={6} y1={90} x2={20} y2={30} stroke="#ff5e8a" />
					<line x1={54} y1={90} x2={40} y2={30} stroke="#ff5e8a" />
					<line x1={6} y1={90} x2={20} y2={30} strokeOpacity={0.35} />
					<line x1={54} y1={90} x2={40} y2={30} strokeOpacity={0.35} />
					<line x1={16} y1={30} x2={44} y2={30} />
					<line x1={25} y1={30} x2={25} y2={64} strokeWidth={1.6} />
					<line x1={37} y1={30} x2={37} y2={64} strokeWidth={1.6} />
					<rect x={20} y={64} width={22} height={6} rx={3} fill="#ff5e8a" />
				</g>
			)}
			{/* trampolina (L3) */}
			{level >= 3 && (
				<g stroke={OUTLINE} strokeWidth={2}>
					<line x1={72} y1={90} x2={78} y2={78} />
					<line x1={118} y1={90} x2={112} y2={78} />
					<ellipse cx={95} cy={76} rx={26} ry={8} fill="#8b6cf5" />
					<ellipse
						cx={95}
						cy={74}
						rx={20}
						ry={5}
						fill="#c4b5fd"
						strokeWidth={1.2}
					/>
				</g>
			)}
		</svg>
	)
}

function LatarnieArt({
	level,
	size,
}: {
	level: number
	size: number | string
}) {
	const lamps = Array.from({ length: level }, (_, i) => 24 + i * 34)
	const vbWidth = 48 + (level - 1) * 34
	return (
		<svg
			viewBox={`0 0 ${vbWidth} 96`}
			style={svgStyle(size)}
			aria-hidden="true"
		>
			<ellipse
				cx={vbWidth / 2}
				cy={93}
				rx={vbWidth / 2 - 4}
				ry={3}
				fill="#1e293b"
				opacity={0.08}
			/>
			{lamps.map((x, i) => (
				<g key={x}>
					{/* poświata (dwuwarstwowa — naprawdę świeci) */}
					<circle cx={x} cy={24} r={17} fill="#ffd95e" opacity={0.22} />
					<circle cx={x} cy={24} r={10} fill="#ffe9a3" opacity={0.4} />
					<g stroke={OUTLINE} strokeWidth={2}>
						<line x1={x} y1={92} x2={x} y2={34} strokeWidth={4} />
						{/* stopa i zawijas */}
						<path
							d={`M${x - 8} 92 h16`}
							strokeWidth={3}
							strokeLinecap="round"
						/>
						<path d={`M${x} 44 q8 0 8 -7`} fill="none" strokeWidth={1.8} />
						{/* latarenka */}
						<path d={`M${x - 7} 30 h14 l-2 -12 h-10 Z`} fill="#fff7d6" />
						<path d={`M${x - 6} 14 L${x} 8 L${x + 6} 14`} fill="#7c5cf0" />
						<circle cx={x} cy={24} r={2.6} fill="#ffb020" stroke="none" />
					</g>
					{/* świetliki (L2+) */}
					{level >= 2 && (
						<circle
							cx={x + 13}
							cy={44 + i * 7}
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

function OgrodekArt({ level, size }: { level: number; size: number | string }) {
	const uid = useId()
	// kwiaty: tulipan / słonecznik / dzwonek — więcej i barwniej z poziomem
	const flowers: { x: number; kind: number }[] = [
		{ x: 22, kind: 0 },
		{ x: 50, kind: 1 },
		{ x: 78, kind: 0 },
		...(level >= 2
			? [
					{ x: 36, kind: 2 },
					{ x: 64, kind: 2 },
				]
			: []),
		...(level >= 3
			? [
					{ x: 10, kind: 1 },
					{ x: 90, kind: 1 },
				]
			: []),
	]
	const petal = ["#ff5e8a", "#ffd95e", "#8b6cf5"]
	return (
		<svg viewBox="0 0 100 72" style={svgStyle(size)} aria-hidden="true">
			<defs>
				<linearGradient id={`ogr-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#d9a45f" />
					<stop offset="100%" stopColor="#a9743a" />
				</linearGradient>
			</defs>
			<ellipse cx={50} cy={69} rx={46} ry={3} fill="#1e293b" opacity={0.08} />
			{/* płotek sztachetowy */}
			<g stroke={OUTLINE} strokeWidth={1.6}>
				{[6, 21, 36, 51, 66, 81, 94].map((x) => (
					<path
						key={x}
						d={`M${x - 2.5} 62 v-20 l2.5 -4 l2.5 4 v20 Z`}
						fill="#fff7ed"
					/>
				))}
				<line x1={2} y1={48} x2={98} y2={48} stroke="#f3ddc3" strokeWidth={4} />
				<line x1={2} y1={48} x2={98} y2={48} strokeWidth={1.2} />
			</g>
			{/* grządka */}
			<ellipse
				cx={50}
				cy={62}
				rx={47}
				ry={8}
				fill={`url(#ogr-${uid})`}
				stroke={OUTLINE}
				strokeWidth={1.6}
			/>
			{/* kwiaty */}
			{flowers.map(({ x, kind }, i) => (
				<g key={`${x}-${i}`} stroke={OUTLINE} strokeWidth={1.2}>
					<line
						x1={x}
						y1={58}
						x2={x}
						y2={40}
						stroke="#3f9e5f"
						strokeWidth={2}
					/>
					{kind === 1 ? (
						<>
							{[0, 60, 120, 180, 240, 300].map((deg) => (
								<ellipse
									key={deg}
									cx={x}
									cy={33}
									rx={3}
									ry={6}
									fill={petal[1]}
									transform={`rotate(${deg} ${x} 36)`}
									stroke="none"
								/>
							))}
							<circle cx={x} cy={36} r={4} fill="#a9743a" />
						</>
					) : (
						<path
							d={`M${x - 5} 40 q-2 -10 5 -10 q7 0 5 10 Z`}
							fill={petal[kind === 2 ? 2 : 0]}
						/>
					)}
				</g>
			))}
			{level >= 3 && (
				<g fill="#ffffff">
					<circle cx={16} cy={30} r={2} className="anim-sparkle" />
					<circle
						cx={86}
						cy={26}
						r={1.8}
						className="anim-sparkle"
						style={{ animationDelay: "0.8s" }}
					/>
				</g>
			)}
		</svg>
	)
}

// Dispatcher: jeden punkt wejścia dla plotów, arkusza i BuildReveal.
// `level` 1..3 = zbudowany art; `silhouette` = jednolity cień (niezbudowana
// działka na scenie / wiersz listy) — filtr inline, odporny na brak klas.
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
	}
	if (!silhouette) return art
	return (
		<span
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
