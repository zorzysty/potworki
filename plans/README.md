# Implementation Plans

Plans are executable work orders: each is self-contained (context, steps,
done criteria, STOP conditions). Executors read the plan fully before
starting, honor its STOP conditions, and update their row here when done.

**This repo uses a binding `CLAUDE.md` ("DOX") hierarchy.** Every plan's
executor must read the root `CLAUDE.md` plus the chain for any path they
touch ("Read Before Editing"), and update the nearest owning `CLAUDE.md`
when a change alters a contract.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 012  | Wioska Budowniczych — budynki i dekoracje za iskierki (Heroes 3) | P1 | L | — | DONE — branch `feat/012-wioska-budowanie` (217 tests) |
| 013  | Sklepik — kosmetyka per-potworek (kapelusze/aury przez sloty MonsterStage) | P2 | L | 012 | DONE — branch `feat/012-wioska-budowanie` (276 tests; SAVE_VERSION 10→11, 7. budynek sklepik, katalog 12 kosmetyk, garderoba) |
| 014  | Ramki kart kolekcjonerskich (przedmioty sklepiku, slot "frame") | P3 | S | 013 | DONE — branch `feat/012-wioska-budowanie` (279 tests; katalog 12→17, slot "frame", ramka na kontenerze modala karty, zero zmian zapisu) |
| 015  | Tryb „brakujący czynnik" (`7 × _ = 42`) — trzeci widok tych samych faktów | P2 | L (M bez fazy C) | — | DONE — branch `feat/012-wioska-budowanie` (254 tests; fazy A+B+C w całości, SAVE_VERSION 9→10, potworki 76–79, osiągnięcia 44→46) |
| 016  | Odwiedziny Strażnika — fabularne rundy powtórkowe przy `needsMaintenance` | P2 | S–M | — | DONE — branch `feat/012-wioska-budowanie` (231 tests) |
| 017  | Wyprawy potworków — postęp w RUNDACH (nigdy zegar), nagrody ✨ | P3 | M | — | DONE — branch `feat/012-wioska-budowanie` (307 tests; SAVE_VERSION 11→12, katalog 3 typów wypraw, osiągnięcia 46→48) |
| 018  | PWA/offline — instalacja na tablecie, gra bez sieci | P2 | S | — | DONE — branch `feat/012-wioska-budowanie` (217 tests; fallback `--app-vh` zastosowany — patrz plan, Step 5) |
| 019  | Przegląd PROPOZYCJI — nazewnicza runda maintainera (012–018) | P2 | S | 012–018 | DONE 2026-07-25 — inwentarz w `plans/019-inwentarz.md`, maintainer **zatwierdził wszystko bez zmian**; znaczniki `PROPOZYCJE` zdjęte z `src/` i `vite.config.ts`; sam proces oznaczania wycofany 2026-07-25 — nowe teksty wchodzą bez znaczników |
| 020  | Symetryczny guard przyjaciel ↔ podróżnik (`setCompanion` podczas wyprawy) | P1 | S | — | DONE — worktree branch `improve/plans-020-027` @ `090133a` (reviewed; 312 tests) |
| 021  | Pauza wstrzymuje auto-przejście do następnego pytania (timer „correct") | P2 | S | — | DONE — worktree branch `improve/plans-020-027` @ `d52073a` (reviewed; browser-verified incl. mutation check) |
| 022  | Brama Biome w CI + skrypt `verify` + sprostowanie 48→53 osiągnięć w DOX | P2 | S | — | DONE — worktree branch `improve/plans-020-027` @ `7f9ea07` (reviewed: scope clean, verify green) |
| 023  | Test potrójnego capu portfela + test `markGatesCelebrated` + Verification v14 w DOX | P2 | S | — | DONE — worktree branch `improve/plans-020-027` @ `25a2cc1` (reviewed; 314 tests; mutation-checked at 980) |
| 024  | Wioska — memoizacja wędrowców (toggle UI nie rekonsyliuje 26 SVG) | P3 | S | — | DONE — worktree branch `improve/plans-020-027` @ `1637a63` (reviewed; browser-verified: positions stable, cheer 3/3, tap reactions OK) |
| 025  | Wspólny helper finalizacji rundy + fix licznika wizyt w `debugFinishRound` | P2 | M | 023 (test net), po 020 | DONE — worktree branch `improve/plans-020-027` @ `bffa3e0` (315 testów; nowy test debug-path mutation-checked; doc-as-written: `debugFinishRound` NIE liczy rund-wizyt) |
| 026  | Ekstrakcja karty potworka z CollectionScreen (`MonsterCard`/`MonsterCardLocked`) | P3 | M | 020 | DONE — worktree branch `improve/plans-020-027` @ `8334222` (DOM zweryfikowany jako identyczny w headless chromium: 4 karty, w tym posiadany w złotej ramce) |
| 027  | Wspólny komponent paska celu budowy (VillageScreen + RoundSummary) | P3 | S | — (po 024) | DONE — worktree branch `improve/plans-020-027` @ `fbaca9c` (`components/GoalProgressBar.tsx`; DOM identyczny w obu miejscach) |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale).

## Audit 2026-07-12 (branch `feat/012-wioska-budowanie` @ `a0d75aa`) — plans 020–024

Full standard-depth audit of the never-audited plan-012–018 code (all nine
categories; baseline green: 311 tests, typecheck, `bun audit`, `biome ci`
all clean). Security: clean (no injection sinks, least-privilege CI, no
secrets). Initially run non-interactively — plans 020–024 covered the **top 5
findings by leverage** (skill default); on the maintainer's follow-up
("add 7–9, implement all") the remaining vetted debt findings graduated to
plans 025–027:

- 025 ← triplicated round-finalization sequence (the drift it predicted
  already manifested once: `debugFinishRound` bumps `visitRoundsCompleted`
  against its own comment and the store DOX contract — 025 fixes it).
- 026 ← monster-card modal as a ~250-line inline block in
  `CollectionScreen.tsx`.
- 027 ← duplicated goal-progress-bar markup (VillageScreen ≈ RoundSummary,
  already cosmetically drifted).

## Coordination notes (020–027)

All eight are save-shape-neutral (zero `SAVE_VERSION` changes). Execution
order (binding for a sequential run — later plans' drift checks anchor at
`a0d75aa` and explicitly whitelist earlier plans' footprints):

**022 → 020 → 023 → 021 → 024 → 025 → 026 → 027**

- 022 first: daje `bun run verify` pozostałym executorom.
- 020 przed 023/025/026 (dotyka `store.ts` + friend button w
  `CollectionScreen`).
- 023 przed 025 (potrójny cap = siatka bezpieczeństwa refaktoru).
- 024 przed 027 (oba w `VillageScreen`, rozłączne linie).

### Stan wykonania — ZMERGOWANE do `main` 2026-07-25 (`75cc704`)

Wykonanie w izolowanym worktree `.claude/worktrees/improve-exec`, branch
**`improve/plans-020-027`** (bazowany na `a0d75aa` = ówczesny `main`).
Wszystkie osiem planów zrobione, w porządku wykonania: 022 (`7f9ea07`) →
020 (`090133a`) → 023 (`25a2cc1`) → 021 (`d52073a`) → 024 (`1637a63`) →
025 (`bffa3e0`) → 026 (`8334222`) → 027 (`fbaca9c`). Po każdym `bun run
verify` zielony — końcowo **315 testów**, typecheck 0, biome czysty.
Zapis (`SAVE_VERSION`) nietknięty przez cały ciąg.

Weryfikacja behawioralna w headless chromium (`/usr/bin/chromium` +
puppeteer-core; ścieżka playwrighta z roota `CLAUDE.md` w tym środowisku
już nie istnieje): 021 i 024 wcześniej, a dla refaktorów prezentacyjnych
026/027 — **porównanie DOM przed/po** (stash dance w worktree), zero
różnic na 4 kartach potworka (w tym posiadany w złotej ramce z kapeluszem)
oraz na obu paskach celu budowy.

- **025**: doc-as-written — `debugFinishRound` przestał liczyć
  `visitRoundsCompleted` (bumpował wbrew własnemu komentarzowi i
  kontraktowi w `src/store/CLAUDE.md`). Maintainer może zawetować w
  review: alternatywa to zostawić bump i zmienić komentarz + DOX, jeśli
  chce testowalności osiągnięć wizyt z ekranu debug. Nowy test ścieżki
  debug mutation-checked (przywrócenie bumpa = test czerwony).
- **Zmergowane** (fast-forward) do `main` @ `75cc704`; worktree
  `.claude/worktrees/improve-exec` usunięty. Poza planami weszły w tej samej
  serii: reset scrolla przy zmianie ekranu, progresja cen Jajka Życzeń
  (sufit dopłaty 100 ✨), guard pauzy na fizycznej klawiaturze, poprawki z
  `/code-review` i przebieg `/simplify` (m.in. `villageRoster` wyniesiony do
  `src/game/village.ts`). Stan na `main`: 335 testów, `bun run verify`
  zielony, `SAVE_VERSION` nietknięty (14). **Niewypchnięte** — deploy na
  GitHub Pages odpali się dopiero po `git push`.
- Uwaga na przyszłe worktree pod `.claude/worktrees/`: biome przerywa z
  „nested root configuration", bo widzi drugi `biome.json` pod rootem —
  `bun run verify` w głównym checkoucie działa dopiero po usunięciu
  worktree (albo po dopisaniu `.claude` do ignorów w `biome.json`).
- Uwaga: w stashu repo leży PRZEDsesyjny `stash@{0} „rescued: workflow
  plan-018 WIP…"` — nietknięty, należy do maintainera.

## Dependency & coordination notes (013–018)

- **All of 013–018 assume plan 012 is on the branch/`main`** (drift checks anchor
  at `2092dfc`).
- **`SAVE_VERSION` collision**: 013 (`cosmetics`), 017 (`expedition` +
  counter) and 015 Phase C (`gapCorrect` counter) each add `SaveState`
  fields. Each plan deliberately says "migration number = next available at
  implementation time" — **land them sequentially** (any order) and let each
  take the next version; never develop two save-touching plans in parallel
  branches without rebasing the migration slot. In the recommended order:
  015-C → v10, 013 → v11, 017 → v12.
- **Achievement-count collision**: 015 Phase C (+2 ids) and 017 (+2 ids)
  both append to the frozen-id tripwire and both plans state their numbers
  RELATIVELY (+2 ids / +N✨; absolutes computed at landing). 013 adds no
  achievements but changes the TARGET of `wioska-w-rozkwicie`/
  `wielki-budowniczy` (7th building; 013 handles the test fallout itself).
- **014 hard-depends on 013** (save shape `cosmetics.owned`/`equipped`, shop
  UI, tier gating) and adds no save version of its own; 014 extends the
  `CosmeticSlot` union with `"frame"` and bumps 013's catalog count/total
  tests (12→17 items, range [300,450]→[430,580]) — its executor verifies
  013's landed symbols and STOPs on mismatch.
- **016 and 018 are fully independent** (zero save changes; 018's only
  `src/` touch is a safe-area CSS block in `styles.css`) — safe to do
  anytime, in parallel with anything.
- Recommended sequence: **018 → 016 → 015 (całość, fazy A→B→C) → 013 →
  014 → 017** (infra first, then pedagogy, then the economy arc; the
  save-touching trio lands one at a time, wszystkie liczby względne).

## Shared-surface governance (013–018 — binding for executors)

Two surfaces are edited by multiple plans; whoever lands later must respect
what's already there, in this fixed composition:

- **Modal posiadanego potworka (CollectionScreen)** — kolejność sekcji:
  przycisk przyjaciela → sekcja „Ubierz 🎩" (ZWIJANA; garderoba 013 +
  wybór ramki 014) → sekcja „Wyprawa 🎒" (ZWIJANA; 017). Karta już dziś jest
  długa (paszport + strefy) — nowe sekcje zawsze zwijane, nigdy rozwinięte
  domyślnie.
- **Home — zasada „maks jedna proaktywna karta"**: karta-zaproszenie
  Strażnika (016) ma pierwszeństwo, gdy obecna; chip postępu wyprawy (017)
  siedzi POD gniazdem i ustępuje zaproszeniu. Przycisk „Graj!" nigdy nie
  spada niżej przez nowe elementy proaktywne.

## Design decisions (maintainer, 2026-07-12) — executors follow these

- **013**: cel i badge „stać cię!" IGNORUJĄ kosmetyki (sklepik się odkrywa,
  nie wypycha) — jak w planie; `currentGoal` bez zmian sygnatury.
- **015**: potworki tylko-luka (ids 76–79) **wchodzą do v1** — faza C jest w
  zakresie, nie opcjonalna (severability = tylko możliwość wycofania).
  Token trybu w kodzie: `"gap"`.
- **016**: bonus strażnika (+2✨) jako OSOBNA linia w podsumowaniu — chip
  żołdu zostaje czysty; jak w planie.
- **017**: pojęcie „tropu" wycofane 2026-09-05 — wyprawa przynosi od razu
  NOWEGO potworka (szansa dawnego tropu), niezależnie od wymarzonego; powrót
  = pełnoekranowy splash nad podsumowaniem, chip na Home → ekran wyprawy.

## Archive

Plans 001–011 (two audit passes 2026-06-14 + the world/lore feature) are all
DONE and merged to `main`; their files were removed 2026-07-12 — full text in
git history (`git log --diff-filter=D -- plans/`). Net result: green build +
CI test gate, 180-test suite (frozen-catalog signature guard, store/round
machine, migration chain v1→v8, achievements), domain logic extracted from
the store into `src/game/`, world/lore layer (regions, guardians, passport).

## Findings considered and rejected (do not re-litigate)

Condensed from the 2026-06 audits; full rationale in git history of this file:

- **Memoizing MapScreen/CollectionScreen computations** — not worth it at
  this scale (≤76 items, pure math, screens unmounted during rounds).
- **CI dependency cache + SHA-pinned actions** — low value for a static site.
- **esbuild advisory via vite** — resolved 2026-06-14 by vite 7→8 upgrade;
  `bun audit` clean.
- **`safeStorage` corrupt-JSON crash / missing typecheck gate / div-by-zero
  in `shouldUnlockNextStage`** — all misreads; verified safe.
- **Test for the play-again button** — it only re-invokes the exhaustively
  tested `startRound()`.

From the 2026-07-12 audit:

- **Shared `spend()` helper for buildVillage/buyDecoration/buyCosmetic/
  buyWishEgg** — the guard+deduct+checkAchievements envelope repeats 4×,
  but the guards genuinely diverge (tier check, max-level, dedupe);
  extracting only the 3-line envelope doesn't pay for itself. Revisit only
  if a cross-cutting change (e.g. "coins spent" counter) actually lands.
- **Pre-commit hooks** — low value for a single-maintainer repo once the
  CI Biome gate (plan 022) exists.
- **React component tests** — zero exist by documented strategy (pure
  logic tested, UI verified via `?debug` + puppeteer); re-confirmed as the
  right tradeoff given the clean logic/UI split.

## Direction findings (not planned — maintainer's call)

Refreshed by the 2026-07-12 audit; ordered by (grounding × payoff)/effort:

- **`background` cosmetic slot ("tła") — DONE 2026-09-01:** 4 backgrounds in
  `cosmetics.ts`, `EquippedBackground` on the collection card and the Home
  companion and (statically) the collection tiles; village deliberately without.
- **Reward-economy validation — DONE:** static findings in
  [`plans/028-analiza-ekonomii.md`](028-analiza-ekonomii.md) (2026-07-25);
  Monte Carlo simulation + retune shipped 2026-09-01 (egg-threshold cap, soft
  quality curve, per-mode legendary pity, dup × quality, backgrounds). Fresh
  post-retune numbers and the remaining maintainer decisions (rainbow gate,
  late-game iskierki sink / mode-stamped wish egg) live in
  [`plans/029-ekonomia-po-retuningu.md`](029-ekonomia-po-retuningu.md).
  Third pass (2026-09-05) simulates whole rounds with the real engine on a
  day calendar: report
  [`plans/030-analiza-ekonomii-2026-09.html`](030-analiza-ekonomii-2026-09.html),
  reproducible via `plans/ekonomia.sim.ts` (imports `src/`;
  rerun after any retune). Recommendations R1, R2, R4, R5 shipped the same day
  (`mastered` high-water flag + SAVE_VERSION 18, legendary pity 12→8, softer
  egg-quality curve with rainbow chance from score 22, Gość Strażnika 5→2,
  Kolekcjoner tęczy 3→2, Perfekcjonista 25→10); R3 (no new iskierki sink)
  deliberately unchanged. Post-change numbers are in section 0 of the report.
  Fourth pass the same evening, after expedition finds shipped:
  [`plans/031-analiza-ekonomii-znaleziska.html`](031-analiza-ekonomii-znaleziska.html)
  (same sim, now counting finds + a shared-pity variant). Open: shared pity
  counter across modes (80/80 278 → ~197 rounds), finds window is narrow
  (4–5 per game) — accepted as narrative.
  Fifth pass after the pairs/feed modes, 88 monsters and the new dup prices:
  [`plans/032-analiza-ekonomii-piec-trybow.html`](032-analiza-ekonomii-piec-trybow.html).
  Simulator rewritten for 5 modes: `plans/ekonomia.sim.ts` + `plans/ekonomia.agg.ts`
  (replace the old 030 script; rerun after any retune). Findings: 88/88 takes
  ~496 rounds (~7.6 months), 71% of it the 16-exclusive tail with a capped
  wallet; a child ignoring the new modes never completes. Open: shared pity
  counter with threshold 6 (88/88 → ~282 rounds), Home hint for the missing
  mode.
- **Parent progress view.** `DebugScreen` already renders the full
  per-fact mastery table and `adaptive.ts` exposes the aggregations; a
  gated (PIN/long-press) read-only, parent-legible presentation (color
  bands, not floats) is mostly presentation work. Effort S–M.
- **„Pasek więzi" (bond meter).** Named in ROADMAP.md as the un-built
  fast-follow of the companion layer; no bond state exists today. Needs a
  new persisted per-monster counter (migration) and careful design so it
  only ever grows (no guilt/decay — root principle). Effort M; the
  fuzziest of the four — design spike first.
- **Save export/import (cross-device)** and **audio feedback** — still
  parked; nothing new. (PWA landing made the tablet the home device,
  lowering export/import urgency.)

(Per-monster cosmetics + card frames graduated to plans 013/014; story-framed
review, a third mode, expeditions and PWA to 015–018.)
