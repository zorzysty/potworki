# Plan 002: Correct the stale monster count in README (48 → 72)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3398a0d..HEAD -- README.md src/monsters/catalog.ts`
> If `README.md` changed since this plan was written, re-check the line numbers
> in "Current state" against the live file before editing; on a mismatch, find
> the equivalent lines (search for "48") rather than trusting the numbers.
>
> **DOX (this repo)**: This repo uses a binding `CLAUDE.md` hierarchy. `README.md`
> is owned by the root scope (root `CLAUDE.md` "Komendy"/"Ważne dla utrzymania").
> Read root `CLAUDE.md` before editing. This change is a factual correction to
> end-user docs and updates no contract, so no `CLAUDE.md` needs editing.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `3398a0d`, 2026-06-14

## Why this matters

The monster catalog grew from 48 to 72 (`src/monsters/catalog.ts:35`,
`MONSTER_COUNT = 72`), and `src/monsters/CLAUDE.md` documents the current state
as 72. But `README.md` still says "48". The in-game UI already shows the real
count dynamically (`CollectionScreen.tsx:47` renders `{ownedCount}/{MONSTER_COUNT}`),
so the README is the only place that lies. Stale docs that are *actively wrong*
mislead the next reader/maintainer about the feature set.

## Current state

`README.md` has two stale claims. Excerpts as they exist today:

`README.md:3-6`:
```
Gra przeglądarkowa do nauki tabliczki mnożenia (do 10×10) dla dzieci. Poprawne
odpowiedzi dają jajka, z których wykluwają się kolekcjonowane potworki (48 sztuk,
4 poziomy rzadkości). Gra adaptacyjnie częściej podsuwa działania, które idą
dziecku gorzej, i stopniowo odblokowuje kolejne tabliczki (start: ×1, ×2, ×5, ×10).
```

`README.md:33-36` (the `## Tryb debug` section):
```
Otwórz grę z `?debug` w adresie (np. `http://localhost:5100/potworki/?debug`) —
na dole ekranu głównego pojawi się link **debug**: tabela mastery wszystkich 55
działań, galeria 48 potworków, przyciski do testowania (ustawianie mastery,
dodawanie jajek/iskierek, reset zapisu).
```

Ground truth in code (do not change these — read-only confirmation):
- `src/monsters/catalog.ts:35` — `export const MONSTER_COUNT = 72`
- `src/monsters/CLAUDE.md` — "Aktualny stan: `MONSTER_COUNT = 72`."

What is **correct** and must NOT be changed:
- "55 działań" (there are 55 commutative facts — `src/game/facts.ts` builds them).
- "4 poziomy rzadkości" (common/rare/epic/legendary — still 4).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Find stale references | `grep -n "48" README.md` | only the two lines above; both fixed after edit |
| Confirm code constant | `grep -n "MONSTER_COUNT = " src/monsters/catalog.ts` | `= 72` |

(No build/typecheck needed — this is a docs-only change. README is not compiled.)

## Scope

**In scope**:
- `README.md` — the two stale "48" references only.

**Out of scope** (do NOT touch):
- Any source file. This is documentation only.
- The "55 działań" and "4 poziomy rzadkości" phrases — they are correct.
- `src/monsters/CLAUDE.md` — already correct (says 72).

## Git workflow

- Branch: `advisor/002-readme-monster-count`.
- Commit message: e.g. `docs: README monster count 48 -> 72`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Fix the description (line 4)

Change `potworki (48 sztuk,` → `potworki (72 sztuki,`. (Polish grammar: "72
sztuki", not "72 sztuk".) Keep the rest of the sentence identical.

### Step 2: Fix the debug-section gallery count (line 35)

Change `galeria 48 potworków` → `galeria 72 potworków`. ("potworków" is correct
for 72 — do not change the noun form here.)

**Verify**: `grep -n "48 sztuk\|48 potworków" README.md` → no matches.
**Verify**: `grep -n "72 sztuki\|72 potworków" README.md` → two matches.

## Test plan

No automated tests. Verification is the two `grep` checks above plus a quick
read of the edited sentences to confirm they still read naturally in Polish.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "48" README.md` returns no monster-count references (any remaining
      "48" is unrelated — e.g. none expected)
- [ ] `grep -c "72" README.md` ≥ 2
- [ ] "55 działań" and "4 poziomy rzadkości" still present (`grep -n "55 dział" README.md`
      and `grep -n "4 poziomy" README.md` each return a match)
- [ ] `git status` shows only `README.md` modified
- [ ] `plans/README.md` status row for 002 updated to DONE

## STOP conditions

Stop and report if:
- `grep -n "48" README.md` shows more than the two documented occurrences, or the
  occurrences are not about monster count — investigate which are real before editing.
- `src/monsters/catalog.ts` no longer says `MONSTER_COUNT = 72` (drift) — the
  correct number changed; do not hard-code 72, report the new value.

## Maintenance notes

- The monster count lives in `src/monsters/catalog.ts` (`MONSTER_COUNT`) and is
  surfaced dynamically in the UI. The README is the one place it is hand-written,
  so it must be updated by hand whenever the catalog grows (per
  `src/monsters/CLAUDE.md`, new monsters are added with new ids above the max).
