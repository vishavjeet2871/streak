import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/geist';
import './index.css';
import App from './App';

// Service worker: precaches the app for offline use and updates itself in the background.
registerSW({ immediate: true });

// All data is local, so ask the browser not to evict it under storage pressure.
void navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
