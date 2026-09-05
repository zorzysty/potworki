# CLAUDE.md — src/game/

## Purpose

Logika pedagogiczna i ekonomia nagród jako czyste funkcje — bez Reacta, DOM-u i efektów ubocznych.

## Ownership

- `facts.ts` — 55 faktów komutatywnych, etapy odblokowań (`STAGES`), budżety czasowe i gwiazdki, próg fragmentów (`fragmentsForEgg`), budowanie pytania (`makeQuestion`, `expectedAnswer`)
- `adaptive.ts` — mastery/decay, selekcja pytań, odblokowania etapów i postęp bramy, intro-rundy i rundy-wizyty; `MASTERY_GOAL` i flaga `FactStats.mastered`
- `round.ts` — cykl życia Rundy nad `(SaveState, RoundState)`: `newRound`/`newVisitRound`, `submitAnswer` (commit per odpowiedź, powtórka na `index+3`, max 12 pytań, poprawna powtórka capowana do 1★), `advance` (następne pytanie albo finalizacja: żołd z bonusem dnia liczonym PRZED podbiciem dnia, bonus wizyty, powrót wyprawy, liczniki — wszystko przez JEDEN `credit`); store tylko nakłada `patch`
- `rewards.ts` — jakość jajek, szanse rzadkości, pity legendarnych per tryb (`rollMonsterWithPity`), Jajko Życzeń (`wishEggPrice`), bank gwiazdek (`addEggFragment`), portfel iskierek (`credit`/`spend` — jedyne miejsce znające `ISKIERKI_CAP` i regułę „nie stać")
- `village.ts` — katalog budynków i dekoracji (każdy budynek ma realny perk), żołd (`roundWage`), koszty, `villageRoster`, cel budowy
- `cosmetics.ts` — katalog kosmetyki Sklepiku (tiery per poziom budynku); import jednokierunkowy z `village.ts`
- `expeditions.ts` — katalog typów wypraw i czyste helpery; brama Placu Zabaw; import jednokierunkowy z `village.ts`
- `collection.ts` — fakty o kolekcji z `ownedMonsters`: `byRecency`/`newestOwned`/`firstHatched` (jeden komparator, remis → niższy `id`), `ownedCount`, `isCollectionComplete` (katalog) vs `isPoolComplete(mode)` (pula trybu), `guardianOwned`; ekrany nie liczą tego same
- `wishEgg.ts` — `wishEgg(save) → { cost, dreamApplies, unlocked, available }`: jedyne źródło prawdy o Jajku Życzeń (pula, cena, odblokowanie); import z `rewards.ts`, `village.ts` i katalogu potworków
- `time.ts` — `dayStamp(now)`: lokalny znacznik dnia, czysty względem wstrzykiwanego `now`
- `debug.ts` — `simulateRound`: gra pełną rundę funkcjami z `round.ts` (nie lustro logiki — nie ma czego utrzymywać w dwóch miejscach); `distributeStars` steruje czasem odpowiedzi tak, by wyszła zadana suma gwiazdek

## Local Contracts

- `FactKey` to `"axb"` zawsze z `a <= b` (`factKey()` normalizuje); losowa orientacja wyświetlania to sprawa UI/store.
- `GameMode` (`mult`/`div`/`gap`): trzy **widoki tego samego faktu** — wspólne mastery, etapy i ekonomia; selekcja, odblokowania i decay nie znają trybu. Tokeny trybów są persystowane (`PendingEgg.mode`) — zamrożone; etykiety UI wolno edytować.
- **Wszystkie liczby strojenia** (progi, ceny, czasy, szanse) żyją w tych plikach i są jedynym źródłem prawdy — także dla bytów w toku (retuning wypraw dotyczy trwających natychmiast; duration/reward niepersystowane). Testy pilnują struktury i przedziałów, nie dokładnych wartości.
- `stageProgress === 1` ⟺ `shouldUnlockNextStage === true` — kryształy bramy nigdy nie kłamią.
- `FactStats.mastered` = „opanowane KIEDYKOLWIEK" (high-water, nigdy nie gaśnie); osiągnięcia czytają flagę, selekcja/bramy/decay żywe `mastery`. Warunek „wszystkie działania ≥ progu naraz" był nieosiągalny (pomyłka dzieli mastery na pół) — nie wracać do niego.
- Kolor jajka wynika z gwiazdek włożonych w **całą jego budowę** (bank → `eggQualityScore`), losowany raz przy domknięciu i finalny od chwili utworzenia; krzywa jakości jest łagodna (nie schodek) — dziecko poprawne-ale-niespieszne też widzi kolorowe jajka; tęczowe zawsze tylko z szansą: pełne 40 % wyłącznie za komplet 3★, ale mała szansa już od score 22 (tęcza = rzadkie szczęście każdego grającego dobrze, nie nagroda tylko dla bezbłędnych — z progu 28 wynikały dwa nieosiągalne osiągnięcia).
- Duplikat płaci wg rzadkości × jakość jajka (`dupIskierki`) — kolor jajka ma coś znaczyć także wtedy, gdy w środku nie ma nowego potworka.
- **Każdy dochód przechodzi przez `credit`, każdy zakup przez `spend`** — żadnych ręcznych `Math.min(ISKIERKI_CAP, …)` ani `iskierki < cost` poza `rewards.ts` (wyjątek: zamrożone migracje w `store/schema.ts`). Komunikat dla dziecka pokazuje `gained` z `credit`, nigdy kwotę sprzed capu (świadomy wyjątek: podsumowanie rundy wypisuje składniki żołdu osobno, więc przy capie może obiecać więcej — jeden `credit` na rundę, cap 999 praktycznie nieosiągalny).
- Pity: licznik jajek Z RUND per tryb (`SaveState.legendaryPity`) gwarantuje tier legendarny co `LEGENDARY_PITY_EVERY`, tylko gdy pula trybu ma nieposiadanego legendarnego; Jajko Życzeń i pierwszy potworek go nie ruszają — ekskluzywne legendarne mają być celem, nie loterią.
- Próg fragmentów na jajko rośnie, ale jest capowany (`EGG_THRESHOLD_CAP`) — pętla wyklucia nie może rozciągać się bez końca.
- Jajko Życzeń: store (guard `buyWishEgg`) i UI (przycisk, etykieta „(wymarzony!)") czytają TEN SAM obiekt `wishEgg(save)` — cena i etykieta zgadzają się z konstrukcji; podłogę `WISH_PRICE_FLOOR` egzekwuje samo `wishEggPrice` (żaden konsument nie może jej zgubić); sufit ogranicza **dopłatę, nie cenę końcową** (premia za rzadkość wymarzonego przeżywa sufit i zniżkę fontanny); cena maks ≤ `ISKIERKI_CAP`. Licznik kupionych = `achievementStats.wishEggsBought` — świadomie bez nowego pola zapisu.
- Żołd: wolna runda zawsze dostaje bazę; bonusy obecności bez streaka — przerwa niczego nie zabiera.
- Wyprawy: postęp = UKOŃCZONE rundy, **nigdy zegar** (żadnych `Date.now()`/timerów w tej mechanice); strata nagrody niemożliwa; ekonomia uzupełnia żołd, nie zastępuje go.
- Kosmetyka: kupowana raz, zakładanie darmowe i nielimitowane (jeden przedmiot na wielu potworkach naraz — przebieranki mają być zabawą, nie grindem); katalog append-friendly (projektowany powtarzalny zlew iskierek); stock rotacyjny/timery odrzucone (presja/FOMO).
- Zasada roota „szybkość tylko nagradza" obowiązuje przy każdej zmianie w tym module.

## Work Guidance

Moduły muszą pozostać czyste i deterministyczne poza wstrzykiwanym `rand: () => number` — warunek testowalności bezpośrednio bunem.

## Verification

`bun test src/game` — testy charakteryzacyjne zamrażają progi, rozkłady i inwarianty ekonomii; zmiana strojenia = aktualizacja testu razem z decyzją, którą koduje.
