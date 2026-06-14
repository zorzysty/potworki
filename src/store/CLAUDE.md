# CLAUDE.md — src/store/

## Purpose

Pojedynczy store zustand: koordynacja przepływu gry (runda, wyklucie, nawigacja) i persystencja w localStorage.

## Ownership

- `schema.ts` — `SaveState`, `SAVE_VERSION`, mapa `MIGRATIONS`, łańcuch `migrateSave`
- `store.ts` — akcje gry, persist z `partialize`, `safeStorage`, decay przy starcie

## Local Contracts

- Klucz zapisu: `potworki-save`. **Każda zmiana kształtu `SaveState` = podbicie `SAVE_VERSION` + wpis w `MIGRATIONS`** (wzorzec w komentarzu w `schema.ts`). Zapis dziecka nie może przepaść po deployu. Aktualnie `SAVE_VERSION = 3`.
- `celebratedStage` (persystowany): najwyższy etap, którego splash otwarcia bramy już pokazano. `markGatesCelebrated()` ustawia go na `unlockedStage`. Splash odpala się jednorazowo, gdy `unlockedStage > celebratedStage`: zwykle w `RoundSummary` od razu po odblokowaniu w rundzie, a `MapScreen` służy jako zapas (ścieżka debug). Migracja v2→v3 ustawia `celebratedStage = unlockedStage`, by obecni gracze nie dostali animacji dla już otwartych bram. Debug `debugOpenGate` zwiększa `unlockedStage` (clamp `isMaxStage`) bez ruszania `celebratedStage` — do testu animacji.
- Persystowane są wyłącznie pola `SaveState` (lista `SAVE_KEYS` napędza `partialize`); `screen`, `round`, `lastHatch` są efemeryczne. `goTo()` czyści `round` przy nawigacji poza ekran rundy.
- **Commit per odpowiedź**: `pressConfirm` zapisuje statystyki działania, fragmenty i licznik `eggsEarned` natychmiast; koniec rundy tylko finalizuje jakość jajek z tej rundy, odblokowania i `totalRounds`. Wyjście w trakcie rundy (pauza → „Koniec na dziś", zamknięcie karty) niczego nie cofa — jajka zachowują prowizoryczną jakość, runda nie liczy się do `totalRounds`.
- Próg fragmentów na jajko jest dynamiczny: nowe jajko powstaje gdy `eggFragments ≥ fragmentsForEgg(eggsEarned)`; po utworzeniu `eggsEarned++` (rośnie tylko za jajka z fragmentów, nie za Jajka Życzeń). Próg liczy `src/game/`, store tylko go wywołuje i prowadzi licznik.
- Mechanika kolejki rundy żyje tutaj (nie w `src/game/`): 10 pytań bazowych; błędna pierwsza próba wstawia powtórkę na `index+3` (clamp do końca, max 12 pytań, powtórka nie generuje kolejnej); powtórki omijają okno wykluczeń selekcji. Błędne działanie daje maks. 1 gwiazdkę za to działanie — poprawna powtórka jest capowana (`Math.min(1, starsFor)`), więc 30/30 wymaga rundy bez pomyłek. Faza `wrong` = rytuał przepisania wyniku, ignorowany przez statystyki.
- Gwarancje wyklucia: pusta kolekcja → `FIRST_MONSTER_ID` (pierwsza sesja zawsze kończy się potworkiem); duplikat → iskierki (cap 99); wyklucie wymarzonego czyści `dreamMonsterId`. `hatchEgg(index = 0)` wykluwa wybrane jajko (gracz wybiera kolejność w gnieździe, gdy czeka kilka jajek) i usuwa je z `pendingEggs` po indeksie, nie zawsze pierwsze.
- `safeStorage`: try/catch wokół localStorage (prywatny tryb Safari rzuca na setItem → fallback in-memory), uszkodzony JSON traktowany jak brak zapisu. Decay mastery odpalany raz przy załadowaniu modułu.
- Debug-symulacja rundy: czysta `simulateRoundOutcome(state, totalStars, firstFact?)` liczy efekt pełnej rundy `QUESTIONS_PER_ROUND` pytań kończącej się sumą `totalStars` gwiazdek — mastery wybranych (`pickNextFact`) działań, fragmenty i jajka o finalnej jakości (`eggQuality`), iskierki za tęczową, sprawdzenie odblokowania; gwiazdki rozkłada `distributeStars` (3⭐ = szybko ⇒ większy przyrost mastery). Dwa wejścia: `debugSimulateRound` (ekran debug, przyciski +20…+30) dopisuje wynik cicho do zapisu i `totalRounds`. `debugFinishRound` (ekran rundy, przyciski w prawym dolnym rogu, tylko `?debug` i przed pierwszą odpowiedzią) kończy trwającą rundę w fazie `summary` z pełnymi eventami końca rundy (jajka tej rundy w `eggsCreated`, animacja bramy, CTA wyklucia) — pierwsze pytanie = aktualnie wyświetlane (`round.question`).
- Logika domenowa należy do `src/game/` i `src/monsters/` — akcje store mają pozostać cienkimi koordynatorami.

## Verification

W konsoli przeglądarki: ustaw `version: 0` w `localStorage['potworki-save']` → reload → migracja przechodzi bez utraty kolekcji; podmień zapis na uszkodzony string → reload → świeży stan bez crasha; reload w trakcie rundy → fragmenty/mastery/pendingEggs zachowane.
