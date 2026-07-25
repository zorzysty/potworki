# Plan 022: CI z bramą Biome, skrypt `verify` i sprostowanie liczby osiągnięć w DOX

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a0d75aa..HEAD -- .github/workflows/deploy.yml package.json README.md src/CLAUDE.md CLAUDE.md`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. This plan touches
> root-owned paths (workflow, `package.json`, `README.md`, root `CLAUDE.md`)
> and `src/CLAUDE.md`. Steps 4–5 ARE the DOX pass.

## Status

- **Priority**: P2 (tooling hygiene + a self-contradicting binding doc)
- **Effort**: S
- **Risk**: LOW (CI additions are check-only; doc edits are numbers)
- **Depends on**: none (branch `feat/012-wioska-budowanie` @ `a0d75aa`,
  311 tests green, `bunx --bun @biomejs/biome ci .` verified passing
  cleanly at this commit — "Checked 75 files … No fixes applied.")
- **Category**: dx + docs
- **Planned at**: commit `a0d75aa`, 2026-07-12

## Why this matters

Three small gaps, one plan because they share the same files:

1. **CI never runs Biome.** `.github/workflows/deploy.yml` runs `bun test`
   then `bun run build` (`tsc -b && vite build` — so typecheck IS gated),
   but no lint/format check. Root `CLAUDE.md` declares `bun run check`
   "obowiązkowy krok" for every change — yet nothing enforces it at the
   gate, so lint/format drift can silently reach `main` and deploy.
2. **No one-command local gate.** Reproducing the full gate takes three
   memorized commands (`bun test`, `bun run typecheck`, biome). Executors
   of the other plans in this directory would all benefit from one
   `bun run verify`.
3. **`src/CLAUDE.md` contradicts its own hierarchy about the achievement
   count.** It says 48 in two places; the actual catalog has 53
   (`ACHIEVEMENTS.length === 53`, asserted by the tripwire in
   `src/achievements/catalog.test.ts`), and the sibling doc
   `src/achievements/CLAUDE.md` correctly says 53. An agent trusting the
   binding doc could try to "add the missing 5" or mis-adjust the
   tripwire.

## Current state

Verified at `a0d75aa`:

`.github/workflows/deploy.yml` — the `steps` block of the single `deploy`
job:

```yaml
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun test
      - run: bun run build
      - uses: actions/configure-pages@v5
      ...
```

`package.json` scripts (note: `check`/`lint`/`format` all WRITE — they
carry `--write`, `check` even `--unsafe` — so none of them is usable as a
CI gate as-is; Biome's dedicated read-only mode is the `ci` subcommand):

```json
"scripts": {
	"dev": "vite",
	"build": "tsc -b && vite build",
	"preview": "vite preview",
	"typecheck": "tsc -b --noEmit",
	"format": "bunx --bun @biomejs/biome format --write",
	"lint": "bunx --bun @biomejs/biome lint --write",
	"check": "bunx --bun @biomejs/biome check --write --unsafe",
	"test": "bun test"
}
```

`src/CLAUDE.md`, two stale spots (exact quotes):

- In the achievements bullet of Local Contracts: `przycisk „Osiągnięcia 🏅
  X/48", liczba z ACHIEVEMENTS.length` — the "48" is a stale example; the
  code renders `ACHIEVEMENTS.length` = 53.
- In the Child DOX Index: `deklaratywny katalog 48 osiągnięć i ich czysta
  ocena` — should be 53.

`README.md` "Komendy" block lists only `bun i` / `dev` / `build` /
`preview` / `typecheck` — no `test`, no biome, and (after this plan) no
`verify`.

## Steps

1. **Add the `verify` script** to `package.json`:

   ```json
   "verify": "bun test && bun run typecheck && bunx --bun @biomejs/biome ci ."
   ```

   Place it after `"check"`. It must use `biome ci` (read-only; fails on
   unformatted/lint-dirty files without writing), NOT `check --write`.

   Verification: `bun run verify` → all three stages pass, exit 0.

2. **Add the Biome gate to CI.** In `.github/workflows/deploy.yml`, insert
   between `bun test` and `bun run build`:

   ```yaml
      - run: bunx --bun @biomejs/biome ci .
   ```

   (Keep it a separate step, not folded into `verify`, so a red gate names
   the failing stage in the Actions UI at a glance.)

   Verification: `bunx --bun @biomejs/biome ci .` locally → "No fixes
   applied", exit 0 (this is what CI will run). Optionally validate the
   YAML: `bunx yaml-lint .github/workflows/deploy.yml` or a careful
   read — indentation must match the sibling `- run:` steps (6 spaces).

3. **README**: extend the "Komendy" block with the missing commands so it
   matches reality:

   ```bash
   bun test          # testy jednostkowe
   bun run check     # biome: format + lint (zapisuje poprawki)
   bun run verify    # pełna brama: test + typecheck + biome (tylko sprawdza)
   ```

4. **DOX — root `CLAUDE.md`**: in the "Komendy" code block, add one line
   for `bun run verify` (mirroring the README wording). In the "Deploy"
   paragraph, amend "uruchamia `bun test` (blokuje deploy przy błędzie)"
   to also mention the Biome gate (e.g. "uruchamia `bun test` i
   `biome ci` (blokują deploy przy błędzie)").

5. **DOX — `src/CLAUDE.md`**: fix both stale counts:
   - `„Osiągnięcia 🏅 X/48"` → `„Osiągnięcia 🏅 X/53"` (keep the
     clarifying `liczba z ACHIEVEMENTS.length` clause — it's the reason
     the number can drift; leaving the live count next to it is still
     useful to readers).
   - Child DOX Index: `katalog 48 osiągnięć` → `katalog 53 osiągnięć`.

   Cross-check first: `grep -c "id:" src/achievements/catalog.ts` is
   unreliable; instead trust the tripwire —
   `grep -n "toBe(53)" src/achievements/catalog.test.ts` must show the
   count assertion. If the tripwire says something other than 53, use THAT
   number everywhere and note it in your report.

6. **Full gate**: `bun run verify` → exit 0. (`check` with `--write` is
   not needed here unless verify's biome stage failed.)

## Done criteria (machine-checkable)

- `bun run verify` exists and exits 0.
- `grep -n "biome ci" .github/workflows/deploy.yml` → one hit, positioned
  after `bun test` and before `bun run build`.
- `grep -rn "48 osiągnięć\|X/48" src/CLAUDE.md` → no hits.
- `grep -n "verify" README.md CLAUDE.md` → hits in both.

## Out of scope — do NOT touch

- Do NOT add a dependency-cache step or SHA-pin the actions — both were
  considered and rejected (2026-06, recorded in `plans/README.md`).
- Do NOT add pre-commit hooks (husky/lint-staged) — considered, low value
  for a single-maintainer repo with a CI gate.
- Do NOT change the `check`/`lint`/`format` scripts' `--write` behavior —
  the write-mode scripts are the local workflow by design.
- No source-code changes under `src/` other than `src/CLAUDE.md`.

## Maintenance note

`biome ci` in CI means every push to `main` must be biome-clean — which is
already the documented local contract ("po każdej zakończonej zmianie
uruchom `bun run check`"), now enforced. If a future Biome major changes
diagnostics, CI will surface it on the first push; update `biome.json` or
the pinned version deliberately, never by loosening the gate.

## STOP conditions

- `bunx --bun @biomejs/biome ci .` does NOT pass cleanly at your checkout
  before any edits (baseline was clean at `a0d75aa`; a dirty baseline
  means someone committed unformatted code since — report, don't format
  other people's changes as part of this plan).
- The achievements tripwire asserts a count other than 53 AND
  `src/achievements/CLAUDE.md` disagrees with it — inconsistent trio needs
  the maintainer, not a guess.
- The workflow file has structurally changed (different job/step layout).
