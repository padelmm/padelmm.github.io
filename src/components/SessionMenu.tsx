import { useState } from 'react';
import { useSession } from '../lib/store';

export default function SessionMenu() {
  const status = useSession((s) => s.status);
  const newSession = useSession((s) => s.newSession);
  const finishSession = useSession((s) => s.finishSession);
  const [confirmReset, setConfirmReset] = useState(false);

  if (status === 'setup') return null;

  const onReset = () => {
    if (confirmReset) {
      newSession();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
      <header>
        <h1 className="text-xl font-bold">Session</h1>
        <p className="text-sm text-slate-400">Finish or start a new mix &amp; match.</p>
      </header>

      {status === 'running' && (
        <button
          type="button"
          onClick={finishSession}
          className="w-full rounded-2xl bg-court-panel/70 px-4 py-4 text-base font-medium text-slate-200 ring-1 ring-court-line transition active:scale-[0.99]"
        >
          Finish session (keeps ranking visible)
        </button>
      )}

      <button
        type="button"
        onClick={onReset}
        className={
          'w-full rounded-2xl px-4 py-4 text-base font-medium ring-1 transition active:scale-[0.99] ' +
          (confirmReset
            ? 'bg-rose-500 text-slate-900 ring-rose-400'
            : 'bg-court-panel/70 text-rose-300 ring-court-line')
        }
      >
        {confirmReset ? 'Tap again to confirm — clears everything' : 'New mix & match (clear data)'}
      </button>

      <p className="rounded-xl bg-slate-900/60 px-3 py-3 text-xs text-slate-400 ring-1 ring-court-line">
        Everything is stored only on this phone, in this browser. Nothing is uploaded.
      </p>
    </div>
  );
}
