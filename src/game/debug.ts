import type { SaveState } from "../store/schema"
import {
	applyAnswer,
	emptyStats,
	pickNextFact,
	shouldUnlockNextStage,
} from "./adaptive"
import type { Fact, FactKey } from "./facts"
import {
	budgetMs,
	fragmentsForEgg,
	isMaxStage,
	QUESTIONS_PER_ROUND,
} from "./facts"
import { eggQuality, ISKIERKI_CAP } from "./rewards"

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
) {
	const facts = { ...state.facts }
	let eggFragments = state.eggFragments
	let eggsEarned = state.eggsEarned
	const pendingEggs = [...state.pendingEggs]
	const createdIndices: number[] = []
	const asked: FactKey[] = []
	const finalQuality = eggQuality(totalStars, rand)
	const perQuestion = distributeStars(totalStars, QUESTIONS_PER_ROUND)

	for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
		const fact =
			i === 0 && firstFact
				? firstFact
				: pickNextFact(facts, state.unlockedStage, asked.slice(-3), rand)
		// szybka odpowiedź ⇔ 3 gwiazdki (ten sam próg co budżet 3⭐); wolniej = mniejszy przyrost
		const elapsed = perQuestion[i] === 3 ? 0 : budgetMs(fact) * 2
		facts[fact.key] = applyAnswer(
			facts[fact.key] ?? emptyStats(),
			fact,
			true,
			elapsed,
			now,
		)
		asked.push(fact.key)
		// fragment za każdą odpowiedź; jajko po przekroczeniu progu — finalna jakość od razu
		eggFragments++
		if (eggFragments >= fragmentsForEgg(eggsEarned)) {
			eggFragments = 0
			eggsEarned++
			pendingEggs.push({ quality: finalQuality })
			createdIndices.push(pendingEggs.length - 1)
		}
	}

	const iskierki =
		finalQuality === "rainbow"
			? Math.min(ISKIERKI_CAP, state.iskierki + 1)
			: state.iskierki
	let unlockedStage = state.unlockedStage
	let unlockedThisRound = false
	if (
		!isMaxStage(unlockedStage) &&
		shouldUnlockNextStage(facts, unlockedStage)
	) {
		unlockedStage++
		unlockedThisRound = true
	}

	return {
		facts,
		eggFragments,
		eggsEarned,
		pendingEggs,
		createdIndices,
		asked,
		iskierki,
		unlockedStage,
		unlockedThisRound,
		finalQuality,
	}
}
