# CLAUDE.md — src/game/

## Purpose

Logika pedagogiczna i ekonomia nagród jako czyste funkcje — bez Reacta, DOM-u i efektów ubocznych.

## Ownership

- `facts.ts` — 55 faktów komutatywnych, etapy odblokowań (`STAGES`), budżety czasowe i gwiazdki, próg fragmentów (`fragmentsForEgg`), budowanie pytania (`makeQuestion`, `expectedAnswer`)
- `adaptive.ts` — mastery/decay, selekcja pytań, odblokowania etapów i postęp bramy, intro-rundy i rundy-wizyty
- `rewards.ts` — jakość jajek, szanse rzadkości, pity legendarnych per tryb (`rollMonsterWithPity`), Jajko Życzeń (`wishEggPrice`), bank gwiazdek (`addEggFragment`), portfel iskierek (`credit`/`spend` — jedyne miejsce znające `ISKIERKI_CAP` i regułę „nie stać")
- `village.ts` — katalog budynków i dekoracji (każdy budynek ma realny perk), żołd (`roundWage`), koszty, `villageRoster`, cel budowy
- `cosmetics.ts` — katalog kosmetyki Sklepiku (tiery per poziom budynku); import jednokierunkowy z `village.ts`
- `expeditions.ts` — katalog typów wypraw i czyste helpery; brama Placu Zabaw; import jednokierunkowy z `village.ts`
- `time.ts` — `dayStamp(now)`: lokalny znacznik dnia, czysty względem wstrzykiwanego `now`
- `debug.ts` — czysta symulacja rundy debug (wstrzykiwane `rand`/`now`)

## Local Contracts

- `FactKey` to `"axb"` zawsze z `a <= b` (`factKey()` normalizuje); losowa orientacja wyświetlania to sprawa UI/store.
- `GameMode` (`mult`/`div`/`gap`): trzy **widoki tego samego faktu** — wspólne mastery, etapy i ekonomia; selekcja, odblokowania i decay nie znają trybu. Tokeny trybów są persystowane (`PendingEgg.mode`) — zamrożone; etykiety UI wolno edytować.
- **Wszystkie liczby strojenia** (progi, ceny, czasy, szanse) żyją w tych plikach i są jedynym źródłem prawdy — także dla bytów w toku (retuning wypraw dotyczy trwających natychmiast; duration/reward niepersystowane). Testy pilnują struktury i przedziałów, nie dokładnych wartości.
- `stageProgress === 1` ⟺ `shouldUnlockNextStage === true` — kryształy bramy nigdy nie kłamią.
- Kolor jajka wynika z gwiazdek włożonych w **całą jego budowę** (bank → `eggQualityScore`), losowany raz przy domknięciu i finalny od chwili utworzenia; krzywa jakości jest łagodna (nie schodek) — dziecko poprawne-ale-niespieszne też widzi kolorowe jajka; tęczowe tylko z szansą i tylko przy niemal komplecie 3★.
- Duplikat płaci wg rzadkości × jakość jajka (`dupIskierki`) — kolor jajka ma coś znaczyć także wtedy, gdy w środku nie ma nowego potworka.
- **Każdy dochód przechodzi przez `credit`, każdy zakup przez `spend`** — żadnych ręcznych `Math.min(ISKIERKI_CAP, …)` ani `iskierki < cost` poza `rewards.ts` (wyjątek: zamrożone migracje w `store/schema.ts`). Komunikat dla dziecka pokazuje `gained` z `credit`, nigdy kwotę sprzed capu.
- Pity: licznik jajek Z RUND per tryb (`SaveState.legendaryPity`) gwarantuje tier legendarny co `LEGENDARY_PITY_EVERY`, tylko gdy pula trybu ma nieposiadanego legendarnego; Jajko Życzeń i pierwszy potworek go nie ruszają — ekskluzywne legendarne mają być celem, nie loterią.
- Próg fragmentów na jajko rośnie, ale jest capowany (`EGG_THRESHOLD_CAP`) — pętla wyklucia nie może rozciągać się bez końca.
- Jajko Życzeń: podłogę `WISH_PRICE_FLOOR` egzekwuje samo `wishEggPrice` (żaden konsument nie może jej zgubić); sufit ogranicza **dopłatę, nie cenę końcową** (premia za rzadkość wymarzonego przeżywa sufit i zniżkę fontanny); cena maks ≤ `ISKIERKI_CAP`. Licznik kupionych = `achievementStats.wishEggsBought` — świadomie bez nowego pola zapisu.
- Żołd: wolna runda zawsze dostaje bazę; bonusy obecności bez streaka — przerwa niczego nie zabiera.
- Wyprawy: postęp = UKOŃCZONE rundy, **nigdy zegar** (żadnych `Date.now()`/timerów w tej mechanice); strata nagrody niemożliwa; ekonomia uzupełnia żołd, nie zastępuje go.
- Kosmetyka: kupowana raz, zakładanie darmowe i nielimitowane (jeden przedmiot na wielu potworkach naraz — przebieranki mają być zabawą, nie grindem); katalog append-friendly (projektowany powtarzalny zlew iskierek); stock rotacyjny/timery odrzucone (presja/FOMO).
- Zasada roota „szybkość tylko nagradza" obowiązuje przy każdej zmianie w tym module.

## Work Guidance

Moduły muszą pozostać czyste i deterministyczne poza wstrzykiwanym `rand: () => number` — warunek testowalności bezpośrednio bunem.

## Verification

`bun test src/game` — testy charakteryzacyjne zamrażają progi, rozkłady i inwarianty ekonomii; zmiana strojenia = aktualizacja testu razem z decyzją, którą koduje.
