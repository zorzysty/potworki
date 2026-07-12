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

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale).

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
- **017**: trop proponuje wymarzonego wyłącznie przy PUSTYM slocie (nigdy
  podmiana) — jak w planie.

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

## Direction findings (not planned — maintainer's call)

- **Save export/import (cross-device).** Progress is per-device; `SaveState`
  is versioned + serializable; `safeStorage` exists.
- **Parent/teacher progress view.** `DebugScreen` already computes the
  mastery table; a PIN-gated read-only screen is mostly presentation.
- **Validate the reward economy after the 76-monster + division expansion.**
  `rarityOf` spans new id blocks while `RARITY_ODDS` stayed fixed; the
  `simulateRoundOutcome` harness could measure dup/iskierki pacing.
  (Plan 012 adds a wage income + village sink — re-measure after it lands.)
- **Audio feedback** for the reward loop (needs mute/autoplay UX).

(Per-monster cosmetics + card frames graduated to plans 013/014; story-framed
review, a third mode, expeditions and PWA to 015–018.)
