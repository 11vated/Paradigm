import React, { useEffect } from 'react';
import { useMode, MODES, MODE_LABEL, type Mode } from '@/stores/modeStore';
import { CrucibleMode }    from './modes/CrucibleMode';
import { AtelierMode }     from './modes/AtelierMode';
import { AnatomyMode }     from './modes/AnatomyMode';
import { ResonanceMode }   from './modes/ResonanceMode';
import { LineageMode }     from './modes/LineageMode';
import { CodexMode }       from './modes/CodexMode';
import { TopologyMode }    from './modes/TopologyMode';
import { EvolutionMode }   from './modes/EvolutionMode';
import { SubstrateMode }   from './modes/SubstrateMode';
import { SovereigntyMode } from './modes/SovereigntyMode';

const MODE_GLYPHS: Record<string, string> = {
  crucible: '◈', atelier: '⬡', anatomy: '⬟',
  resonance: '≋', lineage: '⊕', codex: '⊞',
  topology: '⧉', evolution: '⟳', substrate: '⊛', sovereignty: '◆',
};

const ModeRouter: React.FC<{ mode: Mode }> = ({ mode }) => {
  switch (mode) {
    case 'crucible':    return <CrucibleMode />;
    case 'atelier':     return <AtelierMode />;
    case 'anatomy':     return <AnatomyMode />;
    case 'resonance':   return <ResonanceMode />;
    case 'lineage':     return <LineageMode />;
    case 'codex':       return <CodexMode />;
    case 'topology':    return <TopologyMode />;
    case 'evolution':   return <EvolutionMode />;
    case 'substrate':   return <SubstrateMode />;
    case 'sovereignty': return <SovereigntyMode />;
  }
};

export const CenterStage: React.FC = () => {
  const { mode, setMode } = useMode();

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
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
    <main aria-label="Living artifact" className="r-stage">
      {/* Substrate field (animated background) */}
      <div className="r-substrate-field" aria-hidden />

      {/* Mode tabs */}
      <div className="r-stage-topbar">
        <div className="r-mode-tabs">
          {MODES.map((m: Mode, i) => (
            <button
              key={m}
              className="r-mode-tab"
              data-active={m === mode}
              onClick={() => setMode(m)}
              title={`${MODE_LABEL[m]} (${i + 1})`}
            >
              <span className="r-mode-tab-num">{i + 1}</span>
              <span style={{ fontSize: 11 }}>{MODE_GLYPHS[m] ?? '○'}</span>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Mode content */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        <ModeRouter mode={mode} />
      </div>
    </main>
  );
};
