# Plan 004: Move debug-round simulation out of the store into `src/game/debug.ts`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3398a0d..HEAD -- src/store/store.ts`
> If `src/store/store.ts` changed since this plan was written, compare the
> "Current state" excerpts against the live code before moving anything; on a
> mismatch, treat it as a STOP condition.
>
> **DOX (this repo)**: This repo uses a binding `CLAUDE.md` hierarchy ("DOX").
> Read `CLAUDE.md` (root), `src/CLAUDE.md`, `src/game/CLAUDE.md`, and
> `src/store/CLAUDE.md` before editing — they are contracts. This plan changes
> the Ownership of `src/game/CLAUDE.md` (new file) and the simulation
> description in `src/store/CLAUDE.md`; update both in Step 5.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (behavior must stay identical; touches a load-bearing store file)
- **Depends on**: `plans/001-fix-broken-build.md` (done criteria run `typecheck`),
  `plans/003-test-baseline.md` (this plan adds tests using that harness)
- **Category**: tech-debt
- **Planned at**: commit `3398a0d`, 2026-06-14

## Why this matters

`src/store/CLAUDE.md` states the contract: "Logika domenowa należy do `src/game/`
i `src/monsters/` — akcje store mają pozostać cienkimi koordynatorami" (domain
logic belongs in `src/game/`; store actions stay thin coordinators). Two pure
domain functions violate it by living in the store: `distributeStars`
(`store.ts:109-118`) and `simulateRoundOutcome` (`store.ts:124-190`). They are
also currently **impure** — they call `Date.now()` and `Math.random()` inside —
which breaks the `src/game/` purity contract ("Moduły muszą pozostać czyste i
deterministyczne poza wstrzykiwanym `rand`"). Moving them to `src/game/debug.ts`
and injecting `rand`/`now` (1) honors both contracts, and (2) makes them
unit-testable (today they cannot be tested — they are module-private and
non-deterministic). The behavior must remain byte-for-byte identical: the store
keeps passing `Math.random` and `Date.now()`, just as arguments now.

## Current state

`src/store/store.ts` defines, near the top, two module-private functions and
calls `simulateRoundOutcome` from two debug actions.

`store.ts:107-118` — pure, no external state:
```ts
// Rozkłada sumę gwiazdek na n pytań (każde 0..3): jak najwięcej trójek (szybkie
// odpowiedzi → większy przyrost mastery), reszta wolniej. Dla debug-symulacji rundy.
function distributeStars(total: number, n: number): number[] {
	const q = new Array<number>(n).fill(3)
	let excess = n * 3 - total
	for (let i = 0; i < n && excess > 0; i++) {
		const cut = Math.min(3, excess)
		q[i] = 3 - cut
		excess -= cut
	}
	return q
}
```

`store.ts:124-190` — currently reads `Date.now()` (line 129) and `Math.random`
(lines 136 and 143) internally:
```ts
function simulateRoundOutcome(
	state: SaveState,
	totalStars: number,
	firstFact?: Fact,
) {
	const now = Date.now()
	const facts = { ...state.facts }
	let eggFragments = state.eggFragments
	let eggsEarned = state.eggsEarned
	const pendingEggs = [...state.pendingEggs]
	const createdIndices: number[] = []
	const asked: FactKey[] = []
	const finalQuality = eggQuality(totalStars, Math.random)
	const perQuestion = distributeStars(totalStars, QUESTIONS_PER_ROUND)

	for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
		const fact =
			i === 0 && firstFact
				? firstFact
				: pickNextFact(facts, state.unlockedStage, asked.slice(-3), Math.random)
		// ... (rest of the body unchanged)
```

The two call sites:
- `store.ts:571` (in `debugSimulateRound`): `const o = simulateRoundOutcome(state, totalStars)`
- `store.ts:590-594` (in `debugFinishRound`):
  `const o = simulateRoundOutcome(state, totalStars, FACTS_BY_KEY.get(round.question.key))`

Imports at the top of `store.ts` (lines 1-32) bring in everything these functions
use: `applyAnswer, emptyStats, pickNextFact, shouldUnlockNextStage` (from
`../game/adaptive`); `budgetMs, FACTS_BY_KEY, fragmentsForEgg, isMaxStage,
MAX_QUESTIONS_PER_ROUND, QUESTIONS_PER_ROUND, starsFor` (from `../game/facts`);
`eggQuality, ISKIERKI_CAP, …` (from `../game/rewards`); `type { Fact, FactKey }`;
`type { SaveState }`.

**Important — unused-import fallout**: after the move, `budgetMs` is used **only**
inside `simulateRoundOutcome`, so it becomes unused in `store.ts`. `tsc`
(`noUnusedLocals`) will then fail with `TS6133` on `budgetMs`. You must remove
`budgetMs` from the `store.ts` import on line 12. All other imports listed above
are still used elsewhere in `store.ts` (verify by typecheck) — do NOT remove them.

Conventions: **bun**, Biome (tabs, double quotes, semicolons as-needed),
`verbatimModuleSyntax: true` (split type vs value imports), `noUncheckedIndexedAccess`.
Run `bun run check` at the end.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bun run typecheck` | exit 0 |
| Tests | `bun test` | all pass (incl. new `debug.test.ts`) |
| Lint/format | `bun run check` | exit 0 |
| Build | `bun run build` | exit 0 |

## Scope

**In scope**:
- `src/game/debug.ts` (create) — move both functions here; inject `rand`/`now`.
- `src/store/store.ts` (edit) — remove the two function definitions, import them
  from `../game/debug`, update the two call sites, remove the now-unused
  `budgetMs` import.
- `src/game/debug.test.ts` (create) — behavior tests for the moved functions.
- `src/game/CLAUDE.md`, `src/store/CLAUDE.md` (edit) — DOX updates (Step 5).

**Out of scope** (do NOT touch):
- The *logic* inside the two functions — this is a move + dependency-injection
  refactor only. The numbers, branches, and order of operations stay identical.
  The only allowed body edits: delete `const now = Date.now()` (now a param) and
  replace the two `Math.random` references with the injected `rand`.
- Any other store action or screen.
- `src/monsters/` (frozen).

## Git workflow

- Branch: `advisor/004-extract-debug-logic`.
- Commit message: e.g. `refactor: move round-sim debug helpers to src/game/debug.ts`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create `src/game/debug.ts`

Move `distributeStars` and `simulateRoundOutcome` here verbatim, with two
changes to `simulateRoundOutcome`: add `rand: () => number` and `now: number`
parameters, delete the internal `const now = Date.now()`, and replace both
`Math.random` references with `rand`. New signature:

```ts
export function simulateRoundOutcome(
	state: SaveState,
	totalStars: number,
	rand: () => number,
	now: number,
	firstFact?: Fact,
) { /* body unchanged except now/rand are parameters */ }
```

Export both functions (`export function distributeStars(...)`, `export function
simulateRoundOutcome(...)`). Use exactly this import block (split type/value per
`verbatimModuleSyntax`):

```ts
import { applyAnswer, emptyStats, pickNextFact, shouldUnlockNextStage } from "./adaptive"
import { budgetMs, fragmentsForEgg, isMaxStage, QUESTIONS_PER_ROUND } from "./facts"
import type { Fact, FactKey } from "./facts"
import { eggQuality, ISKIERKI_CAP } from "./rewards"
import type { SaveState } from "../store/schema"
```

**Verify**: `bun run typecheck` (it will still fail on `store.ts` duplicate/missing
until Step 2, but `debug.ts` itself must have no errors of its own — check that
the reported errors are only in `store.ts`).

### Step 2: Rewire `store.ts`

1. Delete the `distributeStars` definition (`store.ts:107-118`) and the
   `simulateRoundOutcome` definition (`store.ts:120-190`, including the leading
   comment block).
2. Add an import: `import { simulateRoundOutcome } from "../game/debug"`
   (`distributeStars` does not need importing unless used directly in `store.ts`
   — it is not, so leave it out).
3. Remove `budgetMs` from the `../game/facts` import (it is now unused in `store.ts`).
4. Update the two call sites to pass `Math.random` and `Date.now()`:
   - `debugSimulateRound`: `const o = simulateRoundOutcome(state, totalStars, Math.random, Date.now())`
   - `debugFinishRound`:
     `const o = simulateRoundOutcome(state, totalStars, Math.random, Date.now(), FACTS_BY_KEY.get(round.question.key))`

**Verify**: `bun run typecheck` → exit 0. `bun run build` → exit 0.

### Step 3: Confirm no unused imports remain

**Verify**: `bun run check` → exit 0 (Biome's import organizer + `tsc`'s
`noUnusedLocals` together confirm `store.ts` has no dangling imports). If `tsc`
reports `TS6133` for any import other than the expected `budgetMs` you already
removed, STOP and report — do not blindly delete imports that are used elsewhere.

### Step 4: Add `src/game/debug.test.ts`

Following the test pattern established in `plans/003-test-baseline.md` (model
after `src/game/rewards.test.ts`), assert:
- `distributeStars(30, 10)` returns ten `3`s (sum 30).
- `distributeStars(20, 10)` sums to 20 and every element is in `0..3`.
- `distributeStars(0, 10)` sums to 0 (all zeros).
- `simulateRoundOutcome` is deterministic given a fixed `rand` and `now`: call it
  twice with `rand = mulberry32(7)` (re-create the generator each call so the
  sequence matches) and a fixed `now`, on the same starting `state`, and assert
  the two results are deep-equal (`expect(a).toEqual(b)`).
- With `totalStars = 30` and a starting `state` whose `facts` are empty, the
  result's `facts` has the asked keys updated (attempts ≥ 1) and `eggFragments`/
  `eggsEarned` advanced consistently with `fragmentsForEgg`.

Build the starting `state` as a literal `SaveState` (import the type; mirror
`INITIAL_SAVE` from `src/store/schema.ts`). Import `mulberry32` from
`../monsters/catalog` for the deterministic `rand`.

**Verify**: `bun test src/game/debug.test.ts` → all pass.

### Step 5: DOX updates (required)

- `src/game/CLAUDE.md` "Ownership": add `debug.ts` — "symulacja rundy debug
  (`distributeStars`, `simulateRoundOutcome`), czysta dzięki wstrzykiwanym
  `rand`/`now`".
- `src/store/CLAUDE.md`: update the "Debug-symulacja rundy" paragraph — the pure
  `simulateRoundOutcome` now lives in `src/game/debug.ts` and takes injected
  `rand` + `now`; the store passes `Math.random`/`Date.now()`. Keep the rest of
  the description (the two entry points `debugSimulateRound`/`debugFinishRound`)
  accurate.

**Verify**: `bun run check` → exit 0.

## Test plan

- New file `src/game/debug.test.ts` — cases listed in Step 4 (distribution
  invariants + determinism-under-fixed-rand/now + fragment/egg consistency).
- Pattern: model after `src/game/rewards.test.ts` from plan 003.
- Verification: `bun test` → all pass, including the new file.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/game/debug.ts` exists and exports `distributeStars` + `simulateRoundOutcome`
- [ ] `grep -n "function distributeStars\|function simulateRoundOutcome" src/store/store.ts`
      → no matches (definitions moved out)
- [ ] `grep -n "budgetMs" src/store/store.ts` → no matches (unused import removed)
- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0
- [ ] `bun run check` exits 0
- [ ] `bun test` exits 0, including `src/game/debug.test.ts`
- [ ] `src/game/CLAUDE.md` and `src/store/CLAUDE.md` updated
- [ ] `git status` shows only the in-scope files changed
- [ ] `plans/README.md` status row for 004 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- After the move, `tsc` reports an unused import in `store.ts` *other than*
  `budgetMs` — that import is used elsewhere and the move logic is wrong.
- The determinism test in Step 4 fails — the body was altered beyond the allowed
  `now`/`rand` substitution; re-diff the moved body against the original.
- `bun run build` regresses (vite error) — the new `game/debug.ts` → `store/schema`
  type import is type-only (`import type`) and must not pull runtime store code
  into the build graph; verify the import uses `import type`.
- The drift check shows `store.ts` changed since `3398a0d` and the excerpts /
  line numbers above no longer match.

## Maintenance notes

- For the reviewer: the diff should be a pure move + signature change. Compare
  the moved `simulateRoundOutcome` body against the original line-by-line; the
  only differences are the removed `const now = Date.now()` and `Math.random` →
  `rand`. Any other logic change is a regression.
- This unblocks store-layer testing: with the sim logic now pure and exported,
  the deferred store/migration tests (see `plans/003` Maintenance notes) can
  cover round outcomes without the store.
- The `game/debug.ts` → `store/schema` `SaveState` type import is a type-only,
  build-erased edge; if a future refactor moves `SaveState` into `src/game/`,
  this edge disappears entirely.
