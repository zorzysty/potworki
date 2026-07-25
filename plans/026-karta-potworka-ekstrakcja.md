# Plan 026: Ekstrakcja karty potworka z CollectionScreen (MonsterCard / MonsterCardLocked)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a0d75aa..HEAD -- src/screens/CollectionScreen.tsx`
> Expected drift if plan 020 landed first: a traveler branch replaces the
> unconditional friend button (a small conditional near „Zostań moim
> przyjacielem!"). That is EXPECTED — extract the code AS IT IS after 020.
> Any other structural change to the modal is a STOP.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read root `CLAUDE.md`
> and `src/CLAUDE.md` (the long collection-modal bullet is the contract for
> everything you're moving) before editing. Step 5 is the DOX pass.
>
> **Prerequisite ordering**: land AFTER plan 020 (it edits the friend-button
> area you are extracting).

## Status

- **Priority**: P3 (debt — change-risk reduction on a documented
  multi-plan shared surface; zero behavior change)
- **Effort**: M
- **Risk**: MED (pure JSX move, but the frame seam and scroll invariants
  are subtle and documented — see "Invariants")
- **Depends on**: 020
- **Category**: tech debt
- **Planned at**: commit `a0d75aa`, 2026-07-12

## Why this matters

The selected-monster modal in `src/screens/CollectionScreen.tsx` is a
~250-line inline conditional (`:438-687` at `a0d75aa`) inside a 690-line
file. It is the repo's most-edited shared surface (plans 013/014/016/017
all touched it; `plans/README.md` has a "Shared-surface governance"
section just for it), and every future edit happens inside deeply nested
ternary JSX. `WardrobeSection` and `ExpeditionSection` were already
extracted as in-file sibling components — the right local pattern; the
card body is the remaining unextracted mass.

**This plan is a behavior-preserving extraction.** The rendered DOM must
be identical before/after (modulo nothing — same classes, same structure,
same handlers).

## Current state

Verified at `a0d75aa`. Structure of the modal block
(`CollectionScreen.tsx:438-687`):

```tsx
{selected && (
	<div className="fixed inset-0 z-50 …backdrop…" onClick={() => setSelectedId(null)}>
		<div className="anim-pop relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
			<ModalCloseX onClose={() => setSelectedId(null)} label="Zamknij kartę" />
			<div className={`flex max-h-[88vh] w-full flex-col items-center gap-3 overflow-y-auto rounded-[2rem] border-4 bg-white p-5 shadow-2xl ${frameDef?.cardClasses ?? cardTheme.card}`}>
				{selectedOwned ? (
					<>…owned card: okno z artem / baner / opis / mini-staty /
					   ciekawostka / przyjaciel / WardrobeSection / ExpeditionSection…</>
				) : (
					<>…locked card: sylwetka / ??? / plakietka / znaczniki trybu /
					   przyciski wymarzonego…</>
				)}
			</div>
		</div>
	</div>
)}
```

Data feeding the modal, computed in `CollectionScreen`'s body
(`:294-321`):

```tsx
const selected = selectedId !== null ? MONSTERS[selectedId] : undefined
const selectedOwned = selectedId !== null ? ownedMonsters[selectedId] : undefined
const selectedLore = selected ? loreFor(selected.id) : null
const selectedOrigin = selected ? originOf(selected.id) : null
const originKnown = selectedOrigin !== null && (selectedOrigin.kind === "region" ? selectedOrigin.stage <= unlockedStage : true)
const cardTheme = selected ? CARD_THEME[selected.rarity] : CARD_THEME.common
const cosmetics = useGame((s) => s.cosmetics)
const equippedFrameId = selected ? equippedFor(cosmetics, selected.id).frame : undefined
const frameDef = selectedOwned && equippedFrameId !== undefined ? COSMETICS_BY_ID.get(equippedFrameId) : undefined
```

Store values/actions used inside the two branches: owned — `companionId`,
`setCompanion` (and after plan 020: `expedition`); locked —
`dreamMonsterId`, `setDreamMonster`. Both call `setSelectedId(null)` to
close after actions.

The extraction precedent in the same file: `WardrobeSection` (`:42`…) and
`ExpeditionSection` (`:170`…) are in-file function components that read
`useGame` selectors THEMSELVES and take only `monsterId` (+ callbacks)
as props.

## Design (encoded in this plan)

Two new in-file sibling components in `CollectionScreen.tsx` (NOT a new
file — `src/CLAUDE.md` reserves `components/` for shared components and
`screens/` for screens; the in-file sibling pattern is the established
local idiom):

```tsx
function MonsterCard({ monsterId, onClose }: { monsterId: number; onClose: () => void })
function MonsterCardLocked({ monsterId, onClose }: { monsterId: number; onClose: () => void })
```

- Each renders the bordered scroll container (`max-h-[88vh] …
  overflow-y-auto … border-4 …`) INWARD — the border classes differ by
  branch (`frameDef?.cardClasses ?? cardTheme.card` only applies to the
  owned card; the locked card always uses `cardTheme.card`), so the
  container belongs inside the card component. **Preserve the exact
  current class strings.** Note: at `a0d75aa` the locked branch shares the
  container className with the frame fallback — since `frameDef` is
  `undefined` when `!selectedOwned`, the locked card's container class is
  effectively `cardTheme.card`; replicate that exact outcome.
- Each component derives its own data from `monsterId`: `MONSTERS[id]`,
  `loreFor`, `originOf` + `originKnown` (needs `unlockedStage` selector),
  `CARD_THEME[…]`, `equippedFor`/`COSMETICS_BY_ID` (owned only), plus the
  store selectors/actions its branch uses (`companionId`/`setCompanion`/
  `expedition` for owned; `dreamMonsterId`/`setDreamMonster` for locked) —
  mirror of the WardrobeSection idiom.
- `CollectionScreen` keeps: `selectedId` state, the backdrop + `anim-pop`
  wrapper + `ModalCloseX` shell, and picks the branch:

  ```tsx
  {selected && (
  	<div className="fixed inset-0 …" onClick={close}>
  		<div className="anim-pop relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
  			<ModalCloseX onClose={close} label="Zamknij kartę" />
  			{selectedOwned ? (
  				<MonsterCard monsterId={selected.id} onClose={close} />
  			) : (
  				<MonsterCardLocked monsterId={selected.id} onClose={close} />
  			)}
  		</div>
  	</div>
  )}
  ```

- After the move, delete the now-unused derivations from
  `CollectionScreen`'s body (`selectedLore`, `selectedOrigin`,
  `originKnown`, `cardTheme`, `equippedFrameId`, `frameDef`, and any
  selectors no longer referenced there — CHECK each: `cosmetics` is also
  used by grid tiles? Verify with grep before removing; `dreamMonsterId`
  and `iskierki` are used by the wish-egg section — keep those).
  `bun run check` will flag unused variables; trust it plus grep.

## Invariants (documented in src/CLAUDE.md — must survive the move)

- The art window keeps `shrink-0` (without it the flex container squeezes
  the window instead of scrolling the longer card).
- `cornerEmoji` corners stay anchored in the ART WINDOW's `relative`,
  never the scroll container (they must scroll away with content; the
  rarity ribbon `z-10` stays on top).
- Section order: przyjaciel → WardrobeSection → ExpeditionSection.
- The ONLY close affordances are `ModalCloseX` and the backdrop tap — no
  bottom "Zamknij" button gets (re)introduced.
- All activation stays on `click`.

## Steps

1. Read the live modal block in full (post-020) and the two existing
   section components for the idiom.
2. Create `MonsterCardLocked` first (smaller), move the locked branch
   verbatim, wire it in, and verify: `bun run typecheck` → 0.
3. Create `MonsterCard`, move the owned branch verbatim (including the
   020 traveler conditional), wire it in.
4. Clean up dead derivations in `CollectionScreen` body (see Design;
   grep before each removal).
5. **DOX pass — `src/CLAUDE.md`**: in the collection-modal bullet, add
   one clause: karta żyje w komponentach-rodzeństwie `MonsterCard`/
   `MonsterCardLocked` w tym samym pliku (wzór WardrobeSection); powłoka
   modala (tło + ✕) zostaje w `CollectionScreen`.
6. Full gate: `bun test` (green — no store changes expected at all),
   `bun run typecheck` (0), `bun run check`/`verify` (clean).
7. **Visual verification** (required for a JSX move this size): dev
   server or puppeteer (root CLAUDE.md recipe): open an OWNED monster
   card (check: art + ribbon + name + origin + date + funfact + friend
   button + collapsible sections all render; card scrolls; ✕ pinned), an
   owned monster WITH an equipped frame (frame classes + corner emoji),
   and an UNOWNED one (silhouette + ??? + dream button). Compare against
   the pre-change app if in doubt (`git stash` dance is allowed in the
   executor's isolated worktree only).

## Done criteria (machine-checkable)

- `git diff` touches ONLY `src/screens/CollectionScreen.tsx` and
  `src/CLAUDE.md`.
- `grep -n "function MonsterCard" src/screens/CollectionScreen.tsx` → 2
  hits (Card + CardLocked).
- The modal block inside `CollectionScreen`'s return is ≤ ~25 lines.
- `bun test` green, `bun run typecheck` 0, biome clean.
- Visual checks in Step 7 pass.

## Out of scope — do NOT touch

- `WardrobeSection` / `ExpeditionSection` internals — they move nowhere
  and change not at all.
- The grid tiles, wish-egg section, sorting — everything above `:438`.
- No new files; no `components/` additions.
- Zero styling or copy changes — byte-identical class strings and texts.

## Maintenance note

Future card edits (new sections, plan 019 wordsmithing) now land inside
`MonsterCard`/`MonsterCardLocked`. The shared-surface governance rules in
`plans/README.md` (section order, collapsible-by-default) apply to these
components now.

## STOP conditions

- The modal block structure diverges from the excerpt beyond plan 020's
  footprint.
- Any test goes red, or the visual check shows ANY rendering difference —
  revert the step and report rather than patching styles to compensate.
- You need to change a class string or handler to make the extraction
  work — that means the boundary is wrong; report.
