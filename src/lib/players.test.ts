import { describe, expect, it } from 'vitest';
import { sortPlayersByName } from './players';
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
