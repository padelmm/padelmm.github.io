import { useMemo, useState } from 'react';
import { useSession } from '../lib/store';
import { computeStats, sortByMode } from '../lib/stats';
import { rankingModeStorage, type RankingMode } from '../lib/ranking-mode';
import type { PlayerId } from '../lib/types';
import FinalRoundSheet from './FinalRoundSheet';

export default function Ranking() {
  const players = useSession((s) => s.players);
  const rounds = useSession((s) => s.rounds);
  const status = useSession((s) => s.status);
  const config = useSession((s) => s.config);
  const adjustBonus = useSession((s) => s.adjustBonus);
  const startFinalRound = useSession((s) => s.startFinalRound);

  // Sort preference is a per-phone setting (localStorage) — not session
  // data — so importing a session from another host doesn't override
  // how the current host likes to read the leaderboard.
  const [mode, setMode] = useState<RankingMode>(() => rankingModeStorage.get());
  const setRankingMode = (next: RankingMode) => {
    setMode(next);
    rankingModeStorage.set(next);
  };

  const ranking = useMemo(
    () => sortByMode(computeStats(players, rounds), mode),
    [players, rounds, mode],
  );
  const [expanded, setExpanded] = useState<PlayerId | null>(null);
  const [finalOpen, setFinalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activeCount = players.filter((p) => p.status === 'active').length;
  const neededForFinal = config.maxCourts * 4;
  const hasFinal = rounds.some((r) => r.kind === 'final');
  const recordedCount = useMemo(
    () =>
      rounds.reduce((acc, r) => acc + r.games.filter((g) => g.recorded).length, 0),
    [rounds],
  );

  const sessionRunning = status === 'running';
  let finalDisabledReason: string | null = null;
  if (!sessionRunning) finalDisabledReason = 'Start the session first.';
  else if (hasFinal) finalDisabledReason = 'Final round already played this session.';
  else if (recordedCount === 0)
    finalDisabledReason = 'Save at least one game so a ranking exists.';
  else if (activeCount < neededForFinal)
    finalDisabledReason = `Need ${neededForFinal} active players for a ${config.maxCourts}-court final (have ${activeCount}).`;

  const canStartFinal = finalDisabledReason === null;

  const flash = (msg: string | null) => {
    setNotice(msg);
    if (msg) window.setTimeout(() => setNotice((curr) => (curr === msg ? null : curr)), 3500);
  };

  const onConfirmFinal = () => {
    const res = startFinalRound();
    setFinalOpen(false);
    if (res.ok) flash(res.message ?? 'Final round drawn. Switch to the Round tab to play.');
    else flash(res.message ?? 'Could not start the final round.');
  };

  return (
    <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Ranking</h1>
        <div
          role="group"
          aria-label="Sort leaderboard by"
          className="inline-flex shrink-0 rounded-full border border-white/10 bg-white/5 p-0.5"
        >
          {(['points', 'wins'] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setRankingMode(m)}
                aria-pressed={active}
                className={
                  'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ' +
                  (active
                    ? 'bg-cyan-500 text-slate-900 shadow-lcd'
                    : 'text-slate-400 active:scale-95 hover:text-slate-200')
                }
              >
                {m === 'points' ? 'Points' : 'Wins'}
              </button>
            );
          })}
        </div>
      </header>

      {notice && (
        <p className="glass rounded-xl px-3 py-2 text-xs text-slate-200">{notice}</p>
      )}

      {ranking.length === 0 ? (
        <p className="glass rounded-2xl px-4 py-6 text-center text-sm text-slate-400">
          No players yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {ranking.map((s, i) => {
            const pos = i + 1;
            const isPodium = pos <= 3 && s.gamesPlayed > 0;
            const isOpen = expanded === s.playerId;
            return (
              <li
                key={s.playerId}
                className={
                  'glass rounded-2xl p-3 ' +
                  (isPodium ? 'ring-1 ring-cyan-400/30' : '')
                }
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : s.playerId)}
                  className="flex w-full items-center gap-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span
                    className={
                      'grid h-9 w-9 shrink-0 place-items-center rounded-full text-base font-bold ' +
                      (pos === 1
                        ? 'bg-yellow-400/20 text-yellow-300'
                        : pos === 2
                          ? 'bg-slate-400/20 text-slate-200'
                          : pos === 3
                            ? 'bg-amber-700/30 text-amber-300'
                            : 'bg-white/5 text-slate-400')
                    }
                  >
                    {pos}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-medium text-slate-100">
                        {s.name}
                      </span>
                      {s.status === 'paused' && (
                        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30">
                          paused
                        </span>
                      )}
                      {s.status === 'left' && (
                        <span className="rounded-full bg-slate-700/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 ring-1 ring-slate-600/40">
                          left
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      {mode === 'wins' ? (
                        <>
                          {s.gamesPlayed} g · {s.total} pts
                          {s.bonus !== 0
                            ? ` · bonus ${s.bonus > 0 ? '+' : ''}${s.bonus}`
                            : ''}
                        </>
                      ) : (
                        <>
                          {s.gamesPlayed} g · {s.wins}W-{s.losses}L
                          {s.draws > 0 ? `-${s.draws}D` : ''}
                          {s.bonus !== 0
                            ? ` · bonus ${s.bonus > 0 ? '+' : ''}${s.bonus}`
                            : ''}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="lcd-num text-2xl font-bold text-cyan-300">
                      {mode === 'wins' ? s.wins : s.total}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">
                      {mode === 'wins' ? 'wins' : 'pts'}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 flex items-center justify-center gap-5 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => adjustBonus(s.playerId, -1)}
                      className="grid h-12 w-12 place-items-center rounded-full border border-rose-400/30 bg-rose-500/10 text-2xl font-bold leading-none text-rose-200 transition active:scale-90 hover:bg-rose-500/20"
                      aria-label={`Subtract one bonus point from ${s.name}`}
                    >
                      −
                    </button>
                    <div className="min-w-20 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        bonus
                      </div>
                      <div className="lcd-num text-2xl font-bold text-slate-100">
                        {s.bonus > 0 ? `+${s.bonus}` : s.bonus}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustBonus(s.playerId, +1)}
                      className="grid h-12 w-12 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-2xl font-bold leading-none text-emerald-200 transition active:scale-90 hover:bg-emerald-500/20"
                      aria-label={`Add one bonus point to ${s.name}`}
                    >
                      +
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {sessionRunning && ranking.length > 0 && (
        <section className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setFinalOpen(true)}
            disabled={!canStartFinal}
            className={
              'rounded-2xl px-4 py-3.5 text-base font-bold transition active:scale-[0.98] ' +
              (canStartFinal
                ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-900 shadow-lcd-gold'
                : 'cursor-not-allowed bg-slate-700/60 text-slate-500 shadow-none')
            }
          >
            {hasFinal ? '✓ Final round played' : 'Start final round'}
          </button>
          {finalDisabledReason && (
            <p className="px-2 text-center text-[11px] text-slate-500">{finalDisabledReason}</p>
          )}
          {canStartFinal && (
            <p className="px-2 text-center text-[11px] text-slate-500">
              Top {neededForFinal} of {activeCount} active players, seeded by{' '}
              {mode === 'wins' ? 'wins' : 'points'}.
            </p>
          )}
        </section>
      )}

      <FinalRoundSheet
        open={finalOpen}
        mode={mode}
        onClose={() => setFinalOpen(false)}
        onConfirm={onConfirmFinal}
      />
    </div>
  );
}
