/**
 * Map a score in [0, target] to a colour along a red → yellow → cyan
 * gradient. Mirrors the score slider track (red on the left, cyan on
 * the right) so the digit colour reinforces "how high is this score":
 *   0  / 24 → hot red (shut-out / loss side)
 *   12 / 24 → warm yellow (midpoint, draw)
 *   24 / 24 → cool cyan (max win)
 */
export function scoreColor(score: number, target: number): string {
  const safeTarget = target > 0 ? target : 1;
  const clamped = Math.max(0, Math.min(safeTarget, score));
  const t = clamped / safeTarget;
  // Hue: 0° red → 50° yellow → 190° cyan, with the inflection at t=0.5.
  let hue: number;
  if (t <= 0.5) {
    hue = 0 + (50 - 0) * (t * 2);
  } else {
    hue = 50 + (190 - 50) * ((t - 0.5) * 2);
  }
  return `hsl(${hue.toFixed(0)}, 85%, 62%)`;
}
