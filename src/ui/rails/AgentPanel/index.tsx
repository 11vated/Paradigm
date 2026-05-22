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
import { Fiducial } from '@/ui/primitives/Fiducial';

export const AgentPanel: React.FC = () => (
  <section
    aria-label="Paradigm Agent"
    className="r-pane"
    style={{
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 0,
      background: 'rgba(11, 13, 18, 0.65)',
      borderTop: 0,
      borderRight: 0,
      borderBottom: 0,
      borderLeft: '1px solid var(--r-ink-4)',
    }}
  >
    <Fiducial corners={['tl', 'tr']} />
    <AgentHeader />
    <BranchesRibbon />
    <LensTabs />
    <Conversation />
    <Composer />
    <AgentFooter />
  </section>
);
