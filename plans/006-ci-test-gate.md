# Plan 006: Gate the GitHub Pages deploy on `bun test`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cb2c336..HEAD -- .github/workflows/deploy.yml CLAUDE.md`
> If `.github/workflows/deploy.yml` changed since this plan was written, compare
> the "Current state" excerpt against the live file before editing; on a
> mismatch, treat it as a STOP condition.
>
> **DOX (this repo)**: This repo uses a binding `CLAUDE.md` hierarchy. The deploy
> workflow and CI are owned by the root `CLAUDE.md` ("Komendy"/"Deploy" + the
> note about `.github/workflows/`). Read root `CLAUDE.md` before editing.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 003 (the `bun test` suite must exist — it is already on `main`)
- **Category**: dx
- **Planned at**: commit `cb2c336`, 2026-06-14

## Why this matters

`main` now has a 64-test suite (`bun test`), but CI does not run it: the deploy
workflow only runs `bun run build` (which gates `tsc`, not tests). So a change
that breaks the reward economy, the adaptive engine, or — critically — the
**frozen monster catalog** (the signature guard in `src/monsters/catalog.test.ts`)
would still deploy to the child's device. Adding a `bun test` step *before* the
build makes a failing test block the deploy. Tests that don't gate anything
protect nothing; this closes that gap.

## Current state

`.github/workflows/deploy.yml` — the deploy job's steps today (the `steps:` block
under `jobs.deploy`):

```yaml
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

`package.json` already defines `"test": "bun test"` (added by plan 003), and
`bun test` passes locally (64 tests). The workflow runs on push to `main` and via
`workflow_dispatch`.

Repo conventions: the workflow uses 2-space YAML indentation and `- run:` /
`- uses:` step style. Match it exactly.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Run tests locally | `bun test` | all pass, exit 0 (64 tests) |
| YAML sanity (optional) | `bunx --bun yaml-lint .github/workflows/deploy.yml` | only if the tool resolves; otherwise skip |
| Typecheck (unaffected) | `bun run typecheck` | exit 0 |

(GitHub Actions itself cannot be run locally — verification is that the YAML is
well-formed and the `bun test` step is correctly placed.)

## Scope

**In scope**:
- `.github/workflows/deploy.yml` — add one `- run: bun test` step.
- `CLAUDE.md` (root) — one-line note that the deploy now gates on `bun test`
  (Step 2).

**Out of scope** (do NOT touch):
- Any source file. This is CI config only.
- The action versions / `permissions` / `concurrency` blocks — leave them as-is
  (SHA-pinning and caching were considered and rejected as low-value; see
  `plans/README.md`).
- The order of the post-build steps (configure-pages / upload / deploy).

## Git workflow

- Branch: `advisor/006-ci-test-gate`.
- Commit message: e.g. `ci: gate deploy on bun test`.
- Do NOT push or open a PR.

## Steps

### Step 1: Insert the test step before the build

In `.github/workflows/deploy.yml`, add `- run: bun test` between the install and
build steps, so the steps read:

```yaml
      - run: bun install --frozen-lockfile
      - run: bun test
      - run: bun run build
```

Use the exact same indentation (6 spaces before `- run:`) as the surrounding
steps. Change nothing else.

**Verify**: `grep -n "bun test" .github/workflows/deploy.yml` → exactly one match,
positioned between the `bun install --frozen-lockfile` line and the
`bun run build` line (confirm by line numbers). `bun test` (locally) → 64 pass.

### Step 2: DOX note

In root `CLAUDE.md`, update the deploy description so it records that CI runs the
test suite before building/publishing (a failing `bun test` blocks the deploy).
Keep it to a short clause in the existing Polish "Deploy" sentence; match the
file's tone. Do not restructure the section.

**Verify**: `bun run typecheck` → exit 0 (sanity; unaffected). `grep -n "bun test" CLAUDE.md` → at least one match.

## Test plan

No new automated tests (this is CI config). Verification is:
- `bun test` passes locally (the step being added is known-good).
- The `bun test` step sits between install and build (so a test failure aborts
  before the artifact is built/published).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `.github/workflows/deploy.yml` contains exactly one `bun test` step, placed
      after `bun install --frozen-lockfile` and before `bun run build`
- [ ] `bun test` exits 0 locally (64 tests)
- [ ] `bun run typecheck` exits 0
- [ ] `git diff --name-only cb2c336..HEAD` lists only `.github/workflows/deploy.yml`
      and `CLAUDE.md`
- [ ] `plans/README.md` status row for 006 updated

## STOP conditions

Stop and report back (do not improvise) if:

- `deploy.yml` doesn't match the "Current state" excerpt (drift).
- `bun test` does not pass locally before your change — the suite is broken
  independently; do not paper over it by skipping or `|| true`.
- Adding the step would require changing action versions or job structure to work
  — it should not; report if it seems to.

## Maintenance notes

- For the reviewer: confirm the step is *before* `bun run build` (a test failure
  must abort before publishing) and that nothing else in the workflow changed.
- The runner installs deps with `--frozen-lockfile`; `bun test` then runs against
  those. If `@types/bun` ever fails to install in CI, that surfaces here first.
