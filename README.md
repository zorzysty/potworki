# Potworki 👾

Gra przeglądarkowa do nauki tabliczki mnożenia (do 10×10) dla dzieci. Poprawne
odpowiedzi dają jajka, z których wykluwają się kolekcjonowane potworki (76 sztuk,
4 poziomy rzadkości). Gra adaptacyjnie częściej podsuwa działania, które idą
dziecku gorzej, i stopniowo odblokowuje kolejne tabliczki (start: ×1, ×2, ×5, ×10).

Działa na tablecie (dotyk) i laptopie (klawiatura). Postęp zapisywany w
localStorage — osobno na każdym urządzeniu.

## Komendy

```bash
bun i             # instalacja
bun run dev       # dev server
bun run build     # build produkcyjny (tsc + vite)
bun run preview   # podgląd builda
bun run typecheck # sam typecheck
```

## Deploy (GitHub Pages)

1. Utwórz repo `potworki` na GitHubie i wypchnij `main`.
2. W ustawieniach repo: **Settings → Pages → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` buduje i publikuje automatycznie
   przy każdym pushu do `main`. Gra będzie pod
   `https://<user>.github.io/potworki/`.

Jeśli zmienisz nazwę repo, popraw `base` w `vite.config.ts`.

## Tryb debug

Otwórz grę z `?debug` w adresie (np. `http://localhost:5100/potworki/?debug`) —
na dole ekranu głównego pojawi się link **debug**: tabela mastery wszystkich 55
działań, galeria 76 potworków, przyciski do testowania (ustawianie mastery,
dodawanie jajek/iskierek, reset zapisu).

## Ważne dla utrzymania

- **Nie zmieniaj** `GLOBAL_SEED` ani kodu generacji w `src/monsters/catalog.ts`
  po wydaniu — zapisujemy tylko `monsterId`, więc zmiana generacji podmienia
  całą kolekcję na urządzeniu dziecka.
- Schemat zapisu jest wersjonowany (`src/store/schema.ts`). Przy zmianie
  kształtu `SaveState` podbij `SAVE_VERSION` i dodaj wpis do `MIGRATIONS` —
  wzorzec w komentarzu.
- Mechanika i algorytm adaptacyjny opisane w komentarzach w `src/game/`.
