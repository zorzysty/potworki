# Plan 005: Extract the duplicated gate-reveal-on-mount logic into `useGateReveal`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3398a0d..HEAD -- src/screens/RoundSummary.tsx src/screens/MapScreen.tsx`
> If either file changed since this plan was written, compare the "Current state"
> excerpts against the live code before refactoring; on a mismatch, treat it as a
> STOP condition.
>
> **DOX (this repo)**: This repo uses a binding `CLAUDE.md` hierarchy ("DOX").
> Read `CLAUDE.md` (root) and `src/CLAUDE.md` before editing — `src/CLAUDE.md`
> owns `components/` and `screens/` and documents the reveal mechanics. Update it
> in Step 4.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW (behavior-preserving extraction; the subtle StrictMode-safety
  property must be kept — see below)
- **Depends on**: `plans/001-fix-broken-build.md` (done criteria run `typecheck`)
- **Category**: tech-debt
- **Planned at**: commit `3398a0d`, 2026-06-14

## Why this matters

The "play the gate-opening splash exactly once, surviving React StrictMode's
double-mount" mechanic is duplicated almost verbatim in `RoundSummary.tsx` and
`MapScreen.tsx`. Both use the same load-bearing trick — decide whether to reveal
in the `useState` *initializer* (before the store is mutated), then call
`markGatesCelebrated()` in an effect — and the same dismiss handler. Only the
*trigger condition* differs between the two screens. Duplicated subtle code like
this drifts: a future fix to the StrictMode handling could land in one copy and
not the other, reintroducing a double-animation bug. Extracting a single
`useGateReveal` hook keeps the tricky part in one place while leaving each
screen's own trigger where it belongs.

## Current state

The duplicated mechanics (identical except for the highlighted trigger):

`src/screens/RoundSummary.tsx:19-25` + render at `:97-99`:
```tsx
	const [reveal, setReveal] = useState<{ stage: number } | null>(() => {
		const s = useGame.getState()
		return s.round?.unlockedThisRound ? { stage: s.unlockedStage } : null   // <-- trigger A
	})
	useEffect(() => {
		if (reveal) useGame.getState().markGatesCelebrated()
	}, [reveal])
	/* ... */
	{reveal && (
		<GateReveal stage={reveal.stage} onDone={() => setReveal(null)} />
	)}
```

`src/screens/MapScreen.tsx:35-44` + render at `:211-213`:
```tsx
	const [reveal, setReveal] = useState<{ stage: number } | null>(() => {
		const s = useGame.getState()
		return s.unlockedStage > s.celebratedStage                              // <-- trigger B
			? { stage: s.unlockedStage }
			: null
	})
	useEffect(() => {
		if (reveal) useGame.getState().markGatesCelebrated() // od razu — animacja nie powtórzy się po wyjściu
	}, [reveal])
	/* ... */
	{reveal && (
		<GateReveal stage={reveal.stage} onDone={() => setReveal(null)} />
	)}
```

**The property that must be preserved**: the reveal decision is made inside the
`useState` initializer (which runs once per mount, reading fresh
`useGame.getState()`), *before* `markGatesCelebrated()` mutates `celebratedStage`.
This is why a StrictMode double-mount does not flicker or skip the animation
(documented in `src/CLAUDE.md`). The hook must keep the decision in the
initializer — do **not** convert the trigger into a reactive prop/selector
evaluated during render.

`GateReveal` (the presentational splash) lives in `src/components/gate.tsx` and
takes `{ stage, onDone }`. It must stay purely presentational (per `src/CLAUDE.md`);
do not move store logic into it.

Conventions: **bun**, Biome (tabs, double quotes, semicolons as-needed),
`verbatimModuleSyntax: true`. Run `bun run check` at the end.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bun run typecheck` | exit 0 |
| Lint/format | `bun run check` | exit 0 |
| Build | `bun run build` | exit 0 |
| Tests (regression) | `bun test` | all pass (if plan 003 has landed; else skip) |

## Scope

**In scope**:
- `src/components/useGateReveal.ts` (create) — the shared hook.
- `src/screens/RoundSummary.tsx` (edit) — use the hook; keep trigger A.
- `src/screens/MapScreen.tsx` (edit) — use the hook; keep trigger B.
- `src/CLAUDE.md` (edit) — DOX update (Step 4).

**Out of scope** (do NOT touch):
- `src/components/gate.tsx` — `GateReveal` stays presentational; the hook does
  NOT go in this file (it would couple a presentational component to the store).
- Any change to *when* each screen reveals — triggers A and B must remain exactly
  as written. This is a pure deduplication, not a behavior change.
- The store, the game logic, the monsters.

## Git workflow

- Branch: `advisor/005-gate-reveal-hook`.
- Commit message: e.g. `refactor: extract useGateReveal hook (dedupe reveal logic)`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create the hook

`src/components/useGateReveal.ts`:

```ts
import { useEffect, useState } from "react"
import { useGame } from "../store/store"

// Splash otwarcia bramy: decyzja w inicjalizatorze useState (PRZED
// markGatesCelebrated), więc stabilna mimo podwójnego montażu StrictMode.
// `detect` czyta świeży useGame.getState() i zwraca etap do odsłonięcia albo null.
export function useGateReveal(detect: () => { stage: number } | null) {
	const [reveal, setReveal] = useState<{ stage: number } | null>(detect)
	useEffect(() => {
		if (reveal) useGame.getState().markGatesCelebrated()
	}, [reveal])
	return { reveal, dismiss: () => setReveal(null) }
}
```

(`useState(detect)` passes the function as React's lazy initializer — it runs
once per mount, exactly like the inline initializers today.)

**Verify**: `bun run typecheck` → exit 0 (the hook compiles standalone).

### Step 2: Use it in `RoundSummary.tsx`

Replace the `useState`/`useEffect` block (lines 19-25) with:

```tsx
	const { reveal, dismiss } = useGateReveal(() => {
		const s = useGame.getState()
		return s.round?.unlockedThisRound ? { stage: s.unlockedStage } : null
	})
```

Update the render (lines 97-99) to use `dismiss`:

```tsx
	{reveal && <GateReveal stage={reveal.stage} onDone={dismiss} />}
```

Add `import { useGateReveal } from "../components/useGateReveal"`. Remove the now
-unused `useState`/`useEffect` imports from React **only if** they are no longer
used anywhere else in the file (check: `RoundSummary.tsx` otherwise uses neither
after this change — verify with `bun run typecheck`, which flags unused imports).

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Use it in `MapScreen.tsx`

Replace the `useState`/`useEffect` block (lines 35-44) with:

```tsx
	const { reveal, dismiss } = useGateReveal(() => {
		const s = useGame.getState()
		return s.unlockedStage > s.celebratedStage ? { stage: s.unlockedStage } : null
	})
```

Update the render (lines 211-213) to `onDone={dismiss}`. Add the
`useGateReveal` import. `MapScreen.tsx` still uses other React hooks? It imports
`{ useEffect, useState }` at line 1 — after this change neither is used directly
in `MapScreen` (confirm via typecheck) so remove them from the import if `tsc`
flags them as unused.

**Verify**: `bun run typecheck` → exit 0. `bun run build` → exit 0.

### Step 4: DOX update

In `src/CLAUDE.md`, the bullets describing the `RoundSummary` and `MapScreen`
reveal logic should note that the StrictMode-safe reveal mechanics now live in a
shared `components/useGateReveal.ts` hook (each screen passes its own `detect`
trigger). Keep the existing explanation of *why* the decision is in the
initializer — just point it at the hook. Minimal, in the doc's existing style.

**Verify**: `bun run check` → exit 0.

## Test plan

There is no UI/DOM test harness in this repo (tests, if plan 003 landed, cover
only pure `src/game`/`src/monsters` modules), so this hook is verified by
typecheck/build + a manual click-through:

- **Manual (real path)**: in a round, reach a gate unlock → the splash plays once
  in the summary, no double-flash.
- **Manual (debug path)**: open the app with `?debug`, use "otwórz bramę"
  (`debugOpenGate`) on the debug screen, then open "Kraina Potworków" → the
  splash plays once; navigate away and back → it does NOT replay.

Do not add a DOM test runner for this plan (out of scope).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/components/useGateReveal.ts` exists and exports `useGateReveal`
- [ ] `grep -rn "markGatesCelebrated" src/screens/` → no matches (the call now
      lives only in the hook)
- [ ] `grep -cn "useGateReveal" src/screens/RoundSummary.tsx src/screens/MapScreen.tsx`
      → both files reference it
- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0
- [ ] `bun run check` exits 0
- [ ] (if plan 003 landed) `bun test` exits 0
- [ ] `src/CLAUDE.md` updated to reference the shared hook
- [ ] `git status` shows only the in-scope files changed
- [ ] `plans/README.md` status row for 005 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Removing `useState`/`useEffect` from a screen's React import breaks typecheck
  because they are still used elsewhere in that file — keep them; only remove
  genuinely unused imports.
- You find yourself tempted to compute the trigger reactively (during render or
  via a selector) instead of inside the `detect` thunk — STOP. That changes the
  StrictMode-safety property and is a behavior change, not a refactor.
- The drift check shows either screen changed since `3398a0d` and the excerpts no
  longer match.

## Maintenance notes

- For the reviewer: confirm triggers A and B are byte-identical to the originals
  (only relocated into the `detect` thunks) and that `markGatesCelebrated` is
  called from exactly one place now (the hook).
- If a future screen needs to show the gate splash, it should reuse
  `useGateReveal` with its own `detect` rather than re-implementing the pattern.
