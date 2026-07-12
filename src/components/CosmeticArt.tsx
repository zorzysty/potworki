import type { CSSProperties } from "react"
import type { CosmeticId } from "../game/cosmetics"
import { equippedFor } from "../game/cosmetics"
import { useGame } from "../store/store"

// Art przedmiotów ze Sklepiku (wiersze sklepu, garderoba) oraz nakładka
// EquippedOverlay — założone rzeczy renderowane NAD potworkiem przez slot
// `overlay` w MonsterStage. Kosmetyka to wyłącznie rodzeństwo-nakładki:
// MonsterSvg/DNA pozostają zamrożone i nietknięte (kontrakt warstwy
// opiekuńczej), a nakładka kosmetyczna KOMPONUJE się z nakładkami reakcji
// (serca/💤/znacznik przyjaciela) — nigdy ich nie wypiera.

const OUTLINE = "#5f45c4"

// Emoji w <text> skaluje się z viewBoxem tak samo jak wektory — kapelusz
// rośnie i maleje razem z potworkiem bez żadnych przeliczeń.
function EmojiGlyph({ e }: { e: string }) {
	return (
		<text x={24} y={39} textAnchor="middle" fontSize={36}>
			{e}
		</text>
	)
}

// Miniatura ramki karty (slot "frame", plan 014): pusta ramka w kolorze
// krawędzi + maleńkie emoji rogów — zapowiada oprawę modala, nie kapelusz.
function FrameGlyph({ color, e }: { color: string; e?: string }) {
	return (
		<g>
			<rect
				x={7}
				y={7}
				width={34}
				height={34}
				rx={9}
				fill="#fff"
				stroke={color}
				strokeWidth={6}
			/>
			{e && (
				<>
					<text x={11} y={16} textAnchor="middle" fontSize={11}>
						{e}
					</text>
					<text x={37} y={16} textAnchor="middle" fontSize={11}>
						{e}
					</text>
				</>
			)}
		</g>
	)
}

// Jeden glif = jedna scenka 48×48. Wektory tam, gdzie emoji nie istnieje
// (czapka z pomponem, wianek, kapelusz czarodzieja, korona lodowa…).
function Glyph({ id }: { id: CosmeticId }) {
	switch (id) {
		case "czapka-z-pomponem":
			return (
				<g stroke={OUTLINE} strokeWidth={1.6}>
					<circle cx={24} cy={11} r={5.5} fill="#fff7ed" />
					<path d="M9 36 a15 15 0 0 1 30 0 Z" fill="#ff5e8a" />
					<rect x={8} y={34} width={32} height={8} rx={4} fill="#fff1f2" />
				</g>
			)
		case "kokarda":
			return <EmojiGlyph e="🎀" />
		case "kapelusz-slomkowy":
			return <EmojiGlyph e="👒" />
		case "czapka-urodzinowa":
			return (
				<g stroke={OUTLINE} strokeWidth={1.6}>
					<path d="M24 8 L37 42 H11 Z" fill="#8b6cf5" />
					<g fill="#ffd95e" stroke="none">
						<circle cx={24} cy={20} r={2.2} />
						<circle cx={20} cy={30} r={2.2} />
						<circle cx={29} cy={34} r={2.2} />
					</g>
					<circle cx={24} cy={7} r={4} fill="#ffd95e" />
				</g>
			)
		case "melonik":
			return (
				<g stroke={OUTLINE} strokeWidth={1.6}>
					<path d="M12 32 a12 13 0 0 1 24 0 Z" fill="#7c5cf0" />
					<rect
						x={13}
						y={27}
						width={22}
						height={4.5}
						fill="#ffd95e"
						stroke="none"
					/>
					<rect x={6} y={31} width={36} height={6} rx={3} fill="#5f45c4" />
				</g>
			)
		case "wianek": {
			const flowers = [
				{ x: 8, y: 27, c: "#ff5e8a" },
				{ x: 16, y: 34, c: "#ffd95e" },
				{ x: 25, y: 36, c: "#8b6cf5" },
				{ x: 34, y: 32, c: "#ff5e8a" },
				{ x: 40, y: 25, c: "#ffd95e" },
			]
			return (
				<g>
					<ellipse
						cx={24}
						cy={28}
						rx={17}
						ry={8}
						fill="none"
						stroke="#3f9e5f"
						strokeWidth={4}
					/>
					{flowers.map((f) => (
						<g key={`${f.x}-${f.y}`}>
							<circle
								cx={f.x}
								cy={f.y}
								r={4}
								fill={f.c}
								stroke={OUTLINE}
								strokeWidth={1}
							/>
							<circle cx={f.x} cy={f.y} r={1.6} fill="#fff7ed" />
						</g>
					))}
				</g>
			)
		}
		case "kapelusz-czarodzieja":
			return (
				<g stroke={OUTLINE} strokeWidth={1.6}>
					<path d="M24 4 L36 36 H12 Z" fill="#8b6cf5" />
					<path
						d="M14.3 30 h19.4 l1.5 4 h-22.4 Z"
						fill="#ffd95e"
						strokeWidth={1.2}
					/>
					<ellipse cx={24} cy={38} rx={17} ry={5.5} fill="#7c5cf0" />
					<g fill="#fff7ed" stroke="none">
						<circle cx={24} cy={16} r={1.7} />
						<circle cx={28} cy={25} r={1.4} />
					</g>
				</g>
			)
		case "korona-lodowa":
			return (
				<g stroke={OUTLINE} strokeWidth={1.6} strokeLinejoin="round">
					<path
						d="M10 40 V18 L17 27 L24 12 L31 27 L38 18 V40 Z"
						fill="#bae6fd"
					/>
					<g fill="#38bdf8" stroke="none">
						<circle cx={10} cy={17} r={2.4} />
						<circle cx={24} cy={11} r={2.6} />
						<circle cx={38} cy={17} r={2.4} />
					</g>
					<circle cx={24} cy={33} r={2.6} fill="#7dd3fc" strokeWidth={1.2} />
				</g>
			)
		case "rama-kwiatki":
			return <FrameGlyph color="#fda4af" e="🌸" />
		case "rama-serduszka":
			return <FrameGlyph color="#f472b6" e="💖" />
		case "rama-zlota":
			return <FrameGlyph color="#fbbf24" e="✦" />
		case "rama-gwiezdna":
			return <FrameGlyph color="#818cf8" e="✨" />
		case "rama-teczowa":
			return (
				<g>
					<defs>
						<linearGradient id="rama-teczowa-grad" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stopColor="#f87171" />
							<stop offset="30%" stopColor="#fbbf24" />
							<stop offset="55%" stopColor="#4ade80" />
							<stop offset="80%" stopColor="#38bdf8" />
							<stop offset="100%" stopColor="#a78bfa" />
						</linearGradient>
					</defs>
					<rect
						x={7}
						y={7}
						width={34}
						height={34}
						rx={9}
						fill="#fff"
						stroke="url(#rama-teczowa-grad)"
						strokeWidth={6}
					/>
				</g>
			)
		case "aura-serduszek":
			return <EmojiGlyph e="💕" />
		case "aura-gwiazdek":
			return <EmojiGlyph e="⭐" />
		case "aura-teczy":
			return <EmojiGlyph e="🌈" />
		case "aura-iskier":
			return <EmojiGlyph e="🎇" />
		default:
			return <EmojiGlyph e="🎩" />
	}
}

// Miniatura przedmiotu: wiersze sklepiku, chipy garderoby. `size` px lub CSS
// (np. "100%" — EquippedOverlay skaluje kapelusz procentem szerokości sceny).
export function CosmeticArt({
	id,
	size = 40,
}: {
	id: CosmeticId
	size?: number | string
}) {
	return (
		<svg
			viewBox="0 0 48 48"
			style={{
				width: typeof size === "number" ? `${size}px` : size,
				height: typeof size === "number" ? `${size}px` : size,
				display: "block",
			}}
			aria-hidden="true"
		>
			<Glyph id={id} />
		</svg>
	)
}

// Aura: miękka poświata + drobinki wokół potworka (transform/opacity only,
// niska nieprzezroczystość — potworek zostaje bohaterem).
function AuraFx({ id }: { id: CosmeticId }) {
	if (id === "aura-teczy") {
		return (
			<>
				<div
					className="absolute rounded-full opacity-40 blur-[3px]"
					style={{
						inset: "4%",
						background:
							"conic-gradient(#f87171, #fbbf24, #4ade80, #38bdf8, #a78bfa, #f472b6, #f87171)",
						WebkitMask:
							"radial-gradient(closest-side, transparent 60%, #000 66%)",
						mask: "radial-gradient(closest-side, transparent 60%, #000 66%)",
					}}
				/>
				<span className="anim-float absolute left-[-6%] top-[6%] text-base">
					🌈
				</span>
				<span
					className="anim-sparkle absolute right-[-4%] bottom-[10%] text-sm"
					style={{ animationDelay: "0.6s" }}
				>
					✨
				</span>
			</>
		)
	}
	const fx =
		id === "aura-serduszek"
			? {
					glow: "rgba(244,114,182,0.30)",
					bits: ["💗", "💕", "💗"],
					cls: "anim-float",
				}
			: id === "aura-gwiazdek"
				? {
						glow: "rgba(251,191,36,0.30)",
						bits: ["⭐", "✨", "⭐"],
						cls: "anim-sparkle",
					}
				: {
						glow: "rgba(255,255,255,0.50)",
						bits: ["✨", "🎇", "✨"],
						cls: "anim-sparkle",
					}
	const spots: CSSProperties[] = [
		{ left: "-6%", top: "16%" },
		{ right: "-8%", top: "36%", animationDelay: "0.5s" },
		{ left: "6%", bottom: "0%", animationDelay: "1s" },
	]
	return (
		<>
			<div
				className="absolute rounded-full"
				style={{
					inset: "8%",
					background: `radial-gradient(circle, ${fx.glow}, transparent 70%)`,
				}}
			/>
			{spots.map((style, i) => (
				<span
					key={`${id}-${i}`}
					className={`${fx.cls} absolute text-base`}
					style={style}
				>
					{fx.bits[i]}
				</span>
			))}
		</>
	)
}

// Założone rzeczy potworka (kapelusz na głowie + aura wokół) — do slotu
// `overlay` MonsterStage. Callerzy komponują ją FRAGMENTEM z nakładką reakcji:
// overlay={<><EquippedOverlay …/>{reakcja}</>}. Brak wpisów → null (zero DOM).
// Ramka (slot "frame") celowo NIE tutaj: renderuje ją kontener karty
// kolekcjonerskiej w CollectionScreen (cardClasses), nie nakładka na potworku.
export function EquippedOverlay({ monsterId }: { monsterId: number }) {
	const cosmetics = useGame((s) => s.cosmetics)
	const eq = equippedFor(cosmetics, monsterId)
	if (!eq.hat && !eq.aura) return null
	return (
		<>
			{eq.aura && <AuraFx id={eq.aura} />}
			{eq.hat && (
				<div
					className="absolute left-1/2"
					style={{
						top: "-6%",
						width: "44%",
						transform: "translateX(-50%) rotate(-6deg)",
					}}
				>
					<CosmeticArt id={eq.hat} size="100%" />
				</div>
			)}
		</>
	)
}
