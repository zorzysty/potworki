# Plan 003: Establish a `bun test` baseline with characterization + frozen-catalog tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3398a0d..HEAD -- src/game src/monsters package.json`
> If any of `src/game/*.ts` or `src/monsters/catalog.ts` changed since this plan
> was written, compare the "Current state" excerpts against the live code before
> writing assertions; on a mismatch, treat it as a STOP condition (your expected
> values may be wrong).
>
> **DOX (this repo)**: This repo uses a binding `CLAUDE.md` hierarchy ("DOX").
> Before editing, read `CLAUDE.md` (root), `src/CLAUDE.md`, `src/game/CLAUDE.md`,
> and `src/monsters/CLAUDE.md`. They are contracts. This plan adds a test runner,
> which **changes** the root contract line "Brak test runnera" and the
> "Verification" sections of `src/game/CLAUDE.md` and `src/monsters/CLAUDE.md` —
> you MUST update those docs in Step 7.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (purely additive — new files, one script, one dev dependency)
- **Depends on**: `plans/001-fix-broken-build.md` (the done criteria below run
  `bun run typecheck`, which fails today until 001 lands)
- **Category**: tests
- **Planned at**: commit `3398a0d`, 2026-06-14

## Why this matters

`src/game/` (facts, adaptive, rewards) and `src/monsters/catalog.ts` are ~360
lines of pure, deterministic logic that encode two things the project treats as
sacred: the child's learning progress (mastery / unlock / reward math) and the
**frozen monster catalog** (only `monsterId` is persisted, so any accidental
change to the seed, PRNG, or roll order silently swaps the child's whole
collection — see `src/monsters/CLAUDE.md`). Today there are **zero automated
tests and no test runner**. A one-character change to a threshold or the seed
would ship undetected. The modules were explicitly designed to be testable in
isolation (no DOM/React), and `src/game/CLAUDE.md` + `src/monsters/CLAUDE.md`
already enumerate the exact invariants a smoke test should assert — this plan
turns that documented intent into an executable suite, and adds a determinism
guard that fails loudly if the frozen catalog ever changes.

> Note for the operator: a prior `/improve` run wrote equivalent plans (001/002)
> that were committed then removed in `3398a0d` without being executed. This plan
> supersedes them. If that removal was a deliberate decision to not have tests,
> stop and confirm before proceeding.

## Current state

These modules are pure (no React/DOM imports) and already export everything
needed. Verified signatures/values you will assert against:

- `src/game/facts.ts`
  - `ALL_FACTS` — 55 facts, each `{a,b,key}` with `a <= b` (`facts.ts:16-21`).
  - `unlockedFacts(0)` returns 10 facts (factors {1,2,5,10}); `STAGES` order is
    `[[1,2,5,10],[3],[4],[6],[9],[7],[8]]` (`facts.ts:26-34`).
  - `budgetMs(f) = 4000 + 800 * f.b` (`facts.ts:54-56`).
  - `starsFor`: `<=budget`→3, `<=1.5*budget`→2, `<=2.5*budget`→1, else 0 (`facts.ts:58-64`).
  - `fragmentsForEgg(0)=10, (1..9)=14, (10..19)=18, (+4 per 10)` (`facts.ts:72-75`).
- `src/game/adaptive.ts`
  - `applyAnswer(stats,fact,correct,elapsed,now)`: correct & `elapsed<=budgetMs`
    → `mastery += (1-mastery)*0.30`; correct & slow → `*0.15`; wrong →
    `mastery *= 0.5`, `streak=0` (`adaptive.ts:27-46`).
  - `decayStats`: returns input unchanged when `attempts===0` or `<1` day;
    else `mastery *= 0.97 ** min(days,30)` (`adaptive.ts:19-24`).
  - `stageFacts(0) === unlockedFacts(0)`; `stageFacts(1)` has 5 facts (those
    containing factor 3) (`adaptive.ts:83-89`).
  - **Invariant**: `stageProgress(facts,stage) === 1` **iff**
    `shouldUnlockNextStage(facts,stage) === true` (documented in
    `src/game/CLAUDE.md`; `adaptive.ts:125-159`). `stageProgress` is always in
    `[0,1]` and `<= 0.95` while any stage-fact has `attempts === 0`.
  - `needsMaintenance`: true iff there are older facts and their mean mastery
    `< 0.5` (`MAINTAIN_THRESHOLD`) (`adaptive.ts:115-121`).
  - `pickNextFact(facts,stage,exclude,rand)`: weight `(1-m)^2 + 0.05`, `×2.5`
    when `attempts===0`; biases selection toward low-mastery facts
    (`adaptive.ts:48-72`).
- `src/game/rewards.ts`
  - `qualityOdds`: `>=30`→`[10,20,30,40]`, `>=28`→`[20,30,50,0]`, `>=26`→
    `[40,60,0,0]`, else `[100,0,0,0]` (`rewards.ts:17-24`). Every row sums to 100;
    rainbow (index 3) is non-zero only at `>=30`.
  - `RARITY_ODDS` rows each sum to 100 (`rewards.ts:44-52`).
  - `rollWish(ctx)`: dream set & unowned → returns the dream id; no dream →
    returns an unowned id (never owned); all owned → `null` (`rewards.ts:112-131`).
- `src/monsters/catalog.ts`
  - `MONSTER_COUNT === 72`; `MONSTERS.length === 72`; `FIRST_MONSTER_ID === 0`.
  - Rarity distribution: `common 36, rare 21, epic 11, legendary 4`
    (`IDS_BY_RARITY`; derived from `rarityOf`, `catalog.ts:42-68`).
  - All 72 DNA signatures unique; all 72 names unique (enforced at module load,
    `catalog.ts:101-121`). Legendary → `accessory:"crown"`, `palette:7`; epic →
    `palette:6`, `accessory` is `"wings"|"aura"` (`catalog.ts:70-95`).
  - `mulberry32(seed)` is exported (`catalog.ts:8`) — use it as a deterministic
    `rand` source in selection tests.

There is **no existing test** to model after — this plan establishes the pattern.
Use the full example in Step 3 as the model for the other files.

Conventions you must follow:
- **bun**, never npm. Biome formatting (tabs, double quotes, semicolons
  as-needed); run `bun run check` at the end. `verbatimModuleSyntax: true` is on,
  so import types with `import type { … }` and runtime values with `import { … }`.
- `noUncheckedIndexedAccess: true` is on: array indexing yields `T | undefined`.
  In tests, guard or assert before use (e.g. `const f = ALL_FACTS[0]; if (!f)
  throw new Error("empty"); …`) — or use `expect(x).toBeDefined()` then a
  non-null assertion `x!`.
- Tests live colocated as `src/**/<module>.test.ts`. `tsc -b` will typecheck
  them (intended). `skipLibCheck: true` (`tsconfig.json:8`) suppresses any
  `@types/bun`↔DOM global-declaration conflicts, so adding `@types/bun` is safe.
  Vite only bundles the `main.tsx` import graph, so `*.test.ts` are excluded
  from the production build automatically.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Add bun test types | `bun add -d @types/bun` | updates `package.json` + `bun.lock`, exit 0 |
| Run tests | `bun test` | all tests pass, non-zero test count |
| Run one file | `bun test src/game/rewards.test.ts` | that file's tests pass |
| Typecheck | `bun run typecheck` | exit 0 |
| Lint/format | `bun run check` | exit 0 |
| Build | `bun run build` | exit 0 |

## Suggested executor toolkit

- `bun test` is Bun's built-in Jest-like runner. Import from the virtual module:
  `import { describe, test, expect } from "bun:test"`. No config file needed; it
  auto-discovers `*.test.ts`. `@types/bun` provides the `bun:test` types so `tsc`
  resolves the import.

## Scope

**In scope** (create unless noted):
- `package.json` — add `"test": "bun test"` to `scripts`; add `@types/bun` to
  `devDependencies` (via `bun add -d`).
- `bun.lock` — updated by `bun add` (do not hand-edit).
- `src/game/facts.test.ts` (create)
- `src/game/adaptive.test.ts` (create)
- `src/game/rewards.test.ts` (create)
- `src/monsters/catalog.test.ts` (create)
- `CLAUDE.md`, `src/game/CLAUDE.md`, `src/monsters/CLAUDE.md` — DOX updates (Step 7).

**Out of scope** (do NOT touch):
- Any production source under `src/` other than adding `*.test.ts` files. Do not
  "fix" or refactor `src/game/` or `src/monsters/` — if a test reveals a bug,
  that is a STOP condition (report it; do not change frozen catalog code).
- `tsconfig.json` — do not modify; `skipLibCheck` already makes `@types/bun` safe.
- `src/store/` — store tests are deliberately out of this plan (see Maintenance
  notes); covering the store/migrations is a separate follow-up.

## Git workflow

- Branch: `advisor/003-test-baseline`.
- Commit per file or per logical group; message style matches `git log`
  (e.g. `test: add game-logic + catalog characterization tests`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add the dev dependency and test script

```
bun add -d @types/bun
```

Then add to the `scripts` block of `package.json` (alongside the existing
`typecheck`/`check` entries):

```json
"test": "bun test",
```

**Verify**: `grep -n '"test"' package.json` → shows the new script;
`bun pm ls 2>/dev/null | grep @types/bun` or `grep @types/bun package.json` →
present in devDependencies.

### Step 2: Confirm the test runner is wired

Create a throwaway `src/game/_smoke.test.ts` containing one trivial test:

```ts
import { expect, test } from "bun:test"
test("runner works", () => expect(1 + 1).toBe(2))
```

**Verify**: `bun test src/game/_smoke.test.ts` → 1 pass. Then `bun run typecheck`
→ exit 0 (confirms `@types/bun` resolved `bun:test`). If both pass, delete
`src/game/_smoke.test.ts` and continue. If `bun run typecheck` errors on the
`bun:test` import, that is a STOP condition.

### Step 3: Write `src/game/rewards.test.ts` (use as the pattern for the rest)

Cover, with these exact expectations:
- For each `s` in `[0, 10, 25, 26, 27, 28, 29, 30]`: `qualityOdds(s)` is a 4-tuple
  summing to exactly `100`.
- Threshold table: `qualityOdds(25)` is `[100,0,0,0]`, `qualityOdds(26)` is
  `[40,60,0,0]`, `qualityOdds(28)` is `[20,30,50,0]`, `qualityOdds(30)` is
  `[10,20,30,40]`. Rainbow share `qualityOdds(29)[3] === 0` and
  `qualityOdds(30)[3] === 40`.
- For each quality in `QUALITY_ORDER`: `RARITY_ODDS[quality]` sums to `100`.
- `eggQuality(30, () => 0.999) === "rainbow"`; `eggQuality(25, () => 0.999) === "normal"`;
  `eggQuality(30, () => 0) === "normal"` (lowest bucket when roll is 0).
- `rollWish`:
  - dream set and unowned → returns exactly the dream id (try several `rand`).
  - no dream, partial collection → returned id is always **unowned** (loop ~200
    seeded `rand` values via `mulberry32`).
  - everything owned → returns `null`.

Target shape (this is the model for all four test files):

```ts
import { describe, expect, test } from "bun:test"
import { mulberry32 } from "../monsters/catalog"
import {
	eggQuality,
	QUALITY_ORDER,
	qualityOdds,
	RARITY_ODDS,
	rollWish,
} from "./rewards"

describe("qualityOdds", () => {
	test("every row sums to 100", () => {
		for (const s of [0, 10, 25, 26, 27, 28, 29, 30]) {
			const sum = qualityOdds(s).reduce((a, b) => a + b, 0)
			expect(sum).toBe(100)
		}
	})
	test("rainbow only reachable at 30", () => {
		expect(qualityOdds(29)[3]).toBe(0)
		expect(qualityOdds(30)[3]).toBe(40)
	})
	test("threshold table", () => {
		expect(qualityOdds(25)).toEqual([100, 0, 0, 0])
		expect(qualityOdds(26)).toEqual([40, 60, 0, 0])
		expect(qualityOdds(28)).toEqual([20, 30, 50, 0])
		expect(qualityOdds(30)).toEqual([10, 20, 30, 40])
	})
})

describe("RARITY_ODDS", () => {
	test("every quality row sums to 100", () => {
		for (const q of QUALITY_ORDER) {
			const sum = RARITY_ODDS[q].reduce((a, b) => a + b, 0)
			expect(sum).toBe(100)
		}
	})
})

describe("rollWish", () => {
	const idsByRarity = {
		common: [0, 1, 2],
		rare: [3, 4],
		epic: [5],
		legendary: [6],
	}
	const rarityOf = (id: number) =>
		id <= 2 ? "common" : id <= 4 ? "rare" : id === 5 ? "epic" : "legendary"
	test("returns dream when set and unowned", () => {
		const ctx = {
			idsByRarity,
			owned: new Set<number>([0]),
			dreamId: 4,
			rarityOf,
			rand: () => 0.5,
		} as const
		expect(rollWish(ctx)).toBe(4)
	})
	test("never returns an owned id when no dream", () => {
		const owned = new Set<number>([0, 1, 3, 5])
		const rand = mulberry32(123)
		for (let i = 0; i < 200; i++) {
			const got = rollWish({ idsByRarity, owned, dreamId: null, rarityOf, rand })
			expect(got === null || !owned.has(got)).toBe(true)
		}
	})
	test("returns null when everything is owned", () => {
		const owned = new Set<number>([0, 1, 2, 3, 4, 5, 6])
		expect(
			rollWish({ idsByRarity, owned, dreamId: null, rarityOf, rand: () => 0.5 }),
		).toBeNull()
	})
})
```

**Verify**: `bun test src/game/rewards.test.ts` → all pass.

### Step 4: Write `src/game/facts.test.ts`

Assert: `ALL_FACTS.length === 55`; every fact has `a <= b` and `key === \`${a}x${b}\``;
all 55 keys unique; `FACTS_BY_KEY.size === 55`; `unlockedFacts(0).length === 10`;
`unlockedFacts` is monotonic (each stage's set ⊇ the previous, by key); union of
`unlockedFacts(STAGES.length-1)` has length 55; `isMaxStage(STAGES.length-1) === true`
and `isMaxStage(0) === false`; `budgetMs({a:2,b:7,key:"2x7"}) === 4000 + 800*7`;
`starsFor(budget, f) === 3`, `starsFor(1.5*budget, f) === 2`,
`starsFor(2.5*budget, f) === 1`, `starsFor(2.5*budget + 1, f) === 0`;
`fragmentsForEgg(0) === 10`, `(1) === 14`, `(10) === 18`, `(20) === 22`.

**Verify**: `bun test src/game/facts.test.ts` → all pass.

### Step 5: Write `src/game/adaptive.test.ts`

Assert:
- `emptyStats()` is all-zero.
- `applyAnswer(emptyStats(), f, true, 0, NOW)` → `mastery === 0.30`, `attempts === 1`,
  `correct === 1`, `streak === 1` (pick `f` and `NOW = 1_000_000`; fast because
  `elapsed 0 <= budgetMs`).
- `applyAnswer(emptyStats(), f, true, 10*budgetMs(f), NOW)` → `mastery === 0.15` (slow).
- `applyAnswer({...emptyStats(), mastery:0.5, attempts:1}, f, false, 0, NOW)` →
  `mastery === 0.25`, `streak === 0`.
- `decayStats({...emptyStats(), attempts:0, mastery:0.9, lastSeen:0}, BIG)` returns
  mastery `0.9` unchanged (attempts 0 ⇒ no decay).
- `decayStats({...emptyStats(), attempts:1, mastery:1, lastSeen:0}, 1*DAY)` →
  `mastery === 0.97` (one day). With `100*DAY` → `mastery === 0.97 ** 30` (capped),
  where `DAY = 86_400_000`.
- `stageFacts(0).length === 10`; `stageFacts(1).length === 5`.
- **Equivalence property**: build a few synthetic `facts` records (all stage-1
  facts attempted with mastery 0.9 → should unlock; one with attempts 0 → should
  not; mastery 0.3 → should not) and assert for each
  `(stageProgress(facts,1) === 1) === shouldUnlockNextStage(facts,1)`.
- `stageProgress(facts,1)` always within `[0,1]`; `<= 0.95` when any stage-1 fact
  has `attempts === 0`.
- `needsMaintenance(facts, 0) === false` (no older facts); for `stage 1` with all
  older (stage-0) facts at mastery 0.1 → `true`; at 0.9 → `false`.
- **Selection bias**: with `rand = mulberry32(42)`, `stage = 1`, and a `facts`
  record where one stage-1 fact has mastery 0 (all others mastery ~0.99,
  `attempts:1`), draw `pickNextFact(facts, 1, [], rand)` 2000 times; assert the
  low-mastery fact is the single most-picked key and its share `> 0.5`.

**Verify**: `bun test src/game/adaptive.test.ts` → all pass.

### Step 6: Write `src/monsters/catalog.test.ts` (frozen-seed guard)

Assert: `MONSTER_COUNT === 72`; `MONSTERS.length === 72`; `FIRST_MONSTER_ID === 0`
and `rarityOf(0) === "common"`; rarity counts via `IDS_BY_RARITY` are
`{common:36, rare:21, epic:11, legendary:4}`; all 72 `dnaSignature`-equivalent
strings unique; all 72 `name`s unique; every legendary has `dna.accessory === "crown"`
and `dna.palette === 7`; every epic has `dna.palette === 6` and
`dna.accessory` is `"wings"` or `"aura"`.

Then the **determinism guard** — capture-and-lock the current catalog signature:

```ts
const signature = MONSTERS.map(
	(m) =>
		`${m.id}:${m.name}:${m.dna.body}-${m.dna.palette}-${m.dna.eyes}-${m.dna.mouth}-${m.dna.topper}-${m.dna.pattern}-${m.dna.accessory}`,
).join("|")

test("frozen catalog signature is unchanged", () => {
	expect(signature).toBe("PASTE_CAPTURED_VALUE_HERE")
})
```

To capture the baseline value: first write the test with the placeholder, run
`bun test src/monsters/catalog.test.ts` (it will FAIL and print the actual
`signature` string), copy that exact actual string into the `toBe(...)`
argument, then re-run until it passes. This locks in the **current** frozen
output — it must not be edited again; any future change to `GLOBAL_SEED`,
`mulberry32`, `SALT_STRIDE`, `rollDna`, palette stratification, or `generateName`
will flip the signature and fail this test (that is the point).

**Verify**: `bun test src/monsters/catalog.test.ts` → all pass, including the
signature test with a real (non-placeholder) value.

### Step 7: DOX updates (required)

- `CLAUDE.md` (root): update the line that currently says "Brak test runnera —
  weryfikacja przez typecheck, `bun run check`, ekran debug …" to reflect that a
  test runner now exists; add `bun test` (or `bun run test`) to the "Komendy"
  block.
- `src/game/CLAUDE.md` "Verification": replace the prose smoke-test description
  with a pointer to the actual files (`facts.test.ts`, `adaptive.test.ts`,
  `rewards.test.ts`) and `bun test`.
- `src/monsters/CLAUDE.md` "Verification": point the determinism/distribution
  checks at `catalog.test.ts` and the signature guard.

Keep edits minimal and consistent with each doc's existing style (concise,
operational). Do not weaken any DOX rule.

**Verify**: `bun run check` → exit 0 (docs are not linted, but this confirms no
source/format regressions).

## Test plan

- New files: `src/game/facts.test.ts`, `src/game/adaptive.test.ts`,
  `src/game/rewards.test.ts`, `src/monsters/catalog.test.ts` — cases enumerated
  in Steps 3–6 (happy paths, threshold boundaries, the unlock⇔progress
  equivalence, selection bias, and the frozen-catalog signature regression
  guard).
- Pattern to follow: the full `rewards.test.ts` example in Step 3.
- Verification: `bun test` → all pass; total test count clearly > 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun test` exits 0 and reports the four test files passing (no `0 tests`)
- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -n '"test"' package.json` shows the `bun test` script
- [ ] The Step-6 signature test uses a real captured value, not the placeholder
      (`grep -n "PASTE_CAPTURED_VALUE_HERE" src/monsters/catalog.test.ts` → no matches)
- [ ] `src/game/_smoke.test.ts` no longer exists
- [ ] Root `CLAUDE.md`, `src/game/CLAUDE.md`, `src/monsters/CLAUDE.md` updated to
      reference the test runner / test files
- [ ] `git status` shows only the in-scope files changed
- [ ] `plans/README.md` status row for 003 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- A test you wrote per the documented invariants **fails** because the production
  code disagrees with this plan's stated expectations — that means either the
  code drifted or there is a real bug. Do **not** edit `src/game/` or
  `src/monsters/` to make the test pass; report the discrepancy with the failing
  assertion. (Especially: never modify `src/monsters/catalog.ts` — it is frozen.)
- `bun run typecheck` errors on `@types/bun` global conflicts despite
  `skipLibCheck: true` (unexpected) — report rather than editing `tsconfig.json`.
- The catalog signature placeholder cannot be captured because importing
  `catalog.ts` throws (its module-load uniqueness check would only throw if the
  catalog is genuinely broken) — report it.
- Drift check shows `src/game/` or `src/monsters/catalog.ts` changed since
  `3398a0d` and the "Current state" values no longer match.

## Maintenance notes

- For the reviewer: scrutinize the Step-6 signature value — it is the frozen
  baseline. A PR that *changes* it is changing the child's collection and must be
  rejected unless that is the explicit intent.
- Deliberately out of scope and good follow-ups: store/migration tests
  (`migrateSave` v1→v2→v3, hatch guarantees, the round-queue requeue mechanic).
  Those touch `src/store/` and DOM-free portions can be tested once the debug
  helpers move to `src/game/` (see `plans/004-extract-debug-logic.md`).
- If `tsc` ever flags the `*.test.ts` files in a way that slows the build,
  consider a dedicated `tsconfig.test.json`; not needed at current size.
