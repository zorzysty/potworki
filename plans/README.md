# Implementation Plans

Plans are executable work orders: each is self-contained (context, steps,
done criteria, STOP conditions). Executors read the plan fully before
starting, honor its STOP conditions, and update their row here when done.

**This repo uses a binding `CLAUDE.md` ("DOX") hierarchy.** Every plan's
executor must read the root `CLAUDE.md` plus the chain for any path they
touch ("Read Before Editing"), and update the nearest owning `CLAUDE.md`
when a change alters a contract.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 012  | Wioska Budowniczych — budynki i dekoracje za iskierki (Heroes 3) | P1 | L | — | TODO |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale).

## Archive

Plans 001–011 (two audit passes 2026-06-14 + the world/lore feature) are all
DONE and merged to `main`; their files were removed 2026-07-12 — full text in
git history (`git log --diff-filter=D -- plans/`). Net result: green build +
CI test gate, 180-test suite (frozen-catalog signature guard, store/round
machine, migration chain v1→v8, achievements), domain logic extracted from
the store into `src/game/`, world/lore layer (regions, guardians, passport).

## Findings considered and rejected (do not re-litigate)

Condensed from the 2026-06 audits; full rationale in git history of this file:

- **Memoizing MapScreen/CollectionScreen computations** — not worth it at
  this scale (≤76 items, pure math, screens unmounted during rounds).
- **CI dependency cache + SHA-pinned actions** — low value for a static site.
- **esbuild advisory via vite** — resolved 2026-06-14 by vite 7→8 upgrade;
  `bun audit` clean.
- **`safeStorage` corrupt-JSON crash / missing typecheck gate / div-by-zero
  in `shouldUnlockNextStage`** — all misreads; verified safe.
- **Test for the play-again button** — it only re-invokes the exhaustively
  tested `startRound()`.

## Direction findings (not planned — maintainer's call)

- **Save export/import (cross-device).** Progress is per-device; `SaveState`
  is versioned + serializable; `safeStorage` exists.
- **Parent/teacher progress view.** `DebugScreen` already computes the
  mastery table; a PIN-gated read-only screen is mostly presentation.
- **Validate the reward economy after the 76-monster + division expansion.**
  `rarityOf` spans new id blocks while `RARITY_ODDS` stayed fixed; the
  `simulateRoundOutcome` harness could measure dup/iskierki pacing.
  (Plan 012 adds a wage income + village sink — re-measure after it lands.)
- **Per-monster cosmetics via `MonsterStage` slots + card frames** — the
  natural follow-up to plan 012 (see its Maintenance notes).
- **Audio feedback** for the reward loop (needs mute/autoplay UX).
