import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PwaProvider } from './lib/pwa';
import './index.css';

// Service-worker registration is handled inside <PwaProvider /> via the
// React-aware `useRegisterSW` hook, so we can also surface the
// "update available" state to the UI.

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <PwaProvider>
      <App />
    </PwaProvider>
  </StrictMode>,
);
