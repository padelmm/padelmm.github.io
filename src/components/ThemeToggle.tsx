import { useTheme } from '../lib/use-theme';
import type { ThemeMode } from '../lib/theme';

/**
 * Segmented Auto / Light / Dark control.
 *
 * Auto follows the OS via `prefers-color-scheme` and re-applies in
 * real time when the OS theme flips. Light and Dark pin explicitly
 * and ignore the OS until the user reselects Auto.
 *
 * Mirrors the segmented-toggle styling used by the Ranking-mode
 * switch (Points / Wins) so the visual language is consistent across
 * preference UIs.
 */
const OPTIONS: { id: ThemeMode; label: string; emoji: string }[] = [
  { id: 'auto', label: 'Auto', emoji: '◐' },
  { id: 'light', label: 'Light', emoji: '☀' },
  { id: 'dark', label: 'Dark', emoji: '☾' },
];

export default function ThemeToggle() {
  const { mode, resolved, setMode } = useTheme();

  return (
    <div className="glass flex flex-col gap-2 rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">Theme</h3>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">
          {mode === 'auto' ? `Auto · ${resolved}` : resolved}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="App theme"
        className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/20 p-1"
      >
        {OPTIONS.map((opt) => {
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(opt.id)}
              className={
                'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition active:scale-[0.97] ' +
                (active
                  ? 'bg-cyan-500/90 text-slate-900 shadow-lcd'
                  : 'text-slate-300 hover:bg-white/5')
              }
            >
              <span aria-hidden>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500">
        Auto follows your phone&apos;s appearance. Light uses the
        One&nbsp;Cisco Design glass spec; dark is the original Blue
        Lions look.
      </p>
    </div>
  );
}
