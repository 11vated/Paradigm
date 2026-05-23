import React from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useMode, MODE_LABEL } from '@/stores/modeStore';
import { useAgentThreads } from '@/stores/agentThreads';
import { PrismStrip } from '@/ui/primitives/PrismStrip';

const DOMAIN_COLORS: Record<string, string> = {
  character: '#A78BFA', music: '#34D399', visual2d: '#F59E0B', world: '#10B981',
  molecule: '#60A5FA', quantum: '#818CF8', field: '#06B6D4', cosmology: '#7C3AED',
  website: '#F97316', app: '#EC4899', game: '#EAB308', narrative: '#A3E635',
  sprite: '#FB923C', agent: '#38BDF8',
};

export const AmbientStrip: React.FC = () => {
  const seed    = useActiveSeed(s => s.seed);
  const mode    = useMode(s => s.mode);
  const { threads } = useAgentThreads();
  const domColor = seed?.domain ? (DOMAIN_COLORS[seed.domain] ?? '#6366F1') : 'var(--r-ink-3)';

  return (
    <footer role="contentinfo" className="r-ambient">
      {/* Heartbeat */}
      <div className="r-ambient-indicator">
        <div className="r-ambient-dot" />
        <span style={{ color: 'var(--r-ink-2)', fontWeight: 700, letterSpacing: '0.15em' }}>PARADIGM</span>
      </div>

      {/* Seed prism strip */}
      {seed?.hash ? (
        <div className="r-ambient-prism">
          <PrismStrip hash={seed.hash} thickness={2} />
        </div>
      ) : (
        <div style={{ width: 2, height: 2, borderRadius: 99, background: 'var(--r-ink-4)' }} />
      )}

      {/* Separator */}
      <div style={{ width: 1, height: 14, background: 'var(--r-ink-5)' }} />

      {/* Active domain */}
      {seed?.domain && (
        <span style={{ color: domColor, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 9 }}>
          {seed.domain}
        </span>
      )}

      {/* Mode */}
      <span style={{ color: 'var(--r-ink-2)', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 9 }}>
        {MODE_LABEL[mode]}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right cluster */}
      {seed?.hash && (
        <span style={{ color: 'var(--r-ink-4)', fontFamily: 'var(--r-font-mono)', fontSize: 9, letterSpacing: '0.06em' }}>
          {seed.hash.slice(0, 16)}
        </span>
      )}

      <span style={{ color: 'var(--r-ink-4)' }}>
        {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
      </span>

      <div style={{ width: 1, height: 14, background: 'var(--r-ink-5)' }} />

      <span style={{ color: 'var(--r-ok)', fontWeight: 700, letterSpacing: '0.1em' }}>deterministic</span>
    </footer>
  );
};
