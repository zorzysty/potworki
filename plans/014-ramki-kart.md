# Plan 014: Ramki kart kolekcjonerskich — kupowane oprawy paszportów potworków

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2092dfc..HEAD -- src/screens/CollectionScreen.tsx src/components/rarity.ts src/components/MonsterStage.tsx`
> Line numbers in "Current state" are anchored at `2092dfc` — if
> `CollectionScreen.tsx` or `rarity.ts` changed since, re-locate the excerpts
> before editing (plan 013 will NOT have touched the modal card container; if
> it did, treat as a STOP condition). **Additionally verify plan 013 is DONE**
> (`plans/README.md` status row) and read the code it landed — this plan
> builds directly on its save shape and shop UI.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read the chain before
> editing: root `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`,
> `src/store/CLAUDE.md`. This plan CHANGES the collector-card contract in
> `src/CLAUDE.md` (the "ramka całego modala … i tak barwi się rzadkością"
> sentence stops being universally true) — the DOX update in Step 5 is
> mandatory.
>
> **Naming (user preference, binding)**: the user wordsmiths all player-facing
> Polish names himself. Every frame name and UI string below is a
> **PROPOZYCJA**. Implement with the proposed strings, mark the string bank
> with `// PROPOZYCJE do dopracowania`, and never treat naming as final.
> Stable **ids** (persisted in the cosmetics save shape) must be chosen once
> and never changed.

## Status

- **Priority**: P3 (feature — cosmetic sink, completes the sklepik arc)
- **Effort**: S
- **Risk**: LOW (additive catalog entries + one render seam; no new save
  version, no new migration)
- **Depends on**: `plans/013-sklepik-kosmetyki.md` — **MUST be DONE first.**
  This plan reuses 013's cosmetics save shape (`owned` + per-monster
  `equipped` slot map, including the reserved `"frame"` slot), its purchase
  flow in the sklepik, and its equip-UI section in the owned-monster modal.
  Frames are "just" more catalog items plus one renderer. Executing 014
  before 013 means re-inventing all of that — do not.
- **Category**: feature (kosmetyka / ekonomia iskierek)
- **Planned at**: commit `2092dfc`, 2026-07-12

## Why this matters

The collector-card modal is already the game's trophy room: `CARD_THEME`
makes rarity drive the whole card (legendary glows), and the passport zones
(lore, origin, hatch date) reward opening it. But the card's look is fixed —
the child cannot invest in her favorites. Purchasable frames let her spend
iskierki to dress up the cards of the monsters she loves (which is not the
same set as the rarest ones — kids adore specific commons), giving
duplicates and the late-game spark flood one more permanent meaning. It is
the cheapest possible extension of the cosmetics economy plan 013 opens:
same wallet, same shop, same equip model, one new render seam.

Design rules carried from the root docs:
1. **Purely cosmetic** — no gameplay effect, no pedagogy interaction.
2. **Rarity legibility survives**: a purchased frame replaces the *frame*,
   never the rarity information — the `RARITY_META.badge` ribbon in the art
   window stays, and grid tiles keep their rarity borders (frames are
   modal-only in v1).
3. **Never punishes**: frames are permanent once bought, freely re-equipped
   between monsters' cards, nothing expires.

## Current state

Verified at `2092dfc` (branch `feat/012-wioska-budowanie`, 217 tests green,
`SAVE_VERSION = 9`):

- `src/screens/CollectionScreen.tsx` (337 lines) — the render seam:
  - Modal card container (line 141):
    ```tsx
    className={`anim-pop flex max-h-[88vh] w-full max-w-sm flex-col items-center gap-3 overflow-y-auto rounded-[2rem] border-4 bg-white p-5 shadow-2xl ${cardTheme.card}`}
    ```
    where `cardTheme = CARD_THEME[selected.rarity]` (line 49). **This
    `${cardTheme.card}` interpolation is where an equipped frame's classes
    substitute in.**
  - Grid tiles (lines 108–109) use `RARITY_META[monster.rarity].border` —
    UNCHANGED by this plan (rarity stays legible in the grid).
  - Rarity ribbon (lines 166–170) renders `RARITY_META[rarity].badge` inside
    the art window — always visible, frames must never cover it.
  - The owned-monster branch ends with the companion section (lines
    248–271); plan 013's equip section lands nearby — the frame picker joins
    that same section.
  - The modal uses `MonsterSvg` directly (line 177), NOT `MonsterStage` — so
    the `MonsterStage.frame` prop is **not** the seam here; the card
    container class swap is. (Note this in code comments; a future refactor
    routing the modal through `MonsterStage` should keep the card-level
    frame.)
- `src/components/rarity.ts` — `CARD_THEME[rarity].card` is a border-class
  string (`"border-gray-200"` … legendary `"anim-glow border-amber-400"`).
  A frame's `cardClasses` replaces exactly this string.
- `src/styles.css` — reusable animations for fancy frames: `anim-rainbow`
  (line 205, gradient background-shift), `anim-sparkle` (218), `anim-glow`
  (234). Prefer reusing these; at most ONE new keyframe if genuinely needed.
- **From plan 013 (verify against its landed code, symbol names may
  differ)**: a cosmetics catalog module in `src/game/` with stable-id
  entries carrying a `slot` field (the `"frame"` slot is reserved for this
  plan), persisted `cosmetics.owned` + per-monster `equipped` slot map in
  `SaveState` (already migrated by 013 — **this plan adds NO save version**),
  a thin store equip action, the sklepik purchase UI (with its level-gating
  mechanism), and an equip section in the owned-monster card modal.
- Root conventions: bun, Biome via `bun run check` (mandatory closeout),
  Polish-only UI, touch targets ≥ 64px, `click` activation, `monsters/`
  frozen.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bun run typecheck` | exit 0 |
| Full suite | `bun test` | all pass (013's count + new) |
| Lint/format | `bun run check` | exit 0 |
| Build | `bun run build` | exit 0 |
| Visual check | dev server + puppeteer-core recipe in root `CLAUDE.md` | screenshots of framed cards |

## Scope

**In scope** (create/modify only):
- 013's cosmetics catalog module (`src/game/…`) — append 5 frame entries
  (slot `"frame"`)
- its catalog test file — extend integrity assertions to frames
- `src/screens/CollectionScreen.tsx` — card-container class swap + frame
  picker in the equip section
- `src/styles.css` — ONLY if one new keyframe is unavoidable
- `src/CLAUDE.md`, `src/game/CLAUDE.md` — DOX updates (Step 5)
- `plans/README.md` — status row

**Out of scope** (do NOT touch):
- `src/monsters/**` — frozen.
- Grid tiles' rarity borders and the `RARITY_META.badge` ribbon — rarity
  legibility is a contract; frames are modal-only in v1 (tile frames are a
  possible follow-up, see Maintenance notes).
- `src/store/schema.ts` — **no new save version**; 013's shape carries
  frames. If you find yourself editing the schema, STOP.
- 013's purchase flow / shop internals — frames ride the existing rails.
- `CARD_THEME` itself — the default rarity look is untouched; frames only
  substitute at the render site.

## Git workflow

- Branch: `feat/014-ramki-kart` (cut from wherever 013 landed).
- One or two commits; message style matches `git log` (e.g.
  `feat(cosmetics): purchasable collector-card frames`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Append frame entries to the cosmetics catalog

In 013's catalog module, append 5 entries with slot `"frame"` (ids stable,
never reused; names PROPOZYCJE — mark the bank
`// PROPOZYCJE do dopracowania`):

| id (stable)       | PROPOZYCJA name       | cost | gating (013's mechanism) | look (cardClasses intent) |
|-------------------|-----------------------|------|--------------------------|---------------------------|
| `rama-kwiatki`    | „Ramka w Kwiatki"     | 15   | none                     | `border-rose-300` + 🌸 corner accents |
| `rama-serduszka`  | „Ramka z Serduszek"   | 20   | none                     | `border-pink-400` + 💖 corner accents |
| `rama-zlota`      | „Złota Rama"          | 25   | none                     | `anim-glow border-amber-400` (the legendary treatment for anyone) |
| `rama-gwiezdna`   | „Gwiezdna Rama"       | 30   | sklepik poziom 2         | `border-indigo-400` + ✨ corner accents |
| `rama-teczowa`    | „Tęczowa Rama"        | 50   | sklepik poziom 3         | rainbow gradient edge (`anim-rainbow`) |

Frame entries carry whatever fields 013's `CosmeticDef` defines plus (if 013
didn't already provide them) two frame-specific fields:
- `cardClasses: string` — substitutes for `CARD_THEME[rarity].card` on the
  modal container;
- `cornerEmoji?: string` — optional emoji rendered at the card's top-left /
  bottom-right corners by the modal (cheap charm, no SVG).

For `rama-teczowa`: Tailwind cannot gradient a `border-color` — implement as
`border-transparent` + a gradient wrapper (padding-box trick) or reuse the
existing `anim-rainbow` gradient on a thin wrapper ring; executor's choice,
but NO new dependency and at most one new keyframe.

**Verify**: `bun run typecheck` → exit 0; catalog tests still green.

### Step 2: Extend catalog tests

In 013's catalog test file add (Polish test names, house pattern):
- exactly 5 entries with slot `"frame"`, ids unique and present in the
  frozen-id tripwire (append them — never reorder);
- every frame: cost within `[10, 60]`, non-empty `cardClasses`;
- gated frames reference an existing gating tier of 013's mechanism.

**Verify**: `bun test <catalog test file>` → all pass.

### Step 3: Render seam in `CollectionScreen.tsx`

1. Read the selected monster's equipped `"frame"` cosmetic from 013's save
   shape (nullable).
2. Modal container (line 141): when a frame is equipped, substitute its
   `cardClasses` for `cardTheme.card`; otherwise keep `cardTheme.card`
   exactly as today (zero visual change without a frame — regression-free
   default).
3. If the frame has `cornerEmoji`, render two small absolutely-positioned
   spans at opposite card corners (`pointer-events-none`, outside the
   scrollable content flow so they don't push layout).
4. The `RARITY_META.badge` ribbon and grid tiles remain untouched.

**Verify**: `bun run typecheck` → exit 0; visually (Step 6) a card with no
frame is pixel-identical to today.

### Step 4: Frame picker in the equip section

In the owned-monster modal, inside/beside 013's equip section, add a
„Ramka" row (PROPOZYCJA label): horizontal chips — „Bez ramki" (default,
restores rarity look) + one chip per OWNED frame; tapping equips via 013's
equip action with slot `"frame"` (and `null` to unequip). Chips ≥ 64px touch
targets, `click` activation, selected chip visibly pressed. Frames not yet
owned do NOT appear here (they're discovered and bought in the sklepik —
same rule as 013's other cosmetics).

**Verify**: `bun run typecheck`; behavior via the store test if 013's equip
action lacks coverage for the `"frame"` slot — add one characterization case
(equip frame → persists per monster; unequip → null; equipping on monster A
does not affect monster B).

### Step 5: DOX updates (mandatory)

- `src/CLAUDE.md` — collector-card bullet: the modal frame is
  `CARD_THEME[rarity].card` **or the equipped frame's `cardClasses`**
  (rarity legibility guaranteed by the always-visible `RARITY_META.badge`
  ribbon and unchanged grid tiles); mention the „Ramka" picker in the equip
  section.
- `src/game/CLAUDE.md` — cosmetics catalog bullet: note the `"frame"` slot
  is now populated (5 frames, `cardClasses`/`cornerEmoji`).
- `plans/README.md` — status row for 014.

**Verify**: `bun run check` → exit 0.

### Step 6: Visual pass

Puppeteer-core (recipe in root `CLAUDE.md`): seed a save with several owned
monsters + all frames owned (via 013's debug tool or direct
`localStorage`), screenshot: (a) card without a frame — identical to
pre-plan look, (b) each of the 5 frames equipped on the same monster, (c)
the picker row, (d) a legendary with `rama-kwiatki` — badge ribbon still
clearly shows „Legendarny".

## Test plan

- Catalog: 5 frames, frozen ids, cost range, non-empty classes, valid
  gating (Step 2).
- Store: `"frame"`-slot equip/unequip persistence per monster (Step 4, only
  if 013 didn't already cover the slot generically).
- Visual: the six screenshots from Step 6; no-frame default pixel-identical.
- Full suite green: `bun test`, `bun run typecheck`, `bun run build`,
  `bun run check` all exit 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck`, `bun test`, `bun run build`, `bun run check` exit 0
- [ ] Catalog contains exactly 5 slot-`"frame"` entries; tripwire updated
- [ ] `grep -n "cardTheme.card" src/screens/CollectionScreen.tsx` shows the
      default path still present (fallback intact)
- [ ] `git diff <013-base>..HEAD -- src/store/schema.ts` → empty (no new
      save version)
- [ ] `git diff <013-base>..HEAD -- src/monsters/` → empty
- [ ] Grid tiles and `RARITY_META.badge` ribbon unchanged (visual pass)
- [ ] Frame name bank marked `// PROPOZYCJE do dopracowania`
- [ ] `src/CLAUDE.md` + `src/game/CLAUDE.md` updated; `plans/README.md` row set

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 013 is not DONE, or its landed save shape has no per-monster
  `equipped` slot map / no reserved `"frame"` slot — report the actual shape
  instead of inventing a parallel one.
- Implementing frames seems to require a `SAVE_VERSION` bump or a new
  migration — it must not; the design intent is "more catalog items only".
- The frame render would cover or recolor the `RARITY_META.badge` ribbon, or
  you are tempted to restyle grid tiles — rarity legibility is a contract.
- `CARD_THEME` needs structural changes — the default look must stay
  byte-identical for children without frames.
- The rainbow frame demands more than one new keyframe or any new
  dependency.
- Drift check shows `CollectionScreen.tsx` lines 108/141/166–177 no longer
  match the excerpts.

## Maintenance notes

- **Follow-up candidates (not this plan)**: frames on grid tiles (needs a
  design answer for rarity-border coexistence), frames visible on the Home
  hero/companion, seasonal frames as sklepik rotations.
- Frame prices sit in the cosmetics catalog next to 013's items — tune them
  together (the wallet is shared with wish eggs and village building; see
  the debug pacing panel from plan 012).
- A reviewer should confirm: no-frame cards render exactly as before, ids
  are append-only in the tripwire, and no schema/migration diff exists.
- After landing, hand the user the PROPOZYCJE list (5 frame names + „Bez
  ramki" + „Ramka" label) for a wordsmithing pass; renames are free.
