import { describe, expect, it } from 'vitest';
import { applySnapshotToRound, snapshotRoundDraw } from './round-draw';
import type { Round } from './types';

const round: Round = {
  id: 'r1',
  number: 1,
  createdAt: 1,
  restingPlayerIds: ['p5'],
  games: [
    {
      id: 'g1',
      court: 1,
      recorded: false,
      teamA: { playerIds: ['p1', 'p2'], score: 12 },
      teamB: { playerIds: ['p3', 'p4'], score: 12 },
    },
  ],
};

describe('round-draw snapshots', () => {
  it('snapshotRoundDraw clones games and resting list', () => {
    const snap = snapshotRoundDraw(round);
    snap.games[0]!.teamA.playerIds[0] = 'mutated';
    snap.restingPlayerIds.push('p6');
    expect(round.games[0]!.teamA.playerIds[0]).toBe('p1');
    expect(round.restingPlayerIds).toEqual(['p5']);
  });

  it('applySnapshotToRound restores a prior draw', () => {
    const snap = snapshotRoundDraw(round);
    const changed = {
      ...round,
      games: [
        {
          ...round.games[0]!,
          teamA: { playerIds: ['p9', 'p8'] as ['p9', 'p8'], score: 10 },
        },
      ],
      restingPlayerIds: [],
    };
    const restored = applySnapshotToRound(changed, snap);
    expect(restored.games[0]!.teamA.playerIds).toEqual(['p1', 'p2']);
    expect(restored.restingPlayerIds).toEqual(['p5']);
  });
});
