# Plan 021: Pauza wstrzymuje auto-przejście do następnego pytania

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a0d75aa..HEAD -- src/screens/RoundScreen.tsx`
> If it changed since this plan was written, compare the "Current state"
> excerpt against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read root `CLAUDE.md`
> and `src/CLAUDE.md` before editing. No doc update is expected (this fixes
> behavior to match the obvious intent of the pause button; no contract
> changes) — but run the DOX closeout check anyway and report "docs
> unchanged" with one line of reasoning.

## Status

- **Priority**: P2 (correctness — real but narrow: a ~900 ms tap window)
- **Effort**: S (a two-line effect change)
- **Risk**: LOW
- **Depends on**: none (branch `feat/012-wioska-budowanie` @ `a0d75aa`,
  311 tests green)
- **Category**: correctness
- **Planned at**: commit `a0d75aa`, 2026-07-12

## Why this matters

After a correct answer the round shows a ~900 ms green "correct" flash and
auto-advances via a `setTimeout(nextQuestion, 900)`. The pause button (⏸)
sets local `paused` state and shows a full-screen overlay — but the
auto-advance effect depends only on `phase`, not `paused`. So if the child
taps ⏸ during the flash, the timer still fires *behind the pause overlay*:
the round silently advances, and on resume the child lands on a brand-new
question, having lost the confirmation moment of the one just answered.

No progress is lost (stars/fragments commit in `pressConfirm` before this
timer exists) and on the last question it merely reveals the summary under
the overlay — so this is sequencing/UX correctness, not data loss. Still a
real bug: pause must mean pause.

## Current state

Verified at `a0d75aa` — `src/screens/RoundScreen.tsx:21-28`:

```tsx
const [paused, setPaused] = useState(false)

const phase = round?.phase
useEffect(() => {
	if (phase !== "correct") return
	const timer = setTimeout(nextQuestion, 900)
	return () => clearTimeout(timer)
}, [phase, nextQuestion])
```

The pause button (`:52-59`) does `onClick={() => setPaused(true)}`; the
overlay (further down, `paused && …`) offers "Gram dalej!"
(`setPaused(false)`) and "Koniec na dziś" (`exitRoundEarly`).

## The fix

Make `paused` a dependency and bail while paused:

```tsx
useEffect(() => {
	if (phase !== "correct" || paused) return
	const timer = setTimeout(nextQuestion, 900)
	return () => clearTimeout(timer)
}, [phase, paused, nextQuestion])
```

Semantics this buys, all correct:

- Tap ⏸ during the flash → `paused` flips → effect re-runs → cleanup
  clears the pending timer → nothing advances under the overlay.
- Tap "Gram dalej!" → `paused` flips back → effect re-runs; if the phase
  is still `"correct"`, a fresh 900 ms timer starts and the round advances
  normally (the child re-sees the green flash briefly — fine and arguably
  nicer than an instant jump).
- "Koniec na dziś" → `exitRoundEarly` clears the round; unchanged.
- No change at all when pause isn't used: same single timer per
  `"correct"` phase.

## Steps

1. Apply the two-line change above in `src/screens/RoundScreen.tsx`
   (add `|| paused` to the bail condition, add `paused` to the dep array).
2. `bun run typecheck` → exit 0.
3. `bun test` → 311+ pass (no component tests exist; this guards against
   collateral damage only).
4. `bun run check` → fix anything reported (mandatory per root CLAUDE.md).
5. Behavioral verification (choose one):
   - **Dev server + manual**: `bun run dev`, start a round, answer
     correctly, tap ⏸ within the green flash → the overlay must stay on
     the SAME question number; resume → it advances only after resuming.
   - **Puppeteer** (WSL recipe in root CLAUDE.md, "Testowanie w
     przeglądarce"): drive the same sequence headlessly; assert the
     "Pytanie X / Y" text does not change while the pause overlay is
     visible.

## Done criteria (machine-checkable)

- `git diff` for this plan touches ONLY `src/screens/RoundScreen.tsx`, and
  only the one `useEffect`.
- `bun test` green, `bun run typecheck` exit 0, `bun run check` clean.
- The behavioral check in Step 5 passes.

## Out of scope — do NOT touch

- The store's `nextQuestion` / round machine — the bug is purely in the
  screen effect.
- The pause overlay markup, `exitRoundEarly`, keyboard handling in
  `App.tsx`.
- Do not introduce a component-test harness for this — the repo's
  documented strategy is pure-logic tests + manual UI verification.

## Maintenance note

Any future effect in `RoundScreen` that schedules round progression must
respect `paused`. If pause ever moves into the store (e.g. to also freeze
keyboard input during pause — note `App.tsx`'s global keydown handler
doesn't know about `paused` either, which is a separate, lesser quirk),
revisit this effect's deps then.

## STOP conditions

- The excerpt above no longer matches `RoundScreen.tsx` (drift).
- Baseline tests are not green before your change.
- You are tempted to restructure the round-phase state machine — that is
  explicitly out of scope; report instead.
