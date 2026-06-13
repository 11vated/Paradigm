/**
 * DomainCosmosOverlay — the Composition Atlas.
 *
 * Per spec §VIII.10. All registered engines arranged in concentric rings by
 * contract score (inner = highest), each as a colored node with its domain
 * glyph. Click to grow a fresh seed in that domain. Search to filter.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useDomainColor } from '@/hooks/useDomainColor';

interface EngineMeta {
  domain: string;
  label: string;
  contractScore?: number;
}

interface DomainNode extends EngineMeta {
  x: number; y: number;
  angle: number; radius: number;
  ring: number;
  fontSize: number;
}

interface OverlayProps {
  open: boolean;
  onClose: () => void;
}

// Inner "ring" component because each domain node needs a hue from its own hook
const DomainStar: React.FC<{ node: DomainNode; dim: boolean; onClick: () => void; onHover: (e: EngineMeta | null) => void }> = ({ node, dim, onClick, onHover }) => {
  const color = useDomainColor(node.domain);
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      style={{ cursor: 'pointer', opacity: dim ? 0.18 : 1, transition: 'opacity 0.2s' }}
      onClick={onClick}
      onMouseEnter={() => onHover(node)}
      onMouseLeave={() => onHover(null)}
    >
      <circle r={3 + (node.contractScore ?? 0.5) * 2.5} fill={color} opacity={0.85} />
      <circle r={6} fill="none" stroke={color} strokeWidth={0.4} opacity={0.4} />
      <text
        textAnchor="middle"
        y={12}
        fontSize={node.fontSize}
        fontFamily="var(--p-font-mono)"
        fill={color}
        opacity={0.92}
      >{node.label}</text>
    </g>
  );
};

export const DomainCosmosOverlay: React.FC<OverlayProps> = ({ open, onClose }) => {
  const [search, setSearch] = useState('');
  const [engines, setEngines] = useState<EngineMeta[]>([]);
  const [hovered, setHovered] = useState<EngineMeta | null>(null);
  const setSeed = useActiveSeed((s: any) => s.setSeed);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    setSearch('');
    fetch('/api/cosmos/engines')
      .then((r) => r.json())
      .then((j) => setEngines(j.engines ?? []))
      .catch(() => setEngines([]));
  }, [open]);

  // Lock scroll while open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Arrange engines into 3 concentric rings by contract score
  const nodes: DomainNode[] = useMemo(() => {
    const out: DomainNode[] = [];
    const sorted = [...engines].sort((a, b) => (b.contractScore ?? 0) - (a.contractScore ?? 0));
    // 3 rings: tier-1 (top 14%), tier-2 (next 30%), tier-3 (rest)
    const ring1End = Math.ceil(sorted.length * 0.14);
    const ring2End = Math.ceil(sorted.length * 0.42);
    const rings: EngineMeta[][] = [
      sorted.slice(0, ring1End),
      sorted.slice(ring1End, ring2End),
      sorted.slice(ring2End),
    ];
    const radii = [120, 215, 305];
    const fontSizes = [8, 7, 6];
    rings.forEach((ring, ri) => {
      const r = radii[ri];
      const fs = fontSizes[ri];
      ring.forEach((e, i) => {
        const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
        out.push({
          ...e,
          x: 400 + r * Math.cos(angle),
          y: 360 + r * Math.sin(angle),
          angle, radius: r, ring: ri,
          fontSize: fs,
        });
      });
    });
    return out;
  }, [engines]);

  const q = search.trim().toLowerCase();
  const isDim = useCallback((n: DomainNode) => {
    if (!q) return false;
    return !(n.domain.toLowerCase().includes(q) || n.label.toLowerCase().includes(q));
  }, [q]);

  const growHere = useCallback(async (domain: string) => {
    try {
      const res = await fetch('/api/seeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: search.trim() || `cosmos:${domain}`, domain }),
      });
      const json = await res.json();
      setSeed({
        id: json.id,
        name: json.$name ?? search.trim() ?? domain,
        domain,
        hash: json.$hash ?? '',
        generation: 0,
      });
    } catch { /* swallow: best-effort overlay probe */ }
    onClose();
  }, [search, setSeed, onClose]);

  if (!open) return null;

  return (
    <div className="p-atlas" role="dialog" aria-modal="true" aria-label="Composition Atlas" onClick={onClose} tabIndex={0} onKeyDown={e => { if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); onClose(); } }}>
      <div className="p-atlas-inner" onClick={(e) => e.stopPropagation()} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); } }}>
        <header className="p-atlas-header">
          <span className="p-atlas-title">composition atlas</span>
          <span className="p-atlas-count">{engines.length} engines · 3 tiers</span>
          <span className="p-atlas-spacer" />
          <input
            className="p-atlas-search"
            autoFocus
            placeholder="filter — warrior, music, world, quantum…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="p-atlas-close" onClick={onClose} title="close (esc)">esc</button>
        </header>

        <div className="p-atlas-canvas">
          <svg width="100%" height="100%" viewBox="0 0 800 720" preserveAspectRatio="xMidYMid meet">
            {/* Ring guides */}
            <circle cx={400} cy={360} r={120} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <circle cx={400} cy={360} r={215} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <circle cx={400} cy={360} r={305} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <circle cx={400} cy={360} r={3} fill="var(--p-prism-2)" opacity={0.8} />

            {/* Domain stars */}
            {nodes.map((n) => (
              <DomainStar
                key={n.domain}
                node={n}
                dim={isDim(n)}
                onClick={() => growHere(n.domain)}
                onHover={setHovered}
              />
            ))}
          </svg>

          {hovered && (
            <div className="p-atlas-tooltip">
              <div className="p-atlas-tip-domain">{hovered.label}</div>
              <div className="p-atlas-tip-meta">
                <span>contract · {(hovered.contractScore ?? 0).toFixed(3)}</span>
                <span>click to grow</span>
              </div>
            </div>
          )}
        </div>

        <footer className="p-atlas-footer">
          <span>tier 1 · production · top {Math.ceil(engines.length * 0.14)}</span>
          <span>tier 2 · stable · next {Math.ceil(engines.length * 0.28)}</span>
          <span>tier 3 · experimental · remaining</span>
        </footer>
      </div>
    </div>
  );
};
