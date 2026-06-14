import confetti from "canvas-confetti"
import { useEffect, useState } from "react"
import { BigButton } from "../components/BigButton"
import { EGG_LABELS, EggView } from "../components/EggView"
import { RARITY_META } from "../components/rarity"
import { MONSTER_COUNT, MONSTERS } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame } from "../store/store"

export function HatchScreen() {
  const pendingEggs = useGame(s => s.pendingEggs)
  const lastHatch = useGame(s => s.lastHatch)
  const hatchEgg = useGame(s => s.hatchEgg)
  const clearLastHatch = useGame(s => s.clearLastHatch)
  const goTo = useGame(s => s.goTo)
  const [cracks, setCracks] = useState(0)
  const [wobbleNonce, setWobbleNonce] = useState(0)

  const [selectedIndex, setSelectedIndex] = useState(0)

  const ownedCount = useGame(s => Object.keys(s.ownedMonsters).length)
  // indeks może się zdezaktualizować po wykluciu (lista się skraca) — przytnij do zakresu
  const safeIndex = Math.min(selectedIndex, Math.max(0, pendingEggs.length - 1))
  const egg = pendingEggs[safeIndex]
  const monster = lastHatch ? MONSTERS[lastHatch.monsterId] : undefined
  const collectionComplete = lastHatch?.isNew === true && ownedCount === MONSTER_COUNT

  const selectEgg = (i: number) => {
    setSelectedIndex(i)
    setCracks(0)
    setWobbleNonce(0)
  }

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
      setCracks(c => c + 1)
      setWobbleNonce(n => n + 1)
    }
  }

  const leave = () => {
    clearLastHatch()
    goTo("home")
  }

  return (
    <div className="flex min-h-dvh flex-col items-center p-5">
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

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        {monster && lastHatch ? (
          <>
            {lastHatch.isNew && (
              <div className="anim-pop rounded-full bg-gradient-to-r from-bubblegum to-orange-400 px-6 py-2 text-2xl font-extrabold text-white shadow-lg">
                {lastHatch.isDream ? "WYMARZONY POTWOREK! 💖" : "NOWY POTWOREK! ✨"}
              </div>
            )}
            {collectionComplete && (
              <div className="anim-pop rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-2 text-2xl font-extrabold text-white shadow-lg">
                🏆 MISTRZYNI KOLEKCJI! 🏆
              </div>
            )}
            <div
              className={`anim-pop-in rounded-[2.5rem] bg-white/95 p-6 shadow-2xl ${lastHatch.isDream ? "ring-8 ring-amber-300" : ""
                }`}
            >
              <MonsterSvg id={lastHatch.monsterId} size={210} />
            </div>
            <div className="text-4xl font-extrabold text-white">{monster.name}</div>
            <div
              className={`rounded-full px-4 py-1 text-lg font-extrabold ${RARITY_META[monster.rarity].badge}`}
            >
              {RARITY_META[monster.rarity].label}
            </div>
            {!lastHatch.isNew && (
              <div className="anim-fade-up text-xl font-extrabold text-amber-300">
                Już go masz! Zamienia się w ✨ +{lastHatch.iskierkiGained}{" "}
                {lastHatch.iskierkiGained === 1 ? "iskierkę" : "iskierki"}
              </div>
            )}
            <div className="flex flex-col gap-3 pt-2">
              {pendingEggs.length > 0 ? (
                <BigButton onClick={clearLastHatch} className="px-10 py-5 text-3xl">
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
            {pendingEggs.length > 1 && (
              <div className="flex w-full flex-col items-center gap-2">
                <div className="text-lg font-extrabold text-white/80">
                  Jajka w gnieździe
                </div>
                <div className="flex max-w-full gap-2 overflow-x-auto px-2 py-1">
                  {pendingEggs.map((e, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectEgg(i)}
                      className={`shrink-0 touch-manipulation rounded-2xl p-1.5 transition active:scale-90 ${i === safeIndex ? "bg-white/30 ring-4 ring-white" : "bg-white/5"
                        }`}
                      aria-label={`Wybierz: ${EGG_LABELS[e.quality]}`}
                    >
                      <EggView quality={e.quality} size={56} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="text-2xl font-extrabold text-white/90">{EGG_LABELS[egg.quality]}</div>
            <button
              type="button"
              onClick={tapEgg}
              className="touch-manipulation active:scale-95"
              aria-label="Tapnij jajko"
            >
              <div key={wobbleNonce} className={wobbleNonce > 0 ? "anim-wobble" : "anim-float"}>
                <EggView quality={egg.quality} cracks={cracks} size={190} />
              </div>
            </button>
            <div className="anim-bounce-slow text-xl font-extrabold text-white/80">
              👆 Tapnij jajko {3 - cracks} {3 - cracks === 1 ? "raz" : "razy"}!
            </div>
          </>
        ) : (
          <>
            <div className="text-7xl">🪺</div>
            <div className="text-2xl font-extrabold text-white/90">Gniazdo jest puste</div>
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
