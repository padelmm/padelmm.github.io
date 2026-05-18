import { useMemo, useState } from 'react';
import { useSession } from '../lib/store';
import { computeStats, sortByPoints } from '../lib/stats';
import type { PlayerId } from '../lib/types';

export default function Ranking() {
  const players = useSession((s) => s.players);
  const rounds = useSession((s) => s.rounds);
  const adjustBonus = useSession((s) => s.adjustBonus);

  const ranking = useMemo(() => sortByPoints(computeStats(players, rounds)), [players, rounds]);
  const [expanded, setExpanded] = useState<PlayerId | null>(null);

  return (
    <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Ranking</h1>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">total points</span>
      </header>

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
                      {s.gamesPlayed} g · {s.wins}W-{s.losses}L
                      {s.draws > 0 ? `-${s.draws}D` : ''}
                      {s.bonus !== 0 ? ` · bonus ${s.bonus > 0 ? '+' : ''}${s.bonus}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="lcd-num text-2xl font-bold text-cyan-300">{s.total}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">pts</div>
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
    </div>
  );
}
