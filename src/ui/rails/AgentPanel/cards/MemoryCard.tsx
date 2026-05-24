import React from 'react';
import { CardShell } from './CardShell';

interface Props { payload: { working?: number; episodic?: number; semantic?: number; world?: number; note?: string } }

const LAYERS: { key: 'working' | 'episodic' | 'semantic' | 'world'; label: string; hint: string; hue: string }[] = [
  { key: 'working',  label: 'WORKING',  hint: 'L1 · ephemeral', hue: 'var(--p-prism-amber)' },
  { key: 'episodic', label: 'EPISODIC', hint: 'L2 · session',    hue: 'var(--p-prism-emerald)' },
  { key: 'semantic', label: 'SEMANTIC', hint: 'L3 · canonical',  hue: 'var(--p-prism-violet)' },
  { key: 'world',    label: 'WORLD',    hint: 'L4 · long-term',  hue: 'var(--p-prism-cyan)' },
];

export const MemoryCard: React.FC<Props> = ({ payload }) => {
  return (
    <CardShell label="Memory Retrievals">
      <div className="p-memory-card">
        <div className="p-memory-grid">
          {LAYERS.map((l) => {
            const v = (payload?.[l.key] ?? 0) as number;
            return (
              <div key={l.key} className="p-memory-cell">
                <div className="p-memory-cell-head">
                  <span className="p-memory-cell-dot" style={{ background: l.hue }} />
                  <span className="p-memory-cell-label">{l.label}</span>
                </div>
                <div className="p-memory-cell-value">{v}</div>
                <div className="p-memory-cell-hint">{l.hint}</div>
              </div>
            );
          })}
        </div>
        {payload?.note && <div className="p-memory-note">{payload.note}</div>}
      </div>
    </CardShell>
  );
};
