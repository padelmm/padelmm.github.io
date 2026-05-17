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

function chunkInto(playerIds: readonly PlayerId[], courts: number): Game[] {
  const games: Game[] = [];
  for (let c = 0; c < courts; c++) {
    const slice = playerIds.slice(c * 4, c * 4 + 4);
    if (slice.length < 4) break;
    const [a, b, x, y] = slice as [PlayerId, PlayerId, PlayerId, PlayerId];
    games.push({
      id: newId(),
      court: c + 1,
      teamA: { playerIds: [a, b], score: 0 },
      teamB: { playerIds: [x, y], score: 0 },
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
  // Sort by rest count ascending (least-rested first); break ties randomly.
  const orderedByRests = shuffle(active).sort(
    (a, b) => (rests.get(a.id) ?? 0) - (rests.get(b.id) ?? 0),
  );

  const restingIds = orderedByRests.slice(playingCount).map((p) => p.id);
  const playingIds = orderedByRests.slice(0, playingCount).map((p) => p.id);

  const previousPairs = config.avoidImmediateRepeat
    ? partnersInLastRound(rounds[rounds.length - 1])
    : new Set<string>();

  let games: Game[] = chunkInto(shuffle(playingIds), courts);
  if (config.avoidImmediateRepeat) {
    for (let attempt = 0; attempt < 30 && hasImmediateRepeat(games, previousPairs); attempt++) {
      games = chunkInto(shuffle(playingIds), courts);
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
