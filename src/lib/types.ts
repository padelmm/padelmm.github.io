export type PlayerId = string;

export type PlayerStatus = 'active' | 'paused' | 'left';

/** Used by Mix Americano — man/woman per team. Optional on other formats. */
export type PlayerGender = 'm' | 'f';

/**
 * Tournament draw style. 'mix-and-match' is the Blue Lions house
 * Americano (random fair rotation). 'mexicano' re-seeds courts by
 * ranking each round. 'mix-americano' rotates partners with mixed
 * teams (one man + one woman per side).
 */
export type TournamentType = 'mix-and-match' | 'mexicano' | 'mix-americano';

export interface Player {
  id: PlayerId;
  name: string;
  status: PlayerStatus;
  bonus: number;
  /** Required for Mix Americano round generation. */
  gender?: PlayerGender;
}

export interface Team {
  playerIds: [PlayerId, PlayerId];
  score: number;
}

export interface Game {
  id: string;
  court: number;
  teamA: Team;
  teamB: Team;
  recorded: boolean;
}

/**
 * 'final' marks a single end-of-day round drawn from the current ranking
 * with a deterministic seeding (see `generateFinalRound`). Older sessions
 * shared before this field existed import as `undefined`, which the rest
 * of the app treats as 'normal'.
 */
export type RoundKind = 'normal' | 'final';

export interface Round {
  id: string;
  number: number;
  games: Game[];
  restingPlayerIds: PlayerId[];
  createdAt: number;
  kind?: RoundKind;
}

export interface SessionConfig {
  targetTotal: number;
  maxCourts: number;
  avoidImmediateRepeat: boolean;
  tournament: TournamentType;
}

export type SessionStatus = 'setup' | 'running' | 'finished';

export interface SessionState {
  schemaVersion: number;
  status: SessionStatus;
  config: SessionConfig;
  players: Player[];
  rounds: Round[];
  createdAt: number;
}

export interface PlayerStats {
  playerId: PlayerId;
  name: string;
  status: PlayerStatus;
  gamesPlayed: number;
  pointsScored: number;
  pointsAgainst: number;
  bonus: number;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  timesRested: number;
}
