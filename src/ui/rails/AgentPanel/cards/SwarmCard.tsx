import React from 'react';
import { CardShell } from './CardShell';

interface SwarmCardProps {
  payload: { agentCount?: number; objective?: string; agents?: Array<{ id: string; task: string; status: string }> };
}

export const SwarmCard: React.FC<SwarmCardProps> = ({ payload }) => {
  const ok = (payload.agents ?? []).filter((a) => a.status === 'done').length;
  return (
    <CardShell label="Swarm" tone="prism-core" aside={
      payload.agentCount !== undefined ? (
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 10, color: 'var(--r-prism-core)' }}>
          {ok}/{payload.agentCount} agents
        </span>
      ) : undefined
    }>
      {payload.objective && (
        <p style={{ margin: 0, marginBottom: 8, color: 'var(--r-ink-1)', fontSize: 12 }}>
          {payload.objective}
        </p>
      )}
      {payload.agents?.length ? (
        <div style={{ display: 'grid', gap: 4 }}>
          {payload.agents.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: a.status === 'done' ? 'var(--r-ok)' : a.status === 'working' ? 'var(--r-prism-core)' : 'var(--r-ink-4)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--r-font-num)', color: 'var(--r-ink-3)', minWidth: 60 }}>{a.id}</span>
              <span style={{ color: 'var(--r-ink-1)', flex: 1 }}>{a.task}</span>
              <span style={{ color: 'var(--r-ink-3)', fontFamily: 'var(--r-font-num)' }}>{a.status}</span>
            </div>
          ))}
        </div>
      ) : null}
    </CardShell>
  );
};
