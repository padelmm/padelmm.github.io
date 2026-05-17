import { useState } from 'react';
import Setup from './components/Setup';
import Play from './components/Play';
import Players from './components/Players';
import Ranking from './components/Ranking';
import SessionMenu from './components/SessionMenu';
import { useSession } from './lib/store';

type Tab = 'play' | 'players' | 'ranking' | 'session';

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: 'play', label: 'Round', emoji: '🎾' },
  { id: 'players', label: 'Players', emoji: '👥' },
  { id: 'ranking', label: 'Ranking', emoji: '🏆' },
  { id: 'session', label: 'Session', emoji: '⚙️' },
];

export default function App() {
  const status = useSession((s) => s.status);
  const [tab, setTab] = useState<Tab>('play');

  if (status === 'setup') {
    return (
      <main className="mx-auto max-w-md">
        <Setup />
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <main className="flex-1">
        {tab === 'play' && <Play />}
        {tab === 'players' && <Players />}
        {tab === 'ranking' && <Ranking />}
        {tab === 'session' && <SessionMenu />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md justify-around border-t border-court-line bg-court-bg/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-2 backdrop-blur">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                'flex flex-1 flex-col items-center gap-0.5 px-2 py-1 text-xs font-medium transition ' +
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
