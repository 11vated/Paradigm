import React from 'react';
import { ArtifactViewport } from './ArtifactViewport';
import { SubstrateField } from './SubstrateField';

export const CenterStage: React.FC = () => (
  <main aria-label="Living artifact" className="p-center">
    <ArtifactViewport />
  </main>
);

export default CenterStage;
