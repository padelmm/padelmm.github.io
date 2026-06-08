import { useState } from 'react';
import { activePlayersMissingGender, isMixAmericano } from '../lib/mix-americano';
import { useSession } from '../lib/store';

/**
 * Round-tab bottom chrome: either a real CTA button or a compact hint
 * strip. Stacked directly above the tab nav in App.tsx so there is no
 * positioning gap across iPhone / Android screen sizes.
 */
export default function PlayBottomBar() {
  const rounds = useSession((s) => s.rounds);
  const players = useSession((s) => s.players);
  const config = useSession((s) => s.config);
  const generateNextRound = useSession((s) => s.generateNextRound);
  const [error, setError] = useState<string | null>(null);

  const currentRound = rounds[rounds.length - 1];
  const totalGames = currentRound?.games.length ?? 0;
  const recordedCount = currentRound?.games.filter((g) => g.recorded).length ?? 0;
  const allRecorded =
    totalGames > 0 && currentRound!.games.every((g) => g.recorded);
  const waitingOnScores = !!currentRound && !allRecorded;
  const missingGender = isMixAmericano(config) ? activePlayersMissingGender(players) : [];

  const onGenerate = () => {
    const res = generateNextRound();
    if (!res.ok) {
      setError(res.message ?? 'Could not generate round.');
      window.setTimeout(() => setError(null), 5000);
    } else {
      setError(null);
    }
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

  if (missingGender.length > 0) {
    const names = missingGender.map((p) => p.name).join(', ');
    return (
      <div className="px-4 py-2.5 text-center" role="status">
        <p className="text-xs font-semibold text-amber-200">Set gender (M/F) first</p>
        <p className="mt-0.5 text-[10px] text-amber-100/90">{names}</p>
        <p className="mt-1 text-[10px] text-slate-500">Players tab — round cannot generate yet</p>
      </div>
    );
  }

  const label = currentRound ? 'Generate next round' : 'Generate first round';

  return (
    <div className="px-4 py-2.5">
      {error && (
        <p className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/15 px-2 py-1.5 text-center text-[11px] text-amber-100">
          {error}
        </p>
      )}
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
