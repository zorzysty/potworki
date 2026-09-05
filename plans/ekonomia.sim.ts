// biome-ignore-all lint/style/noNonNullAssertion: skrypt analizy, nie kod gry
// Symulacja ekonomii Potworków na PRAWDZIWYCH funkcjach gry (import z src/).
// Gra pełne rundy we wszystkich trybach (round.ts), wykluwa (rewards.ts),
// kupuje (village/cosmetics/wishEgg), odbiera osiągnięcia (achievements),
// wysyła wyprawy (znaleziska wchodzą przez finishRound), przyjmuje wizyty.
// Kalendarz dni: decay na starcie dnia jak store.applyDecay.
//
// Uruchomienie: bun run plans/ekonomia.sim.ts <przebiegi> "" wyniki.json
//   (drugi argument = nazwa jednego profilu albo "" = wszystkie),
// potem: bun run plans/ekonomia.agg.ts wyniki.json podsumowanie.json
// Raporty: plans/03x-analiza-ekonomii-*.html.

import { ACHIEVEMENTS } from "../src/achievements/catalog"
import {
	claimAchievement,
	unlockAchievements,
} from "../src/achievements/evaluate"
import { decayStats, VISIT_BONUS } from "../src/game/adaptive"
import { isCollectionComplete, ownedCount } from "../src/game/collection"
import { COSMETICS, sklepikLevel } from "../src/game/cosmetics"
import { EXPEDITIONS, expeditionUnlocked } from "../src/game/expeditions"
import {
	budgetMs,
	divisorPairs,
	expectedAnswer,
	FACTS_BY_KEY,
	type FactKey,
	type GameMode,
	modeUnlocked,
	pairBudgetMs,
	STAGES,
	unlockedFactors,
} from "../src/game/facts"
import {
	credit,
	dupIskierki,
	LEGENDARY_PITY_EVERY,
	type PendingEgg,
	rollMonsterWithPity,
	rollWish,
	spend,
	WISH_MODE,
} from "../src/game/rewards"
import {
	advance,
	feedAnswer,
	newRound,
	newVisitRound,
	type RoundState,
	submitAnswer,
	submitFeed,
	submitPair,
} from "../src/game/round"
import {
	BUILDINGS,
	type BuildingId,
	buildingLevel,
	DECORATIONS,
	nextLevelCost,
	villageValue,
} from "../src/game/village"
import { wishEgg } from "../src/game/wishEgg"
import {
	DIVISION_ONLY_IDS,
	FEED_ONLY_IDS,
	FIRST_MONSTER_ID,
	GAP_ONLY_IDS,
	IDS_BY_RARITY,
	idsByRarityForMode,
	MONSTER_COUNT,
	mulberry32,
	PAIRS_ONLY_IDS,
	rarityOf,
} from "../src/monsters/catalog"
import { INITIAL_SAVE, type SaveState } from "../src/store/schema"

export const MODES: readonly GameMode[] = [
	"mult",
	"div",
	"gap",
	"pairs",
	"feed",
]
export const EXCLUSIVE: Record<GameMode, ReadonlySet<number>> = {
	mult: new Set(),
	div: DIVISION_ONLY_IDS,
	gap: GAP_ONLY_IDS,
	pairs: PAIRS_ONLY_IDS,
	feed: FEED_ONLY_IDS,
}
const BASE_LEG = IDS_BY_RARITY.legendary.filter(
	(id) => !MODES.some((m) => EXCLUSIVE[m].has(id)),
)
const DAY = 86_400_000
const MAX_ROUNDS = 1000

export interface Profile {
	name: string
	p3: number // P(3★ | poprawna)
	err: number // bazowa szansa pomyłki (skalowana mastery)
	modeW: Partial<Record<GameMode, number>> // wagi trybów (tylko odblokowane)
	targeted?: boolean // gra trybami, którym brakuje legendarnych (waga ×3)
	roundsPerDay: number
	pPlay: number // szansa, że danego dnia dziecko gra
	learn?: boolean // p3 rośnie z mastery (dziecko przyspiesza, gdy umie)
	variant?: "sharedPity"
	pityEvery?: number // wariant: inny próg gwarancji (emulowany offsetem)
	breakEvery?: number // co ile dni przerwa (wakacje)
	breakLen?: number
}

export interface Snapshot {
	round: number
	day: number
	owned: number
	iskierki: number
	villageValue: number
	cosmetics: number
	stage: number
	eggs: number
}
const SNAP_AT = [
	10, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 500, 600, 800, 1000,
]

export interface RunResult {
	goals: Record<string, { round: number; day: number } | null>
	income: Record<string, number>
	spent: Record<string, number>
	eggs: Record<string, number>
	eggsByMode: Record<GameMode, number>
	legendaryByPity: number
	legendaryNatural: number
	wishBought: number
	wishNew: number
	roundsAtCap: number
	roundsNoSink: number
	capWaste: number
	rounds: number
	days: number
	snapshots: Snapshot[]
	newHatchRounds: number[] // rundy, w których przybył NOWY potworek (wyklucie lub znalezisko)
	visits: number
	expeditions: number
	found: number
	perfectRounds: number
	stars: number
	wageByRound: number[]
	achievementsUnlocked: Record<string, number> // id → runda odblokowania
}

function pick<T>(arr: readonly T[], rand: () => number): T {
	return arr[Math.floor(rand() * arr.length)] as T
}

export function runOne(profile: Profile, seed: number): RunResult {
	const rand = mulberry32(seed)
	let save: SaveState = structuredClone(INITIAL_SAVE)
	const goals: RunResult["goals"] = {}
	const income = {
		wage: 0,
		dup: 0,
		achievements: 0,
		expeditions: 0,
		visits: 0,
		rainbow: 0,
	}
	const spent = { wish: 0, village: 0, cosmetics: 0 }
	const eggs = { normal: 0, silver: 0, gold: 0, rainbow: 0, wish: 0 }
	const eggsByMode: Record<GameMode, number> = {
		mult: 0,
		div: 0,
		gap: 0,
		pairs: 0,
		feed: 0,
	}
	let legendaryByPity = 0
	let legendaryNatural = 0
	let wishBought = 0
	let wishNew = 0
	let found = 0
	let roundsAtCap = 0
	let roundsNoSink = 0
	let capWaste = 0
	let visits = 0
	let expeditions = 0
	const snapshots: Snapshot[] = []
	const newHatchRounds: number[] = []
	const wageByRound: number[] = []
	const achievementsUnlocked: Record<string, number> = {}
	let round = 0
	let day = 0
	let companion: number | null = null

	const own = (id: number) => id in save.ownedMonsters
	const unowned = (ids: Iterable<number>) => [...ids].filter((id) => !own(id))
	const mark = (key: string, cond: boolean) => {
		if (cond && !(key in goals)) goals[key] = { round, day }
	}
	const checkGoals = () => {
		const cnt = (ids: readonly number[]) => ids.filter(own).length
		mark("gates", save.unlockedStage >= STAGES.length - 1)
		mark("firstLegendary", IDS_BY_RARITY.legendary.some(own))
		mark("baseLegendary", cnt(BASE_LEG) === BASE_LEG.length)
		mark("commons", cnt(IDS_BY_RARITY.common) === IDS_BY_RARITY.common.length)
		mark("rares", cnt(IDS_BY_RARITY.rare) === IDS_BY_RARITY.rare.length)
		mark("epics", cnt(IDS_BY_RARITY.epic) === IDS_BY_RARITY.epic.length)
		for (const m of MODES)
			if (EXCLUSIVE[m].size > 0)
				mark(`excl-${m}`, unowned(EXCLUSIVE[m]).length === 0)
		for (const n of [20, 40, 60, 72, 80])
			mark(`owned${n}`, ownedCount(save.ownedMonsters) >= n)
		mark("complete", isCollectionComplete(save.ownedMonsters))
		mark(
			"village",
			BUILDINGS.every((b) => nextLevelCost(save.village, b.id) === null) &&
				save.village.decorations.length === DECORATIONS.length,
		)
		mark("cosmetics", save.cosmetics.owned.length === COSMETICS.length)
		mark("rainbow1", save.achievementStats.rainbowEggsHatched >= 1)
		mark("rainbow2", save.achievementStats.rainbowEggsHatched >= 2)
		mark("fountain", buildingLevel(save.village, "fontanna") >= 1)
		mark("zamek3", buildingLevel(save.village, "zamek") >= 3)
		mark(
			"allAchievements",
			ACHIEVEMENTS.every((a) => a.id in save.achievements),
		)
	}

	const checkAch = () => {
		const r = unlockAchievements(save, day * DAY)
		save = { ...save, achievements: r.achievements }
		for (const id of r.newlyUnlocked) {
			achievementsUnlocked[id] = round
			const c = claimAchievement(save, id)
			if (!c) continue
			const cr = credit(save.iskierki, c.reward)
			income.achievements += c.reward
			capWaste += c.reward - cr.gained
			save = { ...save, achievements: c.achievements, iskierki: cr.wallet }
		}
	}

	const rollCtx = (mode: GameMode) => {
		const idsByRarity = idsByRarityForMode(mode)
		const d = save.dreamMonsterId
		const dreamId =
			d !== null && idsByRarity[rarityOf(d)].includes(d) ? d : null
		return {
			idsByRarity,
			owned: new Set(Object.keys(save.ownedMonsters).map(Number)),
			dreamId,
			rarityOf,
			rand,
		}
	}

	const hatch = (egg: PendingEgg, idx: number) => {
		const ctx = rollCtx(egg.mode)
		let monsterId: number
		let legendaryPity = save.legendaryPity
		let viaPity = false
		if (egg.quality === "wish") monsterId = rollWish(ctx)
		else if (ctx.owned.size === 0) monsterId = FIRST_MONSTER_ID
		else {
			eggsByMode[egg.mode]++
			const shared = profile.variant === "sharedPity"
			const before = shared
				? Math.max(...MODES.map((m) => save.legendaryPity[m]))
				: save.legendaryPity[egg.mode]
			const offset =
				LEGENDARY_PITY_EVERY - (profile.pityEvery ?? LEGENDARY_PITY_EVERY)
			const r = rollMonsterWithPity(egg.quality, ctx, before + offset)
			monsterId = r.id
			const next = r.pity === 0 ? 0 : r.pity - offset
			legendaryPity = shared
				? { mult: next, div: next, gap: next, pairs: next, feed: next }
				: { ...save.legendaryPity, [egg.mode]: next }
			if (rarityOf(monsterId) === "legendary" && !ctx.owned.has(monsterId))
				viaPity = before + offset + 1 >= LEGENDARY_PITY_EVERY
		}
		eggs[egg.quality]++
		const pendingEggs = save.pendingEggs.filter((_, i) => i !== idx)
		const stats =
			egg.quality === "rainbow"
				? {
						...save.achievementStats,
						rainbowEggsHatched: save.achievementStats.rainbowEggsHatched + 1,
					}
				: save.achievementStats
		if (monsterId in save.ownedMonsters) {
			const dupAmt = dupIskierki(rarityOf(monsterId), egg.quality)
			const cr = credit(save.iskierki, dupAmt)
			income.dup += dupAmt
			capWaste += dupAmt - cr.gained
			save = {
				...save,
				pendingEggs,
				legendaryPity,
				iskierki: cr.wallet,
				achievementStats: stats,
			}
		} else {
			if (rarityOf(monsterId) === "legendary" && egg.quality !== "wish") {
				if (viaPity) legendaryByPity++
				else legendaryNatural++
			}
			if (egg.quality === "wish") wishNew++
			newHatchRounds.push(round)
			save = {
				...save,
				pendingEggs,
				legendaryPity,
				achievementStats: stats,
				ownedMonsters: {
					...save.ownedMonsters,
					[monsterId]: { hatchedAt: day * DAY + round },
				},
				dreamMonsterId:
					save.dreamMonsterId === monsterId ? null : save.dreamMonsterId,
			}
			if (companion === null) companion = monsterId
		}
	}

	// Wymarzony: nieposiadany legendarny bazowy (pula mnożeniowa), potem
	// nieposiadany ekskluzywny dowolnego trybu, potem null.
	const setDream = () => {
		if (save.dreamMonsterId !== null && !own(save.dreamMonsterId)) return
		const base = unowned(BASE_LEG)
		if (base.length) {
			save = { ...save, dreamMonsterId: pick(base, rand) }
			return
		}
		const ex = MODES.flatMap((m) => unowned(EXCLUSIVE[m]))
		save = { ...save, dreamMonsterId: ex.length ? pick(ex, rand) : null }
	}

	// Zakupy: najtańszy z {Jajko Życzeń, cel wioski, kosmetyka}; pętla póki stać.
	// Zwraca cenę najtańszej pozostałej rzeczy (null = nie ma już nic do kupienia).
	const shop = (): number | null => {
		for (let guard = 0; guard < 50; guard++) {
			const options: {
				kind: "wish" | "village" | "cosmetic"
				cost: number
				id?: string
			}[] = []
			const w = wishEgg(save)
			if (w.unlocked && w.available)
				options.push({ kind: "wish", cost: w.cost })
			for (const b of BUILDINGS) {
				const c = nextLevelCost(save.village, b.id)
				if (c !== null) options.push({ kind: "village", cost: c, id: b.id })
			}
			for (const d of DECORATIONS)
				if (!save.village.decorations.includes(d.id))
					options.push({ kind: "village", cost: d.cost, id: d.id })
			const lvl = sklepikLevel(save.village)
			for (const c of COSMETICS)
				if (c.tier <= lvl && !save.cosmetics.owned.includes(c.id))
					options.push({ kind: "cosmetic", cost: c.cost, id: c.id })
			if (options.length === 0) return null
			options.sort((a, b) => a.cost - b.cost || (a.kind === "wish" ? -1 : 0))
			const best = options[0]!
			const wallet = spend(save.iskierki, best.cost)
			if (wallet === null) return best.cost
			if (best.kind === "wish") {
				wishBought++
				spent.wish += best.cost
				save = {
					...save,
					iskierki: wallet,
					pendingEggs: [
						...save.pendingEggs,
						{ quality: "wish", mode: WISH_MODE },
					],
					achievementStats: {
						...save.achievementStats,
						wishEggsBought: save.achievementStats.wishEggsBought + 1,
					},
				}
				hatch(
					save.pendingEggs[save.pendingEggs.length - 1]!,
					save.pendingEggs.length - 1,
				)
				setDream()
			} else if (best.kind === "village") {
				spent.village += best.cost
				const bid = best.id as string
				if (BUILDINGS.some((b) => b.id === bid)) {
					const b = bid as BuildingId
					save = {
						...save,
						iskierki: wallet,
						village: {
							...save.village,
							buildings: {
								...save.village.buildings,
								[b]: buildingLevel(save.village, b) + 1,
							},
						},
					}
				} else {
					save = {
						...save,
						iskierki: wallet,
						village: {
							...save.village,
							decorations: [...save.village.decorations, bid as never],
						},
					}
				}
			} else {
				spent.cosmetics += best.cost
				const id = best.id as string
				const def = COSMETICS.find((c) => c.id === id)!
				const eq =
					companion !== null
						? {
								...save.cosmetics.equipped,
								[companion]: {
									...(save.cosmetics.equipped[companion] ?? {}),
									[def.slot]: id,
								},
							}
						: save.cosmetics.equipped
				save = {
					...save,
					iskierki: wallet,
					cosmetics: { owned: [...save.cosmetics.owned, id], equipped: eq },
				}
			}
			checkAch()
		}
		return null
	}

	const sendExpedition = () => {
		if (save.expedition !== null) return
		const owned = Object.keys(save.ownedMonsters)
			.map(Number)
			.filter((id) => id !== companion)
		if (owned.length === 0) return
		const types = EXPEDITIONS.filter((e) =>
			expeditionUnlocked(save.village, e.id),
		)
		if (types.length === 0) return
		const t = types[types.length - 1]!
		save = {
			...save,
			expedition: {
				monsterId: pick(owned, rand),
				typeId: t.id,
				roundsAtStart: save.totalRounds,
			},
		}
	}

	// Model odpowiedzi: pomyłka wg mastery faktu, gwiazdki wg profilu.
	const answerModel = (key: FactKey) => {
		const mastery = save.facts[key]?.mastery ?? 0
		const pErr = Math.min(0.6, profile.err * (1.5 - mastery))
		const correct = rand() >= pErr
		if (!correct) return { correct, factor: 1.3 }
		const u = rand()
		const p3 = profile.learn
			? profile.p3 + (0.95 - profile.p3) * mastery
			: profile.p3
		const stars =
			u < p3 ? 3 : u < p3 + (1 - p3) * 0.6 ? 2 : u < p3 + (1 - p3) * 0.9 ? 1 : 0
		return { correct, factor: [3, 2, 1.25, 0.6][stars] as number }
	}

	const answerQuestion = (rs: RoundState, now: number): RoundState => {
		const q = rs.question
		if (rs.mode === "pairs") {
			const targets = divisorPairs(q.a, save.unlockedStage)
			const factors = [...unlockedFactors(save.unlockedStage)]
			let at = rs.startedAt
			for (const t of targets) {
				const m = answerModel(t.key)
				if (!m.correct) {
					// pomyłka: para o innym iloczynie z odblokowanych liczb
					const x = pick(factors, rand)
					const ys = factors.filter((y) => x * y !== q.a)
					at += pairBudgetMs(t) * 1.3
					const s = submitPair(save, rs, x, pick(ys, rand), rand, at)
					if (s) {
						save = { ...save, ...s.patch }
						rs = s.round
					}
				}
				at += pairBudgetMs(t) * m.factor
				const s = submitPair(save, rs, t.a, t.b, rand, at)!
				save = { ...save, ...s.patch }
				rs = s.round
			}
			return rs
		}
		if (rs.mode === "feed") {
			const fact = FACTS_BY_KEY.get(q.key)!
			const rival = FACTS_BY_KEY.get(q.rival!.key)!
			const m = answerModel(q.key)
			const right = feedAnswer(q)
			const at = rs.startedAt + (budgetMs(fact) + budgetMs(rival)) * m.factor
			const s1 = submitFeed(
				save,
				rs,
				m.correct ? right : right === 0 ? 1 : 0,
				rand,
				at,
			)!
			save = { ...save, ...s1.patch }
			rs = s1.round
			if (rs.phase === "wrong")
				rs = submitFeed(save, rs, right, rand, now)!.round
			return rs
		}
		const fact = FACTS_BY_KEY.get(q.key)!
		const m = answerModel(q.key)
		const expected = expectedAnswer(q, rs.mode)
		const s1 = submitAnswer(
			save,
			{ ...rs, answer: String(m.correct ? expected : expected + 1) },
			rand,
			rs.startedAt + budgetMs(fact) * m.factor,
		)!
		save = { ...save, ...s1.patch }
		rs = s1.round
		if (rs.phase === "wrong")
			rs = submitAnswer(
				save,
				{ ...rs, answer: String(expected) },
				rand,
				now,
			)!.round
		return rs
	}

	const playRound = (mode: GameMode, now: number) => {
		let r: RoundState | null = newVisitRound(save, rand, now)
		if (r) visits++
		else r = newRound(save, mode, rand, now)
		let rs = r
		while (rs.phase !== "summary") {
			rs = answerQuestion(rs, now)
			const walletBefore = save.iskierki
			const s3 = advance(save, rs, rand, now)!
			save = { ...save, ...s3.patch }
			rs = s3.round
			if (rs.phase === "summary") {
				const gross =
					rs.wageEarned +
					(rs.visitStage !== null ? VISIT_BONUS : 0) +
					(rs.expeditionReturn?.rewardIskierki ?? 0)
				capWaste += gross - (save.iskierki - walletBefore)
			}
		}
		income.wage += rs.wageEarned
		wageByRound.push(rs.wageEarned)
		if (rs.visitStage !== null) income.visits += VISIT_BONUS
		if (rs.expeditionReturn) {
			income.expeditions += rs.expeditionReturn.rewardIskierki
			expeditions++
			if (rs.expeditionReturn.foundMonsterId !== null) {
				found++
				newHatchRounds.push(round)
			}
		}
		return rs
	}

	const pickMode = (): GameMode => {
		const avail = MODES.filter((m) => modeUnlocked(m, save.unlockedStage))
		const weights = avail.map((m) => {
			let w = profile.modeW[m] ?? 0
			if (
				profile.targeted &&
				EXCLUSIVE[m].size > 0 &&
				unowned(EXCLUSIVE[m]).length > 0
			)
				w *= 3
			return w
		})
		const total = weights.reduce((a, b) => a + b, 0)
		if (total <= 0) return "mult"
		let u = rand() * total
		for (let i = 0; i < avail.length; i++) {
			u -= weights[i]!
			if (u <= 0) return avail[i]!
		}
		return "mult"
	}

	while (round < MAX_ROUNDS) {
		day++
		if (
			profile.breakEvery &&
			day % profile.breakEvery < (profile.breakLen ?? 0)
		)
			continue
		if (rand() >= profile.pPlay) continue
		const dayStart = day * DAY
		const facts = { ...save.facts }
		for (const k of Object.keys(facts) as FactKey[])
			facts[k] = decayStats(facts[k]!, dayStart)
		save = { ...save, facts }
		for (let i = 0; i < profile.roundsPerDay && round < MAX_ROUNDS; i++) {
			round++
			const now = dayStart + i * 600_000
			playRound(pickMode(), now)
			while (save.pendingEggs.length > 0) hatch(save.pendingEggs[0]!, 0)
			checkAch()
			setDream()
			sendExpedition()
			const cheapest = shop()
			checkAch()
			if (cheapest === null) roundsNoSink++
			if (save.iskierki >= 999) roundsAtCap++
			checkGoals()
			if (SNAP_AT.includes(round))
				snapshots.push({
					round,
					day,
					owned: ownedCount(save.ownedMonsters),
					iskierki: save.iskierki,
					villageValue: villageValue(save.village),
					cosmetics: save.cosmetics.owned.length,
					stage: save.unlockedStage,
					eggs: save.eggsEarned,
				})
		}
	}
	return {
		goals,
		income,
		spent,
		eggs,
		eggsByMode,
		legendaryByPity,
		legendaryNatural,
		wishBought,
		wishNew,
		roundsAtCap,
		roundsNoSink,
		capWaste,
		rounds: round,
		days: day,
		snapshots,
		newHatchRounds,
		visits,
		expeditions,
		found,
		perfectRounds: save.achievementStats.perfectRounds,
		stars: save.achievementStats.totalStars,
		wageByRound,
		achievementsUnlocked,
	}
}

const ROT: Partial<Record<GameMode, number>> = {
	mult: 40,
	div: 15,
	gap: 15,
	pairs: 15,
	feed: 15,
}
const base = (
	name: string,
	p3: number,
	err: number,
	extra: Partial<Profile> = {},
): Profile => ({
	name,
	p3,
	err,
	modeW: ROT,
	roundsPerDay: 3,
	pPlay: 5 / 7,
	...extra,
})

export const PROFILES: Profile[] = [
	base("szybki", 0.85, 0.04),
	base("dobry", 0.6, 0.08),
	base("wolny", 0.3, 0.1),
	base("uczacy-sie", 0.3, 0.1, { learn: true }),
	base("dobry-celowany", 0.6, 0.08, { targeted: true }),
	base("dobry-3-tryby", 0.6, 0.08, { modeW: { mult: 50, div: 25, gap: 25 } }),
	base("dobry-tylko-mnozenie", 0.6, 0.08, { modeW: { mult: 100 } }),
	base("dobry-z-przerwami", 0.6, 0.08, { breakEvery: 60, breakLen: 21 }),
	base("dobry-sharedpity", 0.6, 0.08, { variant: "sharedPity" }),
	base("wolny-sharedpity", 0.3, 0.1, { variant: "sharedPity" }),
	base("szybki-sharedpity", 0.85, 0.04, { variant: "sharedPity" }),
	base("dobry-celowany-sharedpity", 0.6, 0.08, {
		targeted: true,
		variant: "sharedPity",
	}),
	base("dobry-pity6", 0.6, 0.08, { pityEvery: 6 }),
	base("dobry-sharedpity6", 0.6, 0.08, { variant: "sharedPity", pityEvery: 6 }),
	base("dobry-sharedpity5", 0.6, 0.08, { variant: "sharedPity", pityEvery: 5 }),
]

if (import.meta.main) {
	const N = Number(process.argv[2] ?? 60)
	const only = process.argv[3]
	const out: Record<string, RunResult[]> = {}
	for (const p of PROFILES) {
		if (only && p.name !== only) continue
		const t0 = Date.now()
		out[p.name] = []
		for (let i = 0; i < N; i++) out[p.name]!.push(runOne(p, 1000 + i))
		console.error(`${p.name}: ${N} runs, ${Date.now() - t0} ms`)
	}
	await Bun.write(process.argv[4] ?? "results.json", JSON.stringify(out))
	console.error(`MONSTER_COUNT=${MONSTER_COUNT}`)
}
