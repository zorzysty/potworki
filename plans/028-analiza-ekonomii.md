# 028 — Analiza ekonomii gry (znaleziska, bez zmian w kodzie)

**Data:** 2026-07-25 · **Stan repo:** `main` @ `6f76b4e` (335 testów, SAVE_VERSION 14)
**Status:** ANALIZA — czeka na decyzje maintainera; żadna zmiana nie jest zaimplementowana.

Realizuje punkt „Reward-economy validation — NOW RIPE" z `plans/README.md`
(analiza statyczna liczb strojenia; symulacja `simulateRoundOutcome` na N rund
pozostaje możliwym następnym krokiem przed retuningiem).

## TL;DR

Ekonomia krótkiego i średniego dystansu (mapa, wioska) jest dobrze wystrojona.
Problem zaczyna się na długim dystansie: **komplet kolekcji to przy obecnych
liczbach ~9–14 miesięcy codziennej gry**, głównie przez 8 legendarnych
ekskluzywnych bez żadnej ochrony przed pechem, rosnący bez limitu próg jajka
i klif jakości jajek. Wszystkie osiągnięcia są zakładnikiem kolekcji,
a „Kolekcjoner tęczy" może nie wpaść nigdy.

Minimalny pakiet zmian o największym efekcie: **P1a (pity) + P2 (cap progu
jajka) + P3 (zmiękczenie klifu jakości)** — razem ścinają komplet kolekcji
z ~roku do ~3–4 miesięcy bez ruszania niczego, co działa.

## Założenia szacunków

- Runda = 10–12 pytań ≈ 3 min; ~11 fragmentów jajka/rundę; 2–3 rundy dziennie.
- „Dobra gra" = większość odpowiedzi w budżecie 3★, sporadyczne pomyłki →
  jajka głównie srebrne/złote (legendarny ~5–10% na jajko).
- Katalog: 36 common / 21 rare / 11 epic / 12 legendary
  (4 bazowe + 4 tylko-dzielenie + 4 tylko-luka).
- Kluczowa mechanika: w obrębie tieru duplikaty zdarzają się dopiero po jego
  skompletowaniu (`pickInTier` preferuje nieposiadane) — bardzo hojne i słuszne.

## Szacunki celów

| Cel | Skala | Czas przy 2–3 rundach/dzień |
|---|---|---|
| Cała mapa (6 bram) | ~40–70 rund (mastery, nie waluta) | **3–5 tygodni** ✅ |
| Cała wioska + dekoracje (1186 ✨) | dochód 2→8 ✨/rundę + 630 ✨ z osiągnięć → ~150–250 rund | **2–4 miesiące** ⚠️ (ogon: Zamek L3 250, Fontanna L3 120) |
| Kolekcja 80/80 | ~170–190 jajek ≈ ~9500 fragmentów ≈ **~850 rund** | **9–14 miesięcy** ❌ |
| Wszystkie osiągnięcia | zakładnik kolekcji + 3 tęczowe jajka + 25 rund perfekcyjnych | **≥ rok, realnie „może nigdy"** ❌ |

Rachunek dla kolekcji: ekskluzywne legendarne wymagają wylosowania tieru
legendarnego w jajku danego trybu — przy 5–10%/jajko to ~50–70 jajek dzielenia
i drugie tyle luki. Przy jajku #150 próg to już ~70 fragmentów (~6–7 rund na
jajko), więc jeden legendarny wypada średnio co ~30–70 rund *na tryb*.
Rozkład geometryczny → ogromna wariancja (pechowe dziecko czeka 2× dłużej).

Sumy zlewów: wioska 1140 (budynki) + 46 (dekoracje) = 1186 ✨; kosmetyka 426 ✨;
Jajka Życzeń ~200–300 ✨ (progresja +10/szt., dopłata capowana na 100).
Osiągnięcia płacą łącznie 630 ✨ (11×5 + 19×10 + 19×15 + 4×25).

## Zależności między celami

- osiągnięcia ← kolekcja ← jajka ← rundy;
- wioska ← iskierki (w ~35% z osiągnięć, które same są gate'owane kolekcją);
- Fontanna → Jajko Życzeń → domyka **tylko pulę mnożeniową** (bazowe 4 legendary
  można „wyczarować" z wymarzonym; 8 ekskluzywnych — nie);
- Plac Zabaw → wyprawy → +~2 ✨/rundę pasywnie (Wielka: 25 ✨ / 12 rund);
- mapa jest jedynym celem niesprzężonym z walutą — i jedynym idealnie wystrojonym.

## Problemy (od największego) z sugestiami

### P1. Ściana 8 legendarnych ekskluzywnych — brak ochrony przed pechem
Jajko Życzeń celowo ich nie obejmuje (`rollContext` filtruje dream spoza puli
trybu), trop z wyprawy to tylko wskazówka bez efektu mechanicznego. To ~70%
całkowitego czasu do kompletu kolekcji.
**Sugestie:**
- (a) licznik pity per tryb — gwarantowany legendarny co N jajek danego trybu
  (np. 12–15); wymaga nowego pola zapisu + migracji;
- (b) Fontanna L3 (albo nowy perk) sprzedaje Jajko Życzeń **stemplowane
  bieżącym trybem** — dzielenie/lukę nadal trzeba realnie grać, znika czysta
  loteria;
- (c) trop z Wielkiej Wyprawy po np. 3 powtórzeniach eskortuje wskazanego
  potworka (wyprawy dostają realny cel późnej gry).

### P2. Próg jajka rośnie bez limitu (`fragmentsForEgg`: +4 co 10 jajek)
Pętla nagrody rozciąga się z 1 rundy/jajko do 6–7 rund/jajko i dalej — dla
9-latki wyklucie (główny moment dopaminy) staje się coraz rzadsze *na zawsze*.
Mnożnik wszystkich pozostałych problemów.
**Sugestie:** cap progu (np. 22–26 fragmentów) albo fragmenty skalowane
gwiazdkami (2–3★ = 2 fragmenty) — zachowuje „wyklucie jest osiągnięciem"
wcześnie, stabilizuje tempo późno.

### P3. Klif jakości jajka: score < 26 → 100% normal (`qualityOdds`)
Dziecko poprawne, ale niemieszczące się w budżecie 3★ (avg ~2★), ma wiecznie
2% na legendarnego — jego kolekcja trwa ~3× dłużej niż szybkiego. Litera zasady
„szybkość tylko nagradza" zachowana, duch nie: kara ukryta w horyzoncie miesięcy.
**Sugestia:** łagodna interpolacja — srebro od score ~18–20, złoto od ~25,
zamiast schodka na 26.

### P4. Duplikaty płacą grosze dokładnie wtedy, gdy jajka są najdroższe
Po skompletowaniu common/rare/epic (na długo przed legendarnymi) jajko warte
6 rund pracy wypłaca 1–3 ✨ (`ISKIERKI_FOR_DUP`). Podczas polowania na
ekskluzywne ~90% wykluć to takie „puste" jajka.
**Sugestia:** nagroda za duplikat skalowana jakością jajka (np. złote ×3) albo
duplikat dokłada punkt do licznika pity z P1a — każde jajko wnosi widoczny postęp.

### P5. Tęczowe jajko wymaga ideału, a osiągnięcie żąda trzech
Score 30 = **każdy** z 14–30+ kolejnych fragmentów (przez kilka rund!) na 3★,
bez jednej literówki przy auto-submicie — i wtedy dopiero 40% szansy.
„Kolekcjoner tęczy" (3 szt., tier hard) jest realnie najtrudniejszym
osiągnięciem w grze, trudniejszym niż legendary'owe.
**Sugestie:** mała szansa na tęczowe już przy score 28–29 albo niższy target
osiągnięcia (target to liczba strojenia, nie tekst).

### P6. Iskierki tracą sens na długo przed końcem gry
Suma zlewów ≈ ~1900 ✨, a dochód ~6–8 ✨/rundę trwa przez ~850 rund → od ~1/3
drogi dziecko odbija się od capu 999; żołd/wyprawy/osiągnięcia przestają
znaczyć. Kosmetyka jest zaprojektowana jako powtarzalny zlew, ale katalog
jest skończony (426 ✨).
**Sugestie:** dosypywanie kosmetyki (katalog append-friendly z założenia;
najtańszy start: slot `background` — patrz „Direction findings" w README),
i/lub konwersja nadwyżki na postęp kolekcji (np. droższe Jajko Życzeń trybu
z P1b — rozwiązuje P1 i P6 naraz).

### P7. Zamek dominuje każdą racjonalną decyzję zakupową
Jedyny budynek z procentem składanym (+1..3 ✨/rundę) zawsze zwraca się
najszybciej — „poprawna" kolejność budowy jest z góry ustalona. Skok L1→L2
(20→100) to najostrzejszy klif wioski przy dochodzie ~3 ✨/rundę.
**Sugestia:** niski priorytet; ewentualnie spłaszczyć (L2 ~60–70) albo
zostawić — dziecko i tak kupuje sercem.

### P8. Drobiazgi
- Nagrody osiągnięć nie skalują z wysiłkiem: „Strażnicy Mostu" (~300 rund)
  = 15 ✨, tyle co „Łowca konstelacji" (~60 rund).
- „Opanuj wszystko" wymaga 55 faktów ≥0.8 *jednocześnie* przy decayu 3%/dzień —
  po każdej przerwie ogon ucieka; wykonalne, ale frustrogenne.
- Quirk: stempel trybu jajka nadaje **runda domykająca** (`addEggFragment`) —
  jajko zbudowane w mnożeniu, domknięte fragmentem w dzieleniu, jest
  „dzieleniowe". Działa raczej na korzyść dziecka; warto wiedzieć, że istnieje.

## Co działa dobrze (zachować)

- Ścieżka „pierwszy legendarny przez Fontannę + wymarzony" — świetnie
  zaprojektowana (L1 za 20 ✨ + wish 30 ✨ = gwarantowany legendarny).
- Brak duplikatów wewnątrz niedomkniętego tieru — hojne i słuszne.
- Wyprawy jako pasywny dochód bez zegara (postęp w rundach).
- 630 ✨ z osiągnięć jako ~35% finansowania wioski — dobre sprzężenie.
- Mapa/bramy: tempo idealne (mastery + utrzymanie starszych tabliczek).
