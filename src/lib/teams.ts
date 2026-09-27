import { missingGenderMessage } from './mix-americano';
import { computeStats, sortByMode, sortByPoints } from './stats';
import { defaultRandom, type Random } from './random';
import type { RankingMode } from './ranking-mode';
import type { Game, Player, PlayerId, Round, SessionConfig, TournamentType } from './types';

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

/** Exact partner search stays cheap up to 3 courts (12 players, 10395 matchings). */
const EXACT_LAYOUT_PLAYERS = 12;

/** Mix women-assignment search stays exact up to 4 courts. */
const EXACT_MIX_COURTS = 4;

const SAMPLE_DRAWS = 32;

type Pair = [PlayerId, PlayerId];

interface CourtTeams {
  teamA: Pair;
  teamB: Pair;
}

interface DrawScore {
  partner: number;
  immediate: number;
  opponent: number;
}

interface DrawHistory {
  partners: Map<string, number>;
  opponents: Map<string, number>;
}

function drawHistory(rounds: readonly Round[]): DrawHistory {
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const add = (map: Map<string, number>, a: PlayerId, b: PlayerId) => {
    const key = pairKey(a, b);
    map.set(key, (map.get(key) ?? 0) + 1);
  };
  for (const round of rounds) {
    for (const g of round.games) {
      const [a, b] = g.teamA.playerIds;
      const [x, y] = g.teamB.playerIds;
      add(partners, a, b);
      add(partners, x, y);
      add(opponents, a, x);
      add(opponents, a, y);
      add(opponents, b, x);
      add(opponents, b, y);
    }
  }
  return { partners, opponents };
}

function scorePairs(
  pairs: readonly Pair[],
  history: DrawHistory,
  previousPairs: ReadonlySet<string>,
): DrawScore {
  let partner = 0;
  let immediate = 0;
  for (const [a, b] of pairs) {
    const key = pairKey(a, b);
    partner += history.partners.get(key) ?? 0;
    if (previousPairs.has(key)) immediate += 1;
  }
  return { partner, immediate, opponent: 0 };
}

function scoreLayout(
  courts: readonly CourtTeams[],
  history: DrawHistory,
  previousPairs: ReadonlySet<string>,
): DrawScore {
  let partner = 0;
  let immediate = 0;
  let opponent = 0;
  for (const court of courts) {
    const p1 = pairKey(court.teamA[0], court.teamA[1]);
    const p2 = pairKey(court.teamB[0], court.teamB[1]);
    partner += history.partners.get(p1) ?? 0;
    partner += history.partners.get(p2) ?? 0;
    if (previousPairs.has(p1)) immediate += 1;
    if (previousPairs.has(p2)) immediate += 1;
    for (const u of court.teamA) {
      for (const v of court.teamB) {
        opponent += history.opponents.get(pairKey(u, v)) ?? 0;
      }
    }
  }
  return { partner, immediate, opponent };
}

/** Negative when `a` is the fairer draw. Partner count wins, then immediate repeats, then opponents. */
function compareScores(a: DrawScore, b: DrawScore, avoidImmediate: boolean): number {
  if (a.partner !== b.partner) return a.partner - b.partner;
  if (avoidImmediate && a.immediate !== b.immediate) return a.immediate - b.immediate;
  return a.opponent - b.opponent;
}

function gamesFromCourts(courts: readonly CourtTeams[], initialScore: number): Game[] {
  return courts.map((court, index) => ({
    id: newId(),
    court: index + 1,
    teamA: { playerIds: court.teamA, score: initialScore },
    teamB: { playerIds: court.teamB, score: initialScore },
    recorded: false,
  }));
}

function courtsFromOrder(ids: readonly PlayerId[]): CourtTeams[] {
  const courts: CourtTeams[] = [];
  for (let c = 0; c < ids.length / 4; c++) {
    const base = c * 4;
    courts.push({
      teamA: [ids[base]!, ids[base + 1]!],
      teamB: [ids[base + 2]!, ids[base + 3]!],
    });
  }
  return courts;
}

/**
 * Visit every unordered perfect matching. The `pairs` array is reused
 * across visits; callbacks must copy ids before returning.
 */
function eachMatching(ids: readonly PlayerId[], visit: (pairs: Pair[]) => void): void {
  const used = new Array<boolean>(ids.length).fill(false);
  const pairs: Pair[] = [];
  const rec = (start: number): void => {
    if (pairs.length * 2 === ids.length) {
      visit(pairs);
      return;
    }
    let i = start;
    while (used[i]) i += 1;
    used[i] = true;
    for (let j = i + 1; j < ids.length; j++) {
      if (used[j]) continue;
      used[j] = true;
      pairs.push([ids[i]!, ids[j]!]);
      rec(i + 1);
      pairs.pop();
      used[j] = false;
    }
    used[i] = false;
  };
  rec(0);
}

/** Visit every way to seat a list of pairs onto courts (two pairs per court). */
function eachCourtPartition(pairs: readonly Pair[], visit: (courts: CourtTeams[]) => void): void {
  const used = new Array<boolean>(pairs.length).fill(false);
  const courts: CourtTeams[] = [];
  const rec = (): void => {
    if (courts.length * 2 === pairs.length) {
      visit(
        courts.map((court) => ({
          teamA: [court.teamA[0], court.teamA[1]],
          teamB: [court.teamB[0], court.teamB[1]],
        })),
      );
      return;
    }
    let i = 0;
    while (used[i]) i += 1;
    used[i] = true;
    for (let j = i + 1; j < pairs.length; j++) {
      if (used[j]) continue;
      used[j] = true;
      courts.push({ teamA: pairs[i]!, teamB: pairs[j]! });
      rec();
      courts.pop();
      used[j] = false;
    }
    used[i] = false;
  };
  rec();
}

function makePicker(
  random: Random,
  avoidImmediate: boolean,
  history: DrawHistory,
  previousPairs: ReadonlySet<string>,
): { consider: (courts: CourtTeams[]) => void; result: () => CourtTeams[] | null } {
  let best: CourtTeams[] | null = null;
  let bestScore: DrawScore | null = null;
  let ties = 0;
  return {
    consider(courts) {
      const score = scoreLayout(courts, history, previousPairs);
      if (!best || !bestScore || compareScores(score, bestScore, avoidImmediate) < 0) {
        best = courts;
        bestScore = score;
        ties = 1;
        return;
      }
      if (compareScores(score, bestScore, avoidImmediate) === 0) {
        ties += 1;
        if (random() < 1 / ties) best = courts;
      }
    },
    result: () => best,
  };
}

function greedyMatching(
  ids: readonly PlayerId[],
  random: Random,
  history: DrawHistory,
  previousPairs: ReadonlySet<string>,
  avoidImmediate: boolean,
): Pair[] {
  const remaining = shuffle(ids, random);
  const pairs: Pair[] = [];
  while (remaining.length > 0) {
    const a = remaining.pop()!;
    let bestIdx = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    let ties = 0;
    for (let i = 0; i < remaining.length; i++) {
      const b = remaining[i]!;
      const key = pairKey(a, b);
      const cost =
        (history.partners.get(key) ?? 0) * 1000 + (avoidImmediate && previousPairs.has(key) ? 1 : 0);
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = i;
        ties = 1;
      } else if (cost === bestCost) {
        ties += 1;
        if (random() < 1 / ties) bestIdx = i;
      }
    }
    const b = remaining.splice(bestIdx, 1)[0]!;
    pairs.push([a, b]);
  }
  return pairs;
}

/**
 * Min-cost teams for the players already chosen to play.
 * Partner repeats dominate; immediate repeats break ties when the
 * toggle is on; opponent repeats are the lightest term.
 * A draw is always returned — repeats are allowed once they are unavoidable.
 */
function balancedAmericanoGames(
  playingIds: readonly PlayerId[],
  rounds: readonly Round[],
  avoidImmediate: boolean,
  initialScore: number,
  random: Random,
): Game[] {
  if (rounds.length === 0) {
    return chunkInto(shuffle(playingIds, random), playingIds.length / 4, initialScore);
  }

  const history = drawHistory(rounds);
  const previousPairs = avoidImmediate
    ? partnersInLastRound(rounds[rounds.length - 1])
    : new Set<string>();
  const picker = makePicker(random, avoidImmediate, history, previousPairs);

  if (playingIds.length <= EXACT_LAYOUT_PLAYERS) {
    // Partner cost does not depend on which court a pair sits on, so pick
    // the matching first and only then seat that matching.
    let bestMatch: Pair[] | null = null;
    let bestScore: DrawScore | null = null;
    let ties = 0;
    eachMatching(playingIds, (pairs) => {
      const frozen = pairs.map((pair) => [pair[0], pair[1]] as Pair);
      const score = scorePairs(frozen, history, previousPairs);
      if (!bestMatch || !bestScore || compareScores(score, bestScore, avoidImmediate) < 0) {
        bestMatch = frozen;
        bestScore = score;
        ties = 1;
        return;
      }
      if (compareScores(score, bestScore, avoidImmediate) === 0) {
        ties += 1;
        if (random() < 1 / ties) bestMatch = frozen;
      }
    });
    if (bestMatch) eachCourtPartition(bestMatch, picker.consider);
  } else {
    for (let sample = 0; sample < SAMPLE_DRAWS; sample++) {
      picker.consider(courtsFromOrder(shuffle(playingIds, random)));
    }
    for (let sample = 0; sample < SAMPLE_DRAWS; sample++) {
      const matching = greedyMatching(playingIds, random, history, previousPairs, avoidImmediate);
      // 10 pairs → 945 court seatings. Larger nights keep one shuffled seating.
      if (matching.length <= 10) {
        eachCourtPartition(matching, picker.consider);
      } else {
        const ordered = shuffle(matching, random);
        const courts: CourtTeams[] = [];
        for (let i = 0; i < ordered.length; i += 2) {
          courts.push({ teamA: ordered[i]!, teamB: ordered[i + 1]! });
        }
        picker.consider(courts);
      }
    }
  }

  const chosen = picker.result();
  if (!chosen) {
    return chunkInto(shuffle(playingIds, random), playingIds.length / 4, initialScore);
  }
  return gamesFromCourts(chosen, initialScore);
}

function eachMixLayout(
  malePairs: readonly Pair[],
  womenIds: readonly PlayerId[],
  visit: (courts: CourtTeams[]) => void,
): void {
  const orientEvery = (womanPairs: readonly Pair[], assign: (courts: CourtTeams[]) => void) => {
    const courts = malePairs.length;
    const total = 1 << courts;
    for (let mask = 0; mask < total; mask++) {
      const layout: CourtTeams[] = [];
      for (let c = 0; c < courts; c++) {
        const men = malePairs[c]!;
        const women = womanPairs[c]!;
        const options = mixedPairings(men[0], men[1], women[0], women[1]);
        layout.push(options[(mask >> c) & 1]!);
      }
      assign(layout);
    }
  };

  if (malePairs.length <= EXACT_MIX_COURTS) {
    eachMatching(womenIds, (livePairs) => {
      const womanPairs = livePairs.map((pair) => [pair[0], pair[1]] as Pair);
      const used = new Array<boolean>(womanPairs.length).fill(false);
      const perm: number[] = [];
      const assign = (court: number): void => {
        if (court === malePairs.length) {
          const ordered = perm.map((index) => womanPairs[index]!);
          orientEvery(ordered, visit);
          return;
        }
        for (let j = 0; j < womanPairs.length; j++) {
          if (used[j]) continue;
          used[j] = true;
          perm[court] = j;
          assign(court + 1);
          used[j] = false;
        }
      };
      assign(0);
    });
    return;
  }

  // Larger nights: men are already a random pairing; sample women the same way.
  orientEvery(
    malePairs.map((_, index) => {
      const base = index * 2;
      return [womenIds[base]!, womenIds[base + 1]!] as Pair;
    }),
    visit,
  );
}

/**
 * Men are shuffled into courts so co-resters are not glued to court 1.
 * Women and the M+F pairing are then chosen to minimise partner repeats.
 */
function balancedMixGames(
  men: readonly Player[],
  women: readonly Player[],
  rounds: readonly Round[],
  avoidImmediate: boolean,
  initialScore: number,
  random: Random,
): Game[] {
  const menIds = shuffle(men, random).map((player) => player.id);
  const malePairs: Pair[] = [];
  for (let c = 0; c < menIds.length / 2; c++) {
    malePairs.push([menIds[c * 2]!, menIds[c * 2 + 1]!]);
  }

  const history = drawHistory(rounds);
  const previousPairs = avoidImmediate
    ? partnersInLastRound(rounds[rounds.length - 1])
    : new Set<string>();
  const picker = makePicker(random, avoidImmediate, history, previousPairs);
  const womenIds = women.map((player) => player.id);

  if (malePairs.length <= EXACT_MIX_COURTS) {
    eachMixLayout(malePairs, womenIds, picker.consider);
  } else {
    for (let sample = 0; sample < SAMPLE_DRAWS; sample++) {
      eachMixLayout(malePairs, shuffle(womenIds, random), picker.consider);
    }
  }

  const chosen = picker.result();
  if (!chosen) {
    return [];
  }
  return gamesFromCourts(chosen, initialScore);
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
  tournament: TournamentType,
): GenerateRoundResult {
  const round: Round = {
    id: newId(),
    number: rounds.length + 1,
    games,
    restingPlayerIds: restingIds,
    createdAt: Date.now(),
    tournament,
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
 * Americano / Mix & Match — most-rested players play next, then teams
 * are chosen to keep partnership counts as even as the roster allows.
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

  const initialScore = Math.floor(config.targetTotal / 2);
  const games = balancedAmericanoGames(
    playingIds,
    rounds,
    config.avoidImmediateRepeat,
    initialScore,
    random,
  );

  return makeRound(rounds, games, restingIds, active, config.tournament);
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

  return makeRound(rounds, games, restingIds, active, config.tournament);
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

  const genderMessage = missingGenderMessage(players);
  if (genderMessage) {
    return { round: null, message: genderMessage };
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

  const initialScore = Math.floor(config.targetTotal / 2);
  const games = balancedMixGames(
    pickedMen,
    pickedWomen,
    rounds,
    config.avoidImmediateRepeat,
    initialScore,
    random,
  );

  return makeRound(rounds, games, restingIds, active, config.tournament);
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
    tournament: config.tournament,
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
