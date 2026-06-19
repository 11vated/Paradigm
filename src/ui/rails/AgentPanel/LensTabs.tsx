import React from 'react';
import { useAgentThreads } from '@/stores/agentThreads';

type Lens = 'conversation' | 'plan' | 'source' | 'tools' | 'memory' | 'branches' | 'evolve' | 'lineage';

const LENSES: Array<{ id: Lens; label: string }> = [
  { id: 'conversation', label: 'Conversation' },
  { id: 'plan',         label: 'Plan' },
  { id: 'source',       label: 'Source' },
  { id: 'tools',        label: 'Tools' },
  { id: 'memory',       label: 'Memory' },
  { id: 'branches',     label: 'Branches' },
  { id: 'evolve',       label: 'Evolve' },
  { id: 'lineage',      label: 'Lineage' },
];

export const LensTabs: React.FC = () => {
  const lens = useAgentThreads((s) => s.lens);
  const setLens = useAgentThreads((s) => s.setLens);

  return (
    <nav role="tablist" className="r-agent-tabs p-agent-tabs">
      {LENSES.map((l) => {
        const active = lens === l.id;
        return (
          <button
            key={l.label}
            role="tab"
            aria-selected={active}
            className="r-agent-tab p-agent-tab"
            data-active={active}
            onClick={() => setLens(l.id)}
          >
            {l.label}
          </button>
        );
      })}
    </nav>
  );
};
