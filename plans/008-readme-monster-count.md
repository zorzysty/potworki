# Plan 008: Correct README monster count 72 → 76

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat aef2b6d..HEAD -- README.md src/monsters/catalog.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `aef2b6d`, 2026-06-14

## Why this matters

The game catalog grew to 76 monsters when the division feature added four
division-only legendaries (ids 72–75). Every binding `CLAUDE.md` was updated to
say 76, but `README.md` — the human-facing entry point — still says **72** in
two places. A reader (or future maintainer) is given the wrong collection size.
This is the exact same class of fix as the already-completed plan 002 (which
corrected 48 → 72); the count has since moved again.

## Current state

- `README.md` — project readme; the **only** doc still stating 72. Two stale lines:
  - Line 4 (inside the intro paragraph):
    ```
    odpowiedzi dają jajka, z których wykluwają się kolekcjonowane potworki (72 sztuki,
    ```
  - Line 35 (inside the "Tryb debug" section):
    ```
    działań, galeria 72 potworków, przyciski do testowania (ustawianie mastery,
    ```
- `src/monsters/catalog.ts:36` — the source of truth: `export const MONSTER_COUNT = 76`.
- These docs already correctly say 76 (do NOT touch them — they are right):
  `CLAUDE.md:25`, `src/CLAUDE.md:42`, `src/monsters/CLAUDE.md:5`, `:17`, `:29`, `:30`.
- Polish grammar note: the catalog docs use the form **"76 potworków"** and
  **"katalog 76 potworków"**. For "72 sztuki" the correct agreement at 76 is
  **"76 sztuk"** (the genitive plural, as Polish uses for counts ending in 6).
  Use "76 sztuk" and "galeria 76 potworków".

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `bun run typecheck`| exit 0, no errors   |
| Tests     | `bun test`         | all pass (112 today)|
| Lint/format | `bun run check`  | exit 0, no changes left to make |
| Grep check | `grep -rn "72" README.md` | no monster-count matches remain |

(`bun run check` runs Biome with `--write --unsafe`; it formats Markdown too. It
should produce no diff on a docs-only edit, but run it — it is the repo's
mandatory closeout step.)

## Scope

**In scope** (the only file you should modify, plus the index):
- `README.md`
- `plans/README.md` (status row update only)

**Out of scope** (do NOT touch):
- `src/monsters/catalog.ts` and any source file — this is a docs-only fix; the
  code is already correct at 76.
- Any `CLAUDE.md` — they already say 76. Changing them is wrong.
- Any other number in `README.md`. In particular **leave "55 działań" alone** —
  there are 55 multiplication facts (`src/game/facts.ts:18` builds 55), and that
  is correct and unrelated to the monster count.

## Git workflow

- Branch: `advisor/008-readme-monster-count`
- One commit. Message style (match repo, lowercase imperative — see
  `git log`, e.g. "docs: README monster count 48 -> 72"):
  `docs: README monster count 72 -> 76`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Update the intro paragraph (README.md line 4)

Change `72 sztuki` to `76 sztuk` on the line beginning
"odpowiedzi dają jajka". Leave the rest of the sentence untouched.

**Verify**: `grep -n "76 sztuk" README.md` → prints the line.

### Step 2: Update the debug section (README.md line 35)

Change `galeria 72 potworków` to `galeria 76 potworków` on the line in the
"Tryb debug" section. Leave "55 działań" and the rest of the line untouched.

**Verify**: `grep -n "galeria 76 potworków" README.md` → prints the line.

### Step 3: Confirm no stale count remains and formatting is clean

**Verify**:
- `grep -rn "72" README.md` → no monster-count matches (no "72 sztuki",
  no "galeria 72"). If any other "72" exists that is NOT a monster count,
  leave it.
- `bun run check` → exit 0.

## Test plan

No code changes, so no new tests. Regression guard is the existing suite:

- `bun test` → all pass (112 today; the number must not drop).
- `bun run typecheck` → exit 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -c "76 sztuk" README.md` ≥ 1 and `grep -c "galeria 76 potworków" README.md` ≥ 1
- [ ] `grep -n "72 sztuki" README.md` and `grep -n "galeria 72" README.md` return nothing
- [ ] "55 działań" is still present in `README.md` (unchanged)
- [ ] `bun run typecheck` exits 0
- [ ] `bun test` exits 0 (112 pass)
- [ ] `bun run check` exits 0
- [ ] No files outside `README.md` (and `plans/README.md`) modified (`git status`)
- [ ] `plans/README.md` status row for 008 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The "Current state" excerpts don't match `README.md` (the file has drifted —
  e.g. the count was already fixed, or the lines moved).
- `MONSTER_COUNT` in `src/monsters/catalog.ts` is no longer 76 (then the correct
  target number changed — report the new value instead of writing 76).
- `bun test` is not green *before* you start (a pre-existing failure is not
  yours to fix here).

## Maintenance notes

- This file drifts whenever the catalog grows. If a future change bumps
  `MONSTER_COUNT` again, the same two README lines (plus the `CLAUDE.md` files)
  need updating. Consider that the count lives in five docs — there is no single
  source rendered into the README, so manual sync is required each time.
- A reviewer should confirm only the count words changed and Polish number
  agreement is correct ("76 sztuk", not "76 sztuki").
