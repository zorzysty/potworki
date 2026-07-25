# Plan 020: Symetryczny guard przyjaciel ↔ podróżnik (setCompanion podczas wyprawy)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a0d75aa..HEAD -- src/store/store.ts src/screens/CollectionScreen.tsx src/store/store.test.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read root `CLAUDE.md`,
> `src/CLAUDE.md` and `src/store/CLAUDE.md` before editing (the paths you
> touch live under both). Steps 5–6 update the two owning docs — that's part
> of this plan, not optional.
>
> **Naming (user preference, binding)**: the user wordsmiths player-facing
> Polish strings himself. The one new UI line in Step 3 is a PROPOZYCJA —
> implement as proposed and mark it with a `PROPOZYCJA` comment in JSX.

## Status

- **Priority**: P1 (correctness — a child-visible invariant break, reachable
  in two taps)
- **Effort**: S
- **Risk**: LOW (one store guard + one UI branch; no save-shape change,
  no migration)
- **Depends on**: none (branch `feat/012-wioska-budowanie` @ `a0d75aa`,
  311 tests green)
- **Category**: correctness
- **Planned at**: commit `a0d75aa`, 2026-07-12

## Why this matters

The game enforces "the companion never goes on an expedition" in one
direction only. `sendExpedition` refuses to send the companion
(`src/store/store.ts` — see excerpt below), and its comment declares the
store guard "źródłem prawdy". But the reverse move is unguarded: send
monster X on an expedition, then open X's card in Moje Potworki and tap
**„Zostań moim przyjacielem! 💛"** — the button is unconditional and
`setCompanion` is a bare setter.

Result of that two-tap sequence:

- **Village renders X twice at once.** The wanderer list filters out the
  traveler, but the companion force-include block re-inserts `companionId`
  even when it equals `expedition.monsterId` (excerpt below). X walks the
  meadow with the 💛 marker while X's silhouette *also* sits at the 🏕️ camp
  whose entire purpose is to explain X's absence ("dziecko zawsze wie,
  GDZIE jest jej potworek" — `src/CLAUDE.md`).
- **Home contradicts itself**: X is the big hero/companion while the
  expedition chip below reads "🎒 X: n/y rund" (away).

## Current state

Verified at `a0d75aa`:

`src/store/store.ts:793` — the unguarded setter:

```ts
setCompanion: (id) => set({ companionId: id }),
```

`src/store/store.ts:800-809` — the existing one-directional guard (the
pattern to mirror; note the comment declaring the store guard the source
of truth and the UI's job to show gentle explanations):

```ts
sendExpedition: (monsterId, typeId) => {
	const state = get()
	if (state.expedition !== null) return
	if (!(monsterId in state.ownedMonsters)) return
	if (monsterId === state.companionId) return
	if (!EXPEDITIONS_BY_ID.has(typeId)) return
	set({
		expedition: { monsterId, typeId, roundsAtStart: state.totalRounds },
	})
},
```

`src/screens/VillageScreen.tsx:137-145` — the double-render source (the
force-include ignores the traveler filter one line above it):

```ts
const travelers = sorted.filter((id) => id !== expedition?.monsterId)
let shown = travelers.slice(0, cap)
if (
	companionId !== null &&
	companionId in ownedMonsters &&
	!shown.includes(companionId)
) {
	shown = [companionId, ...shown.slice(0, cap - 1)]
}
```

`src/screens/CollectionScreen.tsx:598-615` — the unconditional friend
button inside the owned-monster card modal (rendered when the selected
monster is not already the companion):

```tsx
<div className="flex w-full items-center gap-2">
	<BigButton
		onClick={() => {
			setCompanion(selected.id)
			setSelectedId(null)
		}}
		variant="secondary"
		className="flex-1 py-3 text-lg"
	>
		Zostań moim przyjacielem! 💛
	</BigButton>
	<HelpTip ... />
</div>
```

For the gentle-explanation tone, the exact precedent lives a few dozen
lines below in the same file: `ExpeditionSection`
(`src/screens/CollectionScreen.tsx:184` computes
`const isTraveler = expedition?.monsterId === monsterId`, and `:236`
renders the inverse case's line "Przyjaciel woli zostać z Tobą 💛" — never
an error tone).

Existing tests to mirror (patterns): `src/store/store.test.ts:766-784`
("setCompanion ustawia i zeruje…", "debugReset czyści companionId") and
`:1393-1401` ("sendExpedition: no-op dla przyjaciela (zostaje w domu)").

## Design decision (encoded in this plan)

**Refuse, don't recall.** `setCompanion(travelerId)` becomes a silent
no-op, mirroring `sendExpedition`'s companion guard. Do NOT auto-recall
the expedition: recall throws away all expedition progress with no reward,
which would silently punish a child's tap — worse than declining it. The
UI explains instead of offering a dead button, exactly like the
"Przyjaciel woli zostać z Tobą 💛" precedent. `setCompanion(null)` and
setting a non-traveler stay untouched.

## Steps

1. **Guard the setter** in `src/store/store.ts`. Replace the line at
   `store.ts:793` with a guarded version, keeping the surrounding comment
   style of `sendExpedition` (Polish, explains the why):

   ```ts
   // Przyjaciel nie może być jednocześnie podróżnikiem (lustro guardu w
   // sendExpedition — tam przyjaciel nie wyrusza, tu podróżnik nie zostaje
   // przyjacielem; inaczej wioska renderowałaby go podwójnie: na łące i w
   // obozie 🏕️). Guard w store jest źródłem prawdy; UI pokazuje łagodne
   // wyjaśnienie zamiast przycisku.
   setCompanion: (id) => {
   	if (id !== null && id === get().expedition?.monsterId) return
   	set({ companionId: id })
   },
   ```

   Verification: `bun run typecheck` → exits 0.

2. **Add the store tests** in `src/store/store.test.ts`, inside the
   existing `setCompanion` test cluster (around line 766) or the
   "wyprawy potworków" section — follow whichever grouping reads better
   locally. Mirror the `sendExpedition` no-op test:

   ```ts
   test("setCompanion: no-op dla podróżnika na wyprawie", () => {
   	ownSome()
   	game().sendExpedition(0, "zwiad")
   	game().setCompanion(0)
   	expect(game().companionId).toBeNull()
   	// inny posiadany potworek może zostać przyjacielem
   	game().setCompanion(1)
   	expect(game().companionId).toBe(1)
   	// null (zdjęcie przyjaciela) zawsze działa
   	game().setCompanion(null)
   	expect(game().companionId).toBeNull()
   })
   ```

   Use the existing `ownSome()` / `game()` helpers from this file (see the
   `sendExpedition` tests around `:1387` for usage). If `ownSome()` does
   not own ids 0 and 1, adapt the ids to what it owns — read the helper
   first.

   Verification: `bun test src/store/store.test.ts` → all pass, including
   the new one.

3. **Gentle UI branch** in `src/screens/CollectionScreen.tsx`. In the
   owned-monster modal where the friend button renders (excerpt above),
   compute whether the selected monster is the active traveler
   (`expedition?.monsterId === selected.id` — the modal scope already has
   `selected`; pull `expedition` from the store with the same
   `useGame((s) => s.expedition)` selector pattern used at `:177`, at the
   component level that owns the modal). When it is the traveler, render a
   calm explanation line INSTEAD of the `BigButton`+`HelpTip` pair, styled
   like the existing "To Twój przyjaciel" chip at `:594-597`:

   ```tsx
   /* PROPOZYCJA do dopracowania — podróżnik nie może teraz zostać przyjacielem */
   <div className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-sky-50 px-4 py-3 text-lg font-extrabold text-sky-600">
   	🎒 Wróci z wyprawy — wtedy możecie się zaprzyjaźnić!
   </div>
   ```

   Never an error tone; no disabled button. The store guard from Step 1
   remains the source of truth — this branch is presentation.

   Verification: `bun run typecheck` → exits 0.

4. **Full gate**: `bun test` (all pass), `bun run typecheck` (0),
   `bun run check` (fix anything it reports — mandatory per root
   CLAUDE.md).

5. **DOX pass — `src/store/CLAUDE.md`**: the `companionId` contract bullet
   currently describes `setCompanion` as an unguarded thin setter
   ("Akcja `setCompanion(id)` (mirror `setDreamMonster`, cienki setter)"
   and "**bez** guardów `isDivisionOnly`"). Amend that bullet: the setter
   now refuses the active traveler (mirror of `sendExpedition`'s companion
   guard; guard w store = źródło prawdy, UI pokazuje łagodną linijkę).
   Keep the `isDivisionOnly` remark — it is still true. Also append the
   new test to the Verification section's `setCompanion` sentence.

6. **DOX pass — `src/CLAUDE.md`**: in the collection-modal contract
   (the long bullet describing the card modal; it mentions "przycisk
   przyjaciela"), add one clause: gdy wybrany potworek jest podróżnikiem
   na wyprawie, zamiast przycisku przyjaciela renderuje się łagodna
   linijka (PROPOZYCJA), lustro wzorca „Przyjaciel woli zostać z Tobą 💛".

## Done criteria (machine-checkable)

- `bun test` → 312+ tests, 0 fail (at least one new test).
- `bun run typecheck` → exit 0.
- `bun run check` → no remaining diagnostics.
- `grep -n "expedition?.monsterId" src/store/store.ts` shows a hit inside
  `setCompanion`.
- Manual/behavioral: with a save where monster X is on an expedition,
  opening X's card shows the explanation line and no friend button; the
  village never renders X as a wanderer while the camp shows X.

## Out of scope — do NOT touch

- `sendExpedition`, `recallExpedition`, expedition settlement in
  `nextQuestion` — already correct.
- The `VillageScreen` force-include block: after Step 1 the state
  `companionId === expedition.monsterId` is unreachable, so no defensive
  filter there. (If you believe it needs one anyway, STOP and report
  instead.)
- `SaveState` / `schema.ts` — no save change is needed; if you find
  yourself editing schema.ts, STOP.
- Any other PROPOZYCJA texts in the modal.

## Maintenance note

Any future action that changes `companionId` or `expedition` must preserve
the invariant `companionId !== expedition?.monsterId` (both guards now
enforce it). If a "swap companion" or "auto-recall" UX is ever wanted,
that's a product decision for the maintainer — not a silent store
behavior.

## STOP conditions

- Drift check shows changes in the three files since `a0d75aa` that
  contradict the excerpts.
- `ownSome()` (or the surrounding test helpers) don't exist or own
  different ids than the test assumes and you cannot adapt trivially.
- Existing tests fail BEFORE your changes (baseline must be green:
  311 pass).
- You find another route that sets `companionId` besides `setCompanion` /
  `debugReset` / persistence merge — report it, don't patch it ad hoc.
