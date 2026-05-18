import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import QrTestLab from './components/QrTestLab';
import './index.css';

registerSW({ immediate: true });

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

// Hidden diagnostic route: `?lab=qr` renders the QR Test Lab as its own
// root component, bypassing the main app shell. Used to measure how
// session size translates to QR density and scan reliability. Not linked
// from any user-facing UI.
const isLabRoute =
  new URLSearchParams(window.location.search).get('lab') === 'qr';

createRoot(rootEl).render(
  <StrictMode>{isLabRoute ? <QrTestLab /> : <App />}</StrictMode>,
);
