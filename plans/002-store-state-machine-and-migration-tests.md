# Plan 002: Test the round state machine, hatch guarantees and save-migration path in the zustand store

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 89bc634..HEAD -- src/store src/game/facts.ts src/monsters/catalog.ts`
> Plan 001 must already be DONE (check `plans/README.md`) — it provides the
> `bun test` infrastructure (`@types/bun`, `test` script). If `src/store/store.ts`
> or `src/store/schema.ts` changed since `89bc634` beyond what plan 001 touched
> (plan 001 does not touch them at all), compare the "Current state" excerpts
> against the live code; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: plans/001-test-baseline-and-catalog-determinism.md
- **Category**: tests
- **Planned at**: commit `89bc634`, 2026-06-12

## Why this matters

The round flow (requeue-on-wrong-answer at `index+3`, clamped, max 12 questions), the per-answer persistence commits, the hatch guarantees (first egg always hatches a fixed cute common; duplicates convert to iskierki; hatching the dream monster clears the dream slot) and the save-migration chain are the stateful heart of the game. They were verified only by manual click-through during development. A regression here is exactly the kind a child cannot report ("the game skipped a question", "my egg disappeared"), and the migration path must work first-try on the child's device the day `SAVE_VERSION` is bumped to 2. The store is importable headless in bun (verified — see Current state), so these tests are cheap.

## Current state

- `src/store/store.ts` — the single zustand store. Relevant facts:
  - Module side effects at import: `create()` runs persist rehydration synchronously, then the last line calls `useGame.getState().applyDecay()`. In bun there is **no `localStorage` global** — accessing it throws `ReferenceError`, which the `safeStorage()` wrapper catches, falling back to an in-memory Map. Verified at planning time from the repo root:
    `bun -e "const s = await import('./src/store/store'); const g = s.useGame.getState(); g.startRound(); console.log(s.useGame.getState().round.total)"` → prints `10`.
  - Key actions: `startRound`, `pressDigit(d)`, `pressBackspace`, `pressConfirm`, `nextQuestion`, `exitRoundEarly`, `hatchEgg`, `clearLastHatch`, `setDreamMonster(id)`, `buyWishEgg`, `goTo(screen)`, and debug helpers `debugReset`, `debugSetAllMastery(v)`, `debugOwnRarity(rarity)`, `debugAddIskierki(n)`, `debugAddEgg(quality)`.
  - `pressConfirm` in phase `"answering"` (the first attempt): commits fact stats AND increments `eggFragments` immediately regardless of correctness ("fragment przyznany niezależnie od wyniku"); every 5th fragment pushes a pending egg with **provisional** quality `eggQuality(stars-so-far)` and records its index in `round.eggsCreated`. On a wrong first attempt it sets phase `"wrong"`, clears `answer`, bumps `shakeNonce`, and schedules a requeue:

    ```ts
    // src/store/store.ts (inside pressConfirm, wrong branch)
    const requeues = { ...round.requeues }
    let total = round.total
    if (!q.isRequeue && total < MAX_QUESTIONS_PER_ROUND) {
    	const at = Math.min(round.index + 3, total)
    	requeues[at] = q.key
    	total++
    }
    ```

  - `pressConfirm` in phase `"wrong"` is the retype ritual: a correct retype moves to phase `"correct"` with `lastStars: 0`; a wrong retype only clears the answer and bumps `shakeNonce`. Retypes never touch fact stats or fragments.
  - `nextQuestion` (only valid from phase `"correct"`): appends the asked key, and when `nextIndex >= round.total` finalizes the round — sets the **final** quality `eggQuality(round.stars)` on every pending egg whose index is in `round.eggsCreated`, adds +1 iskierka (cap 99) when final quality is `"rainbow"`, increments `totalRounds`, checks stage unlock, sets phase `"summary"`. Otherwise it serves `round.requeues[nextIndex]` if present (marked `isRequeue: true`) or picks adaptively excluding the last 3 asked.
  - `hatchEgg`: consumes `pendingEggs[0]`. Wish eggs roll via `rollWish`; otherwise **an empty collection always yields `FIRST_MONSTER_ID`** (= 0); duplicates add `ISKIERKI_FOR_DUP[rarity]` capped at `ISKIERKI_CAP` (99); a new monster records `hatchedAt` and, if it was the dream, clears `dreamMonsterId`. Result lands in `lastHatch: { monsterId, isNew, isDream, iskierkiGained }`.
  - `buyWishEgg`: cost via `wishEggCost` (exported): unowned dream → `WISH_COST[rarityOf(dream)]` (10/10/20/30), otherwise 10. Insufficient iskierki → silent no-op. Success: deducts, pushes `{ quality: "wish" }`, navigates to hatch.
  - `goTo(screen)` clears `round` whenever `screen !== "round"`. `exitRoundEarly` sets `round: null, screen: "home"` — fragments/stats stay (already committed), `totalRounds` does NOT increment.
  - Timing: stars come from `Date.now() - round.startedAt` vs `budgetMs(fact)`. Tests answering immediately are always "fast" (3⭐ on correct). To simulate a slow answer, rewind the clock: `useGame.setState(s => ({ round: { ...s.round!, startedAt: Date.now() - 60_000 } }))`.
  - The auto-advance timer lives in `RoundScreen.tsx` (UI), NOT in the store — tests drive `nextQuestion()` manually. There is no timer to await.

- `src/store/schema.ts` — `SAVE_VERSION = 1`, `INITIAL_SAVE`, `SAVE_KEYS`, and:

  ```ts
  // src/store/schema.ts:34
  export const MIGRATIONS: Record<number, (state: unknown) => unknown> = {}

  export function migrateSave(state: unknown, fromVersion: number): unknown {
  	let migrated = state
  	for (let v = fromVersion; v < SAVE_VERSION; v++) {
  		const step = MIGRATIONS[v]
  		if (step) migrated = step(migrated)
  	}
  	return migrated
  }
  ```

- Useful imports for assertions: `FACTS_BY_KEY`, `QUESTIONS_PER_ROUND` (10), `MAX_QUESTIONS_PER_ROUND` (12), `FRAGMENTS_PER_EGG` (5) from `src/game/facts.ts`; `FIRST_MONSTER_ID`, `IDS_BY_RARITY`, `rarityOf` from `src/monsters/catalog.ts`; `ISKIERKI_FOR_DUP`, `WISH_COST` from `src/game/rewards.ts`.

- Conventions: tabs, no semicolons, double quotes, Polish test names, seeded determinism where possible. Model the file structure after the suites created by plan 001 (e.g. `src/game/adaptive.test.ts`).

- Nondeterminism caveat: `startRound`/`nextQuestion` use `Math.random` internally for fact selection and display orientation. Tests must NOT assert which fact is asked; they read `useGame.getState().round.question` and compute the right (or wrong) answer from `question.a * question.b`. For the requeue assertions, capture `question.key` at the moment of the wrong answer and compare later.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Tests     | `bun test`          | all pass, exit 0    |
| One file  | `bun test src/store` | store suites pass  |
| Typecheck | `bun run typecheck` | exit 0              |

## Scope

**In scope** (create/modify only):
- `src/store/store.test.ts` (create)
- `src/store/schema.test.ts` (create)
- `src/store/CLAUDE.md` (Verification section only)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `src/store/store.ts`, `src/store/schema.ts` — characterization only. If a test reveals behavior that looks wrong, record it in your report; do not change the store.
- Everything under `src/game/`, `src/monsters/` (tests there belong to plan 001), `src/components/`, `src/screens/`.
- Do not add jsdom/happy-dom or any DOM shim — the store must stay testable headless; needing a DOM is a STOP signal.

## Git workflow

- Branch: `advisor/002-store-tests`.
- Commit style: short imperative summary, ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Do NOT push or open a PR.

## Steps

### Step 1: Test helpers and reset discipline

Create `src/store/store.test.ts`. At the top, define helpers (plain functions, no framework magic):

```ts
import { beforeEach, describe, expect, test } from "bun:test"
import { useGame } from "./store"

const game = () => useGame.getState()

function answer(correct: boolean) {
	const round = game().round
	if (!round) throw new Error("brak rundy")
	const product = round.question.a * round.question.b
	const value = correct ? product : product + 1
	for (const digit of String(value)) game().pressDigit(Number(digit))
	game().pressConfirm()
}
```

`beforeEach`: `game().debugReset()` — it resets the persisted save AND the ephemeral fields (`round`, `lastHatch`, `screen`). Note `pressConfirm` no-ops on an empty `answer` string — the helper always types first.

**Verify**: `bun test src/store` → file runs (even with a single trivial test) — exit 0.

### Step 2: Round happy path

Tests:

1. `startRound` → screen `"round"`, `round.total === 10`, `round.index === 0`, phase `"answering"`.
2. Answer all 10 correctly (loop: `answer(true)`; expect phase `"correct"`; `game().nextQuestion()`). After the 10th: phase `"summary"`, `round.stars === 30` (instant answers are always fast), `totalRounds === 1`, `pendingEggs.length === 2`, both eggs quality `"rainbow"` (30 stars ≥ 26), `eggFragments === 0`, `iskierki === 1` (rainbow bonus), `round.eggsCreated` has length 2.
3. Per-answer commit: after a single correct answer (before `nextQuestion`), `eggFragments === 1` and the asked fact's stats in `facts` have `attempts === 1`.

**Verify**: `bun test src/store` → pass.

### Step 3: Wrong answer, retype ritual, requeue

Tests:

1. Wrong first attempt: capture `wrongKey = round.question.key` and `wrongIndex = round.index`, then `answer(false)`. Expect: phase `"wrong"`, `round.answer === ""`, `round.total === 11`, `round.requeues[wrongIndex + 3] === wrongKey`, `eggFragments` still incremented (fragment granted on wrong), fact stats show `attempts === 1` with halved-from-zero mastery (`0`), `shakeNonce === 1`.
2. Wrong retype: `answer(false)` again while phase is `"wrong"` → phase stays `"wrong"`, `shakeNonce === 2`, fact `attempts` STILL `1` (retypes never touch stats), `eggFragments` unchanged.
3. Correct retype → phase `"correct"`, `lastStars === 0`; `nextQuestion()` proceeds.
4. The requeue is served: keep answering correctly + `nextQuestion()` until `round.index === wrongIndex + 3`; expect `round.question.key === wrongKey` and `round.question.isRequeue === true`.
5. Wrong answer ON the requeue: schedules no further requeue (`round.total` stays 11, `Object.keys(round.requeues).length` stays 1).
6. Cap at 12: drive a round committing wrong first-attempts on every new (non-requeue) question; assert `round.total` never exceeds 12 and the round still reaches phase `"summary"`.
7. Slow correct answer: rewind `startedAt` by 60s (setState trick from Current state), `answer(true)` → `round.lastStars === 0`, but `eggFragments` still incremented.

**Verify**: `bun test src/store` → pass.

### Step 4: Hatch guarantees, wish economy, navigation

Tests:

1. First hatch ever: `debugAddEgg("normal")`, `hatchEgg()` → `lastHatch.monsterId === FIRST_MONSTER_ID` (0), `isNew === true`, `ownedMonsters[0]` set, `pendingEggs` empty.
2. Duplicate: own all commons (`debugOwnRarity("common")`), force a common dup by... NOTE: a normal egg may roll a higher tier. Deterministic route: own ALL FOUR rarities (`debugOwnRarity` × 4), then `debugAddEgg("normal")` + `hatchEgg()` → guaranteed dup; `lastHatch.isNew === false`, `iskierki` increased by `ISKIERKI_FOR_DUP[rarityOf(lastHatch.monsterId)]`, monster count unchanged.
3. Iskierki cap: `debugAddIskierki(99)` then force another dup → `iskierki === 99` still.
4. Dream cleared on dream hatch: with empty collection, `setDreamMonster(FIRST_MONSTER_ID)`, hatch a normal egg (first-hatch guarantee makes it id 0) → `lastHatch.isDream === true`, `dreamMonsterId === null`.
5. `buyWishEgg`: set dream to id 45 (legendary, unowned) → cost 30: with `iskierki = 29` it's a no-op (nothing deducted, no egg); with 30 it deducts to 0, pushes `{ quality: "wish" }`, screen `"hatch"`; `hatchEgg()` → `lastHatch.monsterId === 45`.
6. `exitRoundEarly` mid-round (after 1 correct answer): `round === null`, screen `"home"`, `eggFragments === 1`, `totalRounds === 0`.
7. `goTo("collection")` mid-round clears `round`.

**Verify**: `bun test src/store` → pass.

### Step 5: Migration harness

Create `src/store/schema.test.ts`:

1. `migrateSave(state, SAVE_VERSION)` returns the state unchanged (no-op at current version).
2. Chain execution: register a fake migration in `afterEach`-cleaned setup —

   ```ts
   MIGRATIONS[0] = state => ({ ...(state as Record<string, unknown>), testoweNowePole: 7 })
   ```

   then `migrateSave({ iskierki: 3 }, 0)` → result has `testoweNowePole === 7` AND `iskierki === 3` (field preservation). Clean up with `delete MIGRATIONS[0]` in `afterEach` (the map is module-global; leaking it would poison other suites).
3. Missing step tolerance: `migrateSave({ a: 1 }, 0)` with an EMPTY `MIGRATIONS` returns the input unchanged (documents current lenient behavior — a hole in the chain does not throw).
4. `INITIAL_SAVE` shape lock: `expect(Object.keys(INITIAL_SAVE).sort()).toEqual(["dreamMonsterId", "eggFragments", "facts", "iskierki", "ownedMonsters", "pendingEggs", "totalRounds", "unlockedStage"])` — a new field added without reading the docs trips this test and points the author at the SAVE_VERSION/MIGRATIONS contract (add a Polish comment saying exactly that).

**Verify**: `bun test src/store` → both files pass.

### Step 6: DOX documentation pass

Update `src/store/CLAUDE.md` "Verification" section: replace the manual console recipe with the committed reality — `bun test src/store` covers the round machine, hatch guarantees, wish economy and the migration chain; keep the browser-console migration check as an optional end-to-end sanity step (it additionally exercises zustand persist's `migrate` wiring, which unit tests do not).

**Verify**: `bun test && bun run typecheck` → exit 0.

## Test plan

Covered by Steps 1–5 (this plan is itself the test plan; ~20 `test()` cases across 2 files). Model structure after plan 001's suites. Polish test names, no shared state between tests (every test starts from `debugReset()`).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun test` exits 0; `src/store/store.test.ts` and `src/store/schema.test.ts` exist and pass
- [ ] `bun run typecheck` exits 0
- [ ] `git diff --stat` shows NO changes to `src/store/store.ts` or `src/store/schema.ts`
- [ ] No DOM shim added (`grep -rn "jsdom\|happy-dom" package.json` → no matches)
- [ ] `src/store/CLAUDE.md` Verification section mentions `bun test src/store`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 is not DONE (no `test` script in package.json or no `@types/bun`).
- Importing `./store` in bun throws anything other than working silently (the `ReferenceError`-to-memory-fallback path is internal; if module import itself fails, the headless assumption broke).
- Any characterization test contradicts the contracts in "Current state" (e.g. fragments NOT granted on a wrong answer, requeue at a different offset, `totalRounds` incrementing on early exit). That is either drift or a real bug — report it; do not adjust the store and do not write the test to match buggy behavior without flagging it.
- You need to modify `store.ts`/`schema.ts` to make anything testable (e.g. exporting something private). Report which symbol and why instead.

## Maintenance notes

- These are characterization tests: they lock CURRENT behavior. When the game design legitimately changes (e.g. round length), updating them is expected — the value is that the change becomes explicit.
- The `INITIAL_SAVE` shape-lock test (Step 5.4) is the tripwire for the SAVE_VERSION contract; reviewers should reject any PR that edits that test without also bumping `SAVE_VERSION` and adding a migration + migration test.
- Deferred: testing zustand persist's `migrate` wiring end-to-end (requires a localStorage shim; the browser-console recipe in `src/store/CLAUDE.md` covers it manually).
