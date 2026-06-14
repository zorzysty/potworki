# Plan 001: Restore a green build by removing the dead `_index` variable

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3398a0d..HEAD -- src/screens/RoundScreen.tsx biome.json`
> If `src/screens/RoundScreen.tsx` changed since this plan was written, compare
> the "Current state" excerpt against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **DOX (this repo)**: This repository uses a binding `CLAUDE.md` hierarchy
> ("DOX"). Before editing, read `CLAUDE.md` (root) and `src/CLAUDE.md`. They
> are work contracts. This change touches no documented contract, so no DOX
> doc needs updating — but you must still read the chain.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `3398a0d`, 2026-06-14

## Why this matters

`main` does not build. `bun run typecheck` and `bun run build` both exit 1 with
`src/screens/RoundScreen.tsx(21,8): error TS6133: '_index' is declared but its
value is never read.` The GitHub Actions deploy workflow runs `bun run build`
(`tsc -b && vite build`), so **every push to `main` since commit `0ff78fe`
("introduce biome") has failed to deploy to GitHub Pages** — the live game is
stuck on an older build. The variable is genuinely dead; deleting it restores
the build and unblocks deploys.

Root cause worth understanding (so it does not recur): Biome's `noUnusedVariables`
"unsafe" autofix *renamed* an unused `index` to `_index` instead of removing it.
Biome treats a leading `_` as "intentionally unused", but TypeScript's
`noUnusedLocals` (enabled in `tsconfig.json:14`) does **not** exempt `_`-prefixed
*local variables* (only `noUnusedParameters` exempts `_`-prefixed *parameters*).
So the two tools disagree. The fix is to delete the dead read, not to rename it.

## Current state

- `src/screens/RoundScreen.tsx` — the round screen. Line 21 declares an unused
  variable; the real `round.index` is read directly elsewhere (lines 36 and 56).

Excerpt as it exists today (`src/screens/RoundScreen.tsx:19-26`):

```tsx
	const round = useGame((s) => s.round)
	const nextQuestion = useGame((s) => s.nextQuestion)
	const exitRoundEarly = useGame((s) => s.exitRoundEarly)
	const debugFinishRound = useGame((s) => s.debugFinishRound)
	const [paused, setPaused] = useState(false)

	const phase = round?.phase
	const _index = round?.index           // <-- line 21: dead, delete this line
	useEffect(() => {
```

Confirm `round.index` is still used after deletion (these lines stay):
- `src/screens/RoundScreen.tsx:36` — `Pytanie {round.index + 1} / {round.total}`
- `src/screens/RoundScreen.tsx:56` — `round.index === 0` (debug-finish gate)

Repo conventions that apply here:
- Package manager is **bun**, never npm. Formatting is **Biome** (tabs, double
  quotes, semicolons as-needed). `CLAUDE.md` mandates running `bun run check`
  after any code change — this is a required closeout step, not optional.

## Commands you will need

| Purpose   | Command                                      | Expected on success            |
|-----------|----------------------------------------------|--------------------------------|
| Typecheck | `bun run typecheck`                          | exit 0, no errors              |
| Lint/format (write) | `bun run check`                    | exit 0, "No errors" (may reformat `biome.json`) |
| Lint/format (read-only check) | `bunx --bun @biomejs/biome check` | exit 0 after the step above |
| Full build | `bun run build`                             | exit 0 (tsc + vite build)      |

## Scope

**In scope** (the only files you should modify):
- `src/screens/RoundScreen.tsx` — delete the dead `_index` line.
- `biome.json` — only if `bun run check` reformats it (whitespace only; it
  currently reports "needs to be formatted"). Do not change its rules/content.

**Out of scope** (do NOT touch):
- Any other source file. The build failure is this one line; there are no other
  `TS6133` errors.
- The Biome rule set in `biome.json` — do not disable `noUnusedVariables` or add
  ignores; the correct fix is deletion.

## Git workflow

- Branch: `advisor/001-fix-broken-build` (the repo's default branch is `main`).
- Commit message style matches `git log` (short, lower-case, imperative — e.g.
  `fix: remove dead _index breaking tsc build`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Delete the dead variable

In `src/screens/RoundScreen.tsx`, delete line 21 entirely:

```tsx
	const _index = round?.index
```

Leave the surrounding lines (`const phase = round?.phase` above it, the
`useEffect` below it) untouched.

**Verify**: `bun run typecheck` → exit 0, no output errors.

### Step 2: Run the mandatory formatter/linter

```
bun run check
```

This is the project's required post-change step. It will format `biome.json`
(currently flagged as needing formatting) and confirm no lint errors remain.

**Verify**: `bunx --bun @biomejs/biome check` → exit 0, "Checked N files",
no "Found … error".

### Step 3: Confirm the full build passes

**Verify**: `bun run build` → exit 0 (runs `tsc -b && vite build`; ends with a
vite build summary and no errors).

## Test plan

No unit tests apply (this is a one-line dead-code deletion). The verification IS
the test:
- `bun run typecheck` exits 0 (was exit 1 before).
- `bun run build` exits 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0
- [ ] `bunx --bun @biomejs/biome check` exits 0
- [ ] `grep -n "_index" src/screens/RoundScreen.tsx` returns no matches
- [ ] `git status` shows only `src/screens/RoundScreen.tsx` and possibly
      `biome.json` modified — nothing else
- [ ] `plans/README.md` status row for 001 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- After deleting line 21, `bun run typecheck` reports a *different* `TS6133` or
  any other error — the codebase has drifted; do not start fixing unrelated
  errors.
- `round.index` turns out NOT to be used elsewhere in the file (the "Current
  state" excerpt does not match) — investigate before deleting.
- `bun run check` wants to modify a source file other than `biome.json` — report
  what and why before accepting.

## Maintenance notes

- For the reviewer: confirm the diff is exactly the one-line deletion (plus
  possible `biome.json` whitespace). Nothing else should change.
- Future watch: Biome's unsafe autofix renames unused vars to `_name`, which
  `tsc` (`noUnusedLocals`) then rejects. If this recurs, the fix is always to
  delete the dead code, never to silence `tsc`. Consider noting this in
  `CLAUDE.md`'s Biome section if it happens again.
