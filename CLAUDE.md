# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Czym jest ten projekt

Gra przeglądarkowa do nauki tabliczki mnożenia i dzielenia (do 10×10) dla 9-letniego dziecka. Dziecko wybiera tryb (mnożenie/dzielenie/brakujący czynnik) przed każdą rundą; dzielenie i luka (`7 × _ = 42`) to inne widoki tych samych faktów, ze wspólnym postępem. Motyw: kolekcjonowanie potworków — matma jest walutą, nie tematem; po kilka legendarnych potworków zdobywa się wyłącznie przez dzielenie albo wyłącznie przez tryb luki. Cel: tablet (dotyk) + laptop (klawiatura), UI wyłącznie po polsku (bez i18n). Brak backendu — postęp w localStorage, osobno na każdym urządzeniu.

## Komendy

```bash
bun i             # instalacja zależności (bun, nie npm)
bun run dev       # dev server (z base /potworki/)
bun run build     # tsc -b && vite build
bun run preview   # serwuje dist/
bun run typecheck # sam typecheck
bun run check     # biome: format + lint + organizacja importów (--write --unsafe)
bun run format    # biome: tylko formatowanie (--write)
bun run lint      # biome: tylko lint (--write)
bun test          # testy jednostkowe (src/game/*.test.ts, src/monsters/*.test.ts)
bun run verify    # pełna brama: test + typecheck + biome ci (tylko sprawdza, nic nie zapisuje)
```

Linter i formatter: **biome** (konfiguracja w `biome.json` — wcięcia tabami, podwójne cudzysłowy, średniki tylko gdy potrzebne, preset recommended + reguły React, a11y wyłączone). **Po każdej zakończonej zmianie w kodzie uruchom `bun run check` i napraw wszystko, co zgłosi** — to obowiązkowy krok przed uznaniem zadania za skończone.

Weryfikacja: `bun test` (testy jednostkowe logiki gry i katalogu potworków), `bun run typecheck`, `bun run check`, ekran debug (`?debug` w URL → link „debug" na ekranie głównym: tabela mastery, galeria 80 potworków, przełącznik trybu, przyciski oszukiwania) oraz ręczny click-through.

Deploy: push do `main` → GitHub Actions uruchamia `bun test` i `biome ci` (blokują deploy przy błędzie), buduje i publikuje na GitHub Pages (`https://zorzysty.github.io/potworki/`). Nazwa repo jest zaszyta w `base` w `vite.config.ts`. Build emituje service worker PWA (`vite-plugin-pwa` w `vite.config.ts`, `registerType: "autoUpdate"`; rejestracja jawnie w `src/main.tsx` przez `virtual:pwa-register`, bo wstrzyknięty skrypt nie robi reloadu ani nie sprawdza aktualizacji przy powrocie do karty — bez tego dzieci tygodniami grały na starym buildzie; reload po nowym SW jest odkładany, aż `round` wróci do null, bo runda nie jest persystowana; offline działa z precache całego builda) — appka jest instalowalna z ekranu głównego (manifest `scope`/`start_url` MUSZĄ siedzieć pod `/potworki/`).

## Architektura (przegląd)

Jeden store zustand (`src/store/store.ts`) koordynuje całość: ekrany to maszyna stanów bez routera, logika gry to czyste funkcje w `src/game/`, `src/monsters/` i `src/achievements/`, persystencja jest wersjonowana. Szczegółowe kontrakty każdej domeny są w child docs — patrz Child DOX Index; przed edycją przeczytaj łańcuch DOX dla ścieżki, którą zmieniasz.

## Zasady projektowe (project-wide)

1. **Szybkość tylko nagradza, nigdy nie karze**: brak widocznego stopera, błędna odpowiedź i tak daje fragment jajka, wolna poprawna odpowiedź daje pełny postęp przy 0 gwiazdek. Każda nowa mechanika musi respektować tę zasadę. (Odpowiedź zatwierdza się automatycznie po wpisaniu właściwej liczby cyfr — literówka liczy się jako pomyłka, świadoma decyzja na rzecz tempa.)
2. Postęp dziecka jest święty: zamrożony seed katalogu potworków (szczegóły w `src/monsters/CLAUDE.md`) i obowiązkowe migracje zapisu (szczegóły w `src/store/CLAUDE.md`).
3. UI wyłącznie po polsku; tablet-first (duże cele dotykowe, aktywacja na `click`, żadnych natywnych `<input>` — szczegóły w `src/CLAUDE.md`).

## Testowanie w przeglądarce

Playwright zawiesza się w tym środowisku. Działa **puppeteer-core** wskazany na systemowego chromium: `executablePath: "/usr/bin/chromium"` z argami `--no-sandbox --disable-gpu`. Puppeteera instaluj POZA repem (np. w katalogu tymczasowym sesji: `bun add puppeteer-core`) — nie jest zależnością projektu. Przepis: `bun run dev --port <port>` w tle → `page.goto("http://localhost:<port>/potworki/?debug")` → `localStorage.setItem("potworki-save", …)` z ostemplowanym `version` → ponowny `goto`. Przyciski i potworki gry aktywują się na `click` (model wejścia w `src/CLAUDE.md`); `.click()` puppeteera odpala pełną sekwencję pointer+click, więc działa. Uwaga na dopasowywanie przycisków po tekście — „Wioska" łapie też kartę-zaproszenie Strażnika („Strażnik Wioska Startowa zaprasza…"), celuj w „Wioska 🏡".

**Refaktory czysto prezentacyjne weryfikuj porównaniem DOM przed/po**: zrzuć `outerHTML` interesującego fragmentu, `git stash` w worktree, zrzuć ponownie, zdiffuj — to tańsze i ostrzejsze niż oglądanie zrzutów ekranu (brak fontów emoji potrafi i tak zrobić puste kwadraty).

# DOX framework

- DOX is highly performant CLAUDE.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- CLAUDE.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable CLAUDE.md plus every parent CLAUDE.md above it

## Read Before Editing

1. Read the root CLAUDE.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every CLAUDE.md found along each route
5. If a parent CLAUDE.md lists a child CLAUDE.md whose scope contains the path, read that child and continue from there
6. Use the nearest CLAUDE.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning CLAUDE.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- CLAUDE.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root CLAUDE.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child CLAUDE.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child CLAUDE.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Próg treści (zasada tego repo)

CLAUDE.md dokumentuje **kontrakty, nie implementację**. Wpis zasługuje na miejsce tylko, gdy spełnia co najmniej jedno:

- **łamie się bez ostrzeżenia**: niezmiennik, którego nie wykryje `bun run verify` (zamrożone seedy/`id`, obowiązek migracji zapisu, zasady projektowe typu „szybkość tylko nagradza");
- **decyzja niewidoczna w kodzie**: *dlaczego* coś jest zrobione tak, a nie inaczej, albo czego celowo nie robimy (odrzucone podejście z powodem);
- **wskazuje właściciela**: gdzie żyje dany typ logiki, jednym wierszem — żeby nowy kod trafił we właściwe miejsce.

NIE należą tu: opisy działania komponentów i funkcji, szczegóły CSS/animacji/layoutu, liczby strojenia, wyliczanki przypadków testowych (testy dokumentują się same — wystarczy komenda), historia zmian, numery planów i poszczególnych migracji (żyją w `plans/` i `schema.ts`). Jeśli coś da się odczytać z kodu lub testów w miejscu pracy — nie powielaj tego w docu.

Forma: jeden wiersz na kontrakt; child doc ma się mieścić na ~jednym ekranie (orientacyjnie ≤50 linii). Wpis, który potrzebuje akapitu, zwykle opisuje implementację — przenieś treść do komentarza w kodzie, a w docu zostaw jedną linijkę z decyzją.

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child CLAUDE.md

- **Teksty widoczne dla gracza (PL) redaguje maintainer.** Nie wymyślaj i nie „poprawiaj" istniejących nazw, etykiet ani komunikatów z własnej inicjatywy. Nowa funkcja wprowadza swoje teksty wprost, bez żadnych znaczników — dawny proces `PROPOZYCJA`/przegląd hurtem został wycofany 2026-07-25 na życzenie maintainera i nie wraca.
- Etykiety są zawsze osobne od `id`: nazwy budynków/dekoracji/kosmetyk/wypraw/osiągnięć, tytuły i opisy wolno edytować dowolnie, a persystowane `id`, tokeny trybów (`mult`/`div`/`gap`) i klucze `SaveState` — nigdy. Wyjątek z własną procedurą: imiona potworków siedzą w zamrożonym podpisie katalogu (`src/monsters/CLAUDE.md`).
- **Commit messages zawsze po angielsku** (conventional commits, np. `feat(map): …`); polskie nazwy własne gry (ekrany, mechaniki, „Mapa Świata") mogą zostać w treści.

## Child DOX Index

- [src/CLAUDE.md](src/CLAUDE.md) — cały kod aplikacji: warstwa UI (ekrany, komponenty, wejście, animacje) oraz indeks domen `game/` (logika adaptacyjna i nagrody), `monsters/` (zamrożony katalog potworków), `store/` (persystencja i przepływ gry), `achievements/` (katalog i ocena osiągnięć). Root zachowuje: komendy, deploy, zasady projektowe, testowanie w WSL.

Poza `src/` nie ma child docs: `.github/workflows/` (jeden plik deployu), `public/` (favicon + wygenerowane ikony PWA: `pwa-192/512`, `pwa-maskable-512`, `apple-touch-icon`), `architecture_improvements/` (raporty HTML z przeglądów architektury — kandydaci do pogłębiania modułów, jeden plik per przegląd, tylko do czytania), `scripts/` (`make-icons.ts` — generator ikon PWA z `favicon.svg`, uruchamiany ręcznie po zmianie favicona; instrukcja w komentarzu pliku), `ROADMAP.md` (pomysły na przyszłość; sklepik-wioska, warstwa opiekuńcza i kosmetyka per-potworek zrealizowane — zostały follow-upy, m.in. ramki kart (plan 014)) i pliki konfiguracyjne w rocie są opisane sekcją „Komendy" powyżej.
