import { useId } from "react"
import { MONSTERS } from "./catalog"
import {
	Aura,
	Belly,
	bodyPath,
	Crown,
	Eyes,
	Feet,
	GalaxyStars,
	Mouth,
	PALETTES,
	PatternLayer,
	Topper,
	Wings,
} from "./parts"

interface Props {
	id: number
	size?: number | string
	animate?: boolean
	className?: string
}

export function MonsterSvg({
	id,
	size = 160,
	animate = true,
	className,
}: Props) {
	const uid = useId()
	const monster = MONSTERS[id]
	if (!monster) return null
	const { dna } = monster
	const pal =
		PALETTES[dna.palette] ?? (PALETTES[0] as NonNullable<(typeof PALETTES)[0]>)
	const rainbow = dna.palette === 7
	const bodyFill = rainbow ? `url(#rb-${uid})` : pal.base
	const path = bodyPath(dna.body)
	return (
		<svg
			viewBox="0 0 200 200"
			width={size}
			height={size}
			className={className}
			role="img"
			aria-label={monster.name}
		>
			<defs>
				{rainbow && (
					<linearGradient id={`rb-${uid}`} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" stopColor="#FF9AA2" />
						<stop offset="25%" stopColor="#FFDAC1" />
						<stop offset="50%" stopColor="#E2F0CB" />
						<stop offset="75%" stopColor="#B5EAD7" />
						<stop offset="100%" stopColor="#C7CEEA" />
					</linearGradient>
				)}
				<clipPath id={`clip-${uid}`}>
					<path d={path} />
				</clipPath>
			</defs>
			<g className={animate ? "monster-bob" : undefined}>
				{/* legendarne mają koronę I aurę */}
				{(dna.accessory === "aura" || dna.accessory === "crown") && (
					<Aura palette={pal} />
				)}
				{dna.accessory === "wings" && <Wings palette={pal} />}
				<Feet palette={pal} fill={rainbow ? "#C7CEEA" : pal.base} />
				<path
					d={path}
					fill={bodyFill}
					stroke={pal.outline}
					strokeWidth={5}
					strokeLinejoin="round"
				/>
				<g clipPath={`url(#clip-${uid})`}>
					<Belly palette={pal} />
					<PatternLayer variant={dna.pattern} palette={pal} />
					{dna.palette === 6 && <GalaxyStars />}
				</g>
				{/* korona zastępuje topper, żeby nie kolidowały na czubku głowy */}
				{dna.accessory === "crown" ? (
					<Crown />
				) : (
					<Topper variant={dna.topper} palette={pal} />
				)}
				<g className={animate ? "monster-eyes" : undefined}>
					<Eyes variant={dna.eyes} palette={pal} />
				</g>
				<Mouth variant={dna.mouth} palette={pal} />
			</g>
		</svg>
	)
}
