import { useEffect, useRef, useState } from "react"
import { HeartBurst } from "../Companion"
import { MonsterStage } from "../MonsterStage"

export type ResidentMode = "doze" | "play" | "guard"

// Potworek „mieszkający" przy zbudowanym budynku: nie wędruje — drzemie przy
// fontannie/domkach (💤), skacze na placu zabaw, wartuje pod zamkiem.
// To wędrowcy z końca listy (najstarsi z pokazywanych), deterministycznie.
export function Resident({
	id,
	leftPct,
	bottomPct,
	mode,
	cheerNonce = 0,
}: {
	id: number
	leftPct: number
	bottomPct: number
	mode: ResidentMode
	cheerNonce?: number
}) {
	const [react, setReact] = useState<number | null>(null)
	const nonceRef = useRef(0)

	useEffect(() => {
		if (react === null) return
		const t = setTimeout(() => setReact(null), 1100)
		return () => clearTimeout(t)
	}, [react])

	useEffect(() => {
		if (!cheerNonce) return
		nonceRef.current += 1
		setReact(nonceRef.current)
	}, [cheerNonce])

	const idle =
		mode === "play" ? "anim-bounce-slow" : mode === "doze" ? "" : "anim-float"

	return (
		<div
			className="absolute"
			style={{
				left: `${leftPct}%`,
				bottom: `${bottomPct}%`,
				zIndex: Math.round(100 - bottomPct),
			}}
		>
			<button
				type="button"
				onClick={() => {
					nonceRef.current += 1
					setReact(nonceRef.current)
				}}
				aria-label="Pogłaszcz potworka"
				className="relative block touch-manipulation active:scale-95"
			>
				<div
					key={react ?? "rest"}
					className={react ? "anim-companion-hop" : idle}
				>
					<MonsterStage
						id={id}
						size={54}
						animate
						overlay={react !== null ? <HeartBurst nonce={react} /> : null}
					/>
				</div>
				{mode === "doze" && react === null && (
					<span className="anim-float pointer-events-none absolute -right-2 -top-2 text-base">
						💤
					</span>
				)}
			</button>
		</div>
	)
}
