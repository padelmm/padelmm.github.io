import type { ChangeEvent, CSSProperties } from 'react';
import { intensityColor, scoreColor } from '../lib/score-color';

interface Props {
  target: number;
  scoreA: number;
  disabled?: boolean;
  onChange: (scoreA: number) => void;
}

/**
 * Score control. The component still stores team A's score (`scoreA`) in
 * state because that's what the rest of the app expects, but the slider is
 * wired so that *dragging right awards the right team* (and vice versa).
 * Concretely, the underlying `<input type="range">` value is team B's score
 * — i.e. the score on the side the thumb is pointing at — and the on-change
 * handler flips it back into a team A delta. The track gradient and thumb
 * glow are driven by CSS variables that follow the live score, so the
 * colours match the digits as the host slides.
 */
export default function ScoreSlider({ target, scoreA, disabled, onChange }: Props) {
  const a = Math.max(0, Math.min(target, Math.round(scoreA)));
  const b = target - a;
  const colorA = scoreColor(a, target);
  const colorB = scoreColor(b, target);
  const thumbColor = intensityColor(a, target);
  const sliderStyle = {
    '--score-thumb-color': thumbColor,
    '--score-track-from': colorA,
    '--score-track-to': colorB,
  } as CSSProperties;

  const set = (next: number) => {
    if (disabled) return;
    onChange(Math.max(0, Math.min(target, Math.round(next))));
  };
  const handleSlider = (e: ChangeEvent<HTMLInputElement>) => {
    // Slider value tracks team B's score, so a higher slider value means a
    // *lower* scoreA. Convert back here before notifying the parent.
    set(target - Number(e.target.value));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => set(a + 1)}
          disabled={disabled || a === target}
          className="h-9 w-9 shrink-0 rounded-full border border-white/15 bg-white/5 text-xl font-bold leading-none text-slate-100 transition active:scale-95 disabled:opacity-30"
          aria-label="Award a point to the left team"
        >
          +
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
          <span className="lcd-num text-3xl font-bold" style={{ color: colorA }}>
            {a}
          </span>
          <span className="text-lg text-slate-500">:</span>
          <span className="lcd-num text-3xl font-bold" style={{ color: colorB }}>
            {b}
          </span>
        </div>
        <button
          type="button"
          onClick={() => set(a - 1)}
          disabled={disabled || a === 0}
          className="h-9 w-9 shrink-0 rounded-full border border-white/15 bg-white/5 text-xl font-bold leading-none text-slate-100 transition active:scale-95 disabled:opacity-30"
          aria-label="Award a point to the right team"
        >
          +
        </button>
      </div>

      <div className="px-1">
        <input
          type="range"
          min={0}
          max={target}
          step={1}
          value={b}
          onChange={handleSlider}
          disabled={disabled}
          style={sliderStyle}
          className="score-slider w-full"
          aria-label="Score split. Drag right to award the right team, left to award the left team."
          aria-valuetext={`${a} to ${b}`}
        />
        <div className="mt-0.5 flex justify-between px-1 text-[9px] uppercase tracking-wider text-slate-500">
          <span>{target}</span>
          <span>0</span>
          <span>{target}</span>
        </div>
      </div>
    </div>
  );
}
