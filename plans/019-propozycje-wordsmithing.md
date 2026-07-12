# Plan 019: Przegląd PROPOZYCJI — nazewnicza runda maintainera

> **Executor instructions**: This plan has TWO actors: the MAINTAINER (the
> user — the only person who finalizes player-facing Polish copy, per the
> binding naming rule) and the EXECUTOR (applies his decisions). Do not
> invent or "improve" any name yourself — every string here is the user's
> call. The plan is a work order for the session in which the user has time
> for the naming pass.
>
> **Drift check (run first)**: `grep -rln "PROPOZYCJ" src vite.config.ts` —
> the file list below is the state at planning time (`2611422`); regenerate
> the inventory fresh (Step 1) rather than trusting this plan's snapshot.
>
> **DOX (this repo)**: read root `CLAUDE.md` + the chain for every file you
> touch. Renames of labels change no contracts, but `src/monsters/CLAUDE.md`
> MUST be read before Step 4 (monster names are part of the frozen-catalog
> signature).

## Status

- **Priority**: P2 (player-facing text quality; nothing blocks on it)
- **Effort**: S (executor) + the maintainer's wordsmithing time
- **Risk**: LOW — with one sharp edge (Step 4: monster names 76–79)
- **Depends on**: plans 012–018 DONE (they created most of the strings);
  **BLOCKED on maintainer input** — do not start the apply steps without
  his filled-in decision list
- **Category**: copy/polish
- **Planned at**: commit `2611422`, 2026-07-12

## Why this matters

Plans 012–018 shipped a large amount of player-facing Polish copy implemented
as PROPOZYCJE (the maintainer wordsmiths all names himself — recorded user
preference). The game is deployed with the proposals; they work, but they are
explicitly NOT final. This plan is the parking spot so the naming pass isn't
forgotten: it inventories every bank, records the special cases, and defines
the safe apply procedure. Labels are freely renameable — the persisted `id`s
and mode tokens are separate and frozen, which is exactly why this pass is
zero-risk when done right (and save-corrupting when done wrong; see STOP).

## String banks (categories + owners; regenerate fresh in Step 1)

| Category | Where (at `2611422`) | Notes |
|----------|----------------------|-------|
| Budynki wioski: nazwy, nazwy poziomów, opisy | `src/game/village.ts` (BUILDINGS, incl. sklepik „Stragan/Sklepik/Dom Mody Potworków") | labels only; ids frozen |
| Dekoracje | `src/game/village.ts` (DECORATIONS) | labels only |
| Kosmetyki: 17 nazw (kapelusze/aury/ramki) | `src/game/cosmetics.ts` | labels only |
| Wyprawy: 3 typy — nazwy + opisy | `src/game/expeditions.ts` | labels only |
| Regiony/świat: „Dolina Zagadek" (VALLEY_ORIGIN) i nazwy istniejących krain | `src/monsters/world.ts` | prezentacyjne, wolno zmieniać |
| Tryb luki: etykieta przełącznika („? Zgadnij"), HelpTip, znaczniki 🧩 copy | `src/screens/HomeScreen.tsx`, powiązane ekrany | mode TOKEN `"gap"` = KOD, NIGDY nie zmieniać |
| Odwiedziny Strażnika: karta-zaproszenie, pigułka regionu, baner podziękowania, linia tajemnicy | `src/screens/HomeScreen.tsx`, `RoundScreen.tsx`, `RoundSummary.tsx` | uwaga na interpolację mianownika nazwy regionu |
| Wioska: HelpTip, pasek celu, badge „stać cię!", arkusz budowy, chip żołdu | `src/screens/VillageScreen.tsx`, `RoundSummary.tsx`, `components/village/BuildSheet.tsx` | |
| Karta kolekcjonerska: sekcje „Ubierz 🎩"/„Wyprawa 🎒", trop copy | `src/screens/CollectionScreen.tsx` | |
| Dymki potworków (banki fraz) | `src/components/companionPhrases.ts` | pre-012, nadal robocze |
| Osiągnięcia: 48 tytułów + opisów | `src/achievements/catalog.ts` | tytuły/opisy WOLNO edytować; `id` NIGDY |
| PWA manifest: name/short_name/description, kolory splash | `vite.config.ts` | wymaga rebuild+deploy, na urządzeniu nazwa zmienia się po reinstalacji ikony |
| **Imiona potworków 76–79** (Królewski Plulka, Wielki Mrupuś, Złoty Łapfik, Królewski Pimsio) | `src/monsters/catalog.ts` | **SHARP EDGE — patrz Step 4** |

## Steps

### Step 1: Executor — regenerate the inventory

`grep -rn "PROPOZYCJ" src vite.config.ts` and walk each hit's surrounding
bank. Produce a single decision file for the maintainer (suggested:
`plans/019-inwentarz.md`, git-ignored or committed — maintainer's call) with
every current string, grouped by the categories above, each with an empty
"→ nowa wersja" column. Include the achievements titles even though their
marker says "robocze" rather than PROPOZYCJE.

### Step 2: Maintainer — wordsmithing pass

Fill in the decision file (leave blank = keep proposal). No code knowledge
needed; strings only.

### Step 3: Executor — apply label renames

Apply decisions to label/description/title fields ONLY. Then:
`bun run typecheck && bun test && bun run build && bun run check` — all green.
Update any DOX docs that quote renamed labels verbatim (grep the old strings
across `**/CLAUDE.md`). Manifest changes: note in the commit that installed
PWAs show the new name after the SW update cycle.

### Step 4: Monster names 76–79 (only if the maintainer renames them)

Monster names are INSIDE the frozen-catalog signature. Renaming requires the
documented conscious-update procedure in `src/monsters/CLAUDE.md` (first 76
entries stay byte-identical; regenerate the signature literal; the reviewer
treats a signature diff as intentional). **The safe rename window is only
while the child has not hatched ids 76–79** — after that, renaming changes
"her" monster's name mid-collection (mild, but the maintainer should decide
knowingly). Check her device's save before assuming the window is open.

### Step 5: Closeout

Remove `PROPOZYCJE`/`robocze` markers from banks the maintainer confirmed
(keep markers wherever he left blanks deliberately unreviewed). Update the
plans/README.md row. Commit; deploy is the standard main fast-forward.

## Done criteria

- [ ] Decision file existed and every category was presented to the maintainer
- [ ] Only label/title/description/name-string fields changed — `git diff`
      shows NO changes to: any `id` field, `GameMode`/mode tokens, `SaveState`
      keys, achievement ids, cosmetics/expedition/building/decoration ids
- [ ] `bun run typecheck`, `bun test`, `bun run build`, `bun run check` — exit 0
- [ ] Catalog signature test: unchanged unless Step 4 was exercised, in which
      case the diff is exactly the documented procedure
- [ ] Markers removed only for confirmed banks
- [ ] plans/README.md row updated

## STOP conditions

- Any rename that would touch a persisted `id`, the `"gap"` token, or a
  `SaveState` key — labels and ids live in separate fields by design; if a
  rename seems to require an id change, the design is being misread. STOP.
- Step 4 attempted without reading `src/monsters/CLAUDE.md` or with the
  child's save already containing ids 76–79 and no explicit maintainer
  acknowledgment.
- The maintainer's decision file is missing or partially filled and the
  executor is tempted to "fill the gaps creatively" — blanks mean KEEP.

## Maintenance notes

- New features must keep marking fresh player-facing strings with
  `PROPOZYCJE` — this plan is repeatable; re-run the inventory any time.
- The user's memory note ("Flavor text naming") is the durable record of the
  preference; this plan is its actionable instance for the 012–018 batch.
