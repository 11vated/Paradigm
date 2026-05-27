/**
 * App — Reality OS shell at "/", legacy Studio at "/classic/*".
 *
 * The new three-pane studio (`@/app/Root`) owns everything under "/".
 * The pre-Phase-A pages remain reachable at "/classic/*" through a
 * one-release deprecation window; they are deleted in Phase F.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Root from '@/app/Root';
import { LegacyShell } from '@/app/legacy/LegacyShell';
import SubstratePage from '@/pages/SubstratePage';
import ExplorePage from '@/pages/ExplorePage';
import GenesisPage from '@/pages/GenesisPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/classic/*" element={<LegacyShell />} />
        <Route path="/substrate" element={<SubstratePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/genesis" element={<GenesisPage />} />
        <Route path="/genesis/:shortHash" element={<GenesisPage />} />
        <Route path="/*" element={<Root />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
