import { useState } from 'react';
import { usePwa } from '../lib/pwa';

/**
 * Floating banner shown at the top when a new version of the assets has
 * downloaded in the background. Tap "Reload" to activate it; tap the
 * tiny "×" to keep playing without reloading (the banner will come back
 * on the next update check — or the next time the host taps "Reload app"
 * in the Session menu).
 *
 * Rendered above `<AppHeader />` and pushes content down when visible.
 * That's deliberate: an update prompt should be unmissable, not parked
 * in a corner.
 */
export default function UpdateBanner() {
  const { needRefresh, applyUpdate, dismissUpdate } = usePwa();
  const [busy, setBusy] = useState(false);

  if (!needRefresh) return null;

  const onReload = async () => {
    setBusy(true);
    try {
      await applyUpdate();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-cyan-500/90 text-slate-900 shadow-lcd backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900/15 text-base">
          ↻
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
            Update ready
          </p>
          <p className="truncate text-[11px] text-slate-900/85">
            Reload to switch to the latest version. Your players and scores stay.
          </p>
        </div>
        <button
          type="button"
          onClick={onReload}
          disabled={busy}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-200 transition active:scale-95 disabled:opacity-60"
        >
          {busy ? 'Reloading…' : 'Reload'}
        </button>
        <button
          type="button"
          onClick={dismissUpdate}
          className="shrink-0 rounded-md px-2 py-1 text-base font-bold text-slate-900/70 transition active:scale-95"
          aria-label="Dismiss update banner"
        >
          ×
        </button>
      </div>
    </div>
  );
}
