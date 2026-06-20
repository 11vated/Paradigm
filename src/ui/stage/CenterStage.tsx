import React from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { ArtifactViewport } from './ArtifactViewport';
import { SubstrateField } from '@/ui/stage/SubstrateField';

export const CenterStage: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const artifact = useActiveSeed((s) => s.artifact);

  return (
    <main aria-label="Living artifact" className="p-center">
      {/* Substrate field (animated background) */}
      <SubstrateField />

      {/* Artifact viewport - single, domain-dispatched */}
      <ArtifactViewport seed={seed} artifact={artifact} />
    </main>
  );
};

export default CenterStage;