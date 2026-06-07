/**
 * Theme preference handling.
 *
 * Three user-facing modes:
 *  - 'auto'  — follow the OS / browser via `prefers-color-scheme`
 *  - 'dark'  — pin the dark theme (the app's original look)
 *  - 'light' — pin the light theme (uses 1CD canonical light tokens)
 *
 * Persistence is per-phone via localStorage, mirroring how
 * `ranking-mode.ts` stores its preference. Theme is intentionally NOT
 * baked into the shared session payload — themes are a viewing
 * preference of the host, not part of the match data.
 *
 * Theme application is done by setting `data-theme="dark|light"` on the
 * <html> element. CSS in `index.css` selects on that attribute. We do
 * NOT use Tailwind's class-based `dark:` variants because that would
 * require sweeping every component for `dark:` prefixes; instead we
 * override surface tokens via `[data-theme='light']` selectors and
 * keep the existing JSX untouched (the dark theme remains the visual
 * baseline of every component).
 */

import { APP_DEFAULTS } from './defaults';

export type ThemeMode = 'auto' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'padel-mm:theme-v1';

/**
 * Default theme used when no preference has been stored yet.
 *
 * Sourced from `defaults.ts` (which is the central source of truth
 * for every app-wide default). Locked to 'dark' there so existing
 * users keep their familiar look on first load after upgrading —
 * they have to engage with the toggle (or the OS) to opt into the
 * light variant. Cisco interfaces (the source design language) also
 * default to dark per the 1CD Glass spec.
 */
export const themeStorage = {
  get(): ThemeMode {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'light' || v === 'dark' || v === 'auto') return v;
      return APP_DEFAULTS.theme;
    } catch {
      return APP_DEFAULTS.theme;
    }
  },
  set(mode: ThemeMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* read-only storage is not fatal */
    }
  },
};

/**
 * Resolve a stored mode to a concrete theme using the OS preference
 * when the mode is 'auto'. Safe to call before the DOM is ready —
 * matchMedia is wrapped in a try/catch and falls back to 'dark', which
 * matches the app's original look.
 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'dark' || mode === 'light') return mode;
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Pin the iOS / Android browser chrome colour to the active theme so
 * the status-bar / address-bar doesn't jar with the page background.
 * We keep two static `<meta name="theme-color">` tags in `index.html`
 * (one per `prefers-color-scheme` media query) so the chrome matches
 * even before any JS runs; once the user has made an explicit choice
 * we override it here.
 */
function applyThemeColorMeta(theme: ResolvedTheme): void {
  const colour = theme === 'light' ? '#ebeef2' : '#0c1a36';
  // Find an unconstrained `<meta name="theme-color">` first; if it
  // doesn't exist, create one. Media-scoped tags stay around as a
  // fallback for the first paint.
  let pinned = document.head.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]:not([media])',
  );
  if (!pinned) {
    pinned = document.createElement('meta');
    pinned.setAttribute('name', 'theme-color');
    document.head.appendChild(pinned);
  }
  pinned.setAttribute('content', colour);
}

/**
 * Write the theme to <html data-theme="..."> and update the
 * theme-color meta. Idempotent and safe to call on every render or
 * preference change.
 */
export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  // Keep `color-scheme` in sync so the browser styles native bits
  // (scrollbars, form controls) correctly in either mode.
  root.style.colorScheme = resolved;
  applyThemeColorMeta(resolved);
  return resolved;
}

/**
 * Subscribe to OS theme changes. Only meaningful when the user has
 * picked 'auto' — pinned modes ignore the OS. Returns an unsubscribe
 * callback. Designed to be wired into a single top-level effect.
 */
export function subscribeToOsThemeChanges(
  onChange: (osTheme: ResolvedTheme) => void,
): () => void {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => {
      onChange(e.matches ? 'light' : 'dark');
    };
    // Safari < 14 only supports the deprecated `addListener` API.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  } catch {
    return () => {};
  }
}
