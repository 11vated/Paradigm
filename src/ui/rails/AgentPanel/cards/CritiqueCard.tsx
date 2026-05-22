import React from 'react';
import { CardShell } from './CardShell';

interface CritiqueCardProps {
  payload: { analysis?: string; score?: number; issues?: string[]; strengths?: string[] };
}

export const CritiqueCard: React.FC<CritiqueCardProps> = ({ payload }) => (
  <CardShell label="Critique" tone="prism-resonant" aside={
    payload.score !== undefined ? (
      <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 10, color: 'var(--r-prism-resonant)' }}>
        {payload.score}/10
      </span>
    ) : undefined
  }>
    {payload.analysis && (
      <p style={{ margin: 0, marginBottom: 8, color: 'var(--r-ink-1)', fontSize: 12, lineHeight: 1.5 }}>
        {payload.analysis}
      </p>
    )}
    {payload.strengths?.length ? (
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--r-font-display)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--r-ok)', marginBottom: 4 }}>strengths</div>
        <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--r-ink-1)', fontSize: 11, display: 'grid', gap: 2 }}>
          {payload.strengths.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    ) : null}
    {payload.issues?.length ? (
      <div>
        <div style={{ fontFamily: 'var(--r-font-display)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--r-warn)', marginBottom: 4 }}>issues</div>
        <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--r-ink-1)', fontSize: 11, display: 'grid', gap: 2 }}>
          {payload.issues.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    ) : null}
  </CardShell>
);
