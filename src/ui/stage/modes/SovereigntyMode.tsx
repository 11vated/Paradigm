/**
 * SovereigntyMode — Provenance · Signature · Export
 *
 * Left: SovereigntyReceipt (signature status, lineage, on-chain anchor, VCS history)
 * Right: ExportPanel (download in any format)
 */
import React from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { SovereigntyReceipt } from '@/components/studio/SovereigntyReceipt';
import { ExportPanel } from '@/components/studio/ExportPanel';

export const SovereigntyMode: React.FC = () => {
  const seed = useActiveSeed(s => s.seed);
  const domain = (seed as any)?.$domain ?? (seed as any)?.domain ?? 'unknown';

  if (!seed) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--r-ink-3)', fontSize: 12,
        fontFamily: 'var(--r-font-mono)',
      }}>
        No active seed. Select a seed to view its sovereignty receipt.
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gap: 0,
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Receipt */}
      <div style={{ overflowY: 'auto', padding: '16px', borderRight: '1px solid var(--r-ink-4)' }}>
        <SovereigntyReceipt seed={seed as any} seedId={(seed as any)?.id} />
      </div>

      {/* Export */}
      <div style={{ overflowY: 'auto', padding: '16px', background: 'var(--r-surface-0)' }}>
        <ExportPanel
          seed={seed as any}
          domain={domain}
          seedId={(seed as any)?.id}
        />
      </div>
    </div>
  );
};
