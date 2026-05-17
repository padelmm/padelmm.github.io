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

  return (
    <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
      <header>
        <h1 className="text-xl font-bold">Players</h1>
        <p className="text-sm text-slate-400">
          Pause someone to skip them in next rounds. Unpause when they return.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-2 rounded-2xl bg-court-panel/70 p-3 ring-1 ring-court-line"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-medium text-slate-100">{p.name}</span>
              <span
                className={
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ' +
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
                    'rounded-lg px-2 py-2 text-xs font-medium ring-1 transition active:scale-95 ' +
                    (p.status === s
                      ? 'bg-cyan-500 text-slate-900 ring-cyan-400'
                      : 'bg-slate-900 text-slate-300 ring-court-line hover:bg-slate-800')
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
