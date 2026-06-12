# Plan 001: Establish a bun test baseline that guards the frozen monster catalog and the pure game math

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 89bc634..HEAD -- src/monsters src/game package.json tsconfig.json .github/workflows/deploy.yml CLAUDE.md src/CLAUDE.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
> Known at planning time: the working tree had uncommitted changes to
> `src/components/BigButton.tsx`, `src/screens/CollectionScreen.tsx` and
> `src/CLAUDE.md` (a `trigger="tap"` UI change). These do NOT affect this plan;
> ignore them.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `89bc634`, 2026-06-12

## Why this matters

This repo is a child's multiplication game. Saved progress stores only `monsterId` (0–47); the monster's look, name and rarity are re-derived on every load from a deterministic generator with a frozen seed (`src/monsters/catalog.ts`). The repo's own docs (root `CLAUDE.md`, `src/monsters/CLAUDE.md`) call this the most critical invariant: **any change to the generator's output silently replaces the child's entire collection on her device**. Today nothing enforces it — the smoke tests used during development were ad-hoc scripts in `/tmp` and were never committed, and CI (`.github/workflows/deploy.yml`) publishes to the child's device with no test gate. This plan adds bun's built-in test runner (zero new runtime deps), a fixture-based determinism guard, invariant tests for the pure game-math modules, and a CI test gate.

## Current state

- `src/monsters/catalog.ts` — deterministic catalog. Exports `MONSTERS` (readonly array of 48), `MONSTER_COUNT`, `rarityOf(id)`, `IDS_BY_RARITY`, `mulberry32(seed)`, `FIRST_MONSTER_ID`. Top of file (lines 4–6):

  ```ts
  // UWAGA: NIGDY nie zmieniać seeda ani kodu generacji po wydaniu —
  // zapisujemy tylko monsterId, więc zmiana = inna kolekcja na urządzeniu dziecka.
  const GLOBAL_SEED = 0x9077_0421
  ```

  Rarity layout: ids 0–23 common, 24–37 rare, 38–44 epic, 45–47 legendary. Each monster is `{ id, rarity, dna, name }`; `dna` is `{ body, palette, eyes, mouth, topper, pattern, accessory }`.

- `src/game/facts.ts` — pure. Exports `ALL_FACTS` (55 commutative facts, key `"axb"` with `a <= b`), `factKey(a, b)`, `unlockedFacts(stage)`, `STAGES`, `budgetMs(fact)` = `4000 + 800 * fact.b`, `starsFor(elapsedMs, fact)` (3⭐ ≤ budget, 2⭐ ≤ 1.5×, 1⭐ ≤ 2.5×, else 0), constants `QUESTIONS_PER_ROUND = 10`, `MAX_QUESTIONS_PER_ROUND = 12`, `FRAGMENTS_PER_EGG = 5`.

- `src/game/adaptive.ts` — pure. Exports `emptyStats()`, `decayStats(stats, now)` (after ≥1 day: `mastery *= 0.97 ** min(days, 30)`; never decays when `attempts === 0`), `applyAnswer(stats, fact, correct, elapsedMs, now)` (correct: `m += (1-m) × (fast ? 0.30 : 0.15)` where fast = `elapsed <= budgetMs(fact)`; wrong: `m *= 0.5`, streak reset), `pickNextFact(facts, stage, exclude, rand)` (weight `(1-m)² + 0.05`, ×2.5 when `attempts === 0`), `shouldUnlockNextStage(facts, stage)` (all unlocked facts attempted AND mean mastery ≥ 0.65).

- `src/game/rewards.ts` — pure. Exports `eggQuality(stars)` (0–9 normal, 10–17 silver, 18–25 gold, 26–30 rainbow), `RARITY_ODDS` (4 tables, each must sum to 100), `rollMonster(quality, ctx)`, `rollWish(ctx)`, `ISKIERKI_FOR_DUP`, `WISH_COST`, `RARITY_ORDER`. `ctx` is `{ idsByRarity, owned: ReadonlySet<number>, dreamId: number | null, rarityOf, rand: () => number }`. Contracts: if the rolled tier equals the dream monster's tier and the dream is unowned, the dream hatches; `rollWish` with an unowned dream returns exactly the dream; without a dream it returns only unowned monsters; it returns `null` when all 48 are owned.

- `package.json` — scripts today:

  ```json
  "scripts": {
  	"dev": "vite",
  	"build": "tsc -b && vite build",
  	"preview": "vite preview",
  	"typecheck": "tsc -b --noEmit"
  }
  ```

  No `test` script. devDependencies do NOT include `@types/bun`.

- `tsconfig.json` — strict, `noUncheckedIndexedAccess: true`, `moduleResolution: "bundler"`, **no** `resolveJsonModule`, no `types` array (so all installed `@types/*` packages are auto-included).

- `.github/workflows/deploy.yml` — deploy job steps today (lines 24–28):

  ```yaml
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
  ```

  `bun run build` includes `tsc -b`, so typecheck is already gated; tests are not.

- Repo conventions (match them): **tabs for indentation, no semicolons, double quotes**. Comments in Polish, used only to state non-obvious constraints — see `src/game/adaptive.ts` for the style. Pure modules must stay free of React/DOM imports and take randomness as an injected `rand: () => number` (see `pickNextFact`).

- Verified at planning time: `bun -e "const m = await import('./src/monsters/catalog'); console.log(m.MONSTERS.length)"` prints `48` from the repo root — bun resolves the TS modules directly.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `bun i`             | exit 0              |
| Typecheck | `bun run typecheck` | exit 0, no output beyond the `$ tsc -b --noEmit` echo |
| Tests     | `bun test`          | all pass, exit 0    |
| Build     | `bun run build`     | exit 0, `dist/` written |

## Scope

**In scope** (the only files you should modify or create):
- `package.json` (add `test` script, add `@types/bun` devDep)
- `tsconfig.json` (add `resolveJsonModule`)
- `src/monsters/catalog.fixture.json` (create, generated)
- `src/monsters/catalog.test.ts` (create)
- `src/game/facts.test.ts` (create)
- `src/game/adaptive.test.ts` (create)
- `src/game/rewards.test.ts` (create)
- `.github/workflows/deploy.yml` (add test step)
- `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`, `src/monsters/CLAUDE.md` (Verification/commands sections only — see Step 7)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `src/monsters/catalog.ts`, `names.ts`, `parts.tsx`, `MonsterSvg.tsx` — the generator is FROZEN. If a test fails against it, the test or fixture is wrong, never the generator. Do not "fix" the generator to satisfy a test.
- `src/game/facts.ts`, `adaptive.ts`, `rewards.ts` — tests characterize current behavior; do not change the math.
- `src/store/**` — covered by plan 002.
- `src/components/**`, `src/screens/**`, `src/App.tsx` — unrelated UI (has uncommitted user changes).

## Git workflow

- Branch: `advisor/001-test-baseline` (repo works on `main`; executor runs in a worktree).
- Commit style from `git log`: short imperative summary line, body optional, ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Example: `Game core: facts, adaptive engine, rewards, monster catalog, store, all screens`.
- Do NOT push or open a PR.

## Steps

### Step 1: Test infrastructure

1. `bun add -d @types/bun`
2. In `package.json` scripts add: `"test": "bun test"`
3. In `tsconfig.json` compilerOptions add: `"resolveJsonModule": true`

**Verify**: `bun run typecheck` → exit 0. `bun test` → exits with "no tests found" style message (no test files yet) — that is expected at this step.

### Step 2: Generate the catalog fixture

From the repo root:

```bash
bun -e "const m = await import('./src/monsters/catalog'); console.log(JSON.stringify(m.MONSTERS, null, '\t'))" > src/monsters/catalog.fixture.json
```

**Verify**: `bun -e "const f = await import('./src/monsters/catalog.fixture.json'); console.log(f.default.length)"` → prints `48`. Also `git diff --stat` shows only the new fixture file.

### Step 3: Catalog determinism test

Create `src/monsters/catalog.test.ts` using bun's runner (`import { describe, expect, test } from "bun:test"`). Cover:

1. **Fixture equality (the frozen-seed guard)**: `expect(MONSTERS).toEqual(fixture)` where `fixture` is `import fixture from "./catalog.fixture.json"`. Add a Polish comment above this test stating the contract, e.g. `// Strażnik zamrożonego seeda: jeśli ten test padł, NAPRAW GENERATOR, nie fixture — zmiana wyniku generacji podmienia kolekcję dziecka. Nowe potworki dodawaj wyłącznie nowymi id powyżej 47 (wtedy dopisz je do fixture).`
2. Rarity distribution: exactly 24 common, 14 rare, 7 epic, 3 legendary; `MONSTERS.length === 48` and `MONSTER_COUNT === 48`.
3. All DNA signatures unique (serialize each `dna` with `JSON.stringify`, collect in a `Set`, size 48) and all names unique.
4. Every legendary has `dna.palette === 7` and `dna.accessory === "crown"`; every epic has `dna.palette === 6` and accessory `"wings"` or `"aura"`; commons/rares have palette 0–5 and accessory `"none"`.
5. `rarityOf` boundaries: `rarityOf(0) === "common"`, `rarityOf(23) === "common"`, `rarityOf(24) === "rare"`, `rarityOf(37) === "rare"`, `rarityOf(38) === "epic"`, `rarityOf(44) === "epic"`, `rarityOf(45) === "legendary"`, `rarityOf(47) === "legendary"`.

**Verify**: `bun test src/monsters` → all pass.

### Step 4: facts tests

Create `src/game/facts.test.ts`:

1. `ALL_FACTS.length === 55`; every fact has `a <= b`; keys unique.
2. `factKey(7, 3) === "3x7"` and `factKey(3, 7) === "3x7"`.
3. `unlockedFacts(0).length === 10` (factors 1, 2, 5, 10); `unlockedFacts(6).length === 55`.
4. `budgetMs` for the 7×8 fact === `10400`.
5. `starsFor` thresholds for the 7×8 fact: `10400` → 3, `15600` → 2, `26000` → 1, `26001` → 0.

**Verify**: `bun test src/game/facts.test.ts` → all pass.

### Step 5: adaptive tests

Create `src/game/adaptive.test.ts`. Use a fixed `now = 1_700_000_000_000` (no `Date.now()` in assertions) and `mulberry32` imported from `../monsters/catalog` wherever a `rand` is needed — never `Math.random`.

1. Four fast correct answers from `emptyStats()` → `mastery` close to `0.7599` (`toBeCloseTo(1 - 0.7 ** 4, 5)`); `attempts === 4`, `streak === 4`.
2. A wrong answer halves mastery exactly and resets `streak` to 0.
3. A slow correct answer (elapsed just over budget) gains with factor 0.15, not 0.30.
4. `decayStats` with `lastSeen` 10 days before `now` multiplies mastery by `0.97 ** 10`; with 100 days, by `0.97 ** 30` (cap); with `attempts === 0` it returns stats unchanged; under 1 day, unchanged.
5. Weighted selection prefers weak facts: build stage-0 stats where every fact has mastery 0.95 except `"2x5"` at 0.05; with `rand = mulberry32(42)`, over 2000 calls to `pickNextFact(facts, 0, [], rand)` the `"2x5"` count is `> 1100`.
6. `pickNextFact` excludes the last-asked keys passed in `exclude` (run 200 seeded draws with `exclude = ["1x1", "1x2", "1x5"]`, assert none returned).
7. `shouldUnlockNextStage`: false when any stage-0 fact has `attempts === 0`; false when all attempted but mean mastery 0.6; true when all attempted at mastery 0.7.

**Verify**: `bun test src/game/adaptive.test.ts` → all pass.

### Step 6: rewards tests

Create `src/game/rewards.test.ts`. Build `ctx` with `idsByRarity: IDS_BY_RARITY` and `rarityOf` imported from `../monsters/catalog`, and seeded `rand = mulberry32(<fixed seed>)`.

1. `eggQuality` thresholds: 0 → normal, 9 → normal, 10 → silver, 17 → silver, 18 → gold, 25 → gold, 26 → rainbow, 30 → rainbow.
2. Every `RARITY_ODDS` table sums to 100.
3. Dream tier-match: with `owned = new Set()`, `dreamId = 5` (a common), over 500 seeded `rollMonster("normal", ctx)` draws, **every** draw whose `rarityOf(result) === "common"` returns exactly `5`, and at least one such draw occurred.
4. `rollMonster` never returns an owned monster while its tier has unowned members: with all commons owned except id 7, every seeded `rollMonster("normal", ...)` draw landing in the common tier returns 7.
5. `rollWish` with unowned `dreamId = 45` returns `45`; with `dreamId = null` and 47 of 48 owned returns the single unowned id every time (50 seeded draws); with all 48 owned returns `null`.
6. `ISKIERKI_FOR_DUP` is `{common: 1, rare: 2, epic: 3, legendary: 5}` and `WISH_COST` is `{common: 10, rare: 10, epic: 20, legendary: 30}` (characterization — these are gameplay-economy constants the UI documents).

**Verify**: `bun test` → all four test files pass, exit 0.

### Step 7: CI gate + DOX documentation pass

1. In `.github/workflows/deploy.yml`, after `- run: bun install --frozen-lockfile` and before `- run: bun run build`, insert: `- run: bun test`
2. DOX pass (the repo's CLAUDE.md framework requires docs to follow reality; keep all edits in Polish, matching each file's existing tone):
   - Root `CLAUDE.md`, section "Komendy": add `bun test` to the command block and rewrite the sentence starting "Brak test runnera i lintera — …" to say tests exist (bun test, zero deps), linter still absent, and that the debug screen + manual click-through remain the UI verification. Mention the fixture guard for the catalog.
   - `src/monsters/CLAUDE.md`, "Verification" section: replace the aspirational bullets with the committed reality: `bun test src/monsters` (fixture equality vs `catalog.fixture.json`, distribution, uniqueness, palette/accessory invariants) plus the existing `?debug` gallery note. State the fixture rule: a failing fixture test means the generator changed — fix the generator; extending the collection = new ids above 47 + regenerate fixture.
   - `src/game/CLAUDE.md`, "Verification" section: replace "Smoke-test skryptem bun…" with the committed tests (`bun test src/game`) and what they cover.
   - `src/CLAUDE.md`, "Verification" section: add `bun test` alongside `bun run typecheck`.

**Verify**: `bun test && bun run typecheck && bun run build` → all exit 0. `grep -n "bun test" .github/workflows/deploy.yml` → one match between the install and build steps. `grep -rn "Brak test runnera" CLAUDE.md` → no match.

## Test plan

This plan IS the test plan; the new suites are listed per step. There is no existing test to model after — these become the exemplars. Structural pattern to set: one `describe` per module, `test` names in Polish describing the contract (matching the repo's Polish-docs convention), no shared mutable state between tests, all randomness via seeded `mulberry32`.

Final verification: `bun test` → 4 files, all pass; expect roughly 20–25 `test()` cases total.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun test` exits 0; test files exist at `src/monsters/catalog.test.ts`, `src/game/facts.test.ts`, `src/game/adaptive.test.ts`, `src/game/rewards.test.ts`
- [ ] `src/monsters/catalog.fixture.json` exists, contains 48 entries, and `git diff` shows `src/monsters/catalog.ts` UNCHANGED
- [ ] `bun run build` exits 0
- [ ] `grep -c "Math.random" src/game/*.test.ts src/monsters/*.test.ts` → 0 matches (all test randomness is seeded)
- [ ] `.github/workflows/deploy.yml` contains a `bun test` step before the build step
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any in-scope file fails the drift check against the "Current state" excerpts.
- A determinism/invariant test fails against the current generator (e.g. fixture mismatch on a fresh fixture, rarity counts not 24/14/7/3, DNA collision). That would mean the generator is already non-deterministic — a critical finding to report, NOT something to patch.
- `bun test` cannot import a module from `src/` (resolution error) after Step 1 — do not start moving files around to fix it.
- You find yourself wanting to edit `src/monsters/catalog.ts` or any file in `src/game/` (other than creating `*.test.ts`) for any reason.
- The statistical bound in Step 5.5 (>1100 of 2000) fails with the prescribed seed — report the observed count; do not silently lower the bound.

## Maintenance notes

- The fixture is the contract. Reviewers must treat any PR that regenerates `catalog.fixture.json` as suspect unless it ONLY appends ids > 47.
- When plan 002 lands, store tests will join this baseline; the CI step already covers them (`bun test` runs everything).
- Deliberately deferred: linter/formatter (low value for a solo hobby repo — recorded as rejected in plans/README.md), UI/E2E automation (puppeteer recipe exists in root CLAUDE.md for manual use; automating it in CI requires a browser in the runner and was not judged worth the complexity yet).
