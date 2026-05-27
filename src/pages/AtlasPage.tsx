/**
 * Atlas — Doctrine v2 Part XXIII v0 (OS shell substrate, visual).
 *
 * Loads the entire commons corpus from /api/atlas and renders it as a
 * 2D constellation. Pan, zoom, click any node to see its package.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AtlasNode {
  seedId: string;
  x: number;
  y: number;
  domain: string;
  sectorAngle: number;
  hue: number;
}

interface AtlasEdge { from: string; to: string; kind: 'lineage'; }
interface DomainInfo { name: string; count: number; hue: number; angle: number; }
interface AtlasView {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  domains: DomainInfo[];
  stats: { nodeCount: number; edgeCount: number; domainCount: number };
  layoutHash: string;
}

function useAtlas(filter: string[] | null, limit: number): { view: AtlasView | null; loading: boolean; error: string | null } {
  const [view, setView] = useState<AtlasView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('limit', String(limit));
    if (filter && filter.length > 0) qs.set('domains', filter.join(','));
    fetch(`/api/atlas?${qs.toString()}`)
      .then((r) => r.json())
      .then((v) => { if (!cancelled) setView(v as AtlasView); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter?.join(','), limit]);
  return { view, loading, error };
}

const PANEL_BG = '#0a0b10';
const FG = '#e6e6ea';
const MUTED = '#7a7a85';
const ACCENT = '#d8a657';
const VIEW_SIZE = 800;
const PADDING = 24;

export default function AtlasPage() {
  const navigate = useNavigate();
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [limit, setLimit] = useState(1000);
  const { view, loading, error } = useAtlas(selectedDomains.length > 0 ? selectedDomains : null, limit);
  const [hovered, setHovered] = useState<AtlasNode | null>(null);
  const [search, setSearch] = useState('');
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);

  const projected = useMemo(() => {
    if (!view) return [];
    const scale = (VIEW_SIZE / 2 - PADDING) * zoom;
    const cx = VIEW_SIZE / 2 + pan.x;
    const cy = VIEW_SIZE / 2 + pan.y;
    return view.nodes.map((n) => ({
      ...n,
      sx: cx + n.x * scale,
      sy: cy + n.y * scale,
    }));
  }, [view, zoom, pan.x, pan.y]);

  const nodeIndex = useMemo(() => {
    const m = new Map<string, (typeof projected)[number]>();
    for (const n of projected) m.set(n.seedId, n);
    return m;
  }, [projected]);

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return projected;
    const q = search.toLowerCase();
    return projected.filter((n) => n.seedId.toLowerCase().includes(q) || n.domain.toLowerCase().includes(q));
  }, [projected, search]);

  const dimMatch = useMemo(() => search.trim().length > 0, [search]);

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, pan: { ...pan } });
  }
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging && dragStart) {
      setPan({ x: dragStart.pan.x + (e.clientX - dragStart.x), y: dragStart.pan.y + (e.clientY - dragStart.y) });
    }
  }
  function onMouseUp() { setDragging(false); setDragStart(null); }
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    setZoom((z) => Math.max(0.4, Math.min(8, z * factor)));
  }
  function resetView() { setPan({ x: 0, y: 0 }); setZoom(1); }

  function toggleDomain(d: string) {
    setSelectedDomains((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);
  }

  const totalEdges = view?.stats.edgeCount ?? 0;
  const totalNodes = view?.stats.nodeCount ?? 0;

  return (
    <div
      style={{
        background: '#000',
        color: FG,
        minHeight: '100vh',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        display: 'grid',
        gridTemplateColumns: '280px 1fr 320px',
      }}
    >
      {/* Left rail: domain palette */}
      <aside style={{ padding: 24, borderRight: `1px solid ${PANEL_BG}`, background: '#06070a' }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2 }}>PARADIGM</div>
          <h1 style={{ fontSize: 22, margin: '4px 0 0' }}>Atlas</h1>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
            the corpus as a constellation
          </div>
        </header>
        <div style={{ marginBottom: 16, padding: 12, background: PANEL_BG, borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1 }}>STATS</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{totalNodes.toLocaleString()} seeds</div>
          <div style={{ fontSize: 11, color: MUTED }}>{totalEdges} lineage edges</div>
          <div style={{ fontSize: 11, color: MUTED }}>{view?.stats.domainCount ?? 0} domains</div>
        </div>
        <input
          type="search"
          placeholder="search seeds…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: PANEL_BG,
            border: 'none',
            borderRadius: 4,
            color: FG,
            fontFamily: 'inherit',
            fontSize: 12,
            marginBottom: 12,
          }}
        />
        <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1, marginBottom: 6 }}>DOMAINS</div>
        <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', paddingRight: 4 }}>
          {view?.domains
            .slice()
            .sort((a, b) => b.count - a.count)
            .map((d) => {
              const active = selectedDomains.length === 0 || selectedDomains.includes(d.name);
              return (
                <button
                  key={d.name}
                  onClick={() => toggleDomain(d.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '4px 6px',
                    background: 'transparent',
                    border: 'none',
                    color: active ? FG : MUTED,
                    fontFamily: 'inherit',
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: `hsl(${d.hue} 70% 55%)`, opacity: active ? 1 : 0.3 }} />
                  <span style={{ flex: 1 }}>{d.name}</span>
                  <span style={{ color: MUTED, fontSize: 10 }}>{d.count}</span>
                </button>
              );
            })}
        </div>
      </aside>

      {/* Center: the constellation */}
      <main style={{ position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 16, left: 16, fontSize: 11, color: MUTED, letterSpacing: 1 }}>
            LOADING CONSTELLATION…
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', top: 16, left: 16, fontSize: 11, color: '#ff6666' }}>
            ERROR: {error}
          </div>
        )}
        <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, color: MUTED, letterSpacing: 1, textAlign: 'right' }}>
          drag to pan • wheel to zoom
          <br />
          <button onClick={resetView} style={{ marginTop: 6, background: 'transparent', border: `1px solid ${MUTED}`, color: MUTED, padding: '2px 6px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
            reset view
          </button>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          width="100%"
          height="100vh"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          style={{ cursor: dragging ? 'grabbing' : 'grab', background: 'radial-gradient(ellipse at center, #060810 0%, #000 80%)' }}
        >
          {/* Sector guides (subtle) */}
          {view?.domains.map((d) => {
            const r1 = VIEW_SIZE / 2 - PADDING;
            const cx = VIEW_SIZE / 2 + pan.x;
            const cy = VIEW_SIZE / 2 + pan.y;
            const x = cx + Math.cos(d.angle) * r1 * zoom;
            const y = cy + Math.sin(d.angle) * r1 * zoom;
            return (
              <g key={d.name}>
                <line x1={cx} y1={cy} x2={x} y2={y} stroke={`hsl(${d.hue} 30% 25%)`} strokeWidth={0.4} opacity={0.4} />
              </g>
            );
          })}

          {/* Lineage edges */}
          {view?.edges.map((e, i) => {
            const a = nodeIndex.get(e.from);
            const b = nodeIndex.get(e.to);
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.sx}
                y1={a.sy}
                x2={b.sx}
                y2={b.sy}
                stroke={ACCENT}
                strokeWidth={0.6}
                opacity={0.25}
              />
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((n) => {
            const isHovered = hovered?.seedId === n.seedId;
            const radius = isHovered ? 4 : 1.6;
            const matches = !dimMatch || projected === filteredNodes
              || filteredNodes.find((f) => f.seedId === n.seedId);
            return (
              <circle
                key={n.seedId}
                cx={n.sx}
                cy={n.sy}
                r={radius}
                fill={`hsl(${n.hue} 70% ${isHovered ? 70 : 55}%)`}
                opacity={matches ? 1 : 0.15}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`/genesis/${n.seedId.slice(0, 12)}`)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </svg>
      </main>

      {/* Right rail: hover detail */}
      <aside style={{ padding: 24, borderLeft: `1px solid ${PANEL_BG}`, background: '#06070a' }}>
        <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2 }}>NODE</div>
        {hovered ? (
          <>
            <h2 style={{ fontSize: 16, margin: '4px 0 12px', fontFamily: 'ui-monospace' }}>{hovered.seedId}</h2>
            <div style={{ marginBottom: 10 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: `hsl(${hovered.hue} 70% 55%)`, marginRight: 6, verticalAlign: 'middle' }} />
              <span style={{ fontSize: 13 }}>{hovered.domain}</span>
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>POSITION</div>
            <div style={{ fontSize: 11, fontFamily: 'ui-monospace' }}>
              x = {hovered.x.toFixed(4)}<br />
              y = {hovered.y.toFixed(4)}
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 16 }}>
              click to open package
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 1.6 }}>
            hover any star to inspect it.<br /><br />
            this is the entire Paradigm corpus rendered as a constellation. each star is a seed; each arc is a lineage edge. domain hues are deterministic across runs. layout is reproducible byte-for-byte.
          </div>
        )}
        <hr style={{ border: 'none', borderTop: `1px solid ${PANEL_BG}`, margin: '24px 0' }} />
        <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1, marginBottom: 6 }}>NAVIGATE</div>
        <a href="/genesis" style={{ display: 'block', fontSize: 12, color: ACCENT, marginBottom: 6, textDecoration: 'none' }}>↳ genesis</a>
        <a href="/explore" style={{ display: 'block', fontSize: 12, color: ACCENT, marginBottom: 6, textDecoration: 'none' }}>↳ explore</a>
        <a href="/substrate" style={{ display: 'block', fontSize: 12, color: ACCENT, marginBottom: 6, textDecoration: 'none' }}>↳ substrate</a>
        <hr style={{ border: 'none', borderTop: `1px solid ${PANEL_BG}`, margin: '24px 0' }} />
        <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1 }}>LAYOUT HASH</div>
        <div style={{ fontSize: 10, color: MUTED, fontFamily: 'ui-monospace', wordBreak: 'break-all', marginTop: 4 }}>
          {view?.layoutHash.slice(0, 32)}…
        </div>
      </aside>
    </div>
  );
}
