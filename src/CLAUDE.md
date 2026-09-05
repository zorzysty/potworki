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
- Splashe nad podsumowaniem rundy (brama, powrót z wyprawy) grają po kolei, nigdy naraz; splash tylko pokazuje — nagroda i potworek są już zapisane przy finalizacji.
- Animacje: wszystkie `@keyframes` i klasy `anim-*`/`monster-*` żyją w `styles.css`; tylko transform/opacity; **ciągłe animacje potworków w scenach z wieloma potworkami (Wioska) idą na wrapper HTML (`anim-bob` + `animate="outer"` w Stage: SVG i kapelusz stoją, aura żyje), nigdy do wnętrza SVG** — Chrome nie kompozytuje transformacji wewnątrz SVG i przemalowuje scenę co klatkę (zmierzone: ~75% wątku głównego na 20 potworkach); sekwencje przez `useState`+`setTimeout`+cleanup (nigdy `animationend`); jednorazowe splashe StrictMode-safe (wzorzec `components/useGateReveal.ts` — decyzja w inicjalizatorze `useState`).
- `MonsterSvg` jest zamrożony i nietknięty; `components/MonsterStage.tsx` to **jedyny chokepoint kosmetyki i nakładek emocji** i SAM dokłada założony strój (kapelusz/aura z garderoby) — caller podaje tylko nakładkę reakcji (`overlay`). Każdy potworek, który MOŻE być posiadany, renderuje się przez `MonsterStage`; bezpośredni `MonsterSvg` wolno użyć wyłącznie dla sylwetek nieposiadanych (`monster-silhouette`) i galerii debug — grep `<MonsterSvg` bez tej klasy poza `MonsterStage`/`DebugScreen` = błąd. Wyjątek: ramki kart renderuje kontener karty w `CollectionScreen`, nie Stage (ramka oprawia całą kartę, nie okno z artem). Tła (slot `background`, `EquippedBackground`) decyduje caller: prop `background` u przyjaciela na Home; w `CollectionScreen` tło jest warstwą całego kontenera (całe okno z artem na karcie, cały kafel na liście — jak ramka, nie okno wokół potworka), a nazwa na kaflu dostaje wtedy jasną pigułkę, by była czytelna na ciemnym tle — wioska i wędrowcy celowo bez tła (scena wioski jest własnym tłem).
- Warstwa opiekuńcza (przyjaciel, Wioska) **nigdy nie karze i nie wzbudza winy** (brak głodu/smutku; przerwa = najcieplejsze powitanie); emocje to nakładki wokół potworka, nigdy zmiana twarzy.
- Zablokowana zawartość (tier Sklepiku, brama wypraw, fontanna) to ZAJAWKA, nigdy ton błędu: nazwa i nagroda w pełnym kontraście + chip z warunkiem 🔒. Guard w store jest źródłem prawdy — UI pokazuje łagodną linijkę, nie wyszarzony przycisk.
- Maks JEDNA proaktywna karta na Home (zaproszenie Strażnika ma pierwszeństwo przed chipem wyprawy); „Graj!" nigdy nie spada niżej. Badge'y wzoru „nowa brama!" gasną po zobaczeniu — zero nagabywania. Wyjątek: badge osiągnięć trwa do odbioru iskierek (`claimed`), bo to nieodebrana nagroda, nie zajawka.
- Wyprawy w UI: szczegóły to modal (z chipa na Home i z karty podróżnika w Kolekcji — jedna treść w `components/ExpeditionDetails`), wysyłanie tylko z karty potworka; podróżnika w Kolekcji zastępuje plecak, reszta karty bez zmian.
- Karty-modale budować przez `components/CardModal` (powłoka + `CARD_SHELL`); każdy inny pełnoekranowy overlay woła `components/useScrollLock` — dokument pod overlayem nigdy się nie przewija.
- Karty-modale zamyka wyłącznie ✕ (`components/ModalCloseX`) + tap w tło — bez dolnego „Zamknij" (na długiej karcie bywał poza viewportem). Modale-potwierdzenia (ResetModal) zachowują jawne przyciski — to decyzja.
- Metadane rzadkości (`RARITY_META`, `CARD_THEME`) w `components/rarity.ts`; style trudności osiągnięć lustrzanie w `components/achievementTier.ts`; pasek celu budowy współdzielony w `components/GoalProgressBar.tsx`; art wioski w `components/village/`; scenki teł potworków w `components/BackgroundArt.tsx` (jedna scena = karta, kafel i miniatura w Sklepiku — kluczowe detale w środku viewBoxu, bo okno bywa szerokie albo wysokie); gniazdo ekranu wyklucia i sloty jajek w `components/NestArt.tsx` (konwencja współrzędnych zostaje w tym pliku; które jajko siedzi gdzie, decyduje `HatchScreen`).
- Art wioski (`components/village/`): kontur w ciemniejszym tonie materiału (jak palety potworków, nie jeden fiolet), stałe światło z lewej góry (bryła = cieniowany prawy bok/prawa połowa dachu), zero emoji w scenie (kwiaty, motyle, kaczka, namiot to wektory). Rozciągany `Terrain` (viewBox = % sceny) trzyma TYLKO kształty tolerujące zniekształcenie (pasy terenu, sylwetki gór/lasu); detale o stałych proporcjach to osobne arty pozycjonowane przez ekran. Droga (`RoadArt`) to osobna warstwa NAD teksturą łąki. Całą geometrię sceny liczy czysta `components/village/layout.ts` ze zmierzonego rozmiaru: linia gruntu (`GROUND_Y`), działki, zieleń, brama zamku (`layoutGate`) i kotwice mieszkańców (`layoutResident`, `RESIDENT_SPOTS`, rozmiar artu `RESIDENT_SIZE` — Resident go importuje, nie odwrotnie) — ekran tylko komponuje; **zawsze dwa rzędy z przesunięciem** (decyzja maintainera: nigdy jeden rząd, nawet na szerokim ekranie), tylny uniesiony wyżej niż najwyższy budynek z przodu; test `layout.test.ts` pilnuje braku nakładania i kotwic na telefonie/tablecie/laptopie. Ozdoby świetlne w artach budynków zawsze z `data-decor` (sylwetka je gasi).
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
