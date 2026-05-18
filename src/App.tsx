import { useEffect, useState } from 'react';
import Setup from './components/Setup';
import Play from './components/Play';
import Players from './components/Players';
import Ranking from './components/Ranking';
import History from './components/History';
import SessionMenu from './components/SessionMenu';
import Splash from './components/Splash';
import AppHeader from './components/AppHeader';
import { introStorage, useSession } from './lib/store';
import { importSession } from './lib/share';
import type { SessionState } from './lib/types';

type Tab = 'play' | 'players' | 'ranking' | 'history' | 'session';

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: 'play', label: 'Round', emoji: '🎾' },
  { id: 'players', label: 'Players', emoji: '👥' },
  { id: 'ranking', label: 'Ranking', emoji: '🏆' },
  { id: 'history', label: 'History', emoji: '📜' },
  { id: 'session', label: 'Session', emoji: '⚙️' },
];

export default function App() {
  const status = useSession((s) => s.status);
  const replaceState = useSession((s) => s.replaceState);
  const [tab, setTab] = useState<Tab>('play');
  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [pendingImport, setPendingImport] = useState<
    | { state: SessionState; replacesRunning: boolean; error?: undefined }
    | { error: string; state?: undefined; replacesRunning?: undefined }
    | null
  >(null);

  useEffect(() => {
    setShowSplash(!introStorage.has());
  }, []);

  // Deep-link import: when the page is opened via a `#import=...` URL
  // (typically by scanning the QR code from another phone), decode the
  // payload, validate it, and surface a confirm dialog before replacing
  // any running session.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#import=')) return;
    const raw = decodeURIComponent(hash.slice('#import='.length));
    // Clean the URL immediately so a reload doesn't re-trigger the import.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    importSession(raw).then((result) => {
      if (!result.ok || !result.state) {
        setPendingImport({ error: result.error ?? 'Import failed.' });
        return;
      }
      const runningStatus = useSession.getState().status;
      const replacesRunning = runningStatus === 'running' || runningStatus === 'finished';
      if (!replacesRunning) {
        // Nothing valuable to overwrite — import silently.
        replaceState(result.state);
      } else {
        setPendingImport({ state: result.state, replacesRunning });
      }
    });
  }, [replaceState]);

  if (pendingImport && pendingImport.state) {
    const playerCount = pendingImport.state.players.length;
    const roundCount = pendingImport.state.rounds.length;
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="glass flex flex-col gap-3 rounded-2xl p-5">
          <h1 className="text-lg font-bold text-cyan-200">Import shared session?</h1>
          <p className="text-sm text-slate-300">
            A session was opened from a share link with {playerCount} player
            {playerCount === 1 ? '' : 's'} and {roundCount} round{roundCount === 1 ? '' : 's'}.
          </p>
          <p className="text-xs text-amber-300">
            This will replace the session currently on this phone.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                replaceState(pendingImport.state!);
                setPendingImport(null);
              }}
              className="flex-1 rounded-xl bg-cyan-500 px-3 py-3 text-sm font-semibold text-slate-900 shadow-lcd transition active:scale-95"
            >
              Replace &amp; open
            </button>
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-medium text-slate-200 transition active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (pendingImport && pendingImport.error) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="glass flex flex-col gap-3 rounded-2xl p-5">
          <h1 className="text-lg font-bold text-rose-300">Import failed</h1>
          <p className="text-sm text-slate-300">{pendingImport.error}</p>
          <button
            type="button"
            onClick={() => setPendingImport(null)}
            className="rounded-xl bg-white/10 px-3 py-3 text-sm font-medium text-slate-200 transition active:scale-95"
          >
            Continue
          </button>
        </div>
      </main>
    );
  }

  if (showSplash) {
    return (
      <main className="mx-auto max-w-md">
        <Splash
          onContinue={() => {
            introStorage.mark();
            setShowSplash(false);
          }}
        />
      </main>
    );
  }

  if (status === 'setup') {
    return (
      <main className="mx-auto max-w-md">
        <Setup />
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <AppHeader />
      <main className="flex-1">
        {tab === 'play' && <Play />}
        {tab === 'players' && <Players />}
        {tab === 'ranking' && <Ranking />}
        {tab === 'history' && <History />}
        {tab === 'session' && <SessionMenu />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md justify-around border-t border-white/10 bg-bl-navy/85 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-2 backdrop-blur-md">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                'flex flex-1 flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium transition ' +
                (active ? 'text-cyan-300' : 'text-slate-400 active:text-slate-200')
              }
              aria-current={active ? 'page' : undefined}
            >
              <span className="text-lg leading-none" aria-hidden>
                {t.emoji}
              </span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
