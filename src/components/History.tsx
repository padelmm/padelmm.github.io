import { useMemo } from 'react';
import { useSession } from '../lib/store';
import { scoreColor } from '../lib/score-color';
import type { Player, PlayerId } from '../lib/types';

function nameOf(id: PlayerId, players: readonly Player[]): string {
  return players.find((p) => p.id === id)?.name ?? '?';
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function History() {
  const players = useSession((s) => s.players);
  const rounds = useSession((s) => s.rounds);
  const target = useSession((s) => s.config.targetTotal);

  // Newest round at the top so the host scrolls back in time as they go down.
  const sorted = useMemo(() => rounds.slice().reverse(), [rounds]);

  const totalGames = useMemo(
    () =>
      rounds.reduce(
        (acc, r) => acc + r.games.filter((g) => g.recorded).length,
        0,
      ),
    [rounds],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
        <header>
          <h1 className="text-xl font-bold">History</h1>
        </header>
        <p className="glass rounded-2xl px-4 py-8 text-center text-sm text-slate-400">
          No rounds yet. Go to <span className="text-cyan-300">Round</span> and generate
          the first one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">History</h1>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">
          {rounds.length} round{rounds.length === 1 ? '' : 's'} · {totalGames} game
          {totalGames === 1 ? '' : 's'}
        </span>
      </header>

      <ol className="flex flex-col gap-3">
        {sorted.map((r, idx) => {
          const isCurrent = idx === 0;
          const recordedGames = r.games.filter((g) => g.recorded).length;
          return (
            <li
              key={r.id}
              className={
                'glass rounded-2xl p-3 ' +
                (isCurrent ? 'ring-1 ring-cyan-400/30' : '')
              }
            >
              <header className="mb-2 flex items-baseline justify-between">
                <h2 className="flex items-baseline gap-2 text-sm font-semibold">
                  <span>Round</span>
                  <span className="lcd-num text-base text-cyan-300">{r.number}</span>
                  {isCurrent && (
                    <span className="rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-500/30">
                      current
                    </span>
                  )}
                </h2>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  {formatTime(r.createdAt)} · {recordedGames}/{r.games.length}
                </span>
              </header>

              {r.restingPlayerIds.length > 0 && (
                <p className="mb-2 text-[11px] text-amber-300/80">
                  <span className="uppercase tracking-wider text-amber-300/60">
                    Resting
                  </span>{' '}
                  · {r.restingPlayerIds.map((id) => nameOf(id, players)).join(', ')}
                </p>
              )}

              <ul className="flex flex-col gap-1.5">
                {r.games.map((g) => (
                  <li
                    key={g.id}
                    className={
                      'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ' +
                      (g.recorded
                        ? 'border-emerald-400/20 bg-emerald-500/5'
                        : 'border-white/10 bg-white/5 opacity-70')
                    }
                  >
                    <span className="w-12 shrink-0 text-[10px] uppercase tracking-wider text-slate-400">
                      Court {g.court}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-cyan-200/90">
                          {g.teamA.playerIds.map((id) => nameOf(id, players)).join(' + ')}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-amber-200/90">
                          {g.teamB.playerIds.map((id) => nameOf(id, players)).join(' + ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {g.recorded ? (
                        <>
                          <span
                            className="lcd-num text-lg font-bold"
                            style={{ color: scoreColor(g.teamA.score, target) }}
                          >
                            {g.teamA.score}
                          </span>
                          <span className="text-slate-500">:</span>
                          <span
                            className="lcd-num text-lg font-bold"
                            style={{ color: scoreColor(g.teamB.score, target) }}
                          >
                            {g.teamB.score}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">
                          pending
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
