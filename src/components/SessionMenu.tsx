import { useState } from 'react';
import { useSession } from '../lib/store';
import { copyToClipboard, exportSession, importSession } from '../lib/share';

export default function SessionMenu() {
  const status = useSession((s) => s.status);
  const sessionState = useSession((s) => ({
    schemaVersion: s.schemaVersion,
    status: s.status,
    config: s.config,
    players: s.players,
    rounds: s.rounds,
    createdAt: s.createdAt,
  }));
  const newSession = useSession((s) => s.newSession);
  const finishSession = useSession((s) => s.finishSession);
  const replaceState = useSession((s) => s.replaceState);

  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [exportText, setExportText] = useState<string | null>(null);

  const onReset = () => {
    if (confirmReset) {
      newSession();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 4000);
    }
  };

  const onShare = async () => {
    const text = exportSession(sessionState);
    setExportText(text);
    const ok = await copyToClipboard(text);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 2500);
  };

  const onImport = () => {
    const result = importSession(importText);
    if (!result.ok || !result.state) {
      setImportMessage({ kind: 'err', text: result.error ?? 'Import failed.' });
      return;
    }
    replaceState(result.state);
    setImportMessage({ kind: 'ok', text: 'Session imported.' });
    setImportText('');
    setImportOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
      <header>
        <h1 className="text-xl font-bold">Session</h1>
        <p className="text-xs text-slate-400">Finish, reset, or share with another host.</p>
      </header>

      <section className="glass flex flex-col gap-2 rounded-2xl p-3">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Share</h2>
        <p className="text-xs text-slate-400">
          Copy the session text and paste it on another phone to continue from there.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onShare}
            className="flex-1 rounded-xl bg-cyan-500/90 px-3 py-3 text-sm font-semibold text-slate-900 shadow-lcd transition active:scale-95"
          >
            {copied ? '✓ Copied to clipboard' : 'Copy session'}
          </button>
          <button
            type="button"
            onClick={() => {
              setImportOpen((v) => !v);
              setImportMessage(null);
            }}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-medium text-slate-200 transition active:scale-95 hover:bg-white/10"
          >
            {importOpen ? 'Cancel import' : 'Import session'}
          </button>
        </div>

        {exportText && (
          <details className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <summary className="cursor-pointer text-xs text-slate-300">
              Show share code ({exportText.length} chars)
            </summary>
            <textarea
              readOnly
              value={exportText}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              rows={4}
              className="mt-2 w-full resize-none rounded-md bg-black/40 p-2 font-mono text-[10px] leading-tight text-slate-300"
            />
          </details>
        )}

        {importOpen && (
          <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste a PADELMM/v1/... share code here"
              rows={3}
              className="w-full resize-none rounded-md border border-white/10 bg-black/40 p-2 font-mono text-[11px] leading-tight text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={onImport}
              disabled={!importText.trim()}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700/60 disabled:text-slate-500"
            >
              Replace current session with this
            </button>
          </div>
        )}

        {importMessage && (
          <p
            className={
              'rounded-lg px-3 py-2 text-xs ' +
              (importMessage.kind === 'ok'
                ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30'
                : 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/30')
            }
          >
            {importMessage.text}
          </p>
        )}
      </section>

      {status === 'running' && (
        <button
          type="button"
          onClick={finishSession}
          className="glass w-full rounded-2xl px-4 py-4 text-sm font-medium text-slate-200 transition active:scale-[0.99]"
        >
          Finish session (keeps ranking visible)
        </button>
      )}

      <button
        type="button"
        onClick={onReset}
        className={
          'w-full rounded-2xl px-4 py-4 text-sm font-medium transition active:scale-[0.99] ' +
          (confirmReset
            ? 'bg-rose-500 text-slate-900 shadow-lcd-gold'
            : 'glass text-rose-300')
        }
      >
        {confirmReset ? 'Tap again to confirm — clears everything' : 'New mix & match (clear data)'}
      </button>

      <p className="glass rounded-xl px-3 py-3 text-[11px] text-slate-400">
        Everything is stored only on this phone. Nothing is uploaded. Use Share above to
        hand off mid-session.
      </p>
    </div>
  );
}
