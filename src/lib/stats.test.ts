import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';
import type { Game, Player, Round } from './types';

function player(id: string, name: string, bonus = 0): Player {
  return { id, name, status: 'active', bonus };
}

function game(
  id: string,
  court: number,
  teamA: [string, string],
  teamB: [string, string],
  scoreA: number,
  scoreB: number,
  recorded = true,
): Game {
  return {
    id,
    court,
    teamA: { playerIds: teamA, score: scoreA },
    teamB: { playerIds: teamB, score: scoreB },
    recorded,
  };
}

function round(
  id: string,
  number: number,
  games: Game[],
  restingPlayerIds: string[] = [],
): Round {
  return { id, number, games, restingPlayerIds, createdAt: 0 };
}

describe('computeStats', () => {
  it('zero-initialises every player when no rounds played', () => {
    const players = [player('a', 'Alice'), player('b', 'Bob')];
    const stats = computeStats(players, []);
    expect(stats).toHaveLength(2);
    expect(stats[0]?.gamesPlayed).toBe(0);
    expect(stats[0]?.pointsScored).toBe(0);
    expect(stats[0]?.wins).toBe(0);
    expect(stats[0]?.losses).toBe(0);
    expect(stats[0]?.draws).toBe(0);
    expect(stats[0]?.timesRested).toBe(0);
  });

  it('counts wins, losses, and draws correctly across team membership', () => {
    const players = [
      player('a', 'Alice'),
      player('b', 'Bob'),
      player('c', 'Carol'),
      player('d', 'Dave'),
    ];
    const g1 = game('g1', 1, ['a', 'b'], ['c', 'd'], 20, 4); // A team wins
    const g2 = game('g2', 1, ['a', 'c'], ['b', 'd'], 12, 12); // draw
    const stats = computeStats(players, [round('r1', 1, [g1, g2])]);
    const alice = stats.find((s) => s.playerId === 'a')!;
    expect(alice.wins).toBe(1);
    expect(alice.draws).toBe(1);
    expect(alice.losses).toBe(0);
    expect(alice.pointsScored).toBe(20 + 12);
    expect(alice.pointsAgainst).toBe(4 + 12);
  });

  it('ignores games marked recorded=false', () => {
    // The Round screen shows in-flight games that haven't been
    // saved yet; their scores must not pollute the ranking until
    // the host taps Save.
    const players = [
      player('a', 'A'),
      player('b', 'B'),
      player('c', 'C'),
      player('d', 'D'),
    ];
    const g = game('g1', 1, ['a', 'b'], ['c', 'd'], 24, 0, false);
    const stats = computeStats(players, [round('r1', 1, [g])]);
    expect(stats.every((s) => s.gamesPlayed === 0)).toBe(true);
    expect(stats.every((s) => s.pointsScored === 0)).toBe(true);
  });

  it('counts a rest in restingPlayerIds even with no games', () => {
    const stats = computeStats(
      [player('a', 'A')],
      [round('r1', 1, [], ['a'])],
    );
    expect(stats[0]?.timesRested).toBe(1);
  });

  it('total = pointsScored + bonus', () => {
    const players = [player('a', 'A', 5), player('b', 'B'), player('c', 'C'), player('d', 'D')];
    const g = game('g1', 1, ['a', 'b'], ['c', 'd'], 18, 6);
    const stats = computeStats(players, [round('r1', 1, [g])]);
    const a = stats.find((s) => s.playerId === 'a')!;
    expect(a.pointsScored).toBe(18);
    expect(a.bonus).toBe(5);
    expect(a.total).toBe(23);
  });

  it('uses 0 bonus when missing from the source player', () => {
    // Defensive against pre-bonus session imports that don't set the
    // field. Should not corrupt totals with NaN.
    const players: Player[] = [
      { id: 'a', name: 'A', status: 'active', bonus: undefined as unknown as number },
    ];
    const stats = computeStats(players, []);
    expect(stats[0]?.bonus).toBe(0);
    expect(stats[0]?.total).toBe(0);
  });
});
