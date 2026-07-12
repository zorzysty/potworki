import { useId } from "react"
import type { BuildingId, DecorationId } from "../../game/village"

// Art budynków wioski: poziom = WIDOCZNY wzrost (rozmiar, elementy, światła) —
// żadnych kropek-poziomów; arkusz budowy pokazuje „poziom X/3" tekstem.
// SVG ręczne (idiom potworków: gradienty, zaokrąglenia, gruby kontur), emoji
// tylko tam, gdzie wystarcza. Sylwetkę (level 0) stylizuje caller (grayscale).

export const DECORATION_EMOJI: Record<DecorationId, string> = {
	kwiatki: "🌼",
	sciezka: "🐾",
	hustawka: "🌳",
	staw: "🦆",
	pomnik: "🗿",
	tecza: "🌈",
}

const OUTLINE = "#5f45c4"

function ZamekArt({ level, size }: { level: number; size: number }) {
	const uid = useId()
	const gold = level >= 3
	const wall = `url(#zamek-w-${uid})`
	return (
		<svg
			viewBox="0 0 120 106"
			width={size}
			height={(size * 106) / 120}
			aria-hidden="true"
		>
			<defs>
				<linearGradient id={`zamek-w-${uid}`} x1="0" y1="0" x2="0" y2="1">
					{gold ? (
						<>
							<stop offset="0%" stopColor="#ffe9a3" />
							<stop offset="100%" stopColor="#f0b429" />
						</>
					) : (
						<>
							<stop offset="0%" stopColor="#c4b5fd" />
							<stop offset="100%" stopColor="#8b6cf5" />
						</>
					)}
				</linearGradient>
				<linearGradient id={`zamek-r-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ff8fb0" />
					<stop offset="100%" stopColor="#e84a7a" />
				</linearGradient>
			</defs>
			{/* boczne wieże + mur (od L2) */}
			{level >= 2 && (
				<g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
					<rect x={30} y={62} width={60} height={40} fill={wall} />
					<rect x={16} y={48} width={22} height={54} rx={3} fill={wall} />
					<rect x={82} y={48} width={22} height={54} rx={3} fill={wall} />
					<path d="M13 48 L27 28 L41 48 Z" fill={`url(#zamek-r-${uid})`} />
					<path d="M79 48 L93 28 L107 48 Z" fill={`url(#zamek-r-${uid})`} />
					{/* brama */}
					<path
						d="M50 102 V84 a10 10 0 0 1 20 0 v18 Z"
						fill="#4c1d95"
						opacity={0.85}
					/>
				</g>
			)}
			{/* wieża główna (zawsze) */}
			<g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
				<rect
					x={44}
					y={26}
					width={32}
					height={level >= 2 ? 44 : 76}
					rx={3}
					fill={wall}
				/>
				{/* blanki */}
				<rect x={42} y={20} width={8} height={9} fill={wall} />
				<rect x={56} y={20} width={8} height={9} fill={wall} />
				<rect x={70} y={20} width={8} height={9} fill={wall} />
				{/* dach + chorągiewka */}
				<path d="M40 20 L60 4 L80 20 Z" fill={`url(#zamek-r-${uid})`} />
				<line x1={60} y1={4} x2={60} y2={-1} stroke={OUTLINE} />
			</g>
			<path
				d="M60 0 l12 3 -12 3 Z"
				fill="#ffd95e"
				stroke={OUTLINE}
				strokeWidth={1}
			/>
			{/* okno */}
			<circle
				cx={60}
				cy={level >= 2 ? 44 : 52}
				r={6}
				fill={gold ? "#fff7d6" : "#ede9fe"}
				stroke={OUTLINE}
				strokeWidth={1.5}
			/>
			{/* iskierki Zamku Iskierek */}
			{gold && (
				<g fill="#ffffff">
					<circle cx={28} cy={40} r={2.2} className="anim-sparkle" />
					<circle
						cx={94}
						cy={38}
						r={1.8}
						className="anim-sparkle"
						style={{ animationDelay: "0.6s" }}
					/>
					<circle
						cx={60}
						cy={14}
						r={2}
						className="anim-sparkle"
						style={{ animationDelay: "1.1s" }}
					/>
				</g>
			)}
		</svg>
	)
}

function DomkiArt({ level, size }: { level: number; size: number }) {
	const uid = useId()
	const xs = level === 1 ? [52] : level === 2 ? [24, 80] : [4, 54, 104]
	return (
		<svg
			viewBox="0 0 148 78"
			width={size}
			height={(size * 78) / 148}
			aria-hidden="true"
		>
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
			{/* chorągiewki nad miasteczkiem (L3) */}
			{level >= 3 && (
				<g>
					<path
						d="M8 14 Q74 2 140 14"
						stroke={OUTLINE}
						strokeWidth={1.5}
						fill="none"
					/>
					{[22, 46, 70, 94, 118].map((x, i) => (
						<path
							key={x}
							d={`M${x} ${9 - (i % 2)} l4 8 l-9 -1 Z`}
							fill={i % 2 ? "#ff5e8a" : "#ffd95e"}
							stroke={OUTLINE}
							strokeWidth={1}
						/>
					))}
				</g>
			)}
			{xs.map((x, i) => (
				<g key={x} stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
					<rect
						x={x + 4}
						y={38}
						width={32}
						height={38}
						rx={3}
						fill={`url(#dom-b-${uid})`}
					/>
					<path
						d={`M${x} 40 L${x + 20} 18 L${x + 40} 40 Z`}
						fill={`url(#dom-r-${uid})`}
					/>
					{/* drzwi + świecące okno */}
					<path
						d={`M${x + 14} 76 v-12 a6 6 0 0 1 12 0 v12 Z`}
						fill="#7c5cf0"
						opacity={0.8}
					/>
					<circle
						cx={x + 20}
						cy={46}
						r={4}
						fill={i === 0 || level >= 2 ? "#ffd95e" : "#ede9fe"}
						strokeWidth={1.2}
					/>
				</g>
			))}
		</svg>
	)
}

function FontannaArt({ level, size }: { level: number; size: number }) {
	const uid = useId()
	const rainbow = level >= 3
	return (
		<svg
			viewBox="0 0 100 88"
			width={size}
			height={(size * 88) / 100}
			aria-hidden="true"
		>
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
			{/* strugi wody */}
			<g stroke="#38bdf8" strokeWidth={3} strokeLinecap="round" fill="none">
				<path d="M50 26 C40 34 36 48 34 66" />
				<path d="M50 26 C60 34 64 48 66 66" />
				{level >= 2 && <path d="M50 24 C50 38 50 52 50 60" />}
			</g>
			{/* górna czasza + postument */}
			<g stroke={OUTLINE} strokeWidth={2}>
				<circle cx={50} cy={22} r={4.5} fill="#bae6fd" />
				<ellipse cx={50} cy={38} rx={15} ry={5} fill="#e2e8f0" />
				<rect x={45} y={38} width={10} height={26} fill="#cbd5e1" />
				{/* basen */}
				<ellipse cx={50} cy={72} rx={38} ry={12} fill="#e2e8f0" />
				<ellipse
					cx={50}
					cy={70}
					rx={31}
					ry={8.5}
					fill={`url(#font-w-${uid})`}
				/>
			</g>
			{/* skrzące iskierki na wodzie */}
			<g fill="#ffffff">
				<circle cx={36} cy={69} r={1.8} className="anim-sparkle" />
				{level >= 2 && (
					<circle
						cx={62}
						cy={71}
						r={2}
						className="anim-sparkle"
						style={{ animationDelay: "0.7s" }}
					/>
				)}
				{rainbow && (
					<circle
						cx={50}
						cy={66}
						r={2.2}
						className="anim-sparkle"
						style={{ animationDelay: "1.3s" }}
					/>
				)}
			</g>
		</svg>
	)
}

function PlacZabawArt({ level, size }: { level: number; size: number }) {
	return (
		<svg
			viewBox="0 0 160 92"
			width={size}
			height={(size * 92) / 160}
			aria-hidden="true"
		>
			{/* zjeżdżalnia (zawsze): drabinka + ślizg */}
			<g stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round">
				<line x1={136} y1={88} x2={136} y2={26} />
				<line x1={148} y1={88} x2={148} y2={26} />
				<line x1={136} y1={42} x2={148} y2={42} />
				<line x1={136} y1={58} x2={148} y2={58} />
				<line x1={136} y1={74} x2={148} y2={74} />
				<rect x={128} y={20} width={26} height={8} rx={3} fill="#7c5cf0" />
			</g>
			<path
				d="M130 28 Q96 44 72 86"
				stroke="#ffd95e"
				strokeWidth={11}
				strokeLinecap="round"
				fill="none"
			/>
			<path
				d="M130 28 Q96 44 72 86"
				stroke={OUTLINE}
				strokeWidth={2}
				strokeLinecap="round"
				fill="none"
				strokeDasharray="1 7"
				opacity={0.4}
			/>
			{/* huśtawka (L2+) */}
			{level >= 2 && (
				<g stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round">
					<line x1={8} y1={88} x2={20} y2={30} />
					<line x1={52} y1={88} x2={40} y2={30} />
					<line x1={16} y1={30} x2={44} y2={30} />
					<line x1={26} y1={30} x2={26} y2={62} strokeWidth={1.5} />
					<line x1={36} y1={30} x2={36} y2={62} strokeWidth={1.5} />
					<rect x={22} y={62} width={18} height={5} rx={2} fill="#ff5e8a" />
				</g>
			)}
			{/* trampolina (L3) */}
			{level >= 3 && (
				<g stroke={OUTLINE} strokeWidth={2}>
					<line x1={78} y1={88} x2={82} y2={76} />
					<line x1={118} y1={88} x2={114} y2={76} />
					<ellipse cx={98} cy={74} rx={24} ry={7} fill="#8b6cf5" />
					<ellipse
						cx={98}
						cy={72}
						rx={18}
						ry={4.5}
						fill="#c4b5fd"
						strokeWidth={1}
					/>
				</g>
			)}
		</svg>
	)
}

function LatarnieArt({ level, size }: { level: number; size: number }) {
	const w = 24 + level * 30
	const lamps = Array.from({ length: level }, (_, i) => 27 + i * 30)
	return (
		<svg
			viewBox={`0 0 ${24 + 3 * 30} 88`}
			width={(size * w) / 114}
			height={(size * 88) / 114}
			aria-hidden="true"
		>
			{lamps.map((x, i) => (
				<g key={x}>
					{/* poświata */}
					<circle cx={x} cy={22} r={13} fill="#ffd95e" opacity={0.3} />
					<g stroke={OUTLINE} strokeWidth={2}>
						<line x1={x} y1={86} x2={x} y2={30} strokeWidth={3.5} />
						<circle cx={x} cy={22} r={8} fill="#fff7d6" />
						<path d={`M${x - 6} 13 L${x} 7 L${x + 6} 13`} fill="#7c5cf0" />
					</g>
					{/* świetliki przy alejce (L2+) */}
					{level >= 2 && (
						<circle
							cx={x + 12}
							cy={40 + i * 6}
							r={1.8}
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

function OgrodekArt({ level, size }: { level: number; size: number }) {
	const flowers = ["🌷🌼", "🌷🌼🌻", "🌺🌷🌼🌻"][level - 1] ?? "🌷"
	return (
		<div
			className="relative flex flex-col items-center"
			style={{ width: size }}
			aria-hidden="true"
		>
			<div style={{ fontSize: size / (2.6 + level * 0.4) }}>{flowers}</div>
			{/* grządka */}
			<div
				className="-mt-1 rounded-full border-2 border-amber-700/40 bg-gradient-to-b from-amber-500/70 to-amber-700/70"
				style={{ width: size * 0.92, height: size * 0.2 }}
			/>
			{level >= 3 && (
				<span className="anim-sparkle absolute -right-1 top-0 text-sm">✨</span>
			)}
		</div>
	)
}

// Dispatcher: jeden punkt wejścia dla plotów, arkusza i BuildReveal.
// `level` 1..3 = zbudowany art; poziom 0 obsługuje CALLER (sylwetka L1 w grayscale).
export function BuildingArt({
	id,
	level,
	size = 90,
}: {
	id: BuildingId
	level: number
	size?: number
}) {
	const lvl = Math.max(1, Math.min(3, level))
	switch (id) {
		case "zamek":
			return <ZamekArt level={lvl} size={size} />
		case "domki":
			return <DomkiArt level={lvl} size={size} />
		case "fontanna":
			return <FontannaArt level={lvl} size={size} />
		case "plac-zabaw":
			return <PlacZabawArt level={lvl} size={size} />
		case "latarnie":
			return <LatarnieArt level={lvl} size={size} />
		case "ogrodek":
			return <OgrodekArt level={lvl} size={size} />
	}
}
