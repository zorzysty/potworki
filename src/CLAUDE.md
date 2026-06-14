# CLAUDE.md — src/

## Purpose

Cały kod aplikacji: warstwa UI (ekrany, komponenty, wejście, animacje) oraz trzy domeny z własnymi child docs (game, monsters, store).

## Ownership

Ten doc jest właścicielem `App.tsx`, `main.tsx`, `styles.css`, `components/`, `screens/`, `assets/`. Domeny `game/`, `monsters/`, `store/` mają własne CLAUDE.md (patrz Child DOX Index).

## Local Contracts

- Maszyna ekranów: pole `screen` w store + `switch` w `App.tsx` (home/round/hatch/collection/map/debug). Wstecz przeglądarki jest neutralizowany (popstate → home). Ekran debug renderuje się tylko z `?debug` w URL. Stała `DEBUG_ENABLED` (z `?debug`) jest przekazywana propsem do `HomeScreen` (link „debug") oraz `RoundScreen` (przyciski „zakończ rundę" +20/+26/+28/+30 w prawym dolnym rogu, tylko przed pierwszą odpowiedzią → `debugFinishRound`). Tło per-ekran wybiera `switch` w `App.tsx` (osobne gradienty dla hatch i map).
- **Jeden model wejścia: aktywacja zawsze na `click`** (nigdy `onPointerDown`). Wrażenie natychmiastowości daje CSS — `active:scale-*`/`:active` reaguje już na dotknięcie palcem, a `touch-manipulation` zdejmuje opóźnienie tap-zoom; samą akcję odpala dopiero `click` (jeden event na dotyk). Dzięki temu nie ma „ghost click": gdy `click` nawiguje, kończy się w całości ZANIM powstanie nowy ekran, więc nic nie przecieka na element w tym samym miejscu (to był wcześniej bug: klik w „Moje Potworki" otwierał popup potworka). Nawigacja, kafle przewijalnych ekranów, keypad, HelpTip — wszystko na `click`. Klik jest też z natury bezpieczny na scrollu (gest scrolla anuluje `click`) i pozwala anulować dotyk zsunięciem palca.
- Klawiatura fizyczna: globalny `keydown` w `App.tsx` mapuje 0–9/Backspace/Enter wprost na akcje store (tylko na ekranie round, bez modyfikatorów, `preventDefault` tylko dla obsłużonych klawiszy) — ścieżka niezależna od wskaźnika.
- Auto-submit: `pressDigit` (store) sam woła `pressConfirm`, gdy liczba wpisanych cyfr zrówna się z liczbą cyfr oczekiwanego wyniku — dotyczy keypadu i klawiatury oraz fazy `wrong`. Fajeczka/Enter pozostają jako zapasowy zatwierdzacz (pusta odpowiedź jest ignorowana).
- Żadnych natywnych `<input>` w grze — iPad otwierałby klawiaturę systemową; odpowiedź renderowana w stylizowanym divie.
- Wszystkie `@keyframes`, klasy `anim-*`/`monster-*` i custom variant `land:` (media `min-aspect-ratio: 1/1`, obsługuje landscape tabletu i laptop) żyją w `styles.css`.
- Komponenty współdzielone w `components/`, pełne ekrany w `screens/`; metadane rzadkości (polskie etykiety, kolory) w `components/rarity.ts`.
- Ekran kolekcji sortuje potworki jawnie po rzadkości (`RARITY_ORDER`, w obrębie rzadkości po id) — id nie są już ciągłe po rzadkości (nowe dochodzą na końcu katalogu), więc kolejność id sama nie grupuje.
- Tooltipy wyjaśniające mechaniki dziecku: `components/HelpTip.tsx` — dotykowy znaczek „?" z dymkiem (`onClick`, zatrzymuje propagację; przezroczysta warstwa zamyka). Umieszczać jako rodzeństwo przycisku w `relative` wrapperze (nie zagnieżdżać `<button>` w `<button>`).
- `screens/MapScreen.tsx` („Kraina Potworków") — wizualizacja liniowej wyprawy przez etapy odblokowań: zdobyte krainy `×N`, aktualna brama-portal z kryształami (`litCrystals(stageProgress(...))`, komplet 8/8 ⇔ brama gotowa), mgliste przyszłe bramy, finał przy `isMaxStage`. Gdy `needsMaintenance` (stare tabliczki podupadły) — podpowiedź „poćwicz starsze tabliczki". Animacja otwarcia bramy jest jednorazowa, sterowana porównaniem `unlockedStage > celebratedStage` (patrz `store/`); decyzję o animacji łapiemy w inicjalizatorze `useState` (przed `markGatesCelebrated`), żeby przetrwała podwójny montaż StrictMode. Wejście: przycisk na Home (plakietka „nowa brama!" gdy jest nieuczczone odblokowanie) oraz CTA w `RoundSummary` po odblokowaniu (cyfra ujawniana dopiero w animacji, nie w podsumowaniu).

## Work Guidance

- Tailwind 4 utility-first; tokeny w `@theme` w `styles.css` (kolory `grape`/`bubblegum`/`sunny`, font `--font-display` = self-hostowany Baloo 2).
- Cele dotykowe min 64×64 px, `:active` scale jako feedback; teksty UI po polsku.
- Estetyka: jaskrawe gradienty, zaokrąglenia, animacje nagradzające (confetti przy wykluciu) — gra ma się podobać 9-latce.

## Verification

`bun run typecheck`; wizualnie dev server + puppeteer-core (przepis w root CLAUDE.md, sekcja „Testowanie w przeglądarce").

## Child DOX Index

- [game/CLAUDE.md](game/CLAUDE.md) — czysta logika gry: silnik adaptacyjny (mastery, selekcja, etapy), gwiazdki/budżety czasowe, ekonomia nagród i losowanie wyklucia
- [monsters/CLAUDE.md](monsters/CLAUDE.md) — deterministyczny katalog 72 potworków, imiona i rendering SVG; **ZAMROŻONY SEED — przeczytaj przed każdą zmianą w tym folderze**
- [store/CLAUDE.md](store/CLAUDE.md) — store zustand i persystencja: wersjonowany SaveState z migracjami, strefy persystowana/efemeryczna, commit-per-odpowiedź, mechanika kolejki rundy
