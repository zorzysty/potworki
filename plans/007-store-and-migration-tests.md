# Plan 007: Characterize the store round-machine, hatch guarantees, and the save-migration chain

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cb2c336..HEAD -- src/store src/game/facts.ts`
> If `src/store/store.ts` or `src/store/schema.ts` changed since this plan was
> written, compare the "Current state" contracts against the live code before
> writing assertions; on a mismatch, treat it as a STOP condition.
>
> **DOX (this repo)**: This repo uses a binding `CLAUDE.md` hierarchy. Read root
> `CLAUDE.md` and `src/store/CLAUDE.md` before editing — `src/store/CLAUDE.md` is
> the contract for the store and persistence and you will update its Verification
> section in Step 6.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (characterization tests only — additive; no production code changes)
- **Depends on**: plan 003 (provides `bun test` + `@types/bun` — already on `main`)
- **Category**: tests
- **Planned at**: commit `cb2c336`, 2026-06-14

## Why this matters

The zustand store is the stateful heart of the game, verified until now only by
manual click-through: the round queue (requeue a wrong answer at `index+3`,
clamped, max 12 questions, and the requeue is capped at 1 star), per-answer
persistence commits, the hatch guarantees (empty collection always hatches a
fixed cute common; duplicates convert to iskierki capped at 99; hatching the
dream clears the dream slot), and — most importantly — the **save-migration
chain**. `SAVE_VERSION` is now `3` with two real migrations (`v1→v2` adds
`eggsEarned`, `v2→v3` adds `celebratedStage`) that run on the child's device the
next time she loads after a deploy, and nothing tests them. A regression here is
exactly what a child cannot report ("the game skipped a question", "my egg
vanished", "my collection reset"). The store is importable headless in bun
(verified), so these characterization tests are cheap and lock current behavior.

## Current state

The store is importable headless: in bun there is no `localStorage` global;
`safeStorage()` in `store.ts` catches the `ReferenceError` and falls back to an
in-memory map. Verified from the repo root:
`bun -e "const s = await import('./src/store/store.ts'); s.useGame.getState().startRound(); console.log(s.useGame.getState().round.total)"` → prints `10`.

Behavioral contracts to characterize (read the code to confirm; do not cite line
numbers — they shifted when the debug helpers moved out in plan 004). All in
`src/store/store.ts` unless noted:

- `startRound()` → `screen "round"`, `round.total === QUESTIONS_PER_ROUND` (10),
  `round.index === 0`, `phase "answering"`.
- `pressDigit(d)` appends a digit and **auto-submits** (calls `pressConfirm`) once
  the typed length equals the digit-count of the expected product. `pressConfirm`
  no-ops on an empty answer.
- `pressConfirm` in phase `"answering"` (first attempt): commits the fact's stats
  via `applyAnswer` AND increments `eggFragments` by 1 **regardless of
  correctness**. A new egg is created when `eggFragments >= fragmentsForEgg(eggsEarned)`
  — note this threshold is **dynamic**: `fragmentsForEgg(0) === 10`, so the first
  egg needs 10 fragments (NOT a constant 5). On creation: `eggFragments` resets to
  0, `eggsEarned++`, a pending egg is pushed with a **provisional** quality
  `eggQuality(stars, Math.random)`, and its index is recorded in `round.eggsCreated`.
  - Correct → phase `"correct"`, `round.lastStars = gained`. Stars earned use
    `starsFor(elapsed, fact)`; a **requeued** question is capped:
    `gained = q.isRequeue ? Math.min(1, earned) : earned`.
  - Wrong (first attempt, `!q.isRequeue`, and `total < MAX_QUESTIONS_PER_ROUND`=12)
    → phase `"wrong"`, `answer = ""`, `shakeNonce++`, and a requeue is scheduled:
    `requeues[Math.min(round.index + 3, total)] = q.key`, `total++`.
- `pressConfirm` in phase `"wrong"` is the retype ritual: a correct retype →
  phase `"correct"`, `lastStars = 0`; a wrong retype only clears `answer` and
  bumps `shakeNonce`. Retypes never touch fact stats or fragments.
- `nextQuestion()` (valid only from phase `"correct"`): on the last question
  (`index+1 >= total`) it **finalizes** — sets the FINAL quality
  `eggQuality(round.stars, Math.random)` on every egg whose index is in
  `round.eggsCreated`, adds +1 iskierka (cap 99) **iff** the final quality is
  `"rainbow"`, `totalRounds++`, runs the stage-unlock check, sets phase
  `"summary"` and `round.finalQuality`. Otherwise it serves `requeues[nextIndex]`
  (marked `isRequeue: true`) or picks adaptively, excluding the last 3 asked.
- `hatchEgg(index = 0)` consumes `pendingEggs[index]`. Wish eggs roll via
  `rollWish`; otherwise **an empty collection always yields `FIRST_MONSTER_ID`
  (0)**; a duplicate adds `ISKIERKI_FOR_DUP[rarity]` capped at `ISKIERKI_CAP` (99);
  a new monster records `hatchedAt` and, if it was the dream, clears
  `dreamMonsterId`. Result lands in `lastHatch`.
- `buyWishEgg()`: cost via the exported `wishEggCost` — unowned dream →
  `WISH_COST[rarityOf(dream)]` (10/10/20/30), else `WISH_COST_NO_DREAM` (10).
  Insufficient iskierki → silent no-op. Success: deducts, pushes `{ quality: "wish" }`,
  sets `screen "hatch"`.
- `exitRoundEarly()` → `round: null, screen: "home"` (committed fragments/stats
  stay; `totalRounds` does NOT increment). `goTo(screen)` clears `round` whenever
  `screen !== "round"`.
- Timing: stars derive from `Date.now() - round.startedAt` vs `budgetMs(fact)`.
  Answering instantly is always "fast" (3⭐ on a correct first attempt). To force a
  slow answer, rewind the clock:
  `useGame.setState(s => ({ round: { ...s.round, startedAt: Date.now() - 60_000 } }))`.

`src/store/schema.ts` (unchanged by recent work):

```ts
export const SAVE_VERSION = 3
// INITIAL_SAVE keys: facts, unlockedStage, celebratedStage, ownedMonsters,
//   iskierki, eggFragments, eggsEarned, pendingEggs, dreamMonsterId, totalRounds
export const MIGRATIONS: Record<number, (state: unknown) => unknown> = {
	// v1→v2: add eggsEarned ≈ owned + pending
	1: (state) => { /* eggsEarned = #ownedMonsters + #pendingEggs */ },
	// v2→v3: add celebratedStage = unlockedStage (or 0 if not a number)
	2: (state) => { /* celebratedStage = typeof unlockedStage === "number" ? unlockedStage : 0 */ },
}
export function migrateSave(state, fromVersion) {
	// applies MIGRATIONS[v] for v = fromVersion .. SAVE_VERSION-1
}
```

**Nondeterminism caveat (critical for stable tests):** `startRound`/`nextQuestion`
use `Math.random` internally for fact selection and display orientation, and egg
quality is now **probabilistic** (`eggQuality(stars, Math.random)`). Therefore:
- NEVER assert *which* fact is asked — read `useGame.getState().round.question`
  and compute the answer from `question.a * question.b`.
- NEVER assert a *specific* egg quality. Assert structure (counts, indices) and
  the invariant `iskierki === (finalQuality === "rainbow" ? 1 : 0)`, and that the
  quality is one of `["normal","silver","gold","rainbow"]`.

Conventions: tabs, double quotes, semicolons as-needed, Polish test names.
**Every test file's first line must be `/// <reference types="bun-types" />`**
(TypeScript 6.0.3 in this repo does not auto-include `@types/bun`; all existing
test files start with this — see `src/game/rewards.test.ts`). Use seeded
`mulberry32` from `../monsters/catalog` for any rand you control; never
`Math.random` in tests. Model structure on `src/game/rewards.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Run store tests | `bun test src/store` | all pass |
| Run full suite | `bun test` | all pass (64 existing + your new tests) |
| Typecheck | `bun run typecheck` | exit 0 |
| Lint/format | `bun run check` | exit 0 |

## Scope

**In scope** (create/modify only):
- `src/store/store.test.ts` (create)
- `src/store/schema.test.ts` (create)
- `src/store/CLAUDE.md` (Verification section only — Step 6)

**Out of scope** (do NOT touch):
- `src/store/store.ts`, `src/store/schema.ts` — **characterization only**. If a
  test reveals behavior that looks wrong, record it in your report; do NOT change
  the store/schema to make a test pass.
- Everything under `src/game/`, `src/monsters/`, `src/components/`, `src/screens/`.
- Do NOT add jsdom / happy-dom / any DOM shim — the store must stay testable
  headless; needing a DOM is a STOP signal.
- Do NOT modify `tsconfig.json` or `package.json`.

## Git workflow

- Branch: `advisor/007-store-and-migration-tests`.
- Commit message: e.g. `test: characterize store round-machine, hatch, migrations`.
- Do NOT push or open a PR.

## Steps

### Step 1: Helpers + reset discipline

Create `src/store/store.test.ts`. First line `/// <reference types="bun-types" />`.
Define helpers and reset before each test:

```ts
/// <reference types="bun-types" />
import { beforeEach, describe, expect, test } from "bun:test"
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

beforeEach(() => game().debugReset())
```

**Verify**: `bun test src/store/store.test.ts` → runs (add a trivial `test` if
needed to confirm wiring), exit 0.

### Step 2: Round happy path (note the corrected egg count)

1. `startRound()` → `screen "round"`, `round.total === 10`, `index === 0`, phase `"answering"`.
2. Answer all 10 correctly (loop: `answer(true)`; expect phase `"correct"`;
   `game().nextQuestion()`). After the 10th: phase `"summary"`, `round.stars === 30`,
   `totalRounds === 1`, **`pendingEggs.length === 1`** (because `fragmentsForEgg(0) === 10`
   and there were 10 fragments — one egg, not two), `eggFragments === 0`,
   `eggsEarned === 1`, `round.eggsCreated.length === 1`. The egg's quality is one
   of the four valid qualities, and `iskierki === (round.finalQuality === "rainbow" ? 1 : 0)`.
3. Per-answer commit: after a single `answer(true)` (before `nextQuestion`),
   `eggFragments === 1` and the asked fact's stats in `facts` have `attempts === 1`.

**Verify**: `bun test src/store/store.test.ts` → pass.

### Step 3: Wrong answer, retype ritual, requeue, star-cap, max-12

1. Wrong first attempt: capture `wrongKey = round.question.key`,
   `wrongIndex = round.index`; `answer(false)`. Expect phase `"wrong"`,
   `round.answer === ""`, `round.total === 11`,
   `round.requeues[wrongIndex + 3] === wrongKey`, `eggFragments === 1` (fragment
   granted on wrong too), the fact's `attempts === 1` with `mastery === 0`
   (halved from 0), `shakeNonce === 1`.
2. Wrong retype: `answer(false)` again while phase `"wrong"` → phase stays
   `"wrong"`, `shakeNonce === 2`, fact `attempts` STILL `1`, `eggFragments` unchanged.
3. Correct retype → phase `"correct"`, `round.lastStars === 0`; `nextQuestion()` proceeds.
4. Requeue served: keep `answer(true)` + `nextQuestion()` until
   `round.index === wrongIndex + 3`; expect `round.question.key === wrongKey` and
   `round.question.isRequeue === true`.
5. **Requeue star-cap**: on that requeue question, `answer(true)` instantly (would
   be 3⭐ fast) → `round.lastStars === 1` (capped via `Math.min(1, earned)`).
6. Requeue does not re-requeue: `answer(false)` ON a requeue question (fresh
   round; force a requeue, advance to it) → `round.total` unchanged and no new
   `requeues` entry added.
7. Max 12: in a fresh round, do a wrong-first-attempt then correct-retype on
   consecutive new (non-requeue) questions; assert `round.total` never exceeds
   `MAX_QUESTIONS_PER_ROUND` (12), then finish the round and assert it reaches
   phase `"summary"`.
8. Slow answer: `startRound()`, rewind `startedAt` by 60s (setState trick above),
   `answer(true)` → `round.lastStars === 0` but `eggFragments === 1`.

**Verify**: `bun test src/store/store.test.ts` → pass.

### Step 4: Hatch guarantees, wish economy, navigation

Import `FIRST_MONSTER_ID`, `IDS_BY_RARITY`, `rarityOf` from `../monsters/catalog`
and `ISKIERKI_FOR_DUP`, `ISKIERKI_CAP`, `WISH_COST` from `../game/rewards`.

1. First hatch ever: `debugAddEgg("normal")`, `hatchEgg()` →
   `lastHatch.monsterId === FIRST_MONSTER_ID` (0), `isNew === true`,
   `ownedMonsters[0]` set, `pendingEggs` empty.
2. Duplicate: own all four rarities (`debugOwnRarity("common"|"rare"|"epic"|"legendary")`),
   `debugAddEgg("normal")`, `hatchEgg()` → guaranteed dup: `lastHatch.isNew === false`,
   `iskierki` increased by `ISKIERKI_FOR_DUP[rarityOf(lastHatch.monsterId)]`, owned
   count unchanged.
3. Iskierki cap: `debugAddIskierki(99)` then force a dup → `iskierki === 99` still.
4. Dream cleared on dream hatch: empty collection, `setDreamMonster(0)`,
   `debugAddEgg("normal")`, `hatchEgg()` (first-hatch guarantee → id 0 === dream) →
   `lastHatch.isDream === true`, `dreamMonsterId === null`.
5. `buyWishEgg`: pick a legendary id from `IDS_BY_RARITY.legendary` (unowned),
   `setDreamMonster(thatId)` → cost 30. With `iskierki === 29` it is a no-op
   (`iskierki` unchanged, no pending egg added); with `iskierki === 30` it deducts
   to 0, pushes `{ quality: "wish" }`, `screen === "hatch"`; then `hatchEgg()` →
   `lastHatch.monsterId === thatId` (unowned dream wish returns exactly the dream).
6. `exitRoundEarly` mid-round (after one `answer(true)`): `round === null`,
   `screen === "home"`, `eggFragments === 1`, `totalRounds === 0`.
7. `goTo("collection")` mid-round → `round === null`.

**Verify**: `bun test src/store/store.test.ts` → pass.

### Step 5: Migration chain (the high-value part)

Create `src/store/schema.test.ts` (first line `/// <reference types="bun-types" />`).
Import `SAVE_VERSION`, `INITIAL_SAVE`, `migrateSave` from `./schema`.

1. No-op at current version: `migrateSave(x, SAVE_VERSION)` deep-equals `x`.
2. Full chain `v1→v3`: `migrateSave({ ownedMonsters: { 0: { hatchedAt: 0 }, 5: { hatchedAt: 0 } }, pendingEggs: [{ quality: "normal" }], unlockedStage: 2, iskierki: 7 }, 1)` →
   result has `eggsEarned === 3` (2 owned + 1 pending), `celebratedStage === 2`
   (from `unlockedStage`), and preserves `iskierki === 7` and `unlockedStage === 2`.
3. Partial chain `v2→v3`: `migrateSave({ unlockedStage: 1, foo: "bar" }, 2)` →
   `celebratedStage === 1`, `foo === "bar"` preserved, and `eggsEarned` is NOT
   added (MIGRATIONS[1] did not run).
4. Fallback: `migrateSave({}, 2)` → `celebratedStage === 0` (the
   `typeof unlockedStage === "number" ? … : 0` branch).
5. **`INITIAL_SAVE` shape-lock** (the SAVE_VERSION tripwire):
   `expect(Object.keys(INITIAL_SAVE).sort()).toEqual(["celebratedStage","dreamMonsterId","eggFragments","eggsEarned","facts","iskierki","ownedMonsters","pendingEggs","totalRounds","unlockedStage"])`.
   Add a Polish comment: changing this list means the save shape changed — bump
   `SAVE_VERSION`, add a `MIGRATIONS` entry, and a migration test here.

**Verify**: `bun test src/store/schema.test.ts` → pass.

### Step 6: DOX update

Update `src/store/CLAUDE.md` "Verification" section: the manual browser-console
recipe is now backed by `bun test src/store` covering the round machine, hatch
guarantees, wish economy and the `migrateSave` v1→v2→v3 chain (plus the
`INITIAL_SAVE` shape-lock). Keep the browser-console migration check as an
optional end-to-end sanity step (it also exercises zustand persist's `migrate`
wiring, which these unit tests do not). Match the file's existing Polish tone.

**Verify**: `bun run check` → exit 0.

## Test plan

- New files `src/store/store.test.ts` and `src/store/schema.test.ts`, cases per
  Steps 2–5 (round happy path with corrected single-egg count, wrong/retype/requeue
  + star-cap + max-12, hatch guarantees + wish economy + navigation, and the
  migration chain + shape-lock).
- Pattern: model on `src/game/rewards.test.ts`. Polish test names, `beforeEach`
  `debugReset()`, no shared mutable state, no `Math.random` in tests, no
  assertions on which fact is asked or on a specific egg quality.
- Verification: `bun test` → all pass (the 64 existing + your new cases).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun test` exits 0; `src/store/store.test.ts` and `src/store/schema.test.ts`
      exist and pass
- [ ] `bun run typecheck` exits 0
- [ ] `bun run check` exits 0
- [ ] `git diff --stat cb2c336..HEAD -- src/store/store.ts src/store/schema.ts`
      shows NO changes (characterization only)
- [ ] `grep -rn "Math.random" src/store/*.test.ts` → no matches
- [ ] `grep -rn "jsdom\|happy-dom" package.json` → no matches
- [ ] `src/store/CLAUDE.md` Verification section mentions `bun test src/store`
- [ ] `git diff --name-only cb2c336..HEAD` lists only the two new test files and
      `src/store/CLAUDE.md`
- [ ] `plans/README.md` status row for 007 updated

## STOP conditions

Stop and report back (do not improvise) if:

- A characterization test contradicts a contract in "Current state" (e.g.
  fragment NOT granted on a wrong answer, requeue at a different offset, requeue
  star-cap absent, `totalRounds` incrementing on early exit, a migration adding
  the wrong field). That is drift or a real bug — report it; do NOT adjust the
  store/schema and do NOT rewrite the test to match buggy behavior without flagging.
- Importing `./store` in bun throws (the headless memory-fallback assumption broke).
- You need to modify `store.ts`/`schema.ts` to make something testable (e.g.
  export a private symbol) — report which symbol and why instead.
- The drift check shows `src/store` changed since `cb2c336` and the contracts no
  longer match.

## Maintenance notes

- These are characterization tests: they lock CURRENT behavior. A legitimate
  design change (round length, fragment curve, a new migration) is expected to
  update them — the value is that the change becomes explicit in the diff.
- The `INITIAL_SAVE` shape-lock (Step 5.5) is the tripwire for the `SAVE_VERSION`
  contract; a reviewer should reject any PR that edits that test without also
  bumping `SAVE_VERSION` and adding a migration + its test.
- Deferred: exercising zustand persist's `migrate` wiring end-to-end needs a
  `localStorage` shim; the browser-console recipe in `src/store/CLAUDE.md` covers
  it manually.
