/**
 * TopBar — Reality OS chrome (minimal).
 *
 * Left  : Paradigm wordmark
 * Mid   : kernel determinism gauge
 * Right : domain cosmos trigger · help · user chip
 *
 * No fake marketplace, DAO, or canon tickers. They return when
 * their backing endpoints exist (Phase 6).
 */
import React from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useMode, MODE_LABEL } from '@/stores/modeStore';
import { KernelGauge } from './KernelGauge';

interface TopBarProps {
  onCosmos?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onCosmos }) => {
  const seed = useActiveSeed((s) => s.seed);
  const { mode } = useMode();

  return (
    <header
      role="banner"
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 10px',
        borderBottom: '1px solid var(--r-ink-4)',
        background: 'rgba(11, 13, 18, 0.7)',
        position: 'relative',
        zIndex: 'var(--r-z-chrome)' as unknown as number,
      }}
    >
      {/* wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            background: 'var(--r-prism-core)',
            transform: 'rotate(45deg)',
            boxShadow: '0 0 6px var(--r-prism-core)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--r-font-display)',
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--r-ink-0)',
          }}
        >
          Paradigm
        </span>
      </div>

      {/* mode label */}
      <span
        className="r-chip"
        style={{
          borderColor: 'transparent',
          fontSize: 8,
          padding: '0 6px',
          color: 'var(--r-ink-3)',
        }}
      >
        {MODE_LABEL[mode]}
      </span>

      <div style={{ flex: 1 }} />

      <KernelGauge />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          className="r-chip"
          onClick={onCosmos}
          style={{
            cursor: 'pointer',
            borderColor: 'var(--r-ink-4)',
            fontSize: 8,
            color: 'var(--r-ink-3)',
            background: 'transparent',
          }}
          title="Domain Cosmos (cmd+space)"
        >
          ✦ cosmos
        </button>
        <span
          className="r-chip"
          style={{
            borderColor: 'transparent',
            color: 'var(--r-ink-1)',
            fontSize: 8,
          }}
          title="signed-in operator"
        >
          you
        </span>
      </div>
    </header>
  );
};
