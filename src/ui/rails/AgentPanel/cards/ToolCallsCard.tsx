import React from 'react';
import { CardShell } from './CardShell';

interface Call { id: string; method: string; path: string; durationMs?: number; status: 'ok' | 'error' | 'pending'; httpStatus?: number; startedAt: number }
interface Props { payload: { calls?: Call[] } }

const STATUS_COLOR: Record<string, string> = {
  ok:      'var(--p-prism-emerald)',
  error:   'var(--p-prism-rose)',
  pending: 'var(--p-prism-amber)',
};

export const ToolCallsCard: React.FC<Props> = ({ payload }) => {
  const calls = payload?.calls ?? [];
  return (
    <CardShell label="Tool Calls">
      <div className="p-tools-card">
        {calls.length === 0 ? (
          <div className="p-tools-empty">No tool calls yet.</div>
        ) : (
          <ul className="p-tools-list">
            {calls.map((c) => (
              <li key={c.id} className="p-tools-row">
                <span className="p-tools-dot" style={{ background: STATUS_COLOR[c.status] }} />
                <span className="p-tools-method">{c.method}</span>
                <span className="p-tools-path">{c.path}</span>
                <span className="p-tools-meta">{c.durationMs != null ? `${c.durationMs}ms` : '—'}{c.httpStatus ? ` · ${c.httpStatus}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CardShell>
  );
};
