import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../lib/store';
import { APP_DEFAULTS } from '../lib/defaults';
import type { PlayerId } from '../lib/types';
import ScoreSlider from './ScoreSlider';

interface Props {
  /** Round to append the manual game to. */
  roundId: string | null;
  onClose: () => void;
  /**
   * Notification callback for the host. Empty string means success
   * with no further message; a non-empty string is a human-readable
   * error to flash on the History view.
   */
  onResult: (message: string) => void;
}

/**
 * Bottom sheet for retroactively recording a game that wasn't part of
 * the auto-generated draw — e.g. a side-court played by two foursomes
 * after the official round wrapped, or a game logged on another
 * phone before the host got around to importing the session.
 *
 * Picks four distinct players (any two per team), an A-team score
 * inside the configured target total, and commits via the store's
 * `addGameToRound` action. The new game is marked `recorded: true`
 * so it contributes to stats immediately.
 */
export default function AddGameSheet({ roundId, onClose, onResult }: Props) {
  const players = useSession((s) => s.players);
  const rounds = useSession((s) => s.rounds);
  const config = useSession((s) => s.config);
  const addGameToRound = useSession((s) => s.addGameToRound);

  const round = roundId ? rounds.find((r) => r.id === roundId) ?? null : null;

  // Reset internal form state whenever the sheet is freshly opened
  // for a different round. We intentionally key the reset on
  // `roundId` rather than mounting/unmounting so the closing slide
  // animation can keep showing the prior selection.
  const [teamA, setTeamA] = useState<PlayerId[]>([]);
  const [teamB, setTeamB] = useState<PlayerId[]>([]);
  const [scoreA, setScoreA] = useState<number>(() =>
    Math.round(config.targetTotal * APP_DEFAULTS.manualGameInitialSplitRatio),
  );

  useEffect(() => {
    setTeamA([]);
    setTeamB([]);
    setScoreA(
      Math.round(config.targetTotal * APP_DEFAULTS.manualGameInitialSplitRatio),
    );
  }, [roundId, config.targetTotal]);

  useEffect(() => {
    if (!roundId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [roundId, onClose]);

  const eligiblePlayers = useMemo(
    // Only active players — paused or left players cannot be added
    // to a new game record. Hosts who need to retroactively log a
    // game for a now-paused player can flip them back to active in
    // the Players tab first.
    () => players.filter((p) => p.status === 'active'),
    [players],
  );

  if (!roundId || !round) return null;

  const inTeamA = (id: PlayerId) => teamA.includes(id);
  const inTeamB = (id: PlayerId) => teamB.includes(id);

  /**
   * Toggle a player into / out of a given team. Enforces:
   *  - max 2 players per team (extras silently rejected, slot index
   *    indicator informs the host)
   *  - mutual exclusion with the other team (selecting in A removes
   *    from B and vice versa, so the host can fix a mis-tap without
   *    backtracking)
   */
  const togglePlayer = (id: PlayerId, team: 'A' | 'B') => {
    if (team === 'A') {
      if (inTeamA(id)) {
        setTeamA((cur) => cur.filter((p) => p !== id));
        return;
      }
      if (teamA.length >= 2) return;
      setTeamA((cur) => [...cur, id]);
      setTeamB((cur) => cur.filter((p) => p !== id));
    } else {
      if (inTeamB(id)) {
        setTeamB((cur) => cur.filter((p) => p !== id));
        return;
      }
      if (teamB.length >= 2) return;
      setTeamB((cur) => [...cur, id]);
      setTeamA((cur) => cur.filter((p) => p !== id));
    }
  };

  const canSave = teamA.length === 2 && teamB.length === 2;

  const onSave = () => {
    if (!canSave) return;
    const res = addGameToRound(roundId, {
      teamA: [teamA[0] as PlayerId, teamA[1] as PlayerId],
      teamB: [teamB[0] as PlayerId, teamB[1] as PlayerId],
      scoreA,
    });
    if (!res.ok) {
      const message =
        res.reason === 'duplicate-player'
          ? 'Each player can only be on one team.'
          : res.reason === 'invalid-score'
            ? 'Score is outside the configured range.'
            : 'Round no longer exists — refresh and try again.';
      onResult(message);
      return;
    }
    onResult('');
    onClose();
  };

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
        aria-label={`Add game to round ${round.number}`}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="flex items-baseline gap-2 text-base font-semibold text-slate-100">
            <span>Add game to</span>
            <span className="text-cyan-300">round {round.number}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 transition active:scale-95"
          >
            Cancel
          </button>
        </header>

        <div className="flex flex-col gap-3">
          <p className="text-[11px] text-slate-400">
            Pick 2 players per team, then set the score. The new game
            is saved immediately and counts toward ranking.
          </p>

          {/* Team selectors. Two near-identical groups; the colour
              tokens follow the same cyan / amber split used on the
              live Round screen so muscle memory transfers. */}
          {(['A', 'B'] as const).map((team) => {
            const list = team === 'A' ? teamA : teamB;
            const ring =
              team === 'A'
                ? 'border-cyan-400/30 bg-cyan-500/10'
                : 'border-amber-400/30 bg-amber-500/10';
            const chipActive =
              team === 'A'
                ? 'bg-cyan-500/80 text-slate-900 shadow-lcd'
                : 'bg-amber-500/80 text-slate-900 shadow-lcd-gold';
            const labelColour =
              team === 'A' ? 'text-cyan-300/80' : 'text-amber-300/80';
            return (
              <div key={team} className={'rounded-xl border px-2 py-2 ' + ring}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span
                    className={
                      'text-[10px] font-semibold uppercase tracking-[0.2em] ' +
                      labelColour
                    }
                  >
                    Team {team}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    {list.length} / 2
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {eligiblePlayers.map((p) => {
                    const selected = list.includes(p.id);
                    const onOther =
                      team === 'A' ? inTeamB(p.id) : inTeamA(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlayer(p.id, team)}
                        className={
                          'rounded-md px-2 py-1 text-xs font-medium transition active:scale-95 ' +
                          (selected
                            ? chipActive
                            : onOther
                              ? 'border border-white/5 bg-white/5 text-slate-500'
                              : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10')
                        }
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Score slider. Same component as the Round tab so the
              colour gradient + LCD digits stay consistent. */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Score
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                sum {config.targetTotal}
              </span>
            </div>
            <ScoreSlider
              target={config.targetTotal}
              scoreA={scoreA}
              onChange={(next) => setScoreA(next)}
            />
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lcd-gold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-700/60 disabled:text-slate-500 disabled:shadow-none"
          >
            {canSave
              ? 'Save game'
              : `Pick ${4 - teamA.length - teamB.length} more player${
                  4 - teamA.length - teamB.length === 1 ? '' : 's'
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}
