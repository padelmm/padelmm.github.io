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

import type { SessionConfig } from './types';
import type { ThemeMode } from './theme';

/**
 * Tournament format. 'mix-and-match' is the only mode shipping today;
 * 'mexicano' and 'mix-americano' are reserved for PRD items 6 and 7
 * and currently fall back to the same generator as mix-and-match.
 */
export type TournamentType = 'mix-and-match' | 'mexicano' | 'mix-americano';

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
   */
  pointsPerGameOptions: [16, 24, 32] as const,

  /**
   * Lower / upper bound for the "Custom" points input. 6 lets a host
   * run a quick 6-point shoot-out tiebreaker; 99 covers any sane
   * long-format game while still fitting in two digits everywhere
   * the UI renders a score.
   */
  pointsPerGameMin: 6,
  pointsPerGameMax: 99,

  // --- Court layout ------------------------------------------------------

  /** Default number of available courts at start. */
  courts: 3,

  /**
   * Choices shown in the Setup screen courts picker. Capped at 4
   * because the player limit (16) divides into at most 4 four-person
   * courts; bump this AND `maxPlayers` together to support larger
   * tournaments.
   */
  courtsOptions: [1, 2, 3, 4] as const,

  // --- Tournament format -------------------------------------------------

  /**
   * Default tournament type for new sessions. Mexicano / Mix Americano
   * are placeholders surfaced in the Setup UI but not yet wired into
   * the generator (PRD items 6 + 7).
   */
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
  maxPlayers: 16,

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
  };
}

/**
 * Type-narrowing helper: validate that an incoming `pointsPerGame`
 * value (either from a UI control or a migrated session) is inside
 * the allowed range. Used by `setConfig` callers to avoid persisting
 * a 0 or NaN.
 */
export function isValidPointsPerGame(n: number): boolean {
  return (
    Number.isFinite(n) &&
    n >= APP_DEFAULTS.pointsPerGameMin &&
    n <= APP_DEFAULTS.pointsPerGameMax &&
    Number.isInteger(n)
  );
}
