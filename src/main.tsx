import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PwaProvider } from './lib/pwa';
import { applyTheme, themeStorage } from './lib/theme';
import './index.css';

// Service-worker registration is handled inside <PwaProvider /> via the
// React-aware `useRegisterSW` hook, so we can also surface the
// "update available" state to the UI.

// Resolve and apply the persisted theme BEFORE React renders, so the
// first paint already uses the correct surface tokens (no flash from
// dark -> light or vice versa). `applyTheme` is idempotent.
applyTheme(themeStorage.get());

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <PwaProvider>
      <App />
    </PwaProvider>
  </StrictMode>,
);
