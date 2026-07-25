# Plan 025: Wspólny helper finalizacji rundy (nextQuestion / debugFinishRound / debugSimulateRound) + fix licznika wizyt w debug

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a0d75aa..HEAD -- src/store/store.ts src/store/store.test.ts src/store/CLAUDE.md`
> Expected drift if plans 020/023 landed first: 020 guards `setCompanion`
> and adds a test; 023 adds two tests + refreshes the Verification doc
> section. That drift is EXPECTED, not a STOP. Any OTHER change to the
> excerpts below is a STOP.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read root `CLAUDE.md`,
> `src/CLAUDE.md` and `src/store/CLAUDE.md` before editing. Step 6 is the
> DOX pass.
>
> **Prerequisite ordering**: land AFTER plan 023 (its triple-cap test is
> part of the safety net this refactor relies on).

## Status

- **Priority**: P2 (debt — the drift this finding predicted has already
  happened once, see "Why")
- **Effort**: M
- **Risk**: MED (core money/progress path; mitigated by the strongest test
  section in the repo — wage/visit/expedition/cap tests all green before
  and after)
- **Depends on**: 023 (test net), benefits from 020 landing first
- **Category**: tech debt + correctness (one real divergence fixed)
- **Planned at**: commit `a0d75aa`, 2026-07-12

## Why this matters

Round finalization exists in THREE copies in `src/store/store.ts`:
`nextQuestion`'s end-of-round branch, `debugFinishRound`, and
`debugSimulateRound`. Each re-encodes: settle the expedition, bump
`achievementStats` counters, `totalRounds + 1`, and a single
`Math.min(ISKIERKI_CAP, …)` wallet cap. The copies have *deliberate*
divergences (debug paths pay no visit bonus), which makes *accidental*
divergence invisible — and it has already happened:

**`debugFinishRound` bumps `visitRoundsCompleted`, violating its own
comment and the documented contract.** The inline comment right above the
bump says "rundy-wizyty liczą się tylko na realnej ścieżce finalizacji
(debugFinishRound świadomie pomija — jak bonus wizyty)", and
`src/store/CLAUDE.md` (v13→v14 bullet) says the counter grows "wyłącznie w
realnej finalizacji `nextQuestion`… ścieżki debug świadomie pomijają". Yet
the code bumps it.

CORRECTION (2026-07-12, reviewer, after the first execution attempt): the
whole counter — schema v13→v14, BOTH store bumps, the real-path test AND
the CLAUDE.md bullet — landed in ONE commit, `a5843aa`. So:
(a) a real-path test ALREADY EXISTS (`store.test.ts` "visitRoundsCompleted:
rośnie po rundzie-wizycie, nie po zwykłej") — Step 5's first test is
REDUNDANT, add only the debug-path test;
(b) no test asserts the debug-path bump, and the doc + inline comment
(both written in the same commit as the code) agree the debug path should
skip — so removing the bump remains the correct resolution;
(c) NUANCE FOR THE MAINTAINER: `debugFinishRound` deliberately bumps
`totalStars`/`perfectRounds` "by dało się przetestować z ekranu debug", so
the author MIGHT have intended the same for visit rounds and merely
pasted a stale comment. If the maintainer wants debug-testable visit
achievements, the alternative fix is to keep the bump and update the
comment + CLAUDE.md instead. This plan implements the doc-as-written
(remove the bump); the maintainer can veto in review.

## Current state

Verified at `a0d75aa`. Three finalization sites in `src/store/store.ts`:

**A) `nextQuestion` end-of-round branch (≈`:614-682`)** — the real path:

```ts
const settled = settleExpedition(state)
const achievementStats = bumpDaysPlayed(
	{
		...state.achievementStats,
		perfectRounds:
			state.achievementStats.perfectRounds +
			(round.stars === MAX_STARS_PER_ROUND ? 1 : 0),
		expeditionsCompleted:
			state.achievementStats.expeditionsCompleted +
			(settled.expeditionReturn !== null ? 1 : 0),
		visitRoundsCompleted:
			state.achievementStats.visitRoundsCompleted +
			(round.visitStage !== null ? 1 : 0),
	},
	now,
)
set({
	unlockedStage,
	totalRounds: state.totalRounds + 1,
	iskierki: Math.min(
		ISKIERKI_CAP,
		state.iskierki + wageEarned + visitBonus + settled.reward,
	),
	achievementStats,
	expedition: settled.expedition,
	round: { ...round, phase: "summary", asked, unlockedThisRound,
		wageEarned, expeditionReturn: settled.expeditionReturn },
})
```

**B) `debugSimulateRound` (≈`:1009-1045`)** — silent debug path; note
`o.iskierki` from `simulateRoundOutcome` ALREADY contains the wage and
rainbow iskierki:

```ts
const settled = settleExpedition(state)
set({
	facts: o.facts, eggFragments: o.eggFragments, eggStarBank: o.eggStarBank,
	eggsEarned: o.eggsEarned, pendingEggs: o.pendingEggs,
	iskierki: Math.min(ISKIERKI_CAP, o.iskierki + settled.reward),
	unlockedStage: o.unlockedStage,
	totalRounds: state.totalRounds + 1,
	expedition: settled.expedition,
	achievementStats: bumpDaysPlayed(
		{
			...state.achievementStats,
			expeditionsCompleted:
				state.achievementStats.expeditionsCompleted +
				(settled.expeditionReturn !== null ? 1 : 0),
		},
		Date.now(),
	),
})
```

**C) `debugFinishRound` (≈`:1049-1109`)** — debug path with full summary
events; bumps `totalStars`/`perfectRounds`/`expeditionsCompleted` AND
(wrongly, see Why) `visitRoundsCompleted`:

```ts
achievementStats: bumpDaysPlayed(
	{
		...state.achievementStats,
		totalStars: state.achievementStats.totalStars + totalStars,
		perfectRounds:
			state.achievementStats.perfectRounds +
			(totalStars === MAX_STARS_PER_ROUND ? 1 : 0),
		expeditionsCompleted:
			state.achievementStats.expeditionsCompleted +
			(settled.expeditionReturn !== null ? 1 : 0),
		// rundy-wizyty liczą się tylko na realnej ścieżce finalizacji
		// (debugFinishRound świadomie pomija — jak bonus wizyty)
		visitRoundsCompleted:
			state.achievementStats.visitRoundsCompleted +
			(round.visitStage !== null ? 1 : 0),
	},
	Date.now(),
),
```

All three also call `get().checkAchievements()` after the `set`.

## Design (encoded in this plan)

Extract a module-level pure helper in `store.ts` (near
`settleExpedition`), NOT in `src/game/` — event counters and wallet are
store domain per the DOX split:

```ts
// Wspólne domknięcie rundy dla trzech ścieżek finalizacji (nextQuestion /
// debugFinishRound / debugSimulateRound): rozstrzygnięta wyprawa, JEDEN
// wspólny cap portfela, totalRounds, liczniki dni i wypraw. Rozmyślne
// RÓŻNICE ścieżek (bonus wizyty, totalStars, visitRoundsCompleted — tylko
// realna gra) wchodzą przez argumenty, więc są widoczne w miejscu wywołania.
function roundClosePatch(
	state: GameState, // or the appropriate store-state type used in store.ts
	settled: ReturnType<typeof settleExpedition>,
	iskierkiBeforeCap: number, // pełny dochód rundy PRZED capem (bez nagrody wyprawy)
	counterBumps: Partial<AchievementCounters>,
	now: number,
) {
	return {
		iskierki: Math.min(ISKIERKI_CAP, iskierkiBeforeCap + settled.reward),
		totalRounds: state.totalRounds + 1,
		expedition: settled.expedition,
		achievementStats: bumpDaysPlayed(
			{
				...state.achievementStats,
				...counterBumps,
				expeditionsCompleted:
					state.achievementStats.expeditionsCompleted +
					(settled.expeditionReturn !== null ? 1 : 0),
			},
			now,
		),
	}
}
```

Callers then spread `...roundClosePatch(...)` into their `set` alongside
their path-specific fields:

- **A** passes `state.iskierki + wageEarned + visitBonus` and bumps
  `{ perfectRounds: …, visitRoundsCompleted: … }` (computed at the call
  site from `round`).
- **B** passes `o.iskierki` and bumps `{}` (nothing path-specific).
- **C** passes `o.iskierki` and bumps `{ totalStars: …, perfectRounds: … }`
  — **and drops `visitRoundsCompleted` entirely**, fixing the contract
  violation. Keep (move) the explanatory comment to the call site.

Match exact types to what the file actually uses (read the surrounding
code; `AchievementCounters` lives in `store/schema.ts`). If a
`Partial<AchievementCounters>` of *absolute* values reads awkwardly
against "bump" semantics, an equally acceptable shape is passing the fully
built counters object minus the shared fields — pick whichever produces
the cleaner diff, but the cap/totalRounds/expedition/daysPlayed/
expeditionsCompleted lines must exist in exactly ONE place afterwards.

## Steps

1. Read the three sites in full in the live file (they may sit at
   slightly different lines if 020/023 landed). Confirm they match the
   excerpts modulo those plans.
2. Add `roundClosePatch` and refactor site **A** only. Run
   `bun test src/store` → green (the wage/visit/expedition/cap and
   triple-cap tests are the net).
3. Refactor site **B**. `bun test src/store` → green (the "ciche
   rozstrzygnięcie debugSimulateRound" tests cover it).
4. Refactor site **C**, removing the `visitRoundsCompleted` bump. Run
   `bun test src/store` → green ("parytet debugFinishRound" tests cover
   the expedition part).
5. **Add ONE test** in `store.test.ts` (visit-round section), freezing
   the fixed contract (the real-path test already exists — see the
   CORRECTION above; extend it or add a sibling, don't duplicate):
   - debug path: start a visit round (`startVisitRound()`), then
     `debugFinishRound(30)` → `visitRoundsCompleted` stays 0 (and, per
     the existing contract, iskierki got no `VISIT_BONUS`).
6. **DOX pass — `src/store/CLAUDE.md`**: in the bullets describing the
   mirrors (żołd/wizyta/wyprawy), add one clause that the three
   finalization paths share `roundClosePatch` (wspólny cap, totalRounds,
   rozstrzygnięcie wyprawy, dni; różnice ścieżek jawne w argumentach), and
   append the two new tests to the Verification section. The existing
   "debug świadomie pomija" statements are now true again — leave them.
7. Full gate: `bun test` (green, ≥2 new), `bun run typecheck` (0),
   `bun run check` (or `bun run verify` if plan 022 landed).

## Done criteria (machine-checkable)

- `grep -c "Math.min(\s*ISKIERKI_CAP" src/store/store.ts` (or equivalent
  multiline grep) → the end-of-round cap appears ONCE (in the helper);
  other `ISKIERKI_CAP` uses (buy actions, checkAchievements, migrations)
  are out of scope and remain.
- `grep -n "visitRoundsCompleted" src/store/store.ts` → hits only in the
  real-path call site (A) — none inside `debugFinishRound`.
- `bun test` green including the one new debug-path test (≥315, baseline
  314); `bun run typecheck` 0; biome clean.

## Out of scope — do NOT touch

- `simulateRoundOutcome` in `src/game/debug.ts` — the pure sim stays
  NIETKNIĘTY (documented contract: store wraps it).
- `pressConfirm` / egg economy / `addEggFragment` — different commit
  point, not part of finalization.
- The deliberate debug divergences OTHER than the visit counter: debug
  paths still pay no `VISIT_BONUS`; `debugSimulateRound` still bumps no
  `totalStars`/`perfectRounds`… wait — it never did; `debugFinishRound`
  does. Preserve each path's current counter behavior EXCEPT the
  `visitRoundsCompleted` removal in C.
- `schema.ts` — zero save-shape changes.

## Maintenance note

New end-of-round income or counters go through `roundClosePatch` (shared)
or its `counterBumps` argument (path-specific) — never by editing one of
the three callers alone. The 023 triple-cap test plus the two tests added
here are the tripwires.

## STOP conditions

- The live code at any of the three sites diverges from the excerpts
  beyond plans 020/023's documented footprint.
- Any existing test goes red during steps 2–4 — do not "fix" the test;
  revert the step and report (the tests encode paid-out behavior).
- You find a FOURTH finalization copy (e.g. a new action landed) — report;
  the helper design may need to account for it.
