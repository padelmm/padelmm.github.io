import type { Player, SessionConfig } from './types';

/** True when the session is configured for mixed-gender teams. */
export function isMixAmericano(config: SessionConfig): boolean {
  return config.tournament === 'mix-americano';
}

/** Active players who still need an M/F choice before Mix Americano can run. */
export function activePlayersMissingGender(players: readonly Player[]): Player[] {
  return players.filter(
    (p) => p.status === 'active' && p.gender !== 'm' && p.gender !== 'f',
  );
}

/** User-facing error for round generation, or null when everyone is set. */
export function missingGenderMessage(players: readonly Player[]): string | null {
  const missing = activePlayersMissingGender(players);
  if (missing.length === 0) return null;
  const names = missing.map((p) => p.name).join(', ');
  return `Set gender (M/F) for: ${names}. Open the Players tab.`;
}
