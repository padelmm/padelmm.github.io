import { useEffect, useState } from 'react';

interface Props {
  value: number;
  min: number;
  max: number;
  /**
   * Increment applied by the + button (and decrement by −). Used for
   * the "even-only" points stepper (step=2) and the "one court at a
   * time" courts stepper (step=1). Always positive; the component
   * computes the signed delta internally.
   *
   * Also drives the parity / multiplicity snap when a user types a
   * value directly into the middle input — any input that doesn't
   * land on a `step` boundary is snapped to the nearest valid one
   * inside [min, max] on commit (blur / Enter).
   */
  step?: number;
  onChange: (next: number) => void;
  id?: string;
  'aria-label'?: string;
  /**
   * Optional unit shown beside the value (e.g. "pts", "courts"). Pure
   * decoration — kept inside the stepper so the visual feel matches
   * the score card.
   */
  unit?: string;
}

/**
 * Clamp + multiplicity-snap a raw number to the stepper's bounds.
 * Returns the nearest valid value inside [min, max] that is a
 * multiple of `step` (counting from `min`, so a stepper with min=6
 * step=2 produces 6, 8, 10, … even if min itself isn't a step
 * multiple of zero).
 */
function snap(n: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(n)) return min;
  const lower = Math.max(min, Math.min(max, n));
  const offset = lower - min;
  const snappedOffset = Math.round(offset / step) * step;
  const snapped = min + snappedOffset;
  return Math.max(min, Math.min(max, snapped));
}

/**
 * `−  N  +` stepper with a directly typeable middle field.
 *
 * Usage model:
 *  - Tap +/− to nudge by `step`. Edges disable the corresponding
 *    button (so the score-card "can't go below 0 / above target"
 *    feel is preserved).
 *  - Tap the centre value to focus and type a new number directly.
 *    Free-form typing is allowed (the host can erase to nothing
 *    before retyping) — the committed value is parsed and snapped to
 *    a valid step multiple on blur / Enter.
 *
 * Visual styling matches the score-card buttons on the Round screen
 * (rounded-full `+`/`-`, lcd-num readout in cyan). The readout
 * shares the `.lcd-num` utility which gets its glow trimmed in
 * light mode via the index.css overrides.
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

  // Local draft string for the input, so the user can transiently
  // hold partial values like "" or "1" without us aggressively
  // snapping back. Kept in sync with the external `value` whenever
  // the parent changes it (e.g. +/− buttons elsewhere) but NOT
  // overwritten by every keystroke.
  const [draft, setDraft] = useState<string>(String(clamped));

  useEffect(() => {
    setDraft(String(clamped));
    // We intentionally key only on `value`; the draft is owned by the
    // user while typing and should not bounce around as min/max
    // change (those don't realistically change during a session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitDraft = () => {
    const parsed = parseInt(draft, 10);
    const next = snap(parsed, min, max, step);
    // Always overwrite the draft so the user sees the snapped value
    // (e.g. typing "27" with step=2 becomes "28") — this teaches the
    // parity rule by example rather than failing silently.
    setDraft(String(next));
    if (next !== clamped) onChange(next);
  };

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
      <label className="flex min-w-[5.5rem] items-baseline justify-center gap-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={ariaLabel ? `${ariaLabel} value` : 'Value'}
          value={draft}
          onChange={(e) => {
            // Strip everything except digits as the host types. We
            // don't snap mid-typing; the user might be on their way
            // to a valid number and aggressive normalising would
            // make the field jumpy.
            const cleaned = e.target.value.replace(/[^0-9]/g, '');
            setDraft(cleaned);
          }}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setDraft(String(clamped));
              e.currentTarget.blur();
            }
          }}
          // Width sized for two digits + unit so 6→98 doesn't reflow
          // the row. `text-center` keeps the number visually
          // anchored regardless of digit count.
          className="lcd-num w-12 bg-transparent text-center text-2xl font-bold text-cyan-300 tabular-nums caret-cyan-400 focus:outline-none"
        />
        {unit && (
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            {unit}
          </span>
        )}
      </label>
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
