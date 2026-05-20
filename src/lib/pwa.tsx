import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Service-worker / app-update state surfaced to the rest of the UI.
 *
 * - `needRefresh` flips to true when a new version of the assets has
 *   downloaded in the background and is waiting to take over. The
 *   `<UpdateBanner />` watches this and prompts the host.
 * - `applyUpdate()` activates the waiting service worker and reloads
 *   the page — localStorage (i.e. players / scores / settings) is
 *   preserved across the reload, only the JS/CSS bundle is swapped.
 * - `forceReload()` is the "I just want to be sure I'm on the latest
 *   version" escape hatch from the Session menu. It triggers a manual
 *   SW update check, waits a beat for any newer worker to download,
 *   then reloads the page regardless of whether a new version was
 *   actually waiting.
 */
interface PwaContext {
  needRefresh: boolean;
  dismissUpdate: () => void;
  applyUpdate: () => Promise<void>;
  forceReload: () => Promise<void>;
}

const Ctx = createContext<PwaContext | null>(null);

const UPDATE_POLL_MS = 60 * 60 * 1000; // hourly background check

export function PwaProvider({ children }: { children: ReactNode }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const tick = () => {
        registration.update().catch(() => {
          /* network blip — try again on the next tick */
        });
      };
      const id = window.setInterval(tick, UPDATE_POLL_MS);
      window.addEventListener('focus', tick);
      // Best-effort cleanup. Provider lives for the lifetime of the
      // tab in practice, so this rarely fires — included for sanity.
      window.addEventListener('beforeunload', () => {
        window.clearInterval(id);
        window.removeEventListener('focus', tick);
      });
    },
  });

  useEffect(() => {
    // Cosmetic: nothing to do here, the hook drives everything.
  }, []);

  const value: PwaContext = {
    needRefresh,
    dismissUpdate: () => setNeedRefresh(false),
    applyUpdate: async () => {
      await updateServiceWorker(true);
    },
    forceReload: async () => {
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg) {
          await reg.update();
          // Give the browser a beat to actually fetch & install any new SW
          // before we reload, so the reloaded page picks up the new bundle.
          await new Promise((r) => window.setTimeout(r, 350));
        }
      } catch {
        /* ignore — fall through to a plain reload */
      }
      window.location.reload();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePwa(): PwaContext {
  const v = useContext(Ctx);
  if (!v) {
    // Used outside the provider (or during the very first render in
    // tests). Return inert values so callers don't have to null-check.
    return {
      needRefresh: false,
      dismissUpdate: () => {},
      applyUpdate: async () => {
        window.location.reload();
      },
      forceReload: async () => {
        window.location.reload();
      },
    };
  }
  return v;
}
