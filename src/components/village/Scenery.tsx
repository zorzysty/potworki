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
					<stop offset="0%" stopColor="#a6d398" />
					<stop offset="45%" stopColor="#8bc382" />
					<stop offset="100%" stopColor="#6aaf75" />
				</linearGradient>
				{/* miękkie fale łąki: szerokie, poziome (rozciągnięte) plamy —
				    czytają się jako falowanie gruntu, nie jako łaty */}
				<radialGradient id={`ter-shade-${uid}`} cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#579961" stopOpacity={0.45} />
					<stop offset="100%" stopColor="#579961" stopOpacity={0} />
				</radialGradient>
				<radialGradient id={`ter-light-${uid}`} cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#d2e9ac" stopOpacity={0.55} />
					<stop offset="100%" stopColor="#d2e9ac" stopOpacity={0} />
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
			<Ridge d={FAR_RIDGE} fill={`url(#ter-far-${uid})`} crest={0.18} />
			{/* środkowe wzgórza + daleki las na grzbiecie (w kolorze mgły) */}
			<path d={FAR_FOREST} fill="#a3d6b8" opacity={0.85} />
			<Ridge d={MID_RIDGE} fill={`url(#ter-mid-${uid})`} crest={0.2} />
			{/* zbocze tylnego rzędu budynków + bliższy las */}
			<path d={NEAR_FOREST} fill="#7fc99a" opacity={0.9} />
			<Ridge d={SLOPE_RIDGE} fill={`url(#ter-slope-${uid})`} crest={0.18} />
			{/* łąka — przedni rząd stoi na jej skraju (linia gruntu = GROUND_Y) */}
			<Ridge d={MEADOW_RIDGE} fill={`url(#ter-meadow-${uid})`} crest={0.18} />

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
				<pattern
					id={`road-grain-${uid}`}
					width={9}
					height={7}
					patternUnits="userSpaceOnUse"
				>
					<path
						d="M1 2 h0.5 M5 5 h0.7 M7 1 h0.3"
						stroke="#b99b65"
						strokeWidth={0.14}
						opacity={0.35}
					/>
					<path
						d="M3 4 h0.7 M7 6 h0.5"
						stroke="#fff3d5"
						strokeWidth={0.18}
						opacity={0.6}
					/>
				</pattern>
			</defs>
			<path d={roadBand(gateX, gateY, 1.16)} fill="#8d9561" opacity={0.22} />
			<path d={roadBand(gateX, gateY, 1)} fill={`url(#road-${uid})`} />
			{/* jaśniejszy udeptany środek */}
			<path d={roadBand(gateX, gateY, 0.88)} fill="#f4e1b9" opacity={0.65} />
			<path d={roadBand(gateX, gateY, 0.62)} fill="#f7e8c7" opacity={0.4} />
			<path d={roadBand(gateX, gateY, 0.96)} fill={`url(#road-grain-${uid})`} />
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
					<g fill="#4e925b" opacity={0.32}>
						<path d="M12 26 l-3 -5 q4 1 5 4 q-1 -7 3 -9 l-1 10 Z M74 58 l-3 -4 l4 2 q1 -6 4 -7 l-2 9 Z M150 20 q0 -7 -3 -9 q5 2 5 7 l4 -5 l-2 7 Z M196 96 l-2 -6 l4 4 l4 -8 l-2 10 Z M40 118 l-3 -5 l4 2 l3 -7 l-1 10 Z M118 132 l-2 -5 l3 3 l3 -6 l-2 8 Z" />
					</g>
					<g fill="#d2e6aa" opacity={0.4}>
						<path d="M18 29 l1 -5 l2 5 Z M80 62 l3 -5 l-1 5 Z M156 23 l1 -4 l2 4 Z M45 121 l2 -6 l1 6 Z" />
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
			<path
				d="M14 40 C1 40 2 24 14 23 C15 12 27 9 35 15 C43 -1 65 3 68 17 C81 11 94 20 91 28 C103 37 88 44 78 41 Z"
				fill={`url(#cloud-${uid})`}
			/>
			<path
				d="M12 35 Q22 40 35 36 Q48 41 61 37 Q75 42 90 35"
				fill="none"
				stroke="#c6dced"
				strokeWidth={2}
				opacity={0.3}
				strokeLinecap="round"
			/>
			<path
				d="M40 15 Q49 7 58 13 M18 24 Q23 17 31 20"
				fill="none"
				stroke="#ffffff"
				strokeWidth={3}
				opacity={0.75}
				strokeLinecap="round"
			/>
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
	const crown =
		variant === "spring"
			? "M14 51 C4 48 5 38 12 34 C8 26 15 18 21 19 C20 6 34 3 40 13 C50 11 57 20 53 28 C64 34 61 47 52 49 C46 58 34 54 30 52 C24 58 17 56 14 51 Z"
			: "M10 49 C1 43 4 32 13 30 C10 20 18 14 26 17 C30 5 44 9 46 19 C58 17 63 28 57 35 C65 44 55 54 46 51 C37 60 27 53 25 52 C19 56 12 55 10 49 Z"
	return (
		<svg viewBox="0 0 64 80" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`tree-${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
					<stop stopColor={light} />
					<stop offset="0.55" stopColor={dark} />
					<stop offset="1" stopColor={shade} />
				</linearGradient>
				<linearGradient id={`bark-${uid}`}>
					<stop stopColor="#cc9b61" />
					<stop offset="1" stopColor="#946137" />
				</linearGradient>
				<clipPath id={`tree-clip-${uid}`}>
					<path d={crown} />
				</clipPath>
			</defs>
			<ellipse cx={33} cy={76} rx={21} ry={3} fill="#284c34" opacity={0.14} />
			{/* Forked branches and spreading roots support the canopy and swing. */}
			<path
				d="M23 76 Q29 70 28 58 L22 43 L26 42 L33 56 L40 39 L44 41 L36 61 Q35 71 41 76 L34 74 L30 77 L29 73 Z"
				fill={`url(#bark-${uid})`}
				stroke="#805630"
				strokeWidth={1.2}
				strokeLinejoin="round"
			/>
			{swing && (
				<path
					d="M35 58 Q45 59 52 47 L54 48 Q48 63 35 62 Z"
					fill={`url(#bark-${uid})`}
					stroke="#805630"
					strokeWidth={1}
				/>
			)}
			<path
				d="M31 62 Q33 67 31 72 M33 59 L30 52 M35 68 V72"
				fill="none"
				stroke="#805630"
				strokeWidth={0.8}
				strokeLinecap="round"
			/>
			<path
				d={crown}
				fill={`url(#tree-${uid})`}
				stroke={line}
				strokeWidth={1.3}
				strokeLinejoin="round"
			/>
			<g clipPath={`url(#tree-clip-${uid})`}>
				<path
					d="M9 44 Q18 51 26 43 Q36 51 43 42 Q54 45 61 33 V62 H4 Z"
					fill={shade}
					opacity={0.35}
				/>
				<path
					d="M9 33 Q13 23 24 27 Q22 16 34 14 Q40 14 44 20 Q35 16 31 25 Q19 24 18 34 Z"
					fill={light}
					opacity={0.65}
				/>
			</g>
			<g
				fill="none"
				stroke={line}
				strokeWidth={0.9}
				opacity={0.45}
				strokeLinecap="round"
			>
				<path d="M13 38 Q17 34 22 37 M31 31 Q35 27 40 30 M39 46 Q43 43 47 45" />
			</g>
			{variant === "blossom" ? (
				<g fill="#ffe8f1" stroke="#dd7da3" strokeWidth={0.5}>
					{[
						[16, 31],
						[31, 20],
						[44, 27],
						[24, 43],
						[48, 42],
					].map(([x, y]) => (
						<g key={x} transform={`translate(${x} ${y})`}>
							<path d="M0 -3 Q3 -4 3 -1 Q6 0 3 2 Q3 5 0 3 Q-3 5 -3 2 Q-6 0 -3 -1 Q-3 -4 0 -3 Z" />
							<circle r={0.8} fill="#efbc66" stroke="none" />
						</g>
					))}
				</g>
			) : (
				<g fill={light} opacity={0.7}>
					<path d="M15 29 Q14 23 20 24 Q20 28 15 29 M29 20 Q28 15 33 15 Q34 19 29 20 M42 36 Q43 31 48 32 Q48 36 42 36" />
				</g>
			)}
			{swing && (
				<g strokeLinecap="round">
					<path d="M50 53 V65" stroke="#b78a50" strokeWidth={1.4} />
					<ellipse
						cx={50}
						cy={69}
						rx={4}
						ry={5}
						fill="#596571"
						stroke="#354652"
						strokeWidth={1}
					/>
					<ellipse
						cx={50}
						cy={69}
						rx={1.8}
						ry={2.8}
						fill="#83bc7c"
						stroke="#354652"
						strokeWidth={0.7}
					/>
					<path
						d="M48 66 L47 68 M52 70 L51 72"
						stroke="#859099"
						strokeWidth={0.7}
					/>
				</g>
			)}
			<path
				d="M20 76 Q19 72 16 71 L20 73 L21 69 L23 75 M39 76 L42 71 L42 75 L46 73 L44 77"
				fill="#58985d"
			/>
		</svg>
	)
})

export const BushArt = memo(function BushArt() {
	const uid = useId()
	return (
		<svg viewBox="0 0 60 32" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`bush-${uid}`} x2="0.7" y2="1">
					<stop stopColor="#b1d990" />
					<stop offset="1" stopColor="#559b62" />
				</linearGradient>
			</defs>
			<ellipse cx={30} cy={28} rx={25} ry={3} fill="#284c34" opacity={0.14} />
			<path
				d="M5 25 Q0 18 9 15 Q8 7 18 9 Q24 -1 32 7 Q43 2 47 12 Q58 10 57 20 Q61 29 48 28 H14 Q6 29 5 25 Z"
				fill={`url(#bush-${uid})`}
				stroke="#43844f"
				strokeWidth={1.2}
			/>
			<path
				d="M7 23 Q16 27 23 21 Q29 27 36 21 Q46 27 55 19 Q58 28 46 27 H15 Z"
				fill="#43844f"
				opacity={0.3}
			/>
			<path
				d="M12 16 Q15 11 20 14 M24 10 Q28 7 32 11 M38 17 Q42 13 47 16"
				fill="none"
				stroke="#daecc0"
				strokeWidth={1.5}
				strokeLinecap="round"
				opacity={0.65}
			/>
			{[
				[20, 19],
				[39, 12],
				[46, 22],
			].map(([x, y]) => (
				<g key={x}>
					<circle
						cx={x}
						cy={y}
						r={2}
						fill="#e995a6"
						stroke="#b46b7d"
						strokeWidth={0.6}
					/>
					<circle
						cx={(x ?? 0) - 0.5}
						cy={(y ?? 0) - 0.5}
						r={0.6}
						fill="#ffe3da"
					/>
				</g>
			))}
		</svg>
	)
})

export function GrassTuft() {
	return (
		<svg viewBox="0 0 24 14" className="block w-full" aria-hidden="true">
			<ellipse cx={12} cy={12.5} rx={10} ry={1} fill="#43864f" opacity={0.12} />
			<path
				d="M4 13 Q4 8 1 5 Q6 7 7 12 Q6 4 10 1 Q9 7 11 12 Q12 5 16 3 Q14 8 15 12 Q18 7 23 7 Q19 10 18 13 Z"
				fill="#579d61"
			/>
			<path
				d="M8 13 Q8 7 10 4 L11 13 M13 13 Q15 8 18 7 L16 13"
				fill="#94c879"
			/>
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
	const water =
		"M14 28 C12 18 25 17 35 17 C44 17 45 11 61 12 C72 12 74 18 88 18 C101 17 108 24 104 31 C101 39 86 43 68 42 C55 41 50 47 34 42 C22 40 14 35 14 28 Z"
	return (
		<svg viewBox="0 0 120 52" className="block w-full" aria-hidden="true">
			<defs>
				<linearGradient id={`pond-${uid}`} x1="0.2" y1="0" x2="0.7" y2="1">
					<stop stopColor="#9bdad8" />
					<stop offset="0.5" stopColor="#65bac7" />
					<stop offset="1" stopColor="#408fae" />
				</linearGradient>
				<clipPath id={`pond-clip-${uid}`}>
					<path d={water} />
				</clipPath>
			</defs>
			<path
				d="M6 30 C4 16 24 10 37 12 C50 3 70 7 79 11 C96 10 115 16 113 30 C111 43 88 49 69 47 C48 53 21 48 6 36 Z"
				fill="#527f4b"
				opacity={0.2}
			/>
			<path
				d="M8 28 C7 15 26 12 36 13 C48 4 69 7 78 14 C97 10 113 19 110 31 C105 44 86 47 68 46 C52 47 49 50 32 46 C18 42 8 37 8 28 Z"
				fill="#d6cd9d"
				stroke="#a6ab78"
				strokeWidth={0.9}
			/>
			<path
				d={water}
				fill={`url(#pond-${uid})`}
				stroke="#548d94"
				strokeWidth={1.2}
			/>
			<g clipPath={`url(#pond-clip-${uid})`}>
				<path
					d="M12 24 Q30 14 44 21 Q62 11 84 22 Q99 19 109 27"
					fill="none"
					stroke="#367e91"
					strokeWidth={4}
					opacity={0.25}
				/>
				<path
					d="M15 33 Q28 44 46 40 Q61 45 72 40 Q93 44 105 31"
					fill="none"
					stroke="#bcece2"
					strokeWidth={1.4}
					opacity={0.75}
				/>
				<path
					d="M26 24 H40 M30 27 H47 M55 20 H66 M56 35 H74 M60 38 H69"
					fill="none"
					stroke="#e3f8ed"
					strokeWidth={1.2}
					strokeLinecap="round"
					opacity={0.65}
				/>
			</g>
			{/* Lily pads sit flat on the water; petals rise above them. */}
			<ellipse cx={87} cy={33} rx={9} ry={3} fill="#347f8c" opacity={0.3} />
			<path
				d="M87 32 L93 29 C85 24 75 30 81 33 C85 36 95 34 94 30 Z"
				fill="#7bb67a"
				stroke="#44875e"
				strokeWidth={0.8}
			/>
			<path
				d="M87 31 Q80 29 83 25 L87 28 Q86 22 89 23 Q93 25 90 28 L94 26 Q96 31 87 31 Z"
				fill="#f2a9bf"
				stroke="#bd728d"
				strokeWidth={0.6}
			/>
			<path d="M85 30 Q89 27 91 30" fill="#ffde93" />
			{/* Cattails and flat stones break up the bank. */}
			<g fill="none" stroke="#568751" strokeWidth={1.1} strokeLinecap="round">
				<path d="M104 36 Q102 26 103 12 M108 35 Q112 25 111 16 M103 37 Q99 27 97 27 M109 36 Q115 29 117 28" />
			</g>
			<path
				d="M101 36 Q95 31 96 24 Q102 29 103 36 M109 36 Q112 24 117 22 Q114 32 109 36"
				fill="#79aa60"
			/>
			<path
				d="M103 12 V18 M111 16 V22"
				stroke="#8b6744"
				strokeWidth={2.8}
				strokeLinecap="round"
			/>
			{[
				[15, 40, 1],
				[26, 45, 0.75],
				[96, 42, 0.8],
				[13, 18, 0.65],
			].map(([x, y, scale]) => (
				<g key={x} transform={`translate(${x} ${y}) scale(${scale})`}>
					<path
						d="M-5 1 L-4 -2 L1 -3 L5 0 L4 3 H-3 Z"
						fill="#b6b8a6"
						stroke="#868e7e"
						strokeWidth={0.7}
					/>
					<path d="M-4 -1 L1 -2 L4 0 H-2 Z" fill="#e0dfc7" />
				</g>
			))}
			<path
				d="M31 46 L28 41 L32 43 L34 39 L34 46 M6 31 L2 27 L6 28 L7 23 L9 32"
				fill="#6d9c5c"
			/>
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
				d="M7 15 Q13 12 17 16 Q13 21 8 18 Z"
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
			<ellipse cx={32} cy={22} rx={28} ry={2} fill="#284c34" opacity={0.14} />
			<g stroke="#8d95ad" strokeWidth={0.9} strokeLinejoin="round">
				<path d="M7 17 L12 13 H51 L57 17 V21 H7 Z" fill="#c7cedd" />
				<path d="M15 7 H49 V17 H15 Z" fill="#e1e5ed" />
				<path d="M43 7 H49 V17 H43 Z" fill="#b8c1d3" stroke="none" />
				<path d="M12 4 L17 1 H47 L52 4 V8 H12 Z" fill="#eef0f6" />
				<path d="M12 4 H52 M8 17 H56" fill="none" />
				<rect
					x={24}
					y={10}
					width={16}
					height={5}
					rx={0.8}
					fill="#efd482"
					stroke="#b99a45"
					strokeWidth={0.7}
				/>
			</g>
			<path d="M28 12 H36 M30 14 H34" stroke="#b99a45" strokeWidth={0.6} />
			<path d="M11 20 H22 M46 20 H52" stroke="#e9edf4" strokeWidth={0.8} />
		</svg>
	)
}

export function TentArt() {
	return (
		<svg viewBox="0 0 64 48" className="block w-full" aria-hidden="true">
			<ellipse cx={32} cy={45} rx={28} ry={2.5} fill="#284c34" opacity={0.14} />
			<g strokeLinejoin="round" strokeLinecap="round">
				<path
					d="M7 43 L26 10 L45 43 Z"
					fill="#ffb1c7"
					stroke="#b95b80"
					strokeWidth={1.3}
				/>
				<path
					d="M26 10 L39 6 L59 38 L45 43 Z"
					fill="#e981a5"
					stroke="#b95b80"
					strokeWidth={1.3}
				/>
				<path d="M39 7 L59 38 L51 40 Z" fill="#c9618b" opacity={0.4} />
				<path
					d="M17 43 L26 23 L36 43 Z"
					fill="#70516b"
					stroke="#a15579"
					strokeWidth={0.8}
				/>
				<path
					d="M26 23 Q25 35 19 38 L16 43 M26 23 Q28 35 33 37 L36 43"
					fill="#f9cfce"
					stroke="#b95b80"
					strokeWidth={0.8}
				/>
				<path
					d="M29 15 L45 39 M36 12 L51 36"
					stroke="#f7b8cd"
					strokeWidth={0.8}
				/>
				<path
					d="M26 10 L3 43 M39 6 L61 40"
					stroke="#c8ad7c"
					strokeWidth={0.9}
				/>
				<path
					d="M3 41 V45 M61 38 V42 M26 11 V5"
					stroke="#8b6841"
					strokeWidth={1.5}
				/>
				<path
					d="M26 5 L33 7 L26 9 Z"
					fill="#f5d882"
					stroke="#b89544"
					strokeWidth={0.6}
				/>
			</g>
		</svg>
	)
}

// Flat, faceted stones stay undistorted in the screen's perspective-sized wrappers.
export function SteppingStoneArt() {
	return (
		<svg viewBox="0 0 28 12" className="block h-full w-full" aria-hidden="true">
			<path
				d="M2 7 L5 3 L19 2 L26 5 L25 10 L9 11 L3 9 Z"
				fill="#bba77e"
				opacity={0.5}
			/>
			<path
				d="M2 5 L6 1 L20 1 L26 4 L24 8 L9 9 L3 7 Z"
				fill="#e1d4af"
				stroke="#b9a47b"
				strokeWidth={0.7}
			/>
			<path
				d="M5 4 L8 2 H19 L23 4"
				fill="none"
				stroke="#faf0d5"
				strokeWidth={1}
				strokeLinecap="round"
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
