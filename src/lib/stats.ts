import type { RankingMode } from './ranking-mode';
import type { Player, PlayerId, PlayerStats, Round } from './types';

export function computeStats(players: readonly Player[], rounds: readonly Round[]): PlayerStats[] {
  const map = new Map<PlayerId, PlayerStats>();
  for (const p of players) {
    map.set(p.id, {
      playerId: p.id,
      name: p.name,
      status: p.status,
      gamesPlayed: 0,
      pointsScored: 0,
      pointsAgainst: 0,
      bonus: p.bonus ?? 0,
      total: p.bonus ?? 0,
      wins: 0,
      losses: 0,
      draws: 0,
      timesRested: 0,
    });
  }

  for (const round of rounds) {
    for (const id of round.restingPlayerIds) {
      const s = map.get(id);
      if (s) s.timesRested += 1;
    }
    for (const g of round.games) {
      if (!g.recorded) continue;
      const aWon = g.teamA.score > g.teamB.score;
      const bWon = g.teamB.score > g.teamA.score;
      const isDraw = g.teamA.score === g.teamB.score;
      for (const id of g.teamA.playerIds) {
        const s = map.get(id);
        if (!s) continue;
        s.gamesPlayed += 1;
        s.pointsScored += g.teamA.score;
        s.pointsAgainst += g.teamB.score;
        if (aWon) s.wins += 1;
        else if (bWon) s.losses += 1;
        else if (isDraw) s.draws += 1;
      }
      for (const id of g.teamB.playerIds) {
        const s = map.get(id);
        if (!s) continue;
        s.gamesPlayed += 1;
        s.pointsScored += g.teamB.score;
        s.pointsAgainst += g.teamA.score;
        if (bWon) s.wins += 1;
        else if (aWon) s.losses += 1;
        else if (isDraw) s.draws += 1;
      }
    }
  }

  for (const s of map.values()) {
    s.total = s.pointsScored + s.bonus;
  }

  return Array.from(map.values());
}

/**
 * Default points-first sort. Tiebreak order, applied left-to-right:
 *   1. total points (desc) — primary
 *   2. wins (desc)         — more wins beats fewer
 *   3. points against (asc)— better defence beats worse
 *   4. games played (asc)  — efficiency: fewer games for the same points
 *                            beats more games
 *   5. name (asc)          — stable, alphabetical fallback
 */
export function sortByPoints(stats: readonly PlayerStats[]): PlayerStats[] {
  return stats
    .slice()
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.wins - a.wins ||
        a.pointsAgainst - b.pointsAgainst ||
        a.gamesPlayed - b.gamesPlayed ||
        a.name.localeCompare(b.name),
    );
}

/**
 * Wins-first sort. Mirrors `sortByPoints` but swaps the first two keys:
 *   1. wins (desc)         — primary
 *   2. total points (desc) — tiebreak on wins
 *   3. points against (asc), games played (asc), name (asc)
 *
 * Useful when the host wants to celebrate decisive results over total
 * accumulated points (see Ranking screen toggle).
 */
export function sortByWins(stats: readonly PlayerStats[]): PlayerStats[] {
  return stats
    .slice()
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.total - a.total ||
        a.pointsAgainst - b.pointsAgainst ||
        a.gamesPlayed - b.gamesPlayed ||
        a.name.localeCompare(b.name),
    );
}

/**
 * Sort according to the current ranking mode. Used by the Ranking
 * screen *and* by the final-round seeding so that the leaderboard the
 * host is reading and the matchup it produces always agree.
 */
export function sortByMode(
  stats: readonly PlayerStats[],
  mode: RankingMode,
): PlayerStats[] {
  return mode === 'wins' ? sortByWins(stats) : sortByPoints(stats);
}
