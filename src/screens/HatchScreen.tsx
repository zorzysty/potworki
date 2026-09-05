import confetti from "canvas-confetti"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { BigButton } from "../components/BigButton"
import { EGG_LABELS, EggView } from "../components/EggView"
import { NEST_SLOTS, NestArt } from "../components/NestArt"
import { RARITY_META } from "../components/rarity"
import { MONSTER_COUNT, MONSTERS } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame } from "../store/store"

// kontur jajka z EggView (viewBox 120×150) spróbkowany do wielokąta w % —
// hitbox jajek w gnieździe (clip-path przycina hit-testing, nie tylko malowanie)
const EGG_CLIP =
	"polygon(50.0% 5.3%, 56.4% 6.0%, 62.1% 7.8%, 67.2% 10.7%, 71.8% 14.5%, 75.8% 19.1%, 79.2% 24.3%, 82.0% 30.1%, 84.3% 36.1%, 86.1% 42.5%, 87.3% 48.9%, 88.1% 55.2%, 88.3% 61.3%, 88.0% 66.5%, 87.0% 71.2%, 85.4% 75.5%, 83.2% 79.5%, 80.5% 82.9%, 77.3% 86.0%, 73.6% 88.6%, 69.6% 90.8%, 65.1% 92.5%, 60.4% 93.7%, 55.3% 94.4%, 50.0% 94.7%, 44.7% 94.4%, 39.6% 93.7%, 34.9% 92.5%, 30.4% 90.8%, 26.4% 88.6%, 22.7% 86.0%, 19.5% 82.9%, 16.8% 79.5%, 14.6% 75.5%, 13.0% 71.2%, 12.0% 66.5%, 11.7% 61.3%, 11.9% 55.2%, 12.7% 48.9%, 13.9% 42.5%, 15.7% 36.1%, 18.0% 30.1%, 20.8% 24.3%, 24.2% 19.1%, 28.2% 14.5%, 32.8% 10.7%, 37.9% 7.8%, 43.6% 6.0%)"

// polska liczba mnoga: 1 iskierkę, 2–4 iskierki, 5+ (i 12–14) iskierek
function iskierkiWord(n: number): string {
	if (n === 1) return "iskierkę"
	const d = n % 10
	const h = n % 100
	return d >= 2 && d <= 4 && (h < 12 || h > 14) ? "iskierki" : "iskierek"
}

export function HatchScreen() {
	const pendingEggs = useGame((s) => s.pendingEggs)
	const lastHatch = useGame((s) => s.lastHatch)
	const hatchEgg = useGame((s) => s.hatchEgg)
	const clearLastHatch = useGame((s) => s.clearLastHatch)
	const goTo = useGame((s) => s.goTo)
	const [cracks, setCracks] = useState(0)
	const [wobbleNonce, setWobbleNonce] = useState(0)

	const [selectedIndex, setSelectedIndex] = useState(0)
	// permutacja slotów gniazda: order[slot] = indeks jajka; slot wybranego
	// jajka stoi pusty (jajko jest „wyjęte" na dół). Zamiana wyboru = swap dwóch
	// wpisów, więc stare jajko spada dokładnie w slot klikniętego.
	const [order, setOrder] = useState<number[]>([])
	// FLIP: zmierzone przed podmianą stanu pozycje obu jajek; useLayoutEffect
	// po renderze animuje je z tych pozycji do nowych (tylko transform)
	const flip = useRef<{
		up: number
		down: number
		upFrom: DOMRect
		downFrom: DOMRect
	} | null>(null)
	const bigRef = useRef<HTMLDivElement>(null)
	const nestRefs = useRef(new Map<number, HTMLElement>())

	const ownedCount = useGame((s) => Object.keys(s.ownedMonsters).length)
	// indeks może się zdezaktualizować po wykluciu (lista się skraca) — przytnij do zakresu
	const safeIndex = Math.min(selectedIndex, Math.max(0, pendingEggs.length - 1))
	const egg = pendingEggs[safeIndex]
	const monster = lastHatch ? MONSTERS[lastHatch.monsterId] : undefined
	const collectionComplete =
		lastHatch?.isNew === true && ownedCount === MONSTER_COUNT

	const nestOrder =
		order.length === pendingEggs.length ? order : pendingEggs.map((_, i) => i)

	const selectEgg = (i: number) => {
		const upEl = nestRefs.current.get(i)
		const bigEl = bigRef.current
		if (upEl && bigEl) {
			flip.current = {
				up: i,
				down: safeIndex,
				upFrom: upEl.getBoundingClientRect(),
				downFrom: bigEl.getBoundingClientRect(),
			}
		}
		const next = [...nestOrder]
		const a = next.indexOf(i)
		const b = next.indexOf(safeIndex)
		if (a >= 0 && b >= 0) {
			next[a] = safeIndex
			next[b] = i
		}
		setOrder(next)
		setSelectedIndex(i)
		setCracks(0)
		setWobbleNonce(0)
	}

	useLayoutEffect(() => {
		const f = flip.current
		if (!f) return
		flip.current = null
		const bigEl = bigRef.current
		const downEl = nestRefs.current.get(f.down)
		const pairs: [HTMLElement, DOMRect][] = []
		const raised: HTMLElement[] = []
		if (bigEl) pairs.push([bigEl, f.upFrom])
		if (downEl) pairs.push([downEl, f.downFrom])
		for (const [el, from] of pairs) {
			const to = el.getBoundingClientRect()
			const dx = from.left + from.width / 2 - (to.left + to.width / 2)
			const dy = from.top + from.height / 2 - (to.top + to.height / 2)
			el.style.transition = "none"
			el.style.transform = `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`
			// warstwę podnosimy TYLKO dużemu jajku (statyczne → relative, żeby
			// z-index działał). Jajko lecące do gniazda zostaje na z-index slotu:
			// jako absolute i tak maluje się nad statycznym tekstem, a przedni
			// wieniec (z 10) zasłania je naturalnie, gdy wpada do gniazda —
			// podniesienie nad wieniec kończyło się „wskoczeniem" za niego po locie
			if (getComputedStyle(el).position === "static") {
				el.style.position = "relative"
				el.style.zIndex = "20"
				raised.push(el)
			}
			// wymuszony reflow: stan startowy musi się „zapisać" przed włączeniem
			// przejścia, inaczej przeglądarka scala oba zapisy i nie ma animacji
			void el.offsetWidth
		}
		const raf = requestAnimationFrame(() => {
			for (const [el] of pairs) {
				el.style.transition = "transform 0.5s cubic-bezier(0.34, 1.3, 0.64, 1)"
				el.style.transform = ""
			}
		})
		// po locie zdejmujemy tylko warstwę; `transition` zostaje (zdjęcie go
		// w trakcie spóźnionego przejścia ucinało lot skokiem do celu)
		const timer = setTimeout(() => {
			for (const el of raised) {
				el.style.position = ""
				el.style.zIndex = ""
			}
		}, 800)
		return () => {
			cancelAnimationFrame(raf)
			clearTimeout(timer)
		}
	})

	useEffect(() => {
		if (!lastHatch?.isNew) return
		confetti({ particleCount: 130, spread: 80, origin: { y: 0.55 } })
		if (lastHatch.isDream || collectionComplete) {
			const timer = setTimeout(
				() => confetti({ particleCount: 180, spread: 120, origin: { y: 0.4 } }),
				350,
			)
			return () => clearTimeout(timer)
		}
	}, [lastHatch, collectionComplete])

	const tapEgg = () => {
		if (!egg) return
		if (cracks >= 2) {
			setCracks(0)
			setSelectedIndex(0)
			hatchEgg(safeIndex)
		} else {
			setCracks((c) => c + 1)
			setWobbleNonce((n) => n + 1)
		}
	}

	const leave = () => {
		clearLastHatch()
		goTo("home")
	}

	return (
		<div className="flex min-h-[var(--app-vh)] flex-col items-center p-5">
			<div className="flex w-full items-center justify-between">
				<button
					type="button"
					onClick={leave}
					className="touch-manipulation rounded-full bg-white/20 px-5 py-2 text-2xl font-extrabold text-white active:scale-90"
					aria-label="Wróć do domku"
				>
					←
				</button>
				{pendingEggs.length > 0 && (
					<div className="rounded-full bg-white/20 px-4 py-1 text-lg font-extrabold text-white">
						🥚 {pendingEggs.length}
					</div>
				)}
			</div>

			<div className="flex w-full flex-1 flex-col items-center justify-center gap-5">
				{monster && lastHatch ? (
					<>
						{lastHatch.isNew && (
							<div className="anim-pop rounded-full bg-gradient-to-r from-bubblegum to-orange-400 px-6 py-2 text-2xl font-extrabold text-white shadow-lg">
								{lastHatch.isDream
									? "WYMARZONY POTWOREK! 💖"
									: "NOWY POTWOREK! ✨"}
							</div>
						)}
						{collectionComplete && (
							<div className="anim-pop rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-2 text-2xl font-extrabold text-white shadow-lg">
								🏆 MISTRZYNI KOLEKCJI! 🏆
							</div>
						)}
						<div
							className={`anim-pop-in rounded-[2.5rem] bg-white/95 p-6 shadow-2xl ${
								lastHatch.isDream ? "ring-8 ring-amber-300" : ""
							}`}
						>
							<MonsterSvg id={lastHatch.monsterId} size={210} />
						</div>
						<div className="text-4xl font-extrabold text-white">
							{monster.name}
						</div>
						<div
							className={`rounded-full px-4 py-1 text-lg font-extrabold ${RARITY_META[monster.rarity].badge}`}
						>
							{RARITY_META[monster.rarity].label}
						</div>
						{!lastHatch.isNew && (
							<div className="anim-fade-up text-xl font-extrabold text-amber-300">
								Już go masz! Zamienia się w ✨ +{lastHatch.iskierkiGained}{" "}
								{iskierkiWord(lastHatch.iskierkiGained)}
							</div>
						)}
						<div className="flex flex-col gap-3 pt-2">
							{pendingEggs.length > 0 ? (
								<BigButton
									onClick={clearLastHatch}
									className="px-10 py-5 text-3xl"
								>
									Następne jajko! 🥚
								</BigButton>
							) : (
								<BigButton onClick={leave} className="px-10 py-5 text-3xl">
									Super! 🎉
								</BigButton>
							)}
						</div>
					</>
				) : egg ? (
					<>
						{/* gniazdo i duże jajko skalują się wspólnie od --app-vh: stały
						    budżet pionowy (nagłówek, etykiety, podpowiedź, odstępy) to
						    ~270px, resztę dzielą gniazdo (3/4 szer. = wys.) i jajko */}
						<div className="text-2xl font-extrabold text-white/90">
							{EGG_LABELS[egg.quality]}
						</div>
						<button
							type="button"
							onClick={tapEgg}
							className="touch-manipulation active:scale-95"
							aria-label="Tapnij jajko"
						>
							<div
								ref={bigRef}
								style={{
									width:
										"clamp(110px, calc((var(--app-vh) - 270px) * 0.34), 190px)",
								}}
							>
								<div
									key={wobbleNonce}
									className={wobbleNonce > 0 ? "anim-wobble" : "anim-float"}
								>
									<EggView
										quality={egg.quality}
										cracks={cracks}
										className="block h-auto w-full"
									/>
								</div>
							</div>
						</button>
						<div className="anim-bounce-slow text-xl font-extrabold text-white/80">
							👆 Tapnij jajko {3 - cracks} {3 - cracks === 1 ? "raz" : "razy"}!
						</div>
						{pendingEggs.length > 1 && (
							<div className="flex w-full flex-col items-center gap-1">
								{/* gniazdo = wybór jajka: sloty wg permutacji nestOrder, slot
								    wybranego jajka pusty; nadmiar ponad liczbę slotów pokazuje chip */}
								<NestArt
									className="max-w-[34rem]"
									style={{
										width: "min(100%, calc((var(--app-vh) - 270px) * 0.75))",
									}}
								>
									{nestOrder.map((i, slotIdx) => {
										const e = pendingEggs[i]
										const slot = NEST_SLOTS[slotIdx]
										if (!e || !slot || i === safeIndex) return null
										return (
											<button
												key={i}
												ref={(el) => {
													if (el) nestRefs.current.set(i, el)
													else nestRefs.current.delete(i)
												}}
												type="button"
												onClick={() => selectEgg(i)}
												className="pointer-events-none absolute touch-manipulation [filter:drop-shadow(0_3px_3px_#0006)] transition-[filter] hover:[filter:drop-shadow(0_0_5px_#fff)_drop-shadow(0_0_12px_#fffa)] active:scale-90"
												style={{
													left: `${slot.cx - slot.w / 2}%`,
													bottom: `${100 - slot.bottom}%`,
													width: `${slot.w}%`,
													zIndex: slot.z,
												}}
												aria-label={`Wybierz: ${EGG_LABELS[e.quality]}`}
											>
												<EggView
													quality={e.quality}
													className="block h-auto w-full"
												/>
												{/* hitbox = kształt jajka: niewidzialna nakładka z clip-path
												    (przycina hit-testing) NAD rysunkiem — sam rysunek zostaje
												    nieprzycięty; przycisk sam klików nie łapie (pointer-events-none) */}
												<div
													className="pointer-events-auto absolute inset-0"
													style={{ clipPath: EGG_CLIP }}
												/>
												{e.mode === "div" && (
													<div className="absolute right-0 top-0 rounded-full bg-violet-500 px-1.5 text-xs font-extrabold text-white">
														÷
													</div>
												)}
												{e.mode === "gap" && (
													<div className="absolute right-0 top-0 rounded-full bg-violet-500 px-1.5 text-xs font-extrabold text-white">
														🧩
													</div>
												)}
											</button>
										)
									})}
									{pendingEggs.length > NEST_SLOTS.length && (
										<div
											className="absolute right-2 top-2 rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold text-white"
											style={{ zIndex: 11 }}
										>
											+{pendingEggs.length - NEST_SLOTS.length} 🥚
										</div>
									)}
								</NestArt>
							</div>
						)}
					</>
				) : (
					<>
						<NestArt className="max-w-[28rem]" />
						<div className="text-2xl font-extrabold text-white/90">
							Gniazdo jest puste
						</div>
						<div className="text-lg font-bold text-white/60">
							Zagraj rundę, żeby zdobyć nowe jajka!
						</div>
						<BigButton onClick={leave} variant="secondary">
							Do domku 🏠
						</BigButton>
					</>
				)}
			</div>
		</div>
	)
}
