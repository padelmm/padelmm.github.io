import { useEffect, useState } from 'react';
import { useSession } from '../lib/store';
import {
  APP_DEFAULTS,
  normalisePointsPerGame,
  TOURNAMENT_OPTIONS,
  tournamentLabel,
} from '../lib/defaults';
import type { TournamentType } from '../lib/types';
import NumberStepper from './NumberStepper';

interface Props {
  /**
   * When `true`, render a short advisory note explaining that
   * changes will only affect rounds generated from here on. Used
   * when the panel is mounted inside the Session tab during a
   * running / finished session — past games already in `rounds`
   * keep the scores they were saved with, but the live `config`
   * read by the slider and round generator will pick up new values
   * immediately.
   *
   * Off in Setup mode (no games exist yet, so the warning would be
   * confusing).
   */
  showLiveAdvice?: boolean;
}

/**
 * The "Settings" card extracted from the original Setup screen.
 *
 * Houses the three knobs that drive round generation and scoring:
 *  - Points per game (16 / 24 / 32 preset chips + a typeable Custom
 *    even stepper from 6 to 98).
 *  - Number of courts (1–12 stepper).
 *  - Avoid same partners in consecutive rounds (toggle).
 *
 * Lives in two places:
 *  - `Setup.tsx`           — initial session setup before Start.
 *  - `SessionMenu.tsx`     — same panel exposed mid-session so a
 *    host who's already entered 12 players can change their mind on
 *    points / courts / partner-repeat without losing the roster.
 *
 * All changes flow through the shared `setConfig` store action, so
 * persistence and migration are handled centrally. No props are
 * passed for the values themselves — the panel always reads /
 * writes `state.config` directly.
 */
export default function RoundSettings({ showLiveAdvice = false }: Props) {
  const config = useSession((s) => s.config);
  const rounds = useSession((s) => s.rounds);
  const setConfig = useSession((s) => s.setConfig);
  const [pendingTournament, setPendingTournament] = useState<TournamentType | null>(null);

  const hasRecordedGames = rounds.some((r) => r.games.some((g) => g.recorded));

  useEffect(() => {
    if (!pendingTournament) return;
    const t = window.setTimeout(() => setPendingTournament(null), 4000);
    return () => window.clearTimeout(t);
  }, [pendingTournament]);

  const selectTournament = (id: TournamentType) => {
    if (config.tournament === id) {
      setPendingTournament(null);
      return;
    }
    if (showLiveAdvice && hasRecordedGames) {
      if (pendingTournament !== id) {
        setPendingTournament(id);
        return;
      }
      setPendingTournament(null);
    }
    setConfig({ tournament: id });
  };

  // Whether the "Custom" points stepper is exposed. Persists across
  // remounts via the saved targetTotal — if the host's current
  // target is one of the canned presets, default the custom panel
  // to hidden; otherwise show it expanded so they immediately see
  // the value they last typed.
  const [customPointsOpen, setCustomPointsOpen] = useState(
    !APP_DEFAULTS.pointsPerGameOptions.includes(
      config.targetTotal as (typeof APP_DEFAULTS.pointsPerGameOptions)[number],
    ),
  );

  return (
    <section className="glass rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-slate-300">Settings</h2>

      <div className="mt-3 flex flex-col gap-2">
        <span className="text-sm">Tournament format</span>
        <div className="flex flex-col gap-1.5">
          {TOURNAMENT_OPTIONS.map((opt) => {
            const selected = config.tournament === opt.id;
            const confirming = pendingTournament === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectTournament(opt.id)}
                className={
                  'rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ' +
                  (selected
                    ? 'border-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-400/40'
                    : confirming
                      ? 'border-amber-400/60 bg-amber-500/15 ring-1 ring-amber-400/40'
                      : 'border-white/10 bg-white/5 hover:bg-white/10')
                }
              >
                <span
                  className={
                    'text-sm font-semibold ' + (selected ? 'text-cyan-200' : 'text-slate-200')
                  }
                >
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">{opt.description}</span>
              </button>
            );
          })}
        </div>
        {showLiveAdvice && hasRecordedGames && (
          <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-100/90">
            Games already played — changing format only affects{' '}
            <span className="font-medium">new</span> rounds. Past draws stay as they
            were. Tap another format twice to confirm.
          </p>
        )}
        {pendingTournament && (
          <p className="text-[11px] font-medium text-amber-200">
            Tap {tournamentLabel(pendingTournament)} again to switch format.
          </p>
        )}
        {config.tournament === 'mix-americano' && (
          <p className="text-[11px] text-amber-200/90">
            Set each player&apos;s gender on the Players tab before generating rounds.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>Points per game</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            sum
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {APP_DEFAULTS.pointsPerGameOptions.map((n) => {
            const selected = !customPointsOpen && config.targetTotal === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setCustomPointsOpen(false);
                  setConfig({ targetTotal: n });
                }}
                className={
                  'h-9 min-w-[3rem] rounded-lg border px-2 text-sm font-medium transition ' +
                  (selected
                    ? 'border-cyan-400 bg-cyan-500/80 text-slate-900 shadow-lcd'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10')
                }
              >
                {n}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setCustomPointsOpen(true);
              // If the host had a preset selected, switch to the
              // nearest valid even custom value so the stepper has
              // a sane starting point. No-op if the value is
              // already custom.
              setConfig({
                targetTotal: normalisePointsPerGame(config.targetTotal),
              });
            }}
            className={
              'h-9 rounded-lg border px-3 text-sm font-medium transition ' +
              (customPointsOpen
                ? 'border-cyan-400 bg-cyan-500/80 text-slate-900 shadow-lcd'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10')
            }
          >
            Custom
          </button>
        </div>
        {customPointsOpen && (
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">
              Custom value
              <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">
                {APP_DEFAULTS.pointsPerGameMin}–{APP_DEFAULTS.pointsPerGameMax} ·
                even
              </span>
            </span>
            <NumberStepper
              value={config.targetTotal}
              min={APP_DEFAULTS.pointsPerGameMin}
              max={APP_DEFAULTS.pointsPerGameMax}
              step={APP_DEFAULTS.pointsPerGameStep}
              onChange={(n) => setConfig({ targetTotal: n })}
              aria-label="Points per game"
            />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span>Number of courts</span>
        <NumberStepper
          value={config.maxCourts}
          min={APP_DEFAULTS.courtsMin}
          max={APP_DEFAULTS.courtsMax}
          step={1}
          onChange={(n) => setConfig({ maxCourts: n })}
          aria-label="Number of courts"
        />
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm">Avoid same partners in consecutive rounds</span>
        <input
          type="checkbox"
          checked={config.avoidImmediateRepeat}
          onChange={(e) => setConfig({ avoidImmediateRepeat: e.target.checked })}
          className="h-5 w-5 accent-cyan-500"
        />
      </label>

      {showLiveAdvice && (
        <p className="mt-4 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[11px] text-slate-400">
          Changes apply to rounds generated from here on. Saved scores in past
          rounds keep their original points target.
        </p>
      )}
    </section>
  );
}
