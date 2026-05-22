import React, { useMemo } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';
import { useAgentThreads } from '@/stores/agentThreads';

export const LineageMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const { threads } = useAgentThreads();

  const tree = useMemo(() => {
    return threads.map((t) => ({
      id: t.id,
      title: t.title,
      turnCount: t.turns.length,
      turns: t.turns.map((u) => ({
        role: u.role,
        text: u.text.slice(0, 60),
        cards: u.cards?.length ?? 0,
      })),
    }));
  }, [threads]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: 'var(--r-px-4) var(--r-px-5)', borderBottom: '1px solid var(--r-ink-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.core }}>Lineage · Family Tree</span>
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-3)' }}>{tree.length} branch{tree.length !== 1 ? 'es' : ''}</span>
      </header>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--r-px-5)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tree.map((branch, bi) => (
          <div key={branch.id} style={{ borderLeft: `2px solid ${bi === 0 ? theme.core : theme.resonant}`, paddingLeft: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: bi === 0 ? theme.core : 'var(--r-ink-2)' }}>
                {branch.title}
              </span>
              <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 8, color: 'var(--r-ink-4)' }}>
                {branch.turnCount} turns
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {branch.turns.map((turn, ti) => (
                <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--r-font-num)', fontSize: 10, color: turn.role === 'agent' ? 'var(--r-prism-resonant)' : turn.role === 'user' ? 'var(--r-ink-1)' : 'var(--r-ink-3)' }}>
                  <span style={{ width: 4, height: 4, borderRadius: 9999, background: turn.role === 'agent' ? theme.resonant : turn.role === 'user' ? theme.core : 'var(--r-ink-4)', flexShrink: 0 }} />
                  <span style={{ minWidth: 32, fontSize: 8 }}>{turn.role}</span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{turn.text}</span>
                  {turn.cards > 0 && <span style={{ fontSize: 8, color: 'var(--r-ink-4)' }}>+{turn.cards}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {tree.length === 0 && (
          <span style={{ color: 'var(--r-ink-3)', fontSize: 11, fontStyle: 'italic' }}>no threads yet</span>
        )}
      </div>
    </div>
  );
};
