import { type CSSProperties, useEffect, useRef, useState } from "react"
import { MONSTERS } from "../monsters/catalog"
import { dayStamp, type RoundPhase, useGame } from "../store/store"
import {
	GREET_HELLO,
	GREET_MISSED,
	GREET_NEWDAY,
	pickPhrase,
	TAP,
	TAP_JACKPOT,
	withName,
} from "./companionPhrases"
import { MonsterStage } from "./MonsterStage"
import { SpeechBubble } from "./SpeechBubble"

// Powitanie odpala się RAZ na sesję (otwarcie aplikacji), nie przy każdym powrocie
// na Home — moduł-level flaga przeżywa remonty komponentu w obrębie sesji.
let sessionGreeted = false

// Serca/iskry wystrzeliwują znad potworka (--bx/--by jak --sx przy gwiazdkach).
// Współdzielone przez Home-przyjaciela i wędrowców w wiosce.
export function HeartBurst({ nonce }: { nonce: number }) {
	const bits = [
		{ e: "❤️", bx: "-24px", by: "-46px", d: "0s" },
		{ e: "💛", bx: "22px", by: "-52px", d: "0.08s" },
		{ e: "✨", bx: "2px", by: "-60px", d: "0.16s" },
	]
	return (
		<>
			{bits.map((b, i) => (
				<span
					key={`${nonce}-${i}`}
					className="anim-heart-burst absolute left-1/2 top-1/3 -ml-2.5 text-2xl"
					style={
						{ "--bx": b.bx, "--by": b.by, animationDelay: b.d } as CSSProperties
					}
				>
					{b.e}
				</span>
			))}
		</>
	)
}

// Poziom powitania z danych, które zapis JUŻ ma (lastPlayedDay) — bez nowego pola
// i bez poczucia winy: przerwa daje NAJCIEPLEJSZE powitanie, nigdy wyrzut.
function greetingTier(
	lastPlayedDay: string,
	now: number,
): "hello" | "newday" | "missed" {
	if (!lastPlayedDay) return "newday"
	if (lastPlayedDay === dayStamp(now)) return "hello"
	const [y, m, d] = lastPlayedDay.split("-").map(Number)
	if (!y || !m || !d) return "newday"
	const start = new Date(now)
	start.setHours(0, 0, 0, 0)
	const last = new Date(y, m - 1, d).getTime()
	const days = Math.floor((start.getTime() - last) / 86_400_000)
	return days >= 2 ? "missed" : "newday"
}

type ReactionAnim = "hop" | "cheer"
interface Reaction {
	anim: ReactionAnim
	hearts: boolean
	bubble: string | null
	nonce: number
}

// Ulubiony przyjaciel na ekranie głównym: żywy (bob/blink + drobna bezczynność),
// reaguje na dotyk (skok + serca + dymek) i wita po otwarciu aplikacji. Gdy brak
// przyjaciela → null (Home pokazuje wtedy najnowszego potworka jak dotąd).
export function Companion({ size = 150 }: { size?: number }) {
	const companionId = useGame((s) => s.companionId)
	const owned = useGame((s) => s.ownedMonsters)
	const lastPlayedDay = useGame((s) => s.achievementStats.lastPlayedDay)

	const [reaction, setReaction] = useState<Reaction | null>(null)
	const nonceRef = useRef(0)
	const lastBubbleRef = useRef<string | null>(null)

	const present = companionId !== null && companionId in owned
	const name = present ? (MONSTERS[companionId]?.name ?? "") : ""

	// auto-czyszczenie reakcji (StrictMode-safe: timeout + cleanup, bez animationend)
	useEffect(() => {
		if (!reaction) return
		const t = setTimeout(() => setReaction(null), 1200)
		return () => clearTimeout(t)
	}, [reaction])

	// powitanie raz na sesję
	useEffect(() => {
		if (!present || sessionGreeted) return
		sessionGreeted = true
		const tier = greetingTier(lastPlayedDay, Date.now())
		const bank =
			tier === "missed"
				? GREET_MISSED
				: tier === "newday"
					? GREET_NEWDAY
					: GREET_HELLO
		const bubble = withName(pickPhrase(bank, null), name)
		lastBubbleRef.current = bubble
		nonceRef.current += 1
		setReaction({
			anim: tier === "missed" ? "cheer" : "hop",
			hearts: tier === "missed",
			bubble,
			nonce: nonceRef.current,
		})
	}, [present, name, lastPlayedDay])

	// reżyser bezczynności: co 6–12 s drobna reakcja, jeśli nic się nie dzieje
	useEffect(() => {
		if (!present) return
		let timer: ReturnType<typeof setTimeout>
		const schedule = () => {
			timer = setTimeout(
				() => {
					setReaction((r) => {
						if (r) return r
						nonceRef.current += 1
						return {
							anim: "hop",
							hearts: Math.random() < 0.35,
							bubble: null,
							nonce: nonceRef.current,
						}
					})
					schedule()
				},
				6000 + Math.random() * 6000,
			)
		}
		schedule()
		return () => clearTimeout(timer)
	}, [present])

	if (!present) return null

	const onTap = () => {
		const roll = Math.random()
		const jackpot = roll < 0.05
		const bank = jackpot ? TAP_JACKPOT : TAP
		const bubble = withName(pickPhrase(bank, lastBubbleRef.current), name)
		lastBubbleRef.current = bubble
		nonceRef.current += 1
		setReaction({
			anim: jackpot ? "cheer" : "hop",
			hearts: jackpot || roll < 0.6,
			bubble,
			nonce: nonceRef.current,
		})
	}

	const animClass =
		reaction?.anim === "cheer"
			? "anim-cheer-jump"
			: reaction
				? "anim-companion-hop"
				: ""

	return (
		<button
			type="button"
			onClick={onTap}
			aria-label={`Pogłaszcz przyjaciela: ${name}`}
			className="relative inline-flex touch-manipulation flex-col items-center active:scale-95"
		>
			<div key={reaction?.nonce ?? "rest"} className={animClass}>
				<MonsterStage
					id={companionId}
					size={size}
					animate
					overlay={
						reaction?.hearts ? <HeartBurst nonce={reaction.nonce} /> : null
					}
				/>
			</div>
			{reaction?.bubble && (
				<div className="absolute -top-8 left-1/2 z-20 -translate-x-1/2">
					<SpeechBubble key={`b-${reaction.nonce}`} text={reaction.bubble} />
				</div>
			)}
		</button>
	)
}

// Mały przyjaciel kibicujący w rundzie: reaguje na fazę pytania, nigdy nie zasłania
// karty i nie karze. Bez dotyku/tekstu (słowa odciągałyby wzrok od matmy).
// W rundzie-wizycie gospodarzem jest Strażnik regionu: `overrideId` renderuje go
// zamiast przyjaciela (z pominięciem warunku posiadania), `overrideSilhouette`
// pokazuje sylwetkę, gdy nieposiadany (tajemniczy gospodarz — precedens: mapa).
export function CheerCompanion({
	phase,
	lastStars,
	size = 80,
	overrideId,
	overrideSilhouette = false,
}: {
	phase: RoundPhase | undefined
	lastStars: number
	size?: number
	overrideId?: number
	overrideSilhouette?: boolean
}) {
	const companionId = useGame((s) => s.companionId)
	const owned = useGame((s) => s.ownedMonsters)
	const [reaction, setReaction] = useState<{
		anim: "cheer" | "nod"
		hearts: boolean
		big: boolean
		nonce: number
	} | null>(null)
	const nonceRef = useRef(0)

	useEffect(() => {
		if (phase === "correct") {
			nonceRef.current += 1
			setReaction({
				anim: "cheer",
				hearts: true,
				big: lastStars >= 3,
				nonce: nonceRef.current,
			})
		} else if (phase === "wrong") {
			nonceRef.current += 1
			setReaction({
				anim: "nod",
				hearts: false,
				big: false,
				nonce: nonceRef.current,
			})
		}
	}, [phase, lastStars])

	useEffect(() => {
		if (!reaction) return
		const t = setTimeout(() => setReaction(null), 1000)
		return () => clearTimeout(t)
	}, [reaction])

	// Strażnik-gospodarz ma pierwszeństwo; bez niego zachowanie jak dotąd
	// (przyjaciel, gdy wybrany i posiadany — inaczej nic).
	const hostId =
		overrideId ??
		(companionId !== null && companionId in owned ? companionId : null)
	if (hostId === null) return null

	const animClass =
		reaction?.anim === "cheer"
			? "anim-cheer-jump"
			: reaction?.anim === "nod"
				? "anim-nod"
				: ""

	return (
		<div className="pointer-events-none fixed bottom-2 left-2 z-30 land:bottom-4 land:left-4">
			<div key={reaction?.nonce ?? "rest"} className={animClass}>
				{/* tęczowy odcień tylko przy szybkiej 3★ (filter na osobnej warstwie,
				    żeby nie kasował transformu skoku) */}
				<div className={reaction?.big ? "anim-rainbow" : ""}>
					<MonsterStage
						id={hostId}
						size={size}
						animate
						className={
							overrideId !== undefined && overrideSilhouette
								? "monster-silhouette"
								: undefined
						}
						overlay={
							reaction?.hearts ? <HeartBurst nonce={reaction.nonce} /> : null
						}
					/>
				</div>
			</div>
		</div>
	)
}
