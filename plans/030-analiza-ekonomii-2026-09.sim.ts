// biome-ignore-all lint/style/noNonNullAssertion: skrypt analizy, nie kod gry
// Symulacja ekonomii Potworków na PRAWDZIWYCH funkcjach gry (import z repo).
// Gra pełne rundy (round.ts), wykluwa (rewards.ts), kupuje (village/cosmetics/wishEgg),
// odbiera osiągnięcia (achievements/evaluate), wysyła wyprawy, przyjmuje wizyty.
// Kalendarz dni: decay na starcie dnia jak w store.applyDecay.
// Uruchomienie: bun run plans/030-analiza-ekonomii-2026-09.sim.ts <przebiegi> "" wyniki.json
// (drugi argument = nazwa jednego profilu albo "" = wszystkie). Raport: plans/030-analiza-ekonomii-2026-09.html.

import { ACHIEVEMENTS } from "../src/achievements/catalog"
import {
	claimAchievement,
	unlockAchievements,
} from "../src/achievements/evaluate"
import { decayStats } from "../src/game/adaptive"
import {
	isCollectionComplete,
	isPoolComplete,
	ownedCount,
} from "../src/game/collection"
import { COSMETICS, sklepikLevel } from "../src/game/cosmetics"
import { EXPEDITIONS, expeditionUnlocked } from "../src/game/expeditions"
import {
	budgetMs,
	expectedAnswer,
	FACTS_BY_KEY,
	type FactKey,
	type GameMode,
	STAGES,
} from "../src/game/facts"
import {
	credit,
	dupIskierki,
	LEGENDARY_PITY_EVERY,
	type PendingEgg,
	rollMonsterWithPity,
	rollWish,
	spend,
	WISH_COST,
	WISH_COST_NO_DREAM,
	WISH_MODE,
	wishEggPrice,
} from "../src/game/rewards"
import {
	advance,
	newRound,
	newVisitRound,
	type RoundState,
	submitAnswer,
} from "../src/game/round"
import {
	BUILDINGS,
	type BuildingId,
	buildingLevel,
	DECORATIONS,
	nextLevelCost,
	villageValue,
	wishEggDiscount,
	wishEggUnlocked,
} from "../src/game/village"
import { wishEgg } from "../src/game/wishEgg"
import {
	DIVISION_ONLY_IDS,
	FIRST_MONSTER_ID,
	GAP_ONLY_IDS,
	IDS_BY_RARITY,
	idsByRarityForMode,
	mulberry32,
	rarityOf,
} from "../src/monsters/catalog"
import { INITIAL_SAVE, type SaveState } from "../src/store/schema"

export interface Profile {
	name: string
	p3: number // P(3★ | poprawna)
	err: number // bazowa szansa pomyłki (skalowana mastery)
	modeW: [number, number, number] // wagi mult/div/gap
	roundsPerDay: number
	pPlay: number // szansa, że danego dnia dziecko gra
	variant?: "pity8" | "p1b" | "bilet" | "bilet+pity8"
	learn?: boolean // p3 rośnie z mastery (dziecko przyspiesza, gdy umie)
	breakEvery?: number // co ile dni przerwa (wakacje)
	breakLen?: number
}

const BASE_LEG = IDS_BY_RARITY.legendary.filter(
	(id) => !DIVISION_ONLY_IDS.has(id) && !GAP_ONLY_IDS.has(id),
)
const DAY = 86_400_000
const MAX_ROUNDS = 800

export interface RunResult {
	goals: Record<string, { round: number; day: number } | null>
	income: Record<string, number>
	spent: Record<string, number>
	eggs: Record<string, number>
	legendaryByPity: number
	legendaryNatural: number
	wishBought: number
	wishNew: number
	roundsAtCap: number
	roundsNoSink: number
	capWaste: number
	bilety: number
	rounds: number
	days: number
	snapshots: Snapshot[]
	newHatchRounds: number[] // rundy, w których wykluł się NOWY potworek
	visits: number
	expeditions: number
	perfectRounds: number
	stars: number
	wageByRound: number[] // żołd per runda (do średnich per faza)
	achievementsUnlocked: Record<string, number> // id → runda odblokowania
	mastery: Record<string, number | null> // all55@t / f7@t / f8@t / n30@t → runda; maxAll80 = maks. liczba faktów ≥0.8 naraz
	everMastered80: number // ile faktów kiedykolwiek ≥ 0.8 (high-water)
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
	10, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 500, 600, 800,
]

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
	const spent = { wish: 0, village: 0, cosmetics: 0, bilet: 0 }
	const eggs = { normal: 0, silver: 0, gold: 0, rainbow: 0, wish: 0 }
	let legendaryByPity = 0,
		legendaryNatural = 0,
		wishBought = 0,
		wishNew = 0
	let roundsAtCap = 0,
		roundsNoSink = 0,
		capWaste = 0,
		bilety = 0,
		visits = 0,
		expeditions = 0
	const pityOffset = profile.variant?.includes("pity8")
		? LEGENDARY_PITY_EVERY - 8
		: 0
	const targetMode = (): GameMode | null => {
		const un = (ids: Iterable<number>) =>
			[...ids].some((id) => !(id in save.ownedMonsters))
		if (un(DIVISION_ONLY_IDS) && un(GAP_ONLY_IDS))
			return save.legendaryPity.div >= save.legendaryPity.gap ? "div" : "gap"
		return un(DIVISION_ONLY_IDS) ? "div" : un(GAP_ONLY_IDS) ? "gap" : null
	}
	const snapshots: Snapshot[] = []
	const newHatchRounds: number[] = []
	const wageByRound: number[] = []
	const achievementsUnlocked: Record<string, number> = {}
	const masteryGoal: Record<string, number | null> = {
		"all55@0.65": null,
		"all55@0.7": null,
		"all55@0.8": null,
		"f7@0.65": null,
		"f7@0.8": null,
		"f8@0.65": null,
		"f8@0.8": null,
		"n30@0.65": null,
		"n30@0.8": null,
		maxAll80: 0,
	}
	const ever80 = new Set<string>()
	const trackMastery = () => {
		const m = (k: string) => save.facts[k as FactKey]?.mastery ?? 0
		const keys = [...FACTS_BY_KEY.keys()]
		for (const k of keys) if (m(k) >= 0.8) ever80.add(k)
		const cnt = (t: number, f?: number) =>
			keys.filter((k) => {
				const [a, b] = k.split("x").map(Number)
				return (f === undefined || a === f || b === f) && m(k) >= t
			}).length
		masteryGoal.maxAll80 = Math.max(masteryGoal.maxAll80 ?? 0, cnt(0.8))
		const set = (key: string, cond: boolean) => {
			if (cond && masteryGoal[key] === null) masteryGoal[key] = round
		}
		set("all55@0.65", cnt(0.65) === 55)
		set("all55@0.7", cnt(0.7) === 55)
		set("all55@0.8", cnt(0.8) === 55)
		set("f7@0.65", cnt(0.65, 7) === 10)
		set("f7@0.8", cnt(0.8, 7) === 10)
		set("f8@0.65", cnt(0.65, 8) === 10)
		set("f8@0.8", cnt(0.8, 8) === 10)
		set("n30@0.65", cnt(0.65) >= 30)
		set("n30@0.8", cnt(0.8) >= 30)
	}
	let round = 0,
		day = 0
	let companion: number | null = null

	const mark = (key: string, cond: boolean) => {
		if (cond && !(key in goals)) goals[key] = { round, day }
	}
	const checkGoals = () => {
		const own = (id: number) => id in save.ownedMonsters
		const cnt = (ids: readonly number[]) => ids.filter(own).length
		mark("gates", save.unlockedStage >= STAGES.length - 1)
		mark("firstLegendary", IDS_BY_RARITY.legendary.some(own))
		mark("baseLegendary", cnt(BASE_LEG) === BASE_LEG.length)
		mark("commons", cnt(IDS_BY_RARITY.common) === IDS_BY_RARITY.common.length)
		mark("rares", cnt(IDS_BY_RARITY.rare) === IDS_BY_RARITY.rare.length)
		mark("epics", cnt(IDS_BY_RARITY.epic) === IDS_BY_RARITY.epic.length)
		mark("div4", cnt([...DIVISION_ONLY_IDS]) === 4)
		mark("gap4", cnt([...GAP_ONLY_IDS]) === 4)
		mark("owned20", ownedCount(save.ownedMonsters) >= 20)
		mark("owned40", ownedCount(save.ownedMonsters) >= 40)
		mark("owned60", ownedCount(save.ownedMonsters) >= 60)
		mark("all80", isCollectionComplete(save.ownedMonsters))
		mark(
			"village",
			BUILDINGS.every((b) => nextLevelCost(save.village, b.id) === null) &&
				save.village.decorations.length === DECORATIONS.length,
		)
		mark("cosmetics", save.cosmetics.owned.length === COSMETICS.length)
		mark("rainbow1", save.achievementStats.rainbowEggsHatched >= 1)
		mark("rainbow3", save.achievementStats.rainbowEggsHatched >= 3)
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
			const before = save.legendaryPity[egg.mode]
			const r = rollMonsterWithPity(egg.quality, ctx, before + pityOffset)
			monsterId = r.id
			legendaryPity = {
				...save.legendaryPity,
				[egg.mode]: r.pity === 0 ? 0 : r.pity - pityOffset,
			}
			if (rarityOf(monsterId) === "legendary" && !ctx.owned.has(monsterId)) {
				viaPity = before + pityOffset + 1 >= LEGENDARY_PITY_EVERY
			}
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

	// Polityka wymarzonego: nieposiadany legendarny bazowy (pula mnożeniowa); potem
	// nieposiadany ekskluzywny trybu, w który dziecko gra najczęściej poza mult; potem null.
	const setDream = () => {
		if (
			save.dreamMonsterId !== null &&
			!(save.dreamMonsterId in save.ownedMonsters)
		)
			return
		const un = (ids: readonly number[]) =>
			ids.filter((id) => !(id in save.ownedMonsters))
		const base = un(BASE_LEG)
		if (base.length) {
			save = { ...save, dreamMonsterId: pick(base, rand) }
			return
		}
		const ex = un([...DIVISION_ONLY_IDS, ...GAP_ONLY_IDS])
		save = { ...save, dreamMonsterId: ex.length ? pick(ex, rand) : null }
	}

	// Zakupy: najtańszy z {Jajko Życzeń, cel wioski, kosmetyka}; pętla póki stać.
	const shop = () => {
		for (let guard = 0; guard < 50; guard++) {
			const options: {
				kind: "wish" | "village" | "cosmetic" | "bilet"
				cost: number
				id?: string
				mode?: GameMode
			}[] = []
			const w = wishEgg(save)
			if (profile.variant === "p1b") {
				const tm = targetMode() ?? WISH_MODE
				if (
					wishEggUnlocked(save.village) &&
					!isPoolComplete(save.ownedMonsters, tm)
				) {
					const d = save.dreamMonsterId
					const base =
						d !== null &&
						!(d in save.ownedMonsters) &&
						idsByRarityForMode(tm)[rarityOf(d)].includes(d)
							? WISH_COST[rarityOf(d)]
							: WISH_COST_NO_DREAM
					options.push({
						kind: "wish",
						cost: wishEggPrice(
							base,
							save.achievementStats.wishEggsBought,
							wishEggDiscount(save.village),
						),
						mode: tm,
					})
				}
			} else if (w.unlocked && w.available)
				options.push({ kind: "wish", cost: w.cost, mode: WISH_MODE })
			if (profile.variant?.startsWith("bilet")) {
				const tm = targetMode()
				if (
					tm &&
					save.legendaryPity[tm] < LEGENDARY_PITY_EVERY - 1 - pityOffset &&
					wishEggUnlocked(save.village)
				)
					options.push({ kind: "bilet", cost: 150, mode: tm })
			}
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
			if (best.kind === "bilet") {
				bilety++
				spent.bilet += best.cost
				save = {
					...save,
					iskierki: wallet,
					legendaryPity: {
						...save.legendaryPity,
						[best.mode as GameMode]: LEGENDARY_PITY_EVERY - 1 - pityOffset,
					},
				}
			} else if (best.kind === "wish") {
				wishBought++
				spent.wish += best.cost
				save = {
					...save,
					iskierki: wallet,
					pendingEggs: [
						...save.pendingEggs,
						{ quality: "wish", mode: best.mode as GameMode },
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
				// zakłada na przyjaciela (osiągnięcie „wystrojony")
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

	const playRound = (mode: GameMode, now: number) => {
		let r: RoundState | null = newVisitRound(save, rand, now)
		if (r) visits++
		else r = newRound(save, mode, rand, now)
		let rs = r
		while (rs.phase !== "summary") {
			const fact = FACTS_BY_KEY.get(rs.question.key)!
			const mastery = save.facts[rs.question.key as FactKey]?.mastery ?? 0
			const pErr = Math.min(0.6, profile.err * (1.5 - mastery))
			const correct = rand() >= pErr
			let elapsed: number
			if (correct) {
				const u = rand()
				const p3 = profile.learn
					? profile.p3 + (0.95 - profile.p3) * mastery
					: profile.p3
				const stars =
					u < p3
						? 3
						: u < profile.p3 + (1 - profile.p3) * 0.6
							? 2
							: u < profile.p3 + (1 - profile.p3) * 0.9
								? 1
								: 0
				elapsed = budgetMs(fact) * ([3, 2, 1.25, 0.6][stars] as number)
			} else elapsed = budgetMs(fact) * 1.3
			const expected = expectedAnswer(rs.question, rs.mode)
			const ans = String(correct ? expected : expected + 1)
			const s1 = submitAnswer(
				save,
				{ ...rs, answer: ans },
				rand,
				rs.startedAt + elapsed,
			)!
			save = { ...save, ...s1.patch }
			rs = s1.round
			if (rs.phase === "wrong") {
				const s2 = submitAnswer(
					save,
					{ ...rs, answer: String(expected) },
					rand,
					now,
				)!
				rs = s2.round
			}
			const walletBefore = save.iskierki
			const s3 = advance(save, rs, rand, now)!
			save = { ...save, ...s3.patch }
			rs = s3.round
			if (rs.phase === "summary") {
				const gross =
					rs.wageEarned +
					(rs.visitStage !== null ? 2 : 0) +
					(rs.expeditionReturn?.rewardIskierki ?? 0)
				capWaste += gross - (save.iskierki - walletBefore)
			}
		}
		const wageBefore = income.wage
		income.wage += rs.wageEarned
		if (rs.visitStage !== null) income.visits += 2
		if (rs.expeditionReturn) {
			income.expeditions += rs.expeditionReturn.rewardIskierki
			expeditions++
		}
		wageByRound.push(income.wage - wageBefore)
		return rs
	}

	const modes: GameMode[] = ["mult", "div", "gap"]
	const pickMode = () => {
		let u = rand() * (profile.modeW[0] + profile.modeW[1] + profile.modeW[2])
		for (let i = 0; i < 3; i++) {
			u -= profile.modeW[i]!
			if (u <= 0) return modes[i]!
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
		// decay na starcie sesji (store.applyDecay)
		const facts = { ...save.facts }
		for (const k of Object.keys(facts) as FactKey[])
			facts[k] = decayStats(facts[k]!, dayStart)
		save = { ...save, facts }
		for (let i = 0; i < profile.roundsPerDay && round < MAX_ROUNDS; i++) {
			round++
			const now = dayStart + i * 600_000
			const rs = playRound(pickMode(), now)
			void rs
			// po rundzie: wyklucia, osiągnięcia, wymarzony, wyprawa, zakupy
			while (save.pendingEggs.length > 0) hatch(save.pendingEggs[0]!, 0)
			checkAch()
			setDream()
			sendExpedition()
			const cheapest = shop()
			checkAch()
			if (cheapest === null) roundsNoSink++
			if (save.iskierki >= 999) roundsAtCap++
			checkGoals()
			trackMastery()
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
		legendaryByPity,
		legendaryNatural,
		wishBought,
		wishNew,
		roundsAtCap,
		roundsNoSink,
		capWaste,
		bilety,
		rounds: round,
		days: day,
		snapshots,
		newHatchRounds,
		visits,
		expeditions,
		perfectRounds: save.achievementStats.perfectRounds,
		stars: save.achievementStats.totalStars,
		wageByRound,
		achievementsUnlocked,
		mastery: masteryGoal,
		everMastered80: ever80.size,
	}
}

export const PROFILES: Profile[] = [
	{
		name: "szybki",
		p3: 0.85,
		err: 0.04,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
	},
	{
		name: "dobry",
		p3: 0.6,
		err: 0.08,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
	},
	{
		name: "wolny",
		p3: 0.3,
		err: 0.1,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
	},
	{
		name: "uczacy-sie",
		p3: 0.3,
		err: 0.1,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
		learn: true,
	},
	{
		name: "dobry-err2",
		p3: 0.6,
		err: 0.02,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
	},
	{
		name: "dobry-celowany",
		p3: 0.6,
		err: 0.08,
		modeW: [20, 40, 40],
		roundsPerDay: 3,
		pPlay: 5 / 7,
	},
	{
		name: "dobry-tylko-mnozenie",
		p3: 0.6,
		err: 0.08,
		modeW: [100, 0, 0],
		roundsPerDay: 3,
		pPlay: 5 / 7,
	},
	{
		name: "dobry-z-przerwami",
		p3: 0.6,
		err: 0.08,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
		breakEvery: 60,
		breakLen: 21,
	},
	{
		name: "dobry-pity8",
		p3: 0.6,
		err: 0.08,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
		variant: "pity8",
	},
	{
		name: "dobry-p1b",
		p3: 0.6,
		err: 0.08,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
		variant: "p1b",
	},
	{
		name: "dobry-bilet",
		p3: 0.6,
		err: 0.08,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
		variant: "bilet",
	},
	{
		name: "wolny-bilet",
		p3: 0.3,
		err: 0.1,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
		variant: "bilet",
	},
	{
		name: "dobry-bilet+pity8",
		p3: 0.6,
		err: 0.08,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
		variant: "bilet+pity8",
	},
	{
		name: "szybki-bilet",
		p3: 0.85,
		err: 0.04,
		modeW: [50, 25, 25],
		roundsPerDay: 3,
		pPlay: 5 / 7,
		variant: "bilet",
	},
]

if (import.meta.main) {
	const N = Number(process.argv[2] ?? 60)
	const only = process.argv[3]
	const out: Record<string, RunResult[]> = {}
	for (const p of PROFILES) {
		if (only && p.name !== only) continue
		const t0 = Date.now()
		out[p.name] = []
		for (let i = 0; i < N; i++) out[p.name]?.push(runOne(p, 1000 + i))
		console.error(`${p.name}: ${N} runs, ${Date.now() - t0} ms`)
	}
	await Bun.write(process.argv[4] ?? "results.json", JSON.stringify(out))
}
