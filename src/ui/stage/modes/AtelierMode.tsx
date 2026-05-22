/**
 * AtelierMode — Crucible + floating tool panels (studio components).
 */
import React, { useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { kernelSeedToActive } from '@/lib/ui/seedBridge';
import { CrucibleMode } from './CrucibleMode';
import GeneEditor from '@/components/studio/GeneEditor';
import GSPLEditor from '@/components/studio/GSPLEditor';

type PanelId = 'genes' | 'gspl';

const PANELS: { id: PanelId; label: string }[] = [
  { id: 'genes', label: 'Genes' },
  { id: 'gspl', label: 'GSPL' },
];

export const AtelierMode: React.FC = () => {
  const [open, setOpen] = useState<Set<PanelId>>(new Set(['genes']));
  const seed = useActiveSeed((s) => s.seed);
  const setSeed = useActiveSeed((s) => s.setSeed);

  const toggle = (id: PanelId) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const studioSeed = seed?.raw ?? seed;

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <CrucibleMode />

      <div
        style={{
          position: 'absolute',
          top: 48,
          left: 12,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          zIndex: 20,
        }}
      >
        {PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="r-chip"
            onClick={() => toggle(p.id)}
            style={{
              cursor: 'pointer',
              borderColor: open.has(p.id) ? 'var(--r-prism-core)' : 'var(--r-ink-4)',
              fontSize: 9,
            }}
          >
            {open.has(p.id) ? '▾' : '▸'} {p.label}
          </button>
        ))}
        <span className="r-chip" style={{ fontSize: 8, color: 'var(--r-ink-3)' }}>
          b breed · c compose · e evolve — ask agent
        </span>
      </div>

      {open.has('genes') && studioSeed && (
        <div
          className="r-pane"
          style={{
            position: 'absolute',
            right: 12,
            top: 80,
            width: 280,
            maxHeight: '45%',
            overflow: 'auto',
            zIndex: 15,
          }}
        >
          <GeneEditor
            seed={studioSeed}
            onSeedUpdated={(s: Record<string, unknown>) => {
              const active = kernelSeedToActive(s);
              if (active) setSeed(active);
            }}
          />
        </div>
      )}
      {open.has('gspl') && (
        <div
          className="r-pane"
          style={{
            position: 'absolute',
            left: 12,
            bottom: 48,
            width: 360,
            height: 220,
            overflow: 'hidden',
            zIndex: 15,
          }}
        >
          <GSPLEditor
            onSeedFromGSPL={(s: Record<string, unknown>) => {
              const active = kernelSeedToActive(s);
              if (active) setSeed(active);
            }}
          />
        </div>
      )}
    </div>
  );
};
