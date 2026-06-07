---
name: app-architecture
description: Codebase layout, data model, state lifecycle, persistence strategy, and PWA conventions for Padel Mix & Match. Use when adding a new feature, debugging persistence issues, changing the data schema, or onboarding to the repo.
---

# Padel Mix & Match — Architecture

A single-page React PWA that runs on the host's phone. No backend, no
analytics, no third-party runtime scripts. The host (one phone at a
time) is the source of truth; multi-phone hand-off happens through
share codes pasted between hosts via any messenger.

## Tech stack

- **Vite + React + TypeScript** for the app.
- **Tailwind CSS** with `bl-*` color tokens (see `blue-lions-design` skill).
- **Zustand** for state, with the `persist` middleware writing to
  `localStorage`.
- **vite-plugin-pwa** for the service worker, install prompt, and update
  banner.
- **GitHub Pages** for hosting; **GitHub Actions** auto-deploys every
  push to `main` (see `.github/workflows/deploy.yml`).

## Directory layout

```
src/
├── lib/                # Pure TypeScript — no React imports allowed here
│   ├── types.ts        # Player, Round, Game, SessionConfig, SessionState
│   ├── store.ts        # Zustand store + actions + persist middleware
│   ├── teams.ts        # Round generation (Americano now; Mexicano + Mix
│   │                   # Americano planned in PRD item 6)
│   ├── stats.ts        # Ranking computations + sortByMode dispatcher
│   ├── score-color.ts  # HSL interpolation for score-driven colors
│   ├── share.ts        # Export / import: base64 + gzip + chunking
│   ├── ranking-mode.ts # Per-phone Points/Wins toggle storage
│   ├── intro.ts        # First-run welcome dismissal flag
│   └── pwa.tsx         # PwaProvider context + useRegisterSW wrapper
└── components/         # React UI; consumes lib/* via hooks
```

## Why `lib/` stays pure

`lib/*` deliberately has zero React imports. Two payoffs:

1. **Testability** — a Node CLI can `import` from `lib/` directly to run
   thousands of simulated rounds without instantiating React. See the
   planned `test/` folder (PRD item 7).
2. **Reusability** — could ship the algorithm core as a standalone npm
   package later without untangling React from it.

When you add new domain logic, put it in `lib/`. Components only call
into `lib/` via the store or pure imports.

## Session state machine

`SessionState.status` is the central lifecycle.

```
        ┌─────────────┐
        │   setup     │   ← players added, config tweaked
        └──────┬──────┘
               │ startSession()
               ▼
        ┌─────────────┐
        │  running    │   ← rounds generated, scores recorded
        └──────┬──────┘
               │ finishSession() (2-tap confirm)
               ▼
        ┌─────────────┐
        │  finished   │   ← read-only view; ranking & history browsable
        └──────┬──────┘
               │ resumeSession()   newSession()
               ▼                    ▼
            running                setup (with cleared data)
```

Guard rails:

- **Config edits** (player roster, points-per-game, format) only allowed
  in `setup`.
- **Round generation** only allowed in `running`.
- **Resume** only allowed from `finished` (guarded in `store.ts`).

## Persistence

- `localStorage` key: `padel-mix-match-session-v1` (Zustand persist
  middleware). Holds the *entire* `SessionState` — players, rounds,
  config, status, `createdAt`.
- `localStorage` key: `padel-mm:ranking-mode-v1` — per-phone Points/Wins
  toggle, separate from session state so importing a friend's session
  doesn't overwrite your view preference.
- `localStorage` key: `padel-mm:intro-seen-v1` — first-run flag.

**Never put session data in a non-persisted slot.** A host who refreshes
the page mid-game must come back to the same state.

## Share / import format

`exportSession()` → JSON.stringify → gzip → base64url → chunked into
~3 kB pieces if necessary. Each share code is prefixed with
`padel-mm-v1:` and includes a schemaVersion so future migrations are
possible.

`importSession()` tolerates extra surrounding chat text, chunks pasted
in any order, and missing chunks (it tells the host which parts are
still missing). Importing fully overwrites the local state.

If the data shape changes, bump `schemaVersion` in `types.ts` and add a
migration branch in `share.ts#importSession`. Never delete a migration —
old shares need to still load.

## Round generation

`generateRound({ players, rounds, config })` returns a new `Round` with:

- 4 active players per court, drawn by *most-rested-first* fairness.
- Random team assignment within those 4.
- A `kind: 'normal' | 'final'` discriminator (added with the final-round
  feature).

`generateFinalRound` uses deterministic seeding by the current ranking
mode (Points or Wins). See `teams.ts` and `stats.ts#sortByMode`.

## React conventions

- Function components only; hooks for state, no class components.
- Zustand selectors should be **narrow** (`useSession((s) => s.players)`)
  not whole-state to avoid unnecessary re-renders.
- Modal / sheet open state lives in the *parent* component, not the
  modal itself. The modal receives `open` and `onClose` props.
- No prop drilling more than two levels. If a fourth level needs the
  value, add it to the store or a small context (`pwa.tsx` is the only
  context currently).

## PWA update flow

1. New deploy lands on GitHub Pages.
2. The service worker registered via `useRegisterSW` polls every ~60 s.
3. On detecting a new version, `usePwa().needRefresh` flips true.
4. `UpdateBanner.tsx` slides in from the top with a "Reload" CTA.
5. The user can also force a reload via `Session menu → Reload app
   (keep all data)` — same `forceReload()` action, manual trigger.

**Never invalidate `localStorage` on reload.** All user data must
survive an update.

## Extension points (PRD roadmap)

- **Item 4 — configurable points**: add `pointsPerGame` to `SessionConfig`,
  default 24, used by `ScoreSlider`, `score-color`, and the new-game
  initial value. Schema-bump on import.
- **Item 6 — tournament formats**: add `format: 'americano' | 'mexicano'
  | 'mix-americano'` to `SessionConfig`. Add optional `category: 'M' | 'F'`
  to `Player` (only shown / required when format is Mix Americano).
  Branch in `store.ts#generateNextRound` to call format-specific
  generators in `teams.ts`.
- **Item 7 — test harness**: a `test/` folder running pure Node scripts
  that import from `lib/`. Should not need any mocking since `lib/` has
  no React or browser API dependencies.

## Don'ts

- ❌ Add a network request at runtime. The app is offline-first.
- ❌ Import React in any `lib/*` file.
- ❌ Store secrets, telemetry IDs, or analytics in `localStorage`.
- ❌ Use `useState` for data that should survive a reload — put it in
  the Zustand store.
- ❌ Skip the schemaVersion bump when changing share-code shape.
