import { useId } from "react"
import type { PendingEgg } from "../game/rewards"

interface Props {
	quality: PendingEgg["quality"]
	cracks?: number // 0–2, przy 3. tapnięciu jajko już pęka w HatchScreen
	size?: number
	className?: string
}

const GRADIENTS: Record<PendingEgg["quality"], [string, string]> = {
	normal: ["#FFFBF0", "#F2E2BC"],
	silver: ["#F8FAFD", "#C3D2E6"],
	gold: ["#FFF6CC", "#F2C14E"],
	rainbow: ["#FF9FB8", "#8ECDF7"],
	wish: ["#F8F0FF", "#D9C2FF"],
}

export const EGG_LABELS: Record<PendingEgg["quality"], string> = {
	normal: "Zwykłe jajko",
	silver: "Srebrne jajko",
	gold: "Złote jajko",
	rainbow: "Tęczowe jajko",
	wish: "Jajko Życzeń",
}

export function EggView({ quality, cracks = 0, size = 120, className = "" }: Props) {
	const uid = useId()
	const [top, bottom] = GRADIENTS[quality]
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
				<linearGradient id={`egg-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
					<stop offset="0%" stopColor={top} />
					<stop offset="100%" stopColor={bottom} />
				</linearGradient>
			</defs>
			<path
				d="M60 8 C92 8 106 56 106 92 C106 124 86 142 60 142 C34 142 14 124 14 92 C14 56 28 8 60 8 Z"
				fill={`url(#egg-${uid})`}
				stroke="#00000022"
				strokeWidth={3}
			/>
			{quality === "normal" && (
				<g fill="#E3CD9C">
					<circle cx={44} cy={58} r={7} />
					<circle cx={80} cy={80} r={9} />
					<circle cx={52} cy={108} r={6} />
				</g>
			)}
			{(quality === "silver" || quality === "gold") && (
				<path
					d="M34 36 C42 22 52 16 62 14"
					stroke="#ffffffcc"
					strokeWidth={8}
					strokeLinecap="round"
					fill="none"
				/>
			)}
			{quality === "wish" && (
				<g fill="#A678F0" className="anim-sparkle" style={{ transformOrigin: "center" }}>
					<path d="M60 52 L64 64 L76 68 L64 72 L60 84 L56 72 L44 68 L56 64 Z" />
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
