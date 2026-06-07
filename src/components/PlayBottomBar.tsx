import { useSession } from '../lib/store';

/**
 * Round-tab bottom chrome: either a real CTA button or a compact hint
 * strip. Stacked directly above the tab nav in App.tsx so there is no
 * positioning gap across iPhone / Android screen sizes.
 */
export default function PlayBottomBar() {
  const rounds = useSession((s) => s.rounds);
  const generateNextRound = useSession((s) => s.generateNextRound);

  const currentRound = rounds[rounds.length - 1];
  const totalGames = currentRound?.games.length ?? 0;
  const recordedCount = currentRound?.games.filter((g) => g.recorded).length ?? 0;
  const allRecorded =
    totalGames > 0 && currentRound!.games.every((g) => g.recorded);
  const waitingOnScores = !!currentRound && !allRecorded;

  const onGenerate = () => {
    generateNextRound();
  };

  if (waitingOnScores) {
    return (
      <div className="px-4 py-2 text-center">
        <p className="text-xs text-slate-400">Save all court scores to continue</p>
        <p className="text-[10px] text-slate-500">
          {recordedCount} of {totalGames} saved
        </p>
      </div>
    );
  }

  const label = currentRound ? 'Generate next round' : 'Generate first round';

  return (
    <div className="px-4 py-2.5">
      <button
        type="button"
        onClick={onGenerate}
        className="w-full rounded-xl bg-cyan-500/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lcd transition active:scale-95"
      >
        {label}
      </button>
    </div>
  );
}
