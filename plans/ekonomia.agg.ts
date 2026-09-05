// biome-ignore-all lint/style/noNonNullAssertion: skrypt analizy, nie kod gry
// Agregacja wyników plans/ekonomia.sim.ts do podsumowania (mediany, p10–p90,
// odsetki, krzywe) osadzanego w raportach HTML.
// Uruchomienie: bun run plans/ekonomia.agg.ts wyniki.json podsumowanie.json
import { ACHIEVEMENTS } from "../src/achievements/catalog"
import type { RunResult } from "./ekonomia.sim"

const data = JSON.parse(
	await Bun.file(process.argv[2] ?? "results.json").text(),
) as Record<string, RunResult[]>

const q = (arr: number[], p: number) => {
	if (arr.length === 0) return null
	const s = [...arr].sort((a, b) => a - b)
	return s[Math.min(s.length - 1, Math.floor(p * s.length))]!
}
const med = (arr: number[]) => q(arr, 0.5)
const mean = (arr: number[]) =>
	arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

const BUCKETS: [string, number][] = [
	["1-20", 20],
	["21-40", 40],
	["41-60", 60],
	["61-72", 72],
	["73-88", 88],
]

const out: Record<string, unknown> = {}
for (const [name, runs] of Object.entries(data)) {
	const N = runs.length
	const goalKeys = [...new Set(runs.flatMap((r) => Object.keys(r.goals)))]
	const goals: Record<string, unknown> = {}
	for (const g of goalKeys) {
		const hit = runs.filter((r) => r.goals[g])
		const rounds = hit.map((r) => r.goals[g]!.round)
		const days = hit.map((r) => r.goals[g]!.day)
		goals[g] = {
			reached: hit.length / N,
			r50: med(rounds),
			r10: q(rounds, 0.1),
			r90: q(rounds, 0.9),
			d50: med(days),
			d10: q(days, 0.1),
			d90: q(days, 0.9),
		}
	}
	const gapsByBucket: Record<string, number[]> = Object.fromEntries(
		BUCKETS.map(([k]) => [k, []]),
	)
	for (const r of runs) {
		const h = r.newHatchRounds
		for (let i = 1; i < h.length; i++) {
			const n = i + 1
			const b = BUCKETS.find(([, max]) => n <= max)?.[0] ?? "73-88"
			gapsByBucket[b]!.push(h[i]! - h[i - 1]!)
		}
	}
	const hatchGaps = Object.fromEntries(
		Object.entries(gapsByBucket).map(([k, v]) => [
			k,
			{ med: med(v), p90: q(v, 0.9), mean: +mean(v).toFixed(1) },
		]),
	)
	const snapRounds = [
		...new Set(runs.flatMap((r) => r.snapshots.map((s) => s.round))),
	].sort((a, b) => a - b)
	const curve = snapRounds.map((round) => {
		const ss = runs
			.map((r) => r.snapshots.find((s) => s.round === round))
			.filter(Boolean) as RunResult["snapshots"]
		const col = <K extends keyof RunResult["snapshots"][number]>(k: K) =>
			med(ss.map((s) => s[k] as number))
		return {
			round,
			day: col("day"),
			owned: col("owned"),
			owned10: q(
				ss.map((s) => s.owned),
				0.1,
			),
			owned90: q(
				ss.map((s) => s.owned),
				0.9,
			),
			iskierki: col("iskierki"),
			villageValue: col("villageValue"),
			cosmetics: col("cosmetics"),
			stage: col("stage"),
			eggs: col("eggs"),
		}
	})
	const sumKeys = (k: "income" | "spent" | "eggs" | "eggsByMode") => {
		const keys = Object.keys(runs[0]![k])
		return Object.fromEntries(
			keys.map((key) => [
				key,
				Math.round(
					mean(runs.map((r) => (r[k] as Record<string, number>)[key] ?? 0)),
				),
			]),
		)
	}
	const wagePhase = (lo: number, hi: number) =>
		+mean(runs.flatMap((r) => r.wageByRound.slice(lo, hi))).toFixed(2)
	const m1 = (f: (r: RunResult) => number) => +mean(runs.map(f)).toFixed(1)
	out[name] = {
		N,
		goals,
		hatchGaps,
		curve,
		income: sumKeys("income"),
		spent: sumKeys("spent"),
		eggs: sumKeys("eggs"),
		eggsByMode: sumKeys("eggsByMode"),
		legendaryByPity: m1((r) => r.legendaryByPity),
		legendaryNatural: m1((r) => r.legendaryNatural),
		wishBought: m1((r) => r.wishBought),
		wishNew: m1((r) => r.wishNew),
		roundsAtCap: Math.round(mean(runs.map((r) => r.roundsAtCap))),
		roundsNoSink: Math.round(mean(runs.map((r) => r.roundsNoSink))),
		capWaste: Math.round(mean(runs.map((r) => r.capWaste))),
		rounds: runs[0]!.rounds,
		days: Math.round(mean(runs.map((r) => r.days))),
		visits: m1((r) => r.visits),
		expeditions: m1((r) => r.expeditions),
		found: m1((r) => r.found),
		perfectRounds: m1((r) => r.perfectRounds),
		stars: Math.round(mean(runs.map((r) => r.stars))),
		wagePhase: {
			early: wagePhase(0, 50),
			mid: wagePhase(50, 150),
			late: wagePhase(150, 300),
			end: wagePhase(300, 1000),
		},
		achievements: Object.fromEntries(
			ACHIEVEMENTS.map((a) => [
				a.id,
				{
					title: a.title,
					difficulty: a.difficulty,
					rate: mean(runs.map((r) => (r.achievementsUnlocked[a.id] ? 1 : 0))),
					r50: med(
						runs
							.map((r) => r.achievementsUnlocked[a.id] ?? 0)
							.filter((x) => x > 0),
					),
				},
			]),
		),
	}
}
await Bun.write(process.argv[3] ?? "summary.json", JSON.stringify(out, null, 1))
console.log(Object.keys(out).join(", "))
