import React from 'react';
import type { SurfacedCard } from '@/stores/agentThreads';
import { useActiveSeed } from '@/stores/activeSeed';
import { kernelSeedToActive } from '@/lib/ui/seedBridge';
import { generateSeed } from '@/services/api';
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
  const setSeed = useActiveSeed((s) => s.setSeed);

  const _growFromPlan = async () => {
    try {
      const created = await generateSeed('plan grow', 'character');
      const active = kernelSeedToActive(created as Record<string, unknown>);
      if (active) setSeed(active);
    } catch {
      /* user may retry via agent */
    }
  };

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
