# Plan 018: PWA — instalacja na ekranie głównym i gra offline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2092dfc..HEAD -- vite.config.ts package.json index.html public .github/workflows/deploy.yml src/styles.css`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.
>
> **DOX (this repo)**: Binding `CLAUDE.md` hierarchy. This plan touches
> root-owned paths (`vite.config.ts`, `package.json`, `index.html`, `public/`,
> a new `scripts/`) **plus one scoped CSS block in `src/styles.css`
> (safe-area insets, Step 5)** — read root `CLAUDE.md` AND `src/CLAUDE.md`
> before editing. The root doc is updated in Step 8 (deploy contract + the
> "Poza src/" index line gain the PWA/scripts notes); `src/CLAUDE.md` gets
> one line for the safe-area block.
>
> **Naming (user preference, binding)**: the user wordsmiths player-facing
> Polish strings. Manifest `name`/`short_name`/`description` are PROPOZYCJE —
> implement as proposed, mark with a `// PROPOZYCJE do dopracowania` comment
> in `vite.config.ts`.

## Status

- **Priority**: P2 (infrastructure — real value: offline w aucie, ikona na
  ekranie głównym tabletu)
- **Effort**: S
- **Risk**: MED (service worker staleness is the one way this can actively
  hurt — mitigated by design below; everything else is additive config)
- **Depends on**: none (branch `feat/012-wioska-budowanie` @ `2092dfc`,
  217 tests green)
- **Category**: infra
- **Planned at**: commit `2092dfc`, 2026-07-12

## Why this matters

The game is a **backend-less static SPA with the entire save in
localStorage** — the textbook perfect offline candidate: there is literally
no network dependency after the assets load. Yet today a tablet with no
signal (car trip, holiday) shows a browser error page instead of the game.
Two wins, one small plugin:

1. **Offline play.** Precached assets → the game boots and plays fully
   offline. The save lives in localStorage, which needs no network anyway.
2. **Home-screen install.** `display: standalone` removes the browser chrome
   — no address bar to fat-finger, no accidental back-swipe out of a round,
   and a real app icon a 9-year-old taps like any other game. (Today the
   `apple-touch-icon` points at an SVG, which iOS ignores — so an iPad
   home-screen shortcut currently gets a screenshot blob as its icon.)

Standalone mode also REMOVES the browser's own inset handling:
`index.html` already sets `viewport-fit=cover`, and **nothing in
`src/styles.css` uses `env(safe-area-inset-*)`** — installed full-screen,
the round screen's keypad would sit under the iPad home indicator and the
top row would crowd the status bar. Step 5 closes that gap (the one place
this plan touches `src/`).

**The one hard requirement: a stale service worker must NEVER pin the child
to an old build.** Deploys go push-to-`main` → GH Pages, and the save schema
migrates forward on load (`SAVE_VERSION`) — an SW serving last month's JS
while the child's save was already migrated by a newer build elsewhere is
the nightmare scenario. Hence `registerType: "autoUpdate"` +
`cleanupOutdatedCaches` (details in Step 3's update-flow note).

## Current state

Verified at `2092dfc` (branch `feat/012-wioska-budowanie`):

- `vite.config.ts` — minimal: `base: "/potworki/"`, plugins
  `[react(), tailwindcss()]`. **The GH Pages subpath is the classic PWA
  footgun**: manifest `scope`/`start_url` and the SW registration URL must
  all live under `/potworki/`, not `/`.
- `package.json` — `vite: ^8.0.16`. **Compatibility verified against the npm
  registry (2026-07-12): `vite-plugin-pwa@1.3.0` declares peer
  `vite: "^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0"`** — vite
  8 is explicitly supported. (Re-verify at install time; see STOP conditions.)
- `index.html` — `<meta name="theme-color" content="#7c5cf0">` already
  present; `<link rel="icon" href="./favicon.svg">` and
  `<link rel="apple-touch-icon" href="./favicon.svg">` (the latter is the
  iOS-ignores-SVG bug fixed in Step 4).
- `public/` — only `favicon.svg`: a hand-drawn purple monster face (grape
  `#7c5cf0` body, white eyes, ears) — the natural source for app icons.
- Palette tokens (`src/styles.css` `@theme`): `--color-grape: #7c5cf0`,
  `--color-grape-dark: #5f45c4`, `--color-bubblegum: #ff5e8a`,
  `--color-sunny: #ffd95e`.
- Fonts: self-hosted Baloo 2 woff2 in `src/assets/fonts/`, referenced from
  CSS `url()` → vite hashes them into `dist/assets/` → a `**/*.woff2` glob
  precaches them (offline text keeps its font).
- `.github/workflows/deploy.yml` — bun install → `bun test` → `bun run
  build` → upload `dist/` → deploy-pages. The plugin emits `sw.js` +
  `manifest.webmanifest` into `dist/` during `vite build`, so **the workflow
  needs zero changes**.
- Browser verification recipe: puppeteer-core + `/usr/bin/chromium`
  (`--no-sandbox --disable-gpu`), scripts in the session scratchpad — the
  established pattern from plan 012's visual passes. Puppeteer's
  `page.setOfflineMode(true)` gives the offline toggle.
- `bun test` → 217 pass. This plan changes no `src/` logic (the sole `src/`
  touch is the Step-5 CSS media block), so the suite is expected to be
  **byte-for-byte unaffected**.
- `index.html:9` sets `viewport-fit=cover` **and** `user-scalable=no`;
  `grep -rn "safe-area" src/` → zero hits (the standalone inset gap Step 5
  fixes). App shell: `App.tsx:62-63` — outer background div + inner content
  column, both `min-h-dvh` (the cascade documented in Step 5).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Add plugin | `bun add -d vite-plugin-pwa` | exit 0, lockfile updated |
| Typecheck | `bun run typecheck` | exit 0 |
| Build | `bun run build` | exit 0; `dist/sw.js` + `dist/manifest.webmanifest` exist |
| Preview (prod-like) | `bun run preview` | serves `dist/` at `/potworki/` |
| Tests (unaffected) | `bun test` | 217 pass, unchanged |
| Lint/format | `bun run check` | exit 0 |

## Scope

**In scope** (the only files you should touch):
- `package.json` + `bun.lock` — `vite-plugin-pwa` devDependency
- `vite.config.ts` — `VitePWA(...)` plugin block (manifest + workbox)
- `public/pwa-192.png`, `public/pwa-512.png`, `public/pwa-maskable-512.png`,
  `public/apple-touch-icon.png` (generated, committed)
- `scripts/make-icons.ts` (create) — deterministic icon generation
- `index.html` — apple-touch-icon → PNG
- `src/styles.css` — ONE `@media (display-mode: standalone)` safe-area block
  (Step 5; plus the `--app-vh` fallback and its `min-h-dvh` call-site swap
  ONLY if the documented overflow pitfall materializes)
- `CLAUDE.md` (root) + `src/CLAUDE.md` — DOX notes (Step 8)
- `plans/README.md` — status row

**Out of scope** (do NOT touch):
- Anything under `src/` beyond the Step-5 CSS block (and its documented
  fallback) — in particular `injectRegister: "auto"` injects the SW
  registration into the built entry; no manual `registerSW` code. If you
  find yourself editing `src/main.tsx`, stop — you chose the wrong register
  mode.
- `src/monsters/**` — icons are rendered from `public/favicon.svg`, NOT from
  monster art (frozen catalog stays untouched).
- `.github/workflows/deploy.yml` — verified: no changes needed. If the build
  demands one, that is a STOP condition, not an edit.
- An update-notification UI ("nowa wersja dostępna") — autoUpdate makes it
  unnecessary; a toast would only confuse the child.

## Git workflow

- Branch: `feat/018-pwa` (cut from wherever the operator says; plan assumes
  on top of `feat/012-wioska-budowanie` or `main` after 012 merges — no code
  overlap either way).
- Commit message style: `feat(pwa): installable + offline (vite-plugin-pwa)`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install the plugin

```
bun add -d vite-plugin-pwa
```

**Verify**: exit 0; `grep vite-plugin-pwa package.json` shows it under
devDependencies; the resolved version's vite peer range includes `^8.0.0`
(`bun pm ls | grep vite-plugin-pwa`, then check — if bun reports a peer
conflict or resolves a version whose peers exclude vite 8, STOP).

### Step 2: Generate the icons (`scripts/make-icons.ts`)

PWA installs need raster icons; `public/favicon.svg` is the source. Create
`scripts/make-icons.ts` — a small, deterministic, re-runnable script using
the repo's established headless-chromium recipe (puppeteer-core +
`/usr/bin/chromium`; add nothing to `package.json` — run it with the
scratchpad-installed puppeteer-core or a `bunx`-style one-off, and say so in
a comment). For each target it renders a data-URL HTML page and screenshots
a fixed-size viewport:

| File | Size | Content |
|------|------|---------|
| `public/pwa-192.png` | 192×192 | favicon.svg filling the canvas, transparent background |
| `public/pwa-512.png` | 512×512 | same |
| `public/pwa-maskable-512.png` | 512×512 | **solid grape `#7c5cf0` background**, favicon scaled to 80% and centered (maskable safe zone — the OS crops up to 10% per edge into circles/squircles) |
| `public/apple-touch-icon.png` | 180×180 | solid grape background, icon at 84% (iOS adds no padding; full-bleed background avoids a white plate) |

Commit the PNGs (deterministic script + committed artifacts = no CI browser
dependency).

**Verify**: all four files exist; `file public/pwa-*.png` reports the
declared dimensions; open them (Read tool renders images) and confirm the
monster face is centered and uncropped in the maskable variant's inner 80%.

### Step 3: Configure `VitePWA` in `vite.config.ts`

```ts
import { VitePWA } from "vite-plugin-pwa"

// ... plugins: [react(), tailwindcss(), VitePWA({ ... })]
VitePWA({
	// autoUpdate: nowy deploy → SW instaluje się w tle przy pierwszym
	// ONLINE uruchomieniu i natychmiast przejmuje (skipWaiting+clientsClaim),
	// więc dziecko nigdy nie zostaje przypięte do starego builda. Zapis w
	// localStorage jest poza zasięgiem SW — aktualizacja niczego w nim nie
	// rusza, a migracje SAVE_VERSION i tak biegną przy załadowaniu appki.
	registerType: "autoUpdate",
	injectRegister: "auto", // rejestracja wstrzyknięta w build — zero zmian w src/
	includeAssets: ["favicon.svg", "apple-touch-icon.png"],
	manifest: {
		// PROPOZYCJE do dopracowania (nazwy widoczne przy instalacji)
		name: "Potworki",
		short_name: "Potworki",
		description: "Zbieraj potworki, ćwicząc mnożenie i dzielenie!",
		lang: "pl",
		// GH Pages subpath — scope i start_url MUSZĄ siedzieć pod /potworki/
		scope: "/potworki/",
		start_url: "/potworki/",
		display: "standalone",
		orientation: "any",
		theme_color: "#7c5cf0", // --color-grape (zgodnie z meta w index.html)
		background_color: "#f5f3ff", // jasny fiolet splash (PROPOZYCJA)
		icons: [
			{ src: "pwa-192.png", sizes: "192x192", type: "image/png" },
			{ src: "pwa-512.png", sizes: "512x512", type: "image/png" },
			{
				src: "pwa-maskable-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	},
	workbox: {
		// precache CAŁEGO builda — appka jest mała i statyczna; woff2 = font offline
		globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
		// stare precache znikają przy aktualizacji (spójność z SAVE_VERSION:
		// nigdy mieszanki starych i nowych chunków)
		cleanupOutdatedCaches: true,
		// SPA bez routera URL-owego, ale standalone start musi trafić w index
		navigateFallback: "/potworki/index.html",
	},
	// dev z HMR bez SW — zero konfliktów z vite dev serverem
	devOptions: { enabled: false },
})
```

Notes for the executor:
- The plugin prefixes emitted asset URLs with `base` itself; the ONLY places
  you hand-write the subpath are `scope`, `start_url`, `navigateFallback`.
- Update flow being relied on: precache manifest hash changes per build →
  browser fetches `sw.js` on each online load (HTTP cache bypassed for SW
  scripts by spec) → new SW installs, `skipWaiting`+`clientsClaim` (defaults
  of `registerType: "autoUpdate"`) activate it; the page picks up the new
  build on the next reload/launch. Trade-off accepted: a mid-session update
  swap can, in theory, reload assets between screens — harmless here because
  every screen boots from the same entry and state persists per answer.

**Verify**: `bun run typecheck` → exit 0; `bun run build` → exit 0 and
`ls dist/` shows `sw.js`, `workbox-*.js`, `manifest.webmanifest`;
`grep '"scope":"/potworki/"' dist/manifest.webmanifest` (and `start_url`)
match; `grep -c 'pwa-maskable' dist/manifest.webmanifest` ≥ 1.

### Step 4: Point iOS at a real PNG (`index.html`)

Replace the SVG apple-touch-icon line:

```html
<link rel="apple-touch-icon" href="./apple-touch-icon.png" />
```

(Keep the SVG favicon line — desktop browsers prefer it.)

**Verify**: `bun run build` → exit 0; `grep apple-touch-icon dist/index.html`
shows the `.png`.

### Step 5: Safe-area insets for standalone (`src/styles.css`)

`viewport-fit=cover` is already set (`index.html:9`) and standalone mode has
no browser chrome to keep UI out of the hardware zones — without insets the
round-screen **keypad sits under the iPad home indicator** and the top row
(back button, HelpTip) crowds the status bar. Add ONE scoped block to
`src/styles.css` (after the `body { … }` rules, before the animation
sections), active only when installed:

```css
/* PWA standalone: odsuń UI od notcha i home-indicatora (viewport-fit=cover
   w index.html). W przeglądarce chrome robi to za nas — blok celowo scoped. */
@media (display-mode: standalone) {
	body {
		padding: env(safe-area-inset-top) env(safe-area-inset-right)
			env(safe-area-inset-bottom) env(safe-area-inset-left);
	}
}
```

**Known pitfall you must verify (the `min-h-dvh` cascade)**: the app shell
(`App.tsx:62-63`) AND leaf screens all declare `min-h-dvh`; `dvh` measures
the FULL viewport, so body padding can make content overflow by the inset
sum → a small persistent page scroll. The requirement is: **all tap targets
clear the insets AND no persistent vertical scroll appears on any screen**.
If the padding introduces scroll (check the round screen and village), apply
the documented fallback instead of improvising: define a safe viewport
custom property and switch the `min-h-dvh` call sites to it —

```css
:root { --app-vh: 100dvh; }
@media (display-mode: standalone) {
	:root {
		--app-vh: calc(
			100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom)
		);
	}
	body { padding: env(safe-area-inset-top) env(safe-area-inset-right)
		env(safe-area-inset-bottom) env(safe-area-inset-left); }
}
```

with `min-h-dvh` → `min-h-[var(--app-vh)]` across `src/` (mechanical sed;
list the touched files in the report). Prefer the simple body-padding
variant if it verifies clean; escalate to the fallback only on observed
overflow.

**Verify**: `bun run typecheck` + `bun run build` → exit 0. Best-effort
headless check: `page.emulateMediaFeatures([{ name: "display-mode", value:
"standalone" }])` → assert `getComputedStyle(document.body).paddingBottom`
reflects the env() declaration (emulated insets are 0 in headless, so this
only proves the block applies). **The real acceptance is the on-device
checklist item in the Test plan** — emulation cannot reproduce the home
indicator.

### Step 6: Offline verification (preview + headless chromium)

`bun run preview` (serves `dist/` with the `/potworki/` base), then a
scratchpad puppeteer script:

1. Load `http://localhost:<port>/potworki/` **online**; wait for
   `navigator.serviceWorker.ready`; assert
   `await navigator.serviceWorker.getRegistration()` is defined and its
   scope ends with `/potworki/`.
2. Assert the manifest link resolves (`fetch` the webmanifest → 200, JSON
   parses, `start_url === "/potworki/"`).
3. `page.setOfflineMode(true)` → `page.reload()` → the game must boot:
   assert the Home screen renders (button containing „Graj!").
4. Still offline: click „Graj!" → assert a question renders (the round
   screen works with zero network). Screenshot as evidence.

**Verify**: all four assertions pass; attach the offline screenshot to the
report.

### Step 7: Full-suite pass

**Verify**: `bun test` → 217 pass (unchanged — the only `src/` touch is a
CSS media block, which no test exercises); `bun run typecheck`,
`bun run build`, `bun run check` → all exit 0.

### Step 8: DOX pass

- Root `CLAUDE.md`, "Deploy" paragraph: add one sentence — the build emits a
  PWA service worker (`vite-plugin-pwa`, autoUpdate: po deployu appka
  aktualizuje się przy pierwszym uruchomieniu online; offline działa z
  precache); instalowalna z ekranu głównego.
- Root `CLAUDE.md`, "Poza `src/` nie ma child docs" line: mention
  `scripts/` (generator ikon PWA, uruchamiany ręcznie) and the `public/`
  icon set.
- `src/CLAUDE.md` (owns `styles.css`): one line in the styles bullet — the
  `@media (display-mode: standalone)` safe-area block (and, if the Step-5
  fallback was needed, the `--app-vh` custom property contract).
- `plans/README.md` — status row for 018.

**Verify**: `bun run check` → exit 0.

## Test plan

No unit tests apply (build-time config; the suite must simply stay green and
untouched). Verification IS the test:
- build artifacts present with correct scope/start_url (Step 3),
- the four-step offline puppeteer pass (Step 6) — boot offline + play a
  question offline, with screenshot,
- icons visually correct, maskable safe-zone respected (Step 2),
- `bun test` unchanged at 217.

Manual follow-up on real hardware (operator, post-merge — this checklist is
part of acceptance, not optional):
1. Install to home screen on the actual tablet (Android: „Dodaj do ekranu
   głównego"; iPad: Udostępnij → „Do ekranu początkowego").
2. **Safe areas (Step 5's real acceptance)**: in the installed app, open a
   round — the ENTIRE keypad (bottom row included) must be comfortably
   tappable above the home indicator, the back button/HelpTip clear of the
   status bar, in BOTH orientations; no screen may show a persistent
   vertical scroll it didn't have in the browser.
3. Toggle airplane mode, play a full round offline.
4. After the NEXT deploy: launch once online, close, relaunch — confirm the
   new build shows up on the second launch.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck`, `bun run build`, `bun run check` exit 0
- [ ] `bun test` exits 0 with the same test count as before the plan (217)
- [ ] `dist/` contains `sw.js` and `manifest.webmanifest`;
      `scope`/`start_url` are exactly `/potworki/`
- [ ] `public/` contains the four generated PNGs at declared sizes;
      `scripts/make-icons.ts` exists and regenerates them
- [ ] `dist/index.html` references `apple-touch-icon.png` (not the SVG)
- [ ] Offline puppeteer pass: SW registered, reload offline boots Home,
      a round starts offline (screenshot reported)
- [ ] `src/styles.css` contains the `@media (display-mode: standalone)`
      safe-area block; emulated display-mode check shows it applies
- [ ] `git diff --name-only` shows ONLY the in-scope files (under `src/`
      nothing but `styles.css` — and its fallback call-sites if escalated;
      no workflow changes)
- [ ] Root `CLAUDE.md` deploy note + `src/CLAUDE.md` styles note added;
      `plans/README.md` row updated
- [ ] On-device checklist handed to the operator (items 1–4 of the Test
      plan), with the safe-area item called out as blocking

## STOP conditions

Stop and report back (do not improvise) if:

- `bun add -d vite-plugin-pwa` resolves a version whose vite peer range does
  NOT include `^8.0.0`, or bun reports a peer conflict. (Registry check at
  plan time: 1.3.0 supports `^8.0.0` — but verify what actually resolves.)
- `vite build` fails inside the plugin (workbox codegen) — do not pin random
  older plugin versions to force it; report the error.
- The emitted manifest or SW registration lands at `/` instead of
  `/potworki/` and no documented option fixes it — the subpath is
  non-negotiable (GH Pages).
- The offline reload boots a BLANK page while online works — precache glob
  is missing an asset class (check the woff2/png globs) — diagnose, and if
  the fix isn't a glob, report.
- Anything requires editing `.github/workflows/deploy.yml`, or `src/**`
  beyond Step 5's CSS block and its documented `--app-vh` fallback.
- You are tempted to add an in-app "update available" prompt — out of scope
  by design (autoUpdate exists precisely to avoid asking a child to manage
  software updates).

## Maintenance notes

- **If the tablet ever seems "stuck on an old version"**: launch once
  online, close, relaunch — autoUpdate needs one online visit to swap
  builds. Nuclear option: site settings → wyczyść dane strony **(NIE robić
  bez eksportu zapisu — localStorage padnie razem z SW; to kolejny argument
  za planem „eksport/import zapisu")**.
- **First-run edge**: if the app is installed and the very first launch
  happens offline (or gets killed before precache completes), the child sees
  a blank page — there is nothing cached yet. Not a bug to fix (the SW can't
  cache what it never fetched): just launch once online after installing.
  The Step-6 automated pass waits for `serviceWorker.ready` before going
  offline, so it deliberately does NOT cover this half-cached case — hence
  this note.
- **Zoom (a11y record)**: `index.html` has had `user-scalable=no` since
  before this plan; in standalone there is no browser zoom fallback, so
  pinch-zoom is fully unavailable in the installed app. Out of this plan's
  scope to change — recorded here so a future accessibility pass weighs it
  deliberately (OS-level zoom/loupe still works).
- The SW precaches the whole build (~a few hundred KB gz) — revisit
  `globPatterns` only if the bundle ever grows enough for install-time cost
  to matter on the tablet.
- Icons regenerate with `scripts/make-icons.ts` whenever `favicon.svg`
  changes; the manifest strings (`name`/`description`) await the user's
  wordsmithing pass (PROPOZYCJE).
- Natural sibling: the save export/import plan — offline install increases
  the value of the save, and the "clear site data" recovery path above
  actively needs it.
