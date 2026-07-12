# CLAUDE.md — src/achievements/

## Purpose

Deklaratywny katalog osiągnięć i ich ocena jako czyste funkcje — bez Reacta, DOM-u i efektów ubocznych. Osiągnięcia dają cele krótkoterminowe ponad długim łukiem kolekcji i są dodatkowym źródłem iskierek.

## Ownership

- `catalog.ts` — typy (`Difficulty` = easy/medium/hard/legendary, `AchievementDef`, `AchievementCtx`), `REWARD_BY_DIFFICULTY` (5/10/15/25), `MASTERY_GOAL`, tablica `ACHIEVEMENTS` (48 sztuk) z czystą funkcją `progress(ctx)` każdego osiągnięcia. Helper `ownedGuardians` czyta `REGIONS` z `monsters/world` (strażnicy krain), helper `buildingsAtLeast` czyta `BUILDINGS` z `game/village` (osiągnięcia budowniczego: `pierwsza-budowla`/`wioska-w-rozkwicie`/`wielki-budowniczy`, czysto z `save.village`) — importy bez cyklu
- `evaluate.ts` — `achievementProgress` (postęp pojedynczego: current/target/unlocked/ratio) i `evaluateAchievements(ctx, alreadyUnlocked)` (jedyne wejście store: nowo spełnione + suma iskierek)

## Local Contracts

- **`id` to stabilny klucz persystowany** w `SaveState.achievements` — **NIGDY nie zmieniać ani nie usuwać po wydaniu** (zapis dziecka odwołuje się do `id`). `catalog.test.ts` zamraża listę `id` jako tripwire. `title`/`description`/`icon` to tekst dla gracza (po polsku) i **wolno je dowolnie edytować** — nie wpływają na zapis.
- `progress(ctx)` jest **czysta**: `ctx = { save: SaveState, counters: AchievementCounters }`. Zdobyte ⇔ `current >= target`; `ratio = min(1, current/target)` napędza pasek. Większość warunków liczy się wprost z `ctx.save` (`facts`, `ownedMonsters`, `unlockedStage`, `eggsEarned`, `totalRounds`, `iskierki`); liczniki zdarzeniowe w `SaveState.achievementStats` (definicja typu w `store/schema.ts`) są podbijane przez akcje store — **patrz `src/store/CLAUDE.md`**: `perfectRounds`, `divCorrect`, `gapCorrect` (poprawne pierwsze próby w trybie luki: `pierwsza-luka`/`luka-50`), `totalStars`, `rainbowEggsHatched`, `wishEggsBought`, `expeditionsCompleted` (ukończone wyprawy potworków: `pierwsza-wyprawa`/`obiezyswiat`) oraz `daysPlayed` (w ilu RÓŻNYCH dni grano — kumulacyjne, nie streak; `lastPlayedDay` to bookkeeping store, nieczytany przez `progress`).
- Osiągnięcia czasowe (`dni-grania`) i bazujące na bieżącym stanie nieodtwarzalnym wstecz nie są nadrabiane przez `reconcileAchievements` (licznik startuje od zera po migracji) — to świadome: dni liczą się dopiero od wdrożenia. Ten sam precedens dotyczy wypraw (`expeditionsCompleted` od zera po migracji v11→v12).
- Targety `wioska-w-rozkwicie`/`wielki-budowniczy` podążają za `BUILDINGS.length` (od planu 013: **7**, doszedł sklepik). Ledger jest append-only, a `evaluateAchievements` pomija już odblokowane — dziecko, które zdobyło je przy 6/6, ZACHOWUJE je; jedynie pasek postępu na karcie pokazuje 6/7 do czasu zbudowania Sklepiku (zaakceptowany, uczciwie motywujący quirk).
- „Opanowane działanie" = `mastery >= MASTERY_GOAL` (0.8, wyżej niż `UNLOCK_THRESHOLD`). Uwaga: pełna „tabliczka ×n" (`mistrz-siodemek`) zawiera `n×7`/`n×8`, więc jest osiągalna dopiero przy wysokim postępie (czynniki 7/8 odblokowują się na ostatnich etapach) — to świadomie późny kamień milowy.
- Nagrody i odblokowania nadaje store (`checkAchievements`/`reconcileAchievements`), nigdy ten moduł — tu tylko czysta ocena. Typy `AchievementCounters`/`AchievementEntry` należą do `store/schema.ts` (część `SaveState`), by uniknąć cyklu importów; ten moduł importuje je jako typy.

## Work Guidance

- Moduł musi pozostać czysty i deterministyczny — bez `Math.random`/`Date.now()`/DOM.
- Nowe osiągnięcie: dodaj wpis z **nowym, nigdy niepowtórzonym `id`** na końcu `ACHIEVEMENTS`, dopisz `id` do tripwire w `catalog.test.ts`. Jeśli wymaga nowego sygnału zdarzeniowego — dodaj licznik do `AchievementCounters` (`store/schema.ts`, migracja + inkrement w store).

## Verification

`bun test src/achievements/catalog.test.ts src/achievements/evaluate.test.ts` — pokrywa: dokładnie 48 osiągnięć, unikalność i zamrożoną listę `id`, poprawną trudność/teksty, `progress` na czystym zapisie (nic zdobyte, target>0) i na maksymalnym (wszystkie zdobyte — fixture ma też w pełni zbudowaną wioskę, ratio∈[0,1]); `evaluateAchievements` (pusto na czystym, 48 + 580 iskierek na maks, idempotencja względem `alreadyUnlocked`, częściowy postęp). Integracja ze store (liczniki, retroaktywne odblokowania) — w `src/store/store.test.ts`.
