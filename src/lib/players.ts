import type { Player, PlayerId } from './types';

/** Case-insensitive alphabetical order for roster lists. */
export function sortPlayersByName(players: readonly Player[]): Player[] {
  return [...players].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

/** True if another player already uses this name (case-insensitive). */
export function isDuplicatePlayerName(
  players: readonly Player[],
  rawName: string,
  excludeId?: PlayerId,
): boolean {
  const n = rawName.trim().toLowerCase();
  if (!n) return false;
  return players.some(
    (p) => p.id !== excludeId && p.name.toLowerCase() === n,
  );
}

export type RenamePlayerResult =
  | { ok: true; players: Player[] }
  | { ok: false; reason: 'empty' | 'duplicate' | 'missing' };

/** Commit a rename. Empty and duplicate names are rejected; roster sorts only on success. */
export function applyPlayerRename(
  players: readonly Player[],
  id: PlayerId,
  rawName: string,
): RenamePlayerResult {
  const name = rawName.trim();
  if (!name) return { ok: false, reason: 'empty' };
  const existing = players.find((p) => p.id === id);
  if (!existing) return { ok: false, reason: 'missing' };
  if (isDuplicatePlayerName(players, name, id)) {
    return { ok: false, reason: 'duplicate' };
  }
  if (existing.name === name) return { ok: true, players: [...players] };
  return {
    ok: true,
    players: sortPlayersByName(
      players.map((p) => (p.id === id ? { ...p, name } : p)),
    ),
  };
}
