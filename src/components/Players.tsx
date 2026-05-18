import { useState } from 'react';
import { useSession } from '../lib/store';
import type { PlayerStatus } from '../lib/types';

const statusLabel: Record<PlayerStatus, string> = {
  active: 'Playing',
  paused: 'Paused',
  left: 'Left',
};

const statusClasses: Record<PlayerStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  paused: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  left: 'bg-slate-700/40 text-slate-400 ring-slate-600/40',
};

export default function Players() {
  const players = useSession((s) => s.players);
  const setPlayerStatus = useSession((s) => s.setPlayerStatus);
  const addPlayer = useSession((s) => s.addPlayer);
  const renamePlayer = useSession((s) => s.renamePlayer);

  const [name, setName] = useState('');
  const trimmed = name.trim();
  const duplicate = players.some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase() && trimmed.length > 0,
  );
  const canAdd = trimmed.length > 0 && !duplicate && players.length < 16;

  const submitAdd = () => {
    if (!canAdd) return;
    addPlayer(trimmed);
    setName('');
  };

  const activeCount = players.filter((p) => p.status === 'active').length;

  return (
    <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Players</h1>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">
          {activeCount} active · {players.length} total
        </span>
      </header>

      <section className="glass rounded-2xl p-3">
        <label className="block text-xs font-medium text-slate-300" htmlFor="add-player">
          Add a new player
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="add-player"
            type="text"
            inputMode="text"
            autoCapitalize="words"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAdd();
            }}
            placeholder="Name"
            maxLength={24}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={submitAdd}
            disabled={!canAdd}
            className="rounded-xl bg-cyan-500/90 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lcd transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700/60 disabled:text-slate-500 disabled:shadow-none"
          >
            Add
          </button>
        </div>
        {duplicate && trimmed.length > 0 && (
          <p className="mt-1.5 text-[11px] text-amber-300">Name already in the list.</p>
        )}
        {players.length >= 16 && (
          <p className="mt-1.5 text-[11px] text-amber-300">Maximum is 16 players.</p>
        )}
        <p className="mt-2 text-[10px] text-slate-500">
          Tip: to replace a player on the court, add the new player here, go to{' '}
          <span className="text-cyan-300">Round</span>, tap the departing player's chip
          and choose the new one from the list.
        </p>
      </section>

      <ul className="flex flex-col gap-2">
        {players.map((p) => (
          <li key={p.id} className="glass flex flex-col gap-2 rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={p.name}
                onChange={(e) => renamePlayer(p.id, e.target.value)}
                maxLength={24}
                aria-label={`Rename ${p.name}`}
                className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-base font-medium text-slate-100 focus:bg-black/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
              />
              <span
                className={
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ' +
                  statusClasses[p.status]
                }
              >
                {statusLabel[p.status]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['active', 'paused', 'left'] as PlayerStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlayerStatus(p.id, s)}
                  className={
                    'rounded-lg border px-2 py-2 text-xs font-medium transition active:scale-95 ' +
                    (p.status === s
                      ? 'border-cyan-400 bg-cyan-500/80 text-slate-900 shadow-lcd'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10')
                  }
                >
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
