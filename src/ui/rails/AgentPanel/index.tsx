/**
 * AgentPanel — full-height GSPL agent column.
 *
 * Anatomy:
 *   ┌── Header (identity · kernel state · status · prism band)
 *   ├── BranchesRibbon (only if >1 thread)
 *   ├── LensTabs (Conversation · Plan · Source · Tools · Memory · Branches)
 *   ├── Conversation (scrollable, surfaced cards inline)
 *   ├── Composer (multiline · slash chips · transmit)
 *   └── Footer (kernel-clock pulse · golden status)
 */
import React from 'react';
import { AgentHeader } from './Header';
import { LensTabs } from './LensTabs';
import { BranchesRibbon } from './BranchesRibbon';
import { Conversation } from './Conversation';
import { Composer } from './Composer';
import { AgentFooter } from './Footer';

export const AgentPanel: React.FC = () => (
  <section
    aria-label="Paradigm Agent"
    className="r-agent"
  >
    <AgentHeader />
    <BranchesRibbon />
    <LensTabs />
    <Conversation />
    <Composer />
    <AgentFooter />
  </section>
);
