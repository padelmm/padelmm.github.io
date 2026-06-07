import { describe, expect, it } from 'vitest';
import { mulberry32 } from './random';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('returns values strictly inside [0, 1)', () => {
    const r = mulberry32(0xc0ffee);
    for (let i = 0; i < 1_000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('coerces non-int seeds to a valid uint32', () => {
    // Floats / negatives / NaN should not throw and should produce a
    // deterministic sequence — the API contract for the CLI tool.
    expect(() => mulberry32(3.7)()).not.toThrow();
    expect(() => mulberry32(-1)()).not.toThrow();
    expect(() => mulberry32(Number.NaN)()).not.toThrow();
  });

  it('passes a simple distribution sanity check on 100k draws', () => {
    // Bucket 100k draws into 10 equal-width bins. Each bin should
    // contain ~10% of samples; tolerate ±2 percentage points. This is
    // a smoke test, not a full statistical certification — just
    // catches accidental skew if the algorithm gets damaged.
    const r = mulberry32(12345);
    const bins = new Array(10).fill(0) as number[];
    const N = 100_000;
    for (let i = 0; i < N; i++) {
      const bucket = Math.min(9, Math.floor(r() * 10));
      bins[bucket]! += 1;
    }
    for (const count of bins) {
      const pct = count / N;
      expect(pct).toBeGreaterThan(0.08);
      expect(pct).toBeLessThan(0.12);
    }
  });
});
