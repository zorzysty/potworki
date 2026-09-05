# CLAUDE.md — src/game/

## Purpose

Logika pedagogiczna i ekonomia nagród jako czyste funkcje — bez Reacta, DOM-u i efektów ubocznych.

## Ownership

- `facts.ts` — 55 faktów komutatywnych, etapy odblokowań (`STAGES`), bramy trybów (`MODE_UNLOCK_STAGE`/`modeUnlocked`), budżety czasowe i gwiazdki, próg fragmentów (`fragmentsForEgg`), budowanie pytania (`makeQuestion`, `expectedAnswer`), cele trybu par (`divisorPairs`), rywal porównywania (`pickRival`)
- `adaptive.ts` — mastery/decay, selekcja pytań, odblokowania etapów i postęp bramy, intro-rundy i rundy-wizyty; `MASTERY_GOAL` i flaga `FactStats.mastered`
- `round.ts` — cykl życia Rundy nad `(SaveState, RoundState)`: `newRound`/`newVisitRound`, `submitAnswer` (commit per odpowiedź, powtórka na `index+3`, max 12 pytań, poprawna powtórka capowana do 1★), `submitPair` (tryb par: jedna stuknięta para; ten sam commit fragmentu i ta sama powtórka), `submitFeed`/`feedAnswer` (porównywanie: stuknięta strona; pomyłka → faza „wrong" z rytuałem jak w trybach liczbowych), `advance` (następne pytanie albo finalizacja: żołd z bonusem dnia liczonym PRZED podbiciem dnia, bonus wizyty, powrót wyprawy, liczniki — wszystko przez JEDEN `credit`); store tylko nakłada `patch`
- `rewards.ts` — jakość jajek, szanse rzadkości, pity legendarnych per tryb (`rollMonsterWithPity`), Jajko Życzeń (`wishEggPrice`), bank gwiazdek (`addEggFragment`), portfel iskierek (`credit`/`spend` — jedyne miejsce znające `ISKIERKI_CAP` i regułę „nie stać")
- `village.ts` — katalog budynków i dekoracji (każdy budynek ma realny perk), żołd (`roundWage`), koszty, `villageRoster`, cel budowy
- `cosmetics.ts` — katalog kosmetyki Sklepiku (tiery per poziom budynku); import jednokierunkowy z `village.ts`
- `expeditions.ts` — katalog typów wypraw, pula i etykieta znaleziska, brama Placu Zabaw; importy jednokierunkowe z `village.ts`, `collection.ts`, `rewards.ts`
- `collection.ts` — fakty o kolekcji z `ownedMonsters` i JEDYNA reguła przyjęcia potworka (`grantMonster`: wyklucie i znalezisko); `poolIds(mode)`; `byRecency`/`newestOwned`/`firstHatched` (jeden komparator, remis → niższy `id`), `ownedCount`, `isCollectionComplete` (katalog) vs `isPoolComplete(mode)` (pula trybu), `guardianOwned`; ekrany nie liczą tego same
- `wishEgg.ts` — `wishEgg(save) → { cost, dreamApplies, unlocked, available }`: jedyne źródło prawdy o Jajku Życzeń (pula, cena, odblokowanie); import z `rewards.ts`, `village.ts` i katalogu potworków
- `time.ts` — `dayStamp(now)`: lokalny znacznik dnia, czysty względem wstrzykiwanego `now`
- `debug.ts` — `simulateRound`: gra pełną rundę funkcjami z `round.ts` (w trybie par stuka kolejne cele przez `submitPair`; nie lustro logiki — nie ma czego utrzymywać w dwóch miejscach); `distributeStars` steruje czasem odpowiedzi tak, by wyszła zadana suma gwiazdek

## Local Contracts

- `FactKey` to `"axb"` zawsze z `a <= b` (`factKey()` normalizuje); losowa orientacja wyświetlania to sprawa UI/store.
- `GameMode` (`mult`/`div`/`gap`/`pairs`/`feed`): **widoki tych samych faktów** — wspólne mastery, etapy i ekonomia; selekcja, odblokowania i decay nie znają trybu. Tokeny trybów są persystowane (`PendingEgg.mode`, `legendaryPity`) — zamrożone; etykiety UI wolno edytować. Nowy tryb = nowy token + pity od zera (migracja) + wpis w `MODE_UNLOCK_STAGE`.
- Tryby-zabawy (od `pairs`) odblokowują się BRAMĄ (`MODE_UNLOCK_STAGE`), nie iskierkami: tryb to pedagogia, nie towar, a próg etapu gwarantuje, że pula liczb jest już dość bogata, by zabawa miała sens; wchodzą co drugą bramę (pary: etap 2, porównywanie: etap 4). Każdy tryb-zabawa ma własny blok ekskluzywnych legendarnych (pary: Dzielniki z Mostu, `PAIRS_ONLY_IDS`; porównywanie: Sad Łakomczuchów, `FEED_ONLY_IDS`) — jak `div`/`gap`; Jajko Życzeń i wyprawy ich nie widzą. Etykiety/plakietki trybów w jednym miejscu: `components/modeLabels.ts`.
- Tryb par (`pairs`): pytanie = iloczyn wylosowanego faktu, cele = WSZYSTKIE odblokowane pary o tym iloczynie (`divisorPairs`, maks 2); każda para uczy swój fakt, pomyłka uczy „na minus" fakt, w który dziecko uwierzyło. Jedno pytanie = jeden fragment i 0–3★ z łącznego czasu vs suma budżetów par, a budżet pary jest luźniejszy niż budżet faktu (`pairBudgetMs`: szukanie na żetonach trwa dłużej niż przypomnienie wyniku — z budżetem faktu pasek gwiazdek pełzał u dobrze grającego dziecka), także dla oceny „szybko" w mastery; pomyłka = 0★ + powtórka celu, ale pytanie gra się do końca (fragment i tak wpada — „szybkość tylko nagradza"). Selekcja omija ostatnie CELE (iloczyny), nie tylko klucze.
- Tryb porównywania (`feed`): pytanie = fakt z selekcji + rywal (`pickRival`: odblokowany fakt o INNYM iloczynie, z kilku losowych najbliższy — ciasne porównania uczą więcej), odpowiedź = strona z większym iloczynem. Trafienie uczy OBA fakty, pomyłka tylko fakt pytania (nie wiadomo, które działanie zawiodło — podwójna kara za jeden tap byłaby nieuczciwa); gwiazdki z sumy budżetów obu faktów, bez dodatkowego mnożnika (porównanie nie wymaga skanowania żetonów).
- **Wszystkie liczby strojenia** (progi, ceny, czasy, szanse) żyją w tych plikach i są jedynym źródłem prawdy — także dla bytów w toku (retuning wypraw dotyczy trwających natychmiast; duration/reward niepersystowane). Testy pilnują struktury i przedziałów, nie dokładnych wartości.
- `stageProgress === 1` ⟺ `shouldUnlockNextStage === true` — kryształy bramy nigdy nie kłamią.
- `FactStats.mastered` = „opanowane KIEDYKOLWIEK" (high-water, nigdy nie gaśnie); osiągnięcia czytają flagę, selekcja/bramy/decay żywe `mastery`. Warunek „wszystkie działania ≥ progu naraz" był nieosiągalny (pomyłka dzieli mastery na pół) — nie wracać do niego.
- Kolor jajka wynika z gwiazdek włożonych w **całą jego budowę** (bank → `eggQualityScore`), losowany raz przy domknięciu i finalny od chwili utworzenia; krzywa jakości jest łagodna (nie schodek) — dziecko poprawne-ale-niespieszne też widzi kolorowe jajka; tęczowe zawsze tylko z szansą, pełną za komplet 3★ i małą już dla dobrej-ale-niebezbłędnej gry (tęcza = rzadkie szczęście każdego grającego dobrze, nie nagroda tylko dla bezbłędnych — twardy próg dawał nieosiągalne osiągnięcia). Progi w `rewards.ts` i jego teście.
- Duplikat płaci wg rzadkości × jakość jajka (`dupIskierki`) — kolor jajka ma coś znaczyć także wtedy, gdy w środku nie ma nowego potworka; skraje są decyzją maintainera: pospolity ze zwykłego 1 ✨, legendarny z tęczowego 30 ✨ (test pilnuje), reszta równomiernie.
- **Każdy dochód przechodzi przez `credit`, każdy zakup przez `spend`** — żadnych ręcznych `Math.min(ISKIERKI_CAP, …)` ani decyzji „stać/nie stać" w logice poza `rewards.ts` (wyjątek: zamrożone migracje w `store/schema.ts`; UI wolno porównać `iskierki` z ceną, by wyszarzyć przycisk — guard w store jest źródłem prawdy). Komunikat dla dziecka pokazuje `gained` z `credit`, nigdy kwotę sprzed capu (świadomy wyjątek: podsumowanie rundy wypisuje składniki żołdu osobno, więc przy capie może obiecać więcej — jeden `credit` na rundę, cap 999 praktycznie nieosiągalny).
- Pity: licznik jajek Z RUND per tryb (`SaveState.legendaryPity`) gwarantuje tier legendarny co `LEGENDARY_PITY_EVERY`, tylko gdy pula trybu ma nieposiadanego legendarnego; Jajko Życzeń i pierwszy potworek go nie ruszają — ekskluzywne legendarne mają być celem, nie loterią.
- Próg fragmentów na jajko rośnie, ale jest capowany (`EGG_THRESHOLD_CAP`) — pętla wyklucia nie może rozciągać się bez końca.
- Jajko Życzeń: store (guard `buyWishEgg`) i UI (przycisk, etykieta „(wymarzony!)") czytają TEN SAM obiekt `wishEgg(save)` — cena i etykieta zgadzają się z konstrukcji; podłogę `WISH_PRICE_FLOOR` egzekwuje samo `wishEggPrice` (żaden konsument nie może jej zgubić); sufit ogranicza **dopłatę, nie cenę końcową** (premia za rzadkość wymarzonego przeżywa sufit i zniżkę fontanny); cena maks ≤ `ISKIERKI_CAP`. Licznik kupionych = `achievementStats.wishEggsBought` — świadomie bez nowego pola zapisu.
- Żołd: wolna runda zawsze dostaje bazę; bonusy obecności bez streaka — przerwa niczego nie zabiera.
- Wyprawy: postęp = UKOŃCZONE rundy, **nigdy zegar** (żadnych `Date.now()`/timerów w tej mechanice); strata nagrody niemożliwa; ekonomia uzupełnia żołd, nie zastępuje go.
- Znalezisko z wyprawy jest niezależne od wymarzonego i jajek: gotowy potworek z puli Jajka Życzeń (`FINDABLE_IDS` w `expeditions.ts`) przyjęty przez `grantMonster` przy finalizacji; przy skompletowanej puli UI nic nie obiecuje. Pojęcie „tropu" wycofane — nie wracać.
- Kosmetyka: kupowana raz, zakładanie darmowe i nielimitowane (jeden przedmiot na wielu potworkach naraz — przebieranki mają być zabawą, nie grindem); katalog append-friendly (projektowany powtarzalny zlew iskierek); stock rotacyjny/timery odrzucone (presja/FOMO).
- Zasada roota „szybkość tylko nagradza" obowiązuje przy każdej zmianie w tym module.

## Work Guidance

Moduły muszą pozostać czyste i deterministyczne poza wstrzykiwanym `rand: () => number` — warunek testowalności bezpośrednio bunem.

## Verification

`bun test src/game` — testy charakteryzacyjne zamrażają progi, rozkłady i inwarianty ekonomii; zmiana strojenia = aktualizacja testu razem z decyzją, którą koduje.
