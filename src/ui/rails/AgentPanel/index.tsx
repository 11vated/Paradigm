import React from 'react';
import { useAgentThreads } from '@/stores/agentThreads';
import { AgentHeader } from './Header';
import { LensTabs } from './LensTabs';
import { BranchesRibbon } from './BranchesRibbon';
import { GsplStrip } from './GsplStrip';
import { Conversation } from './Conversation';
import { EvolveTab } from './EvolveTab';
import { LineageTab } from './LineageTab';
import { Composer } from './Composer';
import { AgentFooter } from './Footer';

export const AgentPanel: React.FC = () => {
  const lens = useAgentThreads((s) => s.lens);

  const content = lens === 'evolve' ? <EvolveTab /> :
    lens === 'lineage' ? <LineageTab /> : <Conversation />;

  return (
    <section aria-label="Paradigm Agent" className="r-agent">
      <AgentHeader />
      <BranchesRibbon />
      <GsplStrip />
      <LensTabs />
      {content}
      <Composer />
      <AgentFooter />
    </section>
  );
};
