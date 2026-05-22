import React from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useMode, MODE_LABEL } from '@/stores/modeStore';
import { useAgentThreads } from '@/stores/agentThreads';
import { useSeedTheme } from '@/hooks/useSeedTheme';
import { PrismStrip } from '@/ui/primitives/PrismStrip';

export const AmbientStrip: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const mode = useMode((s) => s.mode);
  const { threads } = useAgentThreads();
  const theme = useSeedTheme(seed?.hash);

  return (
    <footer
      role="contentinfo"
      style={{
        height: 'var(--r-bottom-h)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--r-px-6)',
        padding: '0 var(--r-px-6)',
        borderTop: '1px solid var(--r-ink-4)',
        fontFamily: 'var(--r-font-display)',
        fontSize: 10,
        letterSpacing: '0.06em',
        color: 'var(--r-ink-3)',
        position: 'relative',
        zIndex: 'var(--r-z-chrome)' as unknown as number,
      }}
    >
      <span style={{ color: theme.core }}>●</span>
      <span style={{ color: 'var(--r-ink-2)' }}>PARADIGM</span>
      {seed?.hash && (
        <div style={{ flex: 1, minWidth: 0, maxWidth: 160 }}>
          <PrismStrip hash={seed.hash} thickness={2} />
        </div>
      )}
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
        <span title="active mode">{MODE_LABEL[mode]}</span>
        <span title="seed hash" style={{ fontFamily: 'var(--r-font-num)', color: 'var(--r-ink-4)', fontSize: 9 }}>
          {seed?.hash ? seed.hash.slice(0, 12) : '—'}
        </span>
        <span title="thread count" style={{ fontFamily: 'var(--r-font-num)', color: 'var(--r-ink-4)' }}>
          {threads.length} thread{threads.length !== 1 ? 's' : ''}
        </span>
        <span title="determinism invariant" style={{ color: 'var(--r-ok)' }}>deterministic</span>
      </span>
    </footer>
  );
};
