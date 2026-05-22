import React from 'react';
import { useAgentThreads } from '@/stores/agentThreads';

type Lens = 'conversation' | 'plan' | 'source' | 'tools' | 'memory' | 'branches';

const LENSES: Array<{ id: Lens; label: string }> = [
  { id: 'conversation', label: 'Conversation' },
  { id: 'plan',         label: 'Plan' },
  { id: 'source',       label: 'Source' },
  { id: 'tools',        label: 'Tools' },
  { id: 'memory',       label: 'Memory' },
  { id: 'branches',     label: 'Branches' },
];

export const LensTabs: React.FC = () => {
  const lens = useAgentThreads((s) => s.lens);
  const setLens = useAgentThreads((s) => s.setLens);

  return (
    <nav
      role="tablist"
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--r-ink-4)',
        padding: '0 var(--r-px-3)',
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {LENSES.map((l) => {
        const active = lens === l.id;
        return (
          <button
            key={l.label}
            role="tab"
            aria-selected={active}
            onClick={() => setLens(l.id)}
            style={{
              position: 'relative',
              padding: '7px 8px',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              fontFamily: 'var(--r-font-display)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: active ? 'var(--r-ink-0)' : 'var(--r-ink-3)',
              transition: 'color var(--r-dur-1) var(--r-ease)',
              whiteSpace: 'nowrap',
            }}
          >
            {l.label}
            {active && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 6,
                  right: 6,
                  bottom: -1,
                  height: 1,
                  background: 'var(--r-prism-core)',
                  boxShadow: '0 0 6px var(--r-prism-core)',
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
