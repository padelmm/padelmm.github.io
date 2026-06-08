import type { Player } from './types';

/** Case-insensitive alphabetical order for roster lists. */
export function sortPlayersByName(players: readonly Player[]): Player[] {
  return [...players].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
