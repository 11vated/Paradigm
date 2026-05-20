import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TopNav } from '@/components/TopNav';
import { StudioPage } from '@/pages/StudioPage';
import FriendPage from '@/pages/FriendPage';
import PlayPage from '@/pages/PlayPage';
import WorldPage from '@/pages/WorldPage';
import QuestPage from '@/pages/QuestPage';
import LineagePage from '@/pages/LineagePage';
import ChatPage from '@/pages/ChatPage';
import ReplPage from '@/pages/ReplPage';
import EvolvePage from '@/pages/EvolvePage';
import { WorldSeedPage } from '@/pages/WorldSeedPage';
import { PhotorealisticRendererDemo } from '@/components/rendering/PhotorealisticRendererDemo';

function App() {
  return (
    <BrowserRouter>
      <TopNav />
      <Routes>
        <Route path="/" element={<Navigate to="/studio" replace />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/friend" element={<FriendPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/play/:friendSeed/:worldSeed" element={<PlayPage />} />
        <Route path="/world" element={<WorldPage />} />
        <Route path="/quest" element={<QuestPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/lineage/:id" element={<LineagePage />} />
        <Route path="/repl" element={<ReplPage />} />
        <Route path="/evolve" element={<EvolvePage />} />
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
