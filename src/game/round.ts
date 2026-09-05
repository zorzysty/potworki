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
import { grantMonster, ownedIds } from "./collection"
import {
	type ExpeditionTypeId,
	FINDABLE_IDS,
	isExpeditionDone,
	resolveExpedition,
} from "./expeditions"
import type { Fact, FactKey, GameMode, RoundQuestion } from "./facts"
import {
	budgetMs,
	divisorPairs,
	expectedAnswer,
	FACTS_BY_KEY,
	factKey,
	isMaxStage,
	MAX_QUESTIONS_PER_ROUND,
	MAX_STARS_PER_ROUND,
	makeQuestion,
	pairBudgetMs,
	pickRival,
	QUESTIONS_PER_ROUND,
	starsFor,
	starsForBudget,
	unlockedFacts,
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
	// tryb par ("pairs"): pierwszy stuknięty czynnik (null = nic), pary już
	// znalezione w bieżącym pytaniu, chwila ostatniego trafienia (mastery pary
	// liczy czas od poprzedniej pary, gwiazdki pytania — od startu) i czy w tym
	// pytaniu była pomyłka (0★ + powtórka, ale pytanie gra się do końca).
	picked: number | null
	found: FactKey[]
	pairAt: number
	missed: boolean
	// ostatnio stuknięta para w kolejności stuknięć (UI pokazuje ją chwilę w
	// równaniu — inaczej druga liczba nigdy nie pojawiałaby się w okienku)
	lastPair: [number, number] | null
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
	// powrót z wyprawy rozstrzygnięty przy finalizacji TEJ rundy (splash nad
	// podsumowaniem): nagroda już doliczona do iskierek, znaleziony potworek
	// już dopisany do kolekcji (null gdy wyprawa wróciła bez). Efemeryczne jak
	// wageEarned — bez migracji. null = nikt nie wrócił w tej rundzie.
	expeditionReturn: {
		monsterId: number
		typeId: ExpeditionTypeId
		rewardIskierki: number
		foundMonsterId: number | null
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
	stage: number,
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
		question: makeQuestion(
			firstFact,
			false,
			mode,
			opts.introFactor,
			rand,
			mode === "feed" ? pickRival(firstFact, stage, rand) : undefined,
		),
		phase: "answering",
		answer: "",
		stars: 0,
		lastStars: 0,
		startedAt: now,
		asked: [],
		requeues: {},
		shakeNonce: 0,
		picked: null,
		found: [],
		pairAt: now,
		missed: false,
		lastPair: null,
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
	let plan = intro
		? introRoundPlan(save.facts, stage, QUESTIONS_PER_ROUND, rand).map(
				(f) => f.key,
			)
		: null
	// tryb par: dwa fakty o tym samym iloczynie to to samo pytanie — zostaje
	// pierwszy; brakujące pytania dobierze selekcja (advance), gdy plan się skończy
	if (plan && mode === "pairs") {
		const seen = new Set<number>()
		plan = plan.filter((k) => {
			const f = FACTS_BY_KEY.get(k)
			const p = f ? f.a * f.b : 0
			if (seen.has(p)) return false
			seen.add(p)
			return true
		})
	}
	const firstFact =
		(plan?.[0] && FACTS_BY_KEY.get(plan[0])) ??
		pickNextFact(save.facts, stage, [], rand)
	return baseRound(
		mode,
		firstFact,
		{ introFactor, plan, visitStage: null },
		stage,
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
		stage,
		rand,
		now,
	)
}

// Zatwierdzenie wpisanej odpowiedzi (`round.answer`). Pierwsza próba = commit
// statystyk i fragmentu od razu (zamknięcie karty w środku rundy nie traci
// nauki). W fazie „wrong" przepisanie poprawnego wyniku to czysty rytuał
// utrwalający (pusty patch). null = nic do zrobienia.
export function submitAnswer(
	save: SaveState,
	round: RoundState,
	rand: Rand,
	now: number,
): RoundStep | null {
	if (round.answer === "") return null
	const q = round.question
	const correct = Number(round.answer) === expectedAnswer(q, round.mode)

	if (round.phase === "wrong") {
		return {
			patch: {},
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

	// liczniki osiągnięć: poprawne pierwsze próby w dzieleniu i w luce osobno
	const achievementStats: AchievementCounters = {
		...save.achievementStats,
		divCorrect:
			save.achievementStats.divCorrect +
			(correct && round.mode === "div" ? 1 : 0),
		gapCorrect:
			save.achievementStats.gapCorrect +
			(correct && round.mode === "gap" ? 1 : 0),
	}
	const committed = commitFragment(
		{ ...save, achievementStats },
		round,
		gained,
		rand,
	)
	const patch: Partial<SaveState> = { facts, ...committed.patch }
	const { eggsCreated } = committed

	if (correct) {
		return {
			patch,
			round: {
				...round,
				phase: "correct",
				stars,
				lastStars: gained,
				eggsCreated,
			},
		}
	}
	return {
		patch,
		round: {
			...withRequeue(round),
			phase: "wrong",
			answer: "",
			stars,
			lastStars: 0,
			eggsCreated,
			shakeNonce: round.shakeNonce + 1,
		},
	}
}

// Fragment jajka + kariera gwiazdek za JEDNO pytanie, niezależnie od wyniku —
// postęp nigdy nie przepada. addEggFragment domyka jajko po przekroczeniu
// progu (finalny kolor z banku). Wspólne dla odpowiedzi liczbowej i pary.
function commitFragment(
	save: SaveState,
	round: RoundState,
	gained: number,
	rand: Rand,
): { patch: Partial<SaveState>; eggsCreated: number[] } {
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
	return {
		patch: {
			eggFragments: bank.eggFragments,
			eggStarBank: bank.eggStarBank,
			eggsEarned: bank.eggsEarned,
			iskierki: bank.iskierki,
			pendingEggs,
			achievementStats: {
				...save.achievementStats,
				totalStars: save.achievementStats.totalStars + gained,
			},
		},
		eggsCreated,
	}
}

// Powtórka błędnego działania za 3 pytania (max 12 pytań w rundzie); powtórka
// powtórki nie wchodzi.
function withRequeue(round: RoundState): RoundState {
	const q = round.question
	if (q.isRequeue || round.total >= MAX_QUESTIONS_PER_ROUND) return round
	return {
		...round,
		requeues: {
			...round.requeues,
			[Math.min(round.index + 3, round.total)]: q.key,
		},
		total: round.total + 1,
	}
}

// Tryb par: stuknięta para czynników (x, y) do celu `question.a`. Trafienie =
// nauka faktu x×y (czas od poprzedniej pary); pomyłka = nauka „na minus"
// faktu, w który dziecko uwierzyło (4×7 = 24?), pytanie gra się dalej bez
// gwiazdek i z powtórką (szybkość tylko nagradza: fragment i tak wpada, gdy
// wszystkie pary są znalezione). Ostatnia para domyka pytanie: gwiazdki z
// łącznego czasu względem sumy budżetów par, fragment, faza „correct".
// null = nie tryb par / nie faza odpowiadania / para już znaleziona.
export function submitPair(
	save: SaveState,
	round: RoundState,
	x: number,
	y: number,
	rand: Rand,
	now: number,
): RoundStep | null {
	if (round.mode !== "pairs" || round.phase !== "answering") return null
	const key = factKey(x, y)
	const fact = FACTS_BY_KEY.get(key)
	if (!fact || round.found.includes(key)) return null
	const correct = x * y === round.question.a
	const facts = {
		...save.facts,
		[key]: applyAnswer(
			save.facts[key] ?? emptyStats(),
			fact,
			correct,
			now - round.pairAt,
			now,
			pairBudgetMs(fact),
		),
	}
	if (!correct) {
		// powtórkę dokłada tylko PIERWSZA pomyłka w pytaniu
		return {
			patch: { facts },
			round: {
				...(round.missed ? round : withRequeue(round)),
				missed: true,
				picked: null,
				pairAt: now, // czas namysłu nad pomyłką nie obciąża następnej pary
				lastPair: [x, y],
				shakeNonce: round.shakeNonce + 1,
			},
		}
	}
	const found = [...round.found, key]
	const targets = divisorPairs(round.question.a, save.unlockedStage)
	// licznik osiągnięć: każda trafiona para (lustro divCorrect/gapCorrect)
	const achievementStats: AchievementCounters = {
		...save.achievementStats,
		pairsCorrect: save.achievementStats.pairsCorrect + 1,
	}
	if (found.length < targets.length) {
		return {
			patch: { facts, achievementStats },
			round: { ...round, found, picked: null, pairAt: now, lastPair: [x, y] },
		}
	}
	const budget = targets.reduce((sum, f) => sum + pairBudgetMs(f), 0)
	const earned = round.missed
		? 0
		: starsForBudget(now - round.startedAt, budget)
	const gained = round.question.isRequeue ? Math.min(1, earned) : earned
	const committed = commitFragment(
		{ ...save, achievementStats },
		round,
		gained,
		rand,
	)
	return {
		patch: { facts, ...committed.patch },
		round: {
			...round,
			found,
			picked: null,
			lastPair: [x, y],
			phase: "correct",
			stars: round.stars + gained,
			lastStars: gained,
			eggsCreated: committed.eggsCreated,
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
			round.mode === "pairs"
				? sameProductKeys(asked.slice(-3), save.unlockedStage)
				: asked.slice(-3),
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
				round.mode === "feed"
					? pickRival(fact, save.unlockedStage, rand)
					: undefined,
			),
			phase: "answering",
			answer: "",
			lastStars: 0,
			startedAt: now,
			picked: null,
			found: [],
			pairAt: now,
			missed: false,
			lastPair: null,
			shakeNonce: 0, // karta par trzęsie się przy montażu, gdy > 0 — nowe pytanie startuje czysto
			asked,
		},
	}
}

// Tryb porównywania: stuknięta strona (0 = lewa, 1 = prawa). Poprawnie = strona
// z większym iloczynem. Trafienie uczy OBA fakty (porównanie wymaga obu
// wyników); pomyłka uczy „na minus" tylko fakt pytania — nie wiemy, które z
// dwóch działań zawiodło, a podwójna kara za jeden tap byłaby nieuczciwa.
// Gwiazdki z sumy budżetów obu faktów. Pomyłka → faza „wrong" (karta odsłania
// wyniki), stuknięcie właściwej strony to rytuał utrwalający (pusty patch,
// 0★), jak przepisanie wyniku w innych trybach. null = nie tryb porównywania.
export function submitFeed(
	save: SaveState,
	round: RoundState,
	side: 0 | 1,
	rand: Rand,
	now: number,
): RoundStep | null {
	if (round.mode !== "feed") return null
	const q = round.question
	const fact = FACTS_BY_KEY.get(q.key)
	const rival = q.rival ? FACTS_BY_KEY.get(q.rival.key) : undefined
	if (!fact || !rival) return null
	const bigger = feedAnswer(q)
	const correct = side === bigger

	if (round.phase === "wrong") {
		return {
			patch: {},
			round: correct
				? { ...round, phase: "correct", lastStars: 0 }
				: { ...round, shakeNonce: round.shakeNonce + 1 },
		}
	}
	if (round.phase !== "answering") return null

	const elapsed = now - round.startedAt
	const budget = budgetMs(fact) + budgetMs(rival)
	const facts: SaveState["facts"] = {
		...save.facts,
		[q.key]: applyAnswer(
			save.facts[q.key] ?? emptyStats(),
			fact,
			correct,
			elapsed,
			now,
			budget,
		),
	}
	if (correct) {
		facts[rival.key] = applyAnswer(
			save.facts[rival.key] ?? emptyStats(),
			rival,
			true,
			elapsed,
			now,
			budget,
		)
	}
	const earned = correct ? starsForBudget(elapsed, budget) : 0
	const gained = q.isRequeue ? Math.min(1, earned) : earned
	const achievementStats: AchievementCounters = {
		...save.achievementStats,
		feedCorrect: save.achievementStats.feedCorrect + (correct ? 1 : 0),
	}
	const committed = commitFragment(
		{ ...save, achievementStats },
		round,
		gained,
		rand,
	)
	const patch: Partial<SaveState> = { facts, ...committed.patch }
	if (correct) {
		return {
			patch,
			round: {
				...round,
				phase: "correct",
				stars: round.stars + gained,
				lastStars: gained,
				eggsCreated: committed.eggsCreated,
			},
		}
	}
	return {
		patch,
		round: {
			...withRequeue(round),
			phase: "wrong",
			lastStars: 0,
			eggsCreated: committed.eggsCreated,
			shakeNonce: round.shakeNonce + 1,
		},
	}
}

// Strona z większym iloczynem (0 = lewa, 1 = prawa) wg `swap`.
export function feedAnswer(q: RoundQuestion): 0 | 1 {
	const own = q.a * q.b
	const other = q.rival ? q.rival.a * q.rival.b : 0
	const ownIsLeft = !q.swap
	return own > other === ownIsLeft ? 0 : 1
}

// W trybie par cel to iloczyn, więc „nie powtarzaj ostatnich" musi omijać
// wszystkie działania o tych samych iloczynach (3×8 i 4×6 to ten sam cel 24).
function sameProductKeys(keys: FactKey[], stage: number): FactKey[] {
	const products = new Set(
		keys.map((k) => FACTS_BY_KEY.get(k)).map((f) => (f ? f.a * f.b : 0)),
	)
	return unlockedFacts(stage)
		.filter((f) => products.has(f.a * f.b))
		.map((f) => f.key)
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
	const settled = settleExpedition(save, rand, now)

	const stats = { ...save.achievementStats }
	if (round.stars === MAX_STARS_PER_ROUND) stats.perfectRounds++
	if (round.visitStage !== null) stats.visitRoundsCompleted++
	if (settled.expeditionReturn !== null) stats.expeditionsCompleted++

	return {
		patch: {
			unlockedStage,
			iskierki: credit(
				save.iskierki,
				wageEarned +
					visitBonus +
					(settled.expeditionReturn?.rewardIskierki ?? 0),
			).wallet,
			totalRounds: save.totalRounds + 1,
			...settled.patch,
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

// Powrót wyprawy przy finalizacji rundy (totalRounds+1 = właśnie ukończona
// runda). Znaleziony potworek wchodzi do kolekcji TUTAJ (grantMonster), nie w
// UI — splash tylko pokazuje. Gdy nikt nie wraca: null + pusty patch.
function settleExpedition(
	save: SaveState,
	rand: Rand,
	now: number,
): {
	expeditionReturn: RoundState["expeditionReturn"]
	patch: Partial<SaveState>
} {
	const e = save.expedition
	if (!e || !isExpeditionDone(e, save.totalRounds + 1)) {
		return { expeditionReturn: null, patch: {} }
	}
	const r = resolveExpedition(
		e,
		new Set(ownedIds(save.ownedMonsters)),
		FINDABLE_IDS,
		rand,
	)
	const found = r.foundMonsterId
	return {
		expeditionReturn: { monsterId: e.monsterId, typeId: e.typeId, ...r },
		patch: {
			expedition: null,
			...(found === null ? {} : grantMonster(save, found, now)),
		},
	}
}
