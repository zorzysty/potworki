# Plan 012: Wioska Budowniczych — budynki i dekoracje za iskierki (styl Heroes 3)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 78d22d3..HEAD -- src/screens/VillageScreen.tsx src/game/rewards.ts src/store/schema.ts src/store/store.ts src/achievements/catalog.ts src/components/Companion.tsx src/components/gate.tsx`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read the chain before
> editing: root `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`,
> `src/store/CLAUDE.md`, `src/achievements/CLAUDE.md`. This plan CHANGES
> contracts in all of them (new domain module, new `SaveState` field + a
> migration, new iskierki source, +3 achievements) — the DOX updates are
> Step 14, and they are mandatory.
>
> **Naming (user preference, binding)**: the user wordsmiths all player-facing
> Polish names himself. Every building/decoration name, description, and UI
> string in this plan is a **PROPOZYCJA**. Implement with the proposed strings,
> mark the string banks with a `// PROPOZYCJE do dopracowania` comment (the
> existing pattern from `components/companionPhrases.ts`), and do NOT treat
> naming as final. Stable **ids** (persisted) must be chosen once and never
> changed — pick neutral kebab-case ids that survive any rename of the label.

## Status

- **Priority**: P1 (feature — closes the "dead currency" gap, main engagement play)
- **Effort**: L (three phases; each independently verifiable)
- **Risk**: MED (save-schema change + new iskierki source; both well-trodden
  patterns in this repo)
- **Depends on**: none (suite green at 180 tests on `78d22d3`)
- **Category**: feature (ekonomia + retencja)
- **Planned at**: commit `78d22d3`, 2026-07-12 (revised same day after design review)

## Why this matters

The village today is pure ambience: monsters wander, react to touch — and
nothing else ever happens. Meanwhile **iskierki are a nearly dead currency**:
they trickle in from duplicates (1/2/3/5 per rarity), rainbow eggs (+1) and
achievements (520 lifetime total), and their only sink is the wish egg
(10–30). A child with a growing collection accumulates sparks with nothing to
want. `ROADMAP.md` item 1 ("Daj iskierkom drugie życie") names this exact gap;
the code already has deliberate seams for it (the village decoration layer,
`MonsterStage` cosmetic slots).

This plan turns the village into a **Heroes 3-style build screen**: six
buildings with three upgrade levels each, plus cheap one-off decorations, all
bought with iskierki. New loop:

*solve equations → stars/rounds → iskierki → build → the village visibly
transforms and monsters move in → want the next building → solve more
equations.*

### Design principles (binding for every step)

1. **Math stays the currency.** Every iskierka comes from playing; the village
   is the reason to want more of them.
2. **Every purchase changes the SCENE, not adds an icon.** The Heroes 3 payoff
   is the town screen transforming. Ogródek scatters flower patches across the
   ground; Ścieżka draws a real path through the scene; Latarnie light up the
   sky edges; Zamek grows into a layered centerpiece. If a purchase's only
   effect is one emoji appearing, the step is not done.
3. **The village is inhabited, not furnished.** Built buildings get monsters
   *using* them (dozing by the fountain, on the slide, peeking from the
   domki). The wanderers are the child's collection — buildings must connect
   to them, not compete with them.
4. **Celebration scales with the purchase** (the game's existing payoff
   hierarchy: hatch > gate > toast). Decorations and L1/L2 get pop+confetti;
   any L3 and every Zamek level gets a short full-screen reveal.
5. **Always a visible, preferably self-chosen next goal.** Silhouettes on the
   scene, a chosen-goal mechanic mirroring `dreamMonsterId`, and goal progress
   shown at the end of every round.
6. **Never punishes** (root design rule 1): no build timers, no daily limits,
   no upkeep, no decay, nothing to lose by staying away or answering slowly.
   Everything is instant, additive, and celebratory.

### Economy design (the numbers)

**New income — the round wage.** Today a round can end with zero iskierki,
which makes sparks feel random rather than earned. Add a deterministic wage on
round completion (early exit earns nothing — same rule as `totalRounds`):

```
wage = 1                            // baza za ukończoną rundę
     + (stars >= 15 ? 1 : 0)        // dobra runda (co najmniej połowa gwiazdek)
     + (stars === 30 ? 1 : 0)       // runda perfekcyjna (dodatkowo)
     + zamekLevel                   // 0–3 — perk Zamku (procent składany!)
     + (firstRoundToday ? 1 : 0)    // pierwsza ukończona runda dnia
                                    // zakres 1..7, cap ISKIERKI_CAP
```

Rationale per component:
- **Base +1 always** — a slow round still earns; "szybkość tylko nagradza".
- **Stars steps at 15 and 30** — a perfect round (30/30 = every answer fast
  AND zero mistakes) is rainbow-egg-tier rare for the target player; a single
  perfect-only bonus would mean a typical kid's wage never reflects how well
  she played. The ≥15 step is reachable in most engaged rounds, so quality
  visibly moves income, and 30 stays a delight on top. Mirrors how stars
  already gate egg quality.
- **Zamek level** — the compounding flywheel; see pricing below for why it
  must be buyable in week one.
- **First round of the day +1** — a gentle daily-habit hook. Infrastructure
  exists (`lastPlayedDay`/`dayStamp`); no streak, nothing to lose by skipping
  a day, so it rewards showing up without punishing absence. **This is the
  one mechanic to cut first if the user dislikes it after play-testing** —
  it is deliberately isolated as one flag into `roundWage` so removal is a
  two-line edit.

**Cost table** (all values in iskierki; names are PROPOZYCJE):

| Building (id)            | Perk                                    | L1 | L2  | L3  | Σ    |
|--------------------------|-----------------------------------------|----|-----|-----|------|
| Ogródek (`ogrodek`)      | scene: flower patches → butterflies → rainbow flowers | 5  | 15  | 40  | 60   |
| Plac Zabaw (`plac-zabaw`)| scene + inhabitants: slide → swing → trampoline; monsters play on it | 10 | 30  | 70  | 110  |
| Latarnie (`latarnie`)    | scene + toy: lanterns glow → fireflies → **tap toggles day/evening** | 10 | 25  | 60  | 95   |
| Domki (`domki`)          | **immediate**: houses appear, monsters sleep/peek in them; **bonus**: +4 wanderer cap per level (14→18→22→26) | 15 | 40  | 90  | 145  |
| Fontanna (`fontanna`)    | scene: sparkles → splashing + monsters doze beside it → dream-monster reflection in the water | 20 | 50  | 120 | 190  |
| Zamek (`zamek`)          | **+1 wage per round per level** (the flywheel) | 20 | 100 | 250 | 370  |

| Decoration (id)          | Cost |
|--------------------------|------|
| Kwiatki (`kwiatki`)      | 4    |
| Ścieżka (`sciezka`)      | 5    |
| Huśtawka (`hustawka`)    | 6    |
| Staw (`staw`)            | 8    |
| Pomnik Pierwszego Potworka (`pomnik`) | 10 |
| Tęcza (`tecza`)          | 12   |

Total sink: **970 (buildings) + 46 (decorations) = 1016** (kwiatki repriced
4→5 during execution so the auto-goal prefers a building), plus the existing
wish-egg sink and the new-achievement rewards below.

**Pricing decisions that matter (do not "fix" these):**

- **Zamek L1 = 20, deliberately cheap.** The income perk is the loop that
  teaches "investing pays" — in Heroes 3 the town hall comes first for a
  reason. At 20✨ it lands in week one and the child *watches her income
  grow*; L2/L3 (100/250) stay the long-arc sinks. Pricing it at 50+ would
  push the flywheel past the window where it hooks. Encoded as a test
  invariant (Zamek L1 ≤ 25).
- **Domki has an immediate effect at ANY collection size.** The +4 cap bonus
  is invisible until the child owns >14 monsters, so the houses themselves
  (with monsters sleeping/peeking) are the L1 payoff; the cap raise is the
  honest bonus ("przyda się, gdy będzie was więcej!" in the sheet copy).
  A purchase whose only effect is a latent cap raise is a trust-breaker —
  "I bought it and nothing happened."
- **Decorations 4–12** are the impulse buys between building goals — every
  one cheaper than the cheapest L2 (test invariant).

**Why these numbers work.** First goal (Ogródek 5) ≈ 2 rounds of realistic
wage (base + daily + a stars step). Zamek L1 by end of week one. Mid-game
buildings at 30–90 are weekly-scale goals at wage 3–5/round. Lifetime income
(wage ≈ 900–1400 over a 300-round collection arc + duplicates a few hundred +
achievements 550) comfortably exceeds the 1016 sink, so the village is
*finishable*, and the late-game spark flood (cap 999) has somewhere to go.

**Known and accepted:** once village AND collection are both complete,
iskierki go dead again (wish eggs are pointless at full collection). That is
end-of-game and fine — the natural future sink is per-monster cosmetics via
the `MonsterStage` slots (see Maintenance notes). Do not solve it here.

**Tuning:** all prices, the wage formula, and cap bonuses live in ONE file
(`src/game/village.ts`); tests assert structural invariants and ranges, not
exact balance, so retuning after watching the child play is a one-file edit.
For observability, the debug screen gains a pacing panel (Step 13).

### Engagement mechanics checklist (each maps to a step)

1. Wage + **goal progress at the end of every round** — `+3 ✨ → 12/20 do
   Zamku` in `RoundSummary`. The summary is where "one more round?" is
   decided; this is the highest-value hook in the plan. (Step 10)
2. **Self-chosen goal** — tap a silhouette → „Mój cel!" (`village.goalId`,
   persisted; mirrors the proven `dreamMonsterId` pattern). Auto-fallback to
   the cheapest goal when none chosen. (Steps 1, 4, 8)
3. Silhouettes of unbuilt buildings on the scene (aspiration). (Step 8)
4. Home badge when something is affordable — **session-scoped**: hidden after
   the first village visit this session, so it never becomes permanent
   wallpaper. (Step 11)
5. Zamek = compounding income (the flywheel). (Steps 1, 5)
6. Domki = more monsters visible; collection ties back into the scene. (Step 8)
7. Celebration hierarchy: pop+confetti for small buys; full-screen
   `BuildReveal` for L3s and Zamek; **nearby monsters jump + hearts on every
   build** (existing overlay mechanics). (Step 9)
8. Daily first-round bonus (+1 ✨). (Step 5)
9. +3 achievements feeding iskierki back. (Step 12)

## Current state

Verified at `78d22d3` (all tests green: `bun test` → 180 pass / 0 fail):

- `src/screens/VillageScreen.tsx` (101 lines) — presentational scene with
  three layers: background gradient, a **static decoration layer** (`🌳 🌷 ☀️`,
  `pointer-events-none`, z-10, comment: "szwy pod przyszły sklepik"), and up
  to `VILLAGE_CAP = 14` `WanderingMonster`s (line 9; **note**: `src/CLAUDE.md`
  says 16 — doc drift, fix it in Step 14). Empty state at 0 owned. Entered
  from Home (`HomeScreen.tsx:202`, `goTo("village")`).
- `src/components/WanderingMonster.tsx` — CSS-only strolling (`anim-stroll`,
  `--wander-x`/`--stroll-dur`), parameters **deterministic from `id`** in
  `wanderParams(id, i)`. Touch → jump+hearts+bubble via `MonsterStage`
  overlays.
- `src/game/rewards.ts` — `ISKIERKI_FOR_DUP = {common:1, rare:2, epic:3,
  legendary:5}` (line 70), `ISKIERKI_CAP = 999` (line 77), rainbow-egg +1
  inside `addEggFragment` (line 104), `WISH_COST = {common:10, rare:10,
  epic:20, legendary:30}` + `WISH_COST_NO_DREAM = 10` (lines 118–124).
- `src/store/schema.ts` — `SAVE_VERSION = 8`; `INITIAL_SAVE` has **14 keys**
  (shape-locked in `schema.test.ts`); migration pattern documented in the
  comment above `MIGRATIONS`. `SAVE_KEYS` drives `partialize`.
- `src/store/store.ts` (829 lines) — `buyWishEgg` (line 595) is the model for
  a "spend iskierki" action: silent no-op when unaffordable, deduct on
  success, `checkAchievements()` after. `setDreamMonster` is the model for a
  thin goal-setter. Round finalization lives in `nextQuestion` (the
  `index+1 >= total` branch: `totalRounds++`, `perfectRounds`,
  `bumpDaysPlayed`, stage-unlock, phase `"summary"`). **`dayStamp` is
  exported** (used by companion greetings). `mergePersisted` deep-merges ONLY
  `achievementStats` (backfill safety net). `suppressAchievements` test
  helper isolates economy tests from achievement payouts.
- `src/components/Companion.tsx` — `sessionGreeted` module-level flag is the
  per-session-state precedent (but see Step 11: the badge needs reactivity,
  so it uses an ephemeral store field instead).
- `src/components/gate.tsx` — `GateReveal` is the two-phase full-screen
  reveal pattern (build-up → payoff + confetti, `onDone` closes, caller owns
  the trigger) to model `BuildReveal` on.
- `src/game/debug.ts` — `simulateRoundOutcome` mirrors the real round economy
  (fragments, star bank, iskierki for rainbow); it must also mirror the wage.
- `src/achievements/catalog.ts` — 41 achievements, `REWARD_BY_DIFFICULTY =
  {easy:5, medium:10, hard:15, legendary:25}` → 520 total; `catalog.test.ts`
  freezes the id list (tripwire), `evaluate.test.ts` asserts "41 + 520
  iskierek na maks". Adding achievements = append with new ids + update both.
- `src/monsters/parts.tsx` / `MonsterSvg.tsx` — proof the repo hand-rolls SVG
  art; the monsters' visual language (gradients, rounded shapes, bold
  outlines) is the quality bar buildings should meet. `monsters/` itself is
  FROZEN — read, never modify.
- Deploy gates on `bun test` (CI); Biome via `bun run check` is the mandatory
  closeout. Input model: activation on `click` only, touch targets ≥ 64px,
  no native `<input>`, UI Polish-only. WSL browser testing via puppeteer-core
  (emoji render as empty boxes in screenshots — not a bug).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bun run typecheck` | exit 0 |
| Full suite | `bun test` | all pass (180 + new) |
| One file | `bun test src/game/village.test.ts` | that file passes |
| Lint/format | `bun run check` | exit 0 |
| Build | `bun run build` | exit 0 |
| Visual check | dev server + puppeteer-core recipe in root `CLAUDE.md` | screenshots of the scene |

## Scope

**In scope** (create/modify only):
- `src/game/village.ts` (create) — catalog + pure helpers (economy source of truth)
- `src/game/village.test.ts` (create)
- `src/store/schema.ts` — `SaveState.village`, `SAVE_VERSION = 9`, migration 8
- `src/store/schema.test.ts` — migration test + shape-lock update (15 keys)
- `src/store/store.ts` — actions `buildVillage`/`buyDecoration`/`setVillageGoal`,
  wage on round end, ephemeral `villageVisited`, `mergePersisted` backfill
- `src/store/store.test.ts` — new characterization tests
- `src/game/debug.ts` + `src/game/debug.test.ts` — wage in the round simulation
- `src/components/village/` (create) — building art + `BuildReveal` (may also
  be flat files in `components/`; executor's call, note it in the DOX)
- `src/screens/VillageScreen.tsx` — full scene rework (bands, plots, sheet,
  wallet, goal strip, celebrations, inhabitants)
- `src/screens/RoundSummary.tsx` — wage + goal-progress line
- `src/screens/HomeScreen.tsx` — session-scoped "affordable" badge
- `src/screens/DebugScreen.tsx` — pacing panel + `debugBuildAll`
- `src/styles.css` — new `anim-*` keyframes ("wioska budowniczych" section)
- `src/achievements/catalog.ts` + tests — 3 new achievements (append-only)
- `CLAUDE.md` (root), `src/CLAUDE.md`, `src/game/CLAUDE.md`,
  `src/store/CLAUDE.md`, `src/achievements/CLAUDE.md`, `ROADMAP.md` — DOX pass
- `plans/README.md` — status row

**Out of scope** (do NOT touch):
- `src/monsters/**` — the catalog is FROZEN; the signature test must not
  change. Buildings may be **new SVG components or layered emoji + CSS**
  (executor's judgment per building — SVG encouraged for Zamek, Domki and
  Fontanna so the centerpieces match the monsters' quality), but never new
  files inside `monsters/` and never edits to `MonsterSvg`/`parts.tsx`.
  *Using* `MonsterStage`/`WanderingMonster` for inhabitants is expected.
- `MonsterStage` slot contents / per-monster cosmetics (accessories, wearable
  backgrounds) — the designated future follow-up, not this plan.
- Wish-egg costs and `ISKIERKI_FOR_DUP` — existing economy stays untouched;
  this plan only ADDS a source (wage) and a sink (village).
- Drag-and-drop placement, free positioning — v1 uses fixed anchor slots.
- Build timers / daily limits / upkeep — deliberately rejected (principle 6).
- Any change to pedagogy: selection, mastery, stages, egg thresholds.

## Git workflow

- Branch: `feat/012-wioska-budowanie`
- Commit per phase (A/B/C below) or logical group; message style matches
  `git log` (short, lowercase, e.g. `feat(village): building economy + save v9`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Phase A — economy foundation (pure logic + persistence)

#### Step 1: Create `src/game/village.ts` (pure catalog + helpers)

Follow the declarative-catalog pattern of `src/achievements/catalog.ts`.
Contents (signatures binding, wording PROPOZYCJE):

```ts
export type BuildingId =
	| "ogrodek" | "plac-zabaw" | "latarnie" | "domki" | "fontanna" | "zamek"
export type DecorationId =
	| "kwiatki" | "sciezka" | "hustawka" | "staw" | "pomnik" | "tecza"

export const MAX_BUILDING_LEVEL = 3

export interface BuildingDef {
	id: BuildingId
	name: string                         // PL, PROPOZYCJE do dopracowania
	levelNames: [string, string, string] // PL per-level label (PROPOZYCJE)
	description: string                  // PL: co daje / co się zmieni (PROPOZYCJE)
	costs: [number, number, number]      // koszt L1 / L2 / L3
}

export interface DecorationDef {
	id: DecorationId
	name: string // PROPOZYCJE
	cost: number
}

export const BUILDINGS: readonly BuildingDef[]      // 6, table above
export const DECORATIONS: readonly DecorationDef[]  // 6, table above

// Stan wioski w zapisie (typ należy tu, store go persystuje — wzór EggBankState).
export interface VillageState {
	buildings: Partial<Record<BuildingId, number>> // id → poziom 1..3 (brak = niezbudowany)
	decorations: DecorationId[]                    // kupione (kolejność bez znaczenia)
	goalId: BuildingId | null                      // cel wybrany przez dziecko („Mój cel!")
}
export const INITIAL_VILLAGE: VillageState = {
	buildings: {},
	decorations: [],
	goalId: null,
}

// Koszt następnego poziomu (null gdy maks) — jedyne źródło prawdy dla UI i akcji.
export function nextLevelCost(v: VillageState, id: BuildingId): number | null

// Żołd za ukończoną rundę — formuła i uzasadnienie w plans/012 (sekcja Economy).
// firstRoundToday wyliczane w store PRZED bumpDaysPlayed.
export function roundWage(
	v: VillageState,
	stars: number,
	firstRoundToday: boolean,
): number

// Limit wędrowców w wiosce: BASE + 4 × poziom domków (14/18/22/26).
export const BASE_VILLAGE_CAP = 14
export function villageCap(v: VillageState): number

// Bieżący cel: wybrany przez dziecko (goalId → następny poziom tego budynku),
// a gdy brak/maks — najtańszy nieosiągnięty (budynek-poziom lub dekoracja).
// null gdy wszystko kupione. Napędza pasek celu w wiosce i w RoundSummary.
export function currentGoal(
	v: VillageState,
): { kind: "building" | "decoration"; id: string; name: string; cost: number } | null

// Czy stać na cokolwiek jeszcze niekupionego (badge na Home).
export function canAffordSomething(v: VillageState, iskierki: number): boolean

// Suma iskierek zainwestowanych w wioskę (poziomy + dekoracje) — panel debug
// (obserwacja pacingu: wydane ≈ villageValue + koszty jajek życzeń).
export function villageValue(v: VillageState): number
```

Pure and deterministic, no `Math.random`/`Date.now()`/DOM (module contract of
`src/game/`). Mark every player-facing string bank with
`// PROPOZYCJE do dopracowania`.

**Verify**: `bun run typecheck` → exit 0.

#### Step 2: Tests `src/game/village.test.ts`

Model on `src/game/rewards.test.ts` (first line
`/// <reference types="bun-types" />`, Polish test names). Assert:

- catalog integrity: 6 buildings + 6 decorations, all ids unique, every
  building has exactly 3 ascending costs (`c1 < c2 < c3`), every decoration
  cost > 0.
- economy invariants (tuning-resistant — these encode the design decisions):
  - cheapest building L1 ≤ 5 (first goal reachable in the first sessions);
  - **Zamek L1 ≤ 25** (the flywheel must be buyable in week one);
  - every decoration cheaper than the cheapest building L2;
  - total sink (all levels + decorations) within `[800, 1500]`.
- `nextLevelCost`: unbuilt → L1 cost; L1 → L2 cost; L3 → `null`.
- `roundWage` (empty village unless noted): stars 0, no daily → 1; stars 15
  → 2; stars 29 → 2; stars 30 → 3; stars 30 + daily → 4; zamek L3 + stars 30
  + daily → 7; zamek L1 + stars 0 → 2.
- `villageCap`: 14 / 18 / 22 / 26 for domki 0–3.
- `currentGoal`: empty village, no goalId → the ≤5 item; goalId set to an
  unmaxed building → that building's next level (even when pricier than the
  cheapest); goalId pointing at a maxed building → falls back to cheapest;
  fully-built village → `null`; skips bought decorations and maxed buildings.
- `canAffordSomething`: false at 0 ✨ … true at the cheapest goal's cost;
  false when everything is bought regardless of wallet.
- `villageValue`: empty → 0; ogródek L2 + kwiatki → 5 + 15 + 4 = 24; fully
  built → the grand total (same number as the sink invariant).

**Verify**: `bun test src/game/village.test.ts` → all pass.

#### Step 3: Save schema v9 (`src/store/schema.ts` + `schema.test.ts`)

- Add `village: VillageState` to `SaveState` (import the type from
  `../game/village`) and `village: INITIAL_VILLAGE` to `INITIAL_SAVE`.
- Bump `SAVE_VERSION` to `9`; add the migration per the documented pattern:

```ts
// v8→v9: dodano wioskę budowniczych (budynki + dekoracje za iskierki, wybrany
// cel). Start pusty — dotychczasowe iskierki dziecka zostają nietknięte i od
// razu ma za co je wydać.
8: (state) => ({
	...(state as Record<string, unknown>),
	village: { buildings: {}, decorations: [], goalId: null },
}),
```

- `schema.test.ts`: update the `INITIAL_SAVE` shape-lock to **15 keys**
  (adding `"village"` to the sorted list) and add migration tests:
  `migrateSave(x, 8)` adds an empty village and preserves existing fields
  (e.g. `iskierki: 42` stays 42); full-chain `migrateSave(v1save, 1)` ends
  with `village` present.

**Verify**: `bun test src/store/schema.test.ts` → all pass (including the
updated shape-lock). `bun run typecheck` → exit 0.

#### Step 4: Store actions (`src/store/store.ts`)

Model the spend actions on `buyWishEgg` (silent no-op when unaffordable,
deduct, `checkAchievements()` at the end) and the goal setter on
`setDreamMonster`. Store stays a thin coordinator — all math comes from
`src/game/village.ts`:

```ts
buildVillage: (id: BuildingId) => void
// cost = nextLevelCost(state.village, id); null lub cost > iskierki → no-op.
// Success: iskierki -= cost; village.buildings[id] = (poziom ?? 0) + 1;
// jeśli id === village.goalId → goalId = null (cel osiągnięty);
// (nowe obiekty village/buildings — nie mutować); checkAchievements().

buyDecoration: (id: DecorationId) => void
// już kupiona lub cost > iskierki → no-op. Success: deduct, append,
// checkAchievements().

setVillageGoal: (id: BuildingId | null) => void
// cienki setter (wzór setDreamMonster); ustawienie celu na zbudowany-maks
// budynek jest dozwolone ale bezcelowe — UI po prostu tego nie oferuje.
```

Also:
- ephemeral `villageVisited: boolean` (NOT persisted — same class as `mode`):
  set to `true` inside `goTo` when the target screen is `"village"`; reset to
  `false` by `debugReset`. Drives the Home badge (Step 11) reactively —
  a module-level flag (the `sessionGreeted` precedent) would not re-render
  Home, hence a store field.
- `mergePersisted`: extend the deep-merge backfill to `village` (same
  rationale as `achievementStats` — a dev-HMR save stamped v9 without the
  field must not produce `undefined.buildings`). Backfill each subkey from
  `INITIAL_VILLAGE`.
- `debugReset` already spreads `INITIAL_SAVE` → covers `village`; confirm, do
  not duplicate.

**Verify**: `bun run typecheck` → exit 0.

#### Step 5: Wage on round completion (`store.ts` + `src/game/debug.ts`)

In `nextQuestion`'s finalize branch (where `totalRounds++` lives):

```ts
// PRZED bumpDaysPlayed — bump nadpisuje lastPlayedDay, a bonus dnia liczy się
// względem stanu sprzed tej rundy.
const firstRoundToday =
	state.achievementStats.lastPlayedDay !== dayStamp(now)
const wage = roundWage(state.village, round.stars, firstRoundToday)
iskierki = Math.min(ISKIERKI_CAP, iskierki + wage)
```

and stash `wage` on the round for the summary: add `wageEarned: number` to
`RoundState` (ephemeral — `RoundState` is not persisted, so NO migration; set
it in the same `set()` that enters phase `"summary"`).

Mirror in the two debug paths (both bump `totalRounds`, so both must pay):
- `debugFinishRound` (store) — same computation, same ordering caveat.
- `simulateRoundOutcome` (`src/game/debug.ts`) — apply
  `roundWage(state.village, totalStars, firstRoundToday)` after the
  per-question loop; `firstRoundToday` computed from
  `state.achievementStats.lastPlayedDay` vs the injected `now` (the function
  is pure; `dayStamp` must therefore be importable without cycles — it
  lives in `store.ts` today; if importing it into `game/debug.ts` creates a
  cycle, move `dayStamp` to a neutral module such as `src/game/facts.ts` or a
  tiny `src/game/time.ts` and re-export from the store for the existing
  consumers — note it in the DOX).
- `debug.test.ts`: determinism test still holds (wage is deterministic); add
  an assertion that a simulated round increments iskierki by ≥ 1.

**Verify**: `bun test src/game/debug.test.ts` → pass; `bun test` → existing
180 still green (see STOP conditions if an existing test breaks).

#### Step 6: Store characterization tests (`src/store/store.test.ts`)

Follow the file's conventions (reuse `game()`, `answer()`, `beforeEach`
`debugReset()`, `suppressAchievements` for economy isolation, never
`Math.random`, Polish names). Cover:

- `buildVillage`: with exactly enough iskierki → level 1 set, wallet at 0;
  called again with 0 ✨ → no-op; upgrade L1→L2 deducts the L2 cost; at L3 →
  no-op even with a full wallet.
- goal lifecycle: `setVillageGoal("zamek")` persists; `buildVillage("zamek")`
  (affordable) clears `goalId`; building a DIFFERENT building leaves it.
- `buyDecoration`: buys once, deducts; second call same id → no-op.
- wage: full clean round (the `playCleanRound` pattern from the egg-bank
  tests) → iskierki increase by exactly `roundWage` for stars 30 + first
  round today (achievements suppressed) — assert the concrete number and
  that `round.wageEarned` matches; second clean round same "day" → 1 less
  (no daily bonus); with zamek pre-set to L3 via `useGame.setState` → +3 more;
  `exitRoundEarly` → +0.
- `ISKIERKI_CAP` respected: wallet 998 + clean round → 999.
- `villageVisited`: false initially, true after `goTo("village")`, false
  after `debugReset`.

**Verify**: `bun test src/store` → all pass.

### Phase B — the scene and the build UI

#### Step 7: Building art (`src/components/village/`)

Create the visual layer FIRST, separately testable in isolation (a debug
gallery is optional but `debugBuildAll` in Step 13 covers it):

- One presentational component per building (props: `level: 0..3`, where 0 =
  silhouette), rendering **layered composition that visibly grows per level**
  — size, added elements (flags, lights, windows), glow. Level pips are
  BANNED as the primary indicator; the building's growth IS the indicator
  (the sheet shows „poziom 2/3" as text).
- Art medium per building: hand-rolled SVG for the centerpieces (Zamek,
  Domki, Fontanna) matching the monsters' visual language (gradients from
  the `@theme` palette, rounded shapes, bold outlines — study
  `monsters/parts.tsx` for the idiom, import nothing from it); layered
  emoji + CSS is acceptable for Ogródek/Plac Zabaw/Latarnie and all
  decorations.
- Silhouette state (level 0): grayscale/low-opacity version of the L1 art
  with a small `✨cost` price chip. Aspirational, subtle — not an ad.
- `BuildReveal` component (model on `GateReveal`, two phases: „Budujemy…"
  hammering shake → payoff pop of the new art + confetti + name). Purely
  presentational, `onDone` closes, caller owns the trigger.
- New keyframes in `styles.css` under a "wioska budowniczych" section
  (transform/opacity only; `useState` + `setTimeout` + cleanup — never
  `animationend`, per `src/CLAUDE.md`).

**Verify**: `bun run typecheck` → exit 0.

#### Step 8: VillageScreen scene rework

Rework `src/screens/VillageScreen.tsx` around a composed scene, keeping the
wandering-monster system:

- **Scene bands** (the composition fix): sky strip (sun, Latarnie glow,
  Tęcza) → **building band** (upper third: the 6 building anchors as a
  loose street/skyline) → **meadow** (lower two-thirds: wanderers, Ścieżka
  weaving through, ground decorations). Buildings are part of the scenery the
  monsters live in front of — not icons pinned to screen edges.
- **Scene-wide effects per purchase** (principle 2): Ogródek scatters flower
  patches across the meadow (more + animated butterflies per level); Ścieżka
  draws a path across the band boundary; Latarnie tint the sky edges and add
  fireflies at L2+; at L3 **tapping a lantern toggles day/evening** (ephemeral
  component state, a toy — never persisted, never automatic); Zamek anchors
  the skyline center.
- **Inhabitants** (principle 3): extend `wanderParams` (or wrap it — keep it
  deterministic from `id` + index) so that for each BUILT building, 1–2 of
  the shown wanderers get a "resident" variant: anchored near that building's
  meadow-side anchor with a calm bob/doze animation instead of the full
  stroll (Domki: peeking/sleeping by the houses; Fontanna: dozing beside it;
  Plac Zabaw: bouncing on it). Residents stay tappable (jump+hearts as
  today). Deterministic assignment (e.g. by `id % builtBuildings.length`) —
  stable between renders, no randomness.
- **Wallet**: `✨ N` chip in the header row, always visible.
- **Plot interaction**: tap a building (any state) → build sheet. Plot
  buttons ≥ 64px, `click`-activated, `pointer-events` only on the buttons
  (layer container `pointer-events-none`) so monsters stay tappable.
- **Build sheet** (bottom-sheet modal, CollectionScreen-modal styling): name,
  per-level description (what will CHANGE in the scene — sell the
  transformation), current level („poziom 1/3"), next cost, and:
  - affordable → `Zbuduj! ✨10` / `Ulepsz! ✨30` (BigButton);
  - not affordable → disabled-styled with progress framing:
    `✨ 7/10 — graj dalej!` (**never** an error tone) **plus** a
    `Mój cel! ⭐` toggle wired to `setVillageGoal` (the chosen-goal hook;
    shows as pressed when `goalId === id`);
  - maxed → celebratory `Maksymalny poziom! 🏆`.
  - A header `🛠️` button opens the same sheet as a scrollable list of
    everything (buildings + decorations) — this is where decorations are
    discovered (they show NO silhouettes on the scene; impulse buys).
- **Goal strip** under the header, driven by `currentGoal`:
  `Następny cel: Zamek ⭐ ✨ 12/20` with a thin progress bar (⭐ marks a
  self-chosen goal). Hidden when everything is bought (replaced by
  `🏆 Wioska w pełnej krasie!`).
- **Wanderer cap**: `villageCap(village)` replaces the `VILLAGE_CAP`
  constant.
- Update the `HelpTip` text (PROPOZYCJA: "…Zbieraj ✨ iskierki i buduj —
  każdy budynek zmienia wioskę, a potworki się do niego wprowadzą!").
- Empty state (0 monsters) stays as is.

**Verify**: `bun run typecheck` → exit 0; visual pass via puppeteer-core:
screenshot at 0 buildings (silhouettes in the band, goal strip shows the ≤5
item), then `debugBuildAll` (Step 13) and screenshot again — the scene must
look *transformed*, not appended-to. Emoji as empty boxes in WSL is expected.

#### Step 9: Build celebrations

On successful `buildVillage`/`buyDecoration` in the UI:

- decorations + building L1/L2 → pop-in of the new art + short confetti
  burst + wallet visibly ticking down;
- **any L3 and every Zamek level** → full-screen `BuildReveal` (Step 7);
- **nearby monsters celebrate**: trigger the existing jump+hearts overlay on
  the 2–3 wanderers closest to the built anchor (reuse the tap-reaction
  path; no new mechanics).

**Verify**: visual (debug iskierki → buy Ogródek → pop+confetti + monsters
jump; buy Zamek L1 → full-screen reveal).

#### Step 10: Wage + goal progress in the round summary

`src/screens/RoundSummary.tsx`: one compact line/chip near the stars/egg
result, composed of the wage and the live goal (the highest-value hook —
the summary is where "one more round?" is decided):

```
+3 ✨   →   Zamek ⭐  ✨ 12/20  [───────░░░]
```

- wage from `round.wageEarned`; goal from `currentGoal(village)` + wallet
  (post-wage, i.e. current store state — the child sees the bar move because
  of THIS round).
- when everything is bought: just the wage chip.
- Do NOT aggregate dup/rainbow/achievement iskierki into the number — this
  chip is the deterministic wage only.
- Do not disturb the `EggReward` animation contract (sibling element, not a
  change to the egg flow).

**Verify**: typecheck + visual (`?debug` → `debugFinishRound` → summary shows
chip + goal bar; play a second round → bar visibly advanced).

#### Step 11: Home badge (session-scoped)

On the `Wioska 🏡` button in `HomeScreen.tsx`, show a badge (PROPOZYCJA:
`✨ stać cię na budowę!`) when
`canAffordSomething(village, iskierki) && !villageVisited` — the ephemeral
store flag from Step 4. Mirror the "nowa brama!" badge styling. Behavior:
appears when affordable, disappears for the rest of the session after the
first village visit (prevents permanent-wallpaper blindness once income
outruns spending), reappears next session if still affordable. No persisted
seen-ledger.

**Verify**: typecheck; visual: 0 ✨ → no badge; `debugAddIskierki(10)` →
badge; enter village and return → gone; reload (new session) → back.

### Phase C — hooks & closeout

#### Step 12: Three new achievements (`src/achievements/catalog.ts`)

Append (never reorder) with new stable ids; `progress` reads
`ctx.save.village` (pure, derivable — no new counters needed):

| id (stable)          | PROPOZYCJA title      | difficulty | condition |
|----------------------|-----------------------|------------|-----------|
| `pierwsza-budowla`   | „Pierwsza budowla"    | easy (5)   | built count ≥ 1 (target 1) |
| `wioska-w-rozkwicie` | „Wioska w rozkwicie"  | medium (10)| all 6 buildings ≥ L1 (current = built count, target 6) |
| `wielki-budowniczy`  | „Wielki budowniczy"   | hard (15)  | all 6 at L3 (current = maxed count, target 6) |

Update the frozen-id tripwire in `catalog.test.ts` (append the three ids) and
the totals in `evaluate.test.ts`: **44 achievements, 550 iskierki** at max
(520 + 5 + 10 + 15). The "max save" fixture there needs a maxed `village`.
`reconcileAchievements` needs no change (pure catalog evaluation; a
reinstalled save with buildings unlocks these silently — correct).

**Verify**: `bun test src/achievements` → all pass.

#### Step 13: Debug support (`src/screens/DebugScreen.tsx` + store)

For balance observation (the Maintenance-notes contract) and visual testing:

- store action `debugBuildAll()` — sets every building to L3 and buys every
  decoration WITHOUT deducting iskierki (test/visual tool, mirrors the
  spirit of `debugOwnRarity`).
- pacing panel on the debug screen: wallet, `villageValue(village)`,
  `wishEggsBought` (existing counter), and the current `roundWage` breakdown
  for a hypothetical 30★ round — enough to eyeball earned ≈ spent + wallet
  without new persisted counters.
- existing `debugAddIskierki` stays the wallet-seeding tool.

**Verify**: typecheck; visual: `debugBuildAll` → village renders fully built
(this is also the Step 8 screenshot source).

#### Step 14: Full-suite pass + DOX (mandatory)

**Verify first**: `bun test` → all pass (expect roughly 180 + ~30 new, 0
fail); `bun run typecheck`, `bun run build`, `bun run check` → all exit 0.
Confirm `src/monsters/catalog.test.ts` signature test is untouched and green.

Then the DOX pass:

- `src/game/CLAUDE.md` — Ownership: add `village.ts` (katalog budynków/
  dekoracji, `VillageState`, `nextLevelCost`, `roundWage`, `villageCap`,
  `currentGoal`, `villageValue`); Local Contracts: the wage formula + its
  rationale (stars steps, zamek, daily bonus and its cut-first status) and
  "koszty w jednym pliku"; Verification: `village.test.ts` coverage. If
  `dayStamp` moved (Step 5), record its new home.
- `src/store/CLAUDE.md` — `SAVE_VERSION = 9` + v8→v9 description; actions
  `buildVillage`/`buyDecoration`/`setVillageGoal` (wzory `buyWishEgg`/
  `setDreamMonster`); wage in the finalize branch + `wageEarned` on ephemeral
  `RoundState` + the bumpDaysPlayed ordering caveat; ephemeral
  `villageVisited`; `mergePersisted` backfills `village`; Verification: new
  coverage.
- `src/CLAUDE.md` — VillageScreen bullet rewritten: scene bands, building
  art components (`components/village/`), silhouettes, sheet, wallet, goal
  strip, celebrations + `BuildReveal`, residents, lantern toggle; replace the
  "szwy pod sklepik" phrasing (the seam is now filled); `villageCap()`
  (14 + 4/poziom domków) **fixing the current 16-vs-14 doc drift**;
  RoundSummary bullet: wage+goal chip; HomeScreen: session-scoped badge;
  DebugScreen: pacing panel + `debugBuildAll`.
- `src/achievements/CLAUDE.md` — 44 achievements; the three village ids.
- Root `CLAUDE.md` — only if a repo-wide claim changed (likely no edit;
  report "left unchanged" if so).
- `ROADMAP.md` — mark item 1 (sklepik/iskierki) as realized-in-v1 by the
  village build system (same ✅ pattern as item 2), noting what remains
  future (per-monster cosmetics via `MonsterStage` slots, card frames).
- `plans/README.md` — status row for 012.

**Verify**: `bun run check` → exit 0.

## Test plan

- `src/game/village.test.ts` — catalog integrity + the four economy
  invariants (incl. Zamek L1 ≤ 25) + all pure helpers (Step 2).
- `src/store/schema.test.ts` — v8→v9 migration, full chain, 15-key shape-lock
  (Step 3).
- `src/store/store.test.ts` — build/upgrade/no-op, goal lifecycle (set →
  build → auto-clear), decoration idempotence, wage (stars steps / zamek /
  daily bonus / early-exit / cap), `villageVisited` (Step 6).
- `src/game/debug.test.ts` — simulation mirrors the wage (Step 5).
- `src/achievements/*.test.ts` — 44 ids, 550 max total, village conditions
  (Step 12).
- Manual visual pass (puppeteer-core + real device when available):
  silhouettes → build → celebration hierarchy (small pop vs `BuildReveal`) →
  residents appear; goal strip + summary bar math; badge lifecycle; monsters
  remain tappable around plots; lantern day/evening toggle; `debugBuildAll`
  full-scene screenshot.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck`, `bun run build`, `bun run check` all exit 0
- [ ] `bun test` exits 0; count ≥ 205; **zero previously-passing tests
      modified except** the explicitly listed ones (shape-lock 15 keys,
      achievements tripwire/totals)
- [ ] `src/game/village.ts` exists; `grep -n "Math.random\|Date.now" src/game/village.ts`
      → no matches
- [ ] `grep -n "SAVE_VERSION = 9" src/store/schema.ts` → 1 match; migration `8:` present
- [ ] `grep -c "buildVillage\|buyDecoration\|setVillageGoal" src/store/store.ts` ≥ 3
- [ ] `git diff 78d22d3..HEAD -- src/monsters/` → empty (frozen catalog untouched)
- [ ] Visual pass done and reported: scene transformation (before/after
      `debugBuildAll` screenshots), summary goal bar, badge lifecycle,
      `BuildReveal` for Zamek
- [ ] All five DOX docs + `ROADMAP.md` updated per Step 14
- [ ] Player-facing string banks marked `// PROPOZYCJE do dopracowania`
- [ ] `plans/README.md` status row for 012 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows any listed file changed since `78d22d3` and a
  "Current state" claim no longer holds.
- Any **existing** test fails after adding the wage — the wage leaked into a
  path it shouldn't touch (e.g. `exitRoundEarly`, retypes, or an egg-economy
  test not using `suppressAchievements`). Diagnose which path; do not "fix"
  the old test.
- The daily-bonus computation cannot be ordered before `bumpDaysPlayed`
  without restructuring the finalize branch — report the conflict rather
  than reordering side effects.
- Importing `dayStamp` into `src/game/debug.ts` creates an import cycle and
  the Step-5 relocation isn't clean — report options instead of forcing it.
- You are tempted to add a timer, daily limit, upkeep cost, or anything that
  makes absence or slowness LOSE something — violates principle 6. (The
  daily +1 rewards presence; it must never subtract or display a broken
  streak.) Full stop.
- The village UI requires touching `monsters/**` or the frozen signature test.
- A building's only implementable effect turns out to be "an icon appears"
  (principle 2 unsatisfiable within effort) — report which building and
  propose, don't silently ship the icon.
- `mergePersisted` changes break the existing HMR-safety test for
  `achievementStats`.

## Maintenance notes

- **Balance tuning is expected.** All prices, the wage formula, and cap
  bonuses live in `src/game/village.ts`; tests assert structure and ranges,
  not exact values, so the user can retune after watching the child play.
  The debug pacing panel (Step 13) is the observation tool. **Cut list, in
  order, if the economy feels too generous**: (1) daily +1 bonus, (2) the
  stars ≥ 15 step, (3) raise L3 prices. Never cut the base +1.
- The user finalizes all Polish names/copy — after this lands, hand him the
  full list of PROPOZYCJE strings (buildings, level names, descriptions,
  sheet copy, badge, chips, HelpTip) for a wordsmithing pass; renames are
  free (ids are stable).
- Natural follow-ups deliberately excluded: per-monster cosmetics through the
  `MonsterStage` slots (accessories bought in a village shop building — a
  good reason for a "Sklepik" building later), card frames for the
  collection, a wish-egg discount perk on the Fontanna (rejected for v1: the
  wish egg is the dream-monster pedagogy sink; don't undercut it before
  observing how the two sinks compete), and a repeatable end-game sink for
  the post-completion spark flood.
- If residents (Step 8) prove heavy on the tablet, they are the first
  performance lever: cap residents at 1 per building before touching the
  wanderer cap.
