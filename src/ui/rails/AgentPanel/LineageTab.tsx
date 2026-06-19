import React, { useCallback, useEffect, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useDomainColor } from '@/hooks/useDomainColor';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';

interface LineageEntry {
  id: string;
  hash: string;
  name?: string;
  domain: string;
  generation: number;
  operation: string;
  parents?: string[];
  depth: number;
}

const OP_GLYPH: Record<string, string> = {
  primordial: '◉',
  mutate: '⟳',
  breed: '⊕',
  compose: '⬡',
  evolve: '✦',
};

export const LineageTab: React.FC = () => {
  const { seed } = useActiveSeed();
  const setSeed = useActiveSeed((s: any) => s.setSeed);
  const accent = useDomainColor(seed?.domain);

  const [ancestors, setAncestors] = useState<LineageEntry[]>([]);
  const [descendants, setDescendants] = useState<LineageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seed) { setAncestors([]); setDescendants([]); return; }
    setLoading(true); setError(null);
    Promise.all([
      fetch(`/api/seeds/${seed.id}/lineage`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/seeds/${seed.id}/descendants`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([anc, des]) => {
      setAncestors(Array.isArray(anc) ? anc : (anc.lineage ?? anc.ancestors ?? []));
      setDescendants(Array.isArray(des) ? des : (des.descendants ?? []));
    }).catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, [seed?.id]);

  const activate = useCallback((entry: LineageEntry) => {
    setSeed({
      id: entry.id, name: entry.name ?? entry.id,
      domain: entry.domain, hash: entry.hash,
      generation: entry.generation,
    });
  }, [setSeed]);

  if (!seed) {
    return (
      <div className="p-lineage-empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--p-ink-3)', fontSize: 12 }}>
        Select a seed to see its lineage.
      </div>
    );
  }

  return (
    <div className="p-lineage" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', '--p-accent': accent } as React.CSSProperties}>
      <header className="p-lineage-header">
        <span className="p-lineage-label">lineage</span>
        <span className="p-lineage-meta">
          {loading ? 'loading…' : `${ancestors.length} ancestor${ancestors.length === 1 ? '' : 's'} · ${descendants.length} descendant${descendants.length === 1 ? '' : 's'}`}
        </span>
      </header>

      {error && <div className="p-lineage-error">{error}</div>}

      <div className="p-lineage-body" style={{ flex: 1, overflowY: 'auto' }}>
        <section className="p-lineage-section">
          <h3 className="p-lineage-section-label">ancestors · ↑</h3>
          {ancestors.length === 0 && !loading && (
            <div className="p-lineage-empty-section">no ancestors · primordial</div>
          )}
          {ancestors.map((a) => (
            <button key={a.id ?? a.hash} className="p-lineage-row" onClick={() => activate(a)} data-active={a.hash === seed.hash}>
              <SeedGlyph hash={a.hash} domain={a.domain} size={28} />
              <div className="p-lineage-row-main">
                <div className="p-lineage-row-name">{a.name ?? a.id ?? a.hash.slice(0, 12)}</div>
                <div className="p-lineage-row-sub">
                  <span className="p-lineage-domain">{a.domain}</span>
                  <span className="p-lineage-op">{OP_GLYPH[a.operation] ?? '·'} {a.operation}</span>
                  <span className="p-lineage-gen">gen {a.generation}</span>
                </div>
              </div>
              <span className="p-lineage-depth">d{a.depth ?? 0}</span>
            </button>
          ))}
        </section>

        <section className="p-lineage-section">
          <h3 className="p-lineage-section-label">descendants · ↓</h3>
          {descendants.length === 0 && !loading && (
            <div className="p-lineage-empty-section">no descendants · run /mutate or /breed</div>
          )}
          {descendants.map((d) => (
            <button key={d.id ?? d.hash} className="p-lineage-row" onClick={() => activate(d)}>
              <SeedGlyph hash={d.hash} domain={d.domain} size={28} />
              <div className="p-lineage-row-main">
                <div className="p-lineage-row-name">{d.name ?? d.id ?? d.hash.slice(0, 12)}</div>
                <div className="p-lineage-row-sub">
                  <span className="p-lineage-domain">{d.domain}</span>
                  <span className="p-lineage-op">{OP_GLYPH[d.operation] ?? '·'} {d.operation}</span>
                  <span className="p-lineage-gen">gen {d.generation}</span>
                </div>
              </div>
              <span className="p-lineage-depth">d{d.depth ?? 0}</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
};
