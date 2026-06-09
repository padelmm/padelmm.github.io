import type { Game, PlayerId, Round } from './types';

/** Team assignments + scores for one draw of the current round. */
export interface RoundDrawSnapshot {
  games: Game[];
  restingPlayerIds: PlayerId[];
}

/** Deep-enough copy so undo/redo history does not mutate prior entries. */
export function snapshotRoundDraw(round: Round): RoundDrawSnapshot {
  return {
    games: round.games.map((g) => ({
      id: g.id,
      court: g.court,
      recorded: g.recorded,
      teamA: {
        playerIds: [g.teamA.playerIds[0], g.teamA.playerIds[1]],
        score: g.teamA.score,
      },
      teamB: {
        playerIds: [g.teamB.playerIds[0], g.teamB.playerIds[1]],
        score: g.teamB.score,
      },
    })),
    restingPlayerIds: [...round.restingPlayerIds],
  };
}

export function applySnapshotToRound(round: Round, snap: RoundDrawSnapshot): Round {
  return {
    ...round,
    games: snap.games.map((g) => ({
      id: g.id,
      court: g.court,
      recorded: g.recorded,
      teamA: {
        playerIds: [g.teamA.playerIds[0], g.teamA.playerIds[1]],
        score: g.teamA.score,
      },
      teamB: {
        playerIds: [g.teamB.playerIds[0], g.teamB.playerIds[1]],
        score: g.teamB.score,
      },
    })),
    restingPlayerIds: [...snap.restingPlayerIds],
  };
}
