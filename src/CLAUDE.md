# CLAUDE.md — src/

## Purpose

Cały kod aplikacji: warstwa UI (ekrany, komponenty, wejście, animacje) oraz indeks domen z child docs.

## Ownership

Ten doc jest właścicielem `App.tsx`, `main.tsx`, `styles.css`, `components/`, `screens/`, `assets/`. Domeny `game/`, `monsters/`, `store/`, `achievements/` mają własne CLAUDE.md (patrz Child DOX Index).

## Local Contracts

- Maszyna ekranów bez routera: pole `screen` w store + `switch` w `App.tsx`; wstecz przeglądarki neutralizowany (popstate → home); zmiana `screen` przewija dokument na górę (efekt w `App.tsx` — store celowo nie dotyka DOM-u, testy chodzą bez przeglądarki). Ekran debug tylko z `?debug` w URL.
- **Jeden model wejścia: aktywacja zawsze na `click`**, nigdy `onPointerDown` (wrażenie natychmiastowości daje CSS `:active` + `touch-manipulation`; `click` nie ghost-clickuje po nawigacji i jest bezpieczny na scrollu). Klawiatura fizyczna: globalny `keydown` w `App.tsx`, tylko ekran rundy; handler celowo NIE zna pauzy — każde źródło wejścia wycisza guard w akcjach store, nie UI.
- Żadnych natywnych `<input>` w grze — iPad otwierałby klawiaturę systemową; odpowiedź renderowana w stylizowanym divie.
- Viewport: ekrany używają `min-h-[var(--app-vh)]`, **nigdy** `min-h-dvh`/`svh` — `--app-vh` to realny pomiar `visualViewport` z `main.tsx`, bo jednostkom CSS nie można ufać w Firefoksie na Androidzie. `min-h-dvh` wolno wyłącznie kontenerowi tła w `App.tsx`; insety `safe-area` obsługiwane zawsze, nie tylko w standalone.
- Animacje: wszystkie `@keyframes` i klasy `anim-*`/`monster-*` żyją w `styles.css`; tylko transform/opacity; sekwencje przez `useState`+`setTimeout`+cleanup (nigdy `animationend`); jednorazowe splashe StrictMode-safe (wzorzec `components/useGateReveal.ts` — decyzja w inicjalizatorze `useState`).
- `MonsterSvg` jest zamrożony i nietknięty; `components/MonsterStage.tsx` to **jedyny chokepoint kosmetyki i nakładek emocji**. Każdy potworek mogący nosić kosmetykę renderuje się przez `MonsterStage`, a kosmetyka nigdy nie wypiera nakładki reakcji (caller składa `overlay={<><EquippedOverlay/>{reakcja}</>}`). Wyjątek: ramki kart renderuje kontener karty w `CollectionScreen`, nie `MonsterStage.frame` (ramka oprawia całą kartę, nie okno z artem). Tła (slot `background`, `EquippedBackground`) idą przez prop `background` u przyjaciela na Home; w `CollectionScreen` tło jest warstwą całego kontenera (całe okno z artem na karcie, cały kafel na liście — jak ramka, nie okno wokół potworka), a nazwa na kaflu dostaje wtedy jasną pigułkę, by była czytelna na ciemnym tle — wioska i wędrowcy celowo bez tła (scena wioski jest własnym tłem).
- Warstwa opiekuńcza (przyjaciel, Wioska) **nigdy nie karze i nie wzbudza winy** (brak głodu/smutku; przerwa = najcieplejsze powitanie); emocje to nakładki wokół potworka, nigdy zmiana twarzy.
- Zablokowana zawartość (tier Sklepiku, brama wypraw, fontanna) to ZAJAWKA, nigdy ton błędu: nazwa i nagroda w pełnym kontraście + chip z warunkiem 🔒. Guard w store jest źródłem prawdy — UI pokazuje łagodną linijkę, nie wyszarzony przycisk.
- Maks JEDNA proaktywna karta na Home (zaproszenie Strażnika ma pierwszeństwo przed chipem wyprawy); „Graj!" nigdy nie spada niżej. Badge'y wzoru „nowa brama!" gasną po zobaczeniu — zero nagabywania. Wyjątek: badge osiągnięć trwa do odbioru iskierek (`claimed`), bo to nieodebrana nagroda, nie zajawka.
- Karty-modale zamyka wyłącznie ✕ (`components/ModalCloseX`) + tap w tło — bez dolnego „Zamknij" (na długiej karcie bywał poza viewportem). Modale-potwierdzenia (ResetModal) zachowują jawne przyciski — to decyzja.
- Metadane rzadkości (`RARITY_META`, `CARD_THEME`) w `components/rarity.ts`; style trudności osiągnięć lustrzanie w `components/achievementTier.ts`; pasek celu budowy współdzielony w `components/GoalProgressBar.tsx`; art wioski w `components/village/`; scenki teł potworków (wektorowe SVG 200×200, `preserveAspectRatio: slice` — kluczowe detale w środkowych ~60% viewBoxu, bo okno karty jest szerokie, a kafel listy wysoki) w `components/BackgroundArt.tsx`, miniatura w Sklepiku = ta sama scena; gniazdo ekranu wyklucia (tył/przód SVG wokół jajek, sloty `NEST_SLOTS` w % wrappera) w `components/NestArt.tsx`; zamiana jajka gniazdo↔dół to FLIP w `HatchScreen` (rect przed zmianą stanu → `useLayoutEffect` → sam `transform`).
- Art wioski (`components/village/`): kontur w ciemniejszym tonie materiału (jak palety potworków, nie jeden fiolet), stałe światło z lewej góry (bryła = cieniowany prawy bok/prawa połowa dachu), zero emoji w scenie (kwiaty, motyle, kaczka, namiot to wektory). Rozciągany `Terrain` (viewBox = % sceny) trzyma TYLKO kształty tolerujące zniekształcenie (pasy terenu, sylwetki gór/lasu); detale o stałych proporcjach to osobne arty pozycjonowane przez ekran. Droga (`RoadArt`) to osobna warstwa NAD teksturą łąki. Pozycje działek i zieleni liczy czysta `components/village/layout.ts` ze zmierzonego rozmiaru sceny — **zawsze dwa rzędy z przesunięciem** (decyzja maintainera: nigdy jeden rząd, nawet na szerokim ekranie), tylny uniesiony wyżej niż najwyższy budynek z przodu; test `layout.test.ts` pilnuje braku nakładania na telefonie/tablecie/laptopie. Ozdoby świetlne w artach budynków zawsze z `data-decor` (sylwetka je gasi).
- `HelpTip` („?") umieszczać jako rodzeństwo przycisku w `relative` wrapperze — nigdy `<button>` w `<button>`; dymek jest pozycjonowany absolutnie, więc żaden przodek karty z `HelpTip` nie może mieć `overflow-hidden` (przycina dymek).

## Work Guidance

- Tailwind 4 utility-first; tokeny w `@theme` w `styles.css` (kolory `grape`/`bubblegum`/`sunny`, font `--font-display` = self-hostowany Baloo 2).
- Cele dotykowe min 64×64 px, `:active` scale jako feedback; teksty UI po polsku.
- Estetyka: jaskrawe gradienty, zaokrąglenia, animacje nagradzające — gra ma się podobać 9-latce.

## Verification

`bun run typecheck`; wizualnie dev server + puppeteer-core (przepis w root CLAUDE.md, sekcja „Testowanie w przeglądarce"); refaktory czysto prezentacyjne — diff DOM przed/po.

## Child DOX Index

- [achievements/CLAUDE.md](achievements/CLAUDE.md) — deklaratywny katalog osiągnięć i ich czysta ocena; stabilne `id` persystowane w zapisie
- [game/CLAUDE.md](game/CLAUDE.md) — czysta logika gry: silnik adaptacyjny, gwiazdki, ekonomia nagród, wioska, kosmetyka, wyprawy
- [monsters/CLAUDE.md](monsters/CLAUDE.md) — deterministyczny katalog 80 potworków, rendering SVG, świat i lore; **ZAMROŻONY SEED — przeczytaj przed każdą zmianą w tym folderze**
- [store/CLAUDE.md](store/CLAUDE.md) — store zustand i persystencja: wersjonowany SaveState z migracjami, strefy persystowana/efemeryczna, mechanika rundy
