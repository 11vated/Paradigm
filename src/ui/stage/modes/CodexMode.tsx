/**
 * CodexMode — live GSPL source plate.
 */
import React, { Suspense, lazy } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { kernelSeedToActive } from '@/lib/ui/seedBridge';

const GSPLEditor = lazy(() => import('@/components/studio/GSPLEditor'));

export const CodexMode: React.FC = () => {
  const setSeed = useActiveSeed((s) => s.setSeed);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <header style={{ padding: '8px 12px', borderBottom: '1px solid var(--r-ink-4)', fontFamily: 'var(--r-font-display)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--r-ink-2)' }}>
        Codex · live GSPL inscription
      </header>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Suspense fallback={<div style={{ padding: 12, color: 'var(--r-ink-3)' }}>loading codex…</div>}>
          <GSPLEditor
            onSeedFromGSPL={(s: Record<string, unknown>) => {
              const active = kernelSeedToActive(s);
              if (active) setSeed(active);
            }}
          />
        </Suspense>
      </div>
    </div>
  );
};
