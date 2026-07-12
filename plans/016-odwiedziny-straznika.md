# Plan 016: Odwiedziny u Strażnika — powtórka starych tabliczek jako historia

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2092dfc..HEAD -- src/game/adaptive.ts src/store/store.ts src/screens/HomeScreen.tsx src/screens/RoundScreen.tsx src/screens/RoundSummary.tsx src/components/Companion.tsx src/monsters/world.ts`
> If any of these changed since this plan was written, compare the "Current
> state" claims against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. Read the chain before
> editing: root `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`,
> `src/store/CLAUDE.md`, `src/monsters/CLAUDE.md` (read-only — guardians).
> This plan CHANGES contracts in `game/`, `store/` and `src/` — the DOX
> updates are Step 8 and they are mandatory.
>
> **Naming (user preference, binding)**: the user wordsmiths all player-facing
> Polish names himself. Every invitation/summary string in this plan is a
> **PROPOZYCJA**. Implement with the proposed strings and mark string banks
> with `// PROPOZYCJE do dopracowania` (pattern: `components/companionPhrases.ts`).

## Status

- **Priority**: P2 (pedagogy — turns the game's one "homework moment" into story)
- **Effort**: S–M (one phase; pure helpers + one store action + three UI touches)
- **Risk**: LOW (purely additive; **zero** `SaveState` fields, **zero** migrations —
  the only new round state is ephemeral)
- **Depends on**: plan 012 merged into the working branch (uses the wage/summary
  chip layout; base is `feat/012-wioska-budowanie`)
- **Category**: feature (pedagogika + świat)
- **Planned at**: commit `2092dfc`, 2026-07-12

## Why this matters

`needsMaintenance(facts, stage)` is the game's only "you should review" signal:
when the mean mastery of all OLDER unlocked tables drops below
`MAINTAIN_THRESHOLD` (0.5 — typically after a longer break), the next gate
locks up and the map shows a dry hint („poćwicz starsze tabliczki"). That is
the one place where the game currently *feels like homework*: the child is
told to grind, with no story and no warmth — exactly the moment the
warstwa-opiekuńcza philosophy ("przerwa = najcieplejsze powitanie") should be
strongest, because maintenance fires precisely after breaks.

This plan reframes review as **a visit to an old friend**. The world layer
already gives every stage a region and a guardian monster
(`REGIONS[stage].guardianId`, `monsters/world.ts`). When maintenance is
needed, Home shows a warm invitation: „Strażnik Trójkątnej Piramidy zaprasza
cię w odwiedziny! 🏰". Tapping it starts a special round drawn from the
decayed facts; the region's guardian cheers from the corner instead of the
companion; the summary has the guardian say thank you with a small spark
bonus. Same mechanics, same mastery math — different story. Review becomes
the *reason to open the game after a break*, not the punishment for one.

Design rules (binding):

1. **An offer, never an obligation.** The invitation is one tappable card;
   normal rounds stay available and identical; ignoring the card costs
   nothing; there is no badge, counter, or nag. The card disappears by
   itself when mastery recovers (self-truing, like the village badge).
2. **No save changes.** The visit is a property of a *round in progress* —
   ephemeral `RoundState` only. No `SaveState` field, no migration.
3. **Same pedagogy, new frame.** The visit round reuses the existing
   weighted-selection math (`weightOf`-style weakest-first) over the same
   fact pools; mastery/stars/eggs/wage all behave exactly as in a normal
   round. The only additions are presentation and a small thank-you bonus.
4. **Visit rounds are pinned to `mode: "mult"`** — regardless of the Home
   ×/÷ toggle. The invitation says „Odśwież starą tabliczkę ×{factor}"; if
   the round inherited a ÷ toggle, the child would read „×5" and get
   `45 ÷ 5` — a copy/experience mismatch she cannot reconcile. Pinning keeps
   the invitation truthful (mode-aware copy was considered and rejected as
   the more complex option).

## Current state

Verified at `2092dfc` on branch `feat/012-wioska-budowanie` (suite green:
`bun test` → 217 pass / 0 fail):

- `src/game/adaptive.ts` — `MAINTAIN_THRESHOLD = 0.5`;
  `needsMaintenance(facts, stage)` = older pool non-empty AND
  `meanMastery(facts, olderFacts(stage)) < MAINTAIN_THRESHOLD`, where
  `olderFacts(stage)` = `unlockedFacts(stage - 1)` (ALL older tables as one
  pool — the signal is aggregate, not per-table). Private helpers this plan
  will reuse from inside the same module: `meanMastery`, `sampleDistinct`
  (weighted draw without repeats), `shuffle`, `weightOf` (weakest-first
  weighting, `(1-m)² + 0.05`, ×2.5 for `attempts === 0`). `stageFacts(s)` =
  the table introduced at stage `s` (stage 0 → the full 10-fact base set;
  stages 1+ → 5+ facts featuring the new factor). Precedent for a
  pre-planned round: `isIntroRound` + `introRoundPlan` (returns `total`
  distinct facts; store consumes them positionally via `RoundState.plan` /
  `planPos`).
- `src/monsters/world.ts` — `REGIONS[stage]` (7 regions, index = stage) with
  `name`, `emoji`, `factor`, `guardianId` (common/rare, never division-only,
  `regionOf(guardianId) === stage`). Purely presentational; MapScreen already
  renders guardians **as silhouettes when unowned** — the precedent this plan
  follows for the cheer guardian.
- `src/store/store.ts` — `startRound()` builds the full `RoundState`
  (ephemeral, not persisted): `mode`, `introFactor`, `plan`, `planPos`,
  `index`, `total`, `question`, `phase`, `answer`, `stars`, `lastStars`,
  `startedAt`, `asked`, `requeues`, `shakeNonce`, `eggsCreated`,
  `unlockedThisRound`, `wageEarned`. The finalize branch of `nextQuestion`
  pays the wage (`roundWage`, cap `ISKIERKI_CAP` = 999) and stores it in
  `round.wageEarned`; `firstRoundToday` is computed BEFORE `bumpDaysPlayed`.
- `src/components/Companion.tsx` — `CheerCompanion({ phase, lastStars, size })`
  reads `companionId` from the store internally and **returns `null` when no
  companion is owned/selected**; rendered by `RoundScreen` bottom-left
  (`pointer-events-none`). To host a guardian it needs a small override prop
  (Step 4) — today there is no way to render it for an arbitrary monster.
- `src/screens/HomeScreen.tsx` — card/badge patterns established (gniazdo
  card, „✨ stać cię na budowę!" badge); imports from `game/facts` and
  `game/village` already exist. `unlockedStage` IS already selected
  (`HomeScreen.tsx:20` — drives the factor chips and `hasNewGate`); only
  `facts` is missing — the invitation card adds that one selector.
- `src/screens/MapScreen.tsx` — shows the dry maintenance hint when
  `needsMaintenance` (kept as-is; the map remains the "why is my gate stuck"
  explainer).
- `src/screens/RoundSummary.tsx` — wage chip `+N ✨ → cel` under the star
  meter (plan 012); the guardian thank-you banner slots above the buttons,
  alongside the existing „Nowa brama otwarta!" banner pattern.
- Deploy gates on `bun test`; `bun run check` (biome) is the mandatory
  closeout; UI Polish-only; activation on `click`; touch targets ≥ 64 px.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bun run typecheck` | exit 0 |
| Full suite | `bun test` | all pass (217 + new) |
| One file | `bun test src/game/adaptive.test.ts` | that file passes |
| Lint/format | `bun run check` | exit 0 |
| Build | `bun run build` | exit 0 |
| Visual check | dev server + puppeteer-core recipe in root `CLAUDE.md` | screenshots |

## Scope

**In scope** (create/modify only):
- `src/game/adaptive.ts` — pure helpers `visitStage`, `visitRoundPlan`,
  constant `VISIT_BONUS`
- `src/game/adaptive.test.ts` — tests for both helpers
- `src/store/store.ts` — action `startVisitRound()`, ephemeral
  `RoundState.visitStage`, visit bonus in the finalize branch
- `src/store/store.test.ts` — characterization tests
- `src/components/Companion.tsx` — `CheerCompanion` override prop
  (guardian id + silhouette flag)
- `src/screens/HomeScreen.tsx` — invitation card
- `src/screens/RoundScreen.tsx` — pass guardian to `CheerCompanion`
- `src/screens/RoundSummary.tsx` — guardian thank-you banner + bonus chip
- `CLAUDE.md` chain per Step 8; `plans/README.md` — status row

**Out of scope** (do NOT touch):
- `src/store/schema.ts` / `schema.test.ts` — **no save change, no migration**;
  needing one is a STOP condition.
- `src/monsters/**` — frozen; `REGIONS`/guardians are read-only inputs.
- The maintenance MATH (`needsMaintenance`, `MAINTAIN_THRESHOLD`,
  `stageProgress`, decay) — this plan reframes, never retunes.
- The map hint — stays as the technical explainer for the stuck gate.
- Any nagging mechanism (badge counters, reminders, streaks) — rejected by
  design rule 1.
- `simulateRoundOutcome` — debug rounds don't pay the visit bonus (see
  Maintenance notes).

## Git workflow

- Branch: `feat/016-odwiedziny-straznika` (cut from `feat/012-wioska-budowanie`
  or `main` after 012 merges — whichever the operator designates).
- Commit per logical group; message style matches `git log` (short,
  lowercase, e.g. `feat(visit): guardian review rounds`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Pure helpers in `src/game/adaptive.ts`

Add below `needsMaintenance` (reusing the module's private `meanMastery`,
`sampleDistinct`, `shuffle`):

```ts
// Iskierki podziękowania od Strażnika za odwiedziny (koniec rundy-wizyty).
// Celowo małe: wizyty odpalają się rzadko (tylko przy podupadłych tabliczkach,
// zwykle po przerwie), a nagradzają dokładnie to zachowanie, na którym nam
// zależy — powtórkę. Strojenie tutaj.
export const VISIT_BONUS = 2

// Etap do odwiedzenia: NAJSŁABSZA (najniższa średnia mastery) już odblokowana
// starsza tabliczka — null, gdy utrzymanie nie jest potrzebne. To ona wybiera
// region/Strażnika zaproszenia; needsMaintenance pozostaje sygnałem zbiorczym.
export function visitStage(
	facts: Partial<Record<FactKey, FactStats>>,
	stage: number,
): number | null {
	if (!needsMaintenance(facts, stage)) return null
	let weakest: number | null = null
	let weakestMean = Number.POSITIVE_INFINITY
	for (let s = 0; s < stage; s++) {
		const mean = meanMastery(facts, stageFacts(s))
		if (mean < weakestMean) {
			weakestMean = mean
			weakest = s
		}
	}
	return weakest
}

// Plan rundy-wizyty (lustro introRoundPlan): połowa (zaokrąglona w górę)
// z odwiedzanej tabliczki (stageFacts(visited)), reszta z pozostałych
// starszych działań — wszędzie waga „słabsze częściej" (sampleDistinct).
// Zwraca `total` różnych działań w losowej kolejności; gdy pula odwiedzanej
// tabliczki jest mniejsza niż połowa, resztę dobiera z pozostałych starszych.
export function visitRoundPlan(
	facts: Partial<Record<FactKey, FactStats>>,
	visited: number,
	stage: number,
	total: number,
	rand: () => number,
): Fact[] {
	const focus = sampleDistinct(
		stageFacts(visited),
		facts,
		Math.ceil(total / 2),
		rand,
	)
	const focusKeys = new Set(focus.map((f) => f.key))
	const rest = sampleDistinct(
		olderFacts(stage).filter((f) => !focusKeys.has(f.key)),
		facts,
		total - focus.length,
		rand,
	)
	return shuffle([...focus, ...rest], rand)
}
```

Note `visitStage` iterates `s < stage` — only already-unlocked older tables
(mirrors `olderFacts`); stage 0 (base set) is a valid visit target and maps
to `REGIONS[0]` („Wioska Startowa").

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Tests in `src/game/adaptive.test.ts`

Follow the file's conventions (first line `/// <reference types="bun-types" />`,
Polish names, `mulberry32` for rand). Build fact records with the file's
existing helpers/patterns. Assert:

- `visitStage`: fresh save → `null` (no older facts); stage 1 with old base
  set at mastery 0.9 → `null` (no maintenance); stage 2 with base set at 0.2
  and stage-1 table at 0.4 (aggregate mean < 0.5) → returns the LOWEST-mean
  stage (0 here); swap the means → returns 1.
- `visitRoundPlan(facts, 0, 2, 10, rand)`: returns 10 DISTINCT facts; at
  least `ceil(10/2)` of them from `stageFacts(0)`; every fact belongs to
  `unlockedFacts(1)` (the older pool for stage 2); deterministic under a
  seeded rand (two calls with `mulberry32(7)` equal).
- `VISIT_BONUS` > 0 (tuning-resistant, mirrors the economy-invariant style).

**Verify**: `bun test src/game/adaptive.test.ts` → all pass.

### Step 3: Store — `startVisitRound()` + bonus (`src/store/store.ts`)

- `RoundState` gains `visitStage: number | null` (**ephemeral** — RoundState
  is never persisted, NO migration). `startRound()` sets it to `null`.
- New action `startVisitRound()` — a sibling of `startRound()`, thin
  coordinator: compute `visited = visitStage(state.facts, state.unlockedStage)`;
  if `null`, fall through to plain `startRound()` (defensive — the card
  should not render then); else build the round exactly like `startRound`
  but with `plan = visitRoundPlan(state.facts, visited, stage,
  QUESTIONS_PER_ROUND, Math.random).map(f => f.key)`, `planPos: 1`,
  `introFactor: null`, `visitStage: visited`, first question =
  `plan[0]`, and **`mode: "mult"` pinned** (design rule 4 — ignore the
  ephemeral Home toggle; the invitation promises „tabliczka ×N" and the
  questions must match; the toggle itself is left untouched for later
  normal rounds). Requeues/everything else identical to a normal round —
  the plan is consumed positionally by the existing `nextQuestion` logic
  (no changes needed there for selection).
- Finalize branch of `nextQuestion`: after the wage,
  ```ts
  const visitBonus = round.visitStage !== null ? VISIT_BONUS : 0
  iskierki: Math.min(ISKIERKI_CAP, state.iskierki + wageEarned + visitBonus),
  ```
  Keep `wageEarned` = pure wage (the summary shows the guardian bonus as its
  own line — clearer story than inflating the wage chip).

**Verify**: `bun run typecheck` → exit 0; `bun test` → existing 217 still
green.

### Step 4: `CheerCompanion` override (`src/components/Companion.tsx`)

Add optional props so the guardian can host the round:

```ts
export function CheerCompanion({
	phase,
	lastStars,
	size = 80,
	overrideId,          // Strażnik rundy-wizyty; undefined = przyjaciel jak dotąd
	overrideSilhouette,  // true gdy strażnik nieposiadany (precedens: mapa)
}: { ... })
```

- When `overrideId !== undefined`: render that id instead of `companionId`,
  skip the owned-check, and pass `className="monster-silhouette"` to
  `MonsterStage` when `overrideSilhouette` (unowned guardian = mysterious
  host, same rule as MapScreen; owned = full color). Reactions (cheer/nod)
  unchanged.
- When `overrideId === undefined`: behavior byte-identical to today
  (companion or `null`).

**Verify**: `bun run typecheck` → exit 0.

### Step 5: RoundScreen wiring

In `src/screens/RoundScreen.tsx`, compute the guardian for a visit round and
pass it down (read `ownedMonsters` for the silhouette flag):

```tsx
const guardianId =
	round.visitStage !== null ? REGIONS[round.visitStage]?.guardianId : undefined
...
<CheerCompanion
	phase={round.phase}
	lastStars={round.lastStars}
	overrideId={guardianId}
	overrideSilhouette={guardianId !== undefined && !(guardianId in ownedMonsters)}
/>
```

Optionally add a small region chip next to „Pytanie X/Y" (PROPOZYCJA:
`{emoji} Odwiedziny: {region.name}`) — keep it one small pill, the question
card stays the focus.

**Verify**: typecheck; visual pass later (Step 7).

### Step 6: Home invitation + summary thank-you

- `HomeScreen.tsx`: select `facts` (`unlockedStage` is already selected),
  compute `visited = visitStage(facts, unlockedStage)`. When non-null,
  render a tappable invitation card (between „Graj!" and the gniazdo card;
  white/80 rounded-3xl like the gniazdo row): guardian mini-art (`MonsterSvg`
  size ~44, silhouette if unowned) + PROPOZYCJA:
  „Strażnik {REGIONS[visited].name} zaprasza cię w odwiedziny! {emoji}" +
  sub-line „Odśwież starą tabliczkę ×{factor}". **When the guardian is
  unowned (silhouette)**, add a second sub-line explaining the mystery so
  the shadow doesn't read as broken art (PROPOZYCJA: „Poznasz go, gdy go
  wyklujesz!") — the map precedent exists, but this is a NEW context for the
  silhouette convention. Tap → `startVisitRound()` (which already sets
  `screen: "round"`). No badge, no counter — the card simply is or isn't
  there.
- **Shared-surface governance (Home)**: this invitation is a "proactive
  card" under the rule recorded in `plans/README.md` (sekcja
  „Shared-surface governance"): **max ONE proactive card on Home at a
  time, and the guardian invitation WINS** when present (plan 017's
  expedition chip yields/moves below the gniazdo row). If 017 landed
  first, wire the precedence here; if not, this plan simply renders the
  card and 017 must respect it.
- `RoundSummary.tsx`: when `round.visitStage !== null`, render a banner in
  the „Nowa brama otwarta!" style above the buttons: guardian art +
  PROPOZYCJA „Strażnik dziękuje za odwiedziny! 💛 +{VISIT_BONUS} ✨". The
  wage chip stays unchanged (bonus displayed here, not folded into the chip).

**Verify**: `bun run typecheck` → exit 0.

### Step 7: Store tests + visual pass

`src/store/store.test.ts` (reuse `game()`, `answer()`, `suppressAchievements`;
seed decayed facts via `useGame.setState({ facts: ... })` with stage-0 facts
at low mastery and `unlockedStage: 2`):

- `startVisitRound`: `round.visitStage` equals the weakest stage;
  `round.plan` has 10 keys; the first question's key is `plan[0]`;
  `introFactor === null`.
- Mode pinning: `setMode("div")` then `startVisitRound()` →
  `round.mode === "mult"` (design rule 4; the ephemeral toggle itself stays
  `"div"` for later normal rounds).
- Plain `startRound` → `round.visitStage === null`.
- Finalize: full clean visit round pays `wage + VISIT_BONUS` (assert exact
  delta with achievements suppressed and the egg-rainbow caveat handled as
  in existing wage tests); a normal round pays wage only.
- `startVisitRound` with healthy facts (no maintenance) → behaves like
  `startRound` (visitStage null).
- Cap: iskierki 998 + visit round → 999.

Visual pass (puppeteer-core recipe in root `CLAUDE.md`): seed a save with
`unlockedStage: 2` and decayed stage-0 facts → Home shows the invitation
card; tap → round with guardian in the corner (and silhouette variant when
guardian unowned); finish via debug buttons is NOT sufficient for the bonus
(bypasses finalize) — play a short round or assert via tests; summary shows
the thank-you banner. Screenshot Home + round + summary.

**Verify**: `bun test` → all pass (expect ≈ 217 + 10); screenshots reported.

### Step 8: DOX pass (mandatory)

- `src/game/CLAUDE.md` — Ownership (`adaptive.ts`): add `visitStage`,
  `visitRoundPlan`, `VISIT_BONUS`; Local Contracts: the visit-round rules
  (offer-only, weakest older stage picks the region, plan mirrors
  introRoundPlan, bonus size + rationale); Verification: new test coverage.
- `src/store/CLAUDE.md` — `startVisitRound` (thin coordinator), ephemeral
  `RoundState.visitStage` (no migration), visit bonus in finalize (separate
  from `wageEarned`), note that debug finish paths skip the bonus.
- `src/CLAUDE.md` — Home invitation card, `CheerCompanion` override props
  (guardian + silhouette precedent from the map), RoundScreen region pill,
  RoundSummary thank-you banner.
- `src/monsters/CLAUDE.md` — likely NO edit (guardians consumed read-only);
  report "left unchanged" if so.
- `plans/README.md` — status row for 016.

**Verify**: `bun run check` → exit 0; `bun run build` → exit 0.

## Test plan

- `adaptive.test.ts` — `visitStage` (null paths, weakest-stage selection),
  `visitRoundPlan` (distinctness, focus share, pool membership, determinism),
  `VISIT_BONUS > 0` (Step 2).
- `store.test.ts` — visit round lifecycle: plan consumption, `visitStage`
  flag, mode pinned to `"mult"` mimo przełącznika ÷, wage+bonus payout vs
  normal round, healthy-facts fallback, cap (Step 7).
- Manual visual: invitation card appears/disappears with mastery state;
  guardian cheers (color when owned, silhouette when not); summary banner.
- Regression guard: all 217 existing tests unchanged and green — especially
  the wage tests (the bonus must not leak into normal rounds).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck`, `bun run build`, `bun run check` all exit 0
- [ ] `bun test` exits 0; count ≥ 225; zero previously-passing tests modified
- [ ] `grep -n "export function visitStage\|export function visitRoundPlan\|VISIT_BONUS" src/game/adaptive.ts` → 3 matches
- [ ] `grep -c "startVisitRound" src/store/store.ts` ≥ 2 (typ + akcja)
- [ ] THIS plan's branch introduces no changes to the save schema or the
      frozen catalog: `git diff $BASE..HEAD -- src/store/schema.ts src/monsters/`
      → empty, where `$BASE` is the commit this plan's branch was cut from
      (record it at branch creation, e.g. `BASE=$(git rev-parse HEAD)` before
      the first commit; do NOT anchor at `2092dfc` — other plans may have
      legitimately changed the schema by the time this one runs)
- [ ] `grep -n "visitStage" src/store/schema.ts` → no matches (ephemeral only)
- [ ] Visual pass done and reported (Home card, guardian cheer both variants,
      summary banner)
- [ ] DOX docs updated per Step 8; player copy marked PROPOZYCJE
- [ ] `plans/README.md` status row for 016 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows any listed file changed since `2092dfc` and a
  "Current state" claim no longer holds.
- You find yourself needing a `SaveState` field or migration — the design is
  ephemeral-only; a persistence need means the design drifted. Full stop.
- You are tempted to add ANY pressure mechanic (badge with a count, reminder,
  „strażnik czeka już N dni", locking normal rounds) — violates design rule 1
  and the warstwa-opiekuńcza contract. Full stop.
- `CheerCompanion` override breaks the no-companion path (component must
  still return `null` when neither companion nor override is present).
- The visit bonus leaks into normal rounds (a wage test fails) — diagnose
  the finalize branch; do not "fix" the old test.
- `sampleDistinct`/`meanMastery`/`shuffle` turn out to be unusable from the
  new helpers without exporting them — exporting module-private helpers is
  fine, but report if their behavior needs CHANGES.

## Maintenance notes

- **Debug paths skip the bonus** (`debugFinishRound`/`debugSimulateRound`
  bypass the finalize wage+bonus block or pay wage only via the sim). This is
  a documented, accepted simplification — visit rounds are a real-play
  feature; do not extend `simulateRoundOutcome` for it unless the sim starts
  being used to balance visit economy.
- `VISIT_BONUS` and the focus share (`ceil(total/2)`) are the tuning knobs,
  both in `adaptive.ts`. If visits feel too samey, the lever is the focus
  share, not new mechanics.
- Natural follow-ups deliberately excluded: a per-region "visit completed"
  keepsake (would need persistence), guardian dialogue banks (companionPhrases
  pattern — cheap to add later once the user wordsmiths copy), and counting
  visits toward an achievement (needs a persisted counter + migration; decide
  after observing whether visits actually happen in real play).
- After this lands, hand the user the PROPOZYCJE list: invitation card copy,
  region pill, thank-you banner.
