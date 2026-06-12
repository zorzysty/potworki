# CLAUDE.md — src/monsters/

## Purpose

Deterministyczny katalog 48 potworków (DNA, rzadkości, imiona) i ich rendering SVG.

## Ownership

- `catalog.ts` — GLOBAL_SEED, PRNG (mulberry32), rollDna, rzadkość po id, unikalność DNA
- `names.ts` — generator polskich imion z sylab (dedupe, honorific dla legendarnych)
- `parts.tsx` — palety (PALETTES) i części SVG: ciała, oczy, pyszczki, czubki głów, wzory, akcesoria
- `MonsterSvg.tsx` — kompozycja warstw, gradient tęczowy, sylwetka przez klasę CSS

## Local Contracts

- **ZAMROŻONE PO WYDANIU** (gra jest na urządzeniu dziecka, zapisujemy tylko `monsterId`): `GLOBAL_SEED`, implementacja `mulberry32`, liczba i kolejność wywołań `rand()` w `rollDna` i `generateName`, stratyfikacja palet po id, mapowanie id→rzadkość (0–23 common, 24–37 rare, 38–44 epic, 45–47 legendary). Każda zmiana podmienia całą kolekcję. Nowe potworki wolno dodawać wyłącznie nowymi id powyżej 47, bez wpływu na wyniki istniejących.
- Rendering (`parts.tsx`, `MonsterSvg.tsx`) wolno ulepszać tylko tak, by ten sam `Dna` dawał rozpoznawalnie tego samego potworka.
- Palety: 0–5 zwykłe, 6 galaktyczna (wyłącznie epic, z gwiazdkami), 7 tęczowa (wyłącznie legendary, gradient w `MonsterSvg`). Legendary = korona + aura (korona zastępuje topper); epic = wings albo aura.
- Unikalność DNA i imion gwarantowana checkiem przy module load (kolizja → deterministyczny bump salta / następna sylaba).

## Work Guidance

Nowe części SVG: viewBox 200×200, twarz w okolicy (100, 88–130), kontur `palette.outline` ~4–5 px, strokeLinejoin round. Klasy animacji (`monster-bob`, `monster-eyes`, `monster-aura`) zdefiniowane w `src/styles.css`.

## Verification

- Galeria `?debug` — 48 sztuk, różnorodne i identyczne po hard-refresh.
- Determinizm: hash katalogu (id+imię+DNA) identyczny między osobnymi procesami `bun`.
- Statyczne gwarancje w smoke-teście: 24/14/7/3 per rzadkość, unikalne DNA i imiona, legendary→korona+paleta 7, epic→paleta 6.
