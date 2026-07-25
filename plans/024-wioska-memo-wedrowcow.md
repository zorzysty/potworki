# Plan 024: Wioska — memoizacja wędrowców (toggle UI nie rekonsyliuje 26 animowanych SVG)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a0d75aa..HEAD -- src/screens/VillageScreen.tsx src/components/WanderingMonster.tsx`
> If either changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition. (Plan 020 removes the *reachability* of
> `companionId === expedition.monsterId` but does not edit these lines —
> its landing is not drift.)
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read root `CLAUDE.md`
> and `src/CLAUDE.md` (its VillageScreen bullet documents the wanderer
> mechanics) before editing. Step 5 is the DOX pass.

## Status

- **Priority**: P3 (perf hygiene on a mid-range-tablet target; certain
  waste, unmeasured perceptibility)
- **Effort**: S
- **Risk**: LOW (pure memoization of already-deterministic data; no
  behavior change intended)
- **Depends on**: none (branch `feat/012-wioska-budowanie` @ `a0d75aa`,
  311 tests green)
- **Category**: performance
- **Planned at**: commit `a0d75aa`, 2026-07-12

## Why this matters

`VillageScreen` keeps four pieces of local state — `sheet` (build modal),
`showCamp` (camp speech bubble), `evening` (the day/night toy the child
taps repeatedly), `cheerNonce` — and every flip re-renders the whole
scene. Each wanderer is a plain, non-memoized component whose subtree is
`MonsterStage` → `MonsterSvg` (a ~15-part SVG with per-instance `defs`/
clipPath) plus `EquippedOverlay`. With up to `villageCap` = 26 wanderers,
a single lantern day/night tap reconciles ~26 deep SVG trees for a change
that affects none of them. The CSS `anim-stroll`/bob animations do NOT
restart (the animated divs are stable), so this is invisible waste today —
but it's real main-thread work on the target tablet, and the fix is a
textbook `memo` + `useMemo` with zero design cost.

Context: the 2026-06 audit rejected memoizing MapScreen/CollectionScreen
computations ("≤80 items, pure math, not worth it") — that rejection was
about cheap *data* computations. This is different in kind: repeated
*reconciliation of 26 animated SVG component subtrees* on unrelated UI
toggles. Still, honesty about confidence: nobody has profiled jank on the
actual tablet; we do it because the fix is trivially cheap, not because
jank is proven.

## Current state

Verified at `a0d75aa`.

`src/components/WanderingMonster.tsx:68` — plain export, no memo:

```tsx
export function WanderingMonster({
	id,
	params,
	isCompanion,
	size = 60,
	cheerNonce = 0,
}: { ... })
```

Props are: `id: number`, `params: WanderParams` (a 7-field object),
`isCompanion: boolean`, `size?: number`, `cheerNonce?: number`. The only
non-primitive is `params`.

`src/screens/VillageScreen.tsx:504-512` — fresh `params` object built
every render, defeating any memo:

```tsx
{wanderIds.map((id, i) => (
	<WanderingMonster
		key={id}
		id={id}
		params={wanderParams(id, i)}
		isCompanion={id === companionId}
		cheerNonce={i < 3 ? cheerNonce : 0}
	/>
))}
```

`src/screens/VillageScreen.tsx:126-159` — the derivation chain producing
`wanderIds`/`residentIds`, recomputed every render (all inputs come from
zustand-selected, referentially stable store slices):

```tsx
const ownedIds = Object.keys(ownedMonsters).map(Number)
const ownedCount = ownedIds.length
const cap = villageCap(village)
const sorted = [...ownedIds].sort(
	(a, b) =>
		(ownedMonsters[b]?.hatchedAt ?? 0) - (ownedMonsters[a]?.hatchedAt ?? 0),
)
const travelers = sorted.filter((id) => id !== expedition?.monsterId)
let shown = travelers.slice(0, cap)
if (
	companionId !== null &&
	companionId in ownedMonsters &&
	!shown.includes(companionId)
) {
	shown = [companionId, ...shown.slice(0, cap - 1)]
}
const activeSpots = RESIDENT_SPOTS.filter(
	([id]) => buildingLevel(village, id) >= 1,
)
const residentCount = Math.min(
	activeSpots.length,
	Math.max(0, shown.length - 1),
)
const residentIds = shown.slice(shown.length - residentCount)
const wanderIds = shown.slice(0, shown.length - residentCount)
```

`wanderParams(id, index)` (`src/components/WanderingMonster.tsx:35-55`) is
pure and deterministic in `(id, index)` — safe to cache.

`EquippedOverlay` (rendered INSIDE `WanderingMonster`) subscribes to the
store itself (`components/CosmeticArt.tsx`), so memoizing
`WanderingMonster` does NOT stale cosmetics — a wardrobe change still
re-renders the overlay through its own subscription.

## Steps

1. **Memoize the component.** In `src/components/WanderingMonster.tsx`,
   import `memo` from react and wrap:

   ```tsx
   export const WanderingMonster = memo(function WanderingMonster({
   	id, params, isCompanion, size = 60, cheerNonce = 0,
   }: { ... }) { ... })
   ```

   Keep the named inner function (devtools name). No custom comparator —
   props become referentially stable in Step 2.

   Verification: `bun run typecheck` → 0 (call sites import the same
   symbol; the named-export shape is unchanged).

2. **Stabilize the inputs.** In `src/screens/VillageScreen.tsx`, wrap the
   derivation chain (the entire excerpt above, from `const ownedIds` down
   to `const wanderIds`) in a single `useMemo` that returns
   `{ ownedIds, ownedCount, wanderers, residentIds }`, where `wanderers`
   is the precomputed array:

   ```tsx
   const { ownedIds, ownedCount, wanderers, residentIds } = useMemo(() => {
   	// ...istniejący łańcuch bez zmian logiki...
   	const wanderers = wanderIds.map((id, i) => ({
   		id,
   		params: wanderParams(id, i),
   	}))
   	return { ownedIds, ownedCount, wanderers, residentIds }
   }, [ownedMonsters, village, expedition, companionId])
   ```

   Those four deps are exactly the store slices the chain reads (all
   referentially stable between unrelated re-renders under zustand).
   `ownedIds`/`ownedCount` have other consumers later in the component —
   returning them from the memo keeps a single source. Import `useMemo`
   and `wanderParams` as needed (`wanderParams` is already imported for
   the render call today — it moves into the memo).

3. **Render from the stable array**:

   ```tsx
   {wanderers.map(({ id, params }, i) => (
   	<WanderingMonster
   		key={id}
   		id={id}
   		params={params}
   		isCompanion={id === companionId}
   		cheerNonce={i < 3 ? cheerNonce : 0}
   	/>
   ))}
   ```

   `isCompanion` and `cheerNonce` are primitives — memo comparison stays
   correct: a `cheerNonce` bump re-renders only the first 3 wanderers (the
   intended celebration), an `evening`/`sheet`/`showCamp` flip re-renders
   none.

4. **Full gate**: `bun test` (green), `bun run typecheck` (0),
   `bun run check` (fix anything reported).

5. **DOX pass — `src/CLAUDE.md`**: in the VillageScreen bullet (the one
   describing wanderers, `anim-stroll`, `wanderParams`), add one clause:
   wędrowcy są memoizowani (`memo` + stabilne `params` z `useMemo`) — 
   przełączniki UI wioski (wieczór, arkusz, obóz) nie rekonsyliują ich
   drzew SVG; `cheerNonce` nadal dociera do pierwszych 3.

6. **Behavioral verification** (dev server or puppeteer per root
   CLAUDE.md recipe) — all four must hold:
   - wanderers render and drift as before (positions unchanged — params
     are the same pure function);
   - tapping a wanderer still hops + shows the speech bubble;
   - buying a building still makes nearby monsters cheer (`cheerNonce`
     path);
   - toggling evening (max-level lanterns or `debugBuildAll` via `?debug`)
     does not visually disturb wanderers.

## Done criteria (machine-checkable)

- `grep -n "memo(" src/components/WanderingMonster.tsx` → 1 hit on the
  export.
- `grep -n "useMemo" src/screens/VillageScreen.tsx` → ≥1 hit containing
  the derivation.
- `bun test` green, `bun run typecheck` 0, `bun run check` clean.
- Behavioral checks in Step 6 pass.

## Out of scope — do NOT touch

- `Resident` memoization — same idea, but its props/anchoring differ;
  leave it unless it is a two-line identical change AFTER reading it
  (if in doubt, skip and note it).
- `MonsterStage` / `MonsterSvg` / `EquippedOverlay` internals.
- MapScreen/CollectionScreen memoization — explicitly rejected 2026-06
  (`plans/README.md`), do not "extend the pattern" there.
- Any change to `wanderParams` math or the wanderer Y-band contract.

## Maintenance note

The memo's correctness rests on two facts: (a) `wanderParams` is pure in
`(id, index)`; (b) everything dynamic inside a wanderer either arrives as
a primitive prop (`cheerNonce`, `isCompanion`) or subscribes to the store
itself (`EquippedOverlay`). If a future feature feeds wanderers new
per-render data, pass it as a primitive or move the subscription inside —
never a fresh object literal, or the memo silently dies.

## STOP conditions

- The derivation chain in `VillageScreen` no longer matches the excerpt
  (drift — e.g. plan 020's follow-ups restructured it).
- After Step 2, any behavioral check in Step 6 fails — revert and report
  rather than adding effects/keys to force updates.
- You find the memo requires a custom `arePropsEqual` — that means an
  input isn't stable; find and fix the input, or STOP.
