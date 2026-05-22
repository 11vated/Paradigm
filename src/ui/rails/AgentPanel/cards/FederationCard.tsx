import React from 'react';
import { CardShell } from './CardShell';

interface FederationCardProps {
  payload: { protocol?: string; peers?: number; status?: string; message?: string; peerList?: Array<{ id: string; role: string; status: string }> };
}

export const FederationCard: React.FC<FederationCardProps> = ({ payload }) => (
  <CardShell label="Federation" tone="prism-resonant" aside={
    payload.peers !== undefined ? (
      <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 10, color: 'var(--r-prism-resonant)' }}>
        {payload.peers} peers
      </span>
    ) : undefined
  }>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontFamily: 'var(--r-font-display)', fontSize: 11 }}>
      {payload.protocol && (
        <>
          <span style={{ color: 'var(--r-ink-3)' }}>protocol</span>
          <span style={{ color: 'var(--r-ink-1)' }}>{payload.protocol}</span>
        </>
      )}
      {payload.status && (
        <>
          <span style={{ color: 'var(--r-ink-3)' }}>status</span>
          <span style={{ color: 'var(--r-ink-1)' }}>{payload.status}</span>
        </>
      )}
    </div>
    {payload.message && (
      <p style={{ margin: '8px 0 0', color: 'var(--r-ink-2)', fontSize: 11, lineHeight: 1.5 }}>
        {payload.message}
      </p>
    )}
    {payload.peerList?.length ? (
      <div style={{ marginTop: 8, display: 'grid', gap: 3 }}>
        {payload.peerList.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
            <span style={{ width: 4, height: 4, borderRadius: 9999, background: p.status === 'connected' ? 'var(--r-ok)' : 'var(--r-ink-4)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--r-font-num)', color: 'var(--r-ink-3)' }}>{p.id}</span>
            <span style={{ color: 'var(--r-ink-2)' }}>{p.role}</span>
          </div>
        ))}
      </div>
    ) : null}
  </CardShell>
);
