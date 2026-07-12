# Plan 017: Wyprawy Potworków — kolekcja rusza w teren (postęp liczony rundami)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2092dfc..HEAD -- src/store/schema.ts src/store/store.ts src/game/village.ts src/screens/CollectionScreen.tsx src/screens/VillageScreen.tsx src/screens/RoundSummary.tsx src/achievements/catalog.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition. **Coordination**: plans 013/015/017 all add
> `SaveState` fields — the migration number below is written as "next
> available"; take the actual next `SAVE_VERSION` at implementation time and
> update the shape-lock accordingly (order of landing decides). The same
> applies to ACHIEVEMENTS: plans 013 (changes two targets/fixtures) and 015
> Phase C (+2 ids) touch the tripwire and totals too — every achievement
> count in this plan is RELATIVE (+2 ids / +15✨); compute absolutes against
> whatever is on the branch when you land.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read the chain before
> editing: root `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`,
> `src/store/CLAUDE.md`, `src/achievements/CLAUDE.md`. This plan CHANGES
> contracts in all of them (new domain module, new `SaveState` field + a
> migration + a new event counter, +2 achievements) — the DOX updates are the
> final step and are mandatory.
>
> **Naming (user preference, binding)**: the user wordsmiths all player-facing
> Polish names himself. Every expedition name, description, and UI string in
> this plan is a **PROPOZYCJA**. Implement with the proposed strings, mark the
> string banks with a `// PROPOZYCJE do dopracowania` comment, and do NOT
> treat naming as final. Stable **ids** (persisted) must be chosen once and
> never changed.

## Status

- **Priority**: P2 (feature — retention loop between rund a wioską)
- **Effort**: M (one save field, one pure module, three small UI touchpoints)
- **Risk**: MED (save-schema change + a second income source; both patterns
  proven by plan 012)
- **Depends on**: plan 012 merged (wage economy + village on `main` or the
  working branch); coordinate migration number with plans 013/015
- **Category**: feature (retencja / żywa kolekcja)
- **Planned at**: commit `2092dfc` (branch `feat/012-wioska-budowanie`), 2026-07-12

## Why this matters

The collection is the game's biggest emotional asset, and today it *does*
nothing: monsters wander the village and sit in the album. An expedition —
"wyślij potworka na wyprawę, wróci za N rund" — makes an owned monster an
**active participant in the math loop**:

*pick a monster → send it off → its absence is visible in the village → each
completed round advances the journey → it returns during a round summary with
a reward → pick the next one.*

Design goals, in priority order:

1. **Progress is COMPLETED ROUNDS, never wall-clock.** Root design rule 1
   ("szybkość tylko nagradza, nigdy nie karze" + warstwa opiekuńcza: przerwa
   = najcieplejsze powitanie) forbids any mechanic where absence costs
   something. An expedition parked for two weeks is exactly where the child
   left it. **No `Date.now()` anywhere in this feature.**
2. **A medium-term loop.** Rounds (minutes) and the village (days/weeks) have
   nothing in between. A 3–12-round expedition is a "come back tomorrow and
   play two rounds" magnet that is entirely pull, no push.
3. **Supplements the wage, never dwarfs it.** The wage
   (`roundWage`, 1–7 ✨/round, typical 2–4) stays the primary income;
   expeditions add ~+1.3–2.1 ✨/round *while active* (numbers below).
4. **Zero lock-in anxiety.** One expedition at a time, free instant recall
   (no reward, no penalty), and the expedition waits forever.

### Economy design (the numbers)

Catalog (all values PROPOZYCJE for names; numbers are the tuning surface):

| Type (id)             | Duration (rund) | Reward | ✨/runda | Trop (znalezisko) |
|-----------------------|-----------------|--------|----------|-------------------|
| Zwiad (`zwiad`)       | 3               | 4 ✨   | 1.33     | —                 |
| Wyprawa (`wyprawa`)   | 7               | 12 ✨  | 1.71     | 25% szansy        |
| Wielka Wyprawa (`wielka`) | 12          | 25 ✨  | 2.08     | zawsze            |

- Rates rise with commitment (longer journey = better ✨/runda) — teaches
  delayed gratification, the same lesson as the Zamek flywheel.
- Against the wage: the real guard is the **test-locked invariant ≤ 2.5
  ✨/runda for every type** (Step 2) — an active expedition can at most add
  2.5 ✨ to each completed round, i.e. never more than the wage itself adds
  at its typical 2–4 ✨. The one-at-a-time rule plus manual re-send friction
  pushes the long-run average well below that ceiling. **Cut lever if too
  generous: halve rewards** (one file, see Maintenance notes).
- **Trop** (optional flavor, in scope): the expedition brings back a clue
  about a random UNOWNED monster — the summary offers "Ustaw jako
  wymarzonego?" wiring straight into the existing `dreamMonsterId` mechanic.
  No new economy, pure connective tissue between features. All-owned →
  no trop (like `rollWish` null).

### Rules that protect the vibe

- **Przyjaciel zostaje w domu.** The companion cannot be sent — he lives on
  the Home screen and cheers during rounds; sending him away would silently
  break the game's warmest feature. UI shows a gentle line instead
  (PROPOZYCJA: „Przyjaciel woli zostać z Tobą 💛").
- **The traveler is visibly absent from the village, and the absence is
  EXPLAINED in place.** Filtering the monster out of the wanderers is only
  half the mechanic — a beloved monster silently vanishing reads as loss or
  a bug to a child. A **required** 🏕️ marker (tent + the traveler's
  mini-silhouette) stands at a fixed meadow-edge spot while someone is away;
  tapping it shows the expedition progress (x/y rund). The child always
  knows WHERE her monster is.
- **Recall (`Zawróć`) is free and instant** — no reward, no cost, no guilt
  copy. Chosen over "waits forever only" because the child may want that
  monster back as companion, and misclicks must be reversible.

## Current state

Verified at `2092dfc` (branch `feat/012-wioska-budowanie`; `bun test` → 217
pass / 0 fail):

- `src/store/schema.ts` — `SAVE_VERSION = 9`; `INITIAL_SAVE` has **15 keys**
  (shape-locked in `schema.test.ts`, sorted list ends `"unlockedStage",
  "village"`). Migration pattern documented above `MIGRATIONS`.
- `src/store/store.ts` — the finalize branch of `nextQuestion`
  (`store.ts:~490–520`) computes `firstRoundToday` BEFORE `bumpDaysPlayed`,
  applies `roundWage` (cap `ISKIERKI_CAP` = 999), stamps `round.wageEarned`
  (ephemeral `RoundState`, line ~92). Debug paths that also bump
  `totalRounds`: `debugSimulateRound` (~line 795) and `debugFinishRound`
  (~line 820) — both must stay consistent with any per-round-completion
  mechanic. `debugReset` spreads `INITIAL_SAVE`.
- `src/game/village.ts` — `roundWage` (1..7: baza 1 + stars≥15 + stars==30 +
  zamek 0–3 + pierwsza runda dnia), `WAGE_GOOD_ROUND_STARS = 15`. The model
  for "all tuning numbers in one pure file".
- `src/game/rewards.ts` — `rollWish` shows the unowned-pool pattern
  (renormalized tiers, `null` at full collection) to model the trop roll on;
  `ISKIERKI_CAP = 999`.
- `src/screens/CollectionScreen.tsx` (337 lines) — owned-monster modal has
  the "PRZYJACIEL: wybór ulubieńca" section (~line 248: „Zostań moim
  przyjacielem! 💛" / „💛 To Twój przyjaciel") — the expedition send UI slots
  in right below it, same `BigButton` + `HelpTip` idiom.
- `src/screens/VillageScreen.tsx` — wanderer list built at ~line 121:
  `let shown = sorted.slice(0, cap)` with companion always included; the
  traveler filter is one line before that slice.
- `src/screens/RoundSummary.tsx` — wage chip under the star meter (pattern
  for the return celebration; `EggReward` animation contract must not be
  disturbed).
- `src/achievements/catalog.ts` — **44** achievements AT `2092dfc`, tripwire
  list in `catalog.test.ts` ends `"wielki-budowniczy"`; totals asserted in
  `evaluate.test.ts` (44 + 550 ✨ at this anchor — plans 015-C/013 change
  these before this plan lands; treat all achievement numbers as relative).
  `AchievementCounters` (`store/schema.ts`) is where event counters live
  (pattern: `wishEggsBought`).
- Home shows dynamic counts (`ACHIEVEMENTS.length`) — no hardcoded numbers.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bun run typecheck` | exit 0 |
| Full suite | `bun test` | all pass (217 + new) |
| One file | `bun test src/game/expeditions.test.ts` | that file passes |
| Lint/format | `bun run check` | exit 0 |
| Build | `bun run build` | exit 0 |
| Visual check | dev server + puppeteer-core recipe in root `CLAUDE.md` | screenshots |

## Scope

**In scope** (create/modify only):
- `src/game/expeditions.ts` (create) — catalog + pure helpers (single tuning file)
- `src/game/expeditions.test.ts` (create)
- `src/store/schema.ts` — `SaveState.expedition`, `SAVE_VERSION` bump,
  migration; `AchievementCounters.expeditionsCompleted`
- `src/store/schema.test.ts` — migration test + shape-lock (+1 key:
  `"expedition"`; absolute count depends on landing order — see Step 3)
- `src/store/store.ts` — `sendExpedition`/`recallExpedition`, resolution in
  the finalize branch, `expeditionReturn` on ephemeral `RoundState`,
  counter bump, debug-path consistency
- `src/store/store.test.ts` — characterization tests
- `src/screens/CollectionScreen.tsx` — send UI in the owned-monster modal
- `src/screens/VillageScreen.tsx` — traveler filtered from wanderers +
  REQUIRED 🏕️ marker (tent + mini-silhouette, tap → progress)
- `src/screens/HomeScreen.tsx` — status chip (progress x/y rund)
- `src/screens/RoundSummary.tsx` — return celebration + trop CTA
- `src/achievements/catalog.ts` + tests — 2 new achievements (append-only)
- DOX: `src/game/CLAUDE.md`, `src/store/CLAUDE.md`, `src/CLAUDE.md`,
  `src/achievements/CLAUDE.md`; `plans/README.md` status row

**Out of scope** (do NOT touch):
- `src/monsters/**` — frozen catalog; travelers are existing monsters.
- Wall-clock anything: no timers, no timestamps in expedition state, no
  "hurry back" mechanics. (`hatchedAt`-style `Date.now()` stamps are also
  unnecessary — progress is purely `totalRounds` arithmetic.)
- Multiple simultaneous expeditions, expedition "failure" outcomes, energy
  systems — v1 is one journey, guaranteed success.
- `src/game/debug.ts` (`simulateRoundOutcome`) — expedition resolution lives
  in the STORE around the sim (see Step 4), so the pure sim's signature and
  behavior stay untouched.
- Wage formula, village prices, wish-egg economy.

## Git workflow

- Branch: `feat/017-wyprawy`
- Commit per phase or logical group; message style matches `git log`
  (e.g. `feat(expeditions): save field + pure catalog`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Phase A — pure logic + persistence

#### Step 1: Create `src/game/expeditions.ts`

Follow the declarative-catalog pattern of `src/game/village.ts` (all tuning
numbers in this one file):

```ts
export type ExpeditionTypeId = "zwiad" | "wyprawa" | "wielka"

export interface ExpeditionDef {
	id: ExpeditionTypeId // stabilny klucz persystowany — NIGDY nie zmieniać
	name: string // PL, PROPOZYCJE do dopracowania
	description: string // PL: dokąd i po co (PROPOZYCJE)
	durationRounds: number // ukończone rundy do powrotu
	rewardIskierki: number
	tropChance: number // 0..1 — szansa na trop (wskazówkę o nieposiadanym)
}

export const EXPEDITIONS: readonly ExpeditionDef[] // tabela z sekcji Economy
export const EXPEDITIONS_BY_ID: ReadonlyMap<ExpeditionTypeId, ExpeditionDef>

// Stan w zapisie: tylko dane nieodtwarzalne. duration/reward NIE są
// persystowane — pochodzą z katalogu po typeId, więc retuning katalogu
// dotyczy też wypraw w toku (świadomy trade-off: prostota + jeden punkt
// prawdy; odnotuj w DOX).
export interface ExpeditionState {
	monsterId: number
	typeId: ExpeditionTypeId
	roundsAtStart: number // totalRounds w chwili wysłania
}

// postęp: ile ukończonych rund minęło (clamp do duration)
export function expeditionProgress(
	e: ExpeditionState,
	totalRounds: number,
): { done: number; total: number }

export function isExpeditionDone(e: ExpeditionState, totalRounds: number): boolean

// Rozstrzygnięcie powrotu (czyste, rand wstrzykiwany): nagroda + ewentualny
// trop — losowy NIEPOSIADANY potworek (wzór rollWish: null przy komplecie).
export function resolveExpedition(
	e: ExpeditionState,
	ownedIds: ReadonlySet<number>,
	allIds: readonly number[],
	rand: () => number,
): { rewardIskierki: number; tropMonsterId: number | null }
```

Pure and deterministic, no `Math.random`/`Date.now()`/DOM. Mark string banks
with `// PROPOZYCJE do dopracowania`.

**Verify**: `bun run typecheck` → exit 0.

#### Step 2: Tests `src/game/expeditions.test.ts`

Model on `village.test.ts` (first line `/// <reference types="bun-types" />`,
Polish names). Assert:

- catalog integrity: 3 types, unique ids, `durationRounds > 0` ascending,
  `rewardIskierki` ascending.
- **economy invariants (design decisions)**: ✨/runda
  (`rewardIskierki / durationRounds`) is ≤ 2.5 for every type AND strictly
  increasing with duration (longer commitment = better rate); cheapest
  duration ≤ 3 (first expedition returns within one session or two).
- `expeditionProgress`: 0 at start; clamps at total; monotone with
  totalRounds.
- `isExpeditionDone` boundary: false at duration−1, true at duration.
- `resolveExpedition`: reward matches catalog; trop with `rand` forced high /
  low respects `tropChance` (0 for zwiad → always null); trop is NEVER an
  owned id (loop ~200 seeded `mulberry32` draws); full collection → null.

**Verify**: `bun test src/game/expeditions.test.ts` → all pass.

#### Step 3: Save schema (`src/store/schema.ts` + `schema.test.ts`)

- Add `expedition: ExpeditionState | null` to `SaveState`;
  `expedition: null` in `INITIAL_SAVE`.
- Add `expeditionsCompleted: number` to `AchievementCounters` (+ `0` in
  `INITIAL_SAVE.achievementStats`) — needed because `expedition` clears on
  return, so "ukończone wyprawy" is not derivable (same rationale as
  `wishEggsBought`).
- Bump `SAVE_VERSION` to the **next available number** (9→10 if 017 lands
  first; coordinate with plans 013/015) and add the migration per the
  documented pattern:

```ts
// vN→vN+1: dodano wyprawy potworków. Start: nikt nie jest w drodze; licznik
// ukończonych wypraw od zera (mechanika liczy się od wdrożenia).
N: (state) => {
	const s = state as Record<string, unknown>
	const stats =
		s.achievementStats && typeof s.achievementStats === "object"
			? (s.achievementStats as Record<string, unknown>)
			: {}
	return {
		...s,
		expedition: null,
		achievementStats: { ...stats, expeditionsCompleted: 0 },
	}
},
```

- `schema.test.ts`: shape-lock → **+1 key** (add `"expedition"` to the
  sorted list; the absolute count depends on which save-touching plans
  landed first — 15 keys at `2092dfc`, 16 after plan 013's `cosmetics` —
  so compute it from the list you actually edit, don't copy a number);
  migration test (adds `expedition: null` + `expeditionsCompleted: 0`,
  preserves other fields, tolerates missing `achievementStats`); full-chain
  test ends with both present.
- `mergePersisted` (`store.ts`) already backfills `achievementStats` deep —
  the new counter is covered automatically; `expedition` is top-level
  nullable, no backfill needed. Confirm, don't duplicate.

**Verify**: `bun test src/store/schema.test.ts` → all pass;
`bun run typecheck` → exit 0.

#### Step 4: Store actions + resolution (`src/store/store.ts`)

Thin coordinators, math from `src/game/expeditions.ts`:

```ts
sendExpedition: (monsterId: number, typeId: ExpeditionTypeId) => void
// no-op gdy: już trwa wyprawa, potworek nieposiadany, LUB monsterId ===
// companionId (przyjaciel zostaje w domu). Sukces: expedition = { monsterId,
// typeId, roundsAtStart: totalRounds }.

recallExpedition: () => void
// zawrócenie: expedition = null. Bez nagrody i bez kary (odwracalność).
```

Resolution — in `nextQuestion`'s finalize branch, AFTER the wage (the wage
uses `state.iskierki` pre-expedition; keep the two additions sequential and
capped once at the end, or cap twice — pick one, assert in tests):

```ts
// wyprawa wraca? (totalRounds+1 = właśnie ukończona runda)
let expedition = state.expedition
let expeditionReturn: RoundState["expeditionReturn"] = null
if (expedition && isExpeditionDone(expedition, state.totalRounds + 1)) {
	const r = resolveExpedition(expedition, ownedSet, allIds, Math.random)
	iskierki = Math.min(ISKIERKI_CAP, iskierki + r.rewardIskierki)
	expeditionReturn = { monsterId: expedition.monsterId, ...r }
	expedition = null
	// licznik do osiągnięć
	achievementStats = { ...achievementStats, expeditionsCompleted: … + 1 }
}
```

- `expeditionReturn: { monsterId, rewardIskierki, tropMonsterId } | null` is
  a new field on **ephemeral `RoundState`** (like `wageEarned`) — set in the
  same `set()` entering phase `"summary"`, initialized `null` in `startRound`
  and `debugFinishRound`. NO migration (RoundState is not persisted).
- **Debug-path consistency**: `debugFinishRound` runs the same resolution
  block (it enters summary with full end-of-round events); `debugSimulateRound`
  also resolves but silently (no `expeditionReturn` UI — it has no round).
  The pure `simulateRoundOutcome` in `src/game/debug.ts` stays UNTOUCHED —
  the store wraps it. Note this in `src/store/CLAUDE.md`.
- `checkAchievements()` already runs at end of finalize — covers the new ids.
- `debugReset` spreads `INITIAL_SAVE` → clears `expedition`. Confirm.

**Verify**: `bun run typecheck` → exit 0; `bun test` → existing 217 still
green (see STOP conditions).

#### Step 5: Store characterization tests (`src/store/store.test.ts`)

Follow file conventions (`game()`, `answer()`, `playCleanRound` pattern,
`suppressAchievements` for economy isolation, no `Math.random` in tests):

- `sendExpedition`: sets state with `roundsAtStart === totalRounds`; no-op
  when one is active; no-op for `companionId`; no-op for unowned id.
- `recallExpedition`: clears; no iskierki change.
- resolution: send `zwiad` (3 rundy), play 2 clean rounds → still active;
  3rd round → `round.expeditionReturn` set with reward, `expedition ===
  null`, `expeditionsCompleted === 1`. **Wallet assertions MUST carry a
  `rainbowBonus` term**: the first clean round closes egg #1 at score 30,
  which rolls rainbow ~40% of the time (+1 ✨) — asserting „wages only"
  verbatim is a ~40%-flaky test. Copy the exact pattern from the existing
  wage tests in `store.test.ts` (the happy-path test asserts
  `4 + (pendingEggs[0]?.quality === "rainbow" ? 1 : 0)`, and the
  „żołd…zamek dodaje poziom" test computes a `rainbow3` term for the
  mid-round egg): here, wallet after round 3 =
  `sumOfWages + 4 + rainbowBonus`.
- cap: wallet 998 + return → 999.
- recall then resend: works (no cooldown).
- `debugFinishRound` resolves the same way.
- shape/merge safety already covered by schema tests.

**Verify**: `bun test src/store` → all pass.

### Phase B — UI touchpoints

#### Step 6: Send UI in `CollectionScreen` owned-monster modal

Below the "PRZYJACIEL" section (same `BigButton`+`HelpTip` idiom).
**Shared-surface governance** (binding — `plans/README.md`, sekcja
„Shared-surface governance"): this is a COLLAPSIBLE „Wyprawa 🎒" section,
collapsed by default, placed AFTER the wardrobe section if plan 013/014
landed first (fixed order: przyjaciel → Ubierz 🎩 → Wyprawa 🎒) — the card
modal is already long and scrollable; new sections must not unfold into it
by default.

- No expedition active AND monster ≠ companion → button
  „Wyślij na wyprawę 🎒" → expands an inline 3-option list (name, „x rund",
  „+y ✨", trop hint for wielka) → tap sends + closes modal.
- Monster IS the traveler → status chip „🎒 W drodze: x/y rund" + secondary
  „Zawróć" button (free, instant).
- Another monster is away → muted line (PROPOZYCJA: „Ktoś już jest na
  wyprawie — poczekaj na jego powrót").
- Monster is companion → gentle line „Przyjaciel woli zostać z Tobą 💛"
  (never a disabled-error tone).
- Touch targets ≥ 64 px, `click` activation only, Polish copy as PROPOZYCJE.

**Verify**: typecheck + visual (send, reopen modal shows status, recall).

#### Step 7: Absence in the village + Home chip

- `VillageScreen`: filter the traveler out of the wanderer pool (one line
  before the `shown` slice at ~line 121: `sorted.filter(id => id !==
  expedition?.monsterId)`); residents derive from `shown`, so no other
  change. **Required (not optional)**: a 🏕️ marker at a fixed meadow-edge
  spot while someone is away — tent emoji + the traveler's mini-silhouette
  (`MonsterSvg` size ~36, `monster-silhouette` class, the same convention
  as unowned guardians on the map). The marker is a button (≥64 px target,
  `aria-label`): tap → small bubble/chip with progress „x/y rund" (reuse
  the SpeechBubble idiom). Without this, the monster's absence reads as
  loss or a bug to the child — the marker answers „gdzie on jest?" inside
  the very scene where she'd look for it.
- `HomeScreen`: small status chip **BELOW the Gniazdo row**:
  „🎒 {imię}: x/y rund" with a thin progress bar; tap → `goTo("collection")`.
  Hidden when no expedition. Progress from
  `expeditionProgress(expedition, totalRounds)` — updates after every round.
  **Shared-surface governance** (binding — see `plans/README.md`, sekcja
  „Shared-surface governance"): Home follows the „maks jedna proaktywna
  karta" rule — this chip is passive status, sits below the nest, and
  YIELDS to plan 016's guardian-invitation card when both would show;
  „Graj!" never moves down because of it.

**Verify**: typecheck + visual: traveler absent from village AND the 🏕️
marker present (tap → progress bubble), chip counts up
after a round.

#### Step 8: Return celebration in `RoundSummary`

Under the wage chip (sibling of `EggReward` — do NOT disturb its animation
contract): an `anim-pop` card shown when `round.expeditionReturn`:

- `MonsterSvg` of the returnee + „Wrócił(a) z wyprawy! +{reward} ✨"
  (PROPOZYCJA).
- If `tropMonsterId !== null`: **silhouette + rarity badge ONLY — never the
  name.** `CollectionScreen` masks every unowned monster as `???` until
  hatched; leaking the name here would break the game-wide mystery
  convention and spoil the hatch reveal. Card copy (PROPOZYCJA): „Ktoś
  tajemniczy zostawił ślad!" + `monster-silhouette` art + `RARITY_META`
  badge. Button „Ustaw jako wymarzonego! ✨" → `setDreamMonster(tropMonsterId)`
  (existing action) — shown ONLY when the dream slot is empty (maintainer
  decision: never overwrite the child's chosen dream); with a dream already
  set, the card shows just the mysterious silhouette, no CTA.
- Keep it a compact card, not a full-screen reveal — the payoff hierarchy
  (hatch > gate > BuildReveal > chips) reserves full-screen for rarer events.

**Verify**: visual via `?debug` (`debugFinishRound` after sending + playing
enough rounds; or send `zwiad` and play 3 rounds).

### Phase C — achievements + closeout

#### Step 9: Two achievements (`src/achievements/catalog.ts`)

Append (never reorder) with new stable ids, `progress` reading the counter:

| id (stable)          | PROPOZYCJA title   | difficulty | condition |
|----------------------|--------------------|------------|-----------|
| `pierwsza-wyprawa`   | „Pierwsza wyprawa" | easy (5)   | `expeditionsCompleted ≥ 1` |
| `obiezyswiat`        | „Obieżyświat"      | medium (10)| `expeditionsCompleted ≥ 10` |

Update the frozen-id tripwire in `catalog.test.ts` (append 2 ids), the count
and totals in both test files (**+2 ids, +15✨** — compute the absolutes
from whatever is on the branch when you land: 44/550 at `2092dfc`, but
plan 015 Phase C adds +2 ids/+15✨ and plan 013 changes two building-target
fixtures, and the recommended order lands both BEFORE this plan), and the
max-save fixtures (`expeditionsCompleted: 10`). `reconcileAchievements`
needs no change (counter starts at 0 post-migration — dni-grania precedent:
the mechanic counts from deployment, deliberately).

**Verify**: `bun test src/achievements` → all pass.

#### Step 10: Full suite + DOX (mandatory)

**Verify first**: `bun test` (≈217 + ~20 new, 0 fail), `bun run typecheck`,
`bun run build`, `bun run check` → all clean. `git diff -- src/monsters/`
→ empty.

DOX pass:
- `src/game/CLAUDE.md` — Ownership: `expeditions.ts` (katalog + czyste
  helpery; wszystkie liczby strojenia w jednym pliku; duration/reward NIE
  persystowane — katalog jest punktem prawdy także dla wypraw w toku);
  Local Contracts: postęp = ukończone rundy, NIGDY zegar; ekonomia
  uzupełnia żołd (≤2.5 ✨/runda, rosnąca stawka z długością); Verification.
- `src/store/CLAUDE.md` — nowa wersja zapisu + migracja; akcje
  `sendExpedition`/`recallExpedition` (guardy: jedna naraz, nie przyjaciel);
  rozstrzygnięcie w finalize PO żołdzie + `expeditionReturn` na efemerycznym
  `RoundState`; `expeditionsCompleted` w licznikach; debug-ścieżki
  rozstrzygają, `simulateRoundOutcome` nietknięte; Verification.
- `src/CLAUDE.md` — CollectionScreen modal (sekcja wyprawy pod przyjacielem),
  VillageScreen (podróżnik nieobecny wśród wędrowców), Home (chip postępu),
  RoundSummary (karta powrotu + trop→wymarzony, nie nadpisuje ustawionego).
- `src/achievements/CLAUDE.md` — nowa liczba osiągnięć (policz przy
  lądowaniu); nowy licznik.
- `plans/README.md` — status row 017.

## Test plan

- `src/game/expeditions.test.ts` — catalog + economy invariants + progress
  boundary + resolve (trop never owned, null at full collection) (Step 2).
- `src/store/schema.test.ts` — migration, shape-lock +1 key (Step 3).
- `src/store/store.test.ts` — send/recall guards (companion!, one-at-a-time),
  resolution timing (round 2 vs 3), reward+cap, counter, debugFinishRound
  parity (Step 5).
- `src/achievements/*.test.ts` — +2 ids, +15✨ (absolutes at landing; Step 9).
- Manual visual: send from collection → chip on Home counts → traveler gone
  from village with the 🏕️ marker in its place (tap → progress) → return
  card in summary → trop sets dream (only when unset, no name shown).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck`, `bun run build`, `bun run check` all exit 0
- [ ] `bun test` exits 0; **zero previously-passing tests modified except**
      the explicitly listed ones (shape-lock +1 key, achievements
      tripwire/totals/fixtures)
- [ ] `src/game/expeditions.ts` exists;
      `grep -n "Math.random\|Date.now" src/game/expeditions.ts` → no matches
- [ ] `grep -rn "Date.now\|setTimeout\|setInterval" src/game/expeditions.ts` →
      no matches (postęp TYLKO rundami)
- [ ] `SAVE_VERSION` bumped by exactly 1 with a matching migration entry
- [ ] `grep -c "sendExpedition\|recallExpedition" src/store/store.ts` ≥ 2
- [ ] `git diff -- src/monsters/` → empty
- [ ] Visual pass reported: send → absence + 🏕️ marker → Home chip →
      return card (bez imienia znaleziska) → trop
- [ ] String banks marked `// PROPOZYCJE do dopracowania`
- [ ] DOX docs updated; `plans/README.md` row 017 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows any listed file changed since `2092dfc` and a
  "Current state" claim no longer holds — especially if plans 013/015 landed
  first and `SAVE_VERSION` moved (take the next number; if their changes
  conflict with the finalize branch, report before merging logic).
- You are tempted to add ANY wall-clock element (timestamps, "wraca za 2
  godziny", decay while away) — violates root rule 1. Full stop.
- The resolution changes wage amounts or an existing wage/economy test fails
  — the two income paths must be independent; diagnose, don't adjust old
  tests.
- Sending the companion turns out to be reachable through any UI path —
  the store guard is the source of truth; report if UI and guard disagree.
- The trop flow would overwrite an already-set `dreamMonsterId` — forbidden;
  the offer only appears when the dream slot is empty.
- `simulateRoundOutcome` seems to need modification — it must not; the store
  wraps it (Step 4). Report if that layering fails.

## Maintenance notes

- **Balance tuning**: all durations/rewards/trop chances live in
  `src/game/expeditions.ts`; tests assert ratios and ranges, not exact
  values. Cut levers in order if too generous: (1) halve `rewardIskierki`,
  (2) drop the trop from `wyprawa` (keep on `wielka`), (3) lengthen
  durations. Never add a time limit.
- The user finalizes all Polish copy — hand over the PROPOZYCJE list
  (expedition names/descriptions, send/recall/status/return strings) after
  landing; ids are stable so renames are free.
- Natural follow-ups deliberately excluded from v1: expedition-exclusive
  decorations or monster block (ids 76+, append-only), multiple simultaneous
  expeditions once the child has a big collection, expedition postcards in
  the monster passport (lore tie-in).
- Persisting only `typeId` (not duration/reward) means catalog retuning also
  affects in-flight expeditions — acceptable because rewards only ever
  arrive on completion; if a retune ever shortens a duration below an
  in-flight expedition's progress, it simply completes on the next round
  (no loss possible).
