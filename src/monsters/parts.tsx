export interface Palette {
	base: string
	belly: string
	accent: string
	outline: string
}

// 0–5 zwykłe, 6 galaktyczna (epickie), 7 tęczowa (legendarne — gradient w MonsterSvg)
export const PALETTES: Palette[] = [
	{ base: "#8FD9A8", belly: "#EAFBEF", accent: "#3F9D63", outline: "#2F7A4C" },
	{ base: "#FFB37A", belly: "#FFE9D6", accent: "#E07B39", outline: "#B65E27" },
	{ base: "#7FC8F0", belly: "#E2F4FF", accent: "#3D86C6", outline: "#2E6CA3" },
	{ base: "#FFD95E", belly: "#FFF3C4", accent: "#D9A514", outline: "#A87F0E" },
	{ base: "#FF9FC2", belly: "#FFE3EE", accent: "#E2619A", outline: "#B94A7B" },
	{ base: "#B9A7F5", belly: "#ECE5FF", accent: "#7C5CF0", outline: "#5F45C4" },
	{ base: "#5C4B8F", belly: "#8D7EC9", accent: "#FFD95E", outline: "#3D3163" },
	{ base: "#FFFFFF", belly: "#FFFFFF", accent: "#FF5E8A", outline: "#7C5CF0" },
]

const BODY_PATHS = [
	// blob
	"M100 42 C130 38 158 60 162 95 C166 130 158 168 128 178 C110 184 90 184 72 178 C42 168 34 130 38 95 C42 60 70 46 100 42 Z",
	// kula
	"M100 42 C139 42 170 73 170 112 C170 151 139 182 100 182 C61 182 30 151 30 112 C30 73 61 42 100 42 Z",
	// gruszka
	"M100 45 C118 45 130 58 132 78 C150 90 162 115 162 138 C162 168 134 182 100 182 C66 182 38 168 38 138 C38 115 50 90 68 78 C70 58 82 45 100 45 Z",
	// fasolka
	"M88 45 C120 38 152 60 158 95 C164 130 150 170 115 180 C80 190 48 168 44 135 C40 105 50 88 62 78 C70 60 72 49 88 45 Z",
	// wysoki
	"M100 40 C130 40 148 52 148 80 L148 150 C148 172 128 184 100 184 C72 184 52 172 52 150 L52 80 C52 52 70 40 100 40 Z",
	// pyzaty kwadrat
	"M100 50 C135 50 160 60 162 90 L164 140 C164 170 140 180 100 180 C60 180 36 170 36 140 L38 90 C40 60 65 50 100 50 Z",
]

export function bodyPath(body: number): string {
	return BODY_PATHS[body] ?? (BODY_PATHS[0] as string)
}

export function Feet({ palette, fill }: { palette: Palette; fill: string }) {
	return (
		<g stroke={palette.outline} strokeWidth={4}>
			<ellipse cx={72} cy={183} rx={16} ry={10} fill={fill} />
			<ellipse cx={128} cy={183} rx={16} ry={10} fill={fill} />
		</g>
	)
}

export function Belly({ palette }: { palette: Palette }) {
	return (
		<ellipse
			cx={100}
			cy={146}
			rx={40}
			ry={30}
			fill={palette.belly}
			opacity={0.9}
		/>
	)
}

export function PatternLayer({
	variant,
	palette,
}: {
	variant: number
	palette: Palette
}) {
	if (variant === 1) {
		const dots: [number, number][] = [
			[62, 80],
			[140, 72],
			[55, 125],
			[150, 120],
			[80, 60],
			[122, 95],
		]
		return (
			<g fill={palette.accent} opacity={0.3}>
				{dots.map(([x, y]) => (
					<circle key={`${x}-${y}`} cx={x} cy={y} r={7} />
				))}
			</g>
		)
	}
	if (variant === 2) {
		return (
			<g fill={palette.accent} opacity={0.22} transform="rotate(-20 100 100)">
				<rect x={10} y={60} width={180} height={14} rx={7} />
				<rect x={10} y={95} width={180} height={14} rx={7} />
				<rect x={10} y={130} width={180} height={14} rx={7} />
			</g>
		)
	}
	if (variant === 3) {
		return <circle cx={138} cy={75} r={26} fill={palette.belly} opacity={0.4} />
	}
	return null
}

export function GalaxyStars() {
	const stars: [number, number, number][] = [
		[65, 70, 2.5],
		[135, 60, 2],
		[55, 110, 2],
		[148, 105, 2.5],
		[90, 65, 1.5],
		[115, 168, 2],
	]
	return (
		<g fill="#FFF6CF">
			{stars.map(([x, y, r]) => (
				<circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
			))}
		</g>
	)
}

function EyePair({
	cy,
	r,
	palette,
	sleepy,
	sparkly,
}: {
	cy: number
	r: number
	palette: Palette
	sleepy?: boolean
	sparkly?: boolean
}) {
	const eyes = [78, 122]
	return (
		<g>
			{eyes.map((cx) => (
				<g key={cx}>
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill="#fff"
						stroke={palette.outline}
						strokeWidth={3.5}
					/>
					<circle
						cx={cx + 2}
						cy={sleepy ? cy + 5 : cy + 2}
						r={r * 0.45}
						fill="#2A2140"
					/>
					<circle cx={cx - 1.5} cy={cy - 2} r={r * 0.16} fill="#fff" />
					{sparkly && (
						<circle cx={cx + 5} cy={cy + 5.5} r={r * 0.12} fill="#fff" />
					)}
					{sleepy && (
						<path
							d={`M${cx - r} ${cy - 3} A${r} ${r} 0 0 1 ${cx + r} ${cy - 3} L${cx + r} ${cy - r - 2} L${cx - r} ${cy - r - 2} Z`}
							fill={palette.base === "#FFFFFF" ? palette.belly : palette.base}
							stroke={palette.outline}
							strokeWidth={3}
						/>
					)}
				</g>
			))}
		</g>
	)
}

export function Eyes({
	variant,
	palette,
}: {
	variant: number
	palette: Palette
}) {
	switch (variant) {
		case 1:
			return (
				<g>
					<circle
						cx={100}
						cy={86}
						r={22}
						fill="#fff"
						stroke={palette.outline}
						strokeWidth={4}
					/>
					<circle cx={102} cy={89} r={10} fill="#2A2140" />
					<circle cx={98} cy={83} r={3.5} fill="#fff" />
				</g>
			)
		case 2:
			return <EyePair cy={88} r={14} palette={palette} sleepy />
		case 3:
			return <EyePair cy={88} r={16} palette={palette} sparkly />
		case 4:
			return (
				<g>
					<EyePair cy={92} r={12} palette={palette} />
					<circle
						cx={100}
						cy={68}
						r={9}
						fill="#fff"
						stroke={palette.outline}
						strokeWidth={3}
					/>
					<circle cx={101} cy={69} r={4} fill="#2A2140" />
				</g>
			)
		default:
			return <EyePair cy={88} r={15} palette={palette} />
	}
}

export function Mouth({
	variant,
	palette,
}: {
	variant: number
	palette: Palette
}) {
	const stroke = {
		stroke: palette.outline,
		strokeWidth: 5,
		strokeLinecap: "round" as const,
		fill: "none",
	}
	switch (variant) {
		case 1:
			return (
				<g>
					<path
						d="M78 118 Q100 148 122 118 Q100 126 78 118 Z"
						fill="#5A3A4E"
						stroke={palette.outline}
						strokeWidth={4}
						strokeLinejoin="round"
					/>
					<ellipse cx={100} cy={133} rx={11} ry={6} fill="#FF8FAE" />
				</g>
			)
		case 2:
			return (
				<g>
					<path d="M78 120 Q100 136 122 120" {...stroke} />
					<path
						d="M85 122 L89 132 L93 123 Z"
						fill="#fff"
						stroke={palette.outline}
						strokeWidth={2}
						strokeLinejoin="round"
					/>
					<path
						d="M107 123 L111 132 L115 122 Z"
						fill="#fff"
						stroke={palette.outline}
						strokeWidth={2}
						strokeLinejoin="round"
					/>
				</g>
			)
		case 3:
			return (
				<g>
					<path d="M80 119 Q100 133 120 119" {...stroke} />
					<path
						d="M98 126 Q100 124 110 126 Q112 140 104 141 Q97 142 98 126 Z"
						fill="#FF8FAE"
						stroke={palette.outline}
						strokeWidth={3}
						strokeLinejoin="round"
					/>
				</g>
			)
		default:
			return <path d="M80 119 Q100 137 120 119" {...stroke} />
	}
}

export function Topper({
	variant,
	palette,
}: {
	variant: number
	palette: Palette
}) {
	switch (variant) {
		case 1:
			return (
				<g
					fill={palette.accent}
					stroke={palette.outline}
					strokeWidth={3.5}
					strokeLinejoin="round"
				>
					<path d="M66 54 C60 40 60 32 68 24 C74 34 76 42 76 51 Z" />
					<path d="M134 54 C140 40 140 32 132 24 C126 34 124 42 124 51 Z" />
				</g>
			)
		case 2:
			return (
				<g strokeLinejoin="round">
					<path
						d="M58 62 L50 26 L86 48 Z"
						fill={palette.base === "#FFFFFF" ? palette.belly : palette.base}
						stroke={palette.outline}
						strokeWidth={4}
					/>
					<path
						d="M142 62 L150 26 L114 48 Z"
						fill={palette.base === "#FFFFFF" ? palette.belly : palette.base}
						stroke={palette.outline}
						strokeWidth={4}
					/>
					<path d="M60 54 L56 36 L74 47 Z" fill="#FF9FC2" />
					<path d="M140 54 L144 36 L126 47 Z" fill="#FF9FC2" />
				</g>
			)
		case 3:
			return (
				<g>
					<path
						d="M100 46 Q102 32 96 22"
						stroke={palette.outline}
						strokeWidth={4}
						fill="none"
						strokeLinecap="round"
					/>
					<circle
						cx={95}
						cy={18}
						r={7}
						fill={palette.accent}
						stroke={palette.outline}
						strokeWidth={3}
					/>
				</g>
			)
		case 4:
			return (
				<g>
					<path
						d="M100 45 Q99 34 102 26"
						stroke="#2F7A4C"
						strokeWidth={4}
						fill="none"
						strokeLinecap="round"
					/>
					<path
						d="M102 26 C96 14 82 12 74 18 C80 30 94 34 102 26 Z"
						fill="#8FD9A8"
						stroke="#2F7A4C"
						strokeWidth={3}
						strokeLinejoin="round"
					/>
				</g>
			)
		default:
			return null
	}
}

export function Wings({ palette }: { palette: Palette }) {
	return (
		<g
			fill={palette.belly}
			stroke={palette.outline}
			strokeWidth={4}
			strokeLinejoin="round"
		>
			<path d="M44 95 C20 78 12 96 20 112 C26 124 38 128 50 124 Z" />
			<path d="M156 95 C180 78 188 96 180 112 C174 124 162 128 150 124 Z" />
		</g>
	)
}

export function Aura({ palette }: { palette: Palette }) {
	const sparks: [number, number][] = [
		[30, 50],
		[172, 62],
		[22, 140],
		[178, 150],
	]
	return (
		<g>
			<circle
				cx={100}
				cy={112}
				r={88}
				fill={palette.accent}
				opacity={0.16}
				className="monster-aura"
			/>
			<g fill={palette.accent}>
				{sparks.map(([x, y]) => (
					<path
						key={`${x}-${y}`}
						d={`M${x} ${y - 6} L${x + 2} ${y - 2} L${x + 6} ${y} L${x + 2} ${y + 2} L${x} ${y + 6} L${x - 2} ${y + 2} L${x - 6} ${y} L${x - 2} ${y - 2} Z`}
					/>
				))}
			</g>
		</g>
	)
}

export function Crown() {
	return (
		<g stroke="#A87F0E" strokeWidth={3.5} strokeLinejoin="round">
			<path
				d="M72 44 L76 18 L88 32 L100 12 L112 32 L124 18 L128 44 Q100 52 72 44 Z"
				fill="#FFD95E"
			/>
			<circle cx={100} cy={38} r={4.5} fill="#FF5E8A" stroke="none" />
		</g>
	)
}
