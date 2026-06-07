interface Props {
  value: number;
  min: number;
  max: number;
  /**
   * Increment applied by the + button (and decrement by −). Used for
   * the "even-only" points stepper (step=2) and the "one court at a
   * time" courts stepper (step=1). Always positive; the component
   * computes the signed delta internally.
   */
  step?: number;
  onChange: (next: number) => void;
  /** Optional ID for screen readers / labels. */
  id?: string;
  /** Optional ARIA label describing what's being stepped (e.g. "Points per game"). */
  'aria-label'?: string;
  /**
   * Optional unit shown beside the value (e.g. "pts", "courts"). Pure
   * decoration — kept inside the stepper so the visual feel matches
   * the score card.
   */
  unit?: string;
}

/**
 * `−  N  +` stepper, visually matching the score-card +/− buttons on
 * the Round screen. Used in the Setup screen for both the points-per-
 * game custom input and the courts picker so the two controls feel
 * like one consistent family.
 *
 * Behaviour notes:
 *  - Clamps at `min` / `max` and disables the corresponding button at
 *    the edges (mirrors the score buttons disabling at 0 / target).
 *  - Steps by `step` (default 1). Pressing − at value `min+step-1`
 *    snaps back to `min` rather than going below it; same logic on
 *    the upper edge.
 *  - The big central number uses the `lcd-num` utility so it gets
 *    the same monospace + glow treatment as scores elsewhere — the
 *    glow gracefully fades in light mode via the index.css overrides.
 */
export default function NumberStepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  id,
  unit,
  'aria-label': ariaLabel,
}: Props) {
  const clamped = Math.max(min, Math.min(max, value));
  const atMin = clamped <= min;
  const atMax = clamped >= max;

  const dec = () => {
    if (atMin) return;
    const next = clamped - step;
    onChange(next < min ? min : next);
  };
  const inc = () => {
    if (atMax) return;
    const next = clamped + step;
    onChange(next > max ? max : next);
  };

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      className="flex items-center justify-center gap-2"
    >
      <button
        type="button"
        onClick={dec}
        disabled={atMin}
        aria-label={`Decrease ${ariaLabel ?? 'value'} by ${step}`}
        className="h-9 w-9 shrink-0 rounded-full border border-white/15 bg-white/5 text-xl font-bold leading-none text-slate-100 transition active:scale-95 disabled:opacity-30"
      >
        −
      </button>
      <div className="flex min-w-[5.5rem] items-baseline justify-center gap-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
        <span className="lcd-num text-2xl font-bold text-cyan-300 tabular-nums">
          {clamped}
        </span>
        {unit && (
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            {unit}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={inc}
        disabled={atMax}
        aria-label={`Increase ${ariaLabel ?? 'value'} by ${step}`}
        className="h-9 w-9 shrink-0 rounded-full border border-white/15 bg-white/5 text-xl font-bold leading-none text-slate-100 transition active:scale-95 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
