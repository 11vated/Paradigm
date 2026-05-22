/**
 * EvolutionMode — MAP-Elites live quality-diversity explorer
 *
 * Left panel: MAP-Elites 16×16 archive grid for the active seed's domain
 * Right panel: fitness axes, population stats, algorithm selector
 * Bottom: selected cell detail + evolve controls
 */
import React, { useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { MapElitesPanel } from '@/components/studio/MapElitesPanel';
import { kernelSeedToActive } from '@/lib/ui/seedBridge';

export const EvolutionMode: React.FC = () => {
  const { seed, setSeed } = useActiveSeed();
  const domain = (seed as any)?.$domain ?? (seed as any)?.domain ?? 'visual2d';
  const [algorithm, setAlgorithm] = useState<'map-elites' | 'ga' | 'cmaes' | 'poet'>('map-elites');
  const [stats, setStats] = useState({ cells: 0, generation: 0, bestFitness: 0 });

  function handleSelectSeed(candidate: Record<string, unknown>) {
    const active = kernelSeedToActive(candidate as any);
    setSeed(active);
  }

  const ALGOS = [
    { key: 'map-elites', label: 'MAP-Elites',    desc: 'Quality-diversity grid' },
    { key: 'ga',         label: 'Genetic Alg.',  desc: 'Tournament selection' },
    { key: 'cmaes',      label: 'CMA-ES',         desc: 'Covariance adaptation' },
    { key: 'poet',       label: 'POET',           desc: 'Open-ended co-evolution' },
  ] as const;

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--r-surface-0)' }}>
      {/* Main archive grid */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <MapElitesPanel
          domain={domain}
          seed={seed as any}
          onSelectSeed={handleSelectSeed}
        />
      </div>

      {/* Right sidebar */}
      <div
        style={{
          width: 200,
          borderLeft: '1px solid var(--r-ink-4)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
        }}
      >
        {/* Algorithm selector */}
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--r-ink-3)', marginBottom: 8 }}>
            Algorithm
          </div>
          {ALGOS.map(a => (
            <button
              key={a.key}
              onClick={() => setAlgorithm(a.key as any)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 8px', marginBottom: 4, borderRadius: 6,
                background: algorithm === a.key ? 'var(--r-ink-4)' : 'transparent',
                border: '1px solid ' + (algorithm === a.key ? 'var(--r-ink-3)' : 'transparent'),
                color: algorithm === a.key ? 'var(--r-ink-1)' : 'var(--r-ink-2)',
                cursor: 'pointer', fontSize: 11,
              }}
            >
              <div style={{ fontWeight: 600 }}>{a.label}</div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{a.desc}</div>
            </button>
          ))}
        </div>

        {/* Domain info */}
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--r-ink-3)', marginBottom: 6 }}>
            Domain
          </div>
          <div style={{ fontSize: 12, color: 'var(--r-ink-1)', fontFamily: 'var(--r-font-num)' }}>
            {domain}
          </div>
        </div>

        {/* Hint */}
        <div style={{ fontSize: 10, color: 'var(--r-ink-3)', lineHeight: 1.5, marginTop: 'auto' }}>
          Click any cell in the archive to inspect its seed. Toggle Evolve to run continuous evolution.
          The active seed is automatically seeded as the initial population.
        </div>
      </div>
    </div>
  );
};
