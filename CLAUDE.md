# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Czym jest ten projekt

Gra przeglądarkowa do nauki tabliczki mnożenia (do 10×10) dla 9-letniego dziecka. Motyw: kolekcjonowanie potworków — matma jest walutą, nie tematem. Cel: tablet (dotyk) + laptop (klawiatura), UI wyłącznie po polsku (bez i18n). Brak backendu — postęp w localStorage, osobno na każdym urządzeniu.

## Komendy

```bash
bun i             # instalacja zależności (bun, nie npm)
bun run dev       # dev server (z base /potworki/)
bun run build     # tsc -b && vite build
bun run preview   # serwuje dist/
bun run typecheck # sam typecheck
```

Brak test runnera i lintera — weryfikacja przez typecheck, ekran debug (`?debug` w URL → link „debug" na ekranie głównym: tabela mastery, galeria 48 potworków, przyciski oszukiwania) oraz ręczny click-through. Logikę z `src/game/` i `src/monsters/` można testować skryptem uruchamianym bezpośrednio przez `bun` (czyste moduły TS bez zależności od DOM).

Deploy: push do `main` → GitHub Actions buduje i publikuje na GitHub Pages (`https://zorzysty.github.io/potworki/`). Nazwa repo jest zaszyta w `base` w `vite.config.ts`.

## Architektura

Jeden store zustand (`src/store/store.ts`) jest sercem wszystkiego:

- **Dwie strefy stanu**: persystowana (`SaveState` z `src/store/schema.ts` — facts, jajka, kolekcja, iskierki, wymarzony potworek) i efemeryczna (`screen`, `round`, `lastHatch`). `partialize` w persist decyduje, co trafia do localStorage pod kluczem `potworki-save`.
- **Routing nie istnieje** — pole `screen` + `switch` w `App.tsx` (5 ekranów: home/round/hatch/collection/debug). `goTo()` czyści stan rundy przy każdej nawigacji poza `round`. Przycisk Wstecz przeglądarki jest neutralizowany (popstate → home).
- **Commit per odpowiedź**: statystyki działania i fragmenty jajek zapisywane są do strefy persystowanej natychmiast po każdej odpowiedzi (nie na końcu rundy) — zamknięcie karty w środku rundy nie traci postępu. Efemeryczne są tylko kolejka pytań i licznik gwiazdek.
- **Logika gry to czyste funkcje** w `src/game/` (adaptive, rewards, facts) i `src/monsters/` (catalog, names) — store jest cienkim koordynatorem. Nowa mechanika powinna trafić do czystej funkcji, a store tylko ją wywoływać.
- Wejście dotykowe i klawiaturowe to **jeden code path**: keypad woła akcje store przez `onPointerDown`, globalny `keydown` w `App.tsx` mapuje klawisze na te same akcje. Żadnych natywnych `<input>` w grze (iPad otwierałby klawiaturę systemową).

Przepływ rundy: 10 pytań (do 12 z powtórkami po błędach), gwiazdki za szybkość względem budżetu `4000 + 800×max(a,b)` ms, suma gwiazdek → jakość jajek (zwykłe/srebrne/złote/tęczowe) nadawana na końcu rundy; 5 fragmentów = jajko, fragmenty przenoszą się między rundami. Wyklucie: losowanie tieru wg jakości jajka → priorytet „wymarzonego" przy trafionym tierze → duplikaty zamieniają się w iskierki → Jajko Życzeń gwarantuje wymarzonego.

Silnik adaptacyjny (`src/game/adaptive.ts`): 55 działań komutatywnych (klucz `"axb"` zawsze z `a <= b`, orientacja wyświetlania losowa), pojedynczy score `mastery` 0..1 z decayem po dniach, losowanie ważone `(1-mastery)² + 0.05`, etapy tabliczek odblokowywane średnią mastery ≥ 0.65.

## Twarde ograniczenia — nie łamać

1. **NIGDY nie zmieniaj `GLOBAL_SEED` ani kodu generacji w `src/monsters/catalog.ts`** (w tym kolejności wywołań `rand()` w `rollDna`/`generateName`). Zapisujemy tylko `monsterId`; każda zmiana generacji podmienia całą kolekcję na urządzeniu dziecka.
2. **Każda zmiana kształtu `SaveState`** wymaga podbicia `SAVE_VERSION` i wpisu w `MIGRATIONS` (`src/store/schema.ts`, wzorzec w komentarzu). Zapis dziecka nie może przepaść po deployu.
3. **Szybkość tylko nagradza, nigdy nie karze** — to świadoma zasada projektowa: brak widocznego stopera, brak auto-submitu (literówka nie może liczyć się jako błąd), błędna odpowiedź i tak daje fragment jajka, wolna poprawna odpowiedź daje pełny postęp przy 0 gwiazdek. Nowe mechaniki muszą respektować tę zasadę.

## Testowanie w przeglądarce (WSL)

Playwright zawiesza się w tym środowisku. Działa **puppeteer-core** wskazany na headless shell Playwrighta:
`~/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell` z argami `--no-sandbox --disable-gpu`. Kliknięcia puppeteera odpalają `onPointerDown` (przyciski gry nie używają `onClick`). Brak fontów emoji w WSL = puste kwadraty na zrzutach (to nie bug).
