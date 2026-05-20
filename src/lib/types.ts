export type PlayerId = string;

export type PlayerStatus = 'active' | 'paused' | 'left';

export interface Player {
  id: PlayerId;
  name: string;
  status: PlayerStatus;
  bonus: number;
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
