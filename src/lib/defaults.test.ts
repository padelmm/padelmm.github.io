import { describe, expect, it } from 'vitest';
import {
  APP_DEFAULTS,
  defaultSessionConfig,
  isValidPointsPerGame,
  normalisePointsPerGame,
} from './defaults';

describe('isValidPointsPerGame', () => {
  it('accepts every preset option', () => {
    for (const n of APP_DEFAULTS.pointsPerGameOptions) {
      expect(isValidPointsPerGame(n), `preset ${n}`).toBe(true);
    }
  });

  it('accepts the min and max bounds', () => {
    expect(isValidPointsPerGame(APP_DEFAULTS.pointsPerGameMin)).toBe(true);
    expect(isValidPointsPerGame(APP_DEFAULTS.pointsPerGameMax)).toBe(true);
  });

  it('rejects odd values inside the range', () => {
    expect(isValidPointsPerGame(7)).toBe(false);
    expect(isValidPointsPerGame(25)).toBe(false);
    expect(isValidPointsPerGame(97)).toBe(false);
  });

  it('rejects values below min', () => {
    expect(isValidPointsPerGame(APP_DEFAULTS.pointsPerGameMin - 2)).toBe(false);
    expect(isValidPointsPerGame(0)).toBe(false);
    expect(isValidPointsPerGame(-4)).toBe(false);
  });

  it('rejects values above max', () => {
    expect(isValidPointsPerGame(APP_DEFAULTS.pointsPerGameMax + 2)).toBe(false);
    expect(isValidPointsPerGame(1000)).toBe(false);
  });

  it('rejects non-integers and non-finite values', () => {
    expect(isValidPointsPerGame(12.5)).toBe(false);
    expect(isValidPointsPerGame(Number.NaN)).toBe(false);
    expect(isValidPointsPerGame(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('normalisePointsPerGame', () => {
  it('returns the value unchanged when already valid', () => {
    for (const n of [6, 16, 24, 32, 50, 98]) {
      expect(normalisePointsPerGame(n)).toBe(n);
    }
  });

  it('snaps odd values to the nearest even (rounding half to even-multiple)', () => {
    // Step is 2; 27 is equidistant from 26 and 28 (Math.round → 28).
    expect(normalisePointsPerGame(27)).toBe(28);
    expect(normalisePointsPerGame(25)).toBe(26);
    expect(normalisePointsPerGame(7)).toBe(8);
  });

  it('clamps below min', () => {
    expect(normalisePointsPerGame(0)).toBe(APP_DEFAULTS.pointsPerGameMin);
    expect(normalisePointsPerGame(-100)).toBe(APP_DEFAULTS.pointsPerGameMin);
    expect(normalisePointsPerGame(5)).toBe(APP_DEFAULTS.pointsPerGameMin);
  });

  it('clamps above max', () => {
    expect(normalisePointsPerGame(100)).toBe(APP_DEFAULTS.pointsPerGameMax);
    expect(normalisePointsPerGame(9999)).toBe(APP_DEFAULTS.pointsPerGameMax);
  });

  it('falls back to the default for non-finite input', () => {
    expect(normalisePointsPerGame(Number.NaN)).toBe(APP_DEFAULTS.pointsPerGame);
    expect(normalisePointsPerGame(Number.POSITIVE_INFINITY)).toBe(
      APP_DEFAULTS.pointsPerGame,
    );
  });
});

describe('defaultSessionConfig', () => {
  it('mirrors APP_DEFAULTS', () => {
    const cfg = defaultSessionConfig();
    expect(cfg.targetTotal).toBe(APP_DEFAULTS.pointsPerGame);
    expect(cfg.maxCourts).toBe(APP_DEFAULTS.courts);
    expect(cfg.avoidImmediateRepeat).toBe(APP_DEFAULTS.avoidImmediateRepeat);
    expect(cfg.tournament).toBe(APP_DEFAULTS.tournament);
  });

  it('returns a fresh mutable object each call', () => {
    // The store mutates the config in place (via `setConfig`), so the
    // factory must not hand out a shared singleton — otherwise two
    // newly-created sessions would alias the same config.
    const a = defaultSessionConfig();
    const b = defaultSessionConfig();
    expect(a).not.toBe(b);
    a.targetTotal = 999;
    expect(b.targetTotal).toBe(APP_DEFAULTS.pointsPerGame);
  });
});
