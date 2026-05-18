import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateRound, newId } from './teams';
import type { Player, PlayerId, PlayerStatus, Round, SessionState } from './types';

const SCHEMA_VERSION = 1;
const STORAGE_KEY = 'padel-mm:session-v1';
const INTRO_STORAGE_KEY = 'padel-mm:intro-seen-v1';

const defaultState = (): SessionState => ({
  schemaVersion: SCHEMA_VERSION,
  status: 'setup',
  config: {
    targetTotal: 24,
    maxCourts: 3,
    avoidImmediateRepeat: true,
  },
  players: [],
  rounds: [],
  createdAt: Date.now(),
});

export type SwapResult =
  | { ok: true }
  | { ok: false; reason: 'recorded' | 'same' | 'not-found' };

interface SessionActions {
  addPlayer: (name: string) => void;
  renamePlayer: (id: PlayerId, name: string) => void;
  removePlayer: (id: PlayerId) => void;
  setPlayerStatus: (id: PlayerId, status: PlayerStatus) => void;
  startSession: () => void;
  generateNextRound: () => { ok: boolean; message?: string };
  reshuffleCurrentRound: () => { ok: boolean; message?: string };
  setScore: (roundId: string, gameId: string, scoreA: number) => void;
  recordGame: (roundId: string, gameId: string) => void;
  unrecordGame: (roundId: string, gameId: string) => void;
  swapPlayers: (a: PlayerId, b: PlayerId) => SwapResult;
  adjustBonus: (id: PlayerId, delta: number) => void;
  finishSession: () => void;
  newSession: () => void;
  setConfig: (patch: Partial<SessionState['config']>) => void;
  replaceState: (next: SessionState) => void;
}

export type SessionStore = SessionState & SessionActions;

function clampScore(value: number, target: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > target) return target;
  return Math.round(value);
}

function ensureBonus(p: Player): Player {
  return { ...p, bonus: typeof p.bonus === 'number' ? p.bonus : 0 };
}

function findLocation(
  round: Round | undefined,
  playerId: PlayerId,
):
  | { kind: 'team'; gameId: string; team: 'teamA' | 'teamB'; slot: 0 | 1 }
  | { kind: 'rest'; index: number }
  | null {
  if (!round) return null;
  for (const g of round.games) {
    const ai = g.teamA.playerIds.indexOf(playerId);
    if (ai !== -1) return { kind: 'team', gameId: g.id, team: 'teamA', slot: ai as 0 | 1 };
    const bi = g.teamB.playerIds.indexOf(playerId);
    if (bi !== -1) return { kind: 'team', gameId: g.id, team: 'teamB', slot: bi as 0 | 1 };
  }
  const ri = round.restingPlayerIds.indexOf(playerId);
  if (ri !== -1) return { kind: 'rest', index: ri };
  return null;
}

export const useSession = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...defaultState(),

      addPlayer: (rawName) => {
        const name = rawName.trim();
        if (!name) return;
        const state = get();
        if (state.players.length >= 16) return;
        if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
        const player: Player = { id: newId(), name, status: 'active', bonus: 0 };
        set({ players: [...state.players, player] });
      },

      renamePlayer: (id, rawName) => {
        const name = rawName.trim();
        if (!name) return;
        set({
          players: get().players.map((p) => (p.id === id ? { ...p, name } : p)),
        });
      },

      removePlayer: (id) => {
        const { status, players } = get();
        if (status !== 'setup') return;
        set({ players: players.filter((p) => p.id !== id) });
      },

      setPlayerStatus: (id, status) => {
        set({
          players: get().players.map((p) => (p.id === id ? { ...p, status } : p)),
        });
      },

      startSession: () => {
        const { players } = get();
        const active = players.filter((p) => p.status === 'active').length;
        if (active < 4) return;
        set({ status: 'running' });
      },

      generateNextRound: () => {
        const { players, rounds, config, status } = get();
        if (status !== 'running') return { ok: false, message: 'Session not started.' };
        const result = generateRound({ players, rounds, config });
        if (!result.round) return { ok: false, message: result.message };
        set({ rounds: [...rounds, result.round] });
        return { ok: true, message: result.message };
      },

      reshuffleCurrentRound: () => {
        const { players, rounds, config, status } = get();
        if (status !== 'running') return { ok: false, message: 'Session not started.' };
        if (rounds.length === 0) return { ok: false, message: 'No round to re-shuffle yet.' };
        const current = rounds[rounds.length - 1] as Round;
        if (current.games.some((g) => g.recorded)) {
          return {
            ok: false,
            message: 'Some games are already recorded — unrecord them first.',
          };
        }
        // Re-roll using all rounds EXCEPT the current one so fairness/history is preserved.
        const priorRounds = rounds.slice(0, -1);
        const result = generateRound({ players, rounds: priorRounds, config });
        if (!result.round) return { ok: false, message: result.message };
        const replacement: Round = { ...result.round, number: current.number };
        set({ rounds: [...priorRounds, replacement] });
        return { ok: true, message: result.message };
      },

      setScore: (roundId, gameId, scoreA) => {
        const { rounds, config } = get();
        const a = clampScore(scoreA, config.targetTotal);
        const b = config.targetTotal - a;
        set({
          rounds: rounds.map((r) =>
            r.id !== roundId
              ? r
              : {
                  ...r,
                  games: r.games.map((g) =>
                    g.id !== gameId
                      ? g
                      : {
                          ...g,
                          teamA: { ...g.teamA, score: a },
                          teamB: { ...g.teamB, score: b },
                        },
                  ),
                },
          ),
        });
      },

      recordGame: (roundId, gameId) => {
        set({
          rounds: get().rounds.map((r) =>
            r.id !== roundId
              ? r
              : {
                  ...r,
                  games: r.games.map((g) => (g.id === gameId ? { ...g, recorded: true } : g)),
                },
          ),
        });
      },

      unrecordGame: (roundId, gameId) => {
        set({
          rounds: get().rounds.map((r) =>
            r.id !== roundId
              ? r
              : {
                  ...r,
                  games: r.games.map((g) => (g.id === gameId ? { ...g, recorded: false } : g)),
                },
          ),
        });
      },

      swapPlayers: (a, b) => {
        if (a === b) return { ok: false, reason: 'same' };
        const { rounds } = get();
        if (rounds.length === 0) return { ok: false, reason: 'not-found' };
        const current = rounds[rounds.length - 1] as Round;
        const locA = findLocation(current, a);
        const locB = findLocation(current, b);
        if (!locA || !locB) return { ok: false, reason: 'not-found' };
        const involvedGames = new Set<string>();
        if (locA.kind === 'team') involvedGames.add(locA.gameId);
        if (locB.kind === 'team') involvedGames.add(locB.gameId);
        const anyRecorded = current.games.some(
          (g) => involvedGames.has(g.id) && g.recorded,
        );
        if (anyRecorded) return { ok: false, reason: 'recorded' };

        const newGames = current.games.map((g) => {
          const teamA = g.teamA.playerIds.slice() as [PlayerId, PlayerId];
          const teamB = g.teamB.playerIds.slice() as [PlayerId, PlayerId];
          if (locA.kind === 'team' && locA.gameId === g.id) {
            if (locA.team === 'teamA') teamA[locA.slot] = b;
            else teamB[locA.slot] = b;
          }
          if (locB.kind === 'team' && locB.gameId === g.id) {
            if (locB.team === 'teamA') teamA[locB.slot] = a;
            else teamB[locB.slot] = a;
          }
          return { ...g, teamA: { ...g.teamA, playerIds: teamA }, teamB: { ...g.teamB, playerIds: teamB } };
        });

        const newResting = current.restingPlayerIds.slice();
        if (locA.kind === 'rest') newResting[locA.index] = b;
        if (locB.kind === 'rest') newResting[locB.index] = a;

        const newRound: Round = { ...current, games: newGames, restingPlayerIds: newResting };
        set({ rounds: [...rounds.slice(0, -1), newRound] });
        return { ok: true };
      },

      adjustBonus: (id, delta) => {
        if (!Number.isFinite(delta)) return;
        set({
          players: get().players.map((p) =>
            p.id !== id ? p : { ...p, bonus: (p.bonus ?? 0) + Math.round(delta) },
          ),
        });
      },

      finishSession: () => set({ status: 'finished' }),

      newSession: () => set(defaultState()),

      setConfig: (patch) =>
        set({
          config: { ...get().config, ...patch },
        }),

      replaceState: (next) => {
        const normalized: SessionState = {
          ...next,
          players: next.players.map(ensureBonus),
        };
        set(normalized);
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        status: state.status,
        config: state.config,
        players: state.players,
        rounds: state.rounds,
        createdAt: state.createdAt,
      }),
    },
  ),
);

/** Lightweight, non-persisted "intro seen" flag stored in localStorage directly. */
export const introStorage = {
  has(): boolean {
    try {
      return localStorage.getItem(INTRO_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  },
  mark(): void {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(INTRO_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};
