/**
 * AgentPanel — full-height GSPL agent column.
 *
 * Anatomy:
 *   ┌── Header (identity · kernel state · status · prism band)
 *   ├── BranchesRibbon (only if >1 thread)
 *   ├── GsplStrip (persistent — latest GSPL code, click to expand)
 *   ├── LensTabs (Conversation · Plan · Source · Tools · Memory · Branches)
 *   ├── Conversation (scrollable, surfaced cards inline)
 *   ├── Composer (multiline · slash chips · tier selector · transmit)
 *   └── Footer (kernel-clock pulse · golden status)
 */
import React from 'react';
import { AgentHeader } from './Header';
import { LensTabs } from './LensTabs';
import { BranchesRibbon } from './BranchesRibbon';
import { GsplStrip } from './GsplStrip';
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
    <GsplStrip />
    <LensTabs />
    <Conversation />
    <Composer />
    <AgentFooter />
  </section>
);
