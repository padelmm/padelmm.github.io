import { useMemo, useState } from 'react';
import { useSession } from '../lib/store';
import type { Player, PlayerId, Round } from '../lib/types';
import MixAmericanoGenderBanner from './MixAmericanoGenderBanner';
import ScoreSlider from './ScoreSlider';
import PlayerSwapSheet from './PlayerSwapSheet';

function nameOf(id: PlayerId, players: readonly Player[]): string {
  return players.find((p) => p.id === id)?.name ?? '?';
}

export default function Play() {
  const players = useSession((s) => s.players);
  const rounds = useSession((s) => s.rounds);
  const config = useSession((s) => s.config);
  const reshuffleCurrentRound = useSession((s) => s.reshuffleCurrentRound);
  const setScore = useSession((s) => s.setScore);
  const recordGame = useSession((s) => s.recordGame);
  const unrecordGame = useSession((s) => s.unrecordGame);
  const swapPlayers = useSession((s) => s.swapPlayers);

  const currentRound: Round | undefined = rounds[rounds.length - 1];
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [swapFrom, setSwapFrom] = useState<PlayerId | null>(null);

  const restingNames = useMemo(() => {
    if (!currentRound) return [];
    return currentRound.restingPlayerIds
      .map((id) => players.find((p) => p.id === id)?.name)
      .filter((n): n is string => !!n);
  }, [currentRound, players]);

  const noneRecorded = currentRound ? currentRound.games.every((g) => !g.recorded) : false;

  const flash = (msg: string | null, error = false) => {
    const next = msg ? { text: msg, error } : null;
    setNotice(next);
    if (msg) {
      window.setTimeout(
        () => setNotice((curr) => (curr?.text === msg ? null : curr)),
        3500,
      );
    }
  };

  const onReshuffle = () => {
    const res = reshuffleCurrentRound();
    if (res.ok) flash('Teams re-shuffled.');
    else flash(res.message ?? 'Could not re-shuffle teams.', true);
  };

  const onChooseSwap = (toId: PlayerId) => {
    const fromId = swapFrom;
    setSwapFrom(null);
    if (!fromId) return;
    const res = swapPlayers(fromId, toId);
    if (!res.ok) {
      if (res.reason === 'recorded') flash('Cannot swap — score already saved on this court.');
      else flash('Swap failed.');
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-[calc(var(--bottom-dock-max)+0.75rem)] pt-4">
      <MixAmericanoGenderBanner />

      {notice && (
        <p
          className={
            'rounded-xl px-3 py-2 text-xs ' +
            (notice.error
              ? 'border border-amber-400/30 bg-amber-500/15 text-amber-100'
              : 'glass text-slate-200')
          }
          role="status"
        >
          {notice.text}
        </p>
      )}

      {currentRound ? (
        <>
          <header className="flex items-baseline justify-between">
            <h1 className="flex items-baseline gap-2 text-xl font-bold">
              <span>Round</span>
              <span className="lcd-num text-cyan-300">{currentRound.number}</span>
              {currentRound.kind === 'final' && (
                <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-300 ring-1 ring-yellow-400/30">
                  Final
                </span>
              )}
            </h1>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              Sum {config.targetTotal}
            </span>
          </header>

          {restingNames.length > 0 && (
            <p className="glass rounded-xl px-3 py-2 text-xs text-amber-200">
              <span className="uppercase tracking-wider text-amber-300/80">Resting</span>{' '}
              · {restingNames.join(', ')}
            </p>
          )}

          {noneRecorded && (
            <button
              type="button"
              onClick={onReshuffle}
              className="self-end rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition active:scale-95 hover:bg-white/10"
            >
              ⟳ Re-shuffle teams
            </button>
          )}

          <ul className="flex flex-col gap-3">
            {currentRound.games.map((g) => {
              const isRecorded = g.recorded;
              const isFinal = currentRound.kind === 'final';
              return (
                <li
                  key={g.id}
                  className={
                    'glass rounded-2xl p-3 transition ' +
                    (isRecorded
                      ? 'ring-1 ring-emerald-400/40'
                      : isFinal
                        ? 'ring-1 ring-yellow-400/30'
                        : '')
                  }
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Court {g.court}
                    </h2>
                    {isRecorded && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                        Saved
                      </span>
                    )}
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2 py-1.5">
                      <div className="text-[9px] uppercase tracking-wider text-cyan-300/80">
                        Team A
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {g.teamA.playerIds.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => !isRecorded && setSwapFrom(id)}
                            disabled={isRecorded}
                            className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-cyan-100 transition active:scale-95 disabled:opacity-70"
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
                            onClick={() => !isRecorded && setSwapFrom(id)}
                            disabled={isRecorded}
                            className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-100 transition active:scale-95 disabled:opacity-70"
                          >
                            {nameOf(id, players)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <ScoreSlider
                    target={config.targetTotal}
                    scoreA={g.teamA.score}
                    disabled={isRecorded}
                    onChange={(scoreA) => setScore(currentRound.id, g.id, scoreA)}
                  />

                  <div className="mt-2">
                    {isRecorded ? (
                      <button
                        type="button"
                        onClick={() => unrecordGame(currentRound.id, g.id)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition active:scale-[0.98]"
                      >
                        Edit score
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => recordGame(currentRound.id, g.id)}
                        className="w-full rounded-lg bg-emerald-500/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lcd-gold transition active:scale-[0.98]"
                      >
                        Save score
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {restingNames.length > 0 && (
            <p className="text-center text-[10px] text-slate-500">
              Tap any player name to swap them with anyone, including resting players.
            </p>
          )}
        </>
      ) : (
        <div className="glass rounded-2xl p-6 text-center">
          <h1 className="text-lg font-bold">Ready to play</h1>
          <p className="mt-1 text-sm text-slate-400">
            Tap the button below to draw teams for the first round.
          </p>
        </div>
      )}

      <PlayerSwapSheet
        open={swapFrom !== null}
        fromPlayerId={swapFrom}
        onClose={() => setSwapFrom(null)}
        onSwap={onChooseSwap}
      />
    </div>
  );
}
