export type PlayerId = string;

export type PlayerStatus = 'active' | 'paused' | 'left';

export interface Player {
  id: PlayerId;
  name: string;
  status: PlayerStatus;
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

export interface Round {
  id: string;
  number: number;
  games: Game[];
  restingPlayerIds: PlayerId[];
  createdAt: number;
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
  wins: number;
  losses: number;
  draws: number;
  timesRested: number;
}
