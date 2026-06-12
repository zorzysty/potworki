# CLAUDE.md — src/

## Purpose

Cały kod aplikacji: warstwa UI (ekrany, komponenty, wejście, animacje) oraz trzy domeny z własnymi child docs (game, monsters, store).

## Ownership

Ten doc jest właścicielem `App.tsx`, `main.tsx`, `styles.css`, `components/`, `screens/`, `assets/`. Domeny `game/`, `monsters/`, `store/` mają własne CLAUDE.md (patrz Child DOX Index).

## Local Contracts

- Maszyna ekranów: pole `screen` w store + `switch` w `App.tsx` (home/round/hatch/collection/debug). Wstecz przeglądarki jest neutralizowany (popstate → home). Ekran debug renderuje się tylko z `?debug` w URL.
- Jeden code path wejścia: przyciski gry używają `onPointerDown` (nigdy `onClick` — opóźnienie dotyku na tablecie); globalny `keydown` w `App.tsx` mapuje 0–9/Backspace/Enter na te same akcje store (tylko na ekranie round, bez modyfikatorów, `preventDefault` tylko dla obsłużonych klawiszy).
- Żadnych natywnych `<input>` w grze — iPad otwierałby klawiaturę systemową; odpowiedź renderowana w stylizowanym divie.
- Wszystkie `@keyframes`, klasy `anim-*`/`monster-*` i custom variant `land:` (media `min-aspect-ratio: 1/1`, obsługuje landscape tabletu i laptop) żyją w `styles.css`.
- Komponenty współdzielone w `components/`, pełne ekrany w `screens/`; metadane rzadkości (polskie etykiety, kolory) w `components/rarity.ts`.

## Work Guidance

- Tailwind 4 utility-first; tokeny w `@theme` w `styles.css` (kolory `grape`/`bubblegum`/`sunny`, font `--font-display` = self-hostowany Baloo 2).
- Cele dotykowe min 64×64 px, `:active` scale jako feedback; teksty UI po polsku.
- Estetyka: jaskrawe gradienty, zaokrąglenia, animacje nagradzające (confetti przy wykluciu) — gra ma się podobać 9-latce.

## Verification

`bun run typecheck`; wizualnie dev server + puppeteer-core (przepis w root CLAUDE.md, sekcja „Testowanie w przeglądarce").

## Child DOX Index

- [game/CLAUDE.md](game/CLAUDE.md) — czysta logika gry: silnik adaptacyjny (mastery, selekcja, etapy), gwiazdki/budżety czasowe, ekonomia nagród i losowanie wyklucia
- [monsters/CLAUDE.md](monsters/CLAUDE.md) — deterministyczny katalog 48 potworków, imiona i rendering SVG; **ZAMROŻONY SEED — przeczytaj przed każdą zmianą w tym folderze**
- [store/CLAUDE.md](store/CLAUDE.md) — store zustand i persystencja: wersjonowany SaveState z migracjami, strefy persystowana/efemeryczna, commit-per-odpowiedź, mechanika kolejki rundy
