import { useEffect, useRef, useState } from 'react';
import { isDuplicatePlayerName } from '../lib/players';
import { useSession } from '../lib/store';
import type { PlayerId } from '../lib/types';

interface Props {
  playerId: PlayerId;
  name: string;
  className: string;
  'aria-label'?: string;
}

/**
 * Draft-then-commit name field. Typing never writes the store (so the
 * roster does not re-sort and focus stays). Commit on blur / Enter only
 * when the name is non-empty and unique; duplicates keep focus.
 */
export default function PlayerNameField({
  playerId,
  name,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const players = useSession((s) => s.players);
  const renamePlayer = useSession((s) => s.renamePlayer);
  const [draft, setDraft] = useState(name);
  const focusedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusedRef.current) setDraft(name);
  }, [name]);

  const trimmed = draft.trim();
  const duplicate =
    trimmed.length > 0 && isDuplicatePlayerName(players, trimmed, playerId);

  const commit = (): boolean => {
    if (trimmed.length === 0) {
      setDraft(name);
      return true;
    }
    if (duplicate) return false;
    const res = renamePlayer(playerId, trimmed);
    if (!res.ok && res.reason === 'duplicate') return false;
    return true;
  };

  return (
    <div className="min-w-0 flex-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoCapitalize="words"
        autoComplete="off"
        value={draft}
        maxLength={24}
        aria-label={ariaLabel}
        aria-invalid={duplicate}
        className={className}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          const ok = commit();
          if (!ok) {
            focusedRef.current = true;
            window.requestAnimationFrame(() => inputRef.current?.focus());
            return;
          }
          focusedRef.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(name);
            focusedRef.current = false;
            e.currentTarget.blur();
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            const ok = commit();
            if (ok) {
              focusedRef.current = false;
              e.currentTarget.blur();
            }
          }
        }}
      />
      {duplicate && (
        <p className="mt-1 text-[11px] text-amber-300">Name already in the list.</p>
      )}
    </div>
  );
}
