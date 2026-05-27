/**
 * ExplorePage — Doctrine v2 Part VIII.14 (Public Corpus Browser).
 *
 * Public-facing surface for the commons corpus. Pages through the
 * `data/commons/` index via /api/commons, filters by domain +
 * provenance + free-text search, and shows the seed's full body when
 * an entry is clicked.
 *
 * No state lives in this component beyond what the URL conveys; the
 * server is the source of truth.
 */
import { useEffect, useMemo, useState } from 'react';

interface IndexEntry {
  id: string;
  name: string;
  domain: string;
  hash: string;
  description?: string;
  tags?: string[];
  provenance?: string;
  fitness?: number;
  created?: string;
}

interface ListResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  items: IndexEntry[];
}

interface StatsResponse {
  total: number;
  curated: number;
  generated: number;
  domains: Array<{ domain: string; count: number }>;
  provenance: Array<{ provenance: string; count: number }>;
  updated: string | null;
}

interface SeedResponse {
  entry: IndexEntry;
  seed: Record<string, unknown>;
}

const PAGE_SIZE = 24;

const COLORS: Record<string, string> = {
  music: '#22d3ee',
  visual2d: '#6366f1',
  character: '#f97316',
  game: '#10b981',
  agent: '#a78bfa',
  narrative: '#e2e8f0',
  physics: '#4ade80',
  shader: '#8b5cf6',
  particle: '#fb923c',
  architecture: '#06b6d4',
};

function color(domain: string): string {
  return COLORS[domain] ?? '#64748b';
}

export default function ExplorePage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [domain, setDomain] = useState<string>('');
  const [provenance, setProvenance] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'fitness' | 'name' | 'created'>('fitness');
  const [page, setPage] = useState<number>(0);
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selected, setSelected] = useState<SeedResponse | null>(null);
  const [seedLoading, setSeedLoading] = useState<boolean>(false);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (domain) p.set('domain', domain);
    if (provenance) p.set('provenance', provenance);
    if (query.trim()) p.set('q', query.trim());
    p.set('sortBy', sortBy);
    p.set('page', String(page));
    p.set('pageSize', String(PAGE_SIZE));
    return p.toString();
  }, [domain, provenance, query, sortBy, page]);

  useEffect(() => {
    fetch('/api/commons/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/commons?${params}`)
        .then((r) => r.json())
        .then((data: ListResponse) => {
          if (!cancelled) setList(data);
        })
        .catch(() => {
          if (!cancelled) setList(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 150); // debounce
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [params]);

  const onSelect = (id: string) => {
    setSeedLoading(true);
    fetch(`/api/commons/seeds/${id}`)
      .then((r) => r.json())
      .then(setSelected)
      .catch(() => setSelected(null))
      .finally(() => setSeedLoading(false));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#e2e8f0', fontFamily: 'ui-sans-serif, system-ui' }}>
      <header style={{ padding: '24px 32px', borderBottom: '1px solid #1f2937' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>Paradigm Commons</h1>
        <p style={{ color: '#94a3b8', margin: '8px 0 0', fontSize: '14px' }}>
          {stats
            ? `${stats.total.toLocaleString()} signed seeds across ${stats.domains.length} domains — ${stats.curated} curated, ${stats.generated} generated.`
            : 'Loading corpus index…'}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, padding: 24 }}>
        {/* ── Sidebar: filters ────────────────────────────────────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section>
            <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', margin: '0 0 8px' }}>Search</h3>
            <input
              type="text"
              placeholder="name, description, tag…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #1f2937', color: '#e2e8f0', padding: '8px 10px', borderRadius: 6, fontSize: 13 }}
            />
          </section>

          <section>
            <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', margin: '0 0 8px' }}>Domain</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              <button
                onClick={() => { setDomain(''); setPage(0); }}
                style={chipStyle(domain === '', '#475569')}
              >All</button>
              {stats?.domains.map((d) => (
                <button
                  key={d.domain}
                  onClick={() => { setDomain(d.domain); setPage(0); }}
                  style={chipStyle(domain === d.domain, color(d.domain))}
                >
                  {d.domain} <span style={{ opacity: 0.6 }}>{d.count}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', margin: '0 0 8px' }}>Provenance</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['', 'curated', 'generated'] as const).map((p) => (
                <button key={p || 'any'} onClick={() => { setProvenance(p); setPage(0); }} style={chipStyle(provenance === p, '#475569')}>
                  {p || 'any'}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', margin: '0 0 8px' }}>Sort</h3>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as 'fitness' | 'name' | 'created'); setPage(0); }}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #1f2937', color: '#e2e8f0', padding: '8px 10px', borderRadius: 6, fontSize: 13 }}
            >
              <option value="fitness">fitness (high → low)</option>
              <option value="name">name (A → Z)</option>
              <option value="created">created (new → old)</option>
            </select>
          </section>
        </aside>

        {/* ── Main: grid ────────────────────────────────────────── */}
        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
              {list ? `${list.total.toLocaleString()} matching · page ${list.page + 1} of ${list.totalPages}` : (loading ? 'searching…' : '—')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={!list || list.page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={pagerBtn(!list || list.page <= 0)}
              >← prev</button>
              <button
                disabled={!list || !list.hasMore}
                onClick={() => setPage((p) => p + 1)}
                style={pagerBtn(!list || !list.hasMore)}
              >next →</button>
            </div>
          </div>

          {list && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {list.items.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onSelect(e.id)}
                  style={{
                    textAlign: 'left',
                    background: selected?.entry.id === e.id ? '#1e293b' : '#0f172a',
                    border: `1px solid ${selected?.entry.id === e.id ? color(e.domain) : '#1f2937'}`,
                    color: 'inherit',
                    padding: 12,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10, textTransform: 'uppercase', letterSpacing: 1,
                      background: color(e.domain), color: '#0b1220', padding: '2px 6px', borderRadius: 3,
                      fontWeight: 700,
                    }}>{e.domain}</span>
                    {typeof e.fitness === 'number' && (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        fitness {e.fitness.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{e.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: '#64748b' }}>
                    {e.hash.slice(0, 16)}…
                  </div>
                  {e.description && (
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.4 }}>
                      {e.description.length > 90 ? e.description.slice(0, 90) + '…' : e.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Detail panel ─────────────────────────────────────── */}
          {selected && (
            <section style={{ marginTop: 32, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 8, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>{selected.entry.name}</h2>
                  <p style={{ margin: '4px 0', color: '#94a3b8', fontSize: 13 }}>
                    <span style={{ background: color(selected.entry.domain), color: '#0b1220', padding: '2px 6px', borderRadius: 3, fontWeight: 700, marginRight: 8 }}>
                      {selected.entry.domain}
                    </span>
                    {selected.entry.provenance ?? 'unknown'} · created {selected.entry.created ?? '—'}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} style={pagerBtn(false)}>close ✕</button>
              </div>
              {seedLoading ? (
                <p style={{ color: '#64748b' }}>loading seed…</p>
              ) : (
                <pre style={{
                  marginTop: 16, background: '#020617', border: '1px solid #1f2937', padding: 16,
                  borderRadius: 6, fontSize: 11, overflowX: 'auto', color: '#cbd5e1', maxHeight: 480,
                }}>{JSON.stringify(selected.seed, null, 2)}</pre>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function chipStyle(active: boolean, accent: string): React.CSSProperties {
  return {
    background: active ? accent : '#0f172a',
    color: active ? '#020617' : '#cbd5e1',
    border: `1px solid ${active ? accent : '#1f2937'}`,
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

function pagerBtn(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? '#0f172a' : '#1e293b',
    color: disabled ? '#475569' : '#cbd5e1',
    border: '1px solid #1f2937',
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  };
}
