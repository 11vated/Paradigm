import React from 'react';
import { CardShell } from './CardShell';

interface SovereigntyCardProps {
  payload: { action?: string; signed?: boolean; fingerprint?: string; signer?: string; timestamp?: string };
}

export const SovereigntyCard: React.FC<SovereigntyCardProps> = ({ payload }) => {
  const ok = payload.signed ?? false;
  return (
    <CardShell label="Sovereignty" tone={ok ? 'cool' : 'warm'} aside={
      <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 10, color: ok ? 'var(--r-ok)' : 'var(--r-warn)' }}>
        {ok ? 'signed' : 'unsigned'}
      </span>
    }>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontFamily: 'var(--r-font-display)', fontSize: 11 }}>
        {payload.action && (
          <>
            <span style={{ color: 'var(--r-ink-3)' }}>action</span>
            <span style={{ color: 'var(--r-ink-1)' }}>{payload.action}</span>
          </>
        )}
        {payload.signer && (
          <>
            <span style={{ color: 'var(--r-ink-3)' }}>signer</span>
            <span style={{ color: 'var(--r-ink-1)', fontFamily: 'var(--r-font-num)' }}>{payload.signer}</span>
          </>
        )}
        {payload.fingerprint && (
          <>
            <span style={{ color: 'var(--r-ink-3)' }}>fingerprint</span>
            <span style={{ color: 'var(--r-ink-2)', fontFamily: 'var(--r-font-num)', fontSize: 10, wordBreak: 'break-all' }}>{payload.fingerprint}</span>
          </>
        )}
        {payload.timestamp && (
          <>
            <span style={{ color: 'var(--r-ink-3)' }}>at</span>
            <span style={{ color: 'var(--r-ink-2)', fontFamily: 'var(--r-font-num)' }}>{payload.timestamp}</span>
          </>
        )}
      </div>
    </CardShell>
  );
};
