/// <reference types="bun-types" />
import { beforeEach, describe, expect, test } from "bun:test"
import { ACHIEVEMENTS } from "../achievements/catalog"
import type { FactStats } from "../game/adaptive"
import { emptyStats, stageFacts, VISIT_BONUS } from "../game/adaptive"
import { COSMETICS } from "../game/cosmetics"
import { EXPEDITIONS_BY_ID } from "../game/expeditions"
import type { FactKey } from "../game/facts"
import { ISKIERKI_FOR_DUP, WISH_COST_NO_DREAM } from "../game/rewards"
import { BUILDINGS, DECORATIONS } from "../game/village"
import {
	DIVISION_ONLY_IDS,
	FIRST_MONSTER_ID,
	GAP_ONLY_IDS,
	IDS_BY_RARITY,
	rarityOf,
} from "../monsters/catalog"
import { mergePersisted, useGame, wishEggCost } from "./store"

const game = () => useGame.getState()

function answer(correct: boolean) {
	const round = game().round
	if (!round) throw new Error("brak rundy")
	const product = round.question.a * round.question.b
	const value = correct ? product : product + 1
	for (const digit of String(value)) game().pressDigit(Number(digit))
	// pressDigit auto-submits at full digit count; pressConfirm is idempotent on empty
	game().pressConfirm()
}

function requireRound() {
	const r = game().round
	if (!r) throw new Error("brak rundy")
	return r
}

// odpowiada na bieżące pytanie zgodnie z trybem rundy
// (mnożenie a×b / dzielenie a÷b / luka: brakujący czynnik b÷a)
function answerByMode(correct: boolean) {
	const round = game().round
	if (!round) throw new Error("brak rundy")
	const expected =
		round.mode === "div"
			? round.question.a / round.question.b
			: round.mode === "gap"
				? round.question.b / round.question.a
				: round.question.a * round.question.b
	const value = correct ? expected : expected + 1
	for (const digit of String(value)) game().pressDigit(Number(digit))
	game().pressConfirm()
}

beforeEach(() => game().debugReset())

// Testy ekonomii (iskierki za duplikaty/Jajko Życzeń) izolujemy od nagród za
// osiągnięcia — pre-odblokowanie wszystkich sprawia, że checkAchievements nic nie
// dosypuje. Osiągnięcia mają własne testy w sekcji „osiągnięcia".
function suppressAchievements() {
	const all: Record<string, { unlockedAt: number; seen: boolean }> = {}
	for (const a of ACHIEVEMENTS) all[a.id] = { unlockedAt: 0, seen: true }
	useGame.setState({ achievements: all })
}

// ---------------------------------------------------------------------------
// Krok 2: Szczęśliwa ścieżka rundy
// ---------------------------------------------------------------------------

describe("startRound", () => {
	test("ustawia ekran, total, index i fazę", () => {
		game().startRound()
		const s = game()
		expect(s.screen).toBe("round")
		expect(s.round?.total).toBe(10)
		expect(s.round?.index).toBe(0)
		expect(s.round?.phase).toBe("answering")
	})
})

describe("szczęśliwa ścieżka — 10 poprawnych odpowiedzi", () => {
	test("po 10 poprawnych: faza summary, 1 jajko, zera fragmentów", () => {
		suppressAchievements()
		game().startRound()
		for (let i = 0; i < 9; i++) {
			answer(true)
			expect(game().round?.phase).toBe("correct")
			game().nextQuestion()
		}
		// dziesiąte pytanie
		answer(true)
		expect(game().round?.phase).toBe("correct")
		game().nextQuestion()

		const s = game()
		expect(s.round?.phase).toBe("summary")
		// 10 poprawnych = 3 gwiazdki każda = 30
		expect(s.round?.stars).toBe(30)
		expect(s.totalRounds).toBe(1)
		// fragmentsForEgg(0) === 10, więc dokładnie jedno jajko
		expect(s.pendingEggs.length).toBe(1)
		expect(s.eggFragments).toBe(0)
		expect(s.eggsEarned).toBe(1)
		expect(s.round?.eggsCreated.length).toBe(1)
		// jakość jest jedną z czterech dozwolonych
		const q = s.pendingEggs[0]?.quality
		expect(["normal", "silver", "gold", "rainbow"]).toContain(q as string)
		// żołd: baza 1 + dobra runda 1 + perfekcja 1 + pierwsza runda dnia 1
		// (świeży zapis: lastPlayedDay === ""), pusta wioska (zamek 0) = 4
		expect(s.round?.wageEarned).toBe(4)
		// iskierki = żołd + iskierka za tęczowe jajko (właściwość jajka)
		expect(s.iskierki).toBe(
			4 + (s.pendingEggs[0]?.quality === "rainbow" ? 1 : 0),
		)
		// bank gwiazdek zeruje się przy domknięciu jajka
		expect(s.eggStarBank).toBe(0)
	})

	test("po jednej poprawnej odpowiedzi eggFragments === 1, stats.attempts === 1", () => {
		game().startRound()
		answer(true)
		const s = game()
		expect(s.eggFragments).toBe(1)
		// bank == round.stars dopóki pierwsze jajko się buduje (oba zbierają `gained`)
		expect(s.eggStarBank).toBe(s.round?.stars ?? -1)
		// sprawdzamy statystyki pytanego działania
		const key = s.round?.question.key
		if (!key) throw new Error("brak pytania")
		expect(s.facts[key]?.attempts).toBe(1)
	})
})

// ---------------------------------------------------------------------------
// Krok 3: Błędna odpowiedź, rytuał przepisania, kolejka, cap gwiazdek, max-12
// ---------------------------------------------------------------------------

describe("błędna odpowiedź", () => {
	test("rejestruje pomyłkę, dodaje fragment, faza wrong, kolejka", () => {
		game().startRound()
		const wrongKey = requireRound().question.key
		const wrongIndex = requireRound().index
		answer(false)
		const s = game()
		expect(s.round?.phase).toBe("wrong")
		expect(s.round?.answer).toBe("")
		expect(s.round?.total).toBe(11)
		expect(s.round?.requeues[wrongIndex + 3]).toBe(wrongKey)
		expect(s.eggFragments).toBe(1) // fragment przyznany mimo pomyłki
		expect(s.facts[wrongKey]?.attempts).toBe(1)
		expect(s.facts[wrongKey]?.mastery).toBe(0)
		expect(s.round?.shakeNonce).toBe(1)
	})

	test("błędne przepisanie — faza zostaje wrong, shakeNonce rośnie, stats bez zmian", () => {
		game().startRound()
		answer(false)
		const fragBefore = game().eggFragments
		const key = requireRound().question.key
		const attemptsBefore = game().facts[key]?.attempts ?? 0
		answer(false) // kolejna próba przepisania (zła)
		const s = game()
		expect(s.round?.phase).toBe("wrong")
		expect(s.round?.shakeNonce).toBe(2)
		expect(s.facts[requireRound().question.key]?.attempts).toBe(attemptsBefore)
		expect(s.eggFragments).toBe(fragBefore)
	})

	test("poprawne przepisanie → faza correct, lastStars === 0", () => {
		game().startRound()
		answer(false)
		answer(true) // przepisanie poprawne
		expect(game().round?.phase).toBe("correct")
		expect(game().round?.lastStars).toBe(0)
	})

	test("powtórka jest serwowana na właściwym indeksie", () => {
		game().startRound()
		const wrongKey = requireRound().question.key
		const wrongIndex = requireRound().index
		const requeueAt = wrongIndex + 3
		answer(false)
		answer(true) // przepisanie
		game().nextQuestion()

		// przejdź przez pytania aż do requeueAt
		while (requireRound().index < requeueAt) {
			answer(true)
			game().nextQuestion()
		}

		expect(game().round?.question.key).toBe(wrongKey)
		expect(game().round?.question.isRequeue).toBe(true)
	})

	test("cap gwiazdek na powtórcze pytanie — instant answer → lastStars === 1", () => {
		game().startRound()
		answer(false)
		answer(true) // przepisanie
		game().nextQuestion()

		// przejdź do powtórki (wrongIndex było 0)
		const requeueAt = 0 + 3
		while (requireRound().index < requeueAt) {
			answer(true)
			game().nextQuestion()
		}

		// powtórka — odpowiedź natychmiastowa (wysoki czas = niskie gwiazdki), ale cap 1
		expect(game().round?.question.isRequeue).toBe(true)
		answer(true)
		// nawet jeśli byłoby 3 gwiazdki za szybkość, powtórka jest capowana do 1
		expect(game().round?.lastStars).toBe(1)
	})

	test("powtórka nie generuje kolejnej powtórki", () => {
		game().startRound()
		answer(false)
		answer(true) // przepisanie
		game().nextQuestion()

		const requeueAt = 0 + 3
		while (requireRound().index < requeueAt) {
			answer(true)
			game().nextQuestion()
		}

		// jesteśmy na powtórce
		expect(game().round?.question.isRequeue).toBe(true)
		const totalBefore = requireRound().total
		answer(false) // błąd na powtórcze pytanie
		expect(game().round?.total).toBe(totalBefore) // total się nie zwiększa
		// brak nowych wpisów w kolejce dla tego indeksu
	})

	test("max 12 pytań w rundzie", () => {
		game().startRound()
		// robimy błędy na kolejnych pytaniach, total rośnie do max 12
		while (game().round?.phase !== "summary") {
			const r = requireRound()
			if (r.phase === "answering") {
				if (r.question.isRequeue) {
					answer(true)
				} else {
					answer(false) // prowokuj kolejki
				}
			} else if (r.phase === "wrong") {
				answer(true) // przepisz
			} else if (r.phase === "correct") {
				// sprawdź cap
				expect(game().round?.total).toBeLessThanOrEqual(12)
				game().nextQuestion()
			}
		}
		expect(game().round?.phase).toBe("summary")
	})

	test("wolna odpowiedź — lastStars === 0, fragment przyznany", () => {
		game().startRound()
		// cofnij zegar o 60 sekund
		const currentRound = requireRound()
		useGame.setState({
			round: { ...currentRound, startedAt: Date.now() - 60_000 },
		})
		answer(true)
		expect(game().round?.lastStars).toBe(0)
		expect(game().eggFragments).toBe(1)
		expect(game().eggStarBank).toBe(0) // wolna odpowiedź: fragment tak, gwiazdki nie
	})
})

// ---------------------------------------------------------------------------
// eggStarBank — gwiazdki budujące kolor jajka
// ---------------------------------------------------------------------------

describe("eggStarBank", () => {
	test("rośnie o zdobyte gwiazdki, równe round.stars dopóki jajko się nie domknie", () => {
		game().startRound()
		answer(true) // szybka → 3★
		expect(game().eggStarBank).toBeGreaterThan(0)
		expect(game().eggStarBank).toBe(game().round?.stars ?? -1)
		game().nextQuestion()
		answer(true)
		expect(game().eggStarBank).toBe(game().round?.stars ?? -1)
	})

	test("zeruje się przy domknięciu jajka (round.stars rośnie dalej)", () => {
		game().startRound()
		for (let i = 0; i < 10; i++) {
			answer(true)
			game().nextQuestion()
		}
		expect(game().eggsEarned).toBe(1)
		expect(game().eggStarBank).toBe(0)
		expect(game().round?.stars).toBe(30)
	})
})

// ---------------------------------------------------------------------------
// eggStarBank — akumulacja między rundami
// ---------------------------------------------------------------------------

describe("eggStarBank — akumulacja między rundami", () => {
	// gra pełną rundę 10 poprawnych odpowiedzi (każda szybka → 3★)
	const playCleanRound = () => {
		game().startRound()
		for (let i = 0; i < 10; i++) {
			answer(true)
			game().nextQuestion()
		}
	}

	test("drugie jajko (próg 14) zbiera gwiazdki przez granicę rund; bank nie zeruje się przedwcześnie", () => {
		// runda 1: 10 fragmentów = pierwsze jajko (fragmentsForEgg(0) = 10)
		playCleanRound()
		expect(game().eggsEarned).toBe(1)
		expect(game().eggFragments).toBe(0)
		expect(game().eggStarBank).toBe(0)
		expect(game().pendingEggs.length).toBe(1)

		// runda 2: 10 kolejnych fragmentów, ale próg drugiego jajka to
		// fragmentsForEgg(1) = 14 → żadne jajko się nie domyka; bank ROŚNIE
		// i przeżywa koniec rundy
		playCleanRound()
		expect(game().eggsEarned).toBe(1) // wciąż 1 — brak przedwczesnego jajka
		expect(game().eggFragments).toBe(10)
		expect(game().eggStarBank).toBe(30) // 10×3★ z rundy 2, nie wyzerowane

		// runda 3: 4 poprawne odpowiedzi domykają drugie jajko (10 + 4 = 14)
		game().startRound()
		for (let i = 0; i < 4; i++) {
			answer(true)
			game().nextQuestion()
		}
		expect(game().eggsEarned).toBe(2)
		expect(game().eggFragments).toBe(0)
		expect(game().eggStarBank).toBe(0) // wyzerowany przy domknięciu
		expect(game().pendingEggs.length).toBe(2)
	})
})

// ---------------------------------------------------------------------------
// Krok 4: Gwarancje wyklucia, ekonomia życzeń, nawigacja
// ---------------------------------------------------------------------------

describe("hatchEgg — gwarancje", () => {
	test("hatchEgg(index) wykluwa i usuwa właściwe jajko z gniazda", () => {
		game().debugAddEgg("normal")
		game().debugAddEgg("silver")
		game().debugAddEgg("gold")
		expect(game().pendingEggs.map((e) => e.quality)).toEqual([
			"normal",
			"silver",
			"gold",
		])
		game().hatchEgg(1) // wykluj środkowe (silver)
		expect(game().pendingEggs.map((e) => e.quality)).toEqual(["normal", "gold"])
	})

	test("pierwsza inkubacja zawsze daje FIRST_MONSTER_ID", () => {
		game().debugAddEgg("normal")
		game().hatchEgg()
		const lh = game().lastHatch
		expect(lh?.monsterId).toBe(FIRST_MONSTER_ID)
		expect(lh?.isNew).toBe(true)
		expect(game().ownedMonsters[0]).toBeDefined()
		expect(game().pendingEggs.length).toBe(0)
	})

	test("duplikat — iskierki rosną o właściwą wartość, owned count bez zmian", () => {
		suppressAchievements()
		// posiadamy wszystkie cztery rzadkości
		game().debugOwnRarity("common")
		game().debugOwnRarity("rare")
		game().debugOwnRarity("epic")
		game().debugOwnRarity("legendary")
		const ownedBefore = Object.keys(game().ownedMonsters).length
		game().debugAddEgg("normal")
		game().hatchEgg()
		const lh = game().lastHatch
		if (!lh) throw new Error("brak wyniku wyklucia")
		expect(lh.isNew).toBe(false)
		const rarity = rarityOf(lh.monsterId)
		expect(game().iskierki).toBe(ISKIERKI_FOR_DUP[rarity])
		expect(Object.keys(game().ownedMonsters).length).toBe(ownedBefore)
	})

	test("iskierki nie przekraczają 999 przy duplikacie", () => {
		suppressAchievements()
		game().debugOwnRarity("common")
		game().debugOwnRarity("rare")
		game().debugOwnRarity("epic")
		game().debugOwnRarity("legendary")
		game().debugAddIskierki(999)
		game().debugAddEgg("normal")
		game().hatchEgg()
		expect(game().iskierki).toBe(999)
	})

	test("wyklucie wymarzonego czyści dreamMonsterId", () => {
		// pusta kolekcja, wymarzone = 0 (FIRST_MONSTER_ID)
		game().setDreamMonster(FIRST_MONSTER_ID)
		game().debugAddEgg("normal")
		game().hatchEgg()
		const lh = game().lastHatch
		expect(lh?.isDream).toBe(true)
		expect(game().dreamMonsterId).toBeNull()
	})
})

describe("buyWishEgg — ekonomia", () => {
	test("za mało iskierek — brak efektu", () => {
		const legendaryId = IDS_BY_RARITY.legendary[0]
		if (legendaryId === undefined) throw new Error("brak legendarnych")
		game().setDreamMonster(legendaryId)
		// koszt wymarzonego legendarnego = 30
		game().debugAddIskierki(29)
		game().buyWishEgg()
		expect(game().iskierki).toBe(29)
		expect(game().pendingEggs.length).toBe(0)
	})

	test("dokładna kwota — odejmuje koszt, pcha jajko wish, screen hatch", () => {
		suppressAchievements()
		const legendaryId = IDS_BY_RARITY.legendary[0]
		if (legendaryId === undefined) throw new Error("brak legendarnych")
		game().setDreamMonster(legendaryId)
		game().debugAddIskierki(30)
		game().buyWishEgg()
		expect(game().iskierki).toBe(0)
		expect(game().pendingEggs.length).toBe(1)
		expect(game().pendingEggs[0]?.quality).toBe("wish")
		expect(game().screen).toBe("hatch")
	})

	test("wish egg hatches unowned dream", () => {
		const legendaryId = IDS_BY_RARITY.legendary[0]
		if (legendaryId === undefined) throw new Error("brak legendarnych")
		game().setDreamMonster(legendaryId)
		game().debugAddIskierki(30)
		game().buyWishEgg()
		game().hatchEgg()
		expect(game().lastHatch?.monsterId).toBe(legendaryId)
	})
})

// ---------------------------------------------------------------------------
// Tryb dzielenia
// ---------------------------------------------------------------------------

describe("tryb dzielenia", () => {
	test("startRound w trybie div: runda.mode === div, pytanie to (a*b)÷dzielnik", () => {
		game().setMode("div")
		game().startRound()
		const r = requireRound()
		expect(r.mode).toBe("div")
		// dzielna = iloczyn faktu, dzielnik dzieli ją bez reszty, iloraz 1..10
		const fact = r.question.key.split("x").map(Number)
		const product = (fact[0] as number) * (fact[1] as number)
		expect(r.question.a).toBe(product)
		expect([fact[0], fact[1]]).toContain(r.question.b)
		const quotient = r.question.a / r.question.b
		expect(Number.isInteger(quotient)).toBe(true)
		expect(quotient).toBeGreaterThanOrEqual(1)
		expect(quotient).toBeLessThanOrEqual(10)
	})

	test("poprawna odpowiedź dzielenia: faza correct, fragment, mastery rośnie", () => {
		game().setMode("div")
		game().startRound()
		const key = requireRound().question.key
		answerByMode(true)
		const s = game()
		expect(s.round?.phase).toBe("correct")
		expect(s.eggFragments).toBe(1)
		expect(s.facts[key]?.attempts).toBe(1)
		expect((s.facts[key]?.mastery ?? 0) > 0).toBe(true)
	})

	test("jajko zdobyte w dzieleniu ma mode 'div'", () => {
		game().setMode("div")
		game().startRound()
		// 10 poprawnych = pierwsze jajko (próg fragmentsForEgg(0)=10)
		for (let i = 0; i < 10; i++) {
			answerByMode(true)
			game().nextQuestion()
		}
		const s = game()
		expect(s.pendingEggs.length).toBe(1)
		expect(s.pendingEggs[0]?.mode).toBe("div")
	})

	test("debugReset wraca do trybu mnożenia", () => {
		game().setMode("div")
		game().debugReset()
		expect(game().mode).toBe("mult")
	})

	test("pierwsza runda po odblokowaniu: 5/10 działań z nową cyfrą, w dzieleniu cyfra jest dzielnikiem", () => {
		game().debugOpenGate() // unlockedStage 0→1, nowa cyfra = 3, wszystkie 3-działania attempts 0
		expect(game().unlockedStage).toBe(1)
		game().setMode("div")
		game().startRound()
		expect(game().round?.introFactor).toBe(3)

		const keys: string[] = []
		for (let i = 0; i < 10; i++) {
			const q = requireRound().question
			keys.push(q.key)
			// w dzieleniu: pytanie z cyfrą 3 musi mieć 3 jako dzielnik (3 w działaniu, nie w wyniku)
			if (q.key.split("x").map(Number).includes(3)) {
				expect(q.b).toBe(3)
				// iloraz to drugi czynnik (nie 3), poza kwadratem 3×3 gdzie 9÷3=3
				if (q.key !== "3x3") expect(q.a / q.b).not.toBe(3)
			}
			answerByMode(true)
			game().nextQuestion()
		}
		const withThree = keys.filter((k) => k.split("x").map(Number).includes(3))
		expect(withThree.length).toBe(5)
		expect(keys.length).toBe(10)
		// wszystkie 10 pytań bazowych różne (plan bez powtórzeń)
		expect(new Set(keys).size).toBe(10)
	})

	test("zwykła runda (nie pierwsza po odblokowaniu) nie ma planu ani introFactor", () => {
		game().startRound() // stage 0 → nie intro
		expect(game().round?.introFactor).toBeNull()
		expect(game().round?.plan).toBeNull()
	})

	test("jajko mnożeniowe nigdy nie wykluwa legendarnego tylko-dzielenie", () => {
		// posiadamy wszystko oprócz legendarnych → losowanie legendarnego tieru
		// w trybie mnożenia musi trafić tylko w oryginalne (45,46,47,71)
		game().debugOwnRarity("common")
		game().debugOwnRarity("rare")
		game().debugOwnRarity("epic")
		// wymarzony = legendarny tylko-dzielenie (id 72) — w trybie mult nie ma priorytetu
		game().setDreamMonster(72)
		for (let i = 0; i < 200; i++) {
			game().debugAddEgg("rainbow") // mode = mult (domyślny)
			game().hatchEgg()
			const id = game().lastHatch?.monsterId
			if (id !== undefined) expect(DIVISION_ONLY_IDS.has(id)).toBe(false)
		}
	})

	test("jajko z dzielenia MOŻE wykluć legendarnego tylko-dzielenie (osiągalność nagrody)", () => {
		// posiadamy wszystko OPRÓCZ 4 legendarnych tylko-dzielenie (72–75):
		// common+rare+epic + oryginalne legendarne 45,46,47,71. Każde NOWE
		// wyklucie z jajka div musi więc być jednym z tylko-dzielenie.
		game().debugOwnRarity("common")
		game().debugOwnRarity("rare")
		game().debugOwnRarity("epic")
		const owned = { ...game().ownedMonsters }
		for (const id of [45, 46, 47, 71]) owned[id] = { hatchedAt: 0 }
		useGame.setState({ ownedMonsters: owned })

		game().setMode("div") // debugAddEgg ostempluje jajka mode = "div"

		let newCount = 0
		for (let i = 0; i < 300; i++) {
			game().debugAddEgg("rainbow") // 15% szans na legendarnego
			game().hatchEgg()
			const lh = game().lastHatch
			if (lh?.isNew) {
				newCount++
				expect(DIVISION_ONLY_IDS.has(lh.monsterId)).toBe(true)
			}
		}
		// invariant powyżej trzyma się zawsze; ten assert potwierdza osiągalność.
		// 300 tęczowych jajek × 15% legendary ⇒ trafienie praktycznie pewne
		// (P(0) ≈ 0.85^300 ≈ 10⁻²¹).
		expect(newCount).toBeGreaterThan(0)
	})
})

// ---------------------------------------------------------------------------
// Tryb luki (brakujący czynnik: 7 × _ = 42) — lustro „trybu dzielenia"
// ---------------------------------------------------------------------------

describe("tryb luki", () => {
	test("startRound w trybie gap: runda.mode === gap, pytanie to znany×_=iloczyn", () => {
		game().setMode("gap")
		game().startRound()
		const r = requireRound()
		expect(r.mode).toBe("gap")
		// b = iloczyn faktu, a = jeden z czynników, brakujący czynnik 1..10
		const fact = r.question.key.split("x").map(Number)
		const product = (fact[0] as number) * (fact[1] as number)
		expect(r.question.b).toBe(product)
		expect([fact[0], fact[1]]).toContain(r.question.a)
		const missing = r.question.b / r.question.a
		expect(Number.isInteger(missing)).toBe(true)
		expect(missing).toBeGreaterThanOrEqual(1)
		expect(missing).toBeLessThanOrEqual(10)
	})

	test("poprawna odpowiedź luki: faza correct, fragment, mastery WSPÓLNEGO faktu rośnie", () => {
		game().setMode("gap")
		game().startRound()
		const key = requireRound().question.key
		answerByMode(true)
		const s = game()
		expect(s.round?.phase).toBe("correct")
		expect(s.eggFragments).toBe(1)
		expect(s.facts[key]?.attempts).toBe(1)
		expect((s.facts[key]?.mastery ?? 0) > 0).toBe(true)
	})

	test("jajko zdobyte w luce ma mode 'gap'", () => {
		game().setMode("gap")
		game().startRound()
		// 10 poprawnych = pierwsze jajko (próg fragmentsForEgg(0)=10)
		for (let i = 0; i < 10; i++) {
			answerByMode(true)
			game().nextQuestion()
		}
		const s = game()
		expect(s.pendingEggs.length).toBe(1)
		expect(s.pendingEggs[0]?.mode).toBe("gap")
	})

	test("debugReset wraca do trybu mnożenia (z gap)", () => {
		game().setMode("gap")
		game().debugReset()
		expect(game().mode).toBe("mult")
	})

	test("pierwsza runda po odblokowaniu: 5/10 działań z nową cyfrą, w luce cyfra jest ZNANYM czynnikiem", () => {
		game().debugOpenGate() // unlockedStage 0→1, nowa cyfra = 3
		expect(game().unlockedStage).toBe(1)
		game().setMode("gap")
		game().startRound()
		expect(game().round?.introFactor).toBe(3)

		const keys: string[] = []
		for (let i = 0; i < 10; i++) {
			const q = requireRound().question
			keys.push(q.key)
			// w luce: pytanie z cyfrą 3 musi mieć 3 jako ZNANY czynnik (3 × _ = iloczyn)
			if (q.key.split("x").map(Number).includes(3)) {
				expect(q.a).toBe(3)
				// brakujący czynnik to drugi czynnik (nie 3), poza kwadratem 3×3
				if (q.key !== "3x3") expect(q.b / q.a).not.toBe(3)
			}
			answerByMode(true)
			game().nextQuestion()
		}
		const withThree = keys.filter((k) => k.split("x").map(Number).includes(3))
		expect(withThree.length).toBe(5)
		expect(keys.length).toBe(10)
		expect(new Set(keys).size).toBe(10)
	})

	test("jajko z luki nigdy nie wykluwa legendarnego tylko-dzielenie", () => {
		// posiadamy wszystko oprócz legendarnych → losowanie legendarnego tieru
		// z jajka gap nie może trafić w tylko-dzielenie (72–75)
		game().debugOwnRarity("common")
		game().debugOwnRarity("rare")
		game().debugOwnRarity("epic")
		game().setMode("gap") // debugAddEgg ostempluje jajka mode = "gap"
		for (let i = 0; i < 200; i++) {
			game().debugAddEgg("rainbow")
			game().hatchEgg()
			const id = game().lastHatch?.monsterId
			if (id !== undefined) expect(DIVISION_ONLY_IDS.has(id)).toBe(false)
		}
	})

	test("wymarzony tylko-dzielenie NIE przecieka do jajka gap (regresja guardu dreamu)", () => {
		// posiadamy wszystko OPRÓCZ tylko-dzielenie; dream = 72 (div-only).
		// Bez pool-membership w rollContext dream miałby priorytet w tierze
		// legendary i jajko gap wykluwałoby 72 — ten test jest siecią regresji.
		game().debugOwnRarity("common")
		game().debugOwnRarity("rare")
		game().debugOwnRarity("epic")
		const owned = { ...game().ownedMonsters }
		for (const id of [45, 46, 47, 71]) owned[id] = { hatchedAt: 0 }
		useGame.setState({ ownedMonsters: owned })
		game().setDreamMonster(72)
		game().setMode("gap")
		for (let i = 0; i < 200; i++) {
			game().debugAddEgg("rainbow")
			game().hatchEgg()
			const id = game().lastHatch?.monsterId
			if (id !== undefined) expect(DIVISION_ONLY_IDS.has(id)).toBe(false)
		}
	})

	test("jajko z luki MOŻE wykluć legendarnego tylko-luka (osiągalność nagrody)", () => {
		// posiadamy wszystko OPRÓCZ 4 legendarnych tylko-luka (76–79):
		// common+rare+epic + legendarne bazowe i tylko-dzielenie. Każde NOWE
		// wyklucie z jajka gap musi więc być jednym z tylko-luka.
		game().debugOwnRarity("common")
		game().debugOwnRarity("rare")
		game().debugOwnRarity("epic")
		const owned = { ...game().ownedMonsters }
		for (const id of [45, 46, 47, 71, 72, 73, 74, 75])
			owned[id] = { hatchedAt: 0 }
		useGame.setState({ ownedMonsters: owned })

		game().setMode("gap") // debugAddEgg ostempluje jajka mode = "gap"

		let newCount = 0
		for (let i = 0; i < 300; i++) {
			game().debugAddEgg("rainbow") // 15% szans na legendarnego
			game().hatchEgg()
			const lh = game().lastHatch
			if (lh?.isNew) {
				newCount++
				expect(GAP_ONLY_IDS.has(lh.monsterId)).toBe(true)
			}
		}
		// 300 tęczowych × 15% legendary ⇒ trafienie praktycznie pewne (P(0)≈10⁻²¹)
		expect(newCount).toBeGreaterThan(0)
	})

	test("wymarzony tylko-luka nie podbija ceny Jajka Życzeń (liczony jak bez dreamu)", () => {
		// jajko życzeń losuje z puli mnożeniowej → tylko-luka go nie dotyczy
		game().setDreamMonster(76)
		const { dreamMonsterId, ownedMonsters } = game()
		expect(wishEggCost({ dreamMonsterId, ownedMonsters })).toBe(
			WISH_COST_NO_DREAM,
		)
	})

	test("jajka mult i div NIGDY nie wykluwają tylko-luka", () => {
		game().debugOwnRarity("common")
		game().debugOwnRarity("rare")
		game().debugOwnRarity("epic")
		for (const eggMode of ["mult", "div"] as const) {
			game().setMode(eggMode)
			for (let i = 0; i < 200; i++) {
				game().debugAddEgg("rainbow")
				game().hatchEgg()
				const id = game().lastHatch?.monsterId
				if (id !== undefined) expect(GAP_ONLY_IDS.has(id)).toBe(false)
			}
		}
	})
})

describe("nawigacja", () => {
	test("exitRoundEarly — round null, screen home, fragments/totalRounds zachowane", () => {
		game().startRound()
		answer(true)
		expect(game().eggFragments).toBe(1)
		game().exitRoundEarly()
		expect(game().round).toBeNull()
		expect(game().screen).toBe("home")
		expect(game().eggFragments).toBe(1)
		expect(game().totalRounds).toBe(0)
	})

	test("goTo collection mid-round — round null", () => {
		game().startRound()
		game().goTo("collection")
		expect(game().round).toBeNull()
	})
})

// ---------------------------------------------------------------------------
// Przyjaciel (ulubiony kompan)
// ---------------------------------------------------------------------------

describe("przyjaciel", () => {
	test("setCompanion ustawia i zeruje companionId", () => {
		expect(game().companionId).toBeNull()
		game().setCompanion(FIRST_MONSTER_ID)
		expect(game().companionId).toBe(FIRST_MONSTER_ID)
		game().setCompanion(null)
		expect(game().companionId).toBeNull()
	})

	test("companionId jest niezależny od dreamMonsterId", () => {
		game().setDreamMonster(5)
		game().setCompanion(FIRST_MONSTER_ID)
		expect(game().dreamMonsterId).toBe(5)
		expect(game().companionId).toBe(FIRST_MONSTER_ID)
	})

	test("debugReset czyści companionId", () => {
		game().setCompanion(FIRST_MONSTER_ID)
		game().debugReset()
		expect(game().companionId).toBeNull()
	})
})

// ---------------------------------------------------------------------------
// Osiągnięcia
// ---------------------------------------------------------------------------

describe("osiągnięcia", () => {
	test("perfekcyjna runda 30/30 → perfectRounds++ i 'bez-pomylki' zdobyte + iskierki", () => {
		game().startRound()
		for (let i = 0; i < 9; i++) {
			answer(true)
			game().nextQuestion()
		}
		answer(true)
		game().nextQuestion()

		const s = game()
		expect(s.round?.stars).toBe(30)
		expect(s.achievementStats.perfectRounds).toBe(1)
		expect(s.achievements["bez-pomylki"]).toBeDefined()
		expect(s.achievements["bez-pomylki"]?.seen).toBe(false)
		// zdobyte zawsze: pierwsza-runda(5) + pierwsze-jajko(5) + bez-pomylki(5) = 15
		// (+1 tylko jeśli wylosowane jajko jest tęczowe)
		expect(s.achievements["pierwsza-runda"]).toBeDefined()
		expect(s.iskierki).toBeGreaterThanOrEqual(15)
	})

	test("poprawna odpowiedź w dzieleniu → divCorrect++ i 'pierwsze-dzielenie'", () => {
		game().setMode("div")
		game().startRound()
		answerByMode(true)
		const s = game()
		expect(s.achievementStats.divCorrect).toBe(1)
		expect(s.achievements["pierwsze-dzielenie"]).toBeDefined()
	})

	test("poprawna odpowiedź w luce → gapCorrect++ i 'pierwsza-luka' (divCorrect stoi)", () => {
		game().setMode("gap")
		game().startRound()
		answerByMode(true)
		const s = game()
		expect(s.achievementStats.gapCorrect).toBe(1)
		expect(s.achievementStats.divCorrect).toBe(0)
		expect(s.achievements["pierwsza-luka"]).toBeDefined()
	})

	test("wyklucie tęczowego jajka → rainbowEggsHatched++ i 'teczowe-jajko'", () => {
		game().debugAddEgg("rainbow")
		game().hatchEgg(0)
		const s = game()
		expect(s.achievementStats.rainbowEggsHatched).toBe(1)
		expect(s.achievements["teczowe-jajko"]).toBeDefined()
	})

	test("checkAchievements jest idempotentne (brak podwójnej nagrody)", () => {
		game().startRound()
		for (let i = 0; i < 9; i++) {
			answer(true)
			game().nextQuestion()
		}
		answer(true)
		game().nextQuestion()
		const iskierki = game().iskierki
		const count = Object.keys(game().achievements).length
		game().checkAchievements()
		expect(game().iskierki).toBe(iskierki)
		expect(Object.keys(game().achievements).length).toBe(count)
	})

	test("reconcileAchievements: odblokowuje zasłużone po cichu (seen:true) + iskierki", () => {
		// ustawiamy stan z pominięciem checkAchievements (bezpośredni setState)
		useGame.setState({ totalRounds: 1, achievements: {} })
		game().reconcileAchievements()
		const s = game()
		expect(s.achievements["pierwsza-runda"]).toBeDefined()
		expect(s.achievements["pierwsza-runda"]?.seen).toBe(true)
		expect(s.iskierki).toBeGreaterThanOrEqual(5)
	})

	test("checkAchievements wrzuca zdobyte do kolejki toastów; shift je zdejmuje", () => {
		game().debugOwnRarity("common") // odblokowuje kilka osiągnięć (seen:false)
		const q = game().achievementQueue
		expect(q.length).toBeGreaterThan(0)
		expect(q).toContain("pierwszy-potwor")
		const len = q.length
		game().shiftAchievementToast()
		expect(game().achievementQueue.length).toBe(len - 1)
	})

	test("reconcileAchievements NIE wrzuca do kolejki toastów (ciche)", () => {
		useGame.setState({ totalRounds: 1, achievements: {}, achievementQueue: [] })
		game().reconcileAchievements()
		expect(game().achievements["pierwsza-runda"]).toBeDefined()
		expect(game().achievementQueue).toEqual([])
	})

	test("markAchievementsSeen czyści flagę 'nowe'", () => {
		game().debugOwnRarity("common") // odblokowuje kolekcja-5 itd. z seen:false
		expect(Object.values(game().achievements).some((a) => !a.seen)).toBe(true)
		game().markAchievementsSeen()
		expect(Object.values(game().achievements).every((a) => a.seen)).toBe(true)
	})

	const playCleanRound = () => {
		game().startRound()
		for (let i = 0; i < 10; i++) {
			answer(true)
			game().nextQuestion()
		}
	}

	test("daysPlayed: pierwsza runda dnia podbija licznik, druga tego samego dnia nie", () => {
		playCleanRound()
		expect(game().achievementStats.daysPlayed).toBe(1)
		expect(game().achievementStats.lastPlayedDay).not.toBe("")
		playCleanRound()
		expect(game().achievementStats.daysPlayed).toBe(1) // ten sam dzień — bez zmian
	})

	test("'dni-grania' odblokowuje się przy 7. różnym dniu gry", () => {
		// 6 dni zaliczonych w przeszłości (lastPlayedDay z innego dnia niż dziś)
		useGame.setState({
			achievementStats: {
				...game().achievementStats,
				daysPlayed: 6,
				lastPlayedDay: "2000-1-1",
			},
		})
		playCleanRound() // runda dziś = 7. różny dzień
		expect(game().achievementStats.daysPlayed).toBe(7)
		expect(game().achievements["dni-grania"]).toBeDefined()
	})

	test("merge backfilluje brakujące liczniki w achievementStats (anti-NaN)", () => {
		const current = useGame.getState() // pełny achievementStats z INITIAL_SAVE
		// zapis bez daysPlayed/lastPlayedDay (np. ostemplowany nową wersją w dev-HMR)
		const persisted = {
			iskierki: 5,
			achievementStats: {
				perfectRounds: 1,
				divCorrect: 2,
				totalStars: 3,
				rainbowEggsHatched: 0,
				wishEggsBought: 0,
			},
		}
		const merged = mergePersisted(persisted, current)
		expect(merged.iskierki).toBe(5) // top-level z utrwalonego
		expect(merged.achievementStats.perfectRounds).toBe(1) // licznik utrwalony zachowany
		expect(merged.achievementStats.daysPlayed).toBe(0) // brak → backfill z INITIAL, nie NaN
		expect(merged.achievementStats.lastPlayedDay).toBe("")
		expect(Number.isNaN(merged.achievementStats.daysPlayed)).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// Wioska budowniczych: budowa/ulepszanie, cel, dekoracje, żołd za rundę
// ---------------------------------------------------------------------------

describe("wioska budowniczych", () => {
	const playCleanRound = () => {
		game().startRound()
		for (let i = 0; i < 10; i++) {
			answer(true)
			game().nextQuestion()
		}
	}
	const costOf = (id: string, level: number) =>
		(BUILDINGS.find((b) => b.id === id) as (typeof BUILDINGS)[number]).costs[
			level
		] as number

	test("buildVillage: kupno L1 odejmuje koszt; brak środków = ciche no-op", () => {
		suppressAchievements()
		useGame.setState({ iskierki: costOf("ogrodek", 0) })
		game().buildVillage("ogrodek")
		expect(game().village.buildings.ogrodek).toBe(1)
		expect(game().iskierki).toBe(0)
		// L2 kosztuje więcej niż 0 → no-op, poziom bez zmian
		game().buildVillage("ogrodek")
		expect(game().village.buildings.ogrodek).toBe(1)
		expect(game().iskierki).toBe(0)
	})

	test("buildVillage: ulepszenie L1→L2 odejmuje koszt L2", () => {
		suppressAchievements()
		useGame.setState({
			iskierki: costOf("ogrodek", 1),
			village: { buildings: { ogrodek: 1 }, decorations: [], goalId: null },
		})
		game().buildVillage("ogrodek")
		expect(game().village.buildings.ogrodek).toBe(2)
		expect(game().iskierki).toBe(0)
	})

	test("buildVillage: maks poziom = no-op nawet z pełnym portfelem", () => {
		suppressAchievements()
		useGame.setState({
			iskierki: 999,
			village: { buildings: { ogrodek: 3 }, decorations: [], goalId: null },
		})
		game().buildVillage("ogrodek")
		expect(game().village.buildings.ogrodek).toBe(3)
		expect(game().iskierki).toBe(999)
	})

	test("cel: setVillageGoal ustawia; kupno celu go czyści, kupno innego nie", () => {
		suppressAchievements()
		game().setVillageGoal("zamek")
		expect(game().village.goalId).toBe("zamek")
		useGame.setState({ iskierki: costOf("ogrodek", 0) })
		game().buildVillage("ogrodek") // inny budynek — cel zostaje
		expect(game().village.goalId).toBe("zamek")
		useGame.setState({ iskierki: costOf("zamek", 0) })
		game().buildVillage("zamek") // cel osiągnięty — czyści się
		expect(game().village.buildings.zamek).toBe(1)
		expect(game().village.goalId).toBeNull()
	})

	test("buyDecoration: kupuje raz, odejmuje koszt; drugi raz = no-op", () => {
		suppressAchievements()
		const kwiatki = DECORATIONS.find(
			(d) => d.id === "kwiatki",
		) as (typeof DECORATIONS)[number]
		useGame.setState({ iskierki: kwiatki.cost + 1 })
		game().buyDecoration("kwiatki")
		expect(game().village.decorations).toEqual(["kwiatki"])
		expect(game().iskierki).toBe(1)
		game().buyDecoration("kwiatki")
		expect(game().village.decorations).toEqual(["kwiatki"])
		expect(game().iskierki).toBe(1)
	})

	test("żołd: pierwsza runda dnia z bonusem, druga bez; zamek dodaje poziom", () => {
		suppressAchievements()
		// runda 1 (perfekcyjna, świeży zapis → pierwsza runda dnia):
		// 1 baza + 1 dobra + 1 perfekcja + 1 dzień = 4
		playCleanRound()
		expect(game().round?.wageEarned).toBe(4)
		// żołd + ewentualna iskierka za tęczowe pierwsze jajko
		const rainbowBonus = game().pendingEggs[0]?.quality === "rainbow" ? 1 : 0
		expect(game().iskierki).toBe(4 + rainbowBonus)

		// runda 2 tego samego dnia: bez bonusu dnia = 3
		const before = game().iskierki
		playCleanRound()
		expect(game().round?.wageEarned).toBe(3)
		expect(game().iskierki).toBe(before + 3)

		// zamek L3: +3 do żołdu (runda 3, ten sam dzień) = 6. W tej rundzie domyka
		// się drugie jajko (próg 14) — jego ewentualna tęcza dodaje 1 iskierkę.
		useGame.setState({
			village: { buildings: { zamek: 3 }, decorations: [], goalId: null },
		})
		const before3 = game().iskierki
		playCleanRound()
		expect(game().round?.wageEarned).toBe(6)
		const rainbow3 = game().pendingEggs[1]?.quality === "rainbow" ? 1 : 0
		expect(game().iskierki).toBe(before3 + 6 + rainbow3)
	})

	test("żołd: wyjście w trakcie rundy nie wypłaca (jak totalRounds)", () => {
		suppressAchievements()
		game().startRound()
		answer(true)
		game().exitRoundEarly()
		expect(game().iskierki).toBe(0)
		expect(game().totalRounds).toBe(0)
	})

	test("żołd respektuje cap portfela (999)", () => {
		suppressAchievements()
		useGame.setState({ iskierki: 998 })
		playCleanRound()
		expect(game().iskierki).toBe(999)
	})

	test("villageVisited: false na starcie, true po wejściu do wioski, reset zeruje", () => {
		expect(game().villageVisited).toBe(false)
		game().goTo("village")
		expect(game().villageVisited).toBe(true)
		game().goTo("home") // wyjście nie gasi flagi (sesyjna)
		expect(game().villageVisited).toBe(true)
		game().debugReset()
		expect(game().villageVisited).toBe(false)
	})

	test("debugBuildAll: pełna wioska bez wydawania iskierek", () => {
		useGame.setState({ iskierki: 7 })
		game().debugBuildAll()
		for (const b of BUILDINGS) expect(game().village.buildings[b.id]).toBe(3)
		expect(game().village.decorations.length).toBe(DECORATIONS.length)
		expect(game().iskierki).toBe(7)
	})

	test("merge backfilluje brakującą wioskę (anti-undefined po dev-HMR)", () => {
		const current = useGame.getState()
		const merged = mergePersisted({ iskierki: 5 }, current)
		expect(merged.village).toEqual({
			buildings: {},
			decorations: [],
			goalId: null,
		})
		expect(merged.iskierki).toBe(5)
	})
})

// ---------------------------------------------------------------------------
// Sklepik: kupno kosmetyki (tier lock, dedupe, fundusze) i garderoba (equip)
// ---------------------------------------------------------------------------

describe("sklepik — kosmetyka", () => {
	const tier1 = COSMETICS.find(
		(c) => c.tier === 1,
	) as (typeof COSMETICS)[number]
	const tier2 = COSMETICS.find(
		(c) => c.tier === 2,
	) as (typeof COSMETICS)[number]
	const villageWithSklepik = (level: number) => ({
		buildings: { sklepik: level },
		decorations: [],
		goalId: null,
	})

	test("buyCosmetic: tier-1 za dokładnie tyle iskierek → kupione, portfel 0", () => {
		suppressAchievements()
		useGame.setState({
			iskierki: tier1.cost,
			village: villageWithSklepik(1),
		})
		game().buyCosmetic(tier1.id)
		expect(game().cosmetics.owned).toEqual([tier1.id])
		expect(game().iskierki).toBe(0)
	})

	test("buyCosmetic: już kupiony → ciche no-op (nie płaci drugi raz)", () => {
		suppressAchievements()
		useGame.setState({
			iskierki: tier1.cost * 2,
			village: villageWithSklepik(1),
		})
		game().buyCosmetic(tier1.id)
		game().buyCosmetic(tier1.id)
		expect(game().cosmetics.owned).toEqual([tier1.id])
		expect(game().iskierki).toBe(tier1.cost)
	})

	test("buyCosmetic: tier 2 przy sklepiku L1 → no-op (blokada tieru)", () => {
		suppressAchievements()
		useGame.setState({ iskierki: 999, village: villageWithSklepik(1) })
		game().buyCosmetic(tier2.id)
		expect(game().cosmetics.owned).toEqual([])
		expect(game().iskierki).toBe(999)
	})

	test("buyCosmetic: sklepik niezbudowany (L0) → no-op nawet dla tier 1", () => {
		suppressAchievements()
		useGame.setState({ iskierki: 999 })
		game().buyCosmetic(tier1.id)
		expect(game().cosmetics.owned).toEqual([])
		expect(game().iskierki).toBe(999)
	})

	test("buyCosmetic: nieznane id / brak środków → no-op", () => {
		suppressAchievements()
		useGame.setState({
			iskierki: tier1.cost - 1,
			village: villageWithSklepik(3),
		})
		game().buyCosmetic("nie-ma-takiego")
		game().buyCosmetic(tier1.id) // za mało iskierek
		expect(game().cosmetics.owned).toEqual([])
		expect(game().iskierki).toBe(tier1.cost - 1)
	})

	test("equipCosmetic: kupiony kapelusz na posiadanym potworku; null zdejmuje", () => {
		suppressAchievements()
		useGame.setState({
			ownedMonsters: { [FIRST_MONSTER_ID]: { hatchedAt: 1 } },
			cosmetics: { owned: [tier1.id], equipped: {} },
		})
		game().equipCosmetic(FIRST_MONSTER_ID, "hat", tier1.id)
		expect(game().cosmetics.equipped[FIRST_MONSTER_ID]?.hat).toBe(tier1.id)
		game().equipCosmetic(FIRST_MONSTER_ID, "hat", null)
		expect(game().cosmetics.equipped[FIRST_MONSTER_ID]?.hat).toBeUndefined()
	})

	test("equipCosmetic: ramka (slot frame, plan 014) per potworek; null zdejmuje; A nie rusza B", () => {
		suppressAchievements()
		const frame = COSMETICS.find(
			(c) => c.slot === "frame",
		) as (typeof COSMETICS)[number]
		const monsterB = FIRST_MONSTER_ID + 1
		useGame.setState({
			ownedMonsters: {
				[FIRST_MONSTER_ID]: { hatchedAt: 1 },
				[monsterB]: { hatchedAt: 2 },
			},
			cosmetics: { owned: [frame.id], equipped: {} },
		})
		game().equipCosmetic(FIRST_MONSTER_ID, "frame", frame.id)
		expect(game().cosmetics.equipped[FIRST_MONSTER_ID]?.frame).toBe(frame.id)
		// założenie na A nie dotyka B (ramka jest per potworek)
		expect(game().cosmetics.equipped[monsterB]?.frame).toBeUndefined()
		game().equipCosmetic(FIRST_MONSTER_ID, "frame", null)
		expect(game().cosmetics.equipped[FIRST_MONSTER_ID]?.frame).toBeUndefined()
	})

	test("equipCosmetic: NIEKUPIONY przedmiot / NIEPOSIADANY potworek / zły slot → no-op", () => {
		suppressAchievements()
		useGame.setState({
			ownedMonsters: { [FIRST_MONSTER_ID]: { hatchedAt: 1 } },
			cosmetics: { owned: [tier1.id], equipped: {} },
		})
		// niekupiony przedmiot
		game().equipCosmetic(FIRST_MONSTER_ID, "hat", tier2.id)
		expect(game().cosmetics.equipped[FIRST_MONSTER_ID]).toBeUndefined()
		// nieposiadany potworek
		game().equipCosmetic(FIRST_MONSTER_ID + 1, "hat", tier1.id)
		expect(game().cosmetics.equipped[FIRST_MONSTER_ID + 1]).toBeUndefined()
		// slot niezgodny z przedmiotem (kapelusz do slotu aury)
		game().equipCosmetic(FIRST_MONSTER_ID, "aura", tier1.id)
		expect(game().cosmetics.equipped[FIRST_MONSTER_ID]).toBeUndefined()
	})

	test("equipCosmetic: nie mutuje poprzedniego stanu equipped (nowe obiekty)", () => {
		suppressAchievements()
		useGame.setState({
			ownedMonsters: { [FIRST_MONSTER_ID]: { hatchedAt: 1 } },
			cosmetics: { owned: [tier1.id], equipped: {} },
		})
		const before = game().cosmetics.equipped
		game().equipCosmetic(FIRST_MONSTER_ID, "hat", tier1.id)
		expect(before).toEqual({})
		expect(game().cosmetics.equipped).not.toBe(before)
	})

	test("merge backfilluje brakującą garderobę (anti-undefined po dev-HMR)", () => {
		const current = useGame.getState()
		const merged = mergePersisted({ iskierki: 5 }, current)
		expect(merged.cosmetics).toEqual({ owned: [], equipped: {} })
		expect(merged.iskierki).toBe(5)
	})
})

// ---------------------------------------------------------------------------
// Odwiedziny u Strażnika: runda-wizyta (plan, przypięty tryb, bonus przy finalizacji)
// ---------------------------------------------------------------------------

describe("odwiedziny u Strażnika (startVisitRound)", () => {
	// Podupadłe starsze tabliczki na etapie 2: baza (etap 0) najsłabsza (0.2),
	// ×3 (etap 1) mocniejsza (0.4) → zaproszenie wskazuje etap 0
	// (średnia starszych 4/15 ≈ 0.27 < MAINTAIN_THRESHOLD)
	function seedDecayedFacts() {
		const facts: Partial<Record<FactKey, FactStats>> = {}
		for (const f of stageFacts(0))
			facts[f.key] = { ...emptyStats(), attempts: 1, mastery: 0.2 }
		for (const f of stageFacts(1))
			facts[f.key] = { ...emptyStats(), attempts: 1, mastery: 0.4 }
		useGame.setState({ facts, unlockedStage: 2 })
	}

	const playVisitRoundClean = () => {
		game().startVisitRound()
		for (let i = 0; i < 10; i++) {
			answer(true)
			game().nextQuestion()
		}
	}

	test("startVisitRound: visitStage = najsłabszy etap, plan 10 kluczy, pierwsze pytanie z planu, introFactor null", () => {
		seedDecayedFacts()
		game().startVisitRound()
		const r = requireRound()
		expect(game().screen).toBe("round")
		expect(r.visitStage).toBe(0)
		expect(r.plan?.length).toBe(10)
		expect(r.question.key).toBe(r.plan?.[0] as FactKey)
		expect(r.introFactor).toBeNull()
	})

	test("tryb przypięty do mult: przełącznik ÷ nie zmienia rundy-wizyty, sam zostaje div", () => {
		seedDecayedFacts()
		game().setMode("div")
		game().startVisitRound()
		expect(game().round?.mode).toBe("mult")
		// efemeryczny przełącznik nietknięty — późniejsze zwykłe rundy dalej ÷
		expect(game().mode).toBe("div")
	})

	test("zwykły startRound: visitStage === null", () => {
		game().startRound()
		expect(game().round?.visitStage).toBeNull()
	})

	test("startVisitRound przy zdrowych tabliczkach = zwykła runda (visitStage null)", () => {
		// świeży zapis: etap 0, brak starszych tabliczek → defensywny fallback
		game().startVisitRound()
		expect(game().screen).toBe("round")
		expect(game().round?.visitStage).toBeNull()
	})

	test("finalizacja: czysta runda-wizyta płaci żołd + VISIT_BONUS (żołd osobno), pytania z planu", () => {
		suppressAchievements()
		seedDecayedFacts()
		game().startVisitRound()
		const plan = [...(requireRound().plan ?? [])]
		const asked: string[] = []
		for (let i = 0; i < 10; i++) {
			asked.push(requireRound().question.key)
			answer(true)
			game().nextQuestion()
		}
		// pytania bazowe konsumują plan pozycyjnie
		expect(asked).toEqual(plan)
		const s = game()
		expect(s.round?.phase).toBe("summary")
		expect(s.round?.visitStage).toBe(0)
		// żołd zostaje czystym żołdem: 1 baza + 1 dobra + 1 perfekcja + 1 pierwszy
		// dzień (świeży zapis), zamek 0 = 4; bonus Strażnika osobno w iskierkach
		expect(s.round?.wageEarned).toBe(4)
		const rainbow = s.pendingEggs[0]?.quality === "rainbow" ? 1 : 0
		expect(s.iskierki).toBe(4 + VISIT_BONUS + rainbow)
	})

	test("zwykła runda nie płaci bonusu Strażnika (sam żołd)", () => {
		suppressAchievements()
		game().startRound()
		for (let i = 0; i < 10; i++) {
			answer(true)
			game().nextQuestion()
		}
		expect(game().round?.visitStage).toBeNull()
		expect(game().round?.wageEarned).toBe(4)
		const rainbow = game().pendingEggs[0]?.quality === "rainbow" ? 1 : 0
		expect(game().iskierki).toBe(4 + rainbow)
	})

	test("bonus Strażnika respektuje cap portfela (998 → 999)", () => {
		suppressAchievements()
		seedDecayedFacts()
		useGame.setState({ iskierki: 998 })
		playVisitRoundClean()
		expect(game().iskierki).toBe(999)
	})
})

// ---------------------------------------------------------------------------
// Wyprawy potworków: wysłanie/zawrócenie (guardy), rozstrzygnięcie po rundach,
// nagroda + cap, licznik, parytet debugFinishRound
// ---------------------------------------------------------------------------

describe("wyprawy potworków", () => {
	const playCleanRound = () => {
		game().startRound()
		for (let i = 0; i < 10; i++) {
			answer(true)
			game().nextQuestion()
		}
	}
	const ownSome = () =>
		useGame.setState({
			ownedMonsters: { 0: { hatchedAt: 0 }, 1: { hatchedAt: 1 } },
		})
	const zwiadReward = EXPEDITIONS_BY_ID.get("zwiad")?.rewardIskierki as number

	test("sendExpedition: ustawia stan z roundsAtStart === totalRounds", () => {
		suppressAchievements()
		ownSome()
		playCleanRound() // totalRounds = 1 → snapshot musi być z chwili wysłania
		game().sendExpedition(0, "zwiad")
		expect(game().expedition).toEqual({
			monsterId: 0,
			typeId: "zwiad",
			roundsAtStart: 1,
		})
	})

	test("sendExpedition: no-op gdy wyprawa już trwa (jedna naraz)", () => {
		ownSome()
		game().sendExpedition(0, "zwiad")
		game().sendExpedition(1, "wielka")
		expect(game().expedition?.monsterId).toBe(0)
		expect(game().expedition?.typeId).toBe("zwiad")
	})

	test("sendExpedition: no-op dla nieposiadanego potworka", () => {
		ownSome()
		game().sendExpedition(42, "zwiad")
		expect(game().expedition).toBeNull()
	})

	test("sendExpedition: no-op dla przyjaciela (zostaje w domu)", () => {
		ownSome()
		useGame.setState({ companionId: 0 })
		game().sendExpedition(0, "zwiad")
		expect(game().expedition).toBeNull()
		// inny posiadany potworek może iść
		game().sendExpedition(1, "zwiad")
		expect(game().expedition?.monsterId).toBe(1)
	})

	test("recallExpedition: czyści bez nagrody i bez kary; ponowne wysłanie działa od ręki", () => {
		suppressAchievements()
		ownSome()
		useGame.setState({ iskierki: 10 })
		game().sendExpedition(0, "zwiad")
		game().recallExpedition()
		expect(game().expedition).toBeNull()
		expect(game().iskierki).toBe(10)
		// bez cooldownu — misclick jest odwracalny w obie strony
		game().sendExpedition(0, "wyprawa")
		expect(game().expedition?.typeId).toBe("wyprawa")
	})

	test("rozstrzygnięcie: zwiad (3 rundy) wraca dokładnie po 3. ukończonej rundzie", () => {
		suppressAchievements()
		ownSome()
		game().sendExpedition(0, "zwiad")

		playCleanRound() // runda 1: żołd 4 (pierwsza dnia, perfekcja)
		expect(game().expedition).not.toBeNull()
		expect(game().round?.expeditionReturn).toBeNull()
		playCleanRound() // runda 2: żołd 3 — wciąż w drodze
		expect(game().expedition).not.toBeNull()
		expect(game().round?.expeditionReturn).toBeNull()

		playCleanRound() // runda 3: żołd 3 + powrót
		const s = game()
		expect(s.round?.expeditionReturn).toEqual({
			monsterId: 0,
			rewardIskierki: zwiadReward,
			tropMonsterId: null, // zwiad: tropChance 0
		})
		expect(s.expedition).toBeNull()
		expect(s.achievementStats.expeditionsCompleted).toBe(1)
		// portfel = żołdy (4+3+3) + nagroda wyprawy + ewentualne tęcze jajek
		// (jajko nr 1 domyka się w rundzie 1 przy score 30 → ~40% tęczy; jajko
		// nr 2, próg 14, domyka się w rundzie 3) — wzór testów żołdu
		const rainbow1 = s.pendingEggs[0]?.quality === "rainbow" ? 1 : 0
		const rainbow2 = s.pendingEggs[1]?.quality === "rainbow" ? 1 : 0
		expect(s.iskierki).toBe(4 + 3 + 3 + zwiadReward + rainbow1 + rainbow2)
	})

	test("nagroda powrotu respektuje cap portfela (998 → 999)", () => {
		suppressAchievements()
		ownSome()
		game().sendExpedition(0, "zwiad")
		playCleanRound()
		playCleanRound()
		useGame.setState({ iskierki: 998 })
		playCleanRound() // żołd 3 + nagroda 4 → i tak 999
		expect(game().round?.expeditionReturn).not.toBeNull()
		expect(game().iskierki).toBe(999)
	})

	test("debugFinishRound rozstrzyga powrót tak samo jak prawdziwa finalizacja", () => {
		suppressAchievements()
		ownSome()
		game().sendExpedition(0, "zwiad")
		playCleanRound()
		playCleanRound()
		game().startRound()
		game().debugFinishRound(30) // 3. ukończona runda
		const s = game()
		expect(s.round?.phase).toBe("summary")
		expect(s.round?.expeditionReturn?.monsterId).toBe(0)
		expect(s.round?.expeditionReturn?.rewardIskierki).toBe(zwiadReward)
		expect(s.expedition).toBeNull()
		expect(s.achievementStats.expeditionsCompleted).toBe(1)
	})

	test("debugSimulateRound rozstrzyga po cichu (licznik i nagroda bez rundy)", () => {
		suppressAchievements()
		ownSome()
		game().sendExpedition(0, "zwiad")
		const before = game().iskierki
		game().debugSimulateRound(30)
		game().debugSimulateRound(30)
		expect(game().expedition).not.toBeNull()
		game().debugSimulateRound(30)
		const s = game()
		expect(s.expedition).toBeNull()
		expect(s.achievementStats.expeditionsCompleted).toBe(1)
		expect(s.round).toBeNull()
		// portfel urósł co najmniej o nagrodę wyprawy (plus żołdy/tęcze symulacji)
		expect(s.iskierki).toBeGreaterThanOrEqual(before + zwiadReward)
	})

	test("debugReset czyści wyprawę (spread INITIAL_SAVE)", () => {
		ownSome()
		game().sendExpedition(0, "wielka")
		expect(game().expedition).not.toBeNull()
		game().debugReset()
		expect(game().expedition).toBeNull()
		expect(game().achievementStats.expeditionsCompleted).toBe(0)
	})
})
