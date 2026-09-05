# CLAUDE.md — src/store/

## Purpose

Pojedynczy store zustand: koordynacja przepływu gry (runda, wyklucie, nawigacja) i persystencja w localStorage.

## Ownership

- `schema.ts` — `SaveState`, `SAVE_VERSION`, mapa `MIGRATIONS`, łańcuch `migrateSave` (wzorzec i historia poszczególnych migracji w komentarzach tego pliku)
- `store.ts` — akcje gry, persist z `partialize`, `safeStorage`, decay przy starcie

## Local Contracts

- Klucz zapisu: `potworki-save`. **Każda zmiana kształtu `SaveState` = podbicie `SAVE_VERSION` + wpis w `MIGRATIONS`** — zapis dziecka nie może przepaść po deployu. Liczniki nieodtwarzalne wstecz (dni, wyprawy, wizyty) migracja startuje od zera — nie nadrabiamy.
- Persystowane wyłącznie pola `SaveState` (lista `SAVE_KEYS` napędza `partialize`); `screen`, `round`, `lastHatch`, `mode`, `achievementQueue` efemeryczne. Stan należący do rundy trzymaj na `RoundState` — ginie razem z nią, bez enumerowania miejsc do zerowania (bez migracji).
- Store to cienki koordynator: logika domenowa żyje w `src/game/` i `src/monsters/`; `Math.random`/`Date.now()` wstrzykiwane do czystych funkcji, nie używane w nich.
- **Commit per odpowiedź**: `pressConfirm` od razu zapisuje statystyki i fragmenty; wyjście w trakcie rundy niczego nie cofa i nie liczy się do `totalRounds`.
- **Finalizacja rundy żyje w `game/round.ts` (`advance` → `finishRound`)** — jedna ścieżka dla gry i obu akcji debug (`simulateRound` gra tymi samymi funkcjami). Nowe źródło dochodu albo licznik końca rundy wchodzi TAM, nigdy do akcji store.
- Pauza (`RoundState.paused`): guard w akcjach wejścia (`pressDigit`/`pressBackspace`/`pressConfirm` = ciche no-op w pauzie) — jedyne miejsce wyciszające wszystkie źródła naraz (globalny `keydown` żyje obok nakładki UI). Przerwa nie może NIC kosztować.
- Niezmiennik `companionId !== expedition?.monsterId`, guardy po OBU stronach (`setCompanion` i `sendExpedition`); guard w store jest źródłem prawdy, UI pokazuje łagodne wyjaśnienie.
- O puli wyklucia decyduje **stempel `PendingEgg.mode`** (persystowany), nie aktualny przełącznik (`mode` w store jest efemeryczny) — legendarnych ekskluzywnych nie da się zdobyć przełączeniem trybu między zdobyciem a wykluciem. Wymarzony ma priorytet tylko, gdy jest w puli trybu jajka.
- Jajko Życzeń losuje z puli MNOŻENIOWEJ (bez legendarnych ekskluzywnych), która domyka się przed kompletem katalogu: `wishEgg(save)` z `src/game/wishEgg.ts` to jedyne źródło prawdy dla guardu w `buyWishEgg` i przycisku w UI (store nie ma własnej logiki ceny/puli); jajko kupione tuż przed domknięciem puli wykluwa duplikat (nigdy nie znika po cichu).
- `wishEggsBought` (`achievementStats`) jest ŹRÓDŁEM CENY Jajka Życzeń — nie zerować i nie przenosić bez zmiany cennika.
- Osiągnięcia: ledger czysty w `src/achievements/evaluate.ts`; store nakłada jego patche (`checkAchievements` po KAŻDEJ akcji zmieniającej stan, także po `claimAchievement` — odbiór nagrody może odblokować osiągnięcie na stanie portfela, ale cicho, bo dziecko już jest na ekranie osiągnięć; `reconcileAchievements` = `checkAchievements(silent)` raz przy starcie) i podbija liczniki zdarzeniowe wprost w akcjach. **Iskierki za osiągnięcie wypłaca wyłącznie `claimAchievement`** (tap dziecka na ekranie osiągnięć, flaga `claimed`) — odblokowanie nigdy nie płaci samo; to celowo: nagroda ma być odebrana, nie zauważona po fakcie.
- Ścieżki debug rozgrywają ZWYKŁĄ rundę (`visitStage: null`), więc świadomie pomijają bonus wizyty i licznik `visitRoundsCompleted` — wizyty to feature prawdziwej gry.
- `safeStorage`: try/catch wokół localStorage (prywatny tryb Safari rzuca na setItem → fallback in-memory), uszkodzony JSON = brak zapisu. Custom `mergePersisted` deep-merguje zagnieżdżone rekordy (`achievementStats`, `village`, `cosmetics`, `legendaryPity`) — sieć bezpieczeństwa po dev-HMR, NIE zamiennik migracji.
- Akcje rundy (`startRound`/`startVisitRound`/`pressConfirm`/`nextQuestion`) to cienkie `set({ ...patch, round })` nad `game/round.ts`; store dokłada tylko guard pauzy i `checkAchievements` po commicie. `RoundState` jest re-eksportowany stąd dla UI.

## Verification

`bun test src/store` — maszyna rundy, gwarancje wyklucia, łańcuch migracji do aktualnej wersji, ekonomia i guardy. Kanoniczny test wspólnego capu portfela (żołd + bonus wizyty + nagroda wyprawy w jednej finalizacji) — każde nowe źródło dochodu końca rundy ma tam dojść. Opcjonalny end-to-end (weryfikuje okablowanie `migrate` w zustand persist): w konsoli ustaw `version: 0` w `localStorage['potworki-save']` → reload → migracja bez utraty kolekcji; uszkodzony string → świeży stan bez crasha.
