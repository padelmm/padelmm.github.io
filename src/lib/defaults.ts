/**
 * Central app defaults.
 *
 * Single source of truth for every "what should this start at?" value
 * in the app — match scoring, court count, theme, tournament format,
 * player limits, and round-generation rules. Anything that's a knob
 * the host might want to flip lives here so a future maintainer (or
 * a future tournament mode) can tweak one place and have it propagate
 * everywhere.
 *
 * IMPORTANT: this file describes the *new-session* defaults only.
 * Once a session has been created its `SessionConfig` snapshot is the
 * authoritative value used at runtime — these defaults do not retro-
 * actively change existing sessions on disk. Bumping any value here
 * also requires bumping the schema-migration map in `store.ts` if you
 * want existing sessions to pick up the new value.
 *
 * Conventions:
 *  - All numbers are tournament-agnostic raw values (not points / 2
 *    or similar). Half-targets are derived where used.
 *  - All option arrays are `readonly` tuples so they can be passed
 *    straight to segmented-control UI without copy.
 *  - Theme + tournament use the same literal-union types as the
 *    runtime so changing the default here can't drift from the
 *    legal values.
 */

import type { SessionConfig, TournamentType } from './types';
import type { ThemeMode } from './theme';

export type { TournamentType };

/** UI metadata for the tournament segmented control in RoundSettings. */
export const TOURNAMENT_OPTIONS: ReadonlyArray<{
  id: TournamentType;
  label: string;
  description: string;
}> = [
  {
    id: 'mix-and-match',
    label: 'Americano',
    description: 'Random fair rotation — new partners each round.',
  },
  {
    id: 'mexicano',
    label: 'Mexicano',
    description: 'Courts seeded by ranking — top players on court 1.',
  },
  {
    id: 'mix-americano',
    label: 'Mix Americano',
    description: 'Mixed teams (M+F) — set gender on each player.',
  },
] as const;

const TOURNAMENT_IDS = new Set<TournamentType>(
  TOURNAMENT_OPTIONS.map((o) => o.id),
);

export const APP_DEFAULTS = {
  // --- Appearance --------------------------------------------------------

  /** Default theme for new installs. See `theme.ts` for resolution. */
  theme: 'dark' as ThemeMode,

  // --- Match scoring -----------------------------------------------------

  /**
   * Total points awarded per game, split between the two teams. The
   * Blue Lions house rule is sum-to-24 — every game ends 24:0, 23:1,
   * ..., 12:12, ..., 0:24. Score colours derive from `target / 2`.
   */
  pointsPerGame: 24,

  /**
   * Options shown in the Setup screen segmented control. The selected
   * value writes through to `SessionConfig.targetTotal`. "Custom" is
   * rendered automatically alongside these in the UI.
   *
   * MUST be even values — the score model splits points between two
   * teams and the central balance point (12:12 for 24, etc.) is the
   * slider midpoint. Hardcoded options are vetted; the custom
   * stepper enforces the same parity rule.
   */
  pointsPerGameOptions: [16, 24, 32] as const,

  /**
   * Lower / upper bound + step for the "Custom" points stepper.
   * Even-only by design: 6 lets a host run a quick 6-point shoot-out
   * tiebreaker, 98 covers any sane long-format game while fitting in
   * two digits. Step of 2 keeps every value an integer split of two
   * teams (sum-to-target with both halves being whole numbers when
   * the target is even).
   */
  pointsPerGameMin: 6,
  pointsPerGameMax: 98,
  pointsPerGameStep: 2,

  // --- Court layout ------------------------------------------------------

  /** Default number of available courts at start. */
  courts: 3,

  /**
   * Inclusive bounds for the courts stepper in Setup. Twelve courts
   * × 4 players = 48 = a generously big club night; small tournaments
   * usually use 2–4. The actual courts played each round is capped at
   * `min(maxCourts, floor(activePlayers / 4))`, so picking 12 with
   * only 8 players just means the generator uses 2 of them.
   */
  courtsMin: 1,
  courtsMax: 12,

  // --- Tournament format -------------------------------------------------

  /** Default tournament type for new sessions (Blue Lions Americano). */
  tournament: 'mix-and-match' as TournamentType,

  // --- Round-generation rules -------------------------------------------

  /**
   * If true, the round generator tries not to pair the same two
   * players together in back-to-back rounds. Set to false to allow
   * "doubles partners stay together" mode.
   */
  avoidImmediateRepeat: true,

  // --- Player limits -----------------------------------------------------

  /** Minimum active players required to start a session. */
  minPlayers: 4,

  /**
   * Maximum players that can be added to the roster. 16 = four full
   * courts of doubles; raising this requires also bumping
   * `courtsOptions` so all players can be put on a court.
   */
  maxPlayers: 80,

  // --- Manual game entry -------------------------------------------------

  /**
   * Default A-team score when a manual game form first opens — split
   * the points evenly so the slider sits in the middle and the host
   * just nudges to the actual score they remember.
   */
  manualGameInitialSplitRatio: 0.5,
} as const;

/**
 * Build a fresh `SessionConfig` from the defaults. Used by `store.ts`
 * to seed `defaultState()` and by `clearGames()` callers that want to
 * reset config to its baseline. Returns a plain mutable object so
 * Zustand can persist it.
 */
export function defaultSessionConfig(): SessionConfig {
  return {
    targetTotal: APP_DEFAULTS.pointsPerGame,
    maxCourts: APP_DEFAULTS.courts,
    avoidImmediateRepeat: APP_DEFAULTS.avoidImmediateRepeat,
    tournament: APP_DEFAULTS.tournament,
  };
}

export function isValidTournament(t: string): t is TournamentType {
  return TOURNAMENT_IDS.has(t as TournamentType);
}

/** Short label for History and confirm dialogs. */
export function tournamentLabel(id: TournamentType): string {
  return TOURNAMENT_OPTIONS.find((o) => o.id === id)?.label ?? 'Americano';
}

/**
 * Type-narrowing helper: validate that an incoming `pointsPerGame`
 * value (either from a UI control or a migrated session) is inside
 * the allowed range and matches the step (i.e. is even). Used by
 * `setConfig` callers to avoid persisting a 0, an odd target, or
 * NaN.
 */
export function isValidPointsPerGame(n: number): boolean {
  return (
    Number.isFinite(n) &&
    Number.isInteger(n) &&
    n >= APP_DEFAULTS.pointsPerGameMin &&
    n <= APP_DEFAULTS.pointsPerGameMax &&
    n % APP_DEFAULTS.pointsPerGameStep === 0
  );
}

/**
 * Clamp + parity-correct a raw points-per-game value (e.g. typed
 * into a stepper or migrated from a pre-step-2 schema). Snaps to
 * the nearest even value inside [min, max].
 */
export function normalisePointsPerGame(n: number): number {
  if (!Number.isFinite(n)) return APP_DEFAULTS.pointsPerGame;
  const step = APP_DEFAULTS.pointsPerGameStep;
  const snapped = Math.round(n / step) * step;
  return Math.max(
    APP_DEFAULTS.pointsPerGameMin,
    Math.min(APP_DEFAULTS.pointsPerGameMax, snapped),
  );
}
