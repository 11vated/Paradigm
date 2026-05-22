/**
 * CenterStage — the Living Artifact.
 *
 * Composition:
 *   ┌── Mode router (Crucible / Atelier / Anatomy / …)
 *   └── ModeSubBar (mode-specific controls)
 *
 * Keyboard:
 *   1-7      — switch mode (no modifier — keyboard-first)
 *   cmd+\    — calm focus (handled in usePaneLayout)
 *   cmd+↩   — expand agent (handled in usePaneLayout)
 *   esc      — restore layout (handled in usePaneLayout)
 */
import React, { useEffect } from 'react';
import { useMode, MODES, MODE_LABEL, type Mode } from '@/stores/modeStore';
import { CrucibleMode } from './modes/CrucibleMode';
import { AtelierMode } from './modes/AtelierMode';
import { AnatomyMode } from './modes/AnatomyMode';
import { ResonanceMode } from './modes/ResonanceMode';
import { LineageMode } from './modes/LineageMode';
import { CodexMode } from './modes/CodexMode';
import { TopologyMode } from './modes/TopologyMode';

const ModeRouter: React.FC<{ mode: Mode }> = ({ mode }) => {
  switch (mode) {
    case 'crucible': return <CrucibleMode />;
    case 'atelier':  return <AtelierMode />;
    case 'anatomy':  return <AnatomyMode />;
    case 'resonance':return <ResonanceMode />;
    case 'lineage':  return <LineageMode />;
    case 'codex':    return <CodexMode />;
    case 'topology': return <TopologyMode />;
  }
};

export const CenterStage: React.FC = () => {
  const { mode, setMode } = useMode();

  // Bare 1-7 → mode switch (no modifier needed)
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const n = Number(ev.key);
      if (Number.isFinite(n) && n >= 1 && n <= MODES.length) {
        ev.preventDefault();
        setMode(MODES[n - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setMode]);

  return (
    <main
      aria-label="Living artifact"
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(7, 8, 11, 0.4)',
        overflow: 'hidden',
      }}
    >
      <ModeRouter mode={mode} />
    </main>
  );
};
