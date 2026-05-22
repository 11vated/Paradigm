/**
 * SubstrateMode — 7-Dimensional Reality Renderer
 *
 * The full DimensionalViewer embedded in the CenterStage, showing the
 * active seed across all 7 substrate dimensions simultaneously:
 *   SPATIAL | TEMPORAL | SPECTRAL | MODAL | POSSIBLE | SEMANTIC | STRUCTURAL
 */
import React from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { DimensionalViewer } from '@/components/studio/DimensionalViewer';

export const SubstrateMode: React.FC = () => {
  const seed = useActiveSeed(s => s.seed);

  if (!seed) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--r-ink-3)', fontSize: 12,
        fontFamily: 'var(--r-font-mono)',
      }}>
        No active seed. Create or select a seed to render its substrate.
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <DimensionalViewer seed={seed as any} />
    </div>
  );
};
