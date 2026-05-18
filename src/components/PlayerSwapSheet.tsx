import { useEffect } from 'react';
import { useSession } from '../lib/store';
import type { PlayerId } from '../lib/types';

interface Props {
  open: boolean;
  fromPlayerId: PlayerId | null;
  onClose: () => void;
  onSwap: (toPlayerId: PlayerId) => void;
  /**
   * Which round's positions to show under each candidate. Defaults to
   * the current (last) round — used by the Round tab. The History tab
   * passes a specific round id so the positions match that round.
   */
  roundId?: string;
}

export default function PlayerSwapSheet({ open, fromPlayerId, onClose, onSwap, roundId }: Props) {
  const players = useSession((s) => s.players);
  const rounds = useSession((s) => s.rounds);
  const current = roundId
    ? rounds.find((r) => r.id === roundId)
    : rounds[rounds.length - 1];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !fromPlayerId) return null;

  const fromPlayer = players.find((p) => p.id === fromPlayerId);

  // Build a position label for each player (which court / team, or resting).
  const positionFor = (id: PlayerId): string => {
    if (!current) return '';
    if (current.restingPlayerIds.includes(id)) return 'resting';
    for (const g of current.games) {
      if (g.teamA.playerIds.includes(id)) return `Court ${g.court} · Team A`;
      if (g.teamB.playerIds.includes(id)) return `Court ${g.court} · Team B`;
    }
    return '';
  };

  const candidates = players.filter((p) => p.id !== fromPlayerId);

  return (
    <div
      className="fade-in fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="sheet-in glass-strong w-full max-w-md rounded-t-3xl px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-glass"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Swap player"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            Swap <span className="text-cyan-300">{fromPlayer?.name ?? 'player'}</span> with…
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 transition active:scale-95"
          >
            Cancel
          </button>
        </header>

        <ul className="max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {candidates.map((p) => {
            const pos = positionFor(p.id);
            const isResting = pos === 'resting';
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSwap(p.id)}
                  className="mb-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition active:scale-[0.99] hover:bg-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-medium text-slate-100">{p.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
                      {pos && <span>{pos}</span>}
                      {p.status === 'paused' && (
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-amber-300">
                          paused
                        </span>
                      )}
                      {p.status === 'left' && (
                        <span className="rounded-full bg-slate-700/40 px-1.5 py-0.5 text-slate-400">
                          left
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ' +
                      (isResting
                        ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                        : 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30')
                    }
                  >
                    {isResting ? 'in' : 'swap'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
