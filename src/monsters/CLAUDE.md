# CLAUDE.md — src/monsters/

## Purpose

Deterministyczny katalog 76 potworków (DNA, rzadkości, imiona) i ich rendering SVG.

## Ownership

- `catalog.ts` — GLOBAL_SEED, PRNG (mulberry32), rollDna, rzadkość po id, unikalność DNA
- `names.ts` — generator polskich imion z sylab (dedupe, honorific dla legendarnych)
- `parts.tsx` — palety (PALETTES) i części SVG: ciała, oczy, pyszczki, czubki głów, wzory, akcesoria
- `MonsterSvg.tsx` — kompozycja warstw, gradient tęczowy, sylwetka przez klasę CSS
- `world.ts` — świat „Krainy Potworków": `REGIONS` (region per etap `STAGES`: nazwa z motywem liczbowym, emoji, blurb, kolor, `guardianId`), `BRIDGE_GUARDIAN_IDS` (most = 72–75), `BRIDGE_ORIGIN`, `regionOf(id)` i `originOf(id)` (kraina pochodzenia). Dane statyczne; importuje `STAGES`/`isDivisionOnly`
- `lore.ts` — `loreFor(id)`: deterministyczny opis (species/blurb/funFact) z DNA; zależy tylko od `catalog.ts`

## Local Contracts

- **ZAMROŻONE PO WYDANIU** (gra jest na urządzeniu dziecka, zapisujemy tylko `monsterId`): `GLOBAL_SEED`, implementacja `mulberry32`, `SALT_STRIDE` (=48, krok salta w seedzie kolizji DNA — odpięty od `MONSTER_COUNT`, by dodawanie potworków nie ruszało DNA istniejących), liczba i kolejność wywołań `rand()` w `rollDna` i `generateName`, stratyfikacja palet po id, mapowanie id→rzadkość dla 0–47 (0–23 common, 24–37 rare, 38–44 epic, 45–47 legendary). Każda zmiana w tym zakresie podmienia kolekcję. Nowe potworki wolno dodawać wyłącznie nowymi id powyżej dotychczasowego maksimum, bez wpływu na wyniki istniejących; `rarityOf` przypisuje im rzadkość osobnym blokiem, `IDS_BY_RARITY` jest wyprowadzane z `rarityOf` przez `MONSTER_COUNT`.
- Aktualny stan: `MONSTER_COUNT = 76` (rozkład 36/21/11/8). Id 48–71: 48–59 common, 60–66 rare, 67–70 epic, 71 legendary. Id 72–75: legendary zdobywalne **wyłącznie przez dzielenie** (`DIVISION_ONLY_IDS`, `isDivisionOnly`). `idsByRarityForMode(mode)` zwraca pulę losowania: `"div"` → pełny katalog, `"mult"` → bez tylko-dzielenie (różni się tylko tier legendary: 8 vs 4). Filtr po trybie jajka żyje przy wykluciu w store (`rollContext`).
- Rendering (`parts.tsx`, `MonsterSvg.tsx`) wolno ulepszać tylko tak, by ten sam `Dna` dawał rozpoznawalnie tego samego potworka.
- Palety: 0–5 zwykłe, 6 galaktyczna (wyłącznie epic, z gwiazdkami), 7 tęczowa (wyłącznie legendary, gradient w `MonsterSvg`). Legendary = korona + aura (korona zastępuje topper); epic = wings albo aura.
- Unikalność DNA i imion gwarantowana checkiem przy module load (kolizja → deterministyczny bump salta / następna sylaba).
- `world.ts`/`lore.ts` są **czysto prezentacyjne**: zero pól `SaveState`, zero migracji, brak wpływu na zamrożoną sygnaturę katalogu (zapisujemy tylko `monsterId`). Strażnicy regionów dobrani tak, że `regionOf(guardianId) === stage` (paszport strażnika wskazuje jego własną krainę — pilnuje `world.test.ts`). `Region` i `BRIDGE_ORIGIN` to **unia rozróżnialna polem `kind`** (`"region"`/`"bridge"`) — bez tego `Region <: bridge` i TS gubi wariant. `lore.ts` opisuje wyłącznie to, co faktycznie renderuje `MonsterSvg`: **korona zastępuje topper**, więc legendarne opisują koronę, nie ukryty topper. Banki słów muszą mieć dokładnie tyle wpisów, ile wariantów danego pola DNA.

## Work Guidance

Nowe części SVG: viewBox 200×200, twarz w okolicy (100, 88–130), kontur `palette.outline` ~4–5 px, strokeLinejoin round. Klasy animacji (`monster-bob`, `monster-eyes`, `monster-aura`) zdefiniowane w `src/styles.css`.

## Verification

- `bun test src/monsters/catalog.test.ts` — testy pokrywają: rozkład 36/21/11/8 per rzadkość, unikalność DNA i imion, legendary→korona+paleta 7, epic→paleta 6, `DIVISION_ONLY_IDS`/`idsByRarityForMode` (mult wyklucza tylko-dzielenie, div zawiera).
- `bun test src/monsters/world.test.ts src/monsters/lore.test.ts` — `world`: 7 regionów (`factor===STAGES[stage][0]`), strażnicy distinct/common-lub-rare/nie-divOnly i `regionOf(guardianId)===stage`, most=72–75 legendary+divOnly, `regionOf` pokrywa 0..6, `originOf` (divOnly→`BRIDGE_ORIGIN`, reszta→region z `kind`); `lore`: determinizm, brak luk w bankach (pełne pokrycie zakresu DNA bez `"undefined"`), przymiotnik per-accessory, anty-kłamstwo „legendarne opisują koronę nie topper", zróżnicowany funFact.
- **Zamrożona sygnatura katalogu** (`frozen catalog signature is unchanged`): konkatenacja `id:imię:DNA` wszystkich 76 potworków zablokowana jako literał w `catalog.test.ts`. Zmiana `GLOBAL_SEED`, `mulberry32`, `SALT_STRIDE`, `rollDna`, stratyfikacji palet lub `generateName` powali ten test — to jest cel. Dokładając potworki: uruchom test raz, odczytaj faktyczną sygnaturę z błędu, dopisz nowe wpisy (pierwsze 72 muszą zostać bit-w-bit).
- Galeria `?debug` — 76 sztuk, różnorodne i identyczne po hard-refresh.
