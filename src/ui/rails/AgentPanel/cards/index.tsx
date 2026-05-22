import React from 'react';
import type { SurfacedCard } from '@/stores/agentThreads';
import { PlanCard } from './PlanCard';
import { GsplSourceCard } from './GsplSourceCard';
import { ToolCallsCard } from './ToolCallsCard';
import { DiffCard } from './DiffCard';
import { CritiqueCard } from './CritiqueCard';
import { MemoryCard } from './MemoryCard';
import { SwarmCard } from './SwarmCard';
import { FederationCard } from './FederationCard';
import { SovereigntyCard } from './SovereigntyCard';

export const SurfacedCardView: React.FC<{ card: SurfacedCard }> = ({ card }) => {
  switch (card.kind) {
    case 'plan':
      return <PlanCard payload={card.payload as any} />;
    case 'gspl-source':
      return <GsplSourceCard payload={card.payload as any} />;
    case 'tool-calls':
      return <ToolCallsCard payload={card.payload as any} />;
    case 'diff':
      return <DiffCard payload={card.payload as any} />;
    case 'critique':
      return <CritiqueCard payload={card.payload as any} />;
    case 'memory':
      return <MemoryCard payload={card.payload as any} />;
    case 'swarm':
      return <SwarmCard payload={card.payload as any} />;
    case 'federation':
      return <FederationCard payload={card.payload as any} />;
    case 'sovereignty':
      return <SovereigntyCard payload={card.payload as any} />;
    default:
      return null;
  }
};
