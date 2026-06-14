# Plan 010: Move question-building and egg-close logic out of the store into `src/game/`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat aef2b6d..HEAD -- src/store/store.ts src/game/facts.ts src/game/rewards.ts src/game/debug.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/009-new-feature-test-coverage.md (do 009 first — it adds
  the cross-round egg-bank regression test that guards this refactor, and both
  plans edit `src/store/store.test.ts`, so sequencing avoids a merge conflict)
- **Category**: tech-debt
- **Planned at**: commit `aef2b6d`, 2026-06-14

## Why this matters

The store's own contract (`src/store/CLAUDE.md:26`) says "akcje store mają
pozostać cienkimi koordynatorami" and "Logika domenowa należy do `src/game/` i
`src/monsters/`" (root `CLAUDE.md` design rule 2 / `src/game/CLAUDE.md`). Two
pieces of pure domain logic currently live inside `store.ts` and violate that:

1. **`makeQuestion`** (`store.ts:118-143`) builds the displayed question from a
   fact + mode, including the division divisor-placement rule. It calls
   `Math.random()` **directly**, so the divisor-forcing logic ("72÷8, not 72÷9")
   and the multiplication orientation flip cannot be unit-tested deterministically
   — they are only covered indirectly through the store.

2. **The egg-close logic** (`store.ts:339-361`) — add a fragment, accumulate the
   star bank, and on threshold roll the final color, reset the bank, bump
   `eggsEarned`, award the rainbow iskierka — is **duplicated almost verbatim** in
   `src/game/debug.ts:70-81` (`simulateRoundOutcome`). Two copies of the egg
   economy must be kept in lockstep by hand; they have already drifted once is a
   real risk.

Extracting both into `src/game/` makes them pure, injectable-`rand`, directly
unit-testable, and single-sourced. The store shrinks (currently 686 LOC) back
toward a thin coordinator. **Behavior must not change** — this is a pure refactor
guarded by the existing 112-test suite (which characterizes the exact current
behavior) plus new unit tests.

## Current state

### `makeQuestion` + `expectedAnswer` + `RoundQuestion` — all in `store.ts`

`RoundQuestion` interface (`store.ts:47-54`), used only within `store.ts`
(confirmed: `grep -rn RoundQuestion src/` shows store.ts only):
```ts
export interface RoundQuestion {
	key: FactKey
	a: number
	b: number
	isRequeue: boolean
}
```
`makeQuestion` (`store.ts:118-143`) — note the two direct `Math.random()` calls:
```ts
function makeQuestion(
	fact: Fact,
	isRequeue: boolean,
	mode: GameMode,
	introFactor: number | null,
): RoundQuestion {
	if (mode === "div") {
		const introIsOperand =
			introFactor !== null && (fact.a === introFactor || fact.b === introFactor)
		const divisor = introIsOperand
			? (introFactor as number)
			: Math.random() < 0.5
				? fact.a
				: fact.b
		return { key: fact.key, a: fact.a * fact.b, b: divisor, isRequeue }
	}
	const flip = Math.random() < 0.5
	return {
		key: fact.key,
		a: flip ? fact.b : fact.a,
		b: flip ? fact.a : fact.b,
		isRequeue,
	}
}
```
`expectedAnswer` (`store.ts:146-148`):
```ts
function expectedAnswer(q: RoundQuestion, mode: GameMode): number {
	return mode === "div" ? q.a / q.b : q.a * q.b
}
```
Call sites of `makeQuestion`: `store.ts:258` (in `startRound`) and `store.ts:469`
(in `nextQuestion`). Call sites of `expectedAnswer`: `store.ts:281` (`pressDigit`)
and `store.ts:297` (`pressConfirm`) — these stay in the store and call the import.

### Egg-close logic — duplicated in `store.ts` and `debug.ts`

`store.ts:339-361` (inside `pressConfirm`, after `gained` is computed):
```ts
let eggFragments = state.eggFragments + 1
let eggStarBank = state.eggStarBank + gained
let pendingEggs = state.pendingEggs
let eggsEarned = state.eggsEarned
let iskierki = state.iskierki
const eggsCreated = [...round.eggsCreated]
const threshold = fragmentsForEgg(eggsEarned)
if (eggFragments >= threshold) {
	const quality = eggQuality(
		eggQualityScore(eggStarBank, threshold),
		Math.random,
	)
	eggFragments = 0
	eggStarBank = 0
	eggsEarned++
	pendingEggs = [...pendingEggs, { quality, mode: round.mode }]
	eggsCreated.push(pendingEggs.length - 1)
	if (quality === "rainbow") iskierki = Math.min(ISKIERKI_CAP, iskierki + 1)
}
```
These five values then flow into BOTH `set(...)` branches of `pressConfirm`
(the `if (correct)` branch at `store.ts:363-378` and the `else` branch at
`store.ts:379-407`), each using object-shorthand keys
`{ facts, eggFragments, eggStarBank, eggsEarned, pendingEggs, iskierki, round }`.

`debug.ts:70-81` (inside the per-question loop of `simulateRoundOutcome`) — the
near-identical copy:
```ts
eggFragments++
eggStarBank += stars
const threshold = fragmentsForEgg(eggsEarned)
if (eggFragments >= threshold) {
	const quality = eggQuality(eggQualityScore(eggStarBank, threshold), rand)
	eggFragments = 0
	eggStarBank = 0
	eggsEarned++
	pendingEggs.push({ quality, mode })
	createdIndices.push(pendingEggs.length - 1)
	if (quality === "rainbow") iskierki = Math.min(ISKIERKI_CAP, iskierki + 1)
}
```

### Conventions

- `src/game/*` modules are **pure and deterministic except an injected
  `rand: () => number`** (`src/game/CLAUDE.md` Work Guidance). The whole point of
  this refactor is to honor that — `makeQuestion` and the egg-close function must
  take `rand`, never call `Math.random` themselves.
- Test files start with `/// <reference types="bun-types" />` and import from
  `bun:test`. Existing pattern files: `src/game/facts.test.ts` and
  `src/game/rewards.test.ts`.
- `src/game/rewards.ts` currently imports only `import type { GameMode } from "./facts"`.
  `src/game/facts.ts` imports nothing from `rewards.ts`. So `rewards.ts` may import
  `fragmentsForEgg` from `facts.ts` without creating a cycle (one direction only).

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Typecheck | `bun run typecheck`              | exit 0, no errors   |
| Tests     | `bun test`                       | all pass; count = prior + your new tests |
| Lint/format | `bun run check`                | exit 0 (auto-fixes imports/format) |

## Scope

**In scope** (the only files you should modify):
- `src/game/facts.ts` — receives `RoundQuestion`, `makeQuestion`, `expectedAnswer`
- `src/game/rewards.ts` — receives `addEggFragment` + its types
- `src/game/debug.ts` — `simulateRoundOutcome` calls `addEggFragment`
- `src/store/store.ts` — deletes the moved code, imports it, updates call sites
- `src/game/facts.test.ts` — new `makeQuestion`/`expectedAnswer` tests
- `src/game/rewards.test.ts` — new `addEggFragment` tests
- `src/game/CLAUDE.md`, `src/store/CLAUDE.md` — DOX contract updates (Step 7)
- `plans/README.md` — status row

**Out of scope** (do NOT touch):
- `src/store/store.test.ts` — its assertions must keep passing **unchanged**;
  that is the proof behavior didn't change. Do not edit it. (Plan 009 already
  added the cross-round egg-bank test there.)
- The egg-quality math itself (`eggQuality`, `eggQualityScore`, `qualityOdds`,
  `RARITY_ODDS`) — move the *orchestration* around it, not the formulas.
- `src/components/QuestionCard.tsx` and any screen — they consume the store, not
  `makeQuestion`; nothing there changes.

## Git workflow

- Branch: `advisor/010-extract-store-domain-logic`
- Commit per part is fine (one for makeQuestion, one for egg-close), or one
  combined. Message style (match repo — see `git log`, e.g.
  "refactor: move round-sim debug helpers to src/game/debug.ts"):
  `refactor: move makeQuestion + egg-close logic into src/game/`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

Do Part A (makeQuestion) and Part B (egg-close) in order. After **each** part,
run `bun test` and confirm the full suite is still green — that is your proof the
refactor preserved behavior. If a previously-passing test fails, STOP.

### Part A — move `makeQuestion`, `expectedAnswer`, `RoundQuestion` to `facts.ts`

#### Step 1: Add the three to `src/game/facts.ts`

Append to `src/game/facts.ts` (it already exports `Fact`, `FactKey`, `GameMode`).
`makeQuestion` gains a `rand: () => number` parameter replacing both
`Math.random()` calls; everything else is copied verbatim:

```ts
export interface RoundQuestion {
	key: FactKey
	// w kolejności wyświetlania. Mnożenie: losowa orientacja czynników (a×b).
	// Dzielenie: a = dzielna (iloczyn), b = dzielnik; oczekiwany wynik = a/b.
	a: number
	b: number
	isRequeue: boolean
}

// Buduje pytanie do wyświetlenia z faktu wg trybu. Mnożenie: losowa orientacja
// czynników. Dzielenie: (a*b) ÷ dzielnik = iloraz; w intro-rundzie nowy czynnik
// wymuszany na pozycji dzielnika (72÷8, nie 72÷9). rand wstrzykiwany — testowalność.
export function makeQuestion(
	fact: Fact,
	isRequeue: boolean,
	mode: GameMode,
	introFactor: number | null,
	rand: () => number,
): RoundQuestion {
	if (mode === "div") {
		const introIsOperand =
			introFactor !== null && (fact.a === introFactor || fact.b === introFactor)
		const divisor = introIsOperand
			? (introFactor as number)
			: rand() < 0.5
				? fact.a
				: fact.b
		return { key: fact.key, a: fact.a * fact.b, b: divisor, isRequeue }
	}
	const flip = rand() < 0.5
	return {
		key: fact.key,
		a: flip ? fact.b : fact.a,
		b: flip ? fact.a : fact.b,
		isRequeue,
	}
}

// Oczekiwany wynik pytania wg trybu (mnożenie a×b, dzielenie a÷b).
export function expectedAnswer(q: RoundQuestion, mode: GameMode): number {
	return mode === "div" ? q.a / q.b : q.a * q.b
}
```

**Verify**: `bun run typecheck` → exit 0.

#### Step 2: Delete the originals from `store.ts` and import from `facts.ts`

In `src/store/store.ts`:
- Delete the `RoundQuestion` interface (`store.ts:47-54`), the `makeQuestion`
  function (`118-143`), and the `expectedAnswer` function (`146-148`).
- Update the facts import. Change the type import line to include `RoundQuestion`,
  add `makeQuestion`/`expectedAnswer` to the value import, and re-export the type
  so `RoundQuestion` stays available to any external importer:
  ```ts
  import type { Fact, FactKey, GameMode, RoundQuestion } from "../game/facts"
  export type { RoundQuestion } from "../game/facts"
  import {
  	expectedAnswer,
  	FACTS_BY_KEY,
  	fragmentsForEgg,
  	isMaxStage,
  	makeQuestion,
  	MAX_QUESTIONS_PER_ROUND,
  	QUESTIONS_PER_ROUND,
  	starsFor,
  } from "../game/facts"
  ```
  (`bun run check` will sort these; exact order does not matter.)
- Update the two call sites to pass `Math.random` as the final argument:
  - in `startRound` (was `store.ts:258`):
    `question: makeQuestion(firstFact, false, mode, introFactor, Math.random),`
  - in `nextQuestion` (was `store.ts:469`):
    ```ts
    question: makeQuestion(
    	fact,
    	requeuedFact !== undefined,
    	round.mode,
    	round.introFactor,
    	Math.random,
    ),
    ```
- `RoundState.question: RoundQuestion` (was `store.ts:67`) now resolves via the
  imported type — no change needed there beyond the import.

**Verify**:
- `grep -n "function makeQuestion" src/store/store.ts` → no matches.
- `grep -n "export function makeQuestion" src/game/facts.ts` → one match.
- `bun run typecheck` → exit 0.
- `bun test` → **full suite still green** (same count as before this plan).

#### Step 3: Unit-test `makeQuestion` / `expectedAnswer` in `src/game/facts.test.ts`

Model after the existing `src/game/facts.test.ts` structure. Use deterministic
`rand` stubs (`() => 0` forces the first branch / `fact.a` divisor / no flip;
`() => 0.9` forces the other). Cover:
- mult: `rand = () => 0.9` → not flipped (`a===fact.a`); `rand = () => 0` → flipped.
- div, non-intro: dividend `a === fact.a*fact.b`; divisor `b ∈ {fact.a, fact.b}`;
  quotient is an integer in 1..10.
- div, intro: when `introFactor` is one of the fact's operands, `b === introFactor`
  (the divisor-forcing rule), regardless of `rand`.
- `expectedAnswer`: mult returns `a*b`, div returns `a/b`.

Example test to follow the pattern:
```ts
test("div intro: nowy czynnik wymuszony na pozycji dzielnika", () => {
	const fact = { a: 8, b: 9, key: "8x9" as const }
	const q = makeQuestion(fact, false, "div", 8, () => 0.9)
	expect(q.a).toBe(72)
	expect(q.b).toBe(8) // dzielnik = introFactor, mimo rand
	expect(expectedAnswer(q, "div")).toBe(9)
})
```

**Verify**: `bun test src/game/facts.test.ts` → all pass including the new tests.

### Part B — extract the egg-close logic into `src/game/rewards.ts`

#### Step 4: Add `addEggFragment` to `src/game/rewards.ts`

Add to `src/game/rewards.ts`. It needs `fragmentsForEgg` from `facts.ts` (safe —
no cycle). `eggQuality`, `eggQualityScore`, `ISKIERKI_CAP`, `EggQuality`,
`PendingEgg`, `GameMode` are already in this file:

```ts
// (extend the existing GameMode import at the top:)
import { fragmentsForEgg, type GameMode } from "./facts"

// Stan ekonomii jajek niesiony między odpowiedziami (commit per odpowiedź).
export interface EggBankState {
	eggFragments: number
	eggStarBank: number
	eggsEarned: number
	iskierki: number
}

// Dokłada jeden fragment + `gained` gwiazdek do bieżącego jajka. Gdy fragmenty
// osiągną próg `fragmentsForEgg(eggsEarned)`, domyka jajko: finalny kolor losowany
// z banku gwiazdek włożonych w jego budowę, reset banku i fragmentów, eggsEarned++,
// iskierka za tęczowe (cap). Czysta: zwraca nowy stan + utworzone jajko (lub null).
export function addEggFragment(
	bank: EggBankState,
	gained: number,
	mode: GameMode,
	rand: () => number,
): { bank: EggBankState; created: PendingEgg | null } {
	const eggFragments = bank.eggFragments + 1
	const eggStarBank = bank.eggStarBank + gained
	const threshold = fragmentsForEgg(bank.eggsEarned)
	if (eggFragments < threshold) {
		return { bank: { ...bank, eggFragments, eggStarBank }, created: null }
	}
	const quality = eggQuality(eggQualityScore(eggStarBank, threshold), rand)
	const iskierki =
		quality === "rainbow"
			? Math.min(ISKIERKI_CAP, bank.iskierki + 1)
			: bank.iskierki
	return {
		bank: { eggFragments: 0, eggStarBank: 0, eggsEarned: bank.eggsEarned + 1, iskierki },
		created: { quality, mode },
	}
}
```

(If `GameMode` is currently imported as `import type { GameMode } from "./facts"`,
change it to the combined `import { fragmentsForEgg, type GameMode } from "./facts"`
form shown above so the runtime value `fragmentsForEgg` is imported too.)

**Verify**: `bun run typecheck` → exit 0.

#### Step 5: Use `addEggFragment` in `store.ts` `pressConfirm`

Replace the block at `store.ts:339-361` with a call that destructures the result
so the two existing `set(...)` branches keep working unchanged (they use
object-shorthand `eggFragments`, `eggStarBank`, `eggsEarned`, `iskierki`,
`pendingEggs`, `eggsCreated`):

```ts
// fragment + gwiazdki niezależnie od wyniku — postęp nigdy nie przepada.
// addEggFragment domyka jajko po przekroczeniu progu (finalny kolor z banku).
const { bank, created } = addEggFragment(
	{
		eggFragments: state.eggFragments,
		eggStarBank: state.eggStarBank,
		eggsEarned: state.eggsEarned,
		iskierki: state.iskierki,
	},
	gained,
	round.mode,
	Math.random,
)
const { eggFragments, eggStarBank, eggsEarned, iskierki } = bank
let pendingEggs = state.pendingEggs
const eggsCreated = [...round.eggsCreated]
if (created) {
	pendingEggs = [...pendingEggs, created]
	eggsCreated.push(pendingEggs.length - 1)
}
```
Add the import: `addEggFragment` to the existing `from "../game/rewards"` import
block in `store.ts`. After this, `fragmentsForEgg` may still be imported in
`store.ts` — check: it is also used at `store.ts:345`? No — that line is being
removed. If `fragmentsForEgg` is no longer referenced anywhere in `store.ts`
after this edit, remove it from the facts import (`bun run check` flags unused
imports). Verify with `grep -n fragmentsForEgg src/store/store.ts`.

**Verify**:
- `bun run typecheck` → exit 0.
- `bun test src/store/store.test.ts` → **still green, unchanged** (this is the
  proof the egg behavior is byte-identical, including plan 009's cross-round
  test).

#### Step 6: Use `addEggFragment` in `debug.ts` `simulateRoundOutcome`

Replace the block at `debug.ts:70-81` with:
```ts
// fragment + gwiazdki za każdą odpowiedź; jajko po przekroczeniu progu dostaje
// finalny kolor z banku (ta sama czysta logika co w store — addEggFragment)
const r = addEggFragment({ eggFragments, eggStarBank, eggsEarned, iskierki }, stars, mode, rand)
eggFragments = r.bank.eggFragments
eggStarBank = r.bank.eggStarBank
eggsEarned = r.bank.eggsEarned
iskierki = r.bank.iskierki
if (r.created) {
	pendingEggs.push(r.created)
	createdIndices.push(pendingEggs.length - 1)
}
```
Update `debug.ts` imports: add `addEggFragment` from `./rewards`; remove
`eggQuality`, `eggQualityScore`, `ISKIERKI_CAP` from the `./rewards` import IF
they are now unused (they were only used in this block — confirm with
`grep -n "eggQuality\|eggQualityScore\|ISKIERKI_CAP" src/game/debug.ts`). Remove
`fragmentsForEgg` from the `./facts` import if now unused
(`grep -n fragmentsForEgg src/game/debug.ts`).

**Verify**:
- `bun run typecheck` → exit 0.
- `bun test src/game/debug.test.ts` → **still green, unchanged**.
- `bun test` → full suite green.

#### Step 7: Unit-test `addEggFragment` + update DOX

Add tests to `src/game/rewards.test.ts` (follow its existing structure). Cover:
- below threshold: `addEggFragment({eggFragments:0,eggStarBank:0,eggsEarned:0,iskierki:0}, 3, "mult", () => 0)`
  → `created === null`, `bank.eggFragments === 1`, `bank.eggStarBank === 3`,
  `bank.eggsEarned === 0`.
- at threshold (egg #1, 10 fragments): start from `eggFragments:9, eggsEarned:0`
  → adding one fragment closes the egg: `created !== null`, `bank.eggFragments === 0`,
  `bank.eggStarBank === 0`, `bank.eggsEarned === 1`, `created.mode` matches input.
- rainbow → iskierka: pass a bank whose star total yields score 30 (e.g.
  `eggFragments:9, eggStarBank:27, eggsEarned:0` + `gained:3` → bank 30 over
  threshold 10 → score 30) with a `rand` stub that picks rainbow, and assert
  `bank.iskierki` incremented by 1; verify the `ISKIERKI_CAP` clamp by starting
  `iskierki: 99` (stays 99).

Then update the DOX (read the chain first — root `CLAUDE.md`, `src/CLAUDE.md`,
`src/game/CLAUDE.md`, `src/store/CLAUDE.md`):
- `src/game/CLAUDE.md`: in **Ownership**, add `makeQuestion`/`expectedAnswer`/
  `RoundQuestion` to the `facts.ts` bullet and `addEggFragment` to the `rewards.ts`
  bullet. In the intro-round contract (line ~18) and the egg-bank contract
  (line ~26), change "logika w `makeQuestion` (store)" to note `makeQuestion`
  now lives in `facts.ts`. Add the two functions to the **Verification** list.
- `src/store/CLAUDE.md`: in the intro-round bullet (line ~22) and the egg-close
  bullet (line ~18/20), update wording so it points at `makeQuestion`/
  `addEggFragment` in `src/game/` rather than implying the logic lives in the
  store. The "cienkie koordynatory" rule (line ~26) now holds more strongly —
  reflect that the question-building and egg-close math moved out.

**Verify**:
- `bun test` → all pass, including the new `facts.test.ts` and `rewards.test.ts` tests.
- `bun run check` → exit 0.

## Test plan

- `src/game/facts.test.ts`: `makeQuestion` (mult flip both ways via seeded rand,
  div divisor selection, div intro divisor-forcing) + `expectedAnswer` (both modes).
- `src/game/rewards.test.ts`: `addEggFragment` (below threshold accumulates; at
  threshold closes + resets + `eggsEarned++` + stamps mode; rainbow → iskierka,
  capped at `ISKIERKI_CAP`).
- Regression guard: the **entire pre-existing suite stays green and unchanged**
  — especially `store.test.ts` (egg-bank, happy path, division) and
  `debug.test.ts`. That is the proof the refactor preserved behavior.

Verification: `bun test` → all pass (prior count + your new facts/rewards tests).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun test` exits 0; every previously-passing test still passes
- [ ] `grep -n "function makeQuestion" src/store/store.ts` → no matches
- [ ] `grep -n "export function makeQuestion" src/game/facts.ts` → 1 match
- [ ] `grep -n "export function addEggFragment" src/game/rewards.ts` → 1 match
- [ ] `grep -n "Math.random" src/game/facts.ts src/game/rewards.ts` → no matches
      (the moved logic uses injected `rand`, never `Math.random`)
- [ ] `src/store/store.test.ts` is unchanged by this plan (`git diff` shows no
      edits to it from this branch's work)
- [ ] `bun run check` exits 0
- [ ] `src/game/CLAUDE.md` and `src/store/CLAUDE.md` updated per Step 7
- [ ] Only the in-scope files modified (`git status`)
- [ ] `plans/README.md` status row for 010 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The "Current state" excerpts don't match the live code (drift).
- Any previously-passing test fails after a move and a reasonable retry — that
  means behavior changed; revert and report rather than editing the test or the
  formula to make it pass.
- You discover an external importer of `RoundQuestion` that the re-export does
  not satisfy.
- Removing an import (`fragmentsForEgg`, `eggQuality`, etc.) breaks typecheck
  because it was used somewhere you didn't expect — re-check usage with `grep`
  and report if unclear.
- The egg-close extraction would change the order of `rand()` calls relative to
  the original (it must not — `addEggFragment` calls `eggQuality(..., rand)`
  exactly once per close, same as today).

## Maintenance notes

- After this lands, the egg economy lives in **one** place (`addEggFragment`).
  Any future change to fragment thresholds, star-bank scoring, or rainbow rewards
  is a single edit, and both the live store and the debug simulator pick it up.
- `makeQuestion` is now unit-testable with a seeded `rand`; future tweaks to
  division divisor placement should add a deterministic test there rather than
  relying on the store integration tests.
- A reviewer should diff `store.ts` and `debug.ts` against the originals to
  confirm the extracted call produces the *same* values (especially that the
  star-bank/fragment reset and the rainbow-iskierka path are identical), and
  confirm `store.test.ts` was not touched.
- Deferred out of this plan: `rollContext`'s dream-monster mode filtering
  (`store.ts:154-168`) is left in the store — it reads store state directly and
  is a thinner concern; revisit only if it grows.
