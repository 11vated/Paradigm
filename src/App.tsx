import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StudioPage } from '@/pages/StudioPage';
import FriendPage from '@/pages/FriendPage';
import PlayPage from '@/pages/PlayPage';
import { WorldSeedPage } from '@/pages/WorldSeedPage';
import { PhotorealisticRendererDemo } from '@/components/rendering/PhotorealisticRendererDemo';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/studio" replace />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/friend" element={<FriendPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/play/:friendSeed/:worldSeed" element={<PlayPage />} />
        <Route path="/worldseed" element={<WorldSeedPage />} />
        <Route path="/rendering-demo" element={
          <div style={{ minHeight: '100vh', padding: 32, background: 'var(--p-canvas)' }}>
            <PhotorealisticRendererDemo />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
