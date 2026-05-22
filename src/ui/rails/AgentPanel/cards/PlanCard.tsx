import React from 'react';
import { CardShell } from './CardShell';

interface PlanCardProps {
  payload: { steps?: string[]; summary?: string };
  onGrow?: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ payload, onGrow }) => (
  <CardShell label="Plan" tone="prism-core">
    {payload.summary && (
      <p style={{ margin: 0, marginBottom: 8, color: 'var(--r-ink-1)', fontSize: 12, fontFamily: 'var(--r-font-prose)' }}>
        {payload.summary}
      </p>
    )}
    {payload.steps?.length ? (
      <ol
        style={{
          margin: 0,
          paddingLeft: 18,
          color: 'var(--r-ink-1)',
          fontSize: 12,
          display: 'grid',
          gap: 4,
        }}
      >
        {payload.steps.map((s, i) => (
          <li key={i} style={{ lineHeight: 1.45 }}>
            {s}
          </li>
        ))}
      </ol>
    ) : null}
    {onGrow && (
      <button
        type="button"
        className="r-btn"
        data-tone="primary"
        onClick={onGrow}
        style={{ marginTop: 10, height: 26, fontSize: 10, width: '100%' }}
      >
        Enter to grow →
      </button>
    )}
  </CardShell>
);
