import { useEffect, useState, useCallback } from 'react';
import {
  applyTheme,
  themeStorage,
  subscribeToOsThemeChanges,
  type ThemeMode,
  type ResolvedTheme,
} from './theme';

/**
 * React binding around the theme storage. Exposes the user's stored
 * preference (`mode`), the actually-applied theme (`resolved`, which
 * resolves 'auto' against the OS), and a setter that persists +
 * applies the new choice.
 *
 * When the user is in 'auto' mode the hook subscribes to OS theme
 * changes so the app re-applies in real time without a reload.
 */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => themeStorage.get());
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    applyTheme(themeStorage.get()),
  );

  const setMode = useCallback((next: ThemeMode) => {
    themeStorage.set(next);
    setModeState(next);
    setResolved(applyTheme(next));
  }, []);

  // Only meaningful when mode === 'auto': re-resolve on OS theme flip.
  useEffect(() => {
    if (mode !== 'auto') return;
    const unsubscribe = subscribeToOsThemeChanges(() => {
      setResolved(applyTheme('auto'));
    });
    return unsubscribe;
  }, [mode]);

  return { mode, resolved, setMode };
}
