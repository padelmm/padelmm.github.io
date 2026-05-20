/**
 * Map a single team's score in [0, target] to a colour along a
 * cyan → yellow → red gradient. Used for the digit colours: 0 looks
 * cool, 24 looks hot, 12 sits at the warm middle.
 */
export function scoreColor(score: number, target: number): string {
  const safeTarget = target > 0 ? target : 1;
  const clamped = Math.max(0, Math.min(safeTarget, score));
  const t = clamped / safeTarget;
  // Hue: 190° cyan → 50° yellow → 0° red, with the inflection at t=0.5.
  let hue: number;
  if (t <= 0.5) {
    hue = 190 - (190 - 50) * (t * 2);
  } else {
    hue = 50 - 50 * ((t - 0.5) * 2);
  }
  return `hsl(${hue.toFixed(0)}, 85%, 62%)`;
}

/**
 * Map a slider position (= team A's score) to a colour that reflects how
 * *lopsided* the result is, not which team is ahead. Symmetric around the
 * target midpoint:
 *   - 12:12  (balanced) → cyan
 *   -  6:18 / 18:6      → yellow
 *   -  0:24 / 24:0      → red
 *
 * Drives the slider track gradient (statically, via index.css) and the
 * thumb glow (dynamically, via a CSS variable from ScoreSlider).
 */
export function intensityColor(scoreA: number, target: number): string {
  const safeTarget = target > 0 ? target : 1;
  const halfTarget = safeTarget / 2;
  const distance = Math.min(1, Math.abs(scoreA - halfTarget) / halfTarget);
  // Reuse the same hue curve as scoreColor, but apply it to "distance from
  // centre" instead of "score / target". That makes the colour set match
  // what scoreColor produces for the dominant team's score, which is what
  // a host intuitively reads off the slider.
  let hue: number;
  if (distance <= 0.5) {
    hue = 190 - (190 - 50) * (distance * 2);
  } else {
    hue = 50 - 50 * ((distance - 0.5) * 2);
  }
  return `hsl(${hue.toFixed(0)}, 85%, 62%)`;
}
