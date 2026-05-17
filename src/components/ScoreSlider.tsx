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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center rounded-xl bg-slate-900/70 px-2 py-3 ring-1 ring-court-line">
          <span className="text-[10px] uppercase tracking-wider text-cyan-300">Team A</span>
          <span className="font-mono text-5xl font-bold tabular-nums text-cyan-200">{a}</span>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => set(a - 1)}
              disabled={disabled || a === 0}
              className="h-10 w-10 rounded-full bg-slate-800 text-2xl font-bold leading-none text-slate-100 ring-1 ring-court-line transition active:scale-95 disabled:opacity-30"
              aria-label="Decrease team A score"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => set(a + 1)}
              disabled={disabled || a === target}
              className="h-10 w-10 rounded-full bg-slate-800 text-2xl font-bold leading-none text-slate-100 ring-1 ring-court-line transition active:scale-95 disabled:opacity-30"
              aria-label="Increase team A score"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-slate-900/70 px-2 py-3 ring-1 ring-court-line">
          <span className="text-[10px] uppercase tracking-wider text-orange-300">Team B</span>
          <span className="font-mono text-5xl font-bold tabular-nums text-orange-200">{b}</span>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => set(a + 1)}
              disabled={disabled || b === 0}
              className="h-10 w-10 rounded-full bg-slate-800 text-2xl font-bold leading-none text-slate-100 ring-1 ring-court-line transition active:scale-95 disabled:opacity-30"
              aria-label="Decrease team B score"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => set(a - 1)}
              disabled={disabled || b === target}
              className="h-10 w-10 rounded-full bg-slate-800 text-2xl font-bold leading-none text-slate-100 ring-1 ring-court-line transition active:scale-95 disabled:opacity-30"
              aria-label="Increase team B score"
            >
              +
            </button>
          </div>
        </div>
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
        <div className="flex justify-between px-1 text-[10px] text-slate-500">
          <span>0</span>
          <span>{Math.floor(target / 2)}</span>
          <span>{target}</span>
        </div>
      </div>
    </div>
  );
}
