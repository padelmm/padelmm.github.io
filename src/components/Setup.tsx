import { useState } from 'react';
import { useSession } from '../lib/store';

export default function Setup() {
  const players = useSession((s) => s.players);
  const config = useSession((s) => s.config);
  const addPlayer = useSession((s) => s.addPlayer);
  const removePlayer = useSession((s) => s.removePlayer);
  const renamePlayer = useSession((s) => s.renamePlayer);
  const startSession = useSession((s) => s.startSession);
  const setConfig = useSession((s) => s.setConfig);

  const [name, setName] = useState('');
  const trimmed = name.trim();
  const duplicate = players.some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase() && trimmed.length > 0,
  );
  const canAdd = trimmed.length > 0 && !duplicate && players.length < 16;
  const canStart = players.length >= 4;

  const submit = () => {
    if (!canAdd) return;
    addPlayer(trimmed);
    setName('');
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-32 pt-4">
      <header>
        <h1 className="text-2xl font-bold">Padel Mix &amp; Match</h1>
        <p className="text-sm text-slate-400">
          Add 4 to 16 players, then start the session.
        </p>
      </header>

      <section className="rounded-2xl bg-court-panel/70 p-4 ring-1 ring-court-line">
        <label className="block text-sm font-medium text-slate-300" htmlFor="player-name">
          Add player
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="player-name"
            type="text"
            inputMode="text"
            autoCapitalize="words"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Name"
            maxLength={24}
            className="min-w-0 flex-1 rounded-xl bg-slate-900 px-4 py-3 text-base text-slate-100 ring-1 ring-court-line placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canAdd}
            className="rounded-xl bg-cyan-500 px-5 py-3 text-base font-semibold text-slate-900 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            Add
          </button>
        </div>
        {duplicate && trimmed.length > 0 && (
          <p className="mt-2 text-xs text-amber-400">A player with that name is already in the list.</p>
        )}
        {players.length >= 16 && (
          <p className="mt-2 text-xs text-amber-400">Maximum is 16 players.</p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Players</h2>
          <span className="text-xs text-slate-400">
            {players.length} / 16 ({Math.min(config.maxCourts, Math.floor(players.length / 4))}{' '}
            courts max)
          </span>
        </div>
        {players.length === 0 ? (
          <p className="rounded-2xl bg-court-panel/40 px-4 py-6 text-center text-sm text-slate-400">
            No players yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-2xl bg-court-panel/70 px-3 py-2 ring-1 ring-court-line"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-300">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => renamePlayer(p.id, e.target.value)}
                  maxLength={24}
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-base text-slate-100 focus:bg-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removePlayer(p.id)}
                  className="rounded-lg px-3 py-2 text-sm text-rose-300 transition active:scale-95 hover:bg-rose-500/10"
                  aria-label={`Remove ${p.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-court-panel/70 p-4 ring-1 ring-court-line">
        <h2 className="text-sm font-semibold text-slate-300">Settings</h2>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">
            Avoid pairing the same partners in two consecutive rounds
          </span>
          <input
            type="checkbox"
            checked={config.avoidImmediateRepeat}
            onChange={(e) => setConfig({ avoidImmediateRepeat: e.target.checked })}
            className="h-5 w-5 accent-cyan-500"
          />
        </label>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>Max courts</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setConfig({ maxCourts: n })}
                className={
                  'h-9 w-10 rounded-lg text-sm font-medium ring-1 transition ' +
                  (config.maxCourts === n
                    ? 'bg-cyan-500 text-slate-900 ring-cyan-400'
                    : 'bg-slate-900 text-slate-300 ring-court-line hover:bg-slate-800')
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-court-line bg-court-bg/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur">
        <button
          type="button"
          disabled={!canStart}
          onClick={startSession}
          className="w-full rounded-xl bg-emerald-500 px-4 py-4 text-base font-semibold text-slate-900 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          {canStart
            ? `Start session (${players.length} players)`
            : `Add ${4 - players.length} more player${4 - players.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
