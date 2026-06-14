# Plan 009: Characterization tests for the post-baseline features (division reward, egg-bank, multi-egg hatch)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat aef2b6d..HEAD -- src/store/store.ts src/store/store.test.ts src/game/rewards.ts src/monsters/catalog.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (the test harness already exists on `main`)
- **Category**: tests
- **Planned at**: commit `aef2b6d`, 2026-06-14

## Why this matters

The test baseline (plans 003 + 007, 89 tests) was built **before** three feature
commits landed: "add division", "tweak egg receiving logic", and "add play again
button". Those features added meaningful tests, but three behaviors that are
user-reachable in production slipped through with **zero** assertions. Each is a
silent-regression risk on a child's saved progress:

1. **Multi-egg hatch by index.** `hatchEgg(index)` removes the egg at a chosen
   index; the nest UI lets the child pick which egg to crack
   (`HatchScreen.tsx:52` calls `hatchEgg(safeIndex)`). Every existing test only
   exercises the default `hatchEgg()` (index 0). An off-by-one in the filter
   would crack the wrong egg and be invisible.
2. **Cross-round egg-star-bank accumulation.** The egg color is decided from
   `eggStarBank`, which persists and accumulates *across rounds* until an egg
   closes. The first egg always completes inside one round (threshold 10 = 10
   questions), so the existing tests only cover the within-one-round case. The
   **second** egg needs 14 fragments (`fragmentsForEgg(1)`), so it spans a round
   boundary — exactly the path that is untested.
3. **Division-only legendary reachability.** Division-only monsters (ids 72–75)
   are the entire reward for playing division. A test asserts mult eggs *never*
   hatch them; nothing asserts a **division egg *can***. If the `egg.mode` →
   pool wiring broke, those four monsters would become permanently unobtainable
   and no test would notice.

## Current state

All three behaviors live in `src/store/store.ts` and are tested (where tested) in
`src/store/store.test.ts`. The relevant code, as it exists today:

- `hatchEgg(index = 0)` — `store.ts:489-529`. Removes the egg by index:
  ```ts
  hatchEgg: (index = 0) => {
    const state = get()
    const egg = state.pendingEggs[index]
    if (!egg) return
    const ctx = rollContext(state, egg.mode)
    // ... rolls a monster ...
    const pendingEggs = state.pendingEggs.filter((_, i) => i !== index)
    // ... sets pendingEggs + lastHatch ...
  }
  ```
  The pool comes from `egg.mode` via `rollContext` (`store.ts:154-168`) →
  `idsByRarityForMode(mode)`.

- Egg-close + star-bank logic — `store.ts:339-361` (inside `pressConfirm`):
  ```ts
  let eggFragments = state.eggFragments + 1
  let eggStarBank = state.eggStarBank + gained
  // ...
  const threshold = fragmentsForEgg(eggsEarned)
  if (eggFragments >= threshold) {
    const quality = eggQuality(eggQualityScore(eggStarBank, threshold), Math.random)
    eggFragments = 0
    eggStarBank = 0
    eggsEarned++
    pendingEggs = [...pendingEggs, { quality, mode: round.mode }]
    // ...
  }
  ```
  `fragmentsForEgg` (`src/game/facts.ts:75-78`): `eggsEarned <= 0 → 10`, else
  `14 + 4*floor(eggsEarned/10)`. So egg #1 = 10 fragments, egg #2 = 14.

- Division-only pool — `src/monsters/catalog.ts:41-57`:
  `DIVISION_ONLY_IDS = new Set([72, 73, 74, 75])`; `idsByRarityForMode("div")`
  returns the full catalog (includes them), `"mult"` filters them out of the
  legendary tier. `RARITY_ODDS.rainbow = [12, 40, 33, 15]` (`rewards.ts:67`) — a
  rainbow egg rolls legendary 15% of the time.

### Test conventions to match (read these before writing)

The test file is `src/store/store.test.ts`. Follow its existing structure exactly:

- First line is `/// <reference types="bun-types" />` (this repo is on TypeScript
  6, which no longer auto-includes `@types/bun` — without this reference the
  test file fails to typecheck).
- Imports from `bun:test`: `import { beforeEach, describe, expect, test } from "bun:test"`.
- `const game = () => useGame.getState()` and `beforeEach(() => game().debugReset())`
  are already at the top of the file — reuse them; do NOT redefine.
- Existing helpers `answer(correct)`, `requireRound()`, and `answerByMode(correct)`
  are defined at the top (lines 14-41) — reuse `answer(true)`.
- Polish test names, consistent with the file (e.g.
  `"po 10 poprawnych: faza summary, 1 jajko, zera fragmentów"`).
- The **structural pattern for the division test** is the existing negative test
  `"jajko mnożeniowe nigdy nie wykluwa legendarnego tylko-dzielenie"`
  (`store.test.ts:445-459`) — a fixed-count loop over `debugAddEgg` + `hatchEgg`
  asserting a pool property. Mirror it for the positive case.
- The **structural pattern for the egg-bank test** is the existing
  `describe("eggStarBank", ...)` block (`store.test.ts:248-269`) and the
  happy-path round loop in `"po 10 poprawnych..."` (`store.test.ts:61-90`).

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Typecheck | `bun run typecheck`              | exit 0, no errors   |
| Run this file | `bun test src/store/store.test.ts` | all pass, +3 new tests |
| Full suite | `bun test`                      | all pass (≥115; 112 today + your 3) |
| Lint/format | `bun run check`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/store/store.test.ts` — add the three tests below.
- `src/store/CLAUDE.md` — append the new coverage to its "Verification" section
  (DOX requirement; see Step 4).
- `plans/README.md` — status row update.

**Out of scope** (do NOT touch):
- `src/store/store.ts` and any other source file — this plan **adds tests only**.
  If a test reveals a real bug, that is a STOP condition (see below), not a
  source edit.
- `src/store/schema.test.ts`, `src/game/*.test.ts`, `src/monsters/catalog.test.ts`
  — coverage there is already adequate for the new features (migrations v3→v5,
  `idsByRarityForMode`, `eggQualityScore` are all asserted). Do not duplicate.
- The play-again button has no dedicated test gap worth filling: it calls the
  already-heavily-tested `startRound()`. Do **not** add a test for it.

## Git workflow

- Branch: `advisor/009-new-feature-test-coverage`
- One commit. Message style (match repo — see `git log`, e.g.
  "test: characterize store round-machine, hatch, migrations"):
  `test: cover multi-egg hatch, cross-round egg-bank, division-only reachability`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Test `hatchEgg(index)` removes the correct egg

Add inside the existing `describe("hatchEgg — gwarancje", ...)` block (it ends at
`store.test.ts:323`), or in a new `describe`. Add three distinguishable eggs and
hatch the middle one by index; assert the *array* is left correct (the random
monster outcome is irrelevant — we are testing the index filter):

```ts
test("hatchEgg(index) wykluwa i usuwa właściwe jajko z gniazda", () => {
	game().debugAddEgg("normal")
	game().debugAddEgg("silver")
	game().debugAddEgg("gold")
	expect(game().pendingEggs.map((e) => e.quality)).toEqual([
		"normal",
		"silver",
		"gold",
	])
	game().hatchEgg(1) // wykluj środkowe (silver)
	expect(game().pendingEggs.map((e) => e.quality)).toEqual(["normal", "gold"])
})
```

**Verify**: `bun test src/store/store.test.ts` → this test passes.

### Step 2: Test cross-round `eggStarBank` accumulation

Add a new `describe` block. Use a small helper to play a full clean round (define
it locally inside the test or above it). The key insight: egg #1 closes at 10
fragments (one round); egg #2 needs 14, so it must span rounds — the bank must
survive the round boundary and not zero until the 14th fragment.

```ts
describe("eggStarBank — akumulacja między rundami", () => {
	// gra pełną rundę 10 poprawnych odpowiedzi (każda szybka → 3★)
	const playCleanRound = () => {
		game().startRound()
		for (let i = 0; i < 10; i++) {
			answer(true)
			game().nextQuestion()
		}
	}

	test("drugie jajko (próg 14) zbiera gwiazdki przez granicę rund; bank nie zeruje się przedwcześnie", () => {
		// runda 1: 10 fragmentów = pierwsze jajko (fragmentsForEgg(0) = 10)
		playCleanRound()
		expect(game().eggsEarned).toBe(1)
		expect(game().eggFragments).toBe(0)
		expect(game().eggStarBank).toBe(0)
		expect(game().pendingEggs.length).toBe(1)

		// runda 2: 10 kolejnych fragmentów, ale próg drugiego jajka to
		// fragmentsForEgg(1) = 14 → żadne jajko się nie domyka; bank ROŚNIE
		// i przeżywa koniec rundy
		playCleanRound()
		expect(game().eggsEarned).toBe(1) // wciąż 1 — brak przedwczesnego jajka
		expect(game().eggFragments).toBe(10)
		expect(game().eggStarBank).toBe(30) // 10×3★ z rundy 2, nie wyzerowane

		// runda 3: 4 poprawne odpowiedzi domykają drugie jajko (10 + 4 = 14)
		game().startRound()
		for (let i = 0; i < 4; i++) {
			answer(true)
			game().nextQuestion()
		}
		expect(game().eggsEarned).toBe(2)
		expect(game().eggFragments).toBe(0)
		expect(game().eggStarBank).toBe(0) // wyzerowany przy domknięciu
		expect(game().pendingEggs.length).toBe(2)
	})
})
```

If `eggStarBank` after round 2 is not exactly 30, do NOT change the assertion to
match — that means a star was not awarded as expected (every synchronous
`answer(true)` should score 3★ because elapsed time ≈ 0). Treat a mismatch as a
STOP condition and report the actual value.

**Verify**: `bun test src/store/store.test.ts` → this test passes.

### Step 3: Test a division egg *can* hatch a division-only legendary

Add inside the existing `describe("tryb dzielenia", ...)` block (ends at
`store.test.ts:460`). Own everything **except** the four division-only
legendaries, so any *new* hatch from a div egg must be one of them. Note
`DIVISION_ONLY_IDS` is already imported at the top of the file (line 5):

```ts
test("jajko z dzielenia MOŻE wykluć legendarnego tylko-dzielenie (osiągalność nagrody)", () => {
	// posiadamy wszystko OPRÓCZ 4 legendarnych tylko-dzielenie (72–75):
	// common+rare+epic + oryginalne legendarne 45,46,47,71. Każde NOWE
	// wyklucie z jajka div musi więc być jednym z tylko-dzielenie.
	game().debugOwnRarity("common")
	game().debugOwnRarity("rare")
	game().debugOwnRarity("epic")
	const owned = { ...game().ownedMonsters }
	for (const id of [45, 46, 47, 71]) owned[id] = { hatchedAt: 0 }
	useGame.setState({ ownedMonsters: owned })

	game().setMode("div") // debugAddEgg ostempluje jajka mode = "div"

	let newCount = 0
	for (let i = 0; i < 300; i++) {
		game().debugAddEgg("rainbow") // 15% szans na legendarnego
		game().hatchEgg()
		const lh = game().lastHatch
		if (lh?.isNew) {
			newCount++
			expect(DIVISION_ONLY_IDS.has(lh.monsterId)).toBe(true)
		}
	}
	// invariant powyżej trzyma się zawsze; ten assert potwierdza osiągalność.
	// 300 tęczowych jajek × 15% legendary ⇒ trafienie praktycznie pewne
	// (P(0) ≈ 0.85^300 ≈ 10⁻²¹).
	expect(newCount).toBeGreaterThan(0)
})
```

Note: `useGame` is already imported at the top of the file (line 10) — do not
re-import it.

**Verify**: `bun test src/store/store.test.ts` → this test passes.

### Step 4: Update the DOX (`src/store/CLAUDE.md` Verification section)

This repo uses a binding `CLAUDE.md` hierarchy. Read the root `CLAUDE.md` and
`src/store/CLAUDE.md` first ("Read Before Editing"). Then extend the
"Verification" section of `src/store/CLAUDE.md` (currently a single paragraph at
lines 29-32 describing what `bun test src/store` covers) to mention the three new
cases: multi-egg `hatchEgg(index)` removes the right egg, cross-round
`eggStarBank` accumulation toward the 14-fragment second egg, and division-egg
reachability of division-only legendaries. Keep it to one added clause/sentence
in the existing style — do not restructure the doc.

**Verify**: `bun run check` → exit 0 (formats the markdown; should be clean).

## Test plan

Three new tests, all in `src/store/store.test.ts`, modeled on the patterns named
in "Current state":

- `hatchEgg(index)` middle-egg removal — array-identity assertion (Step 1).
- Cross-round `eggStarBank` accumulation and timely zeroing (Step 2).
- Division egg reaches a division-only legendary; mult invariant unaffected (Step 3).

Verification: `bun test` → all pass, including the 3 new tests (≥115 total).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun test` exits 0; total test count is **prior count + 3** (≈115)
- [ ] `bun test src/store/store.test.ts` shows the three new test names passing
- [ ] `grep -c "hatchEgg(1)" src/store/store.test.ts` ≥ 1
- [ ] `grep -c "akumulacja między rundami" src/store/store.test.ts` ≥ 1
- [ ] `grep -c "osiągalność nagrody" src/store/store.test.ts` ≥ 1
- [ ] `bun run check` exits 0
- [ ] `src/store/CLAUDE.md` "Verification" section mentions the three new cases
- [ ] Only `src/store/store.test.ts`, `src/store/CLAUDE.md`, `plans/README.md`
      modified (`git status`) — **no source file touched**
- [ ] `plans/README.md` status row for 009 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The "Current state" excerpts don't match the live code (drift since this plan
  was written).
- A new test fails in a way that reveals a **real bug** in `store.ts` (e.g.
  `hatchEgg(1)` removes the wrong egg, or `eggStarBank` zeroes early). Do NOT
  edit `store.ts` to make a test pass and do NOT weaken the assertion to match
  buggy output — report the discrepancy; a source fix is a separate plan.
- `eggStarBank` after round 2 is anything other than 30 (Step 2) — report the
  actual value rather than adjusting the expectation.
- The division test's `newCount` is 0 after 300 iterations (would indicate the
  `egg.mode` → pool wiring is broken, i.e. a real bug — report it).
- `bun test` is not green before you start.

## Maintenance notes

- The cross-round test hard-codes egg thresholds 10 and 14 from
  `fragmentsForEgg`. If that schedule changes (`src/game/facts.ts:75-78`), this
  test's arithmetic (round 2 → 10 fragments, round 3 → 4 more to reach 14) must
  be recomputed.
- The division reachability test is intentionally probabilistic (mirrors the
  existing mult negative test's fixed-loop style). The store path uses
  `Math.random` directly and is not seedable; if `RARITY_ODDS.rainbow`'s
  legendary share drops far below 15%, raise the loop count to keep P(flake)
  negligible.
- A reviewer should confirm no `store.ts` line changed and that the assertions
  test behavior (array contents, exact bank value), not tautologies.
