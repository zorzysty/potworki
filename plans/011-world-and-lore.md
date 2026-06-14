# Plan 011: Krainy + Strażnicy + Most Strażników oraz Lore/Paszport

## Status

- **Priority**: P3 (feature)
- **Effort**: M (dwie funkcje `[S]`)
- **Risk**: LOW (czysto prezentacyjne)
- **Depends on**: —
- **Category**: feature (świat i sens / żywa kolekcja)
- **Status**: DONE — branch `feat/011-world-and-lore`

## Po co

Dwie zazębiające się funkcje wybrane z menu pomysłów (wątki *Świat i sens* +
*Żywa kolekcja*), oparte na istniejących danych — bez backendu, bez zmian zapisu,
bez ruszania zamrożonego katalogu:

- **A. Krainy + Strażnicy + Most Strażników** — mapa „Kraina Potworków" dostaje
  nazwy regionów z motywem liczbowym czynnika i potworki-strażników; 4 legendarne
  tylko-dzielenie (72–75) zyskują wspólną fabułę „Most Strażników".
- **B. Lore/Paszport** — modal potworka w kolekcji staje się „paszportem":
  deterministyczny opis z DNA + kraina pochodzenia + data poznania + rzadkość.

**Obie są czysto prezentacyjne: zero pól `SaveState`, zero migracji, sygnatura
katalogu nietknięta.** Respektują zasady (brak presji czasu/kary, tablet-first
`onClick`, tylko polski).

## Co powstało

- `src/monsters/world.ts` — `Region`/`REGIONS` (7, indeks=stage), `BRIDGE_GUARDIAN_IDS`
  (72–75), `BRIDGE_ORIGIN`, `regionOf(id)=id%7`, `originOf(id)`. `Region` i
  `BRIDGE_ORIGIN` to **unia rozróżnialna polem `kind`** (`"region"`/`"bridge"`),
  inaczej `Region <: bridge` i TS gubi wariant. Strażnicy `[0,29,30,24,25,26,27]` —
  każdy common/rare, nie-divOnly, `regionOf(id)===stage` (spójność paszportu).
- `src/monsters/lore.ts` — `loreFor(id)` (species/blurb/funFact) z banków słów PL
  per pole DNA. **Korona zastępuje topper** (legendarne opisują koronę, nie ukryty
  topper — zgodnie z `MonsterSvg.tsx`). `funFact` seeded `mulberry32(id ^ 0x105e)`,
  niezależny od DNA. Zależy tylko od `catalog.ts` (brak cyklu).
- `src/screens/MapScreen.tsx` — karty zdobytych krain i wioska z nazwą + strażnikiem
  (sylwetka gdy nieposiadany), sekcja „🌉 Most Strażników" (4 kafle, licznik N/4).
  Renderowane poza gałęzią `maxStage`.
- `src/components/gate.tsx` — `GateReveal` pokazuje emoji+nazwę krainy z `REGIONS`.
- `src/screens/CollectionScreen.tsx` — paszport w gałęzi posiadanej modala; nazwa
  krainy tylko gdy `region.stage <= unlockedStage` (inaczej mglisty teaser —
  „tajemnica tabliczki"); `overflow-y-auto` na kontenerze.
- Testy: `src/monsters/world.test.ts`, `src/monsters/lore.test.ts`.
- DOX: `src/monsters/CLAUDE.md`, `src/CLAUDE.md`.

## Done criteria (spełnione)

- [x] `bun run typecheck` exit 0
- [x] `bun test` exit 0 — **150 pass** (z nowymi `world`/`lore`); sygnatura
      `catalog.test.ts` niezmieniona
- [x] `bun run check` exit 0 (biome)
- [x] Zero zmian w `src/store/schema.ts` (brak nowych pól `SaveState`/migracji)
- [x] DOX zaktualizowane (`monsters/CLAUDE.md`, `src/CLAUDE.md`)

## Weryfikacja wizualna (do zrobienia ręcznie na urządzeniu)

Dev server + `?debug`: galeria → klik posiadanego potworka → paszport (gatunek, opis,
kraina, ciekawostka, data); ekran mapy → zdobyte krainy z nazwami/strażnikami + „Most
Strażników"; otwarcie bramy → nazwa krainy w splashu; finał `maxStage` (👑) — strażnicy
i Most nadal widoczni. *W WSL puste kwadraty zamiast emoji = nie bug.*
