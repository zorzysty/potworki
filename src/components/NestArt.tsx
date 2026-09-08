import { type CSSProperties, memo, type ReactNode, useId } from "react"

// The back and front surround the unchanged egg slots. All decorative geometry
// stays inside a 12px inset; foliage is attached to branches tucked into the rim.
const VW = 400
const VH = 300
const BOX = `0 0 ${VW} ${VH}`

export interface NestSlot {
	cx: number
	bottom: number
	w: number
	z: number
}
// Styl pozycji slotu (% wrappera): `bottom` slotu jest mierzony od GÓRY
// viewBoxu (jak współrzędne SVG), stąd odwrócenie — ekran nie musi tego wiedzieć.
export function nestSlotStyle(slot: NestSlot): CSSProperties {
	return {
		left: `${slot.cx - slot.w / 2}%`,
		bottom: `${100 - slot.bottom}%`,
		width: `${slot.w}%`,
		zIndex: slot.z,
	}
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

// Long, overlapping strands follow the bowl's volume. Short cross-strands bind
// them together; a dark edge and narrow highlight keep the weave readable small.
const BACK_WEAVE = [
	"M34 145 C39 94 121 73 194 79 C277 73 349 96 367 139",
	"M45 137 C70 94 135 87 209 86 C280 84 333 104 355 135",
	"M61 121 C105 83 204 81 268 95",
	"M164 82 C241 76 322 93 348 122",
	"M45 147 C48 119 83 101 119 96",
	"M283 103 C325 110 345 127 349 148",
]
const BODY_WEAVE = [
	"M41 171 C66 234 157 269 251 250 C308 241 345 211 359 172",
	"M54 192 C103 241 186 262 272 237 C309 226 334 209 345 190",
	"M76 214 C132 252 216 261 290 225",
	"M102 234 C151 257 219 258 258 246",
]
const FRONT_WEAVE = [
	"M29 147 C42 190 114 219 188 222 C276 231 350 194 373 150",
	"M36 157 C76 210 159 236 248 215 C310 203 354 180 365 154",
	"M44 160 C80 192 131 209 196 207 C268 211 327 188 355 161",
	"M55 157 C93 186 149 198 206 197 C270 198 319 180 345 156",
	"M57 184 C109 220 186 228 247 212",
	"M163 219 C237 229 321 199 352 169",
	"M40 145 C46 172 72 190 105 204",
	"M287 204 C322 191 346 173 358 147",
]
const BINDINGS = [
	"M63 175 Q65 187 59 193",
	"M88 188 Q92 200 87 207",
	"M117 198 Q123 212 118 219",
	"M153 205 Q157 222 152 228",
	"M193 206 Q198 222 195 231",
	"M233 205 Q241 218 239 227",
	"M272 195 Q282 205 280 215",
	"M307 182 Q321 193 318 202",
	"M337 165 Q350 176 346 183",
]
const WOOD = ["#BA8958", "#D0A16A", "#AD784D", "#C69660"]

function Weave({ paths, width = 7 }: { paths: string[]; width?: number }) {
	return (
		<g fill="none" strokeLinecap="round" strokeLinejoin="round">
			{paths.map((d, i) => (
				<g key={d}>
					<path d={d} stroke="#795035" strokeWidth={width + 2.5} />
					<path d={d} stroke={WOOD[i % WOOD.length]} strokeWidth={width} />
					<path
						d={d}
						stroke="#F2D29B"
						strokeWidth={1.4}
						transform="translate(0 -1.8)"
						opacity={0.55}
					/>
				</g>
			))}
		</g>
	)
}

// The base is the stem attachment; the curved tip follows its growth direction.
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
				d="M0 0 C5 -15 21 -22 35 -17 C29 -2 14 7 0 0 Z"
				fill="#83AC64"
				stroke="#527C48"
				strokeWidth={1.8}
				strokeLinejoin="round"
			/>
			<path d="M2 -1 Q19 -6 33 -16 C20 -19 8 -12 2 -1" fill="#B2CC80" />
			<path
				d="M0 0 Q18 -6 32 -15 M13 -5 L13 -12 M21 -9 L26 -7"
				fill="none"
				stroke="#638B4C"
				strokeWidth={1.2}
				strokeLinecap="round"
			/>
		</g>
	)
}

function Feather() {
	return (
		<g transform="translate(262 229) rotate(24)">
			<path
				d="M0 0 C-9 -12 -4 -36 8 -43 C19 -36 19 -15 0 0 Z"
				fill="#F9F5ED"
				stroke="#C7B9AC"
				strokeWidth={1.5}
			/>
			<path
				d="M0 7 Q5 -15 8 -36 M3 -8 L-2 -16 M5 -18 L12 -25 M6 -25 L2 -31"
				fill="none"
				stroke="#C7B9AC"
				strokeWidth={1.3}
				strokeLinecap="round"
			/>
		</g>
	)
}

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
	return (
		<div
			className={`relative w-full ${className}`}
			style={{ aspectRatio: `${VW} / ${VH}`, ...style }}
		>
			<NestBack uid={uid} />
			{/* JAJKA — pozycjonowane przez HatchScreen wg NEST_SLOTS */}
			{children}
			<NestFront uid={uid} />
		</div>
	)
}

const NestBack = memo(function NestBack({ uid }: { uid: string }) {
	return (
		<svg
			viewBox={BOX}
			className="absolute inset-0 h-full w-full"
			aria-hidden="true"
		>
			<defs>
				<radialGradient id={`nest-shadow-${uid}`}>
					<stop stopColor="#66526A" stopOpacity={0.28} />
					<stop offset="55%" stopColor="#66526A" stopOpacity={0.12} />
					<stop offset="100%" stopColor="#66526A" stopOpacity={0} />
				</radialGradient>
				<radialGradient id={`nest-lining-${uid}`} cx="48%" cy="72%" r="70%">
					<stop stopColor="#D9C28A" />
					<stop offset="58%" stopColor="#B49A65" />
					<stop offset="100%" stopColor="#79583A" />
				</radialGradient>
			</defs>
			<ellipse
				cx={200}
				cy={263}
				rx={179}
				ry={29}
				fill={`url(#nest-shadow-${uid})`}
			/>
			{/* A single branch peeks from behind the right shoulder, its base hidden. */}
			<path
				d="M329 133 Q352 111 350 91"
				fill="none"
				stroke="#6F8B4F"
				strokeWidth={3}
				strokeLinecap="round"
			/>
			<Leaf x={347} y={108} rot={-75} size={0.78} />
			<Leaf x={350} y={99} rot={18} size={0.78} />
			<path
				d="M29 150 C27 102 104 73 198 76 C288 73 367 101 373 150 L338 165 L62 165 Z"
				fill="#9C7049"
				stroke="#795035"
				strokeWidth={3}
			/>
			<Weave paths={BACK_WEAVE} width={7} />
			{/* Recessed oval and nested straw curves make a soft, deep lining. */}
			<ellipse
				cx={200}
				cy={146}
				rx={139}
				ry={51}
				fill={`url(#nest-lining-${uid})`}
			/>
			<path
				d="M64 144 C85 88 309 89 336 143"
				fill="none"
				stroke="#6D5035"
				strokeWidth={5}
				opacity={0.45}
			/>
			<g fill="none" strokeLinecap="round">
				<path
					d="M81 147 C97 113 284 108 319 142 M93 156 C131 122 270 124 309 153 M115 166 C158 140 249 139 287 165 M144 177 Q201 153 260 176"
					stroke="#E8D3A0"
					strokeWidth={3}
					opacity={0.6}
				/>
				<path
					d="M89 140 Q132 125 157 131 M228 122 Q274 124 295 137 M127 161 Q177 147 208 157 M219 172 Q244 158 279 162"
					stroke="#957A4B"
					strokeWidth={2}
					opacity={0.55}
				/>
			</g>
			<path
				d="M106 173 Q110 163 120 168 Q127 154 138 163 Q151 158 155 172 M261 173 Q269 159 278 166 Q290 157 298 170"
				fill="#91A16A"
				opacity={0.65}
			/>
		</svg>
	)
})

const NestFront = memo(function NestFront({ uid }: { uid: string }) {
	return (
		<svg
			viewBox={BOX}
			className="pointer-events-none absolute inset-0 h-full w-full"
			aria-hidden="true"
			style={{ zIndex: 10 }}
		>
			<defs>
				<linearGradient id={`nest-body-${uid}`} x1="0" y1="0" x2="0.65" y2="1">
					<stop stopColor="#CD9C64" />
					<stop offset="60%" stopColor="#A6744B" />
					<stop offset="100%" stopColor="#80563B" />
				</linearGradient>
				<linearGradient id={`nest-rim-${uid}`} x1="0" y1="0" x2="0.3" y2="1">
					<stop stopColor="#E2BB80" />
					<stop offset="100%" stopColor="#B38251" />
				</linearGradient>
			</defs>
			{/* A rounded, tapered bowl replaces the thin, ragged lower silhouette. */}
			<path
				d="M30 146 C38 207 97 256 191 259 C287 268 353 218 372 146 C340 192 272 216 199 214 C127 214 61 190 30 146 Z"
				fill={`url(#nest-body-${uid})`}
				stroke="#795035"
				strokeWidth={3}
				strokeLinejoin="round"
			/>
			<Weave paths={BODY_WEAVE} width={8} />
			<path
				d="M29 145 C58 176 123 193 200 195 C274 195 337 174 373 145 C360 194 286 229 200 230 C112 227 43 196 29 145 Z"
				fill={`url(#nest-rim-${uid})`}
				stroke="#90613E"
				strokeWidth={2.5}
			/>
			<Weave paths={FRONT_WEAVE} width={8} />
			<Weave paths={BINDINGS} width={3.5} />
			{/* A few deliberate loose ends, safely inset from the SVG boundary. */}
			<g fill="none" strokeLinecap="round" strokeLinejoin="round">
				<path
					d="M49 176 Q26 164 20 148 M350 179 Q372 169 380 151 M102 223 Q80 236  60 225"
					stroke="#997047"
					strokeWidth={3}
				/>
				<path
					d="M69 116 Q53 99 56 91 M85 108 Q77 95 82 85 M303 111 Q318 93 329 94 M108 207 Q91 200 81 186 M289 214 Q310 217 324 207"
					stroke="#EDD09A"
					strokeWidth={2.5}
				/>
			</g>
			<Feather />
			{/* One leafy twig lies diagonally along the left rim; all leaves join it. */}
			<path
				d="M119 227 C97 218 67 198 48 177"
				fill="none"
				stroke="#557B46"
				strokeWidth={3}
				strokeLinecap="round"
			/>
			<Leaf x={62} y={190} rot={-115} size={0.85} />
			<Leaf x={77} y={203} rot={-22} size={0.85} />
			<Leaf x={96} y={216} rot={162} size={0.72} />
			{/* The branch disappears under this strand, anchoring it in the weave. */}
			<path
				d="M106 231 Q120 226 130 229"
				fill="none"
				stroke="#E1B67A"
				strokeWidth={5}
				strokeLinecap="round"
			/>
		</svg>
	)
})
