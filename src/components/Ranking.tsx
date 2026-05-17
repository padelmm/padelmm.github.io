import { useMemo } from 'react';
import { useSession } from '../lib/store';
import { computeStats, sortByPoints } from '../lib/stats';

export default function Ranking() {
  const players = useSession((s) => s.players);
  const rounds = useSession((s) => s.rounds);

  const ranking = useMemo(() => sortByPoints(computeStats(players, rounds)), [players, rounds]);

  return (
    <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
      <header>
        <h1 className="text-xl font-bold">Ranking</h1>
        <p className="text-sm text-slate-400">Total points across all recorded games.</p>
      </header>

      {ranking.length === 0 ? (
        <p className="rounded-2xl bg-court-panel/40 px-4 py-6 text-center text-sm text-slate-400">
          No players yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {ranking.map((s, i) => {
            const pos = i + 1;
            const isPodium = pos <= 3 && s.gamesPlayed > 0;
            return (
              <li
                key={s.playerId}
                className={
                  'flex items-center gap-3 rounded-2xl p-3 ring-1 ' +
                  (isPodium
                    ? 'bg-cyan-500/10 ring-cyan-500/30'
                    : 'bg-court-panel/70 ring-court-line')
                }
              >
                <span
                  className={
                    'grid h-10 w-10 place-items-center rounded-full text-base font-bold ' +
                    (pos === 1
                      ? 'bg-yellow-400/20 text-yellow-300'
                      : pos === 2
                        ? 'bg-slate-400/20 text-slate-200'
                        : pos === 3
                          ? 'bg-amber-700/30 text-amber-300'
                          : 'bg-slate-800 text-slate-400')
                  }
                >
                  {pos}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-base font-medium text-slate-100">{s.name}</span>
                    {s.status === 'paused' && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30">
                        paused
                      </span>
                    )}
                    {s.status === 'left' && (
                      <span className="rounded-full bg-slate-700/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 ring-1 ring-slate-600/40">
                        left
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {s.gamesPlayed} games · {s.wins}W-{s.losses}L
                    {s.draws > 0 ? `-${s.draws}D` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold tabular-nums text-cyan-300">
                    {s.pointsScored}
                  </div>
                  <div className="text-[10px] text-slate-500">pts</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
