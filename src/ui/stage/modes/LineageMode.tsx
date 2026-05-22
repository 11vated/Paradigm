/**
 * LineageMode — seed family tree (not agent threads).
 */
import React, { useEffect, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { kernelSeedToActive } from '@/lib/ui/seedBridge';
import { listSeeds } from '@/services/api';
import LineageGraph from '@/components/studio/LineageGraph';

export const LineageMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const setSeed = useActiveSeed((s) => s.setSeed);
  const [seeds, setSeeds] = useState<unknown[]>([]);

  useEffect(() => {
    listSeeds()
      .then((list) => setSeeds(Array.isArray(list) ? list : []))
      .catch(() => setSeeds(seed ? [seed.raw ?? seed] : []));
  }, [seed?.id]);

  const current = seed?.raw ?? seed;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <header style={{ padding: '8px 12px', borderBottom: '1px solid var(--r-ink-4)', fontFamily: 'var(--r-font-display)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--r-ink-2)' }}>
        Lineage · family hyperobject
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LineageGraph
          seeds={seeds}
          currentSeed={current}
          onSelect={(s: Record<string, unknown>) => {
            const active = kernelSeedToActive(s);
            if (active) setSeed(active);
          }}
        />
      </div>
    </div>
  );
};
