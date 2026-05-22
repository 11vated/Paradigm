import React from 'react';
import { CardShell } from './CardShell';

interface GsplSourceCardProps {
  payload: { kind?: string; seed?: any; gspl?: string };
}

export const GsplSourceCard: React.FC<GsplSourceCardProps> = ({ payload }) => {
  const text = payload.gspl
    ? payload.gspl
    : payload.seed
      ? JSON.stringify(payload.seed, null, 2)
      : '';
  return (
    <CardShell label="GSPL Source" tone="prism-resonant">
      <pre
        style={{
          margin: 0,
          padding: 10,
          background: 'rgba(255,255,255,0.014)',
          border: '1px solid var(--r-ink-4)',
          borderRadius: 'var(--r-radius-1)',
          fontFamily: 'var(--r-font-display)',
          fontSize: 11,
          color: 'var(--r-ink-1)',
          maxHeight: 220,
          overflow: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {text || '// no source emitted'}
      </pre>
    </CardShell>
  );
};
