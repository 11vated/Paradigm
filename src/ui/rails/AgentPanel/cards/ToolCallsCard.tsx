import React from 'react';
import { CardShell } from './CardShell';

interface ToolCallsCardProps {
  payload: { intent?: string; latencyMs?: number; ok?: boolean; data?: any };
}

export const ToolCallsCard: React.FC<ToolCallsCardProps> = ({ payload }) => {
  const ok = payload.ok ?? true;
  return (
    <CardShell
      label="Tool Calls"
      tone={ok ? 'cool' : 'warm'}
      aside={
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 10, color: 'var(--r-ink-3)' }}>
          {payload.latencyMs ? `${payload.latencyMs}ms` : '—'}
        </span>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '4px 12px',
          fontFamily: 'var(--r-font-display)',
          fontSize: 11,
        }}
      >
        <span style={{ color: 'var(--r-ink-3)' }}>intent</span>
        <span style={{ color: 'var(--r-ink-1)' }}>{payload.intent ?? 'unknown'}</span>
        <span style={{ color: 'var(--r-ink-3)' }}>status</span>
        <span style={{ color: ok ? 'var(--r-ok)' : 'var(--r-fail)' }}>
          {ok ? 'ok' : 'failed'}
        </span>
      </div>
    </CardShell>
  );
};
