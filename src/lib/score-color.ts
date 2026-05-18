/**
 * Map a score in [0, target] to a colour along a cyan → yellow → red
 * gradient. Mirrors the score slider track so the digit colour visually
 * reinforces "how high is this score" at a glance:
 *   0 / 24  → cold cyan
 *   12 / 24 → warm yellow (midpoint, draw)
 *   24 / 24 → hot red (max win)
 */
export function scoreColor(score: number, target: number): string {
  const safeTarget = target > 0 ? target : 1;
  const clamped = Math.max(0, Math.min(safeTarget, score));
  const t = clamped / safeTarget;
  // Hue stops chosen to match the slider track gradient.
  // 190° cyan → 50° yellow → 0° red, with the inflection at t=0.5.
  let hue: number;
  if (t <= 0.5) {
    hue = 190 - (190 - 50) * (t * 2);
  } else {
    hue = 50 - 50 * ((t - 0.5) * 2);
  }
  return `hsl(${hue.toFixed(0)}, 85%, 62%)`;
}
