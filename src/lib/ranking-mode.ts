/**
 * Per-phone preference for how the leaderboard is sorted. Stored
 * directly in localStorage (not in the persisted session state) so it
 * survives session imports and "Clear games" without being overwritten
 * by another host's preferences.
 *
 * - 'points' — total points first, wins as tiebreak (the default)
 * - 'wins'   — wins first, total points as tiebreak
 *
 * Whichever mode the host has selected also drives the seeding of the
 * final round, so the leaderboard the host is looking at and the final
 * matchup it produces always agree.
 */
export type RankingMode = 'points' | 'wins';

const STORAGE_KEY = 'padel-mm:ranking-mode-v1';

export const rankingModeStorage = {
  get(): RankingMode {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'wins' ? 'wins' : 'points';
    } catch {
      return 'points';
    }
  },
  set(mode: RankingMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore — read-only storage is not fatal */
    }
  },
};
