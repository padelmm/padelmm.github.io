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

Nothing yet. Items being scoped: light theme, configurable tournament
points, manual game add, Mexicano + Mix Americano formats, automated
test harness.

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

[Unreleased]: https://github.com/padelmm/padelmm.github.io/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/padelmm/padelmm.github.io/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/padelmm/padelmm.github.io/releases/tag/v0.1.0
