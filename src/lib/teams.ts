import { computeStats, sortByMode, sortByPoints } from './stats';
import { defaultRandom, type Random } from './random';
import type { RankingMode } from './ranking-mode';
import type { Game, Player, PlayerId, Round, SessionConfig } from './types';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

function shuffle<T>(arr: readonly T[], random: Random = defaultRandom): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
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

function makeRound(
  rounds: readonly Round[],
  games: Game[],
  restingIds: PlayerId[],
  active: readonly Player[],
): GenerateRoundResult {
  const round: Round = {
    id: newId(),
    number: rounds.length + 1,
    games,
    restingPlayerIds: restingIds,
    createdAt: Date.now(),
  };
  if (restingIds.length > 0) {
    const names = restingIds
      .map((id) => active.find((p) => p.id === id)?.name)
      .filter((n): n is string => !!n);
    return { round, message: `Resting: ${names.join(', ')}` };
  }
  return { round };
}

export interface GenerateRoundInput {
  players: readonly Player[];
  rounds: readonly Round[];
  config: SessionConfig;
  random?: Random;
}

export interface GenerateRoundResult {
  round: Round | null;
  message?: string;
}

/** Route to the generator for the session's tournament format. */
export function generateRound(input: GenerateRoundInput): GenerateRoundResult {
  switch (input.config.tournament) {
    case 'mexicano':
      return generateMexicanoRound(input);
    case 'mix-americano':
      return generateMixAmericanoRound(input);
    default:
      return generateAmericanoRound(input);
  }
}

/**
 * Americano / Mix & Match — random fair rotation with most-rested-first
 * player selection (the original Blue Lions generator).
 */
export function generateAmericanoRound({
  players,
  rounds,
  config,
  random = defaultRandom,
}: GenerateRoundInput): GenerateRoundResult {
  const active = players.filter((p) => p.status === 'active');
  if (active.length < 4) {
    return { round: null, message: `Need at least 4 active players (have ${active.length}).` };
  }

  const courts = Math.min(config.maxCourts, Math.floor(active.length / 4));
  const playingCount = courts * 4;
  const rests = countRestsByPlayer(rounds);

  const orderedByRests = shuffle(active, random).sort(
    (a, b) => (rests.get(b.id) ?? 0) - (rests.get(a.id) ?? 0),
  );

  const playingIds = orderedByRests.slice(0, playingCount).map((p) => p.id);
  const restingIds = orderedByRests.slice(playingCount).map((p) => p.id);

  const previousPairs = config.avoidImmediateRepeat
    ? partnersInLastRound(rounds[rounds.length - 1])
    : new Set<string>();

  const initialScore = Math.floor(config.targetTotal / 2);

  let games: Game[] = chunkInto(shuffle(playingIds, random), courts, initialScore);
  if (config.avoidImmediateRepeat) {
    for (let attempt = 0; attempt < 30 && hasImmediateRepeat(games, previousPairs); attempt++) {
      games = chunkInto(shuffle(playingIds, random), courts, initialScore);
    }
  }

  return makeRound(rounds, games, restingIds, active);
}

/**
 * Mexicano — rank active players by points, assign courts by rank
 * (1–4 on court 1, 5–8 on court 2, …). Within each quartet pair
 * strongest + weakest vs the middle two (same seeding as final round).
 * Lowest-ranked players rest when there are more players than courts×4.
 */
export function generateMexicanoRound({
  players,
  rounds,
  config,
}: GenerateRoundInput): GenerateRoundResult {
  const active = players.filter((p) => p.status === 'active');
  if (active.length < 4) {
    return { round: null, message: `Need at least 4 active players (have ${active.length}).` };
  }

  const courts = Math.min(config.maxCourts, Math.floor(active.length / 4));
  const playingCount = courts * 4;
  const activeIds = new Set(active.map((p) => p.id));
  const ranked = sortByPoints(computeStats(players, rounds)).filter((s) =>
    activeIds.has(s.playerId),
  );

  const playingRanked = ranked.slice(0, playingCount);
  const restingIds = ranked.slice(playingCount).map((s) => s.playerId);
  const initialScore = Math.floor(config.targetTotal / 2);

  const games: Game[] = [];
  for (let c = 0; c < courts; c++) {
    const group = playingRanked.slice(c * 4, c * 4 + 4);
    if (group.length < 4) break;
    const ids = group.map((s) => s.playerId) as [PlayerId, PlayerId, PlayerId, PlayerId];
    games.push({
      id: newId(),
      court: c + 1,
      teamA: { playerIds: [ids[0], ids[3]], score: initialScore },
      teamB: { playerIds: [ids[1], ids[2]], score: initialScore },
      recorded: false,
    });
  }

  return makeRound(rounds, games, restingIds, active);
}

/** All valid man+woman pairings for four players (2M + 2F). */
function mixedPairings(
  m1: PlayerId,
  m2: PlayerId,
  f1: PlayerId,
  f2: PlayerId,
): Array<{ teamA: [PlayerId, PlayerId]; teamB: [PlayerId, PlayerId] }> {
  return [
    { teamA: [m1, f1], teamB: [m2, f2] },
    { teamA: [m1, f2], teamB: [m2, f1] },
  ];
}

/**
 * Mix Americano — Americano-style rest fairness, but each court must
 * have two men and two women; teams are always one man + one woman.
 */
export function generateMixAmericanoRound({
  players,
  rounds,
  config,
  random = defaultRandom,
}: GenerateRoundInput): GenerateRoundResult {
  const active = players.filter((p) => p.status === 'active');
  if (active.length < 4) {
    return { round: null, message: `Need at least 4 active players (have ${active.length}).` };
  }

  const missingGender = active.filter((p) => p.gender !== 'm' && p.gender !== 'f');
  if (missingGender.length > 0) {
    const names = missingGender.map((p) => p.name).join(', ');
    return {
      round: null,
      message: `Set gender (M/F) for: ${names}. Players tab → Mix Americano.`,
    };
  }

  const men = active.filter((p) => p.gender === 'm');
  const women = active.filter((p) => p.gender === 'f');
  if (men.length < 2 || women.length < 2) {
    return {
      round: null,
      message: `Mix Americano needs at least 2 men and 2 women (have ${men.length}M, ${women.length}F).`,
    };
  }

  const maxCourtsByGender = Math.min(
    Math.floor(men.length / 2),
    Math.floor(women.length / 2),
    Math.floor(active.length / 4),
  );
  const courts = Math.min(config.maxCourts, maxCourtsByGender);
  if (courts < 1) {
    return { round: null, message: 'Not enough balanced genders for a court.' };
  }

  const rests = countRestsByPlayer(rounds);
  const restSort = (a: Player, b: Player) =>
    (rests.get(b.id) ?? 0) - (rests.get(a.id) ?? 0);

  const menQueue = shuffle(men, random).sort(restSort);
  const womenQueue = shuffle(women, random).sort(restSort);

  const pickedMen = menQueue.slice(0, courts * 2);
  const pickedWomen = womenQueue.slice(0, courts * 2);
  const playingIds = new Set([...pickedMen, ...pickedWomen].map((p) => p.id));
  const restingIds = active.filter((p) => !playingIds.has(p.id)).map((p) => p.id);

  const previousPairs = config.avoidImmediateRepeat
    ? partnersInLastRound(rounds[rounds.length - 1])
    : new Set<string>();
  const initialScore = Math.floor(config.targetTotal / 2);

  const games: Game[] = [];
  for (let c = 0; c < courts; c++) {
    const m1 = pickedMen[c * 2]!;
    const m2 = pickedMen[c * 2 + 1]!;
    const f1 = pickedWomen[c * 2]!;
    const f2 = pickedWomen[c * 2 + 1]!;

    const options = mixedPairings(m1.id, m2.id, f1.id, f2.id);
    let chosen = options[0]!;
    if (config.avoidImmediateRepeat) {
      const alt = options.find(
        (o) =>
          !previousPairs.has(pairKey(o.teamA[0], o.teamA[1])) &&
          !previousPairs.has(pairKey(o.teamB[0], o.teamB[1])),
      );
      if (alt) chosen = alt;
    }

    games.push({
      id: newId(),
      court: c + 1,
      teamA: { playerIds: chosen.teamA, score: initialScore },
      teamB: { playerIds: chosen.teamB, score: initialScore },
      recorded: false,
    });
  }

  return makeRound(rounds, games, restingIds, active);
}

/* -------------------------------------------------------------------------- */
/*  Final round                                                                */
/* -------------------------------------------------------------------------- */

export interface FinalPreviewCourt {
  court: number;
  teamA: [PlayerId, PlayerId];
  teamB: [PlayerId, PlayerId];
  rankedIds: [PlayerId, PlayerId, PlayerId, PlayerId];
}

export interface FinalPreview {
  courts: FinalPreviewCourt[];
  restingPlayerIds: PlayerId[];
  totalActive: number;
  needed: number;
}

export function previewFinalRound(
  { players, rounds, config }: GenerateRoundInput,
  mode: RankingMode = 'points',
): FinalPreview | null {
  const active = players.filter((p) => p.status === 'active');
  const courts = config.maxCourts;
  const needed = courts * 4;
  if (active.length < needed) {
    return null;
  }
  const activeIds = new Set(active.map((p) => p.id));
  const ranked = sortByMode(computeStats(players, rounds), mode).filter((s) =>
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

export function generateFinalRound(
  { players, rounds, config }: GenerateRoundInput,
  mode: RankingMode = 'points',
): GenerateRoundResult {
  const active = players.filter((p) => p.status === 'active');
  const courts = config.maxCourts;
  const needed = courts * 4;
  if (active.length < needed) {
    return {
      round: null,
      message: `Need ${needed} active players for a ${courts}-court final (have ${active.length}).`,
    };
  }
  const preview = previewFinalRound({ players, rounds, config }, mode);
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
