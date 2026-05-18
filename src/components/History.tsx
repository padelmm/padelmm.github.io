import { useMemo, useState } from 'react';
import { useSession } from '../lib/store';
import { scoreColor } from '../lib/score-color';
import type { Player, PlayerId } from '../lib/types';
import ScoreSlider from './ScoreSlider';
import PlayerSwapSheet from './PlayerSwapSheet';

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
  const setScore = useSession((s) => s.setScore);
  const swapPlayers = useSession((s) => s.swapPlayers);
  const deleteGame = useSession((s) => s.deleteGame);

  const sorted = useMemo(() => rounds.slice().reverse(), [rounds]);

  const totalGames = useMemo(
    () =>
      rounds.reduce(
        (acc, r) => acc + r.games.filter((g) => g.recorded).length,
        0,
      ),
    [rounds],
  );

  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [swapCtx, setSwapCtx] = useState<{ roundId: string; fromPlayerId: PlayerId } | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (msg: string | null) => {
    setNotice(msg);
    if (msg) window.setTimeout(() => setNotice((curr) => (curr === msg ? null : curr)), 3500);
  };

  const askDelete = (gameId: string) => {
    if (confirmDeleteId === gameId) {
      const round = rounds.find((r) => r.games.some((g) => g.id === gameId));
      if (round) deleteGame(round.id, gameId);
      setConfirmDeleteId(null);
      if (editingGameId === gameId) setEditingGameId(null);
      return;
    }
    setConfirmDeleteId(gameId);
    window.setTimeout(
      () => setConfirmDeleteId((curr) => (curr === gameId ? null : curr)),
      3500,
    );
  };

  const onSwapChosen = (toPlayerId: PlayerId) => {
    if (!swapCtx) return;
    const { roundId, fromPlayerId } = swapCtx;
    setSwapCtx(null);
    const res = swapPlayers(fromPlayerId, toPlayerId, { roundId, allowRecorded: true });
    if (!res.ok) {
      flash(
        res.reason === 'same'
          ? 'Pick a different player.'
          : res.reason === 'not-found'
            ? 'Player no longer in this round.'
            : 'Swap failed.',
      );
    }
  };

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

      {notice && (
        <p className="glass rounded-xl px-3 py-2 text-xs text-slate-200">{notice}</p>
      )}

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

              {r.games.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] italic text-slate-500">
                  No games in this round.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {r.games.map((g) => {
                    const isEditing = editingGameId === g.id;
                    const isConfirmingDelete = confirmDeleteId === g.id;
                    return (
                      <li
                        key={g.id}
                        className={
                          'rounded-lg border px-2 py-1.5 text-xs ' +
                          (g.recorded
                            ? 'border-emerald-400/20 bg-emerald-500/5'
                            : 'border-white/10 bg-white/5 opacity-80') +
                          (isEditing ? ' ring-1 ring-cyan-400/40' : '')
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-12 shrink-0 text-[10px] uppercase tracking-wider text-slate-400">
                            Court {g.court}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="truncate text-cyan-200/90">
                                {g.teamA.playerIds
                                  .map((id) => nameOf(id, players))
                                  .join(' + ')}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="truncate text-amber-200/90">
                                {g.teamB.playerIds
                                  .map((id) => nameOf(id, players))
                                  .join(' + ')}
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
                          <div className="ml-1 flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingGameId((curr) => (curr === g.id ? null : g.id))
                              }
                              aria-label={isEditing ? 'Close editor' : 'Edit game'}
                              className={
                                'rounded-md px-2 py-1 text-[11px] transition active:scale-95 ' +
                                (isEditing
                                  ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                                  : 'text-slate-400 hover:bg-white/10 hover:text-slate-200')
                              }
                            >
                              {isEditing ? 'Done' : '✎'}
                            </button>
                            <button
                              type="button"
                              onClick={() => askDelete(g.id)}
                              aria-label={
                                isConfirmingDelete ? 'Confirm delete' : 'Delete game'
                              }
                              className={
                                'rounded-md px-2 py-1 text-[11px] transition active:scale-95 ' +
                                (isConfirmingDelete
                                  ? 'bg-rose-500 text-slate-900'
                                  : 'text-slate-400 hover:bg-rose-500/15 hover:text-rose-300')
                              }
                            >
                              {isConfirmingDelete ? 'Sure?' : '🗑'}
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2 py-1.5">
                                <div className="text-[9px] uppercase tracking-wider text-cyan-300/80">
                                  Team A
                                </div>
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {g.teamA.playerIds.map((id) => (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() =>
                                        setSwapCtx({ roundId: r.id, fromPlayerId: id })
                                      }
                                      className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-cyan-100 transition active:scale-95"
                                    >
                                      {nameOf(id, players)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1.5">
                                <div className="text-[9px] uppercase tracking-wider text-amber-300/80">
                                  Team B
                                </div>
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {g.teamB.playerIds.map((id) => (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() =>
                                        setSwapCtx({ roundId: r.id, fromPlayerId: id })
                                      }
                                      className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-100 transition active:scale-95"
                                    >
                                      {nameOf(id, players)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <ScoreSlider
                              target={target}
                              scoreA={g.teamA.score}
                              onChange={(scoreA) => setScore(r.id, g.id, scoreA)}
                            />

                            <p className="text-center text-[10px] text-slate-500">
                              Tap a player to swap with anyone in the session. Score
                              changes save instantly.
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <PlayerSwapSheet
        open={swapCtx !== null}
        fromPlayerId={swapCtx?.fromPlayerId ?? null}
        roundId={swapCtx?.roundId}
        onClose={() => setSwapCtx(null)}
        onSwap={onSwapChosen}
      />
    </div>
  );
}
