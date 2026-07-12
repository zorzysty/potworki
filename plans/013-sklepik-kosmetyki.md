# Plan 013: Sklepik — kosmetyka per-potworek za iskierki (kapelusze i aury)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2092dfc..HEAD -- src/game/village.ts src/game/village.test.ts src/components/MonsterStage.tsx src/screens/VillageScreen.tsx src/screens/CollectionScreen.tsx src/components/village/ src/store/schema.ts src/achievements/catalog.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition. NOTE: this plan assumes the branch
> `feat/012-wioska-budowanie` (or its merge into `main`) as the base — the
> village build system MUST be present.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read the chain before
> editing: root `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`,
> `src/store/CLAUDE.md`, `src/achievements/CLAUDE.md`. This plan CHANGES
> contracts in all of them (new catalog module, 7th building, new `SaveState`
> field + migration, MonsterStage slots go from "empty seams" to USED) — the
> DOX pass is the final step and is mandatory.
>
> **Naming (user preference, binding)**: the user wordsmiths all player-facing
> Polish names himself. Every building/item name and UI string here is a
> **PROPOZYCJA**. Implement with the proposed strings, mark string banks with
> `// PROPOZYCJE do dopracowania`, and never treat naming as final. Stable
> **ids** (persisted) must be chosen once and never changed.
>
> **Coordination with plans 014/015/017**: several pending plans add
> `SaveState` fields. The migration number below is written as v9→v10 but is
> really **"next available at implementation time"** — whichever plan lands
> first takes the next `SAVE_VERSION`; adjust accordingly and keep the
> shape-lock test in sync.

## Status

- **Priority**: P2 (feature — completes the economy arc the village started)
- **Effort**: L (three phases; each independently verifiable)
- **Risk**: MED (save-schema change + a 7th building rippling through tests,
  achievements and the scene; rendering strictly via existing seams)
- **Depends on**: plan 012 (village build system — DONE on
  `feat/012-wioska-budowanie`)
- **Category**: feature (ekonomia długiego ogona + personalizacja)
- **Planned at**: commit `2092dfc`, 2026-07-12

## Why this matters

The village (plan 012) gave iskierki a purpose, but its sink is **finite**:
~1016✨ (buildings 970 + decorations 46) plus wish eggs. Once the village and
the collection are complete, sparks go dead again — the exact failure mode
ROADMAP item 1 was written to fix, deferred in plan 012's Maintenance notes as
"the natural future sink". Cosmetics are that sink, and they were **designed
into the codebase from day one**: `MonsterStage` (the documented cosmetics
chokepoint) has empty `background`/`overlay`/`frame` slots, and every
emotionally-loaded monster (companion on Home, wanderers and residents in the
village) already renders through it.

What this plan adds:

1. **A 7th building — Sklepik** — appended to the village catalog. Its three
   levels unlock cosmetic **tiers** (Heroes-style: upgrade the building to
   stock better wares). The shop is also a reason to keep earning after the
   original six buildings are maxed.
2. **A cosmetics catalog** (hats + auras, pure data): one-off purchases per
   item, but the catalog is **append-friendly** — new items over time are the
   repeatable long-tail sink, with zero save-schema churn (ids are stable
   strings).
3. **A wardrobe**: the child dresses ANY owned monster from its collection
   card ("Ubierz 🎩"). The companion cheers in a round wearing its hat; a
   resident dozes by the fountain in a bow. Duplicates → iskierki → a cape
   for the favorite — the "znowu ten sam" disappointment now always buys
   something personal.

Design rules honored: no pressure, nothing decays, nothing is required
(pure reward); UI Polish-only; touch targets ≥ 64px, `click` activation;
**`MonsterSvg` stays frozen and untouched** — cosmetics are sibling overlays,
never face/DNA edits (warstwa-opiekuńcza contract).

### Economy design (the numbers)

- **Sklepik costs (PROPOZYCJA): 15 / 45 / 110 = 170✨** — L1 lands mid-early
  (after Ogródek/Zjeżdżalnia, around Zamek L1), L3 is a late-game goal. New
  village sink total: 1016 + 170 = **1186✨**, still inside the tested
  [800, 1500] envelope (the range test needs NO widening — verify, don't
  bump).
- **Launch catalog: 12 items = 346✨ (≈ 350)** across tiers — tier sums
  31 + 105 + 210; every number below must match the Step 2 table and the
  Step 5 test range, they are one invariant:
  - Tier 1 (Sklepik L1): 4 hats, 5–12✨ each — first purchase within a
    session of opening the shop.
  - Tier 2 (L2): 4 items (fancier hats + first auras), 15–40✨.
  - Tier 3 (L3): 4 premium auras/hats, 45–60✨ — the post-completion spark
    flood finally has prestige goals (kept below building-L3 prices: a hat
    must never out-cost the Zamek upgrade it's earned after).
- Items are bought once (per item, not per monster — equipping is free and
  unlimited across monsters; generosity keeps dressing-up playful, not
  grindy).
- Locked tiers are **teased, never error-toned**: visible in the shop list
  with "ulepsz Sklepik!" framing (mirror of the "graj dalej!" progress chip).

### Engagement checklist

1. Shop stock visibly grows with building level (upgrade payoff you can
   browse).
2. Dressing the companion — the hat shows on Home and mid-round cheering
   (the highest-frequency screens in the game).
3. Village wanderers/residents wear their outfits — the scene gets even more
   personal.
4. Post-purchase hint points to the wardrobe ("Ubierz w Moich Potworkach!").
5. Collection card shows the outfit — the "karta kolekcjonerska" becomes
   customized.

## Current state

Verified at `2092dfc` on `feat/012-wioska-budowanie` (`bun test` → 217 pass /
0 fail; `SAVE_VERSION = 9`; 44 achievements):

- `src/game/village.ts` (271 lines) — `BUILDINGS` (6 entries, `BuildingDef`
  with `id/name/levelNames/descriptions/costs`), `DECORATIONS`,
  `VillageState`, `buildingLevel`, `nextLevelCost`, `roundWage`, `villageCap`,
  `currentGoal`, `canAffordSomething`, `villageValue`. All economy tuning
  lives in this one file.
- `src/game/village.test.ts` — asserts `BUILDINGS.length` **=== 6** (line
  ~39), per-building cost/name invariants loop over the array (auto-extend),
  total sink in **[800, 1500]** (lines ~79–82), `fullyBuilt()` helper maps
  over `BUILDINGS` (auto-extends).
- `src/achievements/catalog.ts` — `wioska-w-rozkwicie` (line ~502) and
  `wielki-budowniczy` (line ~513) use `target: BUILDINGS.length` — adding a
  7th building changes their target 6→7 **at runtime**. The unlock ledger
  (`SaveState.achievements`) is append-only and `evaluateAchievements` skips
  `alreadyUnlocked`, so a child who earned them at 6/6 KEEPS them; only the
  progress bar on the achievement card shows 6/7 until Sklepik is built —
  honest and motivating, an accepted quirk (document it).
- `src/components/MonsterStage.tsx` — props `background?: ReactNode`,
  `overlay?: ReactNode` (rendered `pointer-events-none`, absolute inset-0),
  `frame?: string`; documented as "jedyny chokepoint kosmetyki", slots empty
  in v1. Callers today: `Companion.tsx` (2 sites), `WanderingMonster.tsx`,
  `components/village/Resident.tsx`. **Reaction overlays (HeartBurst,
  CompanionMarker, 💤) currently occupy the single `overlay` slot** — cosmetic
  overlays must COMPOSE with them (fragment), not replace them.
- `src/screens/CollectionScreen.tsx` — **renders `MonsterSvg` directly**
  (grid tile line ~111, owned-card modal line ~177, silhouette branch ~275).
  The owned-card modal must switch to `MonsterStage` to display the outfit
  (per the `src/CLAUDE.md` rule: every cosmetic-capable monster renders
  through `MonsterStage`). Modal already hosts the
  "Zostań moim przyjacielem! 💛" action (~line 257–263) — the wardrobe
  section sits alongside it.
- `src/screens/VillageScreen.tsx` (530 lines) — `PLOTS:
  Record<BuildingId, {left, width, dy, z}>` (TypeScript will FORCE a 7th
  entry), ground-line anchoring (`GROUND_LINE_TOP = "47%"`), current lefts:
  2 / 18 / 39 / 62 / 76 / 87 — the band is full; adding Sklepik requires
  **rebalancing anchor lefts** (expected, verify visually).
- `src/components/village/BuildingArt.tsx` — per-building SVG components +
  dispatcher `switch` (TS exhaustiveness forces a new case), `silhouette`
  prop, `size="fill"` mode for fixed-height boxes.
- `src/components/village/BuildSheet.tsx` (307 lines) — centered modal;
  `BuildingDetail` (preview + buy/goal) and list view with
  `BuildingRow`/`DecorationRow`.
- `src/store/schema.ts` — `SAVE_VERSION = 9`, `SaveState` has 15 keys
  (shape-locked in `schema.test.ts`), migration pattern documented;
  `mergePersisted` (store.ts) deep-merges `achievementStats` + `village`.
- `src/store/store.ts` — `buyWishEgg`/`buildVillage`/`buyDecoration` are the
  spend-action pattern (silent no-op, deduct, `checkAchievements()`);
  `debugBuildAll` maps over `BUILDINGS` (auto-extends);
  `suppressAchievements` test helper exists in `store.test.ts`.
- `ISKIERKI_CAP = 999` (`src/game/rewards.ts:77`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bun run typecheck` | exit 0 |
| Full suite | `bun test` | all pass (217 + new) |
| One file | `bun test src/game/cosmetics.test.ts` | that file passes |
| Lint/format | `bun run check` | exit 0 |
| Build | `bun run build` | exit 0 |
| Visual check | dev server + puppeteer-core (recipe in root `CLAUDE.md`; `/usr/bin/chromium` works on this machine) | screenshots |

## Scope

**In scope** (create/modify only):
- `src/game/cosmetics.ts` (create) — catalog + pure helpers (see Step 2 for
  why a separate module, not `village.ts`)
- `src/game/cosmetics.test.ts` (create)
- `src/game/village.ts` — append `sklepik` to `BUILDINGS` (+ `BuildingId`)
- `src/game/village.test.ts` — 6→7 + sklepik invariants
- `src/store/schema.ts` + `schema.test.ts` — `SaveState.cosmetics`,
  `SAVE_VERSION` bump, migration, shape-lock 15→16 keys
- `src/store/store.ts` + `store.test.ts` — `buyCosmetic`/`equipCosmetic`,
  `mergePersisted` backfill
- `src/components/CosmeticArt.tsx` (create) — item art + `EquippedOverlay`
- `src/components/MonsterStage.tsx` — NO changes expected (slots suffice);
  if a change proves necessary, STOP and report
- `src/components/Companion.tsx`, `src/components/WanderingMonster.tsx`,
  `src/components/village/Resident.tsx` — compose cosmetic overlay with
  existing reaction overlays
- `src/components/village/BuildingArt.tsx` — `SklepikArt`
- `src/components/village/BuildSheet.tsx` — shop stock section in the
  sklepik detail view
- `src/screens/VillageScreen.tsx` — 7th plot + anchor rebalance
- `src/screens/CollectionScreen.tsx` — owned-card modal via `MonsterStage`
  + "Ubierz 🎩" wardrobe section
- DOX: `src/game/CLAUDE.md`, `src/store/CLAUDE.md`, `src/CLAUDE.md`,
  `src/achievements/CLAUDE.md` (targets note); `plans/README.md`

**Out of scope** (do NOT touch):
- `src/monsters/**` — FROZEN; cosmetics NEVER edit `MonsterSvg`/DNA/faces.
  Overlays are siblings positioned over the art.
- The `frame` slot / card frames — **reserved for plan 014**; the
  `CosmeticSlot` type includes only `"hat" | "aura"` for now.
- New achievements — none in this plan (candidates in Maintenance notes).
- `currentGoal`/`canAffordSomething`/Home badge — they track **buildings and
  decorations only**; cosmetics are discovered inside the shop, not pushed
  via goals. A conscious scope cut: revisit only if play-testing shows the
  shop goes unnoticed.
- Rotating/daily stock — rejected for v1 (smells like FOMO pressure; the
  catalog is static and honest).
- Backgrounds (`background` slot) — future tier; keep the slot empty.

## Git workflow

- Branch: `feat/013-sklepik-kosmetyki` (stacked on plan 012's branch or on
  `main` after its merge — match wherever plan 012 lives when you start).
- Commit per phase; message style matches `git log` (e.g.
  `feat(cosmetics): sklepik building + catalog + save v10`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Phase A — catalog, building, persistence

#### Step 1: Append the Sklepik building (`src/game/village.ts`)

- Extend `BuildingId` with `"sklepik"` and APPEND to `BUILDINGS` (never
  reorder — plot/test/achievement code iterates the array):

```ts
{
	id: "sklepik",
	name: "Sklepik",
	levelNames: ["Stragan", "Sklepik", "Dom Mody Potworków"], // PROPOZYCJE
	descriptions: [
		"Kapelusze dla potworków! (Ubierasz w Moich Potworkach.)",
		"Nowe nakrycia głowy i pierwsze aury!",
		"Najpiękniejsze aury i stroje — moda na całą wioskę!",
	],
	costs: [15, 45, 110],
},
```

**Verify**: `bun run typecheck` → FAILS in `VillageScreen.tsx` (missing
`PLOTS.sklepik`) and possibly `BuildingArt.tsx` — expected; fixed in Phase B.
`bun test src/game/village.test.ts` → fails on `toBe(6)` — expected, fixed in
Step 4.

#### Step 2: Create `src/game/cosmetics.ts` (pure catalog + helpers)

Separate module, not `village.ts`: cosmetics have their own id-space, slots
and tier logic, and `village.ts` is contractually "all VILLAGE tuning in one
file" — mixing catalogs would bloat both. One-way import
(`cosmetics.ts` → `village.ts` for `buildingLevel`) — no cycle.

```ts
export type CosmeticSlot = "hat" | "aura" // "frame" zarezerwowane dla planu 014
export type CosmeticId = string // stabilne kebab-case id, NIGDY nie zmieniać

export interface CosmeticDef {
	id: CosmeticId
	name: string // PROPOZYCJE do dopracowania
	slot: CosmeticSlot
	tier: 1 | 2 | 3 // dostępny gdy poziom sklepiku >= tier
	cost: number
}

export const COSMETICS: readonly CosmeticDef[] // 12 na start, patrz tabela
export const COSMETICS_BY_ID: ReadonlyMap<CosmeticId, CosmeticDef>

// Stan garderoby w zapisie (typ tu, store persystuje — wzór VillageState).
export interface CosmeticsState {
	owned: CosmeticId[]
	// monsterId → założone per slot; brak wpisu = nic nie założone
	equipped: Record<number, Partial<Record<CosmeticSlot, CosmeticId>>>
}
export const INITIAL_COSMETICS: CosmeticsState = { owned: [], equipped: {} }

// Dostępne w sklepiku przy danym poziomie budynku (tier <= level).
export function availableCosmetics(sklepikLevel: number): CosmeticDef[]
// Czy przedmiot kupiony / co potworek ma założone (cienkie helpery dla UI).
export function isOwned(c: CosmeticsState, id: CosmeticId): boolean
export function equippedFor(
	c: CosmeticsState,
	monsterId: number,
): Partial<Record<CosmeticSlot, CosmeticId>>
```

Launch catalog (PROPOZYCJE — ids stable, names free):

| id | name | slot | tier | cost |
|----|------|------|------|------|
| `czapka-z-pomponem` | Czapka z pomponem | hat | 1 | 5 |
| `kokarda` | Kokarda | hat | 1 | 6 |
| `kapelusz-slomkowy` | Kapelusz słomkowy | hat | 1 | 8 |
| `czapka-urodzinowa` | Czapka urodzinowa | hat | 1 | 12 |
| `melonik` | Melonik | hat | 2 | 15 |
| `wianek` | Wianek | hat | 2 | 20 |
| `aura-serduszek` | Aura serduszek | aura | 2 | 30 |
| `aura-gwiazdek` | Aura gwiazdek | aura | 2 | 40 |
| `kapelusz-czarodzieja` | Kapelusz czarodzieja | hat | 3 | 45 |
| `korona-lodowa` | Korona lodowa | hat | 3 | 50 |
| `aura-teczy` | Aura tęczy | aura | 3 | 55 |
| `aura-iskier` | Aura iskier | aura | 3 | 60 |

Pure, no `Math.random`/`Date.now()`/DOM.

**Verify**: `bun run typecheck` (module alone compiles).

#### Step 3: Save schema (`src/store/schema.ts` + `schema.test.ts`)

- Add `cosmetics: CosmeticsState` to `SaveState`, `INITIAL_COSMETICS` to
  `INITIAL_SAVE`.
- Bump `SAVE_VERSION` (**next available** — v10 if nothing landed since
  plan 012) + migration per the documented pattern:

```ts
// v9→v10: dodano garderobę (kosmetyka per-potworek ze Sklepiku). Start pusty.
9: (state) => ({
	...(state as Record<string, unknown>),
	cosmetics: { owned: [], equipped: {} },
}),
```

- `schema.test.ts`: shape-lock 15→**16 keys** (add `"cosmetics"` sorted);
  migration test (adds empty cosmetics, preserves `iskierki`); full-chain
  test ends with `cosmetics` present.
- `mergePersisted` (store.ts): backfill `cosmetics` subkeys like
  `village`/`achievementStats` (dev-HMR anti-undefined net).

**Verify**: `bun test src/store/schema.test.ts` → pass.

#### Step 4: Store actions + village test updates

Actions (pattern: `buildVillage`):

```ts
buyCosmetic: (id: CosmeticId) => void
// nieznane / już kupione / tier > poziom sklepiku / brak środków → ciche no-op.
// Sukces: iskierki -= cost; owned + id; checkAchievements().

equipCosmetic: (monsterId: number, slot: CosmeticSlot, id: CosmeticId | null) => void
// zakłada TYLKO kupione (id ∈ owned) na TYLKO posiadane potworki; null zdejmuje.
// Nowe obiekty equipped (nie mutować).
```

`village.test.ts` updates: `toBe(6)` → `toBe(7)` (buildings), sink-range test
UNCHANGED (new total 1186 must still pass [800,1500] — if it doesn't, prices
drifted; STOP); add: sklepik costs ascending (covered by the loop), sklepik
L1 ≤ 20 (shop opens mid-early — new invariant).

`store.test.ts` additions (reuse `suppressAchievements`, `useGame.setState`):
- buy: tier-1 item with exact iskierki → owned, wallet 0; same id again →
  no-op; tier-2 item with sklepik L1 → no-op (tier lock); unknown id → no-op.
- equip: bought hat on an owned monster → `equipped[id].hat` set; `null`
  clears; equipping an UNOWNED item or onto an UNOWNED monster → no-op.
- merge backfill: persisted save without `cosmetics` → INITIAL, no crash.

**Verify**: `bun test src/store src/game/village.test.ts` → all pass.

#### Step 5: `src/game/cosmetics.test.ts`

Model on `village.test.ts`: 12 items, unique ids, every tier ∈ {1,2,3}, every
slot ∈ {hat, aura}; economy invariants: cheapest tier-1 ≤ 8 (impulse buy),
tier monotonic in price bands (min tier2 > max tier1 NOT required — assert
only: every tier-3 ≥ 45, launch total in **[300, 450]**; the Step 2 catalog
sums to 346, comfortably inside); `availableCosmetics(0)` → empty, `(1)` →
only tier 1, `(3)` → all; `isOwned`/`equippedFor` basics.

> **Shared invariant with plan 014**: card frames (plan 014) later APPEND
> ~5 frame items (+140✨) to this same catalog and restate the launch-total
> range to **[430, 580]** — 014 owns that bump. Do not "future-proof" the
> range here; keep it honest for the 12-item launch so drift is caught.

**Verify**: `bun test src/game/cosmetics.test.ts` → pass.

### Phase B — art & scene

#### Step 6: `SklepikArt` in `BuildingArt.tsx` + 7th plot

- Add the dispatcher case (TS exhaustiveness will demand it). Art in the
  established idiom (gradients, rounded, `OUTLINE` stroke, ground shadow):
  L1 stragan = market stall (awning stripes, counter); L2 = small shop with
  striped awning + hat display in the window; L3 = boutique with glowing
  sign + aura sparkles. Level = visible growth, no pips.
- `VillageScreen.tsx`: add `PLOTS.sklepik` and REBALANCE anchor lefts so the
  band breathes; starting point (iterate visually):
  `domki 1 / plac-zabaw 15 / sklepik 29 (width clamp(64px, 9%, 110px), dy -2, z 4) / zamek 40 / fontanna 63 / latarnie 77 / ogrodek 88`.
- Optional (nice, cheap): a resident spot for sklepik is NOT added — the
  band is dense enough; note as future flavor.

**Verify**: `bun run typecheck` → exit 0. Visual: `?debug` →
`debugBuildAll` → screenshot at 1024×768 AND a short-wide viewport — no
overlaps, silhouette + price chip renders for sklepik on a fresh save.

#### Step 7: Item art + `EquippedOverlay` (`src/components/CosmeticArt.tsx`)

- `CosmeticArt({ id, size })` — small SVG/emoji per item for shop rows and
  the wardrobe (emoji fine: 🎩👑🎀🌸✨💛🌈; SVG where emoji is weak).
- `EquippedOverlay({ monsterId })` — reads `cosmetics` from the store,
  renders the equipped hat positioned over the head (absolute, centered,
  `top` ≈ −6…0% of the stage, scales with container via percentage sizing)
  and the aura as a soft ring/particles behind-ish (low opacity, existing
  `anim-sparkle`/`anim-float` classes; transform/opacity only).
- **Composition contract**: callers pass
  `overlay={<>{<EquippedOverlay/>}{reactionOverlay}</>}` — cosmetics NEVER
  displace HeartBurst/💤/CompanionMarker. Update `Companion.tsx`,
  `WanderingMonster.tsx`, `Resident.tsx` accordingly. `MonsterStage` itself
  stays untouched.

**Verify**: typecheck; visual: equip via console
(`useGame.getState().equipCosmetic(...)` after debug-buying) → hat visible on
Home companion, on a wanderer in the village, and while cheering in a round
(reaction + hat simultaneously).

#### Step 8: Shop UI in `BuildSheet.tsx`

In the sklepik `BuildingDetail` view, below the standard build/upgrade block,
add a stock section:

- Rows per item (reuse `DecorationRow` styling): `CosmeticArt` mini, name,
  and: owned → ✅; affordable & tier unlocked → `Kup! ✨15`; unaffordable →
  `✨ x/y` chip (never error tone); tier locked → **dim ONLY the art**, keep
  the item NAME full-contrast (a child must be able to read what she's
  aspiring to), with an `Ulepsz Sklepik! 🔒` chip (aspiration framing).
- a11y (biome's a11y rules are OFF — the plan is the only enforcement):
  every icon-only or art-only interactive element gets an `aria-label`
  (codebase convention — see existing `aria-label` on plot buttons and the
  back button); the buy button's visible text suffices for itself.
- After a successful buy: small confetti + one-line hint (PROPOZYCJA:
  "Załóż w Moich Potworkach → Ubierz 🎩").
- Sklepik level 0 → no stock section (the detail view already sells the L1
  build).

**Verify**: visual pass — buy flow, tier tease, hint.

#### Step 9: Wardrobe in `CollectionScreen.tsx`

- Switch the owned-card modal art (line ~177) from `MonsterSvg` to
  `MonsterStage` with `overlay={<EquippedOverlay monsterId={...}/>}` —
  grid tiles and silhouette branch stay on `MonsterSvg` (no cosmetics there;
  cheap and uncluttered).
- Add an "Ubierz 🎩" section in the owned-card modal as a **COLLAPSIBLE
  section** (collapsed by default, header row with chevron, ≥64px tap
  target). **Composition contract for this modal** (binding across plans —
  see `plans/README.md`, sekcja „Shared-surface governance"): fixed order is
  companion-button → **wardrobe („Ubierz 🎩")** → expedition section (plan
  017, future). The card must stay a trophy first, control panel second.
- Inside: per slot, a horizontal row of owned items (+ "zdejmij" ∅ chip);
  tap = `equipCosmetic` (instant, no confirmation); equipped item ringed.
  Item chips are art-only → each gets `aria-label` = item name; the ∅ chip
  gets `aria-label="Zdejmij"`. Empty wardrobe → single gentle hint pointing
  at the Sklepik (PROPOZYCJA: "Kapelusze kupisz w Sklepiku w Wiosce!").

**Verify**: visual — equip/unequip round-trips, card art updates live,
companion picked up the outfit on Home.

### Phase C — closeout

#### Step 10: Full suite + DOX pass (mandatory)

**Verify first**: `bun test` (expect ~217 + ~20 new, 0 fail; the achievement
fixtures auto-extend via `BUILDINGS` maps — confirm `wielki-budowniczy`
still unlocks on the max fixture), `bun run typecheck`, `bun run build`,
`bun run check` → all exit 0. Confirm `src/monsters/` untouched
(`git diff --stat <base> -- src/monsters/` → empty).

DOX updates:
- `src/game/CLAUDE.md` — Ownership: `cosmetics.ts`; village.ts bullet: 7
  buildings; Local Contracts: tier gating by sklepik level, launch-catalog
  economy note; Verification: new tests.
- `src/store/CLAUDE.md` — new `SAVE_VERSION` + migration; `buyCosmetic`/
  `equipCosmetic` (wzór buildVillage; tier/ownership guards); merge backfill
  now THREE nested records.
- `src/CLAUDE.md` — MonsterStage bullet: slots NO LONGER empty (overlay used
  by `EquippedOverlay`; composition rule with reaction overlays); wardrobe
  in CollectionScreen (modal now via MonsterStage); VillageScreen: 7 plots +
  shop stock in the sheet.
- `src/achievements/CLAUDE.md` — note: `wioska-w-rozkwicie`/
  `wielki-budowniczy` targets follow `BUILDINGS.length` (now 7); ledger keeps
  earlier unlocks (accepted 6/7-bar quirk).
- `ROADMAP.md` — item 1 fast-follow: cosmetics ✅ (card frames still pending
  → plan 014).
- `plans/README.md` — status row for 013.

## Test plan

- `src/game/cosmetics.test.ts` — catalog integrity + tier/price invariants +
  helpers (Step 5).
- `src/game/village.test.ts` — 7 buildings, sink still in [800,1500],
  sklepik L1 ≤ 20 (Step 4).
- `src/store/schema.test.ts` — migration + 16-key shape-lock (Step 3).
- `src/store/store.test.ts` — buy (tier lock, dedupe, funds), equip
  (ownership guards, unequip), merge backfill (Step 4).
- Manual visual: shop flow (tease → upgrade → buy → hint), wardrobe
  round-trip, hat+reaction composition on Home/round/village, 7-plot scene
  at two aspect ratios.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck`, `bun run build`, `bun run check` exit 0
- [ ] `bun test` exits 0; count ≥ 235; only explicitly listed existing tests
      modified (village count, shape-lock)
- [ ] `src/game/cosmetics.ts` exists; `grep -n "Math.random\|Date.now" src/game/cosmetics.ts` → no matches
- [ ] `grep -c "sklepik" src/game/village.ts` ≥ 1 (appended, last in array)
- [ ] `SAVE_VERSION` bumped by exactly 1 with matching migration entry
- [ ] `grep -n "MonsterSvg" src/components/MonsterStage.tsx` unchanged;
      `git diff <base> -- src/monsters/` → empty
- [ ] CollectionScreen owned-card modal renders through `MonsterStage`
- [ ] Visual pass reported (screenshots: 7-plot scene, shop, dressed
      companion on Home + cheering in round)
- [ ] DOX docs + `plans/README.md` updated per Step 10
- [ ] All player-facing string banks marked `// PROPOZYCJE do dopracowania`

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows a listed file changed and a "Current state" claim no
  longer holds (especially: another plan landed a `SAVE_VERSION` bump —
  renumber the migration, don't collide).
- Implementing overlays requires MODIFYING `MonsterStage` or anything under
  `src/monsters/` — the slots are supposed to suffice; report what's missing.
- The sink-range test fails after adding sklepik — prices drifted somewhere;
  reconcile consciously instead of silently widening [800,1500].
- The 7th plot cannot fit without overlaps at tablet width — report a
  proposed re-composition (screenshot) rather than shrinking touch targets
  below 64px.
- An existing achievement test fails for any reason OTHER than the max-save
  fixture auto-extending — the ledger semantics may have regressed.
- You are tempted to add rotating stock, timers, or per-monster item copies —
  all rejected (pressure / grind); full stop.

## Maintenance notes

- **The catalog is the live-ops surface**: new items = append entries +
  art — no schema change, no migration. That's the designed repeatable sink;
  add a batch whenever the child's wallet outruns goals again.
- Achievement candidates for a later batch (append-only ids):
  `pierwszy-kapelusz` (easy), `garderoba-10` (medium) — left out to keep this
  plan's blast radius contained.
- The `background` slot (scenki za potworkiem) and `frame` slot (plan 014 —
  ramki kart) are the next cosmetic tiers; `CosmeticSlot` is deliberately
  extensible.
- If play-testing shows the shop goes unnoticed, the hook to add is a
  one-time toast after building Sklepik L1, or including the cheapest
  unowned cosmetic in `currentGoal` — both were consciously cut from v1.
- Hand the user the PROPOZYCJE list after landing: building level names,
  12 item names, shop/wardrobe copy.
