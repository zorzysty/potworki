import { memo, type ReactNode, useId } from "react"
import { GROUND_Y } from "./layout"

// Sceneria wioski: warstwowy krajobraz (góry w mgiełce → wzgórza → zbocze
// tylnego rzędu → łąka), wektorowe niebo (słońce/księżyc, chmury, tęcza)
// i roślinność (drzewa, krzaki, kwiaty, trawa) w idiomie potworków:
// gradienty, zaokrąglenia, kontur w ciemniejszym tonie wypełnienia (jak
// palety potworków — nie jeden uniwersalny fiolet), stałe światło z lewej
// góry (jaśniejsze lewe/górne krawędzie, cień z prawej).
// Wszystko czysto prezentacyjne; pozycje nadaje VillageScreen. Konwencja
// rozmiaru: arty terenu/roślin są `block w-full` — szerokość ustawia wrapper
// callera; tylko SkyOrb (słońce/księżyc) bierze `size` w px (kwadrat + halo).

// ---------------------------------------------------------------------------
// Geometria terenu. `Terrain` rozciąga się na całą scenę (preserveAspectRatio
// "none"): współrzędne viewBoxu 0..100 = procenty sceny. GROUND_Y (layout.ts)
// to linia gruntu przedniego rzędu budynków — VillageScreen kotwiczy na niej
// kontener działek, a droga zaczyna się dokładnie na niej.
// W rozciąganym SVG siedzą TYLKO kształty tolerujące zniekształcenie (pasy
// terenu, sylwetki gór/lasu); detale o stałych proporcjach (drzewa, kwiaty)
// to osobne, nierozciągane arty pozycjonowane przez ekran.
// ---------------------------------------------------------------------------

// grzbiety pasów terenu (od tyłu): jedna krzywa na pas — wypełnienie i jasna
// linia grzbietu wynikają z TEJ SAMEJ ścieżki (Ridge), więc nie mogą się rozjechać
const FAR_RIDGE =
	"M0 38 Q12 31 24 33.5 Q38 36 50 31.5 Q62 27 74 30.5 Q88 34 100 30"
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

// pas terenu: wypełnienie do dołu sceny + jasna linia grzbietu z jednej krzywej
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
				strokeWidth={1.6}
				vectorEffect="non-scaling-stroke"
			/>
		</>
	)
}

// sylwetka odległego lasu na grzbiecie: rząd miękkich garbów (toleruje
// rozciąganie viewBoxu — w pionie wygląda po prostu jak wyższe drzewa)
function forestBumps(
	xs: readonly number[],
	baseY: (x: number) => number,
	r: number,
	h: number,
): string {
	return xs
		.map((x) => {
			const y = baseY(x)
			return `M${x - r} ${y + 1} Q${x - r} ${y - h} ${x} ${y - h - 0.6} Q${x + r} ${y - h} ${x + r} ${y + 1} Z`
		})
		.join(" ")
}
// przybliżona wysokość grzbietu w x (dla rozsiania lasu) — nie musi być
// dokładna, garby siedzą częściowo POD pasem przed nimi
const midY = (x: number) => 40 - 4 * Math.sin((x / 100) * Math.PI * 1.8 + 0.6)
const slopeY = (x: number) => 43.5 - 2.5 * Math.sin((x / 100) * Math.PI * 1.9)

const FAR_FOREST = forestBumps(
	[3, 7.5, 12, 16.5, 21, 28, 33, 38, 55, 60, 65, 70, 74, 84, 89, 94, 98],
	midY,
	3,
	2.4,
)
const NEAR_FOREST = forestBumps(
	[6, 10.5, 15, 42, 46.5, 51, 76, 80.5, 85, 96, 100],
	slopeY,
	3.4,
	2.6,
)

export const Terrain = memo(function Terrain() {
	const uid = useId()
	return (
		<svg
			className="pointer-events-none absolute inset-0 h-full w-full"
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<defs>
				<linearGradient id={`ter-mount-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#c9d4f5" />
					<stop offset="100%" stopColor="#a9bdea" />
				</linearGradient>
				<linearGradient id={`ter-far-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#d3ecdf" />
					<stop offset="100%" stopColor="#c0e4d0" />
				</linearGradient>
				<linearGradient id={`ter-mid-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#bfe6c9" />
					<stop offset="100%" stopColor="#a6dcb6" />
				</linearGradient>
				<linearGradient id={`ter-slope-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#a9e0b9" />
					<stop offset="100%" stopColor="#8dd4a4" />
				</linearGradient>
				<linearGradient id={`ter-meadow-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#95dcae" />
					<stop offset="45%" stopColor="#74cd96" />
					<stop offset="100%" stopColor="#56b87e" />
				</linearGradient>
				{/* miękkie fale łąki: szerokie, poziome (rozciągnięte) plamy —
				    czytają się jako falowanie gruntu, nie jako łaty */}
				<radialGradient id={`ter-shade-${uid}`} cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#4fb27a" stopOpacity={0.45} />
					<stop offset="100%" stopColor="#4fb27a" stopOpacity={0} />
				</radialGradient>
				<radialGradient id={`ter-light-${uid}`} cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#c8f2d8" stopOpacity={0.55} />
					<stop offset="100%" stopColor="#c8f2d8" stopOpacity={0} />
				</radialGradient>
			</defs>

			{/* pasmo gór w mgiełce powietrznej — chłodne, najjaśniejsze; śnieżne
			    czapy to ten sam kształt, nakładka w bieli */}
			<path
				d="M0 34 L6 27 L11 30 L18 20.5 L24 26 L29 23 L36 29 L43 18 L49 24 L54 21.5 L60 27 L67 16 L74 23 L79 20 L86 26.5 L92 22 L100 28 L100 100 L0 100 Z"
				fill={`url(#ter-mount-${uid})`}
			/>
			<path
				d="M15.4 23.6 L18 20.5 L20.6 23.6 L19.4 24.6 L18 23.4 L16.6 24.8 Z M40.8 20.8 L43 18 L45.3 20.9 L44 21.9 L43 20.7 L41.9 22 Z M64.5 18.8 L67 16 L69.6 18.9 L68.4 20 L67 18.6 L65.6 20.2 Z M90.2 24 L92 22 L93.9 24.2 L92.9 25 L92 24 L91 25.2 Z"
				fill="#ffffff"
				opacity={0.85}
			/>
			{/* cień zboczy gór (prawe stoki — światło z lewej) */}
			<path
				d="M18 20.5 L24 26 L21 26.6 Z M43 18 L49 24 L46 24.4 Z M67 16 L74 23 L70.5 23.4 Z M92 22 L100 28 L100 29.5 L94 26 Z"
				fill="#8ea6df"
				opacity={0.35}
			/>

			{/* najdalsze wzgórza — mgiełka */}
			<Ridge d={FAR_RIDGE} fill={`url(#ter-far-${uid})`} crest={0.35} />
			{/* środkowe wzgórza + daleki las na grzbiecie (w kolorze mgły) */}
			<path d={FAR_FOREST} fill="#a3d6b8" opacity={0.85} />
			<Ridge d={MID_RIDGE} fill={`url(#ter-mid-${uid})`} crest={0.4} />
			{/* zbocze tylnego rzędu budynków + bliższy las */}
			<path d={NEAR_FOREST} fill="#7fc99a" opacity={0.9} />
			<Ridge d={SLOPE_RIDGE} fill={`url(#ter-slope-${uid})`} crest={0.35} />
			{/* łąka — przedni rząd stoi na jej skraju (linia gruntu = GROUND_Y) */}
			<Ridge d={MEADOW_RIDGE} fill={`url(#ter-meadow-${uid})`} crest={0.35} />

			{/* falowanie łąki: szerokie miękkie plamy (zero krawędzi) */}
			<g fill={`url(#ter-shade-${uid})`}>
				<ellipse cx={18} cy={72} rx={22} ry={5} />
				<ellipse cx={78} cy={64} rx={20} ry={4.5} />
				<ellipse cx={34} cy={92} rx={26} ry={6} />
				<ellipse cx={86} cy={90} rx={20} ry={5} />
			</g>
			<g fill={`url(#ter-light-${uid})`}>
				<ellipse cx={60} cy={57} rx={18} ry={4} />
				<ellipse cx={10} cy={84} rx={16} ry={5} />
				<ellipse cx={66} cy={80} rx={20} ry={5} />
			</g>
		</svg>
	)
})

// droga (dekoracja „Ścieżka"): spod bramy zamku, kręta, coraz szersza — oba
// pasy generowane z roadSpine; miękkie pobocze zamiast obrysu. Osobny
// (rozciągany jak Terrain) SVG, bo maluje się NAD teksturą łąki — kępki
// trawy nie mogą rosnąć na udeptanym piasku.
export const RoadArt = memo(function RoadArt({
	gateX,
	gateY,
}: {
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
				<linearGradient id={`road-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#f1dcae" />
					<stop offset="100%" stopColor="#e9cf9a" />
				</linearGradient>
			</defs>
			<path d={roadBand(gateX, gateY, 1.35)} fill="#b9a26a" opacity={0.18} />
			<path d={roadBand(gateX, gateY, 1)} fill={`url(#road-${uid})`} />
			{/* jaśniejszy udeptany środek */}
			<path d={roadBand(gateX, gateY, 0.5)} fill="#f8ebcb" opacity={0.8} />
		</svg>
	)
})

// tekstura łąki: nierozciągany overlay (pattern z drobnymi kępkami i
// kropkami) na dolnej części sceny, gasnący ku linii gruntu — łąka ma fakturę,
// a nie jest płaskim wypełnieniem; kontrast niski, żeby nie konkurować
// z wędrowcami
export const MeadowTexture = memo(function MeadowTexture() {
	const uid = useId()
	return (
		<svg
			className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
			style={{ height: `${100 - GROUND_Y}%` }}
			aria-hidden="true"
		>
			<defs>
				<pattern
					id={`mt-${uid}`}
					width={220}
					height={150}
					patternUnits="userSpaceOnUse"
				>
					<g
						fill="none"
						stroke="#3f9e5f"
						strokeWidth={1.6}
						strokeLinecap="round"
						opacity={0.45}
					>
						<path d="M12 26 q1 -5 -1 -8 M15 26 q0 -6 3 -8" />
						<path d="M74 58 q1 -5 -1 -8 M77 58 q0 -6 3 -8" />
						<path d="M150 20 q1 -5 -1 -8 M153 20 q0 -6 3 -8" />
						<path d="M196 96 q1 -5 -1 -8 M199 96 q0 -6 3 -8" />
						<path d="M40 118 q1 -5 -1 -8 M43 118 q0 -6 3 -8" />
						<path d="M118 132 q1 -4 -1 -6" />
						<path d="M172 60 q1 -4 -1 -6" />
						<path d="M96 12 q1 -4 -1 -6" />
					</g>
					<g fill="#ffffff" opacity={0.5}>
						<circle cx={54} cy={16} r={1.3} />
						<circle cx={132} cy={80} r={1.1} />
						<circle cx={24} cy={86} r={1.2} />
						<circle cx={186} cy={136} r={1.2} />
					</g>
					<g fill="#ffd95e" opacity={0.55}>
						<circle cx={108} cy={44} r={1.1} />
						<circle cx={62} cy={140} r={1} />
						<circle cx={206} cy={30} r={1} />
					</g>
				</pattern>
				<linearGradient id={`mt-fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#fff" stopOpacity={0} />
					<stop offset="30%" stopColor="#fff" stopOpacity={1} />
				</linearGradient>
				<mask id={`mt-mask-${uid}`}>
					<rect width="100%" height="100%" fill={`url(#mt-fade-${uid})`} />
				</mask>
			</defs>
			<rect
				width="100%"
				height="100%"
				fill={`url(#mt-${uid})`}
				mask={`url(#mt-mask-${uid})`}
			/>
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
					inset: "-45%",
					background: `radial-gradient(circle, ${halo} 0%, transparent 68%)`,
				}}
			/>
			{children}
		</span>
	)
}

// promienie słońca: miękkie kliny gasnące ku końcom (statyczna geometria,
// obracana HTML-owym wrapperem)
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => (
	<path
		key={i}
		d="M40 40 L33 2 L47 2 Z"
		transform={`rotate(${i * 45} 40 40)`}
	/>
))

// słońce: tarcza z blaskiem + wolno wirujące miękkie promienie (obrót na
// wrapperze HTML — warstwa kompozytora; animowany SVG <g> rastrowałby się
// co klatkę)
export function SunArt({ size = 84 }: { size?: number }) {
	const uid = useId()
	return (
		<SkyOrb size={size} halo="rgba(255, 224, 120, 0.6)">
			<span className="anim-sun-spin absolute inset-0">
				<svg viewBox="0 0 80 80" className="block h-full w-full">
					<defs>
						<radialGradient id={`rays-${uid}`} cx="50%" cy="50%" r="50%">
							<stop offset="30%" stopColor="#ffe27a" stopOpacity={0.55} />
							<stop offset="100%" stopColor="#ffe27a" stopOpacity={0} />
						</radialGradient>
					</defs>
					<g fill={`url(#rays-${uid})`}>{SUN_RAYS}</g>
				</svg>
			</span>
			<svg viewBox="0 0 80 80" className="relative block h-full w-full">
				<defs>
					<radialGradient id={`sun-${uid}`} cx="40%" cy="36%" r="70%">
						<stop offset="0%" stopColor="#fffbe0" />
						<stop offset="55%" stopColor="#ffe06a" />
						<stop offset="100%" stopColor="#ffb52e" />
					</radialGradient>
				</defs>
				<circle cx={40} cy={40} r={19} fill={`url(#sun-${uid})`} />
				<circle
					cx={40}
					cy={40}
					r={19}
					fill="none"
					stroke="#fff5c2"
					strokeWidth={1.5}
					opacity={0.8}
				/>
			</svg>
		</SkyOrb>
	)
}

// księżyc na wieczór (zabawka latarni) — rogal z poświatą i kraterkami
export function MoonArt({ size = 64 }: { size?: number }) {
	return (
		<SkyOrb size={size} halo="rgba(255, 241, 178, 0.45)">
			<svg viewBox="0 0 64 64" className="relative block h-full w-full">
				<path
					d="M40 6 A26 26 0 1 0 58 40 A20 20 0 0 1 40 6 Z"
					fill="#fff3bf"
					stroke="#f1d36a"
					strokeWidth={2}
					strokeLinejoin="round"
				/>
				<g fill="#f1d36a" opacity={0.5}>
					<circle cx={22} cy={26} r={3.2} />
					<circle cx={31} cy={42} r={2.2} />
					<circle cx={18} cy={40} r={1.6} />
				</g>
			</svg>
		</SkyOrb>
	)
}

// chmura: zlepione obłoczki, cieniowany spód (nie płaski papier), blik
export const CloudArt = memo(function CloudArt() {
	const uid = useId()
	return (
		<svg viewBox="0 0 100 46" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`cloud-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" />
					<stop offset="70%" stopColor="#ffffff" />
					<stop offset="100%" stopColor="#dbe9fb" />
				</linearGradient>
			</defs>
			<g fill={`url(#cloud-${uid})`}>
				<ellipse cx={28} cy={30} rx={22} ry={13} />
				<ellipse cx={52} cy={21} rx={21} ry={16} />
				<ellipse cx={75} cy={30} rx={20} ry={12} />
				<rect x={10} y={29} width={80} height={13} rx={6.5} />
			</g>
			<g fill="#ffffff">
				<ellipse cx={48} cy={14} rx={12} ry={7} opacity={0.9} />
				<ellipse cx={26} cy={24} rx={8} ry={4.5} opacity={0.7} />
			</g>
		</svg>
	)
})

// ptaszki w oddali — dwa łuki, nic więcej
export function BirdsArt() {
	return (
		<svg viewBox="0 0 60 20" className="block w-full" aria-hidden="true">
			<g
				fill="none"
				stroke="#6b7fb8"
				strokeWidth={1.6}
				strokeLinecap="round"
				opacity={0.6}
			>
				<path d="M4 9 q4 -5 8 0 q4 -5 8 0" />
				<path d="M30 5 q3 -4 6 0 q3 -4 6 0" />
				<path d="M46 12 q2.5 -3 5 0 q2.5 -3 5 0" />
			</g>
		</svg>
	)
}

// tęcza (dekoracja): półkole pasów — końce chowają się za wzgórzami,
// więc caller stawia ją POD warstwą terenu; miękkie krawędzie (pasy lekko
// szersze niż krok, bez prześwitów)
const RAINBOW_BANDS = [
	"#ff6b6b",
	"#ffb03d",
	"#ffe45c",
	"#6bd88a",
	"#5cbdf2",
	"#9b7cf6",
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
					strokeWidth={7.4}
					opacity={0.8}
				/>
			))}
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Roślinność
// ---------------------------------------------------------------------------

// [jasny, ciemny, cień, kontur]
const TREE_CROWNS = {
	spring: ["#a6e59a", "#5bb96f", "#3f9a58", "#2f7d47"],
	mint: ["#b5ead0", "#6cc79a", "#4fae83", "#3b8d69"],
	blossom: ["#ffd6e8", "#ff9cc4", "#f072a5", "#c9508a"],
} as const
export type TreeVariant = keyof typeof TREE_CROWNS

// drzewo: korona z płatów (tył ciemniejszy, przód jaśniejszy), cień z prawej,
// bliki; `swing` dokłada huśtawkę z oponą (dekoracja)
export const TreeArt = memo(function TreeArt({
	variant = "spring",
	swing = false,
}: {
	variant?: TreeVariant
	swing?: boolean
}) {
	const uid = useId()
	const [light, dark, shade, line] = TREE_CROWNS[variant]
	return (
		<svg viewBox="0 0 64 80" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`tree-${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
					<stop offset="0%" stopColor={light} />
					<stop offset="100%" stopColor={dark} />
				</linearGradient>
				<clipPath id={`tree-clip-${uid}`}>
					<circle cx={17} cy={40} r={13} />
					<circle cx={47} cy={40} r={13} />
					<circle cx={32} cy={25} r={17} />
					<circle cx={32} cy={40} r={15} />
				</clipPath>
			</defs>
			<ellipse cx={33} cy={76} rx={19} ry={3} fill="#1e3a2a" opacity={0.14} />
			{/* pień: lekko zwężony, z cieniem z prawej */}
			<path
				d="M27 77 L28 52 Q24 47 20 45 L23 44 Q28 47 30 50 L32 62 L34 50 Q37 47 42 44 L45 45 Q39 48 36 52 L37 77 Z"
				fill="#a9743a"
				stroke="#7d5223"
				strokeWidth={1.4}
				strokeLinejoin="round"
			/>
			<path
				d="M33 54 L34 62 L36 54 L37 77 L33 77 Z"
				fill="#7d5223"
				opacity={0.35}
			/>
			{/* korona */}
			<g stroke={line} strokeWidth={1.8}>
				<circle cx={17} cy={40} r={13} fill={`url(#tree-${uid})`} />
				<circle cx={47} cy={40} r={13} fill={`url(#tree-${uid})`} />
				<circle cx={32} cy={25} r={17} fill={`url(#tree-${uid})`} />
				<circle
					cx={32}
					cy={40}
					r={15}
					fill={`url(#tree-${uid})`}
					stroke="none"
				/>
			</g>
			{/* cień korony (prawy dół) przycięty do sylwetki */}
			<g clipPath={`url(#tree-clip-${uid})`}>
				<path
					d="M22 58 Q48 60 62 40 Q60 58 40 60 Z"
					fill={shade}
					opacity={0.55}
				/>
				<circle cx={48} cy={44} r={6} fill={shade} opacity={0.35} />
			</g>
			<g fill="#ffffff" opacity={0.55}>
				<circle cx={24} cy={17} r={4.2} />
				<circle cx={31} cy={12} r={2} />
				<circle cx={13} cy={35} r={2.4} />
			</g>
			{swing && (
				<g>
					<line
						x1={49}
						y1={48}
						x2={49}
						y2={64}
						stroke="#8a5a28"
						strokeWidth={1.8}
					/>
					<circle
						cx={49}
						cy={67}
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

// krzaczek: trzy płaty, cień z prawej, jagódki
export const BushArt = memo(function BushArt() {
	const uid = useId()
	return (
		<svg viewBox="0 0 60 32" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`bush-${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
					<stop offset="0%" stopColor="#a6e59a" />
					<stop offset="100%" stopColor="#4fa868" />
				</linearGradient>
			</defs>
			<ellipse cx={30} cy={29} rx={24} ry={2.6} fill="#1e3a2a" opacity={0.14} />
			<g stroke="#2f7d47" strokeWidth={1.6}>
				<ellipse cx={16} cy={21} rx={13} ry={9} fill={`url(#bush-${uid})`} />
				<ellipse cx={44} cy={21} rx={13} ry={9} fill={`url(#bush-${uid})`} />
				<ellipse cx={30} cy={15} rx={14} ry={11} fill={`url(#bush-${uid})`} />
			</g>
			<path
				d="M36 25 Q50 24 55 16 Q52 27 38 28 Z"
				fill="#3f9a58"
				opacity={0.45}
			/>
			<circle cx={22} cy={13} r={2.2} fill="#ff6b9a" />
			<circle cx={36} cy={9} r={2.2} fill="#ffd95e" />
			<circle cx={45} cy={17} r={2.2} fill="#ff6b9a" />
			<circle cx={25} cy={9} r={1.6} fill="#ffffff" opacity={0.6} />
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
				opacity={0.7}
			>
				<path d="M4 13 Q5 6 2 3" />
				<path d="M9 13 Q9 4 12 1" />
				<path d="M14 13 Q16 6 20 4" />
				<path d="M19 13 Q21 9 23 8" />
			</g>
		</svg>
	)
}

// kwiatek na łące (zamiast emoji): tulipan / stokrotka / słonecznik / dzwonek.
// `FlowerGlyph` to fragment SVG (podstawa łodygi w (x, y), rośnie w górę) —
// współdzielony z grządką Ogródka w BuildingArt; `FlowerArt` opakowuje go
// w samodzielny <svg> dla łąki.
export type FlowerKind = "tulip" | "daisy" | "sunflower" | "bell"
const FLOWER_PETAL: Record<FlowerKind, string> = {
	tulip: "#ff6b9a",
	daisy: "#ffffff",
	sunflower: "#ffd23f",
	bell: "#9b7cf6",
}
export function FlowerGlyph({
	kind,
	x,
	y,
	scale = 1,
	color,
}: {
	kind: FlowerKind
	x: number
	y: number
	scale?: number
	color?: string
}) {
	const petal = color ?? FLOWER_PETAL[kind]
	return (
		<g transform={`translate(${x} ${y}) scale(${scale}) translate(-12 -29)`}>
			<path
				d="M12 29 Q12 20 12 13"
				stroke="#3f9e5f"
				strokeWidth={2}
				strokeLinecap="round"
				fill="none"
			/>
			<path d="M12 23 Q6 22 5 17 Q11 17 12 23 Z" fill="#5bb96f" />
			{kind === "tulip" && (
				<path
					d="M6 13 Q5 3 12 6 Q19 3 18 13 Q15 16 12 15 Q9 16 6 13 Z"
					fill={petal}
					stroke="#d84a7c"
					strokeWidth={1.2}
					strokeLinejoin="round"
				/>
			)}
			{kind === "daisy" && (
				<>
					{[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
						<ellipse
							key={deg}
							cx={12}
							cy={5}
							rx={2.4}
							ry={4.2}
							fill={petal}
							stroke="#d8dbe6"
							strokeWidth={0.8}
							transform={`rotate(${deg} 12 10)`}
						/>
					))}
					<circle
						cx={12}
						cy={10}
						r={3}
						fill="#ffd23f"
						stroke="#e0a800"
						strokeWidth={1}
					/>
				</>
			)}
			{kind === "sunflower" && (
				<>
					{[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
						(deg) => (
							<ellipse
								key={deg}
								cx={12}
								cy={3.5}
								rx={2.2}
								ry={5}
								fill={petal}
								stroke="#e0a800"
								strokeWidth={0.8}
								transform={`rotate(${deg} 12 10)`}
							/>
						),
					)}
					<circle
						cx={12}
						cy={10}
						r={4}
						fill="#a9743a"
						stroke="#7d5223"
						strokeWidth={1}
					/>
				</>
			)}
			{kind === "bell" && (
				<>
					<path
						d="M7 6 Q12 2 17 6 L18 13 Q12 17 6 13 Z"
						fill={petal}
						stroke="#6d4fd8"
						strokeWidth={1.2}
						strokeLinejoin="round"
					/>
					<path
						d="M8 13 L10 15 L12 13 L14 15 L16 13"
						fill="none"
						stroke="#6d4fd8"
						strokeWidth={1}
					/>
				</>
			)}
		</g>
	)
}
export const FlowerArt = memo(function FlowerArt({
	kind,
	color,
}: {
	kind: FlowerKind
	color?: string
}) {
	return (
		<svg viewBox="0 0 24 30" className="block w-full" aria-hidden="true">
			<FlowerGlyph kind={kind} x={12} y={29} color={color} />
		</svg>
	)
})

// motylek (zamiast emoji) — dwa skrzydła z gradientem, drobne ciało
export function ButterflyArt({ color = "#ffb03d" }: { color?: string }) {
	const uid = useId()
	return (
		<svg viewBox="0 0 24 20" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`bfly-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" />
					<stop offset="100%" stopColor={color} />
				</linearGradient>
			</defs>
			<g fill={`url(#bfly-${uid})`} stroke="#b8721c" strokeWidth={0.9}>
				<path d="M11 10 Q2 0 3 8 Q3 13 11 12 Z" />
				<path d="M13 10 Q22 0 21 8 Q21 13 13 12 Z" />
				<path d="M11 12 Q4 12 5 17 Q8 19 11 13 Z" />
				<path d="M13 12 Q20 12 19 17 Q16 19 13 13 Z" />
			</g>
			<path
				d="M12 6 L12 16"
				stroke="#5b3a12"
				strokeWidth={1.6}
				strokeLinecap="round"
			/>
			<path
				d="M12 6 Q10 3 8 3 M12 6 Q14 3 16 3"
				stroke="#5b3a12"
				strokeWidth={0.8}
				fill="none"
			/>
		</svg>
	)
}

// iskierka (zamiast emoji ✨): gwiazdka czteroramienna z blikiem
export function SparkleArt({ color = "#ffd95e" }: { color?: string }) {
	return (
		<svg viewBox="0 0 24 24" className="block w-full" aria-hidden="true">
			<path
				d="M12 1 Q13 10 22 12 Q13 14 12 23 Q11 14 2 12 Q11 10 12 1 Z"
				fill={color}
			/>
			<path
				d="M12 6 Q12.5 11 17 12 Q12.5 13 12 18 Q11.5 13 7 12 Q11.5 11 12 6 Z"
				fill="#ffffff"
				opacity={0.7}
			/>
		</svg>
	)
}

// staw z kaczuszką (dekoracja) — nieregularny brzeg z piaskiem, woda z
// gradientem i falkami, lilia, trzciny; kaczka ANIMOWANA przez callera
// (wrapper anim-float) — tu tylko rysunek
export function PondArt() {
	const uid = useId()
	return (
		<svg viewBox="0 0 120 52" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`pond-${uid}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#a8e3fb" />
					<stop offset="100%" stopColor="#4fb0ea" />
				</linearGradient>
			</defs>
			<path
				d="M8 30 Q6 14 30 12 Q52 4 82 10 Q112 12 112 30 Q110 46 70 48 Q30 50 8 30 Z"
				fill="#e8d9a8"
			/>
			<path
				d="M13 30 Q12 17 32 15 Q52 8 80 13 Q106 15 106 30 Q104 43 70 44 Q32 46 13 30 Z"
				fill={`url(#pond-${uid})`}
				stroke="#3d93c9"
				strokeWidth={1.4}
			/>
			<g
				fill="none"
				stroke="#e3f6ff"
				strokeWidth={1.4}
				strokeLinecap="round"
				opacity={0.8}
			>
				<path d="M28 24 q6 -2 12 0" />
				<path d="M62 33 q7 -2 14 0" />
				<path d="M40 38 q5 -1.5 10 0" />
			</g>
			<ellipse cx={44} cy={20} rx={13} ry={3.5} fill="#ffffff" opacity={0.45} />
			{/* lilia */}
			<path
				d="M84 34 a6 3.5 0 1 0 6 -3.2 L84 32 Z"
				fill="#5bb96f"
				stroke="#3f9a58"
				strokeWidth={0.9}
			/>
			<circle cx={86} cy={30} r={2} fill="#ff8fb0" />
			{/* trzciny */}
			<g stroke="#3f9e5f" strokeWidth={2.2} strokeLinecap="round" fill="none">
				<path d="M104 36 Q106 24 103 16" />
				<path d="M110 38 Q113 28 112 20" />
			</g>
			<ellipse cx={103} cy={15} rx={2.2} ry={4} fill="#8a5a28" />
			<ellipse cx={112} cy={19} rx={2} ry={3.6} fill="#8a5a28" />
			<g fill="#d9d2c2" stroke="#a8a08e" strokeWidth={0.8}>
				<ellipse cx={14} cy={44} rx={4.5} ry={2.4} />
				<ellipse cx={23} cy={47} rx={3.4} ry={1.9} />
			</g>
		</svg>
	)
}

// kaczuszka do stawu (zamiast emoji)
export function DuckArt() {
	return (
		<svg viewBox="0 0 30 24" className="block w-full" aria-hidden="true">
			<ellipse
				cx={13}
				cy={17}
				rx={10}
				ry={5.5}
				fill="#ffe27a"
				stroke="#d39a1a"
				strokeWidth={1.2}
			/>
			<circle
				cx={21}
				cy={9}
				r={5.2}
				fill="#ffe27a"
				stroke="#d39a1a"
				strokeWidth={1.2}
			/>
			<path
				d="M25.5 9 L30 10.5 L25.5 12 Z"
				fill="#ff9a3d"
				stroke="#d3681a"
				strokeWidth={0.9}
				strokeLinejoin="round"
			/>
			<circle cx={22.5} cy={8} r={1.1} fill="#3b2a1a" />
			<path
				d="M4 15 Q8 12 11 15"
				fill="none"
				stroke="#d39a1a"
				strokeWidth={1}
			/>
		</svg>
	)
}

// cokół pomnika Pierwszego Potworka — kamienny postument z tabliczką
export function PedestalArt() {
	return (
		<svg viewBox="0 0 64 24" className="block w-full" aria-hidden="true">
			<ellipse cx={32} cy={22} rx={28} ry={2.5} fill="#1e293b" opacity={0.14} />
			<g stroke="#8d95ad" strokeWidth={1.3} strokeLinejoin="round">
				<rect x={13} y={2} width={38} height={8} rx={2} fill="#eef0f7" />
				<rect x={6} y={9} width={52} height={10} rx={2.5} fill="#d7dbe8" />
			</g>
			<rect x={40} y={4} width={9} height={4} fill="#b8bfd2" opacity={0.6} />
			<rect
				x={24}
				y={11.5}
				width={16}
				height={5}
				rx={1}
				fill="#ffd95e"
				stroke="#c99a1a"
				strokeWidth={0.8}
			/>
			<circle cx={14} cy={14} r={1.2} fill="#a0a8bf" />
			<circle cx={50} cy={14} r={1.2} fill="#a0a8bf" />
		</svg>
	)
}

// namiot obozu wyprawy (zamiast emoji)
export function TentArt() {
	return (
		<svg viewBox="0 0 64 48" className="block w-full" aria-hidden="true">
			<ellipse cx={32} cy={45} rx={28} ry={3} fill="#1e3a2a" opacity={0.14} />
			<path
				d="M4 44 L32 6 L60 44 Z"
				fill="#ff8fb0"
				stroke="#c9508a"
				strokeWidth={1.8}
				strokeLinejoin="round"
			/>
			<path d="M32 6 L60 44 L46 44 Z" fill="#e84a7a" opacity={0.6} />
			<path d="M24 44 L32 22 L40 44 Z" fill="#5f2a4a" opacity={0.75} />
			<path
				d="M32 6 L32 0"
				stroke="#7d5223"
				strokeWidth={2}
				strokeLinecap="round"
			/>
			<path
				d="M32 0 l9 2.5 l-9 2.5 Z"
				fill="#ffd95e"
				stroke="#c99a1a"
				strokeWidth={0.9}
			/>
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
						<stop offset="0%" stopColor="#c9ea9e" stopOpacity={0.8} />
						<stop offset="60%" stopColor="#a8d98a" stopOpacity={0.5} />
						<stop offset="100%" stopColor="#a8d98a" stopOpacity={0} />
					</radialGradient>
				</defs>
				<ellipse cx={60} cy={13} rx={58} ry={12} fill={`url(#plot-${uid})`} />
				<ellipse
					cx={60}
					cy={14.5}
					rx={40}
					ry={6.5}
					fill="#1e3a2a"
					opacity={0.12}
				/>
			</svg>
			<span className="relative block w-full">{children}</span>
		</span>
	)
}
