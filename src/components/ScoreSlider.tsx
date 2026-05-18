import type { ChangeEvent } from 'react';

interface Props {
  target: number;
  scoreA: number;
  disabled?: boolean;
  onChange: (scoreA: number) => void;
}

export default function ScoreSlider({ target, scoreA, disabled, onChange }: Props) {
  const a = Math.max(0, Math.min(target, Math.round(scoreA)));
  const b = target - a;

  const set = (next: number) => {
    if (disabled) return;
    onChange(Math.max(0, Math.min(target, Math.round(next))));
  };
  const handleSlider = (e: ChangeEvent<HTMLInputElement>) => set(Number(e.target.value));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => set(a - 1)}
          disabled={disabled || a === 0}
          className="h-9 w-9 shrink-0 rounded-full border border-white/15 bg-white/5 text-xl font-bold leading-none text-slate-100 transition active:scale-95 disabled:opacity-30"
          aria-label="Decrease team A score"
        >
          −
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
          <span className="lcd-num text-3xl font-bold text-cyan-300">{a}</span>
          <span className="text-lg text-slate-500">:</span>
          <span className="lcd-num lcd-num-gold text-3xl font-bold text-amber-300">{b}</span>
        </div>
        <button
          type="button"
          onClick={() => set(a + 1)}
          disabled={disabled || a === target}
          className="h-9 w-9 shrink-0 rounded-full border border-white/15 bg-white/5 text-xl font-bold leading-none text-slate-100 transition active:scale-95 disabled:opacity-30"
          aria-label="Increase team A score"
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
          value={a}
          onChange={handleSlider}
          disabled={disabled}
          className="w-full"
          aria-label="Team A score"
        />
        <div className="mt-0.5 flex justify-between px-1 text-[9px] uppercase tracking-wider text-slate-500">
          <span>0</span>
          <span>{target}</span>
        </div>
      </div>
    </div>
  );
}
