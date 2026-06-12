# CLAUDE.md — src/game/

## Purpose

Logika pedagogiczna i ekonomia nagród jako czyste funkcje — bez Reacta, DOM-u i efektów ubocznych.

## Ownership

- `facts.ts` — 55 działań komutatywnych, etapy odblokowań (STAGES), budżety czasowe i gwiazdki, stałe rundy
- `adaptive.ts` — mastery, decay, selekcja pytań, kryterium odblokowania etapu
- `rewards.ts` — jakość jajek, szanse rzadkości, priorytet wymarzonego, Jajko Życzeń, iskierki

## Local Contracts

- `FactKey` to `"axb"` zawsze z `a <= b` (`factKey()` normalizuje); losowa orientacja wyświetlania to sprawa UI/store, nie tego modułu.
- `mastery` 0..1 to jedyny score. Dobra odpowiedź: `m += (1-m) × (szybko ? 0.30 : 0.15)`, gdzie „szybko" = budżet 3⭐ (`4000 + 800×max(a,b)` ms — jeden próg dla gwiazdek i mastery). Zła: `m ×= 0.5`. Decay `0.97^dni` (cap 30 dni) leniwie na starcie sesji, nigdy przy `attempts == 0`.
- Selekcja: waga `(1-m)² + 0.05` (floor utrzymuje powtórki opanowanych działań), ×2.5 dla działań bez prób, wykluczenie 3 ostatnio zadanych. Odblokowanie etapu: wszystkie odblokowane działania z `attempts ≥ 1` ORAZ średnia mastery ≥ 0.65. Kolejność etapów: ×1,2,5,10 → +3 → +4 → +6 → +9 → +7 → +8.
- Nagrody: progi jakości jajka z sumy gwiazdek rundy 0–9/10–17/18–25/26–30; tabele szans rzadkości muszą sumować się do 100. Priorytet wymarzonego: trafiony tier + nieposiadany → wykluwa się wymarzony. `rollWish`: z wymarzonym zwraca dokładnie jego, bez — losuje wśród nieposiadanych ze złotymi szansami i renormalizacją; zwraca `null` przy komplecie 48/48.
- Zasada nadrzędna z roota („szybkość tylko nagradza") obowiązuje przy każdej zmianie w tym module.

## Work Guidance

Moduły muszą pozostać czyste i deterministyczne poza wstrzykiwanym `rand: () => number` — to warunek testowalności bezpośrednio bunem.

## Verification

Smoke-test skryptem `bun` importującym moduły wprost: progi gwiazdek/jakości, sumy tabel szans, dominacja słabego działania w ~2000 losowań selekcji, gwarancje wish/dream, `null` przy 48/48.
