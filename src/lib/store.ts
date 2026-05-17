import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateRound, newId } from './teams';
import type { Player, PlayerId, PlayerStatus, SessionState } from './types';

const SCHEMA_VERSION = 1;
const STORAGE_KEY = 'padel-mm:session-v1';

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

interface SessionActions {
  addPlayer: (name: string) => void;
  renamePlayer: (id: PlayerId, name: string) => void;
  removePlayer: (id: PlayerId) => void;
  setPlayerStatus: (id: PlayerId, status: PlayerStatus) => void;
  startSession: () => void;
  generateNextRound: () => { ok: boolean; message?: string };
  setScore: (roundId: string, gameId: string, scoreA: number) => void;
  recordGame: (roundId: string, gameId: string) => void;
  unrecordGame: (roundId: string, gameId: string) => void;
  finishSession: () => void;
  newSession: () => void;
  setConfig: (patch: Partial<SessionState['config']>) => void;
}

export type SessionStore = SessionState & SessionActions;

function clampScore(value: number, target: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > target) return target;
  return Math.round(value);
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
        const player: Player = { id: newId(), name, status: 'active' };
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
        if (!result.round) {
          return { ok: false, message: result.message };
        }
        set({ rounds: [...rounds, result.round] });
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

      finishSession: () => set({ status: 'finished' }),

      newSession: () => set(defaultState()),

      setConfig: (patch) =>
        set({
          config: { ...get().config, ...patch },
        }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
    },
  ),
);
