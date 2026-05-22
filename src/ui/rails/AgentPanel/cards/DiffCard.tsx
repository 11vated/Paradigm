import React from 'react';
import { CardShell } from './CardShell';

interface DiffCardProps {
  payload: { field?: string; before?: any; after?: any; summary?: string };
}

export const DiffCard: React.FC<DiffCardProps> = ({ payload }) => (
  <CardShell label="Diff" tone="warm" aside={
    payload.field ? <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 10, color: 'var(--r-ink-3)' }}>{payload.field}</span> : undefined
  }>
    {payload.summary && (
      <p style={{ margin: 0, marginBottom: 8, color: 'var(--r-ink-1)', fontSize: 12 }}>
        {payload.summary}
      </p>
    )}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {payload.before !== undefined && (
        <div>
          <div style={{ fontFamily: 'var(--r-font-display)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--r-warn)', marginBottom: 4 }}>before</div>
          <pre style={{ margin: 0, fontSize: 10, color: 'var(--r-ink-2)', background: 'rgba(255,255,255,0.014)', padding: 6, borderRadius: 'var(--r-radius-1)', maxHeight: 120, overflow: 'auto', whiteSpace: 'pre' }}>
            {typeof payload.before === 'string' ? payload.before : JSON.stringify(payload.before, null, 2)}
          </pre>
        </div>
      )}
      {payload.after !== undefined && (
        <div>
          <div style={{ fontFamily: 'var(--r-font-display)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--r-ok)', marginBottom: 4 }}>after</div>
          <pre style={{ margin: 0, fontSize: 10, color: 'var(--r-ink-2)', background: 'rgba(255,255,255,0.014)', padding: 6, borderRadius: 'var(--r-radius-1)', maxHeight: 120, overflow: 'auto', whiteSpace: 'pre' }}>
            {typeof payload.after === 'string' ? payload.after : JSON.stringify(payload.after, null, 2)}
          </pre>
        </div>
      )}
    </div>
  </CardShell>
);
