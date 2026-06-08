import { describe, expect, it } from 'vitest';
import {
  activePlayersMissingGender,
  isMixAmericano,
  missingGenderMessage,
} from './mix-americano';
import type { Player, SessionConfig } from './types';

const cfg = (tournament: SessionConfig['tournament']): SessionConfig => ({
  targetTotal: 24,
  maxCourts: 2,
  avoidImmediateRepeat: true,
  tournament,
});

const p = (id: string, gender?: 'm' | 'f', status: Player['status'] = 'active'): Player => ({
  id,
  name: id,
  status,
  bonus: 0,
  gender,
});

describe('mix-americano helpers', () => {
  it('isMixAmericano is true only for mix-americano tournament', () => {
    expect(isMixAmericano(cfg('mix-americano'))).toBe(true);
    expect(isMixAmericano(cfg('mexicano'))).toBe(false);
  });

  it('activePlayersMissingGender ignores paused/left and counts unset active', () => {
    const players = [p('a'), p('b', 'm'), p('c', undefined, 'paused'), p('d', 'f')];
    expect(activePlayersMissingGender(players).map((x) => x.id)).toEqual(['a']);
  });

  it('missingGenderMessage lists names', () => {
    const msg = missingGenderMessage([p('Ann'), p('Bob', 'm')]);
    expect(msg).toMatch(/Ann/);
    expect(msg).toMatch(/Players tab/i);
  });

  it('missingGenderMessage is null when all active have gender', () => {
    expect(missingGenderMessage([p('a', 'm'), p('b', 'f')])).toBeNull();
  });
});
