/// <reference types="bun-types" />
import { beforeEach, describe, expect, test } from "bun:test"
import { ISKIERKI_FOR_DUP } from "../game/rewards"
import {
	DIVISION_ONLY_IDS,
	FIRST_MONSTER_ID,
	IDS_BY_RARITY,
	rarityOf,
} from "../monsters/catalog"
import { useGame } from "./store"

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

// odpowiada na bieżące pytanie zgodnie z trybem rundy (mnożenie a×b / dzielenie a÷b)
function answerByMode(correct: boolean) {
	const round = game().round
	if (!round) throw new Error("brak rundy")
	const expected =
		round.mode === "div"
			? round.question.a / round.question.b
			: round.question.a * round.question.b
	const value = correct ? expected : expected + 1
	for (const digit of String(value)) game().pressDigit(Number(digit))
	game().pressConfirm()
}

beforeEach(() => game().debugReset())

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
		// iskierka za tęczowe jajko — teraz właściwość jajka, nie rundy
		expect(s.iskierki).toBe(s.pendingEggs[0]?.quality === "rainbow" ? 1 : 0)
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

	test("iskierki nie przekraczają 99 przy duplikacie", () => {
		game().debugOwnRarity("common")
		game().debugOwnRarity("rare")
		game().debugOwnRarity("epic")
		game().debugOwnRarity("legendary")
		game().debugAddIskierki(99)
		game().debugAddEgg("normal")
		game().hatchEgg()
		expect(game().iskierki).toBe(99)
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
