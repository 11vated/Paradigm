/**
 * LegacyShell — the pre-Reality-OS Studio, mounted at /classic/*.
 *
 * Kept alive without modification through the Phase F deprecation window.
 * All routes from the old `App.tsx` are remounted here, prefixed by
 * /classic so they don't clash with the new Root shell.
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import HomePage from '@/pages/HomePage';
import { WorldSeedPage } from '@/pages/WorldSeedPage';
import { PhotorealisticRendererDemo } from '@/components/rendering/PhotorealisticRendererDemo';
import { GeneticBackdrop } from '@/components/shell/GeneticBackdrop';

export const LegacyShell: React.FC = () => (
  <>
    <GeneticBackdrop />
    <TopNav />
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="studio" element={<StudioPage />} />
      <Route path="friend" element={<FriendPage />} />
      <Route path="play" element={<PlayPage />} />
      <Route path="play/:friendSeed/:worldSeed" element={<PlayPage />} />
      <Route path="world" element={<WorldPage />} />
      <Route path="quest" element={<QuestPage />} />
      <Route path="chat/:id" element={<ChatPage />} />
      <Route path="lineage/:id" element={<LineagePage />} />
      <Route path="repl" element={<ReplPage />} />
      <Route path="evolve" element={<EvolvePage />} />
      <Route path="worldseed" element={<WorldSeedPage />} />
      <Route
        path="rendering-demo"
        element={
          <div style={{ minHeight: '100vh', padding: 32, background: 'var(--p-canvas)' }}>
            <PhotorealisticRendererDemo />
          </div>
        }
      />
      <Route path="*" element={<Navigate to="/classic" replace />} />
    </Routes>
  </>
);
