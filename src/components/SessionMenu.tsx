import { useState } from 'react';
import { useSession } from '../lib/store';
import { copyToClipboard, exportSession, type ExportResult } from '../lib/share';
import { usePwa } from '../lib/pwa';
import ImportSessionForm from './ImportSessionForm';
import Splash from './Splash';

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
  const clearGames = useSession((s) => s.clearGames);
  const { forceReload } = usePwa();

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copied, setCopied] = useState<'none' | 'all' | number>('none');
  const [importOpen, setImportOpen] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const onReload = async () => {
    setReloading(true);
    await forceReload();
    // If `forceReload` returns without actually reloading (shouldn't
    // happen, but a paranoid guard), reset the UI state.
    setReloading(false);
  };

  const onReset = () => {
    if (confirmReset) {
      newSession();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 4000);
    }
  };

  const onClearGames = () => {
    if (confirmClear) {
      clearGames();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 4000);
    }
  };

  const onShare = async () => {
    setBusy(true);
    try {
      const result = await exportSession(sessionState);
      setExportResult(result);
      // Default: copy the whole thing (single code, or all chunks joined).
      const ok = await copyToClipboard(result.full);
      setCopied(ok ? 'all' : 'none');
      if (ok) window.setTimeout(() => setCopied('none'), 2500);
      // For multi-chunk codes, expand the text so the user can see what to send.
      setShowCode(!result.isSingle);
    } finally {
      setBusy(false);
    }
  };

  const onCopyChunk = async (idx: number, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(idx);
      window.setTimeout(() => setCopied('none'), 2000);
    }
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
          Hand off the session to another phone: copy the text and paste it into
          Import on the other phone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onShare}
            disabled={busy}
            className="flex-1 rounded-xl bg-cyan-500/90 px-3 py-3 text-sm font-semibold text-slate-900 shadow-lcd transition active:scale-95 disabled:opacity-50"
          >
            {busy ? 'Preparing…' : copied === 'all' ? '✓ Copied to clipboard' : 'Copy session'}
          </button>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-medium text-slate-200 transition active:scale-95 hover:bg-white/10"
          >
            {importOpen ? 'Cancel import' : 'Import session'}
          </button>
        </div>

        {exportResult && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-slate-400">
              {exportResult.isSingle
                ? `Fits in one message (${exportResult.chars.toLocaleString()} chars).`
                : `Too big for one message — split into ${exportResult.chunks.length} parts (${exportResult.chars.toLocaleString()} chars total). Send all parts.`}
            </p>

            {!exportResult.isSingle && (
              <div className="flex flex-col gap-1.5">
                {exportResult.chunks.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onCopyChunk(i, c)}
                    className={
                      'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition active:scale-[0.98] ' +
                      (copied === i
                        ? 'bg-emerald-500 text-slate-900'
                        : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10')
                    }
                  >
                    <span>
                      {copied === i ? '✓ Copied' : `Copy part ${i + 1} of ${exportResult.chunks.length}`}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{c.length} ch</span>
                  </button>
                ))}
                <p className="text-[10px] text-slate-500">
                  Send each part as its own message. The other phone can paste them
                  all together (any order) into Import.
                </p>
              </div>
            )}

            <details
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              open={showCode}
              onToggle={(e) => setShowCode((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer text-xs text-slate-300">
                Show share code text
              </summary>
              <textarea
                readOnly
                value={exportResult.full}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                rows={5}
                className="mt-2 w-full resize-none rounded-md bg-black/40 p-2 font-mono text-[10px] leading-tight text-slate-300"
              />
            </details>
          </div>
        )}

        {importOpen && <ImportSessionForm onImported={() => setImportOpen(false)} />}
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
        onClick={onClearGames}
        className={
          'w-full rounded-2xl px-4 py-4 text-sm font-medium transition active:scale-[0.99] ' +
          (confirmClear
            ? 'bg-amber-500 text-slate-900 shadow-lcd-gold'
            : 'glass text-amber-300')
        }
      >
        {confirmClear
          ? 'Tap again to confirm — clears games but keeps players'
          : 'Clear games (keep players)'}
      </button>

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

      <button
        type="button"
        onClick={onReload}
        disabled={reloading}
        className="glass w-full rounded-2xl px-4 py-3 text-sm font-medium text-slate-200 transition active:scale-[0.99] disabled:opacity-60"
      >
        {reloading ? 'Reloading…' : 'Reload app (keep all data)'}
      </button>
      <p className="px-2 -mt-1 text-center text-[10px] text-slate-500">
        Forces the latest version. Players, scores, and settings are kept.
      </p>

      <button
        type="button"
        onClick={() => setAboutOpen(true)}
        className="glass w-full rounded-2xl px-4 py-3 text-sm font-medium text-slate-200 transition active:scale-[0.99]"
      >
        About
      </button>

      {aboutOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="About Blue Lions Mix & Match"
          className="fixed inset-0 z-50 overflow-y-auto bg-bl-navy/95 backdrop-blur-md"
        >
          <div className="mx-auto max-w-md">
            <Splash buttonLabel="Close" onContinue={() => setAboutOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
