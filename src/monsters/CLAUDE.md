# CLAUDE.md — src/monsters/

## Purpose

Deterministyczny katalog 80 potworków (DNA, rzadkości, imiona) i ich rendering SVG; świat/regiony i lore.

## Ownership

- `catalog.ts` — `GLOBAL_SEED`, PRNG (mulberry32), `rollDna`, rzadkość po id, unikalność DNA
- `names.ts` — generator polskich imion z sylab
- `parts.tsx` / `MonsterSvg.tsx` — palety, części SVG i kompozycja warstw
- `world.ts` — `REGIONS` (region per etap), pochodzenie potworków (`regionOf`/`originOf`, most i dolina dla trybów ekskluzywnych)
- Nomenklatura: „Strażnik"/`guardian` = wyłącznie potworek krainy (`Region.guardianId`, zaproszenia na rundę-wizytę); „Dzielniki" = legendarne tylko-tryb-par z Mostu (`BRIDGE_DIVIDER_IDS` = `PAIRS_ONLY_IDS`) i sama zabawa, której uczą (tryb `pairs`) — jedna nazwa, jedna mechanika. Tylko-dzielenie (72–75) pochodzą z Wyspy Ilorazów (`ISLAND_ORIGIN`), tylko-luka z Doliny Zagadek (`VALLEY_ORIGIN`), tylko-porównywanie (84–87) z Sadu Łakomczuchów (`ORCHARD_ORIGIN`); na mapie stoi tylko Most (decyzja maintainera: kolejne tryby bez własnych miejsc na mapie).
- `lore.ts` — `loreFor(id)`: deterministyczny opis z DNA

## Local Contracts

- **ZAMROŻONE PO WYDANIU** (gra jest na urządzeniu dziecka, zapisujemy tylko `monsterId`): `GLOBAL_SEED`, implementacja `mulberry32`, `SALT_STRIDE`, liczba i kolejność wywołań `rand()` w `rollDna` i `generateName`, stratyfikacja palet po id, mapowanie id→rzadkość istniejących id. Każda zmiana w tym zakresie podmienia kolekcję dziecka. Nowe potworki wyłącznie nowymi id powyżej dotychczasowego maksimum, bez wpływu na wyniki istniejących.
- Aktualnie `MONSTER_COUNT = 88`; id 72–75 to legendary **tylko-dzielenie**, 76–79 **tylko-luka**, 80–83 **tylko-Dzielniki** (tryb `pairs`), 84–87 **tylko-porównywanie** (tryb `feed`); pulę losowania per tryb daje `idsByRarityForMode` (blok ekskluzywny widoczny tylko dla swojego trybu).
- Rendering wolno ulepszać tylko tak, by ten sam `Dna` dawał rozpoznawalnie tego samego potworka.
- Paleta 6 (galaktyczna) wyłącznie epic, 7 (tęczowa) wyłącznie legendary; legendary = korona (zastępuje topper) + aura.
- `world.ts`/`lore.ts` są **czysto prezentacyjne**: zero pól `SaveState`, zero wpływu na zamrożoną sygnaturę — edytowalne swobodnie. `lore.ts` opisuje wyłącznie to, co faktycznie renderuje `MonsterSvg` (legendarne opisują koronę, nie ukryty topper); banki słów muszą pokrywać pełny zakres pola DNA.

## Work Guidance

Nowe części SVG: viewBox 200×200, twarz w okolicy (100, 88–130), kontur `palette.outline` ~4–5 px, strokeLinejoin round. Klasy animacji (`monster-bob` itd.) w `src/styles.css`.

## Verification

- `bun test src/monsters` + galeria `?debug` (88 sztuk, identyczne po hard-refresh).
- **Zamrożona sygnatura katalogu** w `catalog.test.ts` (literał `id:imię:DNA` wszystkich potworków): zmiana czegokolwiek z listy zamrożonej powala ten test — to jest cel. Dokładając potworki: odczytaj faktyczną sygnaturę z błędu testu i zdiffuj mechanicznie (nie na oko) — wszystkie dotychczasowe wpisy muszą zostać bit-w-bit.
