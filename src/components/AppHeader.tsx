/**
 * Thin sticky top bar shown across all running-state views.
 * Keeps the Blue Lions branding visible so the host always knows which
 * club / app they're using, even when the current view has no other
 * branding (e.g. empty Round state after Clear games).
 */
export default function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-bl-navy/85 px-4 py-2 backdrop-blur-md">
      <img
        src="/bl-logo.png"
        alt=""
        aria-hidden="true"
        className="block h-8 w-8 shrink-0 object-contain"
        draggable={false}
      />
      <div className="min-w-0 leading-tight">
        <p className="text-[9px] uppercase tracking-[0.3em] text-cyan-300/80">
          Blue Lions
        </p>
        <p className="truncate text-xs font-semibold text-slate-100">
          Mix &amp; Match
        </p>
      </div>
    </header>
  );
}
