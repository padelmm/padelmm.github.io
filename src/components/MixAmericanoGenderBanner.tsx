import { useSession } from '../lib/store';
import { activePlayersMissingGender, isMixAmericano } from '../lib/mix-americano';

interface Props {
  /** When set, only warn if these players are in the missing list (e.g. Players tab). */
  emphasizePlayerId?: string;
}

/**
 * Persistent amber banner when Mix Americano is on but active players
 * lack gender. Shown on Round and Players so hosts notice before tapping
 * Generate / Re-shuffle (which would otherwise fail quietly).
 */
export default function MixAmericanoGenderBanner({ emphasizePlayerId }: Props) {
  const config = useSession((s) => s.config);
  const players = useSession((s) => s.players);

  if (!isMixAmericano(config)) return null;

  const missing = activePlayersMissingGender(players);
  if (missing.length === 0) return null;

  const names = missing.map((p) => p.name).join(', ');

  return (
    <div
      className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-2.5"
      role="status"
    >
      <p className="text-xs font-semibold text-amber-200">
        Mix Americano — gender missing
      </p>
      <p className="mt-0.5 text-[11px] text-amber-100/90">
        Set <span className="font-medium">M</span> or{' '}
        <span className="font-medium">F</span> for: {names}
      </p>
      <p className="mt-1 text-[10px] text-slate-400">
        {emphasizePlayerId
          ? 'Tap M or F on each highlighted player below.'
          : 'Players tab → set gender. Generate round and re-shuffle stay blocked until fixed.'}
      </p>
    </div>
  );
}
