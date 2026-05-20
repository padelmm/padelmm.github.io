import { computeStats, sortByPoints } from './stats';
import type { Game, Player, PlayerId, Round, SessionConfig } from './types';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

function countRestsByPlayer(rounds: readonly Round[]): Map<PlayerId, number> {
  const counts = new Map<PlayerId, number>();
  for (const round of rounds) {
    for (const id of round.restingPlayerIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

function pairKey(a: PlayerId, b: PlayerId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function partnersInLastRound(round: Round | undefined): Set<string> {
  const out = new Set<string>();
  if (!round) return out;
  for (const g of round.games) {
    out.add(pairKey(g.teamA.playerIds[0], g.teamA.playerIds[1]));
    out.add(pairKey(g.teamB.playerIds[0], g.teamB.playerIds[1]));
  }
  return out;
}

function hasImmediateRepeat(games: readonly Game[], previous: Set<string>): boolean {
  if (previous.size === 0) return false;
  for (const g of games) {
    if (previous.has(pairKey(g.teamA.playerIds[0], g.teamA.playerIds[1]))) return true;
    if (previous.has(pairKey(g.teamB.playerIds[0], g.teamB.playerIds[1]))) return true;
  }
  return false;
}

/**
 * Build Game objects for the round. `initialScore` is the score we give
 * team A by default; team B's score is derived from `targetTotal - A` at
 * display time. Initialising both sides to the midpoint (12 of 24) means
 * a freshly drawn game opens with the slider centered on 12:12 rather
 * than the lopsided 0:24, which used to confuse hosts.
 */
function chunkInto(
  playerIds: readonly PlayerId[],
  courts: number,
  initialScore: number,
): Game[] {
  const games: Game[] = [];
  for (let c = 0; c < courts; c++) {
    const slice = playerIds.slice(c * 4, c * 4 + 4);
    if (slice.length < 4) break;
    const [a, b, x, y] = slice as [PlayerId, PlayerId, PlayerId, PlayerId];
    games.push({
      id: newId(),
      court: c + 1,
      teamA: { playerIds: [a, b], score: initialScore },
      teamB: { playerIds: [x, y], score: initialScore },
      recorded: false,
    });
  }
  return games;
}

export interface GenerateRoundInput {
  players: readonly Player[];
  rounds: readonly Round[];
  config: SessionConfig;
}

export interface GenerateRoundResult {
  round: Round | null;
  message?: string;
}

export function generateRound({ players, rounds, config }: GenerateRoundInput): GenerateRoundResult {
  const active = players.filter((p) => p.status === 'active');
  if (active.length < 4) {
    return { round: null, message: `Need at least 4 active players (have ${active.length}).` };
  }

  const courts = Math.min(config.maxCourts, Math.floor(active.length / 4));
  const playingCount = courts * 4;
  const restingCount = active.length - playingCount;

  const rests = countRestsByPlayer(rounds);
  // Sort by rest count DESCENDING (most-rested first); break ties randomly.
  //
  // Fairness intuition: a player who has already sat out a lot is "owed"
  // playing time, so they should be in the front of the queue for the
  // next round's courts. The previous version sorted ascending and then
  // sliced the front as players, which meant the people who had rested
  // most kept getting picked to rest again — the exact opposite of fair.
  const orderedByRests = shuffle(active).sort(
    (a, b) => (rests.get(b.id) ?? 0) - (rests.get(a.id) ?? 0),
  );

  // First `playingCount` players (most-rested) take the courts; the rest sit out.
  const playingIds = orderedByRests.slice(0, playingCount).map((p) => p.id);
  const restingIds = orderedByRests.slice(playingCount).map((p) => p.id);

  const previousPairs = config.avoidImmediateRepeat
    ? partnersInLastRound(rounds[rounds.length - 1])
    : new Set<string>();

  const initialScore = Math.floor(config.targetTotal / 2);

  let games: Game[] = chunkInto(shuffle(playingIds), courts, initialScore);
  if (config.avoidImmediateRepeat) {
    for (let attempt = 0; attempt < 30 && hasImmediateRepeat(games, previousPairs); attempt++) {
      games = chunkInto(shuffle(playingIds), courts, initialScore);
    }
  }

  const round: Round = {
    id: newId(),
    number: rounds.length + 1,
    games,
    restingPlayerIds: restingIds,
    createdAt: Date.now(),
  };
  if (restingCount > 0) {
    const names = restingIds
      .map((id) => active.find((p) => p.id === id)?.name)
      .filter((n): n is string => !!n);
    return { round, message: `Resting: ${names.join(', ')}` };
  }
  return { round };
}

/* -------------------------------------------------------------------------- */
/*  Final round                                                                */
/* -------------------------------------------------------------------------- */

export interface FinalPreviewCourt {
  court: number;
  teamA: [PlayerId, PlayerId];
  teamB: [PlayerId, PlayerId];
  /** Player IDs in ranking order for the four players on this court. */
  rankedIds: [PlayerId, PlayerId, PlayerId, PlayerId];
}

export interface FinalPreview {
  courts: FinalPreviewCourt[];
  restingPlayerIds: PlayerId[];
  totalActive: number;
  needed: number;
}

/**
 * Compute the proposed final-round draw without committing it.
 *
 * Seeding: take the top `courts × 4` *active* players from the current
 * ranking (see `sortByPoints` for the tiebreak order). Group the list
 * into chunks of 4 in rank order — so the strongest 4 share court 1,
 * the next 4 share court 2, and so on. Within each chunk, pair the
 * best+worst against the middle two:
 *
 *   ranks (1,2,3,4)  →  Court 1:  (1+4)  vs  (2+3)
 *   ranks (5,6,7,8)  →  Court 2:  (5+8)  vs  (6+7)
 *   ranks (9..12)    →  Court 3:  (9+12) vs (10+11)
 *
 * Result is deterministic given the current ranking, so the preview and
 * the eventual committed round always match.
 */
export function previewFinalRound({
  players,
  rounds,
  config,
}: GenerateRoundInput): FinalPreview | null {
  const active = players.filter((p) => p.status === 'active');
  const courts = config.maxCourts;
  const needed = courts * 4;
  if (active.length < needed) {
    return null;
  }
  const activeIds = new Set(active.map((p) => p.id));
  const ranked = sortByPoints(computeStats(players, rounds)).filter((s) =>
    activeIds.has(s.playerId),
  );

  const finalists = ranked.slice(0, needed);
  const resting = ranked.slice(needed).map((s) => s.playerId);

  const courtsOut: FinalPreviewCourt[] = [];
  for (let c = 0; c < courts; c++) {
    const group = finalists.slice(c * 4, c * 4 + 4);
    if (group.length < 4) break;
    const ids = group.map((s) => s.playerId) as [PlayerId, PlayerId, PlayerId, PlayerId];
    courtsOut.push({
      court: c + 1,
      // Strongest + weakest of the chunk on one side, middle two on the other.
      teamA: [ids[0], ids[3]],
      teamB: [ids[1], ids[2]],
      rankedIds: ids,
    });
  }

  return {
    courts: courtsOut,
    restingPlayerIds: resting,
    totalActive: active.length,
    needed,
  };
}

export function generateFinalRound({
  players,
  rounds,
  config,
}: GenerateRoundInput): GenerateRoundResult {
  const active = players.filter((p) => p.status === 'active');
  const courts = config.maxCourts;
  const needed = courts * 4;
  if (active.length < needed) {
    return {
      round: null,
      message: `Need ${needed} active players for a ${courts}-court final (have ${active.length}).`,
    };
  }
  const preview = previewFinalRound({ players, rounds, config });
  if (!preview) {
    return { round: null, message: 'Could not build the final round.' };
  }

  const initialScore = Math.floor(config.targetTotal / 2);
  const games: Game[] = preview.courts.map((c) => ({
    id: newId(),
    court: c.court,
    teamA: { playerIds: c.teamA, score: initialScore },
    teamB: { playerIds: c.teamB, score: initialScore },
    recorded: false,
  }));

  const round: Round = {
    id: newId(),
    number: rounds.length + 1,
    games,
    restingPlayerIds: preview.restingPlayerIds,
    createdAt: Date.now(),
    kind: 'final',
  };

  if (preview.restingPlayerIds.length > 0) {
    const names = preview.restingPlayerIds
      .map((id) => active.find((p) => p.id === id)?.name)
      .filter((n): n is string => !!n);
    return { round, message: `Sitting out: ${names.join(', ')}` };
  }
  return { round };
}

export { newId };
