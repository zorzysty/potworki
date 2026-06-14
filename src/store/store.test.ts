/// <reference types="bun-types" />
import { beforeEach, describe, expect, test } from "bun:test"
import { ISKIERKI_FOR_DUP } from "../game/rewards"
import { FIRST_MONSTER_ID, IDS_BY_RARITY, rarityOf } from "../monsters/catalog"
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
		// iskierki = 1 iff finalQuality === "rainbow"
		expect(s.iskierki).toBe(s.round?.finalQuality === "rainbow" ? 1 : 0)
	})

	test("po jednej poprawnej odpowiedzi eggFragments === 1, stats.attempts === 1", () => {
		game().startRound()
		answer(true)
		const s = game()
		expect(s.eggFragments).toBe(1)
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
	})
})

// ---------------------------------------------------------------------------
// Krok 4: Gwarancje wyklucia, ekonomia życzeń, nawigacja
// ---------------------------------------------------------------------------

describe("hatchEgg — gwarancje", () => {
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
