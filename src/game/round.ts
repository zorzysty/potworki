import { MONSTERS } from "../monsters/catalog"
import type { AchievementCounters, SaveState } from "../store/schema"
import {
	applyAnswer,
	emptyStats,
	introRoundPlan,
	isIntroRound,
	newlyUnlockedFactor,
	pickNextFact,
	shouldUnlockNextStage,
	VISIT_BONUS,
	visitRoundPlan,
	visitStage,
} from "./adaptive"
import { isExpeditionDone, resolveExpedition } from "./expeditions"
import type { Fact, FactKey, GameMode, RoundQuestion } from "./facts"
import {
	expectedAnswer,
	FACTS_BY_KEY,
	isMaxStage,
	MAX_QUESTIONS_PER_ROUND,
	MAX_STARS_PER_ROUND,
	makeQuestion,
	QUESTIONS_PER_ROUND,
	starsFor,
} from "./facts"
import { addEggFragment, credit } from "./rewards"
import { dayStamp } from "./time"
import { roundWage } from "./village"

// Cykl życia Rundy jako czyste funkcje nad (SaveState, RoundState): start,
// odpowiedź (commit per odpowiedź), przejście dalej / finalizacja. Store tylko
// nakłada zwrócony patch; ekran debug gra tymi samymi funkcjami (game/debug.ts).

export type RoundPhase = "answering" | "correct" | "wrong" | "summary"

export interface RoundState {
	mode: GameMode
	// czynnik świeżo odblokowany w tej rundzie (pierwsza runda po bramie) — featurowany
	// w połowie pytań; w dzieleniu wymusza go na pozycji dzielnika. null = zwykła runda.
	introFactor: number | null
	// gdy ustawiony: ułożony plan działań pytań bazowych intro-rundy (5 nowych + 5 starych),
	// konsumowany pozycyjnie (planPos); powtórki po błędzie nie ruszają planu.
	plan: FactKey[] | null
	planPos: number
	index: number
	total: number
	question: RoundQuestion
	phase: RoundPhase
	answer: string
	stars: number
	lastStars: number
	startedAt: number
	asked: FactKey[]
	requeues: Record<number, FactKey>
	shakeNonce: number
	eggsCreated: number[] // indeksy w pendingEggs utworzone w tej rundzie (kolor jajka jest finalny już od utworzenia)
	unlockedThisRound: boolean
	wageEarned: number // żołd przyznany przy finalizacji (faza summary); 0 do końca rundy
	// PAUZA („Przerwa ⏸"): siedzi na rundzie, nie obok niej — ginie razem z nią,
	// więc nie da się jej przenieść na następną rundę (żadne zerowanie w akcjach
	// nawigacji). Wycisza wejście u źródła: guardy w pressDigit/pressBackspace/
	// pressConfirm (store). Nakładka RoundScreen zasłania tylko keypad, a globalny
	// `keydown` w App.tsx żyje obok niej — bez guardu wpisywałby cyfry, a
	// auto-submit zatwierdzałby odpowiedzi (błędna połowi mastery: kara za
	// przerwę, wprost przeciw zasadzie roota „nigdy nie karze").
	paused: boolean
	// runda-wizyta u Strażnika: etap odwiedzanej (najsłabszej starszej) tabliczki —
	// wybiera region/Strażnika i włącza podziękowanie (+VISIT_BONUS ✨) przy finalizacji.
	// Efemeryczne (RoundState nie jest persystowany). null = zwykła runda.
	visitStage: number | null
	// powrót z wyprawy rozstrzygnięty przy finalizacji TEJ rundy (karta w
	// podsumowaniu): nagroda już doliczona do iskierek; trop = wskazówka o
	// nieposiadanym potworku (null gdy brak). Efemeryczne jak wageEarned —
	// bez migracji. null = nikt nie wrócił w tej rundzie.
	expeditionReturn: {
		monsterId: number
		rewardIskierki: number
		tropMonsterId: number | null
	} | null
}

export type Rand = () => number

// Patch zapisu + nowy stan rundy; store robi `set({ ...patch, round })`.
export interface RoundStep {
	patch: Partial<SaveState>
	round: RoundState
}

function baseRound(
	mode: GameMode,
	firstFact: Fact,
	opts: {
		introFactor: number | null
		plan: FactKey[] | null
		visitStage: number | null
	},
	rand: Rand,
	now: number,
): RoundState {
	return {
		mode,
		paused: false,
		introFactor: opts.introFactor,
		plan: opts.plan,
		planPos: 1,
		index: 0,
		total: QUESTIONS_PER_ROUND,
		question: makeQuestion(firstFact, false, mode, opts.introFactor, rand),
		phase: "answering",
		answer: "",
		stars: 0,
		lastStars: 0,
		startedAt: now,
		asked: [],
		requeues: {},
		shakeNonce: 0,
		eggsCreated: [],
		unlockedThisRound: false,
		wageEarned: 0,
		visitStage: opts.visitStage,
		expeditionReturn: null,
	}
}

// Zwykła runda. Pierwsza runda po odblokowaniu czynnika: plan 5 nowych + 5 starych
// działań (mocne mieszanie), zamiast pozwolić nowej cyfrze zdominować pulę.
export function newRound(
	save: SaveState,
	mode: GameMode,
	rand: Rand,
	now: number,
): RoundState {
	const stage = save.unlockedStage
	const intro = isIntroRound(save.facts, stage)
	const introFactor = intro ? newlyUnlockedFactor(stage) : null
	const plan = intro
		? introRoundPlan(save.facts, stage, QUESTIONS_PER_ROUND, rand).map(
				(f) => f.key,
			)
		: null
	const firstFact =
		(plan?.[0] && FACTS_BY_KEY.get(plan[0])) ??
		pickNextFact(save.facts, stage, [], rand)
	return baseRound(
		mode,
		firstFact,
		{ introFactor, plan, visitStage: null },
		rand,
		now,
	)
}

// Runda-wizyta u Strażnika: powtórka starszych tabliczek opowiedziana jako
// odwiedziny w krainie najsłabszej z nich. Mechanika identyczna ze zwykłą rundą;
// różnice: plan z visitRoundPlan (połowa z odwiedzanej tabliczki, reszta ze
// starszych), tryb PRZYPIĘTY do "mult" (zaproszenie mówi „tabliczka ×N") i
// podziękowanie Strażnika (+VISIT_BONUS ✨) przy finalizacji.
// null = nic do odwiedzenia (wywołujący startuje zwykłą rundę).
export function newVisitRound(
	save: SaveState,
	rand: Rand,
	now: number,
): RoundState | null {
	const stage = save.unlockedStage
	const visited = visitStage(save.facts, stage)
	if (visited === null) return null
	const plan = visitRoundPlan(
		save.facts,
		visited,
		stage,
		QUESTIONS_PER_ROUND,
		rand,
	).map((f) => f.key)
	const firstFact = plan[0] ? FACTS_BY_KEY.get(plan[0]) : undefined
	if (!firstFact) return null
	return baseRound(
		"mult",
		firstFact,
		{ introFactor: null, plan, visitStage: visited },
		rand,
		now,
	)
}

// Zatwierdzenie wpisanej odpowiedzi (`round.answer`). Pierwsza próba = commit
// statystyk i fragmentu od razu (zamknięcie karty w środku rundy nie traci
// nauki) — `committed: true`. W fazie „wrong" przepisanie poprawnego wyniku to
// czysty rytuał utrwalający (bez commitu). null = nic do zrobienia.
export function submitAnswer(
	save: SaveState,
	round: RoundState,
	rand: Rand,
	now: number,
): (RoundStep & { committed: boolean }) | null {
	if (round.answer === "") return null
	const q = round.question
	const correct = Number(round.answer) === expectedAnswer(q, round.mode)

	if (round.phase === "wrong") {
		return {
			patch: {},
			committed: false,
			round: correct
				? { ...round, phase: "correct", lastStars: 0 }
				: { ...round, answer: "", shakeNonce: round.shakeNonce + 1 },
		}
	}
	if (round.phase !== "answering") return null

	const elapsed = now - round.startedAt
	const fact = FACTS_BY_KEY.get(q.key)
	if (!fact) return null
	const facts = {
		...save.facts,
		[q.key]: applyAnswer(
			save.facts[q.key] ?? emptyStats(),
			fact,
			correct,
			elapsed,
			now,
		),
	}

	// błędne działanie (powtórka) daje maks. 1 gwiazdkę, nawet jeśli poprawka jest szybka
	const earned = correct ? starsFor(elapsed, fact) : 0
	const gained = q.isRequeue ? Math.min(1, earned) : earned
	const stars = round.stars + gained

	// liczniki osiągnięć: kariera gwiazdek rośnie zawsze (gained=0 nieszkodliwe),
	// poprawne pierwsze próby w dzieleniu i w luce liczymy osobno
	const achievementStats: AchievementCounters = {
		...save.achievementStats,
		totalStars: save.achievementStats.totalStars + gained,
		divCorrect:
			save.achievementStats.divCorrect +
			(correct && round.mode === "div" ? 1 : 0),
		gapCorrect:
			save.achievementStats.gapCorrect +
			(correct && round.mode === "gap" ? 1 : 0),
	}

	// fragment + gwiazdki niezależnie od wyniku — postęp nigdy nie przepada.
	// addEggFragment domyka jajko po przekroczeniu progu (finalny kolor z banku).
	const { bank, created } = addEggFragment(
		{
			eggFragments: save.eggFragments,
			eggStarBank: save.eggStarBank,
			eggsEarned: save.eggsEarned,
			iskierki: save.iskierki,
		},
		gained,
		round.mode,
		rand,
	)
	let pendingEggs = save.pendingEggs
	const eggsCreated = [...round.eggsCreated]
	if (created) {
		pendingEggs = [...pendingEggs, created]
		eggsCreated.push(pendingEggs.length - 1)
	}
	const patch: Partial<SaveState> = {
		facts,
		eggFragments: bank.eggFragments,
		eggStarBank: bank.eggStarBank,
		eggsEarned: bank.eggsEarned,
		iskierki: bank.iskierki,
		pendingEggs,
		achievementStats,
	}

	if (correct) {
		return {
			patch,
			committed: true,
			round: {
				...round,
				phase: "correct",
				stars,
				lastStars: gained,
				eggsCreated,
			},
		}
	}
	// powtórka błędnego działania za 3 pytania (max 12 pytań w rundzie)
	const requeues = { ...round.requeues }
	let total = round.total
	if (!q.isRequeue && total < MAX_QUESTIONS_PER_ROUND) {
		requeues[Math.min(round.index + 3, total)] = q.key
		total++
	}
	return {
		patch,
		committed: true,
		round: {
			...round,
			phase: "wrong",
			answer: "",
			stars,
			lastStars: 0,
			requeues,
			total,
			eggsCreated,
			shakeNonce: round.shakeNonce + 1,
		},
	}
}

// Po poprawnej odpowiedzi: następne pytanie albo — gdy to było ostatnie —
// finalizacja rundy (faza summary). null = nie w fazie „correct".
export function advance(
	save: SaveState,
	round: RoundState,
	rand: Rand,
	now: number,
): RoundStep | null {
	if (round.phase !== "correct") return null
	const asked = [...round.asked, round.question.key]
	const nextIndex = round.index + 1
	if (nextIndex >= round.total)
		return finishRound(save, { ...round, asked }, rand, now)

	const requeuedKey = round.requeues[nextIndex]
	const requeuedFact = requeuedKey ? FACTS_BY_KEY.get(requeuedKey) : undefined
	// pytanie bazowe (nie powtórka): w intro-rundzie bierz z planu, inaczej selekcja
	let planPos = round.planPos
	let baseFact: Fact | undefined
	if (!requeuedFact) {
		if (round.plan) {
			const planKey = round.plan[planPos]
			baseFact = planKey ? FACTS_BY_KEY.get(planKey) : undefined
			planPos++
		}
		baseFact ??= pickNextFact(
			save.facts,
			save.unlockedStage,
			asked.slice(-3),
			rand,
		)
	}
	const fact = requeuedFact ?? (baseFact as Fact)
	return {
		patch: {},
		round: {
			...round,
			index: nextIndex,
			planPos,
			question: makeQuestion(
				fact,
				requeuedFact !== undefined,
				round.mode,
				round.introFactor,
				rand,
			),
			phase: "answering",
			answer: "",
			lastStars: 0,
			startedAt: now,
			asked,
		},
	}
}

// Koniec rundy: jajka mają już finalny kolor z chwili domknięcia (eggStarBank),
// iskierka za tęczowe też już przyznana — zostaje sprawdzenie odblokowania,
// policzenie rundy, żołd, podziękowanie Strażnika i powrót z wyprawy. Kolejność
// jest kontraktem: bonus dnia liczony PRZED bumpDaysPlayed (bump nadpisuje
// lastPlayedDay), a wszystkie źródła dochodu wchodzą do JEDNEGO `credit`.
function finishRound(
	save: SaveState,
	round: RoundState,
	rand: Rand,
	now: number,
): RoundStep {
	let unlockedStage = save.unlockedStage
	let unlockedThisRound = false
	if (
		!isMaxStage(unlockedStage) &&
		shouldUnlockNextStage(save.facts, unlockedStage)
	) {
		unlockedStage++
		unlockedThisRound = true
	}
	const firstRoundToday = save.achievementStats.lastPlayedDay !== dayStamp(now)
	const wageEarned = roundWage(save.village, round.stars, firstRoundToday)
	// podziękowanie Strażnika za rundę-wizytę — OSOBNO od żołdu (wageEarned zostaje
	// czystym żołdem; podsumowanie pokazuje bonus własną linią)
	const visitBonus = round.visitStage !== null ? VISIT_BONUS : 0
	const settled = settleExpedition(save, rand)

	const stats = { ...save.achievementStats }
	const deltas: Partial<Record<NumericCounter, number>> = {
		perfectRounds: round.stars === MAX_STARS_PER_ROUND ? 1 : 0,
		visitRoundsCompleted: round.visitStage !== null ? 1 : 0,
		expeditionsCompleted: settled.expeditionReturn !== null ? 1 : 0,
	}
	for (const [key, delta] of Object.entries(deltas) as [
		NumericCounter,
		number,
	][])
		stats[key] += delta

	return {
		patch: {
			unlockedStage,
			iskierki: credit(save.iskierki, wageEarned + visitBonus + settled.reward)
				.wallet,
			totalRounds: save.totalRounds + 1,
			expedition: settled.expedition,
			achievementStats: bumpDaysPlayed(stats, now),
		},
		round: {
			...round,
			phase: "summary",
			unlockedThisRound,
			wageEarned,
			expeditionReturn: settled.expeditionReturn,
		},
	}
}

type NumericCounter = {
	[K in keyof AchievementCounters]: AchievementCounters[K] extends number
		? K
		: never
}[keyof AchievementCounters]

// Podbija licznik dni gry przy PIERWSZEJ ukończonej rundzie danego dnia
// (kumulacyjnie, nie streak — przerwa nie zeruje).
function bumpDaysPlayed(
	stats: AchievementCounters,
	now: number,
): AchievementCounters {
	const today = dayStamp(now)
	if (stats.lastPlayedDay === today) return stats
	return { ...stats, daysPlayed: stats.daysPlayed + 1, lastPlayedDay: today }
}

// Pula tropu z wyprawy: WSZYSTKIE id katalogu (wskazówka może dotyczyć każdego
// nieposiadanego — także ekskluzywnych trybów, bo wymarzonym może być każdy).
const ALL_MONSTER_IDS: readonly number[] = MONSTERS.map((m) => m.id)

// Powrót wyprawy przy finalizacji rundy (totalRounds+1 = właśnie ukończona runda).
// Gdy nikt nie wraca — stan wyprawy bez zmian, reward 0.
function settleExpedition(
	save: SaveState,
	rand: Rand,
): {
	expedition: SaveState["expedition"]
	expeditionReturn: RoundState["expeditionReturn"]
	reward: number
} {
	const e = save.expedition
	if (!e || !isExpeditionDone(e, save.totalRounds + 1)) {
		return { expedition: e, expeditionReturn: null, reward: 0 }
	}
	const r = resolveExpedition(
		e,
		new Set(Object.keys(save.ownedMonsters).map(Number)),
		ALL_MONSTER_IDS,
		rand,
	)
	return {
		expedition: null,
		expeditionReturn: { monsterId: e.monsterId, ...r },
		reward: r.rewardIskierki,
	}
}
