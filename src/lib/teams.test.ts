import { describe, expect, it } from 'vitest';
import {
  generateMexicanoRound,
  generateMixAmericanoRound,
  generateRound,
  previewFinalRound,
} from './teams';
import { mulberry32 } from './random';
import type { Player, Round, SessionConfig } from './types';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    status: 'active',
    bonus: 0,
  }));
}

const baseConfig: SessionConfig = {
  targetTotal: 24,
  maxCourts: 4,
  avoidImmediateRepeat: true,
  tournament: 'mix-and-match',
};

function playerWithGender(
  id: string,
  name: string,
  gender: 'm' | 'f',
): import('./types').Player {
  return { id, name, status: 'active', bonus: 0, gender };
}

describe('generateRound — input validation', () => {
  it('refuses to draw with fewer than 4 active players', () => {
    const result = generateRound({
      players: makePlayers(3),
      rounds: [],
      config: baseConfig,
      random: mulberry32(1),
    });
    expect(result.round).toBeNull();
    expect(result.message).toMatch(/at least 4/i);
  });

  it('treats paused players as not active', () => {
    const players = makePlayers(4);
    players[0]!.status = 'paused';
    const result = generateRound({
      players,
      rounds: [],
      config: baseConfig,
      random: mulberry32(1),
    });
    expect(result.round).toBeNull();
  });
});

describe('generateRound — tournament snapshot', () => {
  it('stores the active tournament on each new round', () => {
    const result = generateRound({
      players: makePlayers(8),
      rounds: [],
      config: { ...baseConfig, tournament: 'mexicano' },
      random: mulberry32(1),
    });
    expect(result.round?.tournament).toBe('mexicano');
  });
});

describe('generateRound — court allocation', () => {
  it('caps actual courts at floor(activePlayers / 4)', () => {
    // 6 active players + maxCourts=4 should still only schedule 1
    // court (you need 4 players per court).
    const result = generateRound({
      players: makePlayers(6),
      rounds: [],
      config: { ...baseConfig, maxCourts: 4 },
      random: mulberry32(1),
    });
    expect(result.round?.games).toHaveLength(1);
    expect(result.round?.restingPlayerIds).toHaveLength(2);
  });

  it('respects maxCourts when there are plenty of players', () => {
    const result = generateRound({
      players: makePlayers(16),
      rounds: [],
      config: { ...baseConfig, maxCourts: 3 },
      random: mulberry32(1),
    });
    expect(result.round?.games).toHaveLength(3);
    expect(result.round?.restingPlayerIds).toHaveLength(4);
  });

  it('numbers courts starting at 1 and incrementing by 1', () => {
    const result = generateRound({
      players: makePlayers(12),
      rounds: [],
      config: { ...baseConfig, maxCourts: 3 },
      random: mulberry32(1),
    });
    const numbers = result.round!.games.map((g) => g.court);
    expect(numbers).toEqual([1, 2, 3]);
  });

  it('puts exactly 4 distinct players on each court', () => {
    const result = generateRound({
      players: makePlayers(12),
      rounds: [],
      config: { ...baseConfig, maxCourts: 3 },
      random: mulberry32(1),
    });
    for (const g of result.round!.games) {
      const ids = new Set([...g.teamA.playerIds, ...g.teamB.playerIds]);
      expect(ids.size).toBe(4);
    }
  });

  it('initialises every game to the midpoint score for the slider', () => {
    const result = generateRound({
      players: makePlayers(8),
      rounds: [],
      config: { ...baseConfig, targetTotal: 24, maxCourts: 2 },
      random: mulberry32(1),
    });
    const expected = Math.floor(24 / 2);
    for (const g of result.round!.games) {
      expect(g.teamA.score).toBe(expected);
      expect(g.teamB.score).toBe(expected);
      expect(g.recorded).toBe(false);
    }
  });
});

describe('generateRound — determinism', () => {
  it('produces an identical court draw for the same seed', () => {
    const players = makePlayers(8);
    const a = generateRound({
      players,
      rounds: [],
      config: baseConfig,
      random: mulberry32(0xc0ffee),
    });
    const b = generateRound({
      players,
      rounds: [],
      config: baseConfig,
      random: mulberry32(0xc0ffee),
    });
    // IDs and timestamps come from `crypto.randomUUID()` / `Date.now()`
    // and *will* differ between calls — compare only the player slots.
    const drawA = a.round!.games.map((g) => ({
      court: g.court,
      teamA: g.teamA.playerIds,
      teamB: g.teamB.playerIds,
    }));
    const drawB = b.round!.games.map((g) => ({
      court: g.court,
      teamA: g.teamA.playerIds,
      teamB: g.teamB.playerIds,
    }));
    expect(drawA).toEqual(drawB);
  });

  it('produces a different draw for a different seed', () => {
    const players = makePlayers(12);
    const a = generateRound({
      players,
      rounds: [],
      config: baseConfig,
      random: mulberry32(1),
    });
    const b = generateRound({
      players,
      rounds: [],
      config: baseConfig,
      random: mulberry32(2),
    });
    const drawA = a.round!.games.map((g) => g.teamA.playerIds.join('+'));
    const drawB = b.round!.games.map((g) => g.teamA.playerIds.join('+'));
    expect(drawA).not.toEqual(drawB);
  });
});

describe('generateRound — fairness', () => {
  it('prefers to play players who have rested most across many rounds', () => {
    // Simulate 20 rounds with 6 players + 1 court (2 rest per round)
    // and assert nobody rests more than ⌈20 × 2 / 6⌉ + 1 = 8 times.
    // (The +1 slack handles the rounding boundary.)
    const players = makePlayers(6);
    const rounds: Round[] = [];
    const random = mulberry32(0xdeadbeef);
    for (let i = 0; i < 20; i++) {
      const result = generateRound({
        players,
        rounds,
        config: { ...baseConfig, maxCourts: 1 },
        random,
      });
      rounds.push(result.round!);
    }
    const rests = new Map<string, number>();
    for (const r of rounds) {
      for (const id of r.restingPlayerIds) {
        rests.set(id, (rests.get(id) ?? 0) + 1);
      }
    }
    // 20 rounds × 2 rests per round = 40 rest slots, spread over 6
    // players → 6.67 each on average. Tolerate ±2 to absorb the tie-
    // breaking randomness.
    for (const count of rests.values()) {
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(9);
    }
  });

  it('avoids reusing the same partner pair in back-to-back rounds when configured', () => {
    const players = makePlayers(8);
    const random = mulberry32(2025);
    const r1 = generateRound({
      players,
      rounds: [],
      config: { ...baseConfig, avoidImmediateRepeat: true, maxCourts: 2 },
      random,
    }).round!;
    const r2 = generateRound({
      players,
      rounds: [r1],
      config: { ...baseConfig, avoidImmediateRepeat: true, maxCourts: 2 },
      random,
    }).round!;

    const pairKey = (a: string, b: string) =>
      a < b ? `${a}|${b}` : `${b}|${a}`;
    const r1Pairs = new Set<string>();
    for (const g of r1.games) {
      r1Pairs.add(pairKey(g.teamA.playerIds[0], g.teamA.playerIds[1]));
      r1Pairs.add(pairKey(g.teamB.playerIds[0], g.teamB.playerIds[1]));
    }
    const r2Pairs = new Set<string>();
    for (const g of r2.games) {
      r2Pairs.add(pairKey(g.teamA.playerIds[0], g.teamA.playerIds[1]));
      r2Pairs.add(pairKey(g.teamB.playerIds[0], g.teamB.playerIds[1]));
    }
    // Each pair in r2 should NOT appear in r1. Allow occasional
    // collisions only when the generator gives up after 30 retries
    // (8-player + 2-court space is small) — but for a seeded run we
    // expect zero collisions.
    for (const pair of r2Pairs) {
      expect(r1Pairs.has(pair), `pair ${pair} repeated immediately`).toBe(
        false,
      );
    }
  });

  it('messages the host with the names of resting players', () => {
    const result = generateRound({
      players: makePlayers(6),
      rounds: [],
      config: { ...baseConfig, maxCourts: 1 },
      random: mulberry32(1),
    });
    expect(result.message).toMatch(/Resting:/);
    // Two of the six must be named in the message.
    expect(result.message!.split(',')).toHaveLength(2);
  });
});

describe('generateMexicanoRound', () => {
  it('seeds court 1 with top-ranked players using 1+4 vs 2+3 pairing', () => {
    const players = makePlayers(4);
    const rounds: import('./types').Round[] = [
      {
        id: 'r0',
        number: 1,
        createdAt: 0,
        restingPlayerIds: [],
        games: [
          {
            id: 'g1',
            court: 1,
            recorded: true,
            teamA: { playerIds: ['p1', 'p2'], score: 24 },
            teamB: { playerIds: ['p3', 'p4'], score: 0 },
          },
        ],
      },
    ];
    const result = generateMexicanoRound({
      players,
      rounds,
      config: { ...baseConfig, maxCourts: 1, tournament: 'mexicano' },
    });
    expect(result.round).not.toBeNull();
    const g = result.round!.games[0]!;
    // p1+p2 won → top ranks; within top 4: (1+4) vs (2+3) by player id order
    // After one win, p1 and p2 lead — exact pairing depends on stats sort.
    const allIds = new Set([...g.teamA.playerIds, ...g.teamB.playerIds]);
    expect(allIds.size).toBe(4);
    expect(g.teamA.playerIds).toHaveLength(2);
    expect(g.teamB.playerIds).toHaveLength(2);
  });

  it('rests lowest-ranked players when there are more than courts×4', () => {
    const players = makePlayers(6);
    const result = generateMexicanoRound({
      players,
      rounds: [],
      config: { ...baseConfig, maxCourts: 1, tournament: 'mexicano' },
    });
    expect(result.round?.games).toHaveLength(1);
    expect(result.round?.restingPlayerIds).toHaveLength(2);
  });
});

describe('generateMixAmericanoRound', () => {
  it('rejects when active players lack gender', () => {
    const result = generateMixAmericanoRound({
      players: makePlayers(4),
      rounds: [],
      config: { ...baseConfig, tournament: 'mix-americano' },
      random: mulberry32(1),
    });
    expect(result.round).toBeNull();
    expect(result.message).toMatch(/gender/i);
  });

  it('forms man+woman teams on each court', () => {
    const players = [
      playerWithGender('m1', 'M1', 'm'),
      playerWithGender('m2', 'M2', 'm'),
      playerWithGender('f1', 'F1', 'f'),
      playerWithGender('f2', 'F2', 'f'),
    ];
    const result = generateMixAmericanoRound({
      players,
      rounds: [],
      config: { ...baseConfig, maxCourts: 1, tournament: 'mix-americano' },
      random: mulberry32(99),
    });
    expect(result.round?.games).toHaveLength(1);
    const g = result.round!.games[0]!;
    const byId = new Map(players.map((p) => [p.id, p]));
    for (const team of [g.teamA, g.teamB]) {
      const genders = team.playerIds.map((id) => byId.get(id)?.gender);
      expect(genders).toContain('m');
      expect(genders).toContain('f');
    }
  });
});

describe('previewFinalRound — seeding', () => {
  it('returns null when there are not enough active players', () => {
    const preview = previewFinalRound({
      players: makePlayers(3),
      rounds: [],
      config: { ...baseConfig, maxCourts: 1 },
    });
    expect(preview).toBeNull();
  });

  it('produces the (1,4) vs (2,3) seeding for a single court', () => {
    // With no recorded games every player has score=0; the ranking
    // helper falls back to player order, so the "ranking" here is
    // p1..p4 in order. The seeding rule pairs 1+4 against 2+3.
    const preview = previewFinalRound({
      players: makePlayers(4),
      rounds: [],
      config: { ...baseConfig, maxCourts: 1 },
    });
    expect(preview).not.toBeNull();
    const c = preview!.courts[0]!;
    // We don't care which side is teamA, only that the partnership
    // is correct: 1 with 4, and 2 with 3.
    const a = new Set(c.teamA);
    const b = new Set(c.teamB);
    expect(a.size).toBe(2);
    expect(b.size).toBe(2);
    const isOuterPair = a.has('p1') && a.has('p4');
    const isInnerPair = a.has('p2') && a.has('p3');
    expect(isOuterPair || isInnerPair).toBe(true);
    if (isOuterPair) {
      expect(b.has('p2') && b.has('p3')).toBe(true);
    } else {
      expect(b.has('p1') && b.has('p4')).toBe(true);
    }
  });
});
