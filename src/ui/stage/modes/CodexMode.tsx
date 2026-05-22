import React, { useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';

const GENERATOR_CATEGORIES: Array<{ name: string; count: number; domains: string[] }> = [
  { name: 'Core', count: 12, domains: ['agent', 'character', 'audio', 'animation', 'architecture', 'fashion', 'circuit', 'coffee', 'dance', 'consciousness', 'ecosystem', 'alife'] },
  { name: 'Industry', count: 76, domains: ['6g', '5g', '3d-printing', 'aerospace', 'agriculture', 'agtech', 'ar', 'art', 'automotive', 'av', 'battery', 'beer', 'biomedical', 'biotechnology', 'blockchain', 'chemical', 'city', 'climate', 'cloud', 'cosmetics', 'cybersecurity', 'data-science', 'devops', 'drone-delivery', 'drones', 'drug', 'edtech', 'education', 'electronics', 'energy', 'event-planning', 'advertising'] },
];

const GSPL_KEYWORDS = [
  'mutate', 'breed', 'crossover', 'evolve', 'compose', 'grow',
  'sign', 'verify', 'mint', 'list', 'critique', 'replay',
  'dream', 'swarm', 'fork', 'memory',
];

export const CodexMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const [tab, setTab] = useState<'generators' | 'gspl'>('generators');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: 'var(--r-px-4) var(--r-px-5)', borderBottom: '1px solid var(--r-ink-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.core }}>Codex · Generator Library</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(['generators', 'gspl'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="r-chip" style={{ cursor: 'pointer', fontSize: 8, padding: '0 6px', borderColor: tab === t ? theme.core : 'var(--r-ink-4)', color: tab === t ? theme.core : 'var(--r-ink-2)' }}>
              {t}
            </button>
          ))}
        </span>
      </header>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--r-px-5)', display: 'grid', gap: 8, alignContent: 'start' }}>
        {tab === 'generators' ? (
          GENERATOR_CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <div style={{ fontFamily: 'var(--r-font-display)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--r-ink-2)', marginBottom: 6 }}>
                {cat.name} · {cat.count} generators
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {cat.domains.map((d) => (
                  <span key={d} className="r-chip" style={{ fontSize: 9, padding: '2px 6px', borderColor: 'var(--r-ink-4)', color: seed?.domain === d ? theme.core : 'var(--r-ink-2)' }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div>
            <div style={{ fontFamily: 'var(--r-font-display)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--r-ink-2)', marginBottom: 6 }}>
              GSPL builtins · {GSPL_KEYWORDS.length} keywords
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {GSPL_KEYWORDS.map((k) => (
                <span key={k} className="r-chip" style={{ fontSize: 9, padding: '2px 6px', borderColor: 'var(--r-ink-4)', color: 'var(--r-prism-resonant)' }}>
                  {k}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 12, fontFamily: 'var(--r-font-num)', fontSize: 10, color: 'var(--r-ink-3)', lineHeight: 1.6 }}>
              <p>GSPL (Generative Seed Programming Language) is the founding invention of Paradigm Absolute. Every program is a typed seed whose execution is fully deterministic.</p>
              <p style={{ marginTop: 8 }}>Same input + same RNG state = bit-identical output forever. The interpreter runs inside the kernel's xoshiro256** RNG fork for full replayability.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
