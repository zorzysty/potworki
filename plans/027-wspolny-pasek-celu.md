# Plan 027: Wspólny komponent paska celu budowy (VillageScreen + RoundSummary)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a0d75aa..HEAD -- src/screens/VillageScreen.tsx src/screens/RoundSummary.tsx src/components`
> Expected drift if plan 024 landed first: a `useMemo` around the wanderer
> derivation in `VillageScreen` (does not touch the header/goal bar). Any
> change to the two goal-bar excerpts below is a STOP.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read root `CLAUDE.md`
> and `src/CLAUDE.md` before editing. Step 4 is the DOX pass.

## Status

- **Priority**: P3 (debt — small dedupe, already cosmetically drifted)
- **Effort**: S
- **Risk**: LOW (presentational extraction; both call sites already
  compute `goal` identically via `currentGoal(village)`)
- **Depends on**: none (safe after 024; touches different lines)
- **Category**: tech debt
- **Planned at**: commit `a0d75aa`, 2026-07-12

## Why this matters

The "goal + progress fill + x/y" widget — the core "jeszcze jedna rundka?"
hook — is hand-copied in two screens and the copies have already drifted
cosmetically (prefix `Cel:` vs `→` separator; `<button>` vs fragment). A
future change to how goal progress reads (a "cel osiągnięty!" state,
clamping tweaks) currently requires synchronized edits in both screens.
This extracts the shared inner widget; each screen keeps its own wrapper
and navigation behavior.

## Current state

Verified at `a0d75aa`.

`src/screens/VillageScreen.tsx:236-261` — header version (inside a
`<button>` that opens the build sheet):

```tsx
<span className="truncate text-sm font-extrabold text-grape-dark">
	Cel: {goal.name}
	{village.goalId !== null && village.goalId === goal.id && " ⭐"}
</span>
<span className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-200">
	<span
		className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-[width]"
		style={{
			width: `${Math.min(100, (iskierki / goal.cost) * 100)}%`,
		}}
	/>
</span>
<span className="whitespace-nowrap text-sm font-extrabold text-amber-500">
	{Math.min(iskierki, goal.cost)}/{goal.cost}
</span>
```

`src/screens/RoundSummary.tsx:83-100` — summary chip version (inside a
`<button>` that navigates to the village; preceded by the wage part of
the chip):

```tsx
<>
	<span className="text-slate-300">→</span>
	<span className="truncate text-sm font-extrabold text-grape-dark">
		{goal.name}
		{village.goalId !== null && village.goalId === goal.id && " ⭐"}
	</span>
	<span className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-200">
		<span
			className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-[width]"
			style={{
				width: `${Math.min(100, (iskierki / goal.cost) * 100)}%`,
			}}
		/>
	</span>
	<span className="whitespace-nowrap text-sm font-extrabold text-amber-500">
		{Math.min(iskierki, goal.cost)}/{goal.cost}
	</span>
```

Identical core: name+⭐ span, track+fill spans, x/y label span. Divergent:
VS prefixes the name with `Cel: `; RS renders a `→` separator BEFORE the
widget (leave the separator in RS — it belongs to the chip's wage→goal
composition, not to the widget).

Both compute `goal = currentGoal(village)` from `src/game/village.ts` and
read `iskierki` + `village` from the store. `currentGoal` returns
`{ id, name, cost, kind } | null` — check its actual return type in
`src/game/village.ts` before typing the props.

## Design (encoded in this plan)

New shared presentational component `src/components/GoalProgressBar.tsx`
(components/ is correct here — genuinely shared by two screens, per
`src/CLAUDE.md`: "Komponenty współdzielone w `components/`"):

```tsx
import type { /* the currentGoal return type, e.g. VillageGoal */ } from "../game/village"

// Pasek celu budowy: nazwa (+⭐ gdy wybrany przez dziecko) + pasek postępu
// + x/y. Czysto prezentacyjny — caller daje goal/iskierki/starred i własny
// wrapper (button z nawigacją); separator/„Cel:" to sprawa callera.
export function GoalProgressBar({
	goal,
	iskierki,
	starred,
	prefix,
}: {
	goal: /* VillageGoal */
	iskierki: number
	starred: boolean
	prefix?: string
}) {
	return (
		<>
			<span className="truncate text-sm font-extrabold text-grape-dark">
				{prefix}
				{goal.name}
				{starred && " ⭐"}
			</span>
			<span className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-200">
				<span
					className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-[width]"
					style={{ width: `${Math.min(100, (iskierki / goal.cost) * 100)}%` }}
				/>
			</span>
			<span className="whitespace-nowrap text-sm font-extrabold text-amber-500">
				{Math.min(iskierki, goal.cost)}/{goal.cost}
			</span>
		</>
	)
}
```

Call sites:

- VillageScreen: `<GoalProgressBar goal={goal} iskierki={iskierki} starred={village.goalId !== null && village.goalId === goal.id} prefix="Cel: " />`
  inside the existing `<button>` (button classes/onClick untouched).
- RoundSummary: keep the `→` separator span, then
  `<GoalProgressBar goal={goal} iskierki={iskierki} starred={…same…} />`.

Class strings must remain byte-identical to today's.

## Steps

1. Read `currentGoal`'s return type in `src/game/village.ts`; create
   `src/components/GoalProgressBar.tsx` as above with the real type.
2. Replace the VillageScreen block; `bun run typecheck` → 0.
3. Replace the RoundSummary block; `bun run typecheck` → 0.
4. **DOX pass — `src/CLAUDE.md`**: the file inventories shared components
   (bullet "Komponenty współdzielone w `components/`…"); add
   `GoalProgressBar` with a half-line description (pasek celu budowy,
   współdzielony przez nagłówek wioski i chip żołdu w podsumowaniu).
5. Full gate: `bun test` (green), `bun run typecheck` (0),
   `bun run check`/`verify` (clean).
6. Visual spot-check (dev server or puppeteer): village header shows
   `Cel: <name> ⭐?` with bar and x/y; finish a round (debug buttons with
   `?debug` are fine) and confirm the summary chip still reads
   `+N ✨ → <name> …` identically.

## Done criteria (machine-checkable)

- New file `src/components/GoalProgressBar.tsx`; both screens import it.
- `grep -rn "from-amber-300 to-amber-400" src/screens` → 0 hits (the fill
  gradient lives only in the shared component now — check other uses
  first; if another screen legitimately uses this gradient for something
  else, exclude it from this criterion and say so).
- `bun test` green, `bun run typecheck` 0, biome clean.

## Out of scope — do NOT touch

- The wrappers: VillageScreen's header `<button>` (opens sheet) and
  RoundSummary's chip `<button>` (goes to village) keep their exact
  classes and handlers.
- The wage half of the summary chip (`+N ✨`), `currentGoal` logic,
  goal-selection UI in BuildSheet.
- No visual changes of any kind.

## Maintenance note

Future goal-progress states ("cel osiągnięty!", different clamp) belong in
`GoalProgressBar` — both surfaces update together by construction.

## STOP conditions

- Either excerpt no longer matches the live code (beyond plan 024's
  wanderer-memo footprint in VillageScreen).
- The two blocks turn out NOT to be identical in some detail this plan
  missed — report the difference instead of picking a winner silently.
