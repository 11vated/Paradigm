import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles/paradigm.css';
import './index.css';
import { GeneticBackdrop } from '@/components/shell/GeneticBackdrop';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GeneticBackdrop />
    <App />
  </StrictMode>,
);
