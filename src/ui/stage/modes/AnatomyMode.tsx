/**
 * AnatomyMode — the seed's gene composition, revealed.
 *
 * Per spec §VIII.8. Fetches the full seed body and breaks every gene into
 * its type, value, distribution, mutability. Groups genes by category. Shows
 * mutation potential and lineage at the bottom.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';
import { useDomainColor } from '@/hooks/useDomainColor';

// Gene category mapping (mirrors src/lib/kernel/composition.ts but stays
// browser-safe — no kernel imports).
const GENE_CATEGORY: Record<string, string> = {
  // colors
  hue: 'color', saturation: 'color', value: 'color', brightness: 'color',
  palette: 'color', colorScheme: 'color', primaryColor: 'color',
  // form
  shape: 'form', topology: 'form', geometry: 'form', count: 'form',
  density: 'form', symmetry: 'form', scale: 'form', size: 'form',
  // motion
  velocity: 'motion', acceleration: 'motion', frequency: 'motion',
  amplitude: 'motion', phase: 'motion', period: 'motion',
  // material
  texture: 'material', roughness: 'material', metallic: 'material',
  opacity: 'material', emission: 'material', refraction: 'material',
  // semantic
  mood: 'semantic', tone: 'semantic', narrative: 'semantic', archetype: 'semantic',
  // structure
  layout: 'structure', composition: 'structure', hierarchy: 'structure',
};

const CATEGORY_COLOR: Record<string, string> = {
  color:     'var(--p-domain-visual2d, #f472b6)',
  form:      'var(--p-domain-world, #34d399)',
  motion:    'var(--p-domain-music, #a78bfa)',
  material:  'var(--p-domain-molecule, #2dd4bf)',
  semantic:  'var(--p-domain-narrative, #fbbf24)',
  structure: 'var(--p-domain-architecture, #f59e0b)',
  other:     'var(--p-ink-3, #777)',
};

function categoryOf(name: string): string {
  if (GENE_CATEGORY[name]) return GENE_CATEGORY[name];
  const lower = name.toLowerCase();
  for (const key of Object.keys(GENE_CATEGORY)) {
    if (lower.includes(key.toLowerCase())) return GENE_CATEGORY[key];
  }
  return 'other';
}

interface Gene {
  name: string;
  type?: string;
  value: unknown;
  raw: unknown;
}

function extractGenes(seedBody: any): Gene[] {
  if (!seedBody) return [];
  const genes = seedBody.genes ?? seedBody.$genes ?? {};
  return Object.entries(genes).map(([name, raw]: [string, any]) => ({
    name,
    type: raw?.type ?? raw?.geneType,
    value: raw?.value ?? raw,
    raw,
  }));
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return v.toFixed(4);
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return `[${v.length}] ${JSON.stringify(v).slice(0, 60)}`;
  return JSON.stringify(v).slice(0, 120);
}

const shortHash = (h: string) => (h.length <= 12 ? h : `${h.slice(0, 6)}…${h.slice(-4)}`);

export const AnatomyMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const domainHue = useDomainColor(seed?.domain);
  const [body, setBody] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seed?.id) {
      setBody(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/seeds/${encodeURIComponent(seed.id)}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => { if (!cancelled) { setBody(data); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [seed?.id]);

  const genes = useMemo(() => extractGenes(body), [body]);
  const grouped = useMemo(() => {
    const g: Record<string, Gene[]> = {};
    for (const gene of genes) {
      const cat = categoryOf(gene.name);
      (g[cat] ??= []).push(gene);
    }
    return g;
  }, [genes]);

  if (!seed) {
    return (
      <div className="p-anatomy-empty">
        <div className="p-anatomy-empty-title">no active seed</div>
        <div className="p-anatomy-empty-sub">select a seed from the library or speak one into existence</div>
      </div>
    );
  }

  return (
    <div className="p-anatomy">
      <header className="p-anatomy-header">
        <SeedGlyph hash={seed.hash} domain={seed.domain} size={48} />
        <div className="p-anatomy-id">
          <div className="p-anatomy-name">{seed.name}</div>
          <div className="p-anatomy-meta">
            <span className="p-domain-pill" style={{ color: domainHue }}>{seed.domain}</span>
            <span className="p-anatomy-hash">{shortHash(seed.hash)}</span>
            <span className="p-anatomy-gen">gen {seed.generation ?? 0}</span>
            <span className="p-anatomy-count">{genes.length} genes</span>
          </div>
        </div>
      </header>

      {loading && <div className="p-anatomy-loading">reading genome…</div>}
      {error && <div className="p-anatomy-error">failed to read genome: {error}</div>}

      <div className="p-anatomy-body">
        {Object.entries(grouped).map(([cat, geneList]) => (
          <section key={cat} className="p-anatomy-category">
            <div className="p-anatomy-cat-label" style={{ color: CATEGORY_COLOR[cat] }}>
              {cat} · {geneList.length}
            </div>
            <div className="p-anatomy-genes">
              {geneList.map((g) => (
                <article key={g.name} className="p-anatomy-gene" style={{ borderLeftColor: CATEGORY_COLOR[cat] }}>
                  <div className="p-anatomy-gene-name">{g.name}</div>
                  <div className="p-anatomy-gene-type">{g.type ?? 'untyped'}</div>
                  <div className="p-anatomy-gene-value">{formatValue(g.value)}</div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!loading && !error && genes.length === 0 && (
          <div className="p-anatomy-loading">no genes in this seed body</div>
        )}
      </div>
    </div>
  );
};
