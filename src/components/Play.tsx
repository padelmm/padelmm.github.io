import { useMemo, useState } from 'react';
import { useSession } from '../lib/store';
import type { Player, PlayerId, Round } from '../lib/types';
import ScoreSlider from './ScoreSlider';

function namesOf(ids: readonly PlayerId[], players: readonly Player[]): string {
  return ids
    .map((id) => players.find((p) => p.id === id)?.name ?? '?')
    .join(' + ');
}

export default function Play() {
  const players = useSession((s) => s.players);
  const rounds = useSession((s) => s.rounds);
  const config = useSession((s) => s.config);
  const generateNextRound = useSession((s) => s.generateNextRound);
  const setScore = useSession((s) => s.setScore);
  const recordGame = useSession((s) => s.recordGame);
  const unrecordGame = useSession((s) => s.unrecordGame);

  const currentRound: Round | undefined = rounds[rounds.length - 1];
  const [notice, setNotice] = useState<string | null>(null);

  const restingNames = useMemo(() => {
    if (!currentRound) return [];
    return currentRound.restingPlayerIds
      .map((id) => players.find((p) => p.id === id)?.name)
      .filter((n): n is string => !!n);
  }, [currentRound, players]);

  const allRecorded = currentRound
    ? currentRound.games.length > 0 && currentRound.games.every((g) => g.recorded)
    : false;

  const onGenerate = () => {
    const res = generateNextRound();
    setNotice(res.message ?? null);
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-32 pt-4">
      {currentRound ? (
        <>
          <header className="flex items-baseline justify-between">
            <h1 className="text-xl font-bold">Round {currentRound.number}</h1>
            <span className="text-xs text-slate-400">
              Target: {config.targetTotal} pts
            </span>
          </header>

          {restingNames.length > 0 && (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-500/30">
              Resting this round: {restingNames.join(', ')}
            </p>
          )}

          <ul className="flex flex-col gap-4">
            {currentRound.games.map((g) => {
              const isRecorded = g.recorded;
              return (
                <li
                  key={g.id}
                  className={
                    'rounded-2xl p-4 ring-1 transition ' +
                    (isRecorded
                      ? 'bg-emerald-500/5 ring-emerald-500/30'
                      : 'bg-court-panel/70 ring-court-line')
                  }
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                      Court {g.court}
                    </h2>
                    {isRecorded && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                        Recorded
                      </span>
                    )}
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-cyan-500/10 px-3 py-2 text-cyan-100">
                      <div className="text-[10px] uppercase tracking-wider text-cyan-300">Team A</div>
                      <div className="font-medium leading-tight">
                        {namesOf(g.teamA.playerIds, players)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-orange-500/10 px-3 py-2 text-orange-100">
                      <div className="text-[10px] uppercase tracking-wider text-orange-300">Team B</div>
                      <div className="font-medium leading-tight">
                        {namesOf(g.teamB.playerIds, players)}
                      </div>
                    </div>
                  </div>

                  <ScoreSlider
                    target={config.targetTotal}
                    scoreA={g.teamA.score}
                    disabled={isRecorded}
                    onChange={(scoreA) => setScore(currentRound.id, g.id, scoreA)}
                  />

                  <div className="mt-3">
                    {isRecorded ? (
                      <button
                        type="button"
                        onClick={() => unrecordGame(currentRound.id, g.id)}
                        className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 ring-1 ring-court-line transition active:scale-[0.98]"
                      >
                        Edit score
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => recordGame(currentRound.id, g.id)}
                        className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-900 transition active:scale-[0.98]"
                      >
                        Save score
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="rounded-2xl bg-court-panel/70 p-6 text-center ring-1 ring-court-line">
          <h1 className="text-xl font-bold">Ready to play</h1>
          <p className="mt-1 text-sm text-slate-400">
            Tap the button below to draw teams for the first round.
          </p>
        </div>
      )}

      {notice && (
        <p className="rounded-xl bg-slate-900/70 px-3 py-2 text-xs text-slate-300 ring-1 ring-court-line">
          {notice}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-court-line bg-court-bg/95 px-4 pb-3 pt-3 backdrop-blur">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!!currentRound && !allRecorded}
          className="w-full rounded-xl bg-cyan-500 px-4 py-4 text-base font-semibold text-slate-900 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          {currentRound
            ? allRecorded
              ? 'Generate next round'
              : 'Finish all scores to continue'
            : 'Generate first round'}
        </button>
      </div>
    </div>
  );
}
