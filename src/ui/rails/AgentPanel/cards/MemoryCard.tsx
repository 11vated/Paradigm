import React from 'react';
import { CardShell } from './CardShell';

interface MemoryCardProps {
  payload: { key?: string; value?: any; source?: string; timestamp?: string };
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ payload }) => (
  <CardShell label="Memory" tone="cool" aside={
    payload.timestamp ? <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 10, color: 'var(--r-ink-3)' }}>{payload.timestamp}</span> : undefined
  }>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontFamily: 'var(--r-font-display)', fontSize: 11 }}>
      {payload.key && (
        <>
          <span style={{ color: 'var(--r-ink-3)' }}>key</span>
          <span style={{ color: 'var(--r-ink-1)', fontFamily: 'var(--r-font-num)' }}>{payload.key}</span>
        </>
      )}
      {payload.source && (
        <>
          <span style={{ color: 'var(--r-ink-3)' }}>source</span>
          <span style={{ color: 'var(--r-ink-1)' }}>{payload.source}</span>
        </>
      )}
    </div>
    {payload.value !== undefined && (
      <pre style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--r-ink-2)', background: 'rgba(255,255,255,0.014)', padding: 6, borderRadius: 'var(--r-radius-1)', maxHeight: 120, overflow: 'auto', whiteSpace: 'pre' }}>
        {typeof payload.value === 'string' ? payload.value : JSON.stringify(payload.value, null, 2)}
      </pre>
    )}
  </CardShell>
);
