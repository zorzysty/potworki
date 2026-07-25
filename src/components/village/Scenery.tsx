import { memo, type ReactNode, useId } from "react"
import { OUTLINE } from "./BuildingArt"

// Sceneria wioski: warstwowy krajobraz (wzgórza w mgiełce → zbocze tylnego
// rzędu → łąka), wektorowe niebo (słońce/księżyc, chmury, tęcza) i roślinność
// (drzewa, krzaki, kępki trawy) w idiomie potworków — gradienty z palety,
// zaokrąglenia, gruby kontur (OUTLINE współdzielony z BuildingArt).
// Wszystko czysto prezentacyjne; pozycje nadaje VillageScreen. Konwencja
// rozmiaru: arty terenu/roślin są `block w-full` — szerokość ustawia wrapper
// callera; tylko SkyOrb (słońce/księżyc) bierze `size` w px (kwadrat + halo).

// ---------------------------------------------------------------------------
// Geometria terenu. `Terrain` rozciąga się na całą scenę (preserveAspectRatio
// "none"): współrzędne viewBoxu 0..100 = procenty sceny. GROUND_Y to linia
// gruntu przedniego rzędu budynków — VillageScreen kotwiczy na niej kontener
// działek (GROUND_LINE_TOP), a droga zaczyna się dokładnie na niej.
// ---------------------------------------------------------------------------
export const GROUND_Y = 47

// grzbiety pasów terenu (od tyłu): jedna krzywa na pas — wypełnienie i biała
// linia grzbietu wynikają z TEJ SAMEJ ścieżki (Ridge), więc nie mogą się rozjechać
const MID_RIDGE = "M0 42 Q14 34.5 30 37.5 Q46 41.5 62 36.5 Q80 31.5 100 36.5"
const SLOPE_RIDGE = "M0 45 Q16 40 34 42.5 Q54 45 72 41 Q88 38.5 100 41.5"
const MEADOW_RIDGE = "M0 51 Q14 47 32 48.5 Q52 51 72 48 Q88 46.5 100 48.5"

// Oś drogi: punkty [y, x, szerokość]. Pierwszy punkt siedzi POD BRAMĄ zamku —
// oba parametry są RUCHOME, bo VillageScreen mierzy scenę: `gateX` (środek
// działki zamku w %; clamp szerokości w px przesuwa go z szerokością ekranu)
// i `gateY` (y stopy zamku w %; dy działki jest w px, więc zależy od
// wysokości sceny — droga startuje z zakładką POD artem zamku, z-index
// budynków ją przykrywa). Z osi GENERUJĄ się oba beziery drogi (obrys
// z perspektywą i jaśniejszy udeptany środek — Catmull-Rom przez punkty
// krawędzi) oraz pozycje kamieni (`roadXAt`) — trasa ma jedno źródło prawdy.
function roadSpine(gateY: number): readonly [number, number, number][] {
	return [
		[gateY, 0, 2.5], // x względem gateX
		[62, 3.5, 6],
		[78, -2.5, 11],
		[100, 3, 18],
	]
}
export function roadXAt(y: number, gateX: number, gateY: number): number {
	const spine = roadSpine(gateY)
	let prev = spine[0] as [number, number, number]
	for (const wp of spine) {
		if (y <= wp[0]) {
			const span = wp[0] - prev[0]
			if (span <= 0) return gateX + wp[1]
			return gateX + prev[1] + ((y - prev[0]) / span) * (wp[1] - prev[1])
		}
		prev = wp
	}
	return gateX + prev[1]
}

type Pt = readonly [number, number]
const f = (p: Pt) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`

// gładka krzywa przez punkty (Catmull-Rom → beziery)
function catmull(pts: readonly Pt[]): string {
	let d = `M${f(pts[0] as Pt)}`
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? (pts[i] as Pt)
		const p1 = pts[i] as Pt
		const p2 = pts[i + 1] as Pt
		const p3 = pts[i + 2] ?? p2
		const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
		const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
		d += ` C${f(c1)} ${f(c2)} ${f(p2)}`
	}
	return d
}

// zamknięty pas drogi o szerokości `scale * w(y)` wokół osi
function roadBand(gateX: number, gateY: number, scale: number): string {
	const spine = roadSpine(gateY)
	const left = spine.map(([y, dx, w]): Pt => [gateX + dx - (w * scale) / 2, y])
	const right = spine.map(([y, dx, w]): Pt => [gateX + dx + (w * scale) / 2, y])
	// lewa krawędź w dół + prawa w górę (odwrócona; jej M staje się L) + Z
	return `${catmull(left)} L${catmull(right.reverse()).slice(1)} Z`
}

// pas terenu: wypełnienie do dołu sceny + biała linia grzbietu z jednej krzywej
function Ridge({ d, fill, crest }: { d: string; fill: string; crest: number }) {
	return (
		<>
			<path d={`${d} L100 100 L0 100 Z`} fill={fill} />
			<path
				d={d}
				transform="translate(0 -0.2)"
				fill="none"
				stroke="#ffffff"
				strokeOpacity={crest}
				strokeWidth={1.5}
				vectorEffect="non-scaling-stroke"
			/>
		</>
	)
}

export const Terrain = memo(function Terrain({
	road,
	gateX,
	gateY,
}: {
	road: boolean
	// brama zamku w % sceny (mierzona przez VillageScreen): droga zaczyna się
	// dokładnie pod bramą niezależnie od rozmiaru ekranu
	gateX: number
	gateY: number
}) {
	const uid = useId()
	return (
		<svg
			className="pointer-events-none absolute inset-0 h-full w-full"
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<defs>
				<linearGradient id={`ter-meadow-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#8edbb1" />
					<stop offset="55%" stopColor="#71cd9c" />
					<stop offset="100%" stopColor="#54bd82" />
				</linearGradient>
				<linearGradient id={`ter-slope-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#abe5c3" />
					<stop offset="100%" stopColor="#98ddb6" />
				</linearGradient>
				{/* miękkie plamy cieniowania łąki (twarde elipsy wyglądały jak łaty) */}
				<radialGradient id={`ter-shade-${uid}`} cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#5dc48c" stopOpacity={0.55} />
					<stop offset="100%" stopColor="#5dc48c" stopOpacity={0} />
				</radialGradient>
				<radialGradient id={`ter-light-${uid}`} cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#c3f0d8" stopOpacity={0.6} />
					<stop offset="100%" stopColor="#c3f0d8" stopOpacity={0} />
				</radialGradient>
			</defs>

			{/* najdalsze wzgórza — mgiełka powietrzna (najjaśniejsze, chłodne) */}
			<path
				d="M0 37 Q10 28 22 31 Q34 34 46 29 Q58 23.5 70 28 Q84 33 100 28.5 L100 100 L0 100 Z"
				fill="#d7f0e4"
			/>
			{/* środkowe wzgórza */}
			<Ridge d={MID_RIDGE} fill="#c0ebd1" crest={0.4} />
			{/* drzewka w oddali na grzbiecie środkowych wzgórz */}
			<g fill="#9bd9b6">
				<ellipse cx={12} cy={36.2} rx={1.7} ry={2.4} />
				<ellipse cx={17} cy={35.4} rx={1.3} ry={1.9} />
				<ellipse cx={66} cy={34.6} rx={1.6} ry={2.3} />
				<ellipse cx={88} cy={33.8} rx={1.4} ry={2} />
				<ellipse cx={93} cy={34.6} rx={1.8} ry={2.5} />
			</g>
			{/* zbocze tylnego rzędu budynków */}
			<Ridge d={SLOPE_RIDGE} fill={`url(#ter-slope-${uid})`} crest={0.35} />
			{/* łąka — przedni rząd stoi na jej skraju (linia gruntu = GROUND_Y) */}
			<Ridge d={MEADOW_RIDGE} fill={`url(#ter-meadow-${uid})`} crest={0.3} />

			{/* cieniowanie łąki: miękkie plamy (radialne gradienty, zero krawędzi) */}
			<g fill={`url(#ter-shade-${uid})`}>
				<ellipse cx={16} cy={70} rx={16} ry={6} />
				<ellipse cx={76} cy={63} rx={14} ry={5} />
				<ellipse cx={30} cy={89} rx={18} ry={7} />
				<ellipse cx={84} cy={88} rx={16} ry={6} />
			</g>
			<g fill={`url(#ter-light-${uid})`}>
				<ellipse cx={58} cy={57} rx={13} ry={4.5} />
				<ellipse cx={10} cy={82} rx={12} ry={5} />
				<ellipse cx={64} cy={93} rx={15} ry={5.5} />
			</g>

			{/* droga (dekoracja „Ścieżka"): spod bramy zamku, kręta, coraz szersza —
			    oba pasy generowane z ROAD_SPINE */}
			{road && (
				<g>
					<path
						d={roadBand(gateX, gateY, 1)}
						fill="#eed7a8"
						stroke="#d9b678"
						strokeWidth={1.4}
						vectorEffect="non-scaling-stroke"
						strokeLinejoin="round"
					/>
					{/* jaśniejszy udeptany środek */}
					<path d={roadBand(gateX, gateY, 0.5)} fill="#f7e9c8" opacity={0.75} />
				</g>
			)}
		</svg>
	)
})

// ---------------------------------------------------------------------------
// Niebo
// ---------------------------------------------------------------------------

// muszla ciała niebieskiego: kwadrat `size` px + miękkie halo wokół
function SkyOrb({
	size,
	halo,
	children,
}: {
	size: number
	halo: string
	children: ReactNode
}) {
	return (
		<span
			className="relative block"
			style={{ width: size, height: size }}
			aria-hidden="true"
		>
			<span
				className="absolute rounded-full"
				style={{
					inset: "-33%",
					background: `radial-gradient(circle, ${halo} 0%, transparent 70%)`,
				}}
			/>
			{children}
		</span>
	)
}

// promienie słońca: statyczna geometria (moduł), obracana HTML-owym wrapperem
const SUN_RAYS = Array.from({ length: 12 }, (_, i) => (
	<rect
		key={i}
		x={37.5}
		y={2}
		width={5}
		height={12}
		rx={2.5}
		transform={`rotate(${i * 30} 40 40)`}
	/>
))

// słońce: tarcza + wolno wirujące promienie (obrót na wrapperze HTML —
// warstwa kompozytora; animowany SVG <g> rastrowałby się co klatkę)
export function SunArt({ size = 72 }: { size?: number }) {
	const uid = useId()
	return (
		<SkyOrb size={size} halo="rgba(255, 214, 90, 0.55)">
			<span className="anim-sun-spin absolute inset-0">
				<svg viewBox="0 0 80 80" className="block h-full w-full">
					<g fill="#ffcf4d">{SUN_RAYS}</g>
				</svg>
			</span>
			<svg viewBox="0 0 80 80" className="relative block h-full w-full">
				<defs>
					<radialGradient id={`sun-${uid}`} cx="42%" cy="38%" r="70%">
						<stop offset="0%" stopColor="#fff3b8" />
						<stop offset="60%" stopColor="#ffd95e" />
						<stop offset="100%" stopColor="#ffb020" />
					</radialGradient>
				</defs>
				<circle cx={40} cy={40} r={20} fill={`url(#sun-${uid})`} />
			</svg>
		</SkyOrb>
	)
}

// księżyc na wieczór (zabawka latarni) — rogal z poświatą
export function MoonArt({ size = 60 }: { size?: number }) {
	return (
		<SkyOrb size={size} halo="rgba(255, 241, 178, 0.4)">
			<svg viewBox="0 0 64 64" className="relative block h-full w-full">
				<path
					d="M40 6 A26 26 0 1 0 58 40 A20 20 0 0 1 40 6 Z"
					fill="#fff1b2"
					stroke="#f5d76e"
					strokeWidth={2}
				/>
			</svg>
		</SkyOrb>
	)
}

// chmura: miękkie zlepione obłoczki z płaskim spodem
export const CloudArt = memo(function CloudArt() {
	return (
		<svg viewBox="0 0 100 44" className="block w-full" aria-hidden="true">
			<g fill="#ffffff">
				<ellipse cx={30} cy={30} rx={22} ry={13} />
				<ellipse cx={52} cy={22} rx={20} ry={15} />
				<ellipse cx={74} cy={30} rx={20} ry={12} />
				<rect x={12} y={28} width={78} height={13} rx={6.5} />
			</g>
			<ellipse cx={52} cy={17} rx={13} ry={8} fill="#ffffff" opacity={0.7} />
		</svg>
	)
})

// tęcza (dekoracja): półkole pasów — końce chowają się za wzgórzami,
// więc caller stawia ją POD warstwą terenu
const RAINBOW_BANDS = [
	"#ff5e5e",
	"#ffab3d",
	"#ffe14d",
	"#5ed17c",
	"#54b7f0",
	"#8b6cf5",
]
export function RainbowArc() {
	return (
		<svg viewBox="0 0 200 100" className="block w-full" aria-hidden="true">
			{RAINBOW_BANDS.map((c, i) => (
				<path
					key={c}
					d={`M${10 + i * 7} 100 A${90 - i * 7} ${90 - i * 7} 0 0 1 ${190 - i * 7} 100`}
					fill="none"
					stroke={c}
					strokeWidth={7}
					opacity={0.85}
				/>
			))}
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Roślinność
// ---------------------------------------------------------------------------

const TREE_CROWNS = {
	spring: ["#8fdcaa", "#4fae70"],
	mint: ["#a5e6c4", "#5fbe8d"],
} as const
export type TreeVariant = keyof typeof TREE_CROWNS

// drzewo w idiomie potworków; `swing` dokłada huśtawkę z oponą (dekoracja)
export const TreeArt = memo(function TreeArt({
	variant = "spring",
	swing = false,
}: {
	variant?: TreeVariant
	swing?: boolean
}) {
	const uid = useId()
	const [light, dark] = TREE_CROWNS[variant]
	return (
		<svg viewBox="0 0 64 78" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`tree-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={light} />
					<stop offset="100%" stopColor={dark} />
				</linearGradient>
			</defs>
			<ellipse cx={32} cy={75} rx={20} ry={3} fill="#1e293b" opacity={0.1} />
			<path
				d="M29 76 L29 52 Q26 46 22 44 M35 76 L35 52 Q38 48 42 45 M32 60 L32 50"
				stroke="#a9743a"
				strokeWidth={6}
				strokeLinecap="round"
				fill="none"
			/>
			<g stroke={OUTLINE} strokeWidth={2}>
				<circle cx={17} cy={38} r={13} fill={`url(#tree-${uid})`} />
				<circle cx={47} cy={38} r={13} fill={`url(#tree-${uid})`} />
				<circle cx={32} cy={24} r={17} fill={`url(#tree-${uid})`} />
				<circle
					cx={32}
					cy={38}
					r={15}
					fill={`url(#tree-${uid})`}
					stroke="none"
				/>
			</g>
			<g fill="#ffffff" opacity={0.45}>
				<circle cx={26} cy={18} r={4} />
				<circle cx={14} cy={34} r={2.6} />
			</g>
			{swing && (
				<g stroke="#8a5a28" strokeWidth={1.8}>
					<line x1={47} y1={44} x2={47} y2={62} />
					<circle
						cx={47}
						cy={65}
						r={4.5}
						fill="none"
						stroke="#475569"
						strokeWidth={3}
					/>
				</g>
			)}
		</svg>
	)
})

// krzaczek z kropkami-kwiatkami
export const BushArt = memo(function BushArt() {
	const uid = useId()
	return (
		<svg viewBox="0 0 60 30" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`bush-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#8fdcaa" />
					<stop offset="100%" stopColor="#47a56a" />
				</linearGradient>
			</defs>
			<ellipse cx={30} cy={28} rx={24} ry={2.5} fill="#1e293b" opacity={0.1} />
			<g stroke={OUTLINE} strokeWidth={1.8}>
				<ellipse cx={16} cy={20} rx={13} ry={9} fill={`url(#bush-${uid})`} />
				<ellipse cx={44} cy={20} rx={13} ry={9} fill={`url(#bush-${uid})`} />
				<ellipse cx={30} cy={14} rx={14} ry={11} fill={`url(#bush-${uid})`} />
			</g>
			<circle cx={22} cy={12} r={2.2} fill="#ff8fb0" />
			<circle cx={36} cy={9} r={2.2} fill="#ffd95e" />
			<circle cx={45} cy={16} r={2.2} fill="#ff8fb0" />
		</svg>
	)
})

// kępka trawy — drobny wypełniacz łąki
export function GrassTuft() {
	return (
		<svg viewBox="0 0 24 14" className="block w-full" aria-hidden="true">
			<g
				stroke="#3f9e5f"
				strokeWidth={2.2}
				strokeLinecap="round"
				fill="none"
				opacity={0.8}
			>
				<path d="M4 13 Q5 6 2 3" />
				<path d="M9 13 Q9 4 12 1" />
				<path d="M14 13 Q16 6 20 4" />
				<path d="M19 13 Q21 9 23 8" />
			</g>
		</svg>
	)
}

// staw z kaczuszką (dekoracja) — woda z blikiem, kamyki i trzciny;
// kaczka pływa w emoji nad artem (caller)
export function PondArt() {
	const uid = useId()
	return (
		<svg viewBox="0 0 110 46" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`pond-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#9ddcf9" />
					<stop offset="100%" stopColor="#4fb4ea" />
				</linearGradient>
			</defs>
			<ellipse cx={55} cy={28} rx={50} ry={16} fill="#8ac89b" opacity={0.65} />
			<ellipse
				cx={55}
				cy={27}
				rx={44}
				ry={13}
				fill={`url(#pond-${uid})`}
				stroke="#3e97cc"
				strokeWidth={1.6}
			/>
			<ellipse cx={40} cy={23} rx={14} ry={4} fill="#d6f1ff" opacity={0.7} />
			<g stroke="#3f9e5f" strokeWidth={2.4} strokeLinecap="round" fill="none">
				<path d="M97 34 Q99 24 96 18" />
				<path d="M102 35 Q105 27 104 21" />
			</g>
			<circle cx={97} cy={16} r={3} fill="#8b6cf5" />
			<circle cx={105} cy={19} r={2.5} fill="#8b6cf5" />
			<g fill="#cbd5e1" stroke="#94a3b8" strokeWidth={0.8}>
				<ellipse cx={12} cy={39} rx={4.5} ry={2.5} />
				<ellipse cx={21} cy={42} rx={3.5} ry={2} />
			</g>
		</svg>
	)
}

// cokół pomnika Pierwszego Potworka — kamienny postument zamiast szarej belki
export function PedestalArt() {
	return (
		<svg viewBox="0 0 64 22" className="block w-full" aria-hidden="true">
			<ellipse cx={32} cy={20} rx={28} ry={2.5} fill="#1e293b" opacity={0.12} />
			<g stroke="#94a3b8" strokeWidth={1.4}>
				<rect x={12} y={2} width={40} height={8} rx={2.5} fill="#e2e8f0" />
				<rect x={6} y={9} width={52} height={9} rx={3} fill="#cbd5e1" />
			</g>
			<circle cx={20} cy={13.5} r={1.2} fill="#94a3b8" />
			<circle cx={44} cy={13.5} r={1.2} fill="#94a3b8" />
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Podest działki: wydeptany placyk + cień kontaktowy pod stopą budynku —
// to on „wkleja" budynek w łąkę. Komponent OPAKOWUJE art (children), bo
// niezmiennik malowania należy do niego: podest jest absolutny pod spodem,
// więc dzieci dostają własny `relative`, żeby malować się NAD nim.
// ---------------------------------------------------------------------------
export function PlotGround({ children }: { children: ReactNode }) {
	const uid = useId()
	return (
		<span className="relative block w-full">
			<svg
				viewBox="0 0 120 26"
				className="pointer-events-none absolute -bottom-2 left-1/2 w-[128%] -translate-x-1/2"
				aria-hidden="true"
			>
				<defs>
					<radialGradient id={`plot-${uid}`} cx="50%" cy="50%" r="50%">
						<stop offset="0%" stopColor="#bce4a0" stopOpacity={0.85} />
						<stop offset="55%" stopColor="#9dd489" stopOpacity={0.6} />
						<stop offset="100%" stopColor="#9dd489" stopOpacity={0} />
					</radialGradient>
				</defs>
				<ellipse cx={60} cy={13} rx={58} ry={12} fill={`url(#plot-${uid})`} />
				<ellipse
					cx={60}
					cy={14}
					rx={38}
					ry={6.5}
					fill="#1e293b"
					opacity={0.12}
				/>
				<circle cx={18} cy={18} r={1.6} fill="#8fbf6e" opacity={0.7} />
				<circle cx={100} cy={17} r={1.6} fill="#8fbf6e" opacity={0.7} />
			</svg>
			<span className="relative block w-full">{children}</span>
		</span>
	)
}
