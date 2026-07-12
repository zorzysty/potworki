import type { SaveState } from "../store/schema"
import {
	applyAnswer,
	emptyStats,
	pickNextFact,
	shouldUnlockNextStage,
} from "./adaptive"
import type { Fact, FactKey, GameMode } from "./facts"
import { budgetMs, isMaxStage, QUESTIONS_PER_ROUND } from "./facts"
import { addEggFragment, ISKIERKI_CAP } from "./rewards"
import { dayStamp } from "./time"
import { roundWage } from "./village"

// Rozkłada sumę gwiazdek na n pytań (każde 0..3): jak najwięcej trójek (szybkie
// odpowiedzi → większy przyrost mastery), reszta wolniej. Dla debug-symulacji rundy.
export function distributeStars(total: number, n: number): number[] {
	const q = new Array<number>(n).fill(3)
	let excess = n * 3 - total
	for (let i = 0; i < n && excess > 0; i++) {
		const cut = Math.min(3, excess)
		q[i] = 3 - cut
		excess -= cut
	}
	return q
}

// Debug: liczy efekt pełnej rundy QUESTIONS_PER_ROUND pytań kończącej się sumą
// `totalStars` gwiazdek — tak jak prawdziwa runda (commit per odpowiedź + finalizacja).
// `firstFact` to pierwsze pytanie (na ekranie rundy: aktualnie wyświetlane); reszta
// losowana selekcją jak w grze. Czysta funkcja: niczego nie zapisuje, zwraca deltę.
export function simulateRoundOutcome(
	state: SaveState,
	totalStars: number,
	rand: () => number,
	now: number,
	firstFact?: Fact,
	mode: GameMode = "mult",
) {
	const facts = { ...state.facts }
	let eggFragments = state.eggFragments
	let eggStarBank = state.eggStarBank
	let eggsEarned = state.eggsEarned
	let iskierki = state.iskierki
	const pendingEggs = [...state.pendingEggs]
	const createdIndices: number[] = []
	const asked: FactKey[] = []
	const perQuestion = distributeStars(totalStars, QUESTIONS_PER_ROUND)

	for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
		const fact =
			i === 0 && firstFact
				? firstFact
				: pickNextFact(facts, state.unlockedStage, asked.slice(-3), rand)
		const stars = perQuestion[i] ?? 0
		// szybka odpowiedź ⇔ 3 gwiazdki (ten sam próg co budżet 3⭐); wolniej = mniejszy przyrost
		const elapsed = stars === 3 ? 0 : budgetMs(fact) * 2
		facts[fact.key] = applyAnswer(
			facts[fact.key] ?? emptyStats(),
			fact,
			true,
			elapsed,
			now,
		)
		asked.push(fact.key)
		// fragment + gwiazdki za każdą odpowiedź; jajko po przekroczeniu progu dostaje
		// finalny kolor z banku (ta sama czysta logika co w store — addEggFragment)
		const r = addEggFragment(
			{ eggFragments, eggStarBank, eggsEarned, iskierki },
			stars,
			mode,
			rand,
		)
		eggFragments = r.bank.eggFragments
		eggStarBank = r.bank.eggStarBank
		eggsEarned = r.bank.eggsEarned
		iskierki = r.bank.iskierki
		if (r.created) {
			pendingEggs.push(r.created)
			createdIndices.push(pendingEggs.length - 1)
		}
	}

	let unlockedStage = state.unlockedStage
	let unlockedThisRound = false
	if (
		!isMaxStage(unlockedStage) &&
		shouldUnlockNextStage(facts, unlockedStage)
	) {
		unlockedStage++
		unlockedThisRound = true
	}

	// żołd za ukończoną rundę — lustro finalizacji nextQuestion (bonus dnia
	// liczony względem lastPlayedDay sprzed rundy, jak w store)
	const firstRoundToday = state.achievementStats.lastPlayedDay !== dayStamp(now)
	const wage = roundWage(state.village, totalStars, firstRoundToday)
	iskierki = Math.min(ISKIERKI_CAP, iskierki + wage)

	return {
		facts,
		eggFragments,
		eggStarBank,
		eggsEarned,
		pendingEggs,
		createdIndices,
		asked,
		iskierki,
		wage,
		unlockedStage,
		unlockedThisRound,
	}
}
