# Inwentarz PROPOZYCJI — zatwierdzony (plan 019)

> **ZAMKNIĘTE 2026-07-25: maintainer przejrzał całość i zatwierdził wszystkie
> teksty BEZ ZMIAN.** Znaczniki `PROPOZYCJE` zostały zdjęte z `src/` i
> `vite.config.ts`. Plik zostaje jako zrzut zatwierdzonego stanu tekstów —
> punkt odniesienia przy następnym przeglądzie. Nic tu nie trzeba wypełniać.

Stan na `ced517c` (2026-07-25). Kolumna „→ nowa wersja" jest pusta wszędzie,
bo taka była decyzja: puste = ZOSTAJE jak jest.

Przy bankach fraz (dymki potworków) nie ma tabeli — teksty są wypisane wprost.

## Zasady bezpieczeństwa (obowiązują przy KAŻDYM następnym przeglądzie)

- Zmieniamy **wyłącznie** pola `name` / `title` / `description` / teksty w JSX.
- `id` budynków, dekoracji, kosmetyk, wypraw i osiągnięć są **persystowane w
  zapisie** — nigdy ich nie ruszamy. Tak samo tokeny trybów (`mult`/`div`/`gap`).
  Dlatego dowolna zmiana nazw jest bezpieczna dla zapisu córki.
- Jeden wyjątek z ostrzeżeniem: **imiona potworków 76–79** (sekcja na końcu).

---

## 1. Tryby gry — przełącznik na ekranie głównym

`src/screens/HomeScreen.tsx:149`. Przyciski muszą się zmieścić bez zawijania
przy szerokości 360 px (trzy w rzędzie).

| token (KOD, nie zmieniamy) | obecnie | → nowa wersja |
|---|---|---|
| `mult` | × Mnożenie | |
| `div` | ÷ Dzielenie | |
| `gap` | ? Zgadnij | |

## 2. Odwiedziny u Strażnika

| gdzie | obecnie | → nowa wersja |
|---|---|---|
| Home, karta-zaproszenie (nagłówek) | Strażnik {nazwa krainy} zaprasza cię w odwiedziny! {emoji} | |
| Home, podtytuł zaproszenia | Odśwież starą tabliczkę ×{cyfra} | |
| Home, gdy Strażnik jeszcze nieznany | Poznasz go, gdy go wyklujesz! | |
| Runda, pigułka regionu | {emoji} Odwiedziny: {nazwa krainy} | |
| Podsumowanie, baner podziękowania | Strażnik dziękuje za odwiedziny! 💛 +2 ✨ | |

> Uwaga na odmianę: nazwa krainy wchodzi w mianowniku („Strażnik Wioska
> Startowa zaprasza…"). Jeśli chcesz dopełniacz („Strażnik Wioski Startowej"),
> powiedz — to wymaga dodania drugiej formy nazwy do `REGIONS`.

## 3. Wyprawy potworków — teksty UI

| gdzie | obecnie | → nowa wersja |
|---|---|---|
| Karta potworka, nagłówek sekcji | Wyprawa 🎒 | |
| Karta potworka, status podróżnika | 🎒 W drodze: {x}/{y} rund | |
| Karta potworka, przycisk odwołania | Zawróć | |
| Karta potworka, gdy to przyjaciel | Przyjaciel woli zostać z Tobą 💛 | |
| Karta potworka, gdy ktoś inny w drodze | Ktoś już jest na wyprawie — poczekaj na jego powrót | |
| Karta potworka, gdy podróżnik ≠ przyjaciel | 🎒 Wróci z wyprawy — wtedy możecie się zaprzyjaźnić! | |
| Home, chip postępu | {imię}: {x}/{y} rund | |
| Wioska, dymek przy obozie | 🎒 {imię}: {x}/{y} rund | |
| Podsumowanie, powrót | Wrócił(a) z wyprawy! +{n} ✨ | |
| Podsumowanie, trop | Ktoś tajemniczy zostawił ślad! | |
| Podsumowanie, przycisk tropu | Ustaw jako wymarzonego! ✨ | |

## 4. Wioska i budowanie — teksty UI

| gdzie | obecnie | → nowa wersja |
|---|---|---|
| Home, badge przy przycisku Wioski | ✨ stać cię na budowę! | |
| Wioska, nagłówek paska celu | Cel: {nazwa} | |
| Wioska, po komplecie | 🏆 Wioska w pełnej krasie! | |
| Arkusz, przycisk budowy | Zbuduj! ✨{n} / Ulepsz! ✨{n} | |
| Arkusz, brak środków (nigdy jako błąd) | ✨ {x}/{y} — graj dalej! | |
| Arkusz, wybór celu | Mój cel! ⭐ / To mój cel! ⭐ | |
| Arkusz, sekcja Sklepiku | Na półkach | |
| Arkusz, zablokowany tier | Ulepsz Sklepik! 🔒 | |
| Arkusz, po zakupie kosmetyki | Załóż w Moich Potworkach → Ubierz 🎩 | |
| Animacja budowy | Budujemy… 🔨 → Zbudowane! 🎉 | |

## 5. Karta potworka i garderoba

| gdzie | obecnie | → nowa wersja |
|---|---|---|
| Nagłówek garderoby | Ubierz 🎩 | |
| Pusta garderoba | Kapelusze kupisz w Sklepiku w Wiosce! | |
| Rządek ramek — etykieta | Ramka | |
| Rządek ramek — brak ramki | Bez ramki | |
| Przycisk przyjaciela | Zostań moim przyjacielem! 💛 | |
| Gdy to już przyjaciel | 💛 To Twój przyjaciel | |
| Wymarzony — ustawienie | To mój wymarzony potworek! 💖 | |
| Wymarzony — rezygnacja | Już go nie chcę 💔 | |
| Znacznik tylko-dzielenie | ➗ Tylko za dzielenie | |
| Znacznik tylko-luka | 🧩 Tylko za zgadywanie liczby | |

## 6. Runda, mapa, osiągnięcia — pozostałe teksty

| gdzie | obecnie | → nowa wersja |
|---|---|---|
| Pauza — nagłówek | Przerwa ⏸ | |
| Pauza — powrót do gry | Gram dalej! 🚀 | |
| Pauza — wyjście | Koniec na dziś | |
| Podsumowanie — odblokowanie | Nowa brama otwarta! 🎉 | |
| Splash bramy | Brama się otwiera… → Nowa kraina! | |
| Mapa — sekcja legendarnych | 🌉 Most Strażników | |
| Osiągnięcia — reset | Zacznij od nowa / Zacznij od nowa? | |

## 7. Dymki potworków (`src/components/companionPhrases.ts`)

Edytuj wprost — to banki losowane, kolejność bez znaczenia.
`{imie}` podmienia się na imię przyjaciela; w wiosce imienia NIE podstawiamy.

### Powitanie (ta sama sesja / zwykłe wejście)

```
Cześć! Czekałem na ciebie 💛        O, jesteś! Bawmy się!
Hej, hej! Co dziś gramy?            {imie} macha do ciebie 👋
Dobrze, że jesteś!                  Witaj z powrotem!
Cześć, kumpelo!                     Jak miło cię widzieć!
Hejka! Gotowa na potworki?          Siemka! Trochę mi się nudziło 💛
O, moja ulubiona osoba!             {imie} czekał właśnie na ciebie!
Super, że wróciłaś!                 Cześć! Mam ochotę na zabawę 🎈
Witaj, witaj!                       Hej! Razem będzie wesoło!
```

### Powitanie nowego dnia

```
Dzień dobry! Nowy dzień, nowe potworki ✨    Gotowa na przygodę?
Witaj! Zaczynamy?                            Dzień dobry! Pięknie dziś świeci ☀️
Nowy dzień — nowe wyzwania!                  Dzień dobry, śpiochu! 😴
Hej! Dziś będzie świetny dzień!              Dobry ranek! Co dziś zdobędziemy?
Witaj w nowym dniu! 🌞                       Dzień dobry! Wyspałaś się?
Nowy dzień, nowe iskierki ✨                 Cześć! Zaczynamy z przytupem!
```

### Powitanie po dłuższej przerwie (nigdy z wyrzutem!)

```
Tęskniłem za tobą! 💛              Wróciłaś! Najlepszy dzień!
Tyle się działo — chodź do wioski!  Ojej, ale się stęskniłem! 💛
Wróciłaś! Skakałem z radości!       Najlepsza wiadomość dnia — jesteś!
Czekałem cierpliwie i już jesteś! 🥰 Hura, wróciłaś do nas!
Wioska czekała na ciebie!           Tęskniliśmy wszyscy! 💛
Jak dobrze, że znów razem!          Wróciłaś! Świętujemy! 🎉
```

### Dotyk potworka w wiosce (bez imienia)

```
Łaskocze! 😆      Hihi!            Hop!              Cześć!
Jeszcze raz!      Buu! 👻          Hej, widzę cię!   Hop, hop!
Połaskocz jeszcze! Jestem tu!      Brzdęk!           Hejka!
Ale fajnie skaczę, co?             Lubię cię! 💚     Robimy psikusa?
Pstryk!           Tu jestem!       Mniam, ciasteczko? 🍪
```

### Dotyk przyjaciela na Home (dodatkowo do powyższych)

```
To ja, {imie}! 💛        {imie} cię lubi!       Pogłaszcz mnie jeszcze!
Jesteśmy zgranym duetem! Razem damy radę!       Najlepszy z ciebie kumpel!
{imie} jest gotowy do gry!                      Bawimy się dalej? 🎈
```

### Rzadka „wygrana" przy dotyku

```
Hura! 🎉         Ale super!        Najlepszy dzień!   Wow, ale czad!
To było ekstra!  Niesamowite!      Jesteś the best! ⭐ Tańczymy! 💃
Mega zabawa!     Łapię cię w skok! 🤸   Bomba!        Pełnia radości! 🌈
```

## 8. Teksty pomocy (znaczki „?")

Dłuższe, tłumaczą mechanikę.

| gdzie | obecnie | → nowa wersja |
|---|---|---|
| Home — wymarzony | To potworek, o którym marzysz. Teraz częściej będzie się wykluwał, a Jajko Życzeń (w „Moich Potworkach") da ci dokładnie jego. Stuknij obrazek, żeby go obejrzeć. | |
| Home — przełącznik trybów | Wybierz, czego chcesz ćwiczyć: mnożenie, dzielenie albo zgadywanie brakującej liczby. Niektóre wyjątkowe potworki wykluwają się tylko z takich jajek! | |
| Home — gniazdo | Tu czekają twoje jajka. Kiedy pasek się zapełni, do gniazda wskoczy nowe jajko. Stuknij gniazdo, żeby wykluć potworka! | |
| Home — mapa | To tabliczki mnożenia. Te z kłódką 🔒 jeszcze śpią. Kiedy dobrze opanujesz odblokowane liczby, kłódka pęknie i pojawi się nowa! | |
| Kolekcja — iskierki | To twoje iskierki ✨. Dostajesz je, gdy z jajka wykluje się potworek, którego już masz. Uzbieraj ich dość, a kupisz Jajko Życzeń! | |
| Kolekcja — Jajko Życzeń | Kupujesz je za iskierki ✨. Masz wymarzonego potworka? Dostaniesz dokładnie jego — na pewno! Nie masz? Wykluje się jakiś nowy potworek, którego jeszcze nie masz. (Sam wymarzony jest za darmo i tylko sprawia, że zwykłe jajka częściej wykluwają właśnie jego.) | |
| Kolekcja — przyjaciel | Przyjaciel zamieszka na ekranie głównym i będzie Ci kibicował przy dobrych odpowiedziach. Możesz go zmienić, kiedy tylko chcesz. | |
| Kolekcja — wymarzony | Zaznacz potworka, o którym marzysz. Będzie na ciebie czekał — częściej będzie się wykluwał, a Jajko Życzeń da ci dokładnie jego. Możesz mieć tylko jednego wymarzonego naraz. | |
| Kolekcja — wyprawa | Wyślij potworka na wyprawę! Każda ukończona runda przybliża go do powrotu — wróci z iskierkami ✨. W każdej chwili możesz go zawrócić, nic się nie stanie. | |
| Wioska | To dom twoich potworków! Zbieraj ✨ iskierki i buduj — każdy budynek zmienia wioskę, a potworki się do niego wprowadzą. Stuknij szary zarys, żeby zobaczyć, co możesz zbudować! | |
| Mapa | To Twoja wyprawa! Każda brama kryje nową tabliczkę. Graj i zdobywaj kryształy — gdy zapalą się wszystkie, brama otworzy się sama i poznasz nową krainę! | |
| Mapa — Most | Te cztery potworki strzegą Mostu. Zdobędziesz je tylko grając w dzielenie ➗! | |
| Osiągnięcia | To twoje osiągnięcia 🏅. Zdobywasz je za różne sukcesy w grze — a za każde dostajesz iskierki ✨! Pasek pokazuje, jak blisko jesteś. | |

## 9. Manifest PWA (`vite.config.ts`)

Nazwa widoczna przy instalacji na tablecie. Zmiana wymaga deployu, a na już
zainstalowanej appce podpis ikony zmienia się dopiero po cyklu aktualizacji SW
(czasem dopiero po reinstalacji).

| pole | obecnie | → nowa wersja |
|---|---|---|
| `name` | Potworki | |
| `short_name` | Potworki | |
| `description` | Zbieraj potworki, ćwicząc mnożenie i dzielenie! | |

---

## 10. Katalogi danych (nazwy i opisy)

Wygenerowane wprost z kodu, więc nic nie zginęło po drodze.

### Budynki wioski (`src/game/village.ts`)


**`ogrodek`** — nazwa: **Ogródek**

| pole | obecnie | → nowa wersja |
|---|---|---|
| nazwa budynku | Ogródek | |
| nazwa L1 | Ogródek | |
| nazwa L2 | Ogród | |
| nazwa L3 | Ogród Cudów | |
| opis L1 | Na łące zakwitną kwiatki! | |
| opis L2 | Przylecą motylki! | |
| opis L3 | Wyrosną tęczowe kwiaty! | |

**`plac-zabaw`** — nazwa: **Plac Zabaw**

| pole | obecnie | → nowa wersja |
|---|---|---|
| nazwa budynku | Plac Zabaw | |
| nazwa L1 | Zjeżdżalnia | |
| nazwa L2 | Plac Zabaw | |
| nazwa L3 | Mega Plac Zabaw | |
| opis L1 | Potworki będą zjeżdżać ze zjeżdżalni! | |
| opis L2 | Dojdzie huśtawka dla potworków! | |
| opis L3 | Trampolina — hop, hop! | |

**`latarnie`** — nazwa: **Latarnie**

| pole | obecnie | → nowa wersja |
|---|---|---|
| nazwa budynku | Latarnie | |
| nazwa L1 | Latarnia | |
| nazwa L2 | Aleja Latarni | |
| nazwa L3 | Latarnie Świetlików | |
| opis L1 | Ciepłe światełko rozjaśni wioskę. | |
| opis L2 | Przylecą świetliki! | |
| opis L3 | Stuknij latarnię, a zapadnie wieczór (i wróci dzień)! | |

**`domki`** — nazwa: **Domki**

| pole | obecnie | → nowa wersja |
|---|---|---|
| nazwa budynku | Domki | |
| nazwa L1 | Domek | |
| nazwa L2 | Domki | |
| nazwa L3 | Miasteczko Domków | |
| opis L1 | Potworki dostaną domek i będą w nim przysypiać. | |
| opis L2 | Więcej domków — więcej potworków naraz w wiosce! (Przyda się, gdy będzie was więcej.) | |
| opis L3 | Całe miasteczko! Jeszcze więcej potworków naraz. | |

**`fontanna`** — nazwa: **Fontanna**

| pole | obecnie | → nowa wersja |
|---|---|---|
| nazwa budynku | Fontanna | |
| nazwa L1 | Fontanna | |
| nazwa L2 | Lśniąca Fontanna | |
| nazwa L3 | Fontanna Marzeń | |
| opis L1 | Woda zacznie się skrzyć iskierkami. | |
| opis L2 | Potworki będą drzemać przy pluskającej wodzie. | |
| opis L3 | W wodzie odbije się potworek, o którym marzysz! | |

**`zamek`** — nazwa: **Zamek**

| pole | obecnie | → nowa wersja |
|---|---|---|
| nazwa budynku | Zamek | |
| nazwa L1 | Wieżyczka | |
| nazwa L2 | Zamek | |
| nazwa L3 | Zamek Iskierek | |
| opis L1 | +1 ✨ za każdą ukończoną rundę! | |
| opis L2 | +2 ✨ za każdą ukończoną rundę! | |
| opis L3 | +3 ✨ za każdą ukończoną rundę! | |

**`sklepik`** — nazwa: **Sklepik**

| pole | obecnie | → nowa wersja |
|---|---|---|
| nazwa budynku | Sklepik | |
| nazwa L1 | Stragan | |
| nazwa L2 | Sklepik | |
| nazwa L3 | Dom Mody Potworków | |
| opis L1 | Kapelusze dla potworków! (Ubierasz w Moich Potworkach.) | |
| opis L2 | Nowe nakrycia głowy i pierwsze aury! | |
| opis L3 | Najpiękniejsze aury i stroje — moda na całą wioskę! | |

### Dekoracje (`src/game/village.ts`)

| id | obecnie | → nowa wersja |
|---|---|---|
| `kwiatki` | Kwiatki | |
| `sciezka` | Ścieżka | |
| `hustawka` | Huśtawka na drzewie | |
| `staw` | Staw z kaczuszką | |
| `pomnik` | Pomnik Pierwszego Potworka | |
| `tecza` | Tęcza | |

### Kosmetyki — Sklepik (`src/game/cosmetics.ts`)

| id | slot | obecnie | → nowa wersja |
|---|---|---|---|
| `czapka-z-pomponem` | hat | Czapka z pomponem | |
| `kokarda` | hat | Kokarda | |
| `kapelusz-slomkowy` | hat | Kapelusz słomkowy | |
| `czapka-urodzinowa` | hat | Czapka urodzinowa | |
| `melonik` | hat | Melonik | |
| `wianek` | hat | Wianek | |
| `aura-serduszek` | aura | Aura serduszek | |
| `aura-gwiazdek` | aura | Aura gwiazdek | |
| `kapelusz-czarodzieja` | hat | Kapelusz czarodzieja | |
| `korona-lodowa` | hat | Korona lodowa | |
| `aura-teczy` | aura | Aura tęczy | |
| `rama-kwiatki` | frame | Ramka w Kwiatki | |
| `rama-serduszka` | frame | Ramka z Serduszek | |
| `rama-zlota` | frame | Złota Rama | |
| `rama-gwiezdna` | frame | Gwiezdna Rama | |
| `rama-teczowa` | frame | Tęczowa Rama | |

### Wyprawy (`src/game/expeditions.ts`)

| id | pole | obecnie | → nowa wersja |
|---|---|---|---|
| `zwiad` | nazwa | Zwiad | |
| `zwiad` | opis | Szybki wypad na skraj łąki — sprawdzić, co słychać. | |
| `wyprawa` | nazwa | Wyprawa | |
| `wyprawa` | opis | Wędrówka przez wzgórza do sąsiedniej krainy. | |
| `wielka` | nazwa | Wielka Wyprawa | |
| `wielka` | opis | Daleka podróż za wszystkie bramy — wróci z tropem! | |

### Krainy i pochodzenie (`src/monsters/world.ts`)

| co | obecnie | → nowa wersja |
|---|---|---|
| kraina etapu 0 | 🏡 Wioska Startowa | |
| kraina etapu 1 | 🔺 Trójkątna Piramida | |
| kraina etapu 2 | 🍀 Kraina Czterolistnej Koniczyny | |
| kraina etapu 3 | 🍯 Sześciokątne Plastry Miodu | |
| kraina etapu 4 | 🌟 Dziewięciogwiezdna Przystań | |
| kraina etapu 5 | 🌈 Tęczowy Most Siedmiu Barw | |
| kraina etapu 6 | ♾️ Ósemkowa Spirala Nieskończoności | |
| most (tylko-dzielenie) | 🌉 Kraina za Mostem | |
| dolina (tylko-luka) | 🧩 Dolina Zagadek | |

### Imiona potworków 76–79 — tylko-luka (`src/monsters/catalog.ts`)

> ⚠️ Zmiana rusza ZAMROŻONY podpis katalogu — patrz ostrzeżenie niżej.

| id | obecnie | → nowa wersja |
|---|---|---|
| 76 | Królewski Plulka | |
| 77 | Wielki Mrupuś | |
| 78 | Złoty Łapfik | |
| 79 | Królewski Pimsio | |

### Osiągnięcia — 53 pozycji (`src/achievements/catalog.ts`)

| id | tytuł | opis | → nowy tytuł | → nowy opis |
|---|---|---|---|---|
| `pierwsza-runda` | Pierwszy krok | Zagraj swoją pierwszą rundę. | | |
| `pierwszy-potwor` | Nowy przyjaciel | Zdobądź swojego pierwszego potworka. | | |
| `pierwsze-jajko` | Jajko gotowe! | Uzbieraj swoje pierwsze jajko. | | |
| `pierwsze-dzielenie` | Dzielę i rządzę | Odpowiedz poprawnie w trybie dzielenia. | | |
| `kolekcja-5` | Mała drużyna | Zbierz 5 potworków. | | |
| `brama-1` | Odkrywca krain | Otwórz swoją pierwszą nową bramę. | | |
| `opanuj-5` | Pierwsze sukcesy | Opanuj 5 różnych działań. | | |
| `kolekcja-15` | Kolekcjoner | Zbierz 15 potworków. | | |
| `pierwszy-legendarny` | Legenda! | Zdobądź swojego pierwszego legendarnego potworka. | | |
| `komplet-pospolitych` | Komplet pospolitych | Zbierz wszystkie pospolite potworki. | | |
| `jajka-10` | Gospodarz gniazda | Uzbieraj 10 jajek. | | |
| `jajko-zyczen` | Spełnione życzenie | Wyczaruj Jajko Życzeń. | | |
| `mistrz-siodemek` | Mistrz siódemek | Opanuj całą tabliczkę z siódemką. | | |
| `opanuj-30` | Połowa drogi | Opanuj 30 różnych działań. | | |
| `dzielenie-50` | As dzielenia | Odpowiedz poprawnie 50 razy w trybie dzielenia. | | |
| `rundy-25` | Wytrwały | Zagraj 25 rund. | | |
| `gwiazdki-500` | Łowca gwiazd | Zbierz łącznie 500 gwiazdek. | | |
| `kolekcja-40` | Wielki łowca | Zbierz 40 potworków. | | |
| `kolekcja-komplet` | Mistrz Kolekcji | Zbierz wszystkie potworki. | | |
| `komplet-epickich` | Komplet epickich | Zbierz wszystkie epickie potworki. | | |
| `teczowe-jajko` | Tęczowa niespodzianka | Wykluj tęczowe jajko. | | |
| `opanuj-wszystko` | Mistrz tabliczki | Opanuj wszystkie działania. | | |
| `wszystkie-bramy` | Władca Krain | Otwórz wszystkie bramy. | | |
| `straznik-mostu` | Strażnik Mostu | Zdobądź legendarnego potworka tylko z dzielenia. | | |
| `bez-pomylki` | Bez pomyłki! | Zakończ rundę z kompletem gwiazdek (30/30). | | |
| `mistrz-osemek` | Mistrz ósemek | Opanuj całą tabliczkę z ósemką. | | |
| `skarbnica-iskier` | Skarbnica iskier | Uzbieraj 100 iskierek. | | |
| `kolekcjoner-teczy` | Kolekcjoner tęczy | Wykluj 3 tęczowe jajka. | | |
| `jajka-25` | Pełne gniazdo | Uzbieraj 25 jajek. | | |
| `jajka-zyczen-5` | Mistrz życzeń | Wyczaruj 5 Jajek Życzeń. | | |
| `dni-grania` | Codzienny trening | Zagraj w 7 różnych dni. | | |
| `komplet-rzadkich` | Komplet rzadkich | Zbierz wszystkie rzadkie potworki. | | |
| `komplet-legendarnych` | Komplet legendarnych | Zbierz wszystkie legendarne potworki. | | |
| `straznicy-krain` | Strażnicy Krain | Zdobądź strażnika każdej krainy. | | |
| `wszyscy-straznicy-mostu` | Strażnicy Mostu | Zdobądź wszystkie legendarne potworki z dzielenia. | | |
| `mistrz-dzielenia` | Mistrz dzielenia | Odpowiedz poprawnie 200 razy w trybie dzielenia. | | |
| `perfekcyjne-25` | Perfekcjonista | Zakończ 25 rund z kompletem gwiazdek (30/30). | | |
| `rundy-100` | Niezłomny | Zagraj 100 rund. | | |
| `gwiazdki-1500` | Łowca konstelacji | Zbierz łącznie 1500 gwiazdek. | | |
| `dni-grania-14` | Codzienny trening II | Zagraj w 14 różnych dni. | | |
| `dni-grania-21` | Codzienny trening III | Zagraj w 21 różnych dni. | | |
| `pierwsza-budowla` | Pierwsza budowla | Zbuduj coś w wiosce. | | |
| `wioska-w-rozkwicie` | Wioska w rozkwicie | Zbuduj wszystkie budynki w wiosce. | | |
| `wielki-budowniczy` | Wielki budowniczy | Ulepsz każdy budynek wioski na najwyższy poziom. | | |
| `pierwsza-luka` | Detektyw liczb | Zgadnij brakującą liczbę w trybie zgadywania. | | |
| `luka-50` | Tropiciel zagadek | Zgadnij brakującą liczbę 50 razy. | | |
| `pierwsza-wyprawa` | Pierwsza wyprawa | Wyślij potworka na wyprawę i przywitaj go po powrocie. | | |
| `obiezyswiat` | Obieżyświat | Ukończ 10 wypraw potworków. | | |
| `pierwszy-stroj` | Pierwszy strój | Kup swój pierwszy przedmiot w Sklepiku. | | |
| `wystrojony-potworek` | Wystrojony potworek | Załóż jednemu potworkowi dwie rzeczy naraz. | | |
| `dekorator` | Dekorator wioski | Kup wszystkie dekoracje do wioski. | | |
| `mistrzowie-doliny` | Mistrzowie Doliny | Zdobądź wszystkie potworki z Doliny Zagadek. | | |
| `gosc-straznika` | Gość Strażnika | Ukończ 5 rund-odwiedzin u Strażnika. | | |

---

## ⚠️ Ostrzeżenie do imion potworków 76–79

Imiona potworków są **częścią zamrożonego podpisu katalogu** (test pilnuje, że
seed się nie ruszył — to on gwarantuje, że kolekcja córki nigdy nie zmieni się
pod nią). Zmiana imion 76–79 jest wykonalna udokumentowaną procedurą
(`src/monsters/CLAUDE.md`), ale:

- **Bezpieczne okno trwa tylko dopóki córka nie wykluła żadnego z 76–79.** Po
  wykluciu zmiana oznacza, że „jej" potworek zmienia imię w trakcie kolekcji.
- Zanim to ruszę, sprawdzę zapis na jej urządzeniu (`?debug` → galeria) albo
  poproszę Ciebie o potwierdzenie.
- To jedyna pozycja w tym inwentarzu, która nie jest czystą zmianą etykiety.

## Co dalej

1. Wypełnij, co chcesz zmienić (puste = zostaje).
2. Powiedz „zastosuj" — podmienię teksty, uruchomię `bun run verify` + build,
   zaktualizuję DOX tam, gdzie cytuje stare etykiety dosłownie, i zdejmę
   znaczniki `PROPOZYCJE` z banków, które zatwierdziłeś (tam, gdzie zostawisz
   pusto, znacznik zostaje — to sygnał, że tekst nadal czeka na przegląd).
