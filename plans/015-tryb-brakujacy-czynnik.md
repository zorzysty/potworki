# Plan 015: Tryb „brakujący czynnik" (`7 × _ = 42`) — trzeci widok tych samych faktów

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2092dfc..HEAD -- src/game/facts.ts src/store/store.ts src/components/QuestionCard.tsx src/components/EggReward.tsx src/monsters/catalog.ts src/screens/HomeScreen.tsx src/screens/HatchScreen.tsx src/achievements/catalog.ts`
> If any of these changed since this plan was written, compare the "Current
> state" enumeration against the live code before proceeding; on a mismatch,
> treat it as a STOP condition. This plan assumes the `feat/012-wioska-budowanie`
> branch state (SAVE_VERSION 9, 217 tests) — if 013/014/016/017/018 landed
> first, re-check SAVE_VERSION and the migration slot in Step C4.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read the chain before
> editing: root `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`,
> `src/store/CLAUDE.md`, `src/monsters/CLAUDE.md` (**cały, przed
> jakimkolwiek dotknięciem `src/monsters/`**), `src/achievements/CLAUDE.md`.
> This plan changes contracts in all of them — DOX pass is Step 12, mandatory.
>
> **Naming (user preference, binding)**: the user wordsmiths all player-facing
> Polish names himself. Every LABEL in this plan („Zgadnij czynnik", HelpTip
> copy, achievement titles) is a **PROPOZYCJA**. The mode TOKEN is different:
> it is CODE persisted in `PendingEgg.mode` — pick it once and freeze it
> forever (this plan uses **`"gap"`**, matching the `"mult"`/`"div"` style;
> if the operator prefers another token, decide BEFORE Step 1, never after
> the first deploy).

## Status

- **Priority**: P2 (feature — highest pedagogy-per-effort on the idea list)
- **Effort**: L — Phase A+B (core mode, M) **plus Phase C** (gap-only
  monsters + counter/achievements), which is **IN SCOPE for v1 per the
  maintainer's decision (2026-07-12)**. Phase C remains technically
  severable (each sub-step compiles alone) — that is a rollback affordance,
  not an invitation to skip it.
- **Risk**: MED (a third value in a persisted union; Phase C touches the
  frozen monster catalog via its documented append-only procedure)
- **Depends on**: none functionally; written against `feat/012-wioska-budowanie`
  @ `2092dfc` (SAVE_VERSION = 9, 217 tests green)
- **Category**: feature (pedagogika + kolekcja)
- **Planned at**: commit `2092dfc`, 2026-07-12

## Why this matters

Division proved the pattern: a new mode is **another view of the same 55
facts** — shared mastery, shared stages, shared egg economy, zero new
pedagogy plumbing. The missing-factor form (`7 × _ = 42`) is the natural
third view and the most valuable one: it is **pre-algebra** (solving for an
unknown), it exercises the multiplication↔division link explicitly, and
Polish grade-3 curricula treat it as its own skill that kids find harder
than either bare form. The architecture cost is a fraction of what division
paid, because division already generalized everything: `GameMode` flows from
the Home switch through `RoundState`, `makeQuestion`/`expectedAnswer`,
auto-submit, the egg stamp (`PendingEgg.mode`) and the hatch pool filter.
This plan mirrors that recipe for mode `"gap"` and gives it the
same reward hook that made division worth choosing: a small block of
monsters obtainable **only** through this mode.

Design rules that bind every step (root `CLAUDE.md`):
- same budgets/stars/mastery — a gap answer scores exactly like the same
  fact in mult/div ("szybkość tylko nagradza"; selection/decay stay
  mode-blind);
- UI Polish-only, labels PROPOZYCJE;
- the frozen monster catalog is touched ONLY via the documented append
  procedure (`src/monsters/CLAUDE.md`).

## Current state

Verified at `2092dfc` (`bun test` → 217 pass / 0 fail, `SAVE_VERSION = 9`).

### The mode recipe — every `GameMode` site in production code

This enumeration is the heart of the plan: adding `"gap"` means visiting
each of these and deciding third-branch vs. already-generic. Verified by
`grep -rn '"div"\|"mult"\|GameMode' src` (test files handled in Test plan):

| Site | Today | `"gap"` needs |
|------|-------|----------------|
| `src/game/facts.ts:4` | `export type GameMode = "mult" \| "div"` | add `"gap"` to the union |
| `facts.ts:92-116` `makeQuestion` | `if (mode === "div") {…}` else mult-flip | new branch (see semantics below) |
| `facts.ts:119-121` `expectedAnswer` | ternary `div ? a/b : a*b` | 3-way (gap → `b / a`) |
| `src/store/store.ts:106,113` ephemeral `mode`/`setMode` | typed `GameMode` | nothing (generic) |
| `store.ts:71` `RoundState.mode` | frozen per round | nothing (generic) |
| `store.ts:165-178` `rollContext` | zeroes a division-only dream when `mode === "mult"` | **Phase B (Step 6): generalize NOW** — dream honored only if present in the mode's pool (see „The dream-priority leak" below) |
| `store.ts:187` `wishEggCost` | `isDivisionOnly(dream)` → no-dream price | Phase C: also exclude gap-only |
| `store.ts:395` `divCorrect` bump | `correct && round.mode === "div"` | Phase C: parallel `gapCorrect` |
| `store.ts:644` `buyWishEgg` | stamps `{quality:"wish", mode:"mult"}` | nothing (wish = base pool by design) |
| `store.ts:259,902` resets | `mode: "mult"` | nothing |
| `src/game/debug.ts:37` `simulateRoundOutcome` | `mode: GameMode = "mult"` param, stamps eggs | nothing (generic) |
| `src/game/rewards.ts` `PendingEgg.mode`, `addEggFragment` | typed `GameMode` | nothing (generic) |
| `src/monsters/catalog.ts:49-57` `idsByRarityForMode` | `"div"` → **full catalog**, else filter div-only | **rework in Phase C** (see trap below); Phase A/B: `"gap"` must behave like `"mult"` (base pool) until gap-only monsters exist |
| `src/components/QuestionCard.tsx:7-33` | `op = div ? "÷" : "×"`, renders `a op b = ?` | new rendering branch (blank slot in the equation) |
| `src/components/EggReward.tsx:106` | `mode === "div"` → „÷" badge | add gap badge |
| `src/screens/HatchScreen.tsx:154` | `e.mode === "div"` → „÷" marker | add gap marker |
| `src/screens/HomeScreen.tsx:120-131` | 2-option segmented control (`max-w-xs`) | 3 options — layout check |
| `src/screens/DebugScreen.tsx:54-62` | mult/div toggle buttons | third button |
| `src/store/schema.ts:109` migration v3→v4 | stamps legacy eggs `"mult"` | nothing (history, don't touch) |

**No migration needed for Phase A/B**: extending the union is
backward-compatible — every persisted egg already carries `"mult"`/`"div"`,
and new `"gap"` eggs are just a new value in an existing string field.

### Question semantics (`RoundQuestion` is display-ordered)

`RoundQuestion = { key, a, b, isRequeue }` (`facts.ts:80-87`). Per-mode
meaning today: mult → `a × b`, answer `a*b`; div → `a` = dividend (product),
`b` = divisor, answer `a/b`. **For `"gap"`**: `a` = the KNOWN factor
(chosen by injected `rand` from `fact.a`/`fact.b`), `b` = the product
(`fact.a * fact.b`); expected answer = the missing factor = `b / a` (always
1–10, so 1–2 digits). This slots into the existing machinery untouched:
- auto-submit (`store.ts:333-336` `pressDigit`) derives digit count from
  `String(expectedAnswer(q, mode)).length` — works as-is;
- the `answer.length >= 3` cap and keypad/keyboard paths are mode-blind;
- the wrong-phase „Przepisz wynik" ritual re-types `expectedAnswer` — for
  gap that is the missing factor, which is exactly the right thing to
  retype (QuestionCard's wrong branch shows the filled equation).

### Intro-round rule (mirror of division's divisor-forcing)

Division forces the freshly unlocked factor onto the **divisor** position
during the intro round ("działanie, nie wynik": `72÷8`, not `72÷9` —
`facts.ts:99-107`, driven by `introFactor`). The gap mirror: the new factor
becomes the **known, visible factor** (`a`), so the child SEES the new digit
in the operation and solves for the familiar one: `8 × _ = 72` after
unlocking ×8. Same `introIsOperand` guard shape as div.

### The dream-priority leak (Phase A/B correctness bug — fix in Step 6, verified)

The dream guard does NOT wait for Phase C. `rollContext` (`store.ts:166-171`)
zeroes a division-only dream **only** when `mode === "mult"` — for a fresh
`"gap"` mode it passes the dream through untouched. Downstream, `pickInTier`
(`rewards.ts:146-160`) returns a tier-matching, unowned dream **without
checking that the dream is in the mode's pool** (`inTier` is computed but the
dream branch short-circuits before it). Net effect in Phase A/B: a `"gap"`
egg with a division-only dream set (rainbow → legendary tier 15%) hatches the
div-only legendary, violating this plan's own "gap eggs = base pool"
invariant — and Step 7's basic negative test won't catch it unless a dream is
set. Fix belongs in Phase B (Step 6): generalize the guard to
pool-membership, which also future-proofs Phase C for free.

### The `idsByRarityForMode` trap (Phase C blocker, verified)

`catalog.ts:52`: `if (mode === "div") return IDS_BY_RARITY` — division sees
the FULL catalog because today "full" == "base + div-only". The moment
gap-only ids exist, this line would leak them into division eggs. Phase C
MUST rework it to per-mode exclusive filtering (each exclusive block visible
only to its own mode; `"mult"`/wish see base only). The catalog test
`"DIVISION_ONLY_IDS/idsByRarityForMode (mult wyklucza…, div zawiera)"`
changes accordingly.

### Frozen-catalog append procedure (Phase C, verified against `src/monsters/CLAUDE.md`)

The doc EXPLICITLY allows appending: "Nowe potworki wolno dodawać wyłącznie
nowymi id powyżej dotychczasowego maksimum, bez wpływu na wyniki
istniejących". Current state: `MONSTER_COUNT = 76`, rarity distribution
36/21/11/8, ids 72–75 = `DIVISION_ONLY_IDS`. The signature test procedure is
documented in its Verification section: "Dokładając potworki: uruchom test
raz, odczytaj faktyczną sygnaturę z błędu, dopisz nowe wpisy (pierwsze 72
muszą zostać bit-w-bit)". **Note the doc's own staleness**: "72" dates from
the 72-monster era — the signature literal today locks all **76** existing
entries, and 76 is the number this plan's C1 verifies bit-for-bit (Step 12
fixes the stale "72" in the doc while updating it). So gap-only ids 76–79
are legal; `rarityOf`
gets a new explicit block (76–79 → legendary), `SALT_STRIDE`/seed/PRNG are
untouched, and the signature literal is extended, never rewritten.
Also affected: `world.ts` `originOf` sends div-only to `BRIDGE_ORIGIN` and
everything else to `regionOf(id) = id % 7` — new exclusive monsters need
their own origin variant (a new `kind` in the discriminated union, mirror of
`BRIDGE_ORIGIN`) or they'd falsely claim a region; `world.test.ts` asserts
the current dichotomy and must learn the third case. `CollectionScreen` has
four `isDivisionOnly` call sites (tile/modal markers + dream guards) needing
gap parallels.

### Achievements precedent

`pierwsze-dzielenie` (easy, `divCorrect ≥ 1`), `dzielenie-50` (medium),
`mistrz-dzielenia` (hard, 200) all read the `divCorrect` counter bumped in
`pressConfirm`. A `gapCorrect` counter requires: `AchievementCounters` field
+ `SAVE_VERSION` bump + migration + `mergePersisted` already backfills
`achievementStats` (no extra work) + bump site next to `store.ts:395` +
appended achievement ids + tripwire/totals updates (`catalog.test.ts`,
`evaluate.test.ts` — currently 44 achievements / 550 iskierek).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bun run typecheck` | exit 0 |
| Full suite | `bun test` | all pass (217 + new) |
| One file | `bun test src/game/facts.test.ts` | passes |
| Lint/format | `bun run check` | exit 0 |
| Build | `bun run build` | exit 0 |
| Visual | dev server + puppeteer-core recipe in root `CLAUDE.md` | screenshots |

## Scope

**In scope — Phase A+B (the mode itself)**:
- `src/game/facts.ts` — union + `makeQuestion` + `expectedAnswer`
- `src/game/facts.test.ts` — gap branches
- `src/components/QuestionCard.tsx` — blank-slot rendering
- `src/components/EggReward.tsx`, `src/screens/HatchScreen.tsx` — egg markers
- `src/screens/HomeScreen.tsx` — 3-way segmented control + HelpTip copy
- `src/screens/DebugScreen.tsx` — third mode button
- `src/store/store.test.ts` — „tryb luki" describe (mirror of „tryb dzielenia")
- DOX docs (Step 12)

**In scope — Phase C (v1 per maintainer decision 2026-07-12; "severable" =
rollback affordance only, each sub-step compiles alone)**:
- `src/monsters/catalog.ts` — ids 76–79 (`GAP_ONLY_IDS`, `isGapOnly`,
  `rarityOf` block, `MONSTER_COUNT = 80`), `idsByRarityForMode` rework
- `src/monsters/catalog.test.ts` — distribution 36/21/11/12, signature append
- `src/monsters/world.ts` + `world.test.ts` — origin variant for gap-only
- `src/screens/CollectionScreen.tsx` — markers + dream guards
- `src/store/store.ts` — `rollContext`/`wishEggCost` generalization,
  `gapCorrect` bump
- `src/store/schema.ts` + tests — counter + `SAVE_VERSION` bump + migration
- `src/achievements/catalog.ts` + tests — 1–2 appended achievements

**Out of scope (do NOT touch)**:
- `GLOBAL_SEED`, `mulberry32`, `SALT_STRIDE`, `rollDna`, `generateName`,
  palette stratification, rarity mapping of ids 0–75 — the frozen core.
- Selection (`pickNextFact`), unlock criteria, decay, budgets, star rules —
  the mode is a VIEW; pedagogy engine stays mode-blind.
- The village/wage economy (a gap round pays like any round — nothing to do).
- The v3→v4 migration that stamps `"mult"` on legacy eggs (history).

## Git workflow

- Branch: `feat/015-tryb-luka` (stacked on wherever `main`/012 is when
  implementation starts).
- Commit per phase; message style matches `git log`
  (e.g. `feat(luka): third game mode — missing factor`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Phase A — the mode core

#### Step 1: Freeze the token, extend the domain (`src/game/facts.ts`)

- `export type GameMode = "mult" | "div" | "gap"` — **`"gap"` is now frozen**
  (it will be persisted inside `PendingEgg.mode`).
- `makeQuestion`: add the gap branch BEFORE the mult fallthrough, mirroring
  div's shape (including the intro rule):

```ts
if (mode === "gap") {
	// znany czynnik widoczny w działaniu; w intro-rundzie wymuszamy nową
	// cyfrę na pozycji ZNANEGO czynnika (dziecko widzi nową liczbę i
	// rozwiązuje o znajomą): 8 × _ = 72, nie 9 × _ = 72
	const introIsOperand =
		introFactor !== null && (fact.a === introFactor || fact.b === introFactor)
	const known = introIsOperand
		? (introFactor as number)
		: rand() < 0.5
			? fact.a
			: fact.b
	return { key: fact.key, a: known, b: fact.a * fact.b, isRequeue }
}
```

- `expectedAnswer`: 3-way — `mode === "div" ? a / b : mode === "gap" ? b / a : a * b`.

**Verify**: `bun run typecheck` — it will now FAIL wherever a switch/ternary
is not exhaustive… except most sites are binary ternaries that silently
treat `"gap"` as mult. That silence is the risk: work through the Current
state table row by row anyway; do not rely on the compiler alone.

#### Step 2: Unit tests for the domain (`src/game/facts.test.ts`)

Model on the existing `makeQuestion` div tests (`facts.test.ts:123-180`):
- gap, non-intro: `a ∈ {fact.a, fact.b}` (both reachable across seeded
  rands), `b === fact.a * fact.b`, `expectedAnswer(q, "gap")` is the OTHER
  factor and an integer in 1..10;
- gap + `introFactor` being an operand → `a === introFactor` regardless of
  rand (mirror of the div divisor-forcing test at `:174`);
- gap + `introFactor` NOT an operand → rand decides;
- `expectedAnswer` 3-way table for one fact.

**Verify**: `bun test src/game/facts.test.ts` → pass.

#### Step 3: QuestionCard blank-slot rendering

`QuestionCard.tsx` currently renders `a op b = ?` + a dashed answer box. For
gap the equation itself contains the blank; render (answering phase):

```
7 × ▢ = 42
```

where `▢` is a styled inline chip (same violet dashed idiom as the answer
box) that **MIRRORS the typed digits live**: the blank IS the answer display
(`round.answer` renders inside it as she types, keypad and physical keyboard
alike — both feed the same `round.answer`, so parity is automatic). The
separate answer box below is HIDDEN in gap mode (or visually merged into the
blank) — a 9-year-old must never see two dashed boxes with different
content; there is exactly one box, in the equation, and it fills as she
types.
Wrong-phase ritual: show the solved equation with the missing factor
highlighted (`7 × [6] = 42`, amber like div's result highlight) over the
„Przepisz wynik:" caption — `expectedAnswer` already returns the factor, so
`pressConfirm`'s retype logic is untouched. Keep `op`/`result` computation a
3-way derived from `mode`.

**Verify**: typecheck; visual in Step 8.

#### Step 4: Egg markers

- `EggReward.tsx:106` and `HatchScreen.tsx:154`: add the gap marker next to
  the existing „÷" pattern. PROPOZYCJA: `🧩` in the same badge style —
  deliberately NOT `?`, which collides with the game-wide `???` =
  "unknown monster" convention (a `?` egg reads as "mystery egg", not
  "gap-mode egg").
- Grep `mode === "div"` once more after editing — no remaining
  binary-assumption sites in components.

#### Step 5: Home segmented control → 3 options

`HomeScreen.tsx:120-131` — add `["gap", "? Zgadnij"]` (PROPOZYCJA; also on
the table: „Luka", „Zgadnij czynnik"). Layout: the control is `max-w-xs`
with `flex-1` buttons and `text-lg` labels — three Polish labels will NOT
fit at `text-lg`; drop to `text-base` (or icon-first two-line labels) **and
add `min-h-16` to the mode buttons** — today they are ~52 px tall (`py-3`),
already under the 64 px touch-target contract, and smaller text would shrink
them further. **Verify at 360 px width** (portrait phone) that nothing wraps
or truncates and targets stay ≥ 64 px.
Update the HelpTip text (PROPOZYCJA: „…albo zgadywanie brakującej liczby —
niektóre potworki wykluwają się tylko z takich jajek!"; the gap-only-monsters
mention is accurate because Phase C ships in v1). `DebugScreen.tsx`: add the
third toggle button (stamps simulated eggs).

**Verify**: `bun run typecheck`; visual at 360 px and tablet widths.

### Phase B — store integration + characterization

#### Step 6: Generalize the dream guard in `rollContext` (leak fix — NOT deferred to C)

Replace the mult-only special case (`store.ts:166-171`) with pool-membership
— the dream is honored only if it exists in the mode's hatch pool:

```ts
// wymarzony ma priorytet tylko, gdy jest w puli trybu jajka (potworek
// ekskluzywny innego trybu nie może się wykluć „na życzenie" z cudzego jajka)
const pool = idsByRarityForMode(mode)
const dreamId =
	state.dreamMonsterId !== null &&
	pool[rarityOf(state.dreamMonsterId)].includes(state.dreamMonsterId)
		? state.dreamMonsterId
		: null
```

Behavior is bit-identical for `"mult"` (div-only dream still zeroed) and
`"div"` (full pool — nothing zeroed), fixes the Phase A/B `"gap"` leak, and
makes Phase C's gap-only exclusivity work with NO further guard changes.
Update the comment above `rollContext` accordingly.

**Verify**: `bun run typecheck`; `bun test` → the existing div-mode dream
tests still green (they characterize exactly this behavior).

#### Step 7: Store tests (`src/store/store.test.ts`)

New `describe("tryb luki", …)` mirroring `describe("tryb dzielenia", …)`
(`store.test.ts:440-520`) and reusing `answerByMode` — which must learn the
third mode first (it computes the expected answer from `round.mode`; add
`gap → question.b / question.a`). Cover:
- `setMode("gap")` + `startRound` → `round.mode === "gap"`, question shape
  (`b === product of the fact behind key`, `a` divides `b`);
- correct gap answer → phase `correct`, fragment granted, mastery of the
  UNDERLYING fact key rises (shared-progress proof — the same assertion
  style as the div test at `:457`);
- egg earned during a gap round has `mode: "gap"` (mirror of `:469`);
- `debugReset` returns mode to `"mult"` (extend `:482`);
- intro round in gap mode: new factor appears as the known factor `a` on
  the 5 new-factor questions (mirror of `:488`);
- Phase A/B pool behavior: a `"gap"` egg NEVER hatches a division-only
  legendary (it uses the base pool until Phase C) — loop pattern from
  `:521`;
- **dream-set variant of the negative test** (the leak Step 6 fixes): own
  everything except div-only, `setDreamMonster(72)`, `setMode("gap")`, loop
  rainbow eggs → NEVER hatches ids 72–75. Without Step 6 this test FAILS —
  it is the regression net for the guard.

**Verify**: `bun test src/store` → all pass; `bun test` → full suite green.

#### Step 8: Visual pass

Dev server + puppeteer-core (root `CLAUDE.md` recipe): Home with 3-way
switch (360 px + 1024 px), a gap round (`7 × ▢ = 42`, answer box, wrong-
phase ritual with highlighted factor), summary, egg marker in nest.
Screenshot each; report.

### Phase C — gap-only monsters + counter (IN SCOPE for v1; severable = rollback affordance)

> Phase C is part of v1 (maintainer decision 2026-07-12) and runs
> continuously after Phase B — do NOT pause between B and C. Each C-step
> leaves the suite green on its own, but that is a ROLLBACK affordance, not
> a menu. Read `src/monsters/CLAUDE.md` in full again before C1.

#### Step C1: Append monsters 76–79 (`src/monsters/catalog.ts`)

Per the documented append procedure ONLY: `MONSTER_COUNT = 80`;
`rarityOf`: new explicit block `76–79 → "legendary"` (comment mirrors the
72–75 block); `GAP_ONLY_IDS = new Set([76,77,78,79])` + `isGapOnly` (mirror
of `DIVISION_ONLY_IDS`/`isDivisionOnly`). Seed/PRNG/`SALT_STRIDE` untouched.
Then the signature test: run once, read the ACTUAL signature from the
failure, verify the **first 76 entries are bit-for-bit identical** to the
old literal (diff them mechanically, not by eye), append the 4 new entries.
Update the distribution test (36/21/11/12) and add `GAP_ONLY_IDS` coverage.

**Verify**: `bun test src/monsters` → pass, signature test green with the
extended literal.

#### Step C2: Per-mode exclusive pools (`idsByRarityForMode` rework)

Replace the `"div" → full catalog` shortcut with explicit exclusion:

```ts
// każdy blok ekskluzywny widoczny tylko dla swojego trybu; mult/wish = baza
const excluded = (id: number) =>
	(mode !== "div" && isDivisionOnly(id)) || (mode !== "gap" && isGapOnly(id))
```

applied to the legendary tier (both exclusive blocks are legendary). Update
the catalog tests: div excludes gap-only, gap excludes div-only, mult
excludes both, gap includes gap-only. Store side: the `rollContext` dream
guard is ALREADY pool-membership-based (Step 6) — it covers gap-only dreams
automatically once the pools change; only `wishEggCost` needs work here
(treat a gap-only dream like a div-only one: no-dream price; wish eggs stay
`"mult"`-pool). Reachability
tests mirror plan 009's pair: gap egg CAN hatch a gap-only legendary
(300-rainbow loop), mult and DIV eggs never do.

**Verify**: `bun test` → green, including the updated negative tests.

#### Step C3: World/lore + collection surface

- `world.ts`: new origin variant for `GAP_ONLY_IDS` (discriminated-union
  `kind`, mirror of `BRIDGE_ORIGIN`; name PROPOZYCJA — e.g. „Dolina
  Zagadek"); `originOf` routes gap-only there; `world.test.ts` learns the
  three-way split. Purely presentational — zero SaveState impact.
- `CollectionScreen.tsx`: gap marker on tiles/modal (all four
  `isDivisionOnly` sites get a gap sibling); dream guard: a gap-only dream
  gets no wish-egg priority (same UX as div-only today).
- `HatchScreen`/`EggReward` markers already done in Step 4.

#### Step C4: `gapCorrect` counter + achievements

- `schema.ts`: `gapCorrect: number` in `AchievementCounters` (+
  `INITIAL_SAVE`), **`SAVE_VERSION` bump to the next free number at
  implementation time** (plans 013/017 also bump it — coordinate; migration
  appends `gapCorrect: 0` to existing `achievementStats`, pattern of v6→v7).
  `mergePersisted` already deep-backfills `achievementStats` — no change.
- `store.ts`: bump next to `divCorrect` (`pressConfirm`, first attempts,
  `correct && round.mode === "gap"`).
- `achievements/catalog.ts`: append (never reorder) e.g.
  `pierwsza-luka` (easy, `gapCorrect ≥ 1`, PROPOZYCJA „Detektyw liczb") and
  `luka-50` (medium, 50). Update tripwire id list + totals in
  `catalog.test.ts`/`evaluate.test.ts` (count and iskierki sum grow
  accordingly — compute, don't guess) and the max-save fixtures' counters.
- `schema.test.ts`: migration test + shape-lock only if a NEW top-level key
  appears (it doesn't — counters live inside `achievementStats`).

**Verify**: `bun test` → green; `bun run typecheck`.

### Step 12: DOX pass (mandatory, both phases)

- `src/game/CLAUDE.md` — `GameMode` bullet: three views of the same fact;
  gap semantics (`a` = known factor, `b` = product, answer = `b/a`);
  intro-round rule („nowa cyfra jako znany czynnik"); Verification: new
  `makeQuestion`/`expectedAnswer` coverage.
- `src/store/CLAUDE.md` — mode bullet mentions three modes; Phase C: pool
  filtering via both exclusive sets, `gapCorrect` counter + migration,
  updated Verification.
- `src/CLAUDE.md` — mode-switch bullet (3-way control, QuestionCard blank
  slot, gap egg markers).
- `src/monsters/CLAUDE.md` (Phase C) — „Aktualny stan": `MONSTER_COUNT = 80`,
  distribution, `GAP_ONLY_IDS`, reworked `idsByRarityForMode` semantics,
  world origin variant. Keep the frozen-core wording INTACT.
- `src/achievements/CLAUDE.md` (Phase C) — new count/total, `gapCorrect`.
- `README.md` — modes description mentions the third mode (and 80 monsters
  if C1 shipped — the README count is hand-maintained, see plan 008 history).
- `plans/README.md` — status row 015.

## Test plan

- `facts.test.ts` — gap `makeQuestion` (known-factor rand, intro forcing,
  product), `expectedAnswer` 3-way (Step 2).
- `store.test.ts` — `describe("tryb luki")`: round shape, shared mastery,
  egg stamp, reset, intro round, base-pool negatives incl. the dream-set
  variant (Step 7); Phase C adds
  the reachability pair (C2) and `gapCorrect`/achievement flows (C4).
- `catalog.test.ts` (C) — distribution 36/21/11/12, signature append with
  first-76-bit-identical check, per-mode pool matrix (C1–C2).
- `world.test.ts` (C) — three-way `originOf` (C3).
- `achievements` tests (C) — tripwire + totals (C4).
- Manual visual pass per Step 8.

## Done criteria

Machine-checkable. ALL must hold (Phase C is in scope — (C) items are
expected, conditional only under a rollback):

- [ ] `bun run typecheck`, `bun run build`, `bun run check` all exit 0
- [ ] `bun test` exits 0; no previously-passing test modified except the
      explicitly listed ones (catalog distribution/signature/pool tests,
      achievements tripwire/totals — Phase C only)
- [ ] `grep -n '"gap"' src/game/facts.ts` → union member present
- [ ] `grep -rn 'mode === "div" ?' src --include="*.ts*" | grep -v test` —
      every remaining binary ternary reviewed and listed in the report as
      intentionally binary (none may silently treat gap as mult where the
      distinction matters)
- [ ] A gap round is playable end-to-end (visual pass reported: 3-way
      switch at 360 px, blank-slot card, retype ritual, egg marker)
- [ ] (C) `git diff` on `src/monsters/catalog.ts` shows NO change to seed/
      PRNG/`SALT_STRIDE`/rollDna/name-gen — only appended ids + pool logic
- [ ] (C) signature literal: first 76 entries byte-identical (mechanical
      diff attached to the report)
- [ ] DOX docs updated per Step 12; labels marked PROPOZYCJA
- [ ] `plans/README.md` status row 015 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check fails, or `SAVE_VERSION` ≠ 9 at start and Phase C4's
  migration slot conflicts with another landed plan — renumber consciously,
  never reuse a migration index.
- Any temptation to change the mode token after first deploy, or to reuse
  `"div"` semantics for gap eggs "temporarily" — the token is persisted;
  freeze before Step 1 or stop.
- The signature test failure shows ANY difference in the first 76 entries —
  that means the append changed existing monsters: revert immediately,
  report; never "fix" the literal to match.
- `expectedAnswer` for gap produces a non-integer for any fact (impossible
  by construction — if a test shows it, the question semantics got flipped).
- The 3-option segmented control cannot fit at 360 px without dropping
  below the 64 px touch-target rule — report layout options instead of
  shrinking targets.
- A binary `mode === "div"` ternary turns out to be load-bearing for gap in
  a way not listed in the Current state table — add it to the table in the
  report before patching.

## Maintenance notes

- **Token vs label**: `"gap"` is code, frozen (eggs persist it). Every
  visible string („Zgadnij", markers, achievement titles) is PROPOZYCJA —
  hand the operator the list after landing; renames are free.
- The mode recipe is now used three times; if a FOURTH view ever appears
  (e.g. `42 ÷ _ = 7`), consider extracting a per-mode strategy object
  (render/answer/intro rules) instead of a fourth branch — three is the
  threshold where the ternaries stop scaling.
- Phase C's pool rework makes `idsByRarityForMode` the single choke-point
  for exclusivity; future exclusive blocks only extend the `excluded`
  predicate.
- Balance watch: gap questions are harder for the target child; the shared
  mastery means slow gap answers still grow mastery (0.15 path) — that is
  by design (same fact, honest signal). If she avoids the mode, the gap-only
  legendaries (C) are the pull lever, exactly as division's were.
