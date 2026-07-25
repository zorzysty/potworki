# Plan 023: Test potrójnego capu portfela + test `markGatesCelebrated` + odświeżenie Verification w DOX store

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a0d75aa..HEAD -- src/store/store.test.ts src/store/store.ts src/store/CLAUDE.md`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition. **Coordination**: plan 020 also adds a test
> to `store.test.ts` — if it landed first, expect >311 baseline tests;
> that's fine, not drift.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read root `CLAUDE.md`,
> `src/CLAUDE.md` and `src/store/CLAUDE.md` before editing. Step 4 IS the
> DOX pass (it also fixes pre-existing staleness in the Verification
> section).

## Status

- **Priority**: P2 (test coverage on the single line where three income
  streams merge, plus an untested load-bearing setter)
- **Effort**: S
- **Risk**: LOW (purely additive tests + doc refresh)
- **Depends on**: none (branch `feat/012-wioska-budowanie` @ `a0d75aa`,
  311 tests green). Merge-overlaps with plan 020 in `store.test.ts`
  (different sections; trivial).
- **Category**: tests + docs
- **Planned at**: commit `a0d75aa`, 2026-07-12

## Why this matters

1. **The triple-income cap line is only pairwise-tested.** Round
   finalization sums wage + guardian-visit bonus + expedition reward and
   caps ONCE (excerpt below). Tests exist for each pair (wage↔cap,
   visit-bonus↔cap, expedition-reward↔cap) but no test ever drives all
   three addends into that single `Math.min` in one finalization. That
   line is exactly where a future refactor (per-source capping, reordering
   settle-before-wage, splitting the `set`) could silently double-pay or
   clip — the test freezes today's correct semantics.
2. **`markGatesCelebrated` has zero tests.** It is the sole writer of
   `celebratedStage`, which gates the one-time gate-opening splash; a
   regression means the splash replays forever or never fires — a
   child-visible bug with no tripwire.
3. **`src/store/CLAUDE.md`'s Verification section is stale**: it claims
   the migration-chain tests cover "v1→…→v12" while `SAVE_VERSION = 14`
   and tests for v12→v13 and v13→v14 already exist
   (`src/store/schema.test.ts:311` and `:296`). The doc understates real
   coverage by two versions — an auditor trusting it would wrongly
   conclude the latest migrations are untested.

## Current state

Verified at `a0d75aa`.

`src/store/store.ts:664-668` — the one cap line (inside `nextQuestion`'s
end-of-round branch):

```ts
iskierki: Math.min(
	ISKIERKI_CAP,
	state.iskierki + wageEarned + visitBonus + settled.reward,
),
```

Existing pairwise cap tests in `src/store/store.test.ts` (patterns to
mirror — read them before writing):

- `:1056` "żołd respektuje cap portfela (999)" — `useGame.setState({
  iskierki: 998 })`, `playCleanRound()`, expect 999.
- `:1339` "bonus Strażnika respektuje cap portfela (998 → 999)" — uses
  helpers `seedDecayedFacts()` + `playVisitRoundClean()`.
- `:1445` "nagroda powrotu respektuje cap portfela (998 → 999)" — uses
  `ownSome()`, `sendExpedition(0, "zwiad")`, then two `playCleanRound()`
  calls before the settling round (zwiad settles on the 3rd completed
  round; the boundary is asserted elsewhere as "runda 2 jeszcze nie,
  runda 3 tak").
- `:1314` "finalizacja: czysta runda-wizyta płaci żołd + VISIT_BONUS
  (żołd osobno)…" — shows the exact-sum assertion style including the
  `rainbow` adjustment read from `pendingEggs[i]?.quality`.

`src/store/store.ts:933-935` — the untested setter:

```ts
// mapa pokazała animację otwarcia bramy aż do bieżącego etapu
markGatesCelebrated: () =>
	set((s) => ({ celebratedStage: s.unlockedStage })),
```

`src/store/CLAUDE.md`, Verification section — the stale phrase (verbatim):
`łańcuch migracji migrateSave v1→…→v12 (w tym v6→v7: daysPlayed/lastPlayedDay; v7→v8: companionId; v8→v9: pusta village; v9→v10: gapCorrect; v10→v11: pusta cosmetics; v11→v12: expedition: null + expeditionsCompleted)`
— while the same file's Local Contracts correctly describe v12→v13 (zwrot
`aura-iskier`) and v13→v14 (`visitRoundsCompleted`), and both migrations
ARE tested in `schema.test.ts`.

## Steps

1. **Triple-cap test** in `src/store/store.test.ts` (place it near the
   `:1445` expedition-cap test or the visit-round section — follow local
   grouping). Shape (adapt helper usage to what the helpers actually do —
   READ `ownSome`, `seedDecayedFacts`, `playVisitRoundClean`,
   `playCleanRound` first):

   ```ts
   test("finalizacja: żołd + bonus Strażnika + nagroda wyprawy w jednej rundzie respektują wspólny cap (998 → 999)", () => {
   	suppressAchievements()
   	ownSome()
   	game().sendExpedition(0, "zwiad")
   	playCleanRound() // runda 1 — zwiad jeszcze w drodze
   	playCleanRound() // runda 2 — zwiad jeszcze w drodze
   	seedDecayedFacts() // stare tabliczki podupadły → visitStage != null
   	useGame.setState({ iskierki: 998 })
   	playVisitRoundClean() // runda 3: wizyta + rozstrzygnięcie zwiadu
   	const s = game()
   	// wszystkie trzy źródła weszły do JEDNEGO Math.min:
   	expect(s.round?.visitStage).not.toBeNull()
   	expect(s.round?.expeditionReturn).not.toBeNull()
   	expect(s.expedition).toBeNull()
   	expect(s.iskierki).toBe(999)
   	// żołd zostaje czystym żołdem mimo dwóch dodatkowych źródeł
   	expect(s.round?.wageEarned).toBeGreaterThan(0)
   })
   ```

   The cap makes the assertion immune to rainbow-egg randomness (any
   rainbow iskierki are also clipped at 999). The three
   `not.toBeNull`/`toBeNull` asserts prove all three income sources were
   actually active in the same finalization — without them the test could
   silently degrade into a pairwise one.

   If `ownSome()` owns the companion candidate id 0 in a way that
   conflicts with `sendExpedition` guards, or `seedDecayedFacts()` resets
   state that breaks the in-flight expedition, adapt the ordering — the
   INVARIANT to land is: one `nextQuestion` finalization where
   `visitStage !== null` AND an expedition settles AND wallet was 998.
   If the helpers make that genuinely impossible, STOP and report.

   Verification: `bun test src/store/store.test.ts` → green including the
   new test; temporarily change `998` to `990` and confirm the test would
   catch a wrong sum (expect failure), then restore.

2. **`markGatesCelebrated` test**, next to the other simple setter tests
   (pattern: the `setCompanion` cluster at `:766`):

   ```ts
   test("markGatesCelebrated dogania celebratedStage do unlockedStage", () => {
   	useGame.setState({ unlockedStage: 2, celebratedStage: 0 })
   	game().markGatesCelebrated()
   	expect(game().celebratedStage).toBe(2)
   	// idempotentne
   	game().markGatesCelebrated()
   	expect(game().celebratedStage).toBe(2)
   })
   ```

   Verification: `bun test src/store/store.test.ts` → green.

3. **Full gate**: `bun test` (313+ pass), `bun run typecheck` (0),
   `bun run check` (fix anything reported).

4. **DOX pass — `src/store/CLAUDE.md` Verification section**:
   - Update the migration-chain phrase to `v1→…→v14`, appending to the
     parenthetical list: `v12→v13: zwrot aura-iskier + czyszczenie owned/
     equipped; v13→v14: visitRoundsCompleted`.
   - Append one sentence covering the two new tests (potrójny cap w jednej
     finalizacji; `markGatesCelebrated`). Keep the section's telegraphic
     style.
   Nothing else in the doc changes.

## Done criteria (machine-checkable)

- `bun test` → ≥313 tests, 0 fail.
- `grep -n "markGatesCelebrated" src/store/store.test.ts` → ≥1 hit.
- `grep -n "v1→…→v14\|v13→v14" src/store/CLAUDE.md` → ≥1 hit;
  `grep -n "v1→…→v12" src/store/CLAUDE.md` → 0 hits.
- `bun run typecheck` exit 0; `bun run check` clean.

## Out of scope — do NOT touch

- `src/store/store.ts` and `src/store/schema.ts` — this plan is
  tests+docs only; if a test reveals an actual defect in the cap line,
  STOP and report (that's a finding, not a silent fix).
- The pairwise cap tests — leave them; they document each source's
  behavior in isolation.
- `useGateReveal` / UI splash logic.

## Maintenance note

Whenever a NEW income source joins round finalization (fourth addend in
the `Math.min`), extend the triple test to include it — this test is now
the canonical place that freezes "all end-of-round income shares one cap".

## STOP conditions

- Baseline not green (311 pass at `a0d75aa`).
- The helpers can't produce the three-source round (see Step 1's note).
- The cap test FAILS against current code — that would mean a real bug in
  finalization; report it as a finding instead of adjusting the test to
  pass.
