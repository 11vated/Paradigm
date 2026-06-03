import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles/paradigm.css';
import './index.css';

// Ensure browser process shim (for process.env etc in UI graph modules) runs early.
// This wires the TS fix + runtime global assignment. Matches other node shims in vite alias.
import '@/lib/browser/process-shim';

// GeneticBackdrop is kept only for the legacy /classic/* shell, which
// renders it from inside LegacyShell. The new Root paints its own
// Reality-OS substrate.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
