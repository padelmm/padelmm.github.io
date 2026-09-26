import { describe, expect, it } from 'vitest';
import {
  applyPlayerRename,
  isDuplicatePlayerName,
  sortPlayersByName,
} from './players';
import type { Player } from './types';

const p = (name: string): Player => ({
  id: name,
  name,
  status: 'active',
  bonus: 0,
});

describe('sortPlayersByName', () => {
  it('orders players A→Z, case-insensitive', () => {
    const sorted = sortPlayersByName([p('Zoe'), p('ann'), p('Bob')]);
    expect(sorted.map((x) => x.name)).toEqual(['ann', 'Bob', 'Zoe']);
  });
});

describe('isDuplicatePlayerName', () => {
  it('ignores the player being renamed', () => {
    expect(isDuplicatePlayerName([p('Alex'), p('Bob')], 'alex', 'Alex')).toBe(false);
  });

  it('detects another player with the same name, case-insensitive', () => {
    expect(isDuplicatePlayerName([p('Alex'), p('Bob')], 'BOB', 'Alex')).toBe(true);
  });
});

describe('applyPlayerRename', () => {
  const roster = [p('Alex'), p('Bob')];

  it('rejects an empty name and leaves the roster unchanged', () => {
    const res = applyPlayerRename(roster, 'Alex', '   ');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('empty');
    expect(roster[0]!.name).toBe('Alex');
  });

  it('trims a valid unique name and re-sorts', () => {
    const res = applyPlayerRename(roster, 'Bob', '  Ann  ');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.players.map((x) => x.name)).toEqual(['Alex', 'Ann']);
    }
  });

  it('rejects a name already used by another player', () => {
    const res = applyPlayerRename(roster, 'Alex', 'bob');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('duplicate');
  });

  it('allows typing through empty then committing a new unique name', () => {
    const afterEmpty = applyPlayerRename(roster, 'Alex', '');
    expect(afterEmpty.ok).toBe(false);
    const afterBob = applyPlayerRename(roster, 'Alex', 'Cara');
    expect(afterBob.ok).toBe(true);
    if (afterBob.ok) {
      expect(afterBob.players.find((x) => x.id === 'Alex')?.name).toBe('Cara');
    }
  });
});
