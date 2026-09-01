# CLAUDE.md — src/achievements/

## Purpose

Deklaratywny katalog osiągnięć i ich ocena jako czyste funkcje — cele krótkoterminowe ponad długim łukiem kolekcji, dodatkowe źródło iskierek.

## Ownership

- `catalog.ts` — typy, `REWARD_BY_DIFFICULTY`, tablica `ACHIEVEMENTS` z czystą funkcją `progress(ctx)` każdego osiągnięcia
- `evaluate.ts` — `achievementProgress` i `evaluateAchievements` (jedyne wejście store)

## Local Contracts

- **`id` to stabilny klucz persystowany** w `SaveState.achievements` — **nigdy nie zmieniać ani nie usuwać po wydaniu**; `catalog.test.ts` zamraża listę `id` jako tripwire. `title`/`description`/`icon` wolno edytować dowolnie.
- `progress(ctx)` jest czysta: `ctx = { save, counters }`; liczniki zdarzeniowe podbija store (patrz `src/store/CLAUDE.md`), typy liczników należą do `store/schema.ts` (bez cyklu importów).
- `wishEggsBought` ma drugiego konsumenta poza osiągnięciami (cena Jajka Życzeń) — nie zerować i nie przedefiniowywać bez zmiany cennika; wycofanie osiągnięć nie zwalnia licznika.
- Osiągnięcia na licznikach nieodtwarzalnych wstecz liczą się od wdrożenia (`reconcileAchievements` nie nadrabia) — świadome.
- Targety osiągnięć budowniczego podążają za `BUILDINGS.length`; ledger jest append-only — zdobyte przy niższym targecie zostaje zdobyte.
- Nagrody i odblokowania nadaje store, nigdy ten moduł — tu tylko czysta ocena (`iskierkiReward` z `evaluateAchievements` to suma informacyjna; wypłata idzie przez `claimAchievement` w store, per osiągnięcie).

## Work Guidance

- Moduł czysty i deterministyczny — bez `Math.random`/`Date.now()`/DOM.
- Nowe osiągnięcie: nowy, nigdy niepowtórzony `id` na końcu `ACHIEVEMENTS` + dopis do tripwire w `catalog.test.ts`; nowy sygnał zdarzeniowy = licznik w `AchievementCounters` (`store/schema.ts`, migracja + inkrement w store).

## Verification

`bun test src/achievements` — katalog, tripwire `id`, ocena na czystym i maksymalnym zapisie. Integracja ze store (liczniki, retroaktywne odblokowania) — w `src/store/store.test.ts`.
