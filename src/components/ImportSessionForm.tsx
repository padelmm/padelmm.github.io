import { useCallback, useState } from 'react';
import { useSession } from '../lib/store';
import { importSession } from '../lib/share';
import QrScanModal from './QrScanModal';

interface Props {
  /**
   * Called after a share code is successfully imported and applied.
   * Use it to dismiss containing UI (e.g. collapse a toggle).
   * Note: when imported state has status='running' or 'finished',
   * the surrounding app may already navigate away on its own.
   */
  onImported?: () => void;
}

type Message =
  | { kind: 'ok'; text: string }
  | { kind: 'err'; text: string }
  | { kind: 'partial'; text: string };

/**
 * Extract a share code from whatever the QR scanner produced.
 * The in-app generator encodes a deep-link URL containing `#import=...`,
 * but we also accept bare `PADELMM/v?/...` codes in case the user scans
 * a QR that wasn't produced by this app.
 */
function extractShareCode(scanned: string): string {
  const trimmed = scanned.trim();
  const hashIdx = trimmed.indexOf('#import=');
  if (hashIdx >= 0) {
    try {
      return decodeURIComponent(trimmed.slice(hashIdx + '#import='.length));
    } catch {
      return trimmed.slice(hashIdx + '#import='.length);
    }
  }
  return trimmed;
}

/**
 * Self-contained "paste share code + Replace" form. Used both on
 * the Setup screen (so a new host can resume someone else's session
 * before adding players) and on the in-session Session menu.
 */
export default function ImportSessionForm({ onImported }: Props) {
  const replaceState = useSession((s) => s.replaceState);
  const [text, setText] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  // Apply a share code (from textarea or scan). Returns true on success.
  const applyCode = useCallback(
    async (raw: string) => {
      setBusy(true);
      try {
        const result = await importSession(raw);
        if (result.partial) {
          const { have, total, missing } = result.partial;
          setMessage({
            kind: 'partial',
            text: `Got ${have} of ${total} parts. Still need part${missing.length === 1 ? '' : 's'} ${missing.join(', ')}. Paste the missing message(s) and try again.`,
          });
          return false;
        }
        if (!result.ok || !result.state) {
          setMessage({ kind: 'err', text: result.error ?? 'Import failed.' });
          return false;
        }
        replaceState(result.state);
        setMessage({ kind: 'ok', text: 'Session imported.' });
        setText('');
        onImported?.();
        return true;
      } finally {
        setBusy(false);
      }
    },
    [replaceState, onImported],
  );

  const onSubmit = () => {
    void applyCode(text);
  };

  const onScanResult = useCallback(
    (scanned: string) => {
      setScanOpen(false);
      const code = extractShareCode(scanned);
      setText(code);
      void applyCode(code);
    },
    [applyCode],
  );

  const messageClass =
    message?.kind === 'ok'
      ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30'
      : message?.kind === 'partial'
        ? 'bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30'
        : 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/30';

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
      <button
        type="button"
        onClick={() => setScanOpen(true)}
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500/90 px-3 py-3 text-xs font-semibold text-slate-900 shadow-lcd transition active:scale-95 disabled:opacity-50"
      >
        <span aria-hidden>📷</span>
        <span>Scan QR with camera</span>
      </button>
      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-slate-500">
        or paste below
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a share code (PADELMM/v2/...). If it was split into parts, paste them all here — any order."
        rows={4}
        className="w-full resize-none rounded-md border border-white/10 bg-black/40 p-2 font-mono text-[11px] leading-tight text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!text.trim() || busy}
        className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700/60 disabled:text-slate-500"
      >
        {busy ? 'Importing…' : 'Replace current session with this'}
      </button>
      {message && (
        <p className={'rounded-lg px-3 py-2 text-xs ' + messageClass}>{message.text}</p>
      )}

      {scanOpen && (
        <QrScanModal onResult={onScanResult} onClose={() => setScanOpen(false)} />
      )}
    </div>
  );
}
