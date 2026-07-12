import { type CSSProperties, useEffect, useRef, useState } from "react"
import { HeartBurst } from "./Companion"
import { EquippedOverlay } from "./CosmeticArt"
import { pickPhrase, VILLAGE_TAP } from "./companionPhrases"
import { MonsterStage } from "./MonsterStage"
import { SpeechBubble } from "./SpeechBubble"

export interface WanderParams {
	leftPct: number
	bottomPct: number
	scale: number
	wanderX: number
	durS: number
	delayS: number
	z: number
}

// Deterministyczny hash id→[0,1) (stabilny między renderami → brak przeskoków).
function hash01(n: number): number {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
	return x - Math.floor(x)
}

const clamp = (v: number, lo: number, hi: number) =>
	Math.max(lo, Math.min(hi, v))

// Rozmieszczenie: addytywna sekwencja Kroneckera na dwóch niewspółmiernych stałych
// (złoty podział na X, √2−1 na Y) — równomierne, organiczne rozsypanie 2D BEZ rzędów,
// kolumn i pasm (lepsze niż siatka/losowanie/R2, które przy „prawie wymiernej" stałej
// grupuje co kilka indeksów). Pozycja z `index`, lekki jitter + ruch/skala z `id`.
// Wszystko deterministyczne → stabilne między renderami. Skala/z z Y: niżej = większy.
const SCATTER_X = 0.6180339887 // 1/φ — „najbardziej niewymierna", brak pasm na X
const SCATTER_Y = 0.4142135624 // √2−1 — niezależna od X, dekoreluje pary (x,y)

export function wanderParams(id: number, index: number): WanderParams {
	const fx = (0.5 + SCATTER_X * index) % 1
	const fy = (0.5 + SCATTER_Y * index) % 1
	const jx = (hash01(id) - 0.5) * 5
	const jy = (hash01(id + 7) - 0.5) * 5
	const leftPct = clamp(8 + fx * 74 + jx, 4, 84) // pas X 8–82%
	// pas Y (bottom) 6–40%: wędrowcy zostają PONIŻEJ linii budynków (grunt na
	// ~47% od góry) — nie chodzą po dachach; przy budynkach bywają tylko
	// mieszkańcy (Resident, celowo)
	const bottomPct = clamp(6 + fy * 34 + jy, 4, 40) // pas Y (bottom) 6–40%
	const dir = id % 2 === 0 ? 1 : -1
	return {
		leftPct,
		bottomPct,
		scale: 1.06 - ((bottomPct - 6) / 36) * 0.34, // niżej = większy (głębia)
		wanderX: dir * (40 + Math.floor(hash01(id + 31) * 46)), // ±40..86 px
		durS: 6 + hash01(id + 53) * 5, // 6–11 s
		delayS: -(hash01(id + 71) * 9), // ujemna faza → różny start
		z: Math.round(100 - bottomPct), // przód (niżej) na wierzchu
	}
}

// Mały znacznik „to twój przyjaciel" nad ulubieńcem w wiosce.
function CompanionMarker() {
	return (
		<span className="anim-bounce-slow absolute -top-2 left-1/2 -ml-2 text-lg">
			💛
		</span>
	)
}

// Jeden potworek dryfujący po wiosce. Wędrówka to czysty CSS (anim-stroll + zmienne),
// więc brak timerów na ruch; tylko reakcja na dotyk używa StrictMode-safe timeoutu.
export function WanderingMonster({
	id,
	params,
	isCompanion,
	size = 60,
	cheerNonce = 0,
}: {
	id: number
	params: WanderParams
	isCompanion: boolean
	size?: number
	// zmiana wartości (>0) → potworek cieszy się jak po dotyku, ale bez dymka
	// (wspólna radość z nowej budowli w wiosce)
	cheerNonce?: number
}) {
	const [react, setReact] = useState<{
		nonce: number
		bubble: string | null
	} | null>(null)
	const nonceRef = useRef(0)
	const lastRef = useRef<string | null>(null)

	useEffect(() => {
		if (!react) return
		const t = setTimeout(() => setReact(null), 1100)
		return () => clearTimeout(t)
	}, [react])

	useEffect(() => {
		if (!cheerNonce) return
		nonceRef.current += 1
		setReact({ nonce: nonceRef.current, bubble: null })
	}, [cheerNonce])

	const onTap = () => {
		const bubble = pickPhrase(VILLAGE_TAP, lastRef.current)
		lastRef.current = bubble
		nonceRef.current += 1
		setReact({ nonce: nonceRef.current, bubble })
	}

	return (
		<div
			className="absolute"
			style={{
				left: `${params.leftPct}%`,
				bottom: `${params.bottomPct}%`,
				transform: `scale(${params.scale})`,
				zIndex: params.z,
			}}
		>
			<div
				className="anim-stroll"
				style={
					{
						"--wander-x": `${params.wanderX}px`,
						"--stroll-dur": `${params.durS}s`,
						animationDelay: `${params.delayS}s`,
					} as CSSProperties
				}
			>
				<button
					type="button"
					onClick={onTap}
					aria-label="Pogłaszcz potworka"
					className="relative block touch-manipulation active:scale-95"
				>
					<div
						key={react?.nonce ?? "rest"}
						className={react ? "anim-companion-hop" : ""}
					>
						<MonsterStage
							id={id}
							size={size}
							animate
							// kosmetyka komponuje się z reakcją/znacznikiem (fragment)
							overlay={
								<>
									<EquippedOverlay monsterId={id} />
									{react ? (
										<HeartBurst nonce={react.nonce} />
									) : isCompanion ? (
										<CompanionMarker />
									) : null}
								</>
							}
						/>
					</div>
					{react?.bubble && (
						<div className="absolute -top-7 left-1/2 z-20 -translate-x-1/2">
							<SpeechBubble key={`b-${react.nonce}`} text={react.bubble} />
						</div>
					)}
				</button>
			</div>
		</div>
	)
}
