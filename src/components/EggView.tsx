import { useId } from "react"
import type { PendingEgg } from "../game/rewards"

interface Props {
	quality: PendingEgg["quality"]
	cracks?: number // 0–2, przy 3. tapnięciu jajko już pęka w HatchScreen
	size?: number
	className?: string
}

// Light, body, shaded edge, and material-colored outline.
const PALETTES: Record<
	PendingEgg["quality"],
	[string, string, string, string]
> = {
	normal: ["#FFFDF1", "#F4E2B6", "#C49B62", "#B29368"],
	silver: ["#FFFFFF", "#DCE8F3", "#8196B6", "#7A8DAA"],
	gold: ["#FFF9CC", "#F6CE59", "#CC842B", "#B88635"],
	rainbow: ["#FFD7E8", "#C9B6EE", "#7C95C9", "#A083B6"],
	wish: ["#FFF5FF", "#E4CFF7", "#AA7DCD", "#A07BBC"],
}

const SHELL =
	"M60 8 C92 8 106 56 106 92 C106 124 86 142 60 142 C34 142 14 124 14 92 C14 56 28 8 60 8 Z"

export const EGG_LABELS: Record<PendingEgg["quality"], string> = {
	normal: "Zwykłe jajko",
	silver: "Srebrne jajko",
	gold: "Złote jajko",
	rainbow: "Tęczowe jajko",
	wish: "Jajko Życzeń",
}

export function EggView({
	quality,
	cracks = 0,
	size = 120,
	className = "",
}: Props) {
	const uid = useId()
	const [light, body, shade, outline] = PALETTES[quality]
	return (
		<svg
			viewBox="0 0 120 150"
			width={size}
			height={size * 1.25}
			className={`${quality === "rainbow" ? "anim-rainbow" : ""} ${className}`}
			role="img"
			aria-label={EGG_LABELS[quality]}
		>
			<defs>
				<radialGradient id={`egg-${uid}`} cx="32%" cy="28%" r="78%">
					<stop offset="0%" stopColor={light} />
					<stop offset="55%" stopColor={body} />
					<stop offset="100%" stopColor={shade} />
				</radialGradient>
				<linearGradient id={`rainbow-${uid}`} x1="0" y1="0" x2="0.8" y2="1">
					<stop offset="0%" stopColor="#FFBFD8" />
					<stop offset="28%" stopColor="#FFE6A4" />
					<stop offset="52%" stopColor="#BBE8D2" />
					<stop offset="76%" stopColor="#AFCFF3" />
					<stop offset="100%" stopColor="#CEACE8" />
				</linearGradient>
				<linearGradient id={`shine-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
					<stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
					<stop offset="100%" stopColor="#fff" stopOpacity="0" />
				</linearGradient>
				<clipPath id={`shell-${uid}`}>
					<path d={SHELL} />
				</clipPath>
			</defs>
			<path
				d={SHELL}
				fill={`url(#egg-${uid})`}
				stroke={outline}
				strokeWidth={2.5}
			/>
			<g clipPath={`url(#shell-${uid})`}>
				{quality === "rainbow" && (
					<path d={SHELL} fill={`url(#rainbow-${uid})`} opacity={0.8} />
				)}
				{/* Reflected light and a curved shadow give the shell volume. */}
				<path
					d="M85 24 C112 80 103 129 65 140 C99 147 121 111 111 70 Z"
					fill={shade}
					opacity={0.24}
				/>
				<path
					d="M23 93 C24 119 40 134 61 135"
					fill="none"
					stroke={light}
					strokeWidth={3}
					strokeLinecap="round"
					opacity={0.65}
				/>
			</g>
			{quality === "normal" && (
				<g fill="#C8A36C" opacity={0.65}>
					<ellipse
						cx={44}
						cy={58}
						rx={6}
						ry={7.5}
						transform="rotate(18 44 58)"
					/>
					<ellipse
						cx={80}
						cy={80}
						rx={8}
						ry={10}
						transform="rotate(-16 80 80)"
					/>
					<ellipse cx={52} cy={108} rx={6} ry={5} />
					<circle cx={71} cy={119} r={2.5} />
					<circle cx={34} cy={88} r={2} />
				</g>
			)}
			{quality === "silver" && (
				<g fill="none" stroke="#F8FCFF" strokeLinecap="round">
					<path d="M31 102 Q60 118 91 101" strokeWidth={3} opacity={0.7} />
					<path
						d="M76 53 L78 59 L84 61 L78 63 L76 69 L74 63 L68 61 L74 59 Z"
						fill="#F8FCFF"
						strokeWidth={1}
					/>
					<circle cx={86} cy={82} r={2} fill="#F8FCFF" />
				</g>
			)}
			{quality === "gold" && (
				<g fill="none" stroke="#FFF2B0" strokeLinecap="round">
					<path
						d="M27 102 Q60 117 95 100 M30 109 Q60 123 92 108"
						strokeWidth={2.5}
						opacity={0.8}
					/>
					<path
						d="M65 60 L74 73 L65 87 L56 73 Z"
						fill="#FFECA0"
						stroke="#D8A644"
						strokeWidth={2}
					/>
					<path d="M65 64 L60 73 L65 77" strokeWidth={2} />
				</g>
			)}
			{quality === "wish" && (
				<g
					fill="#A678D4"
					className="anim-sparkle"
					style={{ transformOrigin: "center" }}
				>
					<path
						stroke="#FDF3FF"
						strokeWidth={2}
						strokeLinejoin="round"
						d="M60 52 L64 64 L76 68 L64 72 L60 84 L56 72 L44 68 L56 64 Z"
					/>
					<circle cx={40} cy={96} r={4} />
					<circle cx={82} cy={102} r={4} />
				</g>
			)}
			{quality === "rainbow" && (
				<g fill="#ffffffaa">
					<circle cx={42} cy={60} r={5} />
					<circle cx={78} cy={90} r={6} />
					<circle cx={56} cy={112} r={4} />
				</g>
			)}
			{/* The same upper-left highlight ties every rarity to the scene lighting. */}
			<path
				d="M30 54 C33 34 46 19 59 18 C64 18 66 23 60 26 C46 31 39 41 36 55 C34 62 28 61 30 54 Z"
				fill={`url(#shine-${uid})`}
			/>
			<ellipse cx={27} cy={72} rx={2.5} ry={5} fill="#FFF" opacity={0.55} />
			{cracks >= 1 && (
				<path
					d="M44 70 L52 80 L46 90 L56 98"
					stroke="#8a6d3b"
					strokeWidth={3.5}
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			)}
			{cracks >= 2 && (
				<path
					d="M76 62 L68 74 L78 84 L70 96 M58 50 L64 60 L56 66"
					stroke="#8a6d3b"
					strokeWidth={3.5}
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			)}
		</svg>
	)
}
