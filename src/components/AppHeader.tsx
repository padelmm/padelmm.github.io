import { useTheme } from '../lib/use-theme';

/**
 * Thin sticky top bar shown across all running-state views.
 * Keeps the Blue Lions branding visible so the host always knows which
 * club / app they're using, even when the current view has no other
 * branding (e.g. empty Round state after Clear games).
 *
 * Top padding uses `max(env(safe-area-inset-top), 0.5rem)` so that when
 * the app is installed to an iPhone Home Screen (standalone PWA) the
 * logo and labels are pushed below the iOS status-bar overlay (clock /
 * dynamic island / battery icons). On Android / desktop the inset is 0
 * and the fallback of 0.5rem matches the previous look.
 *
 * The logo source mirrors what Splash does — swap to `bl-logo-light.png`
 * in the light theme so the cyan glow on the dark-mode badge doesn't
 * smudge against the cream background. We read the resolved theme via
 * `useTheme` so the swap follows the host's preference (and the OS in
 * 'auto' mode) without component-internal media-query plumbing.
 */
export default function AppHeader() {
  const { resolved } = useTheme();
  const logoSrc = resolved === 'light' ? '/bl-logo-light.png' : '/bl-logo.png';
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-bl-navy/85 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur-md">
      <img
        src={logoSrc}
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
