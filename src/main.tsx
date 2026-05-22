import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles/paradigm.css';
import './index.css';

// GeneticBackdrop is kept only for the legacy /classic/* shell, which
// renders it from inside LegacyShell. The new Root paints its own
// Reality-OS substrate.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
