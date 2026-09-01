# 029 — Ekonomia po retuningu (świeża symulacja)

**Data:** 2026-09-01 · **Stan repo:** `main` po commitach retuningu (SAVE_VERSION 15, 360 testów)
**Poprzednik:** [028](028-analiza-ekonomii.md) (analiza statyczna) + raport HTML z symulacją Monte Carlo
na starym kodzie (artefakt sesji 2026-09-01). Ten dokument liczy to samo na **nowym** kodzie.

## Co zostało wdrożone (2026-09-01)

1. **Bug:** Jajko Życzeń po komplecie puli mnożeniowej (72) zjadało iskierki → guard `wishEggAvailable`
   wspólny dla store i UI; wyczerpana pula degraduje do duplikatu, jajko nigdy nie znika po cichu.
2. **Cap progu jajka** (`EGG_THRESHOLD_CAP` = 22) + **łagodna krzywa jakości** (`qualityOdds`: srebrne od 16,
   złote od 23, tęczowe od 28) + score liczony z faktycznie zebranych fragmentów, nadwyżka przenoszona
   do następnego jajka (retuning działa od razu, bez migracji).
3. **Pity legendarnych per tryb** (`legendaryPity`, co 12 jajek z rund; migracja v15).
4. **Duplikat × jakość jajka** (`dupIskierki`: srebrne ×2, złote ×3, tęczowe ×5) + trzecia forma liczby mnogiej.
5. **Tła** (slot `background`, 4 scenki, 155 ✨) na karcie, kaflach i u przyjaciela.

## Metoda

Ta sama symulacja Monte Carlo (100 przebiegów × 3000 rund × 3 profile), ale jajka, pity i duplikaty liczą
**prawdziwe funkcje** z `src/game/rewards.ts` (`addEggFragment`, `rollMonsterWithPity`, `rollWish`,
`dupIskierki`). Profile: szybki (85 % odpowiedzi 3★, 4 % pomyłek), dobry (60 % 3★, 8 %), wolny (30 % 3★, 10 %).
Rotacja trybów 50/25/25; osobno „celowany" 20/40/40. Wymarzony = nieposiadany legendarny bazowy; zakupy:
Jajko Życzeń → najtańszy cel wioski → najtańsza kosmetyka. Rundy → czas: 75 rund ≈ miesiąc.
Skrypt (`sim2.ts`) żył w scratchpadzie sesji — nie w repo.

## Czasy do celów: przed → po (mediana rund, w nawiasie p10–p90)


### Profil „szybki"

| Cel | Przed | Po | Czas po |
|---|---|---|---|
| Mapa: 6 bram | 31 (29–35) | **31 (29–34)** | ~2 tyg. |
| Legendarne bazowe 4/4 | 35 (27–53) | **33 (25–44)** | ~2 tyg. |
| Komplet pospolitych | 145 (119–180) | **139 (122–155)** | ~1,9 mies. |
| Komplet rzadkich | 181 (116–228) | **131 (101–163)** | ~1,7 mies. |
| Komplet epickich | 208 (167–235) | **160 (136–205)** | ~2,1 mies. |
| Wioska komplet | 144 (137–153) | **136 (128–141)** | ~1,8 mies. |
| Kosmetyka komplet (teraz 20 przedmiotów) | 198 (192–207) | **193 (186–202)** | ~2,6 mies. |
| Strażnicy Mostu 4/4 | — (>3000) | **308 (203–413)** | ~4,1 mies. |
| Mistrzowie Doliny 4/4 | — (>3000) | **311 (225–412)** | ~4,1 mies. |
| Kolekcja 80/80 | — (>3000) | **359 (290–433)** | ~4,8 mies. |
| Pierwsze tęczowe | — (>3000) | **27 (5–155)** | ~2 tyg. |
| Trzy tęczowe | — (>3000) | **186 (64–367)** | ~2,5 mies. |
| Wszystkie osiągnięcia* | — (>3000) | **— (>3000)** | nigdy (>3000) |

Jajek w 3000 rund: 366 → **1422**; tęczowych: 0 → **39**; rund z portfelem ≥ 900: 2694 → 2723.

### Profil „dobry"

| Cel | Przed | Po | Czas po |
|---|---|---|---|
| Mapa: 6 bram | 42 (39–49) | **42 (39–49)** | ~2 tyg. |
| Legendarne bazowe 4/4 | 45 (33–61) | **38 (28–49)** | ~2 tyg. |
| Komplet pospolitych | 108 (94–134) | **110 (93–128)** | ~1,5 mies. |
| Komplet rzadkich | 237 (169–279) | **154 (116–199)** | ~2,1 mies. |
| Komplet epickich | 240 (212–263) | **204 (159–238)** | ~2,7 mies. |
| Wioska komplet | 153 (144–160) | **144 (137–148)** | ~1,9 mies. |
| Kosmetyka komplet (teraz 20 przedmiotów) | 209 (202–220) | **213 (202–223)** | ~2,8 mies. |
| Strażnicy Mostu 4/4 | — (>3000) | **336 (250–428)** | ~4,5 mies. |
| Mistrzowie Doliny 4/4 | — (>3000) | **348 (250–445)** | ~4,6 mies. |
| Kolekcja 80/80 | — (>3000) | **385 (322–465)** | ~5,1 mies. |
| Pierwsze tęczowe | — (>3000) | **— (>3000)** | nigdy (>3000) |
| Trzy tęczowe | — (>3000) | **— (>3000)** | nigdy (>3000) |
| Wszystkie osiągnięcia* | — (>3000) | **— (>3000)** | nigdy (>3000) |

Jajek w 3000 rund: 372 → **1472**; tęczowych: 0 → **0**; rund z portfelem ≥ 900: 2652 → 2694.

### Profil „wolny"

| Cel | Przed | Po | Czas po |
|---|---|---|---|
| Mapa: 6 bram | 64 (55–75) | **64 (55–75)** | ~4 tyg. |
| Legendarne bazowe 4/4 | 49 (33–62) | **39 (30–50)** | ~2 tyg. |
| Komplet pospolitych | 113 (96–131) | **103 (90–117)** | ~1,4 mies. |
| Komplet rzadkich | 211 (155–271) | **155 (120–202)** | ~2,1 mies. |
| Komplet epickich | 241 (210–276) | **224 (172–250)** | ~3,0 mies. |
| Wioska komplet | 156 (147–162) | **147 (140–150)** | ~2,0 mies. |
| Kosmetyka komplet (teraz 20 przedmiotów) | 213 (205–221) | **219 (209–227)** | ~2,9 mies. |
| Strażnicy Mostu 4/4 | — (>3000) | **355 (278–434)** | ~4,7 mies. |
| Mistrzowie Doliny 4/4 | — (>3000) | **343 (265–408)** | ~4,6 mies. |
| Kolekcja 80/80 | — (>3000) | **381 (328–445)** | ~5,1 mies. |
| Pierwsze tęczowe | — (>3000) | **— (>3000)** | nigdy (>3000) |
| Trzy tęczowe | — (>3000) | **— (>3000)** | nigdy (>3000) |
| Wszystkie osiągnięcia* | — (>3000) | **— (>3000)** | nigdy (>3000) |

Jajek w 3000 rund: 375 → **1494**; tęczowych: 0 → **0**; rund z portfelem ≥ 900: 2652 → 2682.

*Bez „Gościa Strażnika" (wizyty nie były symulowane).

### Gra celowana (20 % mnożenie / 40 % dzielenie / 40 % luka), nowa gra

| Profil | Strażnicy Mostu 4/4 | Mistrzowie Doliny 4/4 | 80/80 |
|---|---|---|---|
| szybki | 216 (149–272) | 203 (142–268) | 241 (190–288) |
| dobry | 221 (167–286) | 228 (178–287) | 258 (209–303) |
| wolny | 235 (184–306) | 226 (175–283) | 258 (228–312) |

Dziecko, które celowo gra trybami, których legendarnych mu brakuje, domyka kolekcję ~1/3 szybciej.
To pożądane: tryb ma znaczyć.

### Wrażliwość na próg pity (profil „dobry", 80/80)

| Wariant | 80/80 | Strażnicy Mostu 4/4 |
|---|---|---|
| bez pity (kontrola) | 1331 (798–2319) | 987 (527–2002) |
| pity co 15 | 463 (385–529) | 422 (295–499) |
| **pity co 12 (wdrożone)** | **385 (322–465)** | **336 (250–428)** |
| pity co 10 | 323 (264–395) | 289 (207–364) |
| + Jajko Życzeń z trybem (P1b) | 203 (184–225) | 178 (160–201) |

Sam cap progu (bez pity) sprowadza komplet z „nigdy" do ~1331 rund; pity 12 tnie to
do ~385. Pity 10 daje jeszcze ~15 % mniej, ale zaczyna dominować nad naturalnym losem
(większość legendarnych z gwarancji) — 12 zostaje.

## Ocena

**Cel osiągnięty.** Komplet kolekcji dla każdego profilu mieści się w oknie **~4,8 mies.–~5,1 mies.**
(p90 ≈ 445 rund ≈ 6 mies.), zamiast „nigdy w 3 lata". Różnica między szybkim i wolnym dzieckiem
spadła do ~5 % w czasie do kompletu; szybkość nagradza kolorem jajka, tęczą i wcześniejszym pierwszym legendarnym,
ale nie decyduje, czy koniec gry istnieje. Mapa i wioska bez zmian (jak zaprojektowano). Wyklucie co ~2 rundy
na zawsze (1472 jajek w 3000 rund zamiast 372).

## Co nadal nie gra (decyzje dla maintainera)

### D1. „Wszystkie osiągnięcia" wciąż nieosiągalne dla dziecka nieperfekcyjnego
Tęczowe jajko wymaga score ≥ 28 (średnio ≥ 2,8★ na jajko). Profil „dobry" (średnia ~2,3★) nie zobaczy
tęczowego **nigdy**, więc „Tęczowa niespodzianka" (1) i „Kolekcjoner tęczy" (3) są dla niego zamknięte,
a z nimi komplet osiągnięć. Szybkie dziecko ma 3 tęczowe w ~186 rund.
To **świadoma bariera prestiżu** (tęcza = niemal bezbłędnie), nie błąd — ale trzeba ją zaakceptować albo
przesunąć próg tęczy (np. mała szansa od 26) / obniżyć target „Kolekcjonera tęczy" do 2. Nie zmieniałem:
to decyzja o tym, czym ma być tęcza.

### D2. Iskierki nadal bez zlewu w późnej grze
Zlewy: wioska 1186 + kosmetyka 581 = **1767 ✨** + Jajka Życzeń. Dochód ~2,9 k ✨ / 3000 rund + ~520 z osiągnięć.
Portfel stoi pod capem przez ~90 % rund. Tła dodały ~150 ✨, duplikat × jakość podniósł
wpłaty z duplikatów, ale bez **powtarzalnego** zlewu problem strukturalnie zostaje.
Jedyny kandydat o realnym efekcie to Jajko Życzeń stemplowane trybem (P1b): 80/80 w ~203 rund
i ~14 zakupów zamiast 6. **Nie wdrożyłem**, bo osłabia obietnicę „legendarne wyłącznie przez dzielenie/lukę"
(po domknięciu pozostałych tierów staje się gwarantowanym zakupem ekskluzywnego za 30–130 ✨) i konkuruje
z wioską o iskierki (komplet wioski 144 → ~250 rund). Pity już dowozi cel; P1b to decyzja produktowa.
Alternatywy bez tego napięcia: kolejne tła/kosmetyka (append-friendly), droższe „dekoracje prestiżowe" wioski.

### D3. Osiągnięcia Jajka Życzeń a guard puli
Po komplecie puli mnożeniowej Jajko Życzeń jest niedostępne, więc „Spełnione życzenie" (1) i „Mistrz życzeń" (5)
trzeba zdobyć wcześniej. W symulacji każdy profil kupuje ≥ 5 jajek życzeń przed 50. rundą (to droga do
legendarnych bazowych), więc ryzyko jest teoretyczne — ale istnieje dla dziecka, które nigdy nie ustawi
wymarzonego. P1b rozwiązałoby to przy okazji.

### D4. Drobiazgi (bez zmian)
- Zamek dominuje racjonalną kolejność budowy (procent składany) — dziecko kupuje sercem, zostawiam.
- „Skarbnica iskier" (miej 100 ✨) nagradza nie-wydawanie — po retuningu i tak wpada przy capie.
- Trop z wyprawy nadal tylko ustawia wymarzonego; z pity ma sens jako podpowiedź „graj dzieleniem".

## Co działa (potwierdzone po retuningu)

- Mapa/bramy: 31–64 rund, niezależnie od waluty.
- Fontanna L1 + wymarzony = pierwszy legendarny w ~18 rund, cztery bazowe w ~38.
- Brak duplikatów w niedomkniętym tierze + cap progu: tiery pospolity/rzadki/epicki w 1,5–3 mies.
- Wioska komplet ~144 rund, kosmetyka ~213.
