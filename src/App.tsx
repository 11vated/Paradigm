/**
 * App — Reality OS shell at "/", legacy Studio at "/classic/*", OS Shell at "/os".
 *
 * The new three-pane studio (`@/app/Root`) owns everything under "/".
 * The pre-Phase-A pages remain reachable at "/classic/*" through a
 * one-release deprecation window; they are deleted in Phase F.
 * OS Shell is the Phase 12 desktop environment prototype.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HealthPage from './pages/HealthPage';
import Root from '@/app/Root';
import { LegacyShell } from '@/app/legacy/LegacyShell';
import SubstratePage from '@/pages/SubstratePage';
import { OSDShell } from '@/lib/os-shell/os-shell';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/classic/*" element={<LegacyShell />} />
        <Route path="/substrate" element={<SubstratePage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/os" element={<OSDShell />} />
        <Route path="/*" element={<Root />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
