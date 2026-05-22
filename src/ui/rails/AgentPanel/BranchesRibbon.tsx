import React from 'react';
import { useAgentThreads } from '@/stores/agentThreads';

export const BranchesRibbon: React.FC = () => {
  const { threads, currentThreadId, setCurrent } = useAgentThreads();

  if (threads.length <= 1) return null;

  return (
    <div
      role="navigation"
      aria-label="thread branches"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: 'rgba(255,255,255,0.012)',
        borderBottom: '1px solid var(--r-ink-4)',
        overflowX: 'auto',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--r-font-display)',
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--r-ink-3)',
          flexShrink: 0,
        }}
      >
        branches
      </span>
      {threads.map((t) => {
        const active = t.id === currentThreadId;
        return (
          <button
            key={t.id}
            onClick={() => setCurrent(t.id)}
            title={t.title}
            style={{
              height: 14,
              minWidth: 26,
              padding: '0 6px',
              background: active
                ? 'color-mix(in oklab, var(--r-prism-core) 18%, transparent)'
                : 'transparent',
              border: '1px solid',
              borderColor: active ? 'var(--r-prism-core)' : 'var(--r-ink-4)',
              color: active ? 'var(--r-ink-0)' : 'var(--r-ink-2)',
              fontFamily: 'var(--r-font-num)',
              fontSize: 9,
              cursor: 'pointer',
              borderRadius: 'var(--r-radius-1)',
            }}
          >
            {t.turns.length}
          </button>
        );
      })}
    </div>
  );
};
