import React from 'react';
import { CardShell } from './CardShell';

interface Stage { name: string; status: 'pending' | 'running' | 'complete' | 'error'; note?: string }
interface Props { payload: { seedName?: string; seedDomain?: string; stages?: Stage[] } }

const STATUS_COLOR: Record<string, string> = {
  pending:  'var(--p-ink-3)',
  running:  'var(--p-prism-amber)',
  complete: 'var(--p-prism-emerald)',
  error:    'var(--p-prism-rose)',
};

export const PlanCard: React.FC<Props> = ({ payload }) => {
  const stages = payload?.stages ?? [];
  return (
    <CardShell label="Construction Plan">
      <div className="p-plan-card">
        {payload?.seedName && (
          <div className="p-plan-target">
            <span className="p-plan-label">target</span>
            <span className="p-plan-value">{payload.seedName}</span>
            <span className="p-domain-pill">{payload.seedDomain}</span>
          </div>
        )}
        <ol className="p-plan-stages">
          {stages.map((s, i) => (
            <li key={s.name} className="p-plan-stage">
              <span className="p-plan-stage-idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="p-plan-stage-dot" style={{ background: STATUS_COLOR[s.status] }} />
              <span className="p-plan-stage-name">{s.name}</span>
              {s.note && <span className="p-plan-stage-note">{s.note}</span>}
            </li>
          ))}
        </ol>
      </div>
    </CardShell>
  );
};
