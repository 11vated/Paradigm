import React, { useEffect, useState } from 'react';
import { useAgentThreads } from '@/stores/agentThreads';
import { kernelNow, kernelNowIso } from '@/lib/kernel/clock';

export const AgentFooter: React.FC = () => {
  const { threads, currentThreadId } = useAgentThreads();
  const thread = threads.find((t) => t.id === currentThreadId) ?? null;
  const turns = thread?.turns ?? [];
  const lastTurn = turns[turns.length - 1] ?? null;
  const streaming = lastTurn?.streaming ?? false;
  const turnCount = turns.length;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => (n + 1) % 60), 1000);
    return () => window.clearInterval(id);
  }, []);

  const lastAt = lastTurn?.at
    ? `${Math.round((kernelNow() - new Date(lastTurn.at).getTime()) / 1000)}s ago`
    : '—';

  return (
    <footer
      style={{
        height: 22,
        padding: '0 10px',
        borderTop: '1px solid var(--r-ink-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--r-font-num)',
        fontSize: 8,
        color: 'var(--r-ink-4)',
        letterSpacing: '0.06em',
        flexShrink: 0,
      }}
    >
      <span style={{ color: streaming ? 'var(--r-prism-core)' : 'var(--r-ink-4)' }}>
        {streaming ? 'streaming' : 'idle'}
      </span>
      <span style={{ color: 'var(--r-ink-4)' }}>·</span>
      <span>{turnCount} turns</span>
      <span style={{ color: 'var(--r-ink-4)' }}>·</span>
      <span>op · {lastAt}</span>
      <span style={{ color: 'var(--r-ink-4)' }}>·</span>
      <span>tick · {tick.toString().padStart(2, '0')}</span>
      <span style={{ color: 'var(--r-ink-4)' }}>·</span>
      <span>{kernelNowIso().slice(11, 19)} UTC</span>
      <span
        aria-hidden
        style={{
          marginLeft: 'auto',
          width: 3,
          height: 3,
          borderRadius: 9999,
          background: streaming ? 'var(--r-prism-core)' : 'var(--r-ink-4)',
          opacity: streaming ? (tick % 2 === 0 ? 1 : 0.2) : 0.5,
          transition: 'opacity 0.4s var(--r-ease)',
        }}
      />
    </footer>
  );
};
