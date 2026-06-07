# Changelog

All notable changes to **Padel Mix & Match** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the app is in the `0.x.y` line, the API of session import codes
may change between minor versions — exports created in an older minor
version are migrated forward on import where possible, but old phones
running an older minor version may not understand a newer code.

---

## [Unreleased]

Nothing yet. Next up: a CLI tool to decode `PADELMM/v2/…` codes into
JSON + run scripted simulations (PRD #7 phase 2), then Mexicano +
Mix Americano formats on top of the new test harness (PRD #6).

---

## [0.4.0] — 2026-06-07

Test foundation + Copy-Session regression fix.

### Added
- **Vitest test suite** (`npm test`, `npm run test:watch`,
  `npm run test:coverage`). 55 tests across 6 files exercise the
  pure-logic core: `random`, `defaults`, `score-color`, `stats`,
  `teams` (round generation + fairness), and `share` (export ⇄
  import round-trip including the chunked-message path).
  Coverage: `score-color` 100%, `stats` 87%, `teams` 79%,
  `share` 79%. Untested files are the React hooks, store, and
  theme-application layers, which need a DOM harness — deferred.
- **Seedable PRNG** in `src/lib/random.ts` (Mulberry32). Lets
  tests assert "given roster X + seed Y the round draw is exactly
  Z" instead of having to reason about statistical properties
  over 1000s of iterations. Production code still uses
  `Math.random()` by default — the seed is an optional
  parameter, not a behavioural change. Lays the groundwork for
  the PRD #7 CLI simulator coming in 0.4.1.
- **`vitest.config.ts`** sized for fast pure-function unit tests
  (Node environment, no React plugin, v8 coverage). Kept separate
  from `vite.config.ts` so the PWA plugin doesn't slow test
  startup.

### Changed
- **`generateRound` accepts an optional `random: () => number`
  argument.** Defaults to `Math.random` so existing call sites
  are untouched. The new parameter is what makes the round-
  generation tests deterministic. Same refactor will let the
  upcoming CLI tool reproduce a session-night's exact draws from
  a seed in a config file.

### Fixed
- **Share import accepts schemaVersion 2 + 3** (i.e. every code
  produced by v0.3.x). The validator was previously hardcoded to
  `schemaVersion !== 1`, which silently broke the Copy Session
  flow the moment the store schema bumped to 2 in 0.3.0 — every
  freshly exported code refused to come back in, exactly the
  "Copy Session button stopped working" issue called out in the
  PRD. The validator now accepts any version up to
  `MAX_KNOWN_SCHEMA` (currently 3) and hands the payload to the
  store's migrator; codes from a *newer* build than this one
  surface a clear "update your phone" error instead of a vague
  "not a valid session". Regression test pinned in
  `share.test.ts`.
- **Import backfills missing `SessionConfig` fields** from
  `defaultSessionConfig()`. Pre-0.3 codes that lacked
  `avoidImmediateRepeat` (or future-rev codes missing fields we
  add next) now import with sensible defaults instead of
  partial-config states that confuse downstream code.

### Notes for maintainers
- When you bump `SCHEMA_VERSION` in `store.ts`, also bump
  `MAX_KNOWN_SCHEMA` in `share.ts` and add a fixture-level test
  in `share.test.ts` covering the new version. The validator
  comment block calls this out.
- Test scripts run in <300 ms on a quiet machine. Aim to keep
  pure-logic tests in `src/lib/**` and any future DOM tests in a
  separate `src/components/**.test.tsx` glob (vitest config will
  need a project override at that point).

---

## [0.3.3] — 2026-06-07

Mid-session settings + stepper alignment fix.

### Added
- **Round settings panel in the Session tab**: hosts can now change
  points per game, number of courts, and the avoid-same-partners
  toggle *after* tapping Start. Same controls as the Setup screen,
  same `setConfig` store action — so the host who's invested 10
  minutes entering 12 players doesn't lose the roster just to bump
  the points from 24 to 32. Shown only when the session has
  actually started (`status !== 'setup'`); a small advisory
  underneath the panel clarifies that saved scores in past rounds
  keep their original target while future rounds use the new one.

### Changed
- **`RoundSettings` extracted from `Setup`**: the entire Settings
  card (points segmented chips, custom even stepper, courts
  stepper, partner-repeat toggle) is now a standalone component
  consumed by both `Setup` and `SessionMenu`. No behaviour change
  in Setup; the Session-tab mount is the new feature.
- **NumberStepper alignment**: the readout box is now a fixed
  `6.5rem` outer width (was `min-w-[5.5rem]` which grew when a unit
  suffix was rendered). The digit centres inside via `flex-1` so a
  stepper with a `pts` unit and one without sit at the exact same
  position in adjacent rows — `Custom value` and `Number of courts`
  in the Settings panel now line up under each other.

---

## [0.3.2] — 2026-06-07

Second light-theme polish patch — the colour-bleed "blurish" feel on
LCD-style elements is gone, and the Setup steppers now accept direct
typing so big jumps don't require 40+ taps.

### Changed
- **NumberStepper — type-to-set centre**: the LCD value in the middle
  of the stepper became an inline `inputMode="numeric"` text field.
  Tap the number, type, Enter / blur to commit. The commit pass
  snaps to the nearest valid even (or step-multiple) inside `[min,
  max]` so typing "27" lands on "28" and teaches the parity rule by
  example. Escape reverts; +/− still work and are now equivalent to
  "nudge by step". Same control for both Custom points (6–98 step
  2) and Number of courts (1–12 step 1).
- **`startSession` safety net**: re-runs `normalisePointsPerGame()`
  on `config.targetTotal` at the moment the session goes live, so a
  host who taps "Start session" without blurring a dirty points
  input can't ship an odd target. Sum scoring depends on a whole-
  number midpoint, so this is enforced at the boundary rather than
  trusted to the input commit alone.

### Fixed
- **Light-theme LCD glow** ("Round 1, score, slider… blurish"):
  - `.lcd-num` text-shadow set to `none` in light mode. The CRT-
    style `0 0 6px / 14px currentColor` halo bled cyan/orange/green
    around digits on the cream surface — 1CD light doesn't use
    coloured text glow, so the digit colour (already darkened via
    `--score-lightness`) is left to carry the meaning on its own.
  - `shadow-lcd` / `shadow-lcd-gold` button halos replaced with a
    neutral `0 4px 10px -4px rgba(15,23,42,0.25)` elevation in light
    mode. Buttons keep their lift, lose the colour bleed.
  - Score-slider thumb `box-shadow` (an intensity-keyed coloured
    glow) replaced with the same neutral lift in light mode so the
    thumb reads as a clean disc instead of a smudge.

---

## [0.3.1] — 2026-06-07

Polish patch off the v0.3.0 launch. Six visual / UX bugs raised by the
first round of light-mode field testing — no behavioural changes to
match logic, ranking, or share codes.

### Changed
- **Setup screen — Points per game**: enforced even-only values
  (`step=2`, range `6–98`). The previous `step=1` let through odd
  totals like 25 / 27 which can't split into two whole-number halves
  (the slider midpoint expects `target / 2`). Schema migrated v2 → v3
  with `normalisePointsPerGame()` snapping any odd persisted target
  to the nearest valid even value.
- **Setup screen — Number of courts**: replaced the 1–4 segmented
  control with a `−  N  +` stepper bounded to `1–12` (default 3) so
  larger tournaments aren't blocked by the picker.
- **Setup screen — Custom points**: replaced the typed-number input
  with the same `−  N  +` stepper, matching the score-card `+`
  buttons on the Round screen. Both stepper rows now share an
  identical layout (label left, stepper right) so the section reads
  as one consistent settings family.
- **Round on session start**: forced `tab='play'` on the
  `setup → running` transition so opening "New mix & match" from the
  Session tab no longer leaves the host on Session when the new
  round is generated. Implemented via a `useRef`-tracked previous
  status in `App.tsx`.

### Fixed
- **Top-bar logo in light mode**: `AppHeader` was hardcoded to
  `/bl-logo.png` (cyan-on-navy badge); now mirrors the Splash logic
  and swaps to `/bl-logo-light.png` when the resolved theme is
  light. Setup header logo also picked up the same swap.
- **Light-mode contrast — disabled buttons**: the `Add N more
  players` and `Save score` buttons were mid-gray text on a
  mid-gray fill. Tailwind emits `disabled:bg-slate-700/60` as a
  separate higher-specificity class (`.disabled\:bg-slate-700\/60`
  with the `:disabled` pseudo) that the prior `[data-theme='light']
  .bg-slate-700/60` rule didn't catch. Added dedicated overrides
  to lift the fill to 14% ink and the label to `1CD neutral.600`.
- **Light-mode contrast — player chips inside Round/Team cards**:
  chips used `text-cyan-100` / `text-amber-100` which mapped to
  near-white on the cyan/amber tinted backgrounds. Extended the
  accent-text overrides to cover the full `100 / 200 / 300` ladder
  plus every opacity modifier in use (`/60`, `/80`, `/90`) for
  cyan / amber / yellow / emerald / rose families. Now read
  cleanly on cream.
- **Light-mode contrast — score digits (the "12:12" complaint)**:
  the LCD digit colour was `hsl(hue, 85%, 62%)` regardless of
  theme — designed for dark surfaces. Introduced
  `--score-saturation` / `--score-lightness` CSS variables that
  drive `scoreColor()` / `intensityColor()`. Light mode now uses
  `35%` lightness / `88%` saturation so the cyan → yellow → red
  gradient survives on white without going pastel.

---

## [0.3.0] — 2026-06-07

Focus of this release: a light theme grounded in the One Cisco Design
system spec, a single source of truth for app defaults, configurable
points per game, and a manual-game-entry path on the History tab.

### Added
- **Light theme** — full Auto / Light / Dark control under
  Preferences. Light surfaces use the canonical 1CD Glass tokens
  (`rgba(255,255,255,0.7)`, `blur(20px) saturate(180%)`) fetched
  directly from the One Cisco Design System MCP. Dark theme is the
  default and the original baseline; light is layered in as a
  `[data-theme='light']` override so no component JSX needed
  prefixing. Includes:
  - Logo swap to `bl-logo-light.png` (navy-on-white) in light mode.
  - Dual `<meta name="theme-color">` tags so the iOS / Android browser
    chrome matches before JS runs; pinned to the explicit choice after
    `applyTheme` resolves.
  - Theme persistence per phone, OS-change subscription when in Auto.
- **Configurable points per game** — `Setup` now exposes a segmented
  16 / 24 / 32 / Custom control, with the Custom input accepting any
  integer between `APP_DEFAULTS.pointsPerGameMin` and
  `pointsPerGameMax`. Score slider, score colour ramp, history
  rendering, and the Round-tab "sum N" label all derive from
  `config.targetTotal`, which is seeded from the central defaults.
- **Manual game entry** — `+ Add game` button on every round in the
  History tab. Opens a bottom sheet with team A / team B player
  pickers, a live ScoreSlider tied to the configured target, and an
  immediate save. New games are marked `recorded: true` and counted
  toward ranking. Court number auto-advances past the last court used
  in the round so manual entries don't collide with auto-generated
  ones.
- **`src/lib/defaults.ts`** — single source of truth for every "what
  should this start at?" value in the app: theme, points per game
  (with options + min / max), courts (with options), tournament type,
  player limits, round-generation rules, manual-game initial split.
  Used by `defaultState()` in the store, by the Setup UI, by the
  theme helper, and exposed for future PRD work (Mexicano /
  Mix Americano formats can change the tournament default without
  hunting magic numbers).
- **Schema migration** — bumped `SCHEMA_VERSION` to 2 with a
  forward-only migrator that backfills any missing config fields from
  the defaults. Existing v1 sessions on disk continue to load with no
  data loss.

### Changed
- **Splash tagline** is now dynamic — reads `config.targetTotal` so
  "Scores to 24" becomes "Scores to 16" / "32" / etc. depending on
  what the host has configured. First-run users see the default
  (24) unchanged.
- **Setup screen** reflects all centralised defaults on first paint:
  points selected at 24, courts selected at 3, player counter capped
  at 16 — all driven from `APP_DEFAULTS`, no literals.

### Internal
- Theme application is run synchronously in `main.tsx` before
  `createRoot`, so the first paint never flashes between dark and
  light. Idempotent so re-application from React effects is free.
- `addGameToRound` action returns a tagged-union result
  (`'round-not-found' | 'duplicate-player' | 'invalid-score'`) so the
  History sheet can flash a useful notice on each failure mode.

---

## [0.2.0] — 2026-06-07

Focus of this release: fixes to the session lifecycle, versioning
infrastructure, menu information-architecture refactor, and Cursor
skills documenting the codebase conventions.

### Added
- **Resume session** — counterpart to Finish session, appears only when
  status is `finished`. Flips the session back to running without
  touching players, rounds, scores, or ranking. Recovery path for
  accidental Finish taps.
- **Versioning pipeline** — `package.json#version` is now the single
  source of truth, surfaced into the About panel at build time via
  Vite. Bumping the version in one place updates everywhere the host
  sees it.
- **`CHANGELOG.md`** — this file, with all previous work backfilled
  under `0.1.0`.
- **Cursor skills** — three project-scoped skills under
  `.cursor/skills/` documenting the Blue Lions design system, the
  versioning workflow, and the app architecture. Helps any agent (or
  future-you) ramp up on the project without re-deriving conventions.

### Changed
- **Session menu IA** — buttons are now grouped under three section
  headers (Share / Session / Preferences) plus the About button. No
  feature was moved or renamed; the page is simply easier to scan.
- **Finish session** — now requires a two-tap confirm matching the
  Clear games and New mix & match buttons. First tap arms a 4-second
  amber confirm state, second tap actually finishes. Auto-cancels if
  the host does not follow through.

### Fixed
- **Finish session button no longer disappears on first tap.** Previously
  the button was wired straight to `finishSession()`, which flipped the
  status and unmounted the button via its own running-guard. Looked
  identical to a UI bug; was actually the action firing instantly with
  no confirm.

---

## [0.1.0] — 2026-05-21

Initial public release. Everything below was built and shipped before
the project moved to formal versioning.

### Added
- **Core Mix & Match flow** — Setup → Running → Finished states; random
  team generation every round; sum-to-24 scoring; live per-player
  ranking.
- **Translucent LCD design** — Blue Lions branded frosted-glass UI on a
  navy background with cyan/amber accents and LCD-style score digits.
- **Player management** — add, rename, mark as paused, mark as left, or
  swap any two players (playing or resting) mid-round.
- **Score input** — single slider with dynamic colour gradient; the
  digits follow the slider value from cyan (balanced) to red (lopsided).
- **Round controls** — reshuffle teams for the current round (only
  before any score is recorded), generate the next round, edit or
  delete a past game from the History tab.
- **Fair resting rotation** — the team generator tracks how many games
  each player has rested, so the most-rested players play next.
- **Bonus points** — add or subtract individual points from any player
  via the Ranking screen.
- **Ranking modes** — toggle between Points-first (default) and
  Wins-first sorts on the fly. Preference is per-phone.
- **Final round** — seeded by the current ranking mode; pairs
  `(rank 1 + rank 4)` vs `(rank 2 + rank 3)` per court starting from
  the strongest. Top `courts × 4` active players only; rest sit out.
  One final per session.
- **History tab** — scroll through every round of the session; edit or
  delete individual games.
- **Share & import** — copy the session state as a base64-gzipped
  text code (auto-split into chunks when too long for one message);
  paste into another phone to hand off mid-session.
- **PWA install + offline** — installable on iOS and Android, fully
  offline-capable. Update banner appears when a new version is
  deployed; manual `Reload app (keep all data)` button in the Session
  menu as a backup.
- **iOS safe area handling** — top bar respects the system status bar
  area when installed as a PWA.
- **About panel** — re-opens the welcome screen with a `Send feedback`
  link that files a GitHub issue (anti-spam delegated to GitHub
  authentication; no email exposed in the bundle).
- **MIT License** — code is open source; copyright "Alex K", 2026.

### Security & privacy
- All data is stored in the host phone's `localStorage` only.
- Nothing is uploaded; no analytics, no telemetry, no third-party
  scripts at runtime.
- All commits use a GitHub noreply email; the previous work-email leak
  in `0.0.x` commits was scrubbed via `git filter-repo` rewrite.
- Feedback channel piggybacks on GitHub's authentication for spam
  protection; no email address appears anywhere in the bundle.

[Unreleased]: https://github.com/padelmm/padelmm.github.io/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/padelmm/padelmm.github.io/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/padelmm/padelmm.github.io/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/padelmm/padelmm.github.io/releases/tag/v0.1.0
