import { useEffect, useMemo } from 'react';
import { useSession } from '../lib/store';
import { previewFinalRound } from '../lib/teams';
import type { Player, PlayerId } from '../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function nameOf(id: PlayerId, players: readonly Player[]): string {
  return players.find((p) => p.id === id)?.name ?? '?';
}

/**
 * Confirmation sheet for the final round. Shows the proposed pairings
 * (deterministically derived from the current ranking) so the host can
 * eyeball them before committing. Hitting "Start final" calls back into
 * the store to actually generate and append the round.
 */
export default function FinalRoundSheet({ open, onClose, onConfirm }: Props) {
  const players = useSession((s) => s.players);
  const rounds = useSession((s) => s.rounds);
  const config = useSession((s) => s.config);

  const preview = useMemo(
    () => (open ? previewFinalRound({ players, rounds, config }) : null),
    [open, players, rounds, config],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fade-in fixed inset-0 z-40 flex items-end justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="sheet-in glass-strong w-full max-w-md rounded-t-3xl px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-glass"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Final round preview"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="flex items-baseline gap-2 text-base font-semibold text-slate-100">
            <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-300 ring-1 ring-yellow-400/30">
              Final
            </span>
            <span>Preview</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 transition active:scale-95"
          >
            Cancel
          </button>
        </header>

        {preview ? (
          <>
            <p className="mb-3 text-[11px] text-slate-400">
              Top {preview.needed} of {preview.totalActive} active players, paired by
              ranking. Court 1 is the strongest court.
            </p>

            <ol className="mb-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {preview.courts.map((c) => (
                <li
                  key={c.court}
                  className="rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-3"
                >
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-300/80">
                      Court {c.court}
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500">
                      seeded
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2 py-1.5">
                      <div className="text-[9px] uppercase tracking-wider text-cyan-300/80">
                        Team A
                      </div>
                      <div className="mt-0.5 text-cyan-100">
                        {c.teamA.map((id) => nameOf(id, players)).join(' + ')}
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1.5">
                      <div className="text-[9px] uppercase tracking-wider text-amber-300/80">
                        Team B
                      </div>
                      <div className="mt-0.5 text-amber-100">
                        {c.teamB.map((id) => nameOf(id, players)).join(' + ')}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {preview.restingPlayerIds.length > 0 && (
              <p className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-amber-300/80">
                <span className="uppercase tracking-wider text-amber-300/60">
                  Sitting out
                </span>{' '}
                · {preview.restingPlayerIds.map((id) => nameOf(id, players)).join(', ')}
              </p>
            )}

            <button
              type="button"
              onClick={onConfirm}
              className="w-full rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 px-4 py-3 text-base font-bold text-slate-900 shadow-lcd-gold transition active:scale-[0.98]"
            >
              Start final round
            </button>
          </>
        ) : (
          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-slate-300">
            Not enough active players for a {config.maxCourts}-court final. Need{' '}
            {config.maxCourts * 4} active players.
          </p>
        )}
      </div>
    </div>
  );
}
