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

export { newId };
