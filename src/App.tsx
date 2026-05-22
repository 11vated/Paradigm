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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/classic/*" element={<LegacyShell />} />
        <Route path="/*" element={<Root />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
