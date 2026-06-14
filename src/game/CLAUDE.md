# CLAUDE.md — src/game/

## Purpose

Logika pedagogiczna i ekonomia nagród jako czyste funkcje — bez Reacta, DOM-u i efektów ubocznych.

## Ownership

- `facts.ts` — 55 działań komutatywnych, etapy odblokowań (STAGES), budżety czasowe i gwiazdki, stałe rundy, próg fragmentów na jajko (`fragmentsForEgg`)
- `adaptive.ts` — mastery, decay, selekcja pytań, hybrydowe kryterium odblokowania (`UNLOCK_THRESHOLD`, `MAINTAIN_THRESHOLD`, `shouldUnlockNextStage`, `needsMaintenance`), działania bramy/postęp mapy (`stageFacts`, `averageMastery`, `stageProgress`)
- `rewards.ts` — jakość jajek, szanse rzadkości, priorytet wymarzonego, Jajko Życzeń, iskierki
- `debug.ts` — symulacja rundy debug (`distributeStars`, `simulateRoundOutcome`), czysta dzięki wstrzykiwanym `rand`/`now`

## Local Contracts

- `FactKey` to `"axb"` zawsze z `a <= b` (`factKey()` normalizuje); losowa orientacja wyświetlania to sprawa UI/store, nie tego modułu.
- `mastery` 0..1 to jedyny score. Dobra odpowiedź: `m += (1-m) × (szybko ? 0.30 : 0.15)`, gdzie „szybko" = budżet 3⭐ (`4000 + 800×max(a,b)` ms — jeden próg dla gwiazdek i mastery). Zła: `m ×= 0.5`. Decay `0.97^dni` (cap 30 dni) leniwie na starcie sesji, nigdy przy `attempts == 0`.
- Selekcja: waga `(1-m)² + 0.05` (floor utrzymuje powtórki opanowanych działań), ×2.5 dla działań bez prób, wykluczenie 3 ostatnio zadanych. **Selekcja losuje z CAŁEJ odblokowanej puli** (`unlockedFacts`) — to ona, wraz z decay, utrzymuje stare tabliczki w powtórkach, nie kryterium bramy.
- **Brama dotyczy najnowszej tabliczki** (`stageFacts(stage)` = działania świeżo wprowadzonego czynnika `STAGES[stage][0]`, etap 0 = cały zestaw bazowy). Po otwarciu bramy postęp do następnej startuje od zera (nowe działania mają mastery 0). Kolejność etapów: ×1,2,5,10 → +3 → +4 → +6 → +9 → +7 → +8.
- **Hybrydowe odblokowanie** (`shouldUnlockNextStage`): (1) wszystkie `stageFacts` z `attempts ≥ 1`, (2) ich średnia mastery ≥ `UNLOCK_THRESHOLD` (0.65), ORAZ (3) starsze odblokowane tabliczki (`unlockedFacts(stage-1)`) nie spadły poniżej `MAINTAIN_THRESHOLD` (0.5) — patrz `needsMaintenance`. Składnik (3) to próg utrzymania (nie ponownego opanowania): w aktywnej grze stare tabliczki trzyma selekcja+decay, warunek bije głównie po dłuższej przerwie.
- Postęp do następnej bramy (mapa): `stageProgress = min(postęp_nowej, utrzymanie_starych)`. `postęp_nowej = min(1, averageMastery(stageFacts)/UNLOCK_THRESHOLD)` (cap ≤0.95 dopóki któreś działanie ma `attempts == 0`); `utrzymanie_starych = min(1, mean(stare)/MAINTAIN_THRESHOLD)` (1 gdy brak starych). Normalnie utrzymanie = 1, więc kryształy rosną z nową tabliczką; gdy stare podupadną, składnik je przyhamowuje. `stageProgress === 1` zachodzi dokładnie wtedy, gdy `shouldUnlockNextStage === true` (kryształy nigdy nie kłamią „pełna" przed odblokowaniem).
- Nagrody: jakość jajka jest **losowana** z rozkładu zależnego od sumy gwiazdek rundy (`qualityOdds` → `eggQuality(stars, rand)`): ≤25 → 100% normal; 26–27 → 60% silver / 40% normal; 28–29 → 50% gold / 30% silver / 20% normal; 30 → 40% rainbow / 30% gold / 20% silver / 10% normal. Tęczowe **tylko** za komplet 30/30 (runda bez pomyłek) i tylko z szansą. Każdy wiersz `qualityOdds` i każda tabela szans rzadkości musi sumować się do 100. Store losuje jakość raz na koniec rundy i nadaje ją wszystkim jajkom tej rundy (jeden roll/runda). Priorytet wymarzonego: trafiony tier + nieposiadany → wykluwa się wymarzony. `rollWish`: z wymarzonym zwraca dokładnie jego, bez — losuje wśród nieposiadanych ze złotymi szansami i renormalizacją; zwraca `null` przy komplecie (wszystkie posiadane).
- Próg fragmentów na jajko rośnie z liczbą zdobytych jajek (`fragmentsForEgg(eggsEarned)`): 1. = 10, 2–10 = 14, 11–20 = 18, +4 za każdą kolejną dziesiątkę. Licznik `eggsEarned` i wywołanie progu żyją w store.
- Zasada nadrzędna z roota („szybkość tylko nagradza") obowiązuje przy każdej zmianie w tym module.

## Work Guidance

Moduły muszą pozostać czyste i deterministyczne poza wstrzykiwanym `rand: () => number` — to warunek testowalności bezpośrednio bunem.

## Verification

`bun test src/game/facts.test.ts src/game/adaptive.test.ts src/game/rewards.test.ts` — lub `bun test` dla całego suite. Testy charakteryzacyjne pokrywają: progi gwiazdek, `fragmentsForEgg`, `qualityOdds` (każdy wiersz sumuje się do 100, tęczowe tylko przy 30), `RARITY_ODDS`, `eggQuality`, `rollWish` (dream/no-dream/null); mastery/decay/applyAnswer; `stageFacts`/`stageProgress`/`shouldUnlockNextStage` (ekwiwalencja `progress===1` ⟺ `shouldUnlock===true`, cap ≤0.95, maintenance); selekcję `pickNextFact` (dominacja słabego działania >50% w 2000 losowaniach).
