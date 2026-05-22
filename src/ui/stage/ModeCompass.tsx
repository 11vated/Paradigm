/**
 * ModeCompass — depth navigator for modes 1..7.
 */
import React from 'react';
import { useMode, MODES, MODE_LABEL, MODE_NUM, type Mode } from '@/stores/modeStore';

const RING: Mode[] = [
  'crucible', 'atelier', 'anatomy', 'codex',
  'topology', 'lineage', 'resonance',
];

export const ModeCompass: React.FC = () => {
  const { mode, setMode } = useMode();

  return (
    <div
      role="navigation"
      aria-label="Mode compass"
      style={{
        position: 'absolute',
        right: 12,
        bottom: 36,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 4,
        zIndex: 12,
        pointerEvents: 'auto',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--r-font-num)',
          fontSize: 8,
          color: 'var(--r-ink-4)',
          letterSpacing: '0.08em',
        }}
      >
        depth · {MODE_NUM[mode]}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: 200, justifyContent: 'flex-end' }}>
        {RING.map((m) => {
          const active = m === mode;
          return (
            <button
              key={m}
              type="button"
              title={`${MODE_NUM[m]} · ${MODE_LABEL[m]}`}
              onClick={() => setMode(m)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '1px solid',
                borderColor: active
                  ? 'color-mix(in oklab, var(--r-prism-core) 60%, transparent)'
                  : 'var(--r-ink-4)',
                background: active
                  ? 'color-mix(in oklab, var(--r-prism-core) 15%, transparent)'
                  : 'rgba(0,0,0,0.2)',
                color: active ? 'var(--r-ink-0)' : 'var(--r-ink-3)',
                fontFamily: 'var(--r-font-num)',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              {MODE_NUM[m]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
