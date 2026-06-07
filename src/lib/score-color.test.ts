import { describe, expect, it } from 'vitest';
import { intensityColor, scoreColor } from './score-color';

/**
 * Pull the hue out of an `hsl(H, var(--score-saturation, ...), …)`
 * string. Returns the integer hue or NaN if the format doesn't
 * match. Used to assert that the *colour curve* is correct without
 * coupling tests to the exact saturation / lightness CSS variables
 * (which are theme-driven and tested separately via integration).
 */
function hue(hsl: string): number {
  const match = hsl.match(/^hsl\((\d+),/);
  return match ? Number.parseInt(match[1]!, 10) : Number.NaN;
}

describe('scoreColor', () => {
  it('returns cyan-ish (≈190°) at score 0', () => {
    expect(hue(scoreColor(0, 24))).toBe(190);
  });

  it('returns red (0°) at the target score', () => {
    expect(hue(scoreColor(24, 24))).toBe(0);
  });

  it('returns yellow-ish (≈50°) at the midpoint', () => {
    expect(hue(scoreColor(12, 24))).toBe(50);
  });

  it('monotonically decreases hue (cyan → yellow → red) across the range', () => {
    const hues: number[] = [];
    for (let s = 0; s <= 24; s += 2) hues.push(hue(scoreColor(s, 24)));
    for (let i = 1; i < hues.length; i++) {
      expect(hues[i]!).toBeLessThanOrEqual(hues[i - 1]!);
    }
  });

  it('clamps scores outside [0, target]', () => {
    // Negative or above-target inputs shouldn't produce NaN hues —
    // they should map to the endpoints.
    expect(hue(scoreColor(-10, 24))).toBe(190);
    expect(hue(scoreColor(100, 24))).toBe(0);
  });

  it('survives a target of 0 without dividing by zero', () => {
    // Defensive against a corrupted config; should still return a
    // valid CSS colour rather than NaN-ing the slider.
    const out = scoreColor(0, 0);
    expect(Number.isNaN(hue(out))).toBe(false);
  });

  it('uses CSS variables for saturation and lightness', () => {
    // The theme system flips the digit brightness via CSS vars (see
    // index.css [data-theme='light']). The colour function MUST
    // delegate so inline-style colours pick up the theme.
    const out = scoreColor(12, 24);
    expect(out).toContain('var(--score-saturation');
    expect(out).toContain('var(--score-lightness');
  });
});

describe('intensityColor', () => {
  it('peaks at red when the score is 0:target (most lopsided)', () => {
    expect(hue(intensityColor(0, 24))).toBe(0);
    expect(hue(intensityColor(24, 24))).toBe(0);
  });

  it('returns cyan (190°) at a balanced midpoint', () => {
    expect(hue(intensityColor(12, 24))).toBe(190);
  });

  it('is symmetric around the midpoint', () => {
    // The intensity should depend only on *how far* a side leads,
    // not which side. 6:18 and 18:6 are equally lopsided.
    expect(hue(intensityColor(6, 24))).toBe(hue(intensityColor(18, 24)));
    expect(hue(intensityColor(3, 24))).toBe(hue(intensityColor(21, 24)));
  });
});
