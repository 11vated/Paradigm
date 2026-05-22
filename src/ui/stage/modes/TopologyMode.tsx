/**
 * TopologyMode — functor neighborhood via TopologyViewer.
 */
import React, { Suspense, lazy } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';

const TopologyViewer = lazy(() => import('@/components/studio/TopologyViewer'));

export const TopologyMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <header style={{ padding: '8px 12px', borderBottom: '1px solid var(--r-ink-4)', fontFamily: 'var(--r-font-display)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--r-ink-2)' }}>
        Topology · functor neighborhood
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Suspense fallback={<div style={{ padding: 12, color: 'var(--r-ink-3)' }}>loading topology…</div>}>
          <TopologyViewer seed={seed?.raw ?? seed} artifact={null} />
        </Suspense>
      </div>
    </div>
  );
};
