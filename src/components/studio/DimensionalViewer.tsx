/**
 * DimensionalViewer — The 7-Dimensional Reality Renderer
 *
 * Visualizes a seed across all 7 substrate dimensions simultaneously.
 * This is the "see the invisible" surface of Paradigm.
 *
 * SPATIAL   → 3D position cloud (projected to 2D with depth cue)
 * TEMPORAL  → rhythm / envelope timeline
 * SPECTRAL  → full EM spectrum bar (400nm–700nm visible + IR + UV + radio + X-ray)
 * MODAL     → 12D adjective spider web (emotional/perceptual space)
 * POSSIBLE  → possibility tree (counterfactual branches the seed could grow into)
 * SEMANTIC  → t-SNE-style embedding in 2D (similar seeds cluster)
 * STRUCTURAL → graph topology (gene dependency graph)
 */

import { useState, useMemo, useRef, useEffect } from 'react';

interface Gene { type: string; value: unknown }
interface Seed {
  $hash?: string; $name?: string; $domain?: string; $fitness?: number;
  genes?: Record<string, Gene>;
  [key: string]: unknown;
}

interface DimensionalViewerProps {
  seed: Seed | null;
  className?: string;
}

type DimId = 'spatial' | 'temporal' | 'spectral' | 'modal' | 'possible' | 'semantic' | 'structural';

const DIM_LABELS: Record<DimId, string> = {
  spatial:    'SPATIAL',
  temporal:   'TEMPORAL',
  spectral:   'SPECTRAL',
  modal:      'MODAL',
  possible:   'POSSIBLE',
  semantic:   'SEMANTIC',
  structural: 'STRUCTURAL',
};

const DIM_DESCS: Record<DimId, string> = {
  spatial:    'Physical 3D embedding of gene vectors',
  temporal:   'Rhythm, duration, envelope over time',
  spectral:   'Frequency signature across the EM spectrum',
  modal:      '12-axis perceptual/emotional space',
  possible:   'Counterfactual branches — what this seed could become',
  semantic:   'Meaning geometry — proximity to related seeds',
  structural: 'Gene dependency graph — how genes wire together',
};

const DIM_COLORS: Record<DimId, string> = {
  spatial:    '#6366f1',
  temporal:   '#22d3ee',
  spectral:   '#f59e0b',
  modal:      '#ec4899',
  possible:   '#10b981',
  semantic:   '#8b5cf6',
  structural: '#f97316',
};

function hashToFloat(hash: string, i: number): number {
  let h = 0;
  for (let j = 0; j < hash.length; j++) {
    h = (((h << 5) - h) + hash.charCodeAt((j + i * 7) % hash.length)) | 0;
  }
  return (Math.abs(h) % 1000) / 999;
}

function seedToFloats(seed: Seed, count: number): number[] {
  const h = seed.$hash ?? seed.$name ?? 'default';
  return Array.from({ length: count }, (_, i) => hashToFloat(h, i));
}

function SpatialPanel({ seed }: { seed: Seed }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floats = useMemo(() => seedToFloats(seed, 90), [seed.$hash]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    ctx.fillStyle = '#080812'; ctx.fillRect(0, 0, W, H);

    const points = 30;
    for (let i = 0; i < points; i++) {
      const x = floats[i * 3] * W;
      const y = floats[i * 3 + 1] * H;
      const z = floats[i * 3 + 2];
      const r = 2 + z * 8;
      const alpha = 0.3 + z * 0.7;
      const hue = (floats[i] * 360).toFixed(0);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue},70%,65%,${alpha.toFixed(2)})`;
      ctx.fill();
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(floats[(i - 1) * 3] * W, floats[(i - 1) * 3 + 1] * H);
        ctx.lineTo(x, y);
        ctx.strokeStyle = `hsla(${hue},50%,50%,0.15)`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }, [floats]);

  return <canvas ref={canvasRef} width={280} height={160} style={{ width: '100%', height: 160, display: 'block', borderRadius: 4 }} />;
}

function TemporalPanel({ seed }: { seed: Seed }) {
  const floats = useMemo(() => seedToFloats(seed, 64), [seed.$hash]);
  const W = 280; const H = 100;

  const envelope = useMemo(() => {
    const attack = 4 + Math.floor(floats[0] * 12);
    const decay = 4 + Math.floor(floats[1] * 10);
    const sustain = floats[2];
    const release = 6 + Math.floor(floats[3] * 20);
    const total = attack + decay + release + 8;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= total; i++) {
      let v = 0;
      if (i < attack) v = i / attack;
      else if (i < attack + decay) v = 1.0 - (1.0 - sustain) * ((i - attack) / decay);
      else if (i < total - release) v = sustain;
      else v = sustain * (1 - (i - (total - release)) / release);
      pts.push([(i / total) * W, H - v * (H - 8) - 4]);
    }
    return pts;
  }, [floats]);

  const beats = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => floats[8 + i]);
  }, [floats]);

  const rhythmBars = beats.map((v, i) => ({
    x: (i / 16) * W,
    h: 4 + v * 20,
    w: W / 16 - 1,
  }));

  const envPath = envelope.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {rhythmBars.map((b, i) => (
        <rect key={i} x={b.x} y={H - b.h} width={b.w} height={b.h} fill={`rgba(34,211,238,${0.15 + floats[i] * 0.35})`} />
      ))}
      <path d={envPath} fill="none" stroke="#22d3ee" strokeWidth="1.5" />
      <text x="4" y="12" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">ADSR ENVELOPE</text>
      <text x="4" y="22" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">RHYTHM GRID</text>
    </svg>
  );
}

const EM_BANDS = [
  { label: 'γ-ray', lo: 0, hi: 0.01e-9, color: '#ff00ff' },
  { label: 'X-ray', lo: 0.01e-9, hi: 10e-9, color: '#cc44ff' },
  { label: 'UV', lo: 10e-9, hi: 400e-9, color: '#8844ff' },
  { label: '380nm', lo: 380e-9, hi: 450e-9, color: '#4400ff' },
  { label: '450nm', lo: 450e-9, hi: 495e-9, color: '#0044ff' },
  { label: '495nm', lo: 495e-9, hi: 570e-9, color: '#00cc44' },
  { label: '570nm', lo: 570e-9, hi: 590e-9, color: '#aacc00' },
  { label: '590nm', lo: 590e-9, hi: 620e-9, color: '#ffaa00' },
  { label: '620nm', lo: 620e-9, hi: 700e-9, color: '#ff2200' },
  { label: 'NIR', lo: 700e-9, hi: 1.4e-6, color: '#880000' },
  { label: 'MIR', lo: 1.4e-6, hi: 3e-6, color: '#550000' },
  { label: 'FIR', lo: 3e-6, hi: 1e-3, color: '#330000' },
  { label: 'Micro', lo: 1e-3, hi: 0.1, color: '#001133' },
  { label: 'Radio', lo: 0.1, hi: 1000, color: '#000066' },
];

function SpectralPanel({ seed }: { seed: Seed }) {
  const floats = useMemo(() => seedToFloats(seed, 32), [seed.$hash]);
  const W = 280; const H = 80;

  const bandW = W / EM_BANDS.length;

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {EM_BANDS.map((band, i) => {
        const intensity = floats[i] * 0.85 + 0.05;
        const barH = intensity * H;
        return (
          <g key={i}>
            <rect x={i * bandW} y={H - barH} width={bandW - 0.5} height={barH} fill={band.color} opacity={intensity} />
            <rect x={i * bandW} y={0} width={bandW - 0.5} height={H} fill={band.color} opacity={0.04} />
          </g>
        );
      })}
      {EM_BANDS.map((band, i) => (
        <text key={i} x={i * bandW + bandW / 2} y={H + 12} textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.3)" fontFamily="monospace">{band.label}</text>
      ))}
      <line x1={6 * bandW} y1={0} x2={9 * bandW} y2={0} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <text x={(6 * bandW + 9 * bandW) / 2} y={8} textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.4)" fontFamily="monospace">VISIBLE</text>
    </svg>
  );
}

const MODAL_AXES = ['warm', 'bright', 'heavy', 'sharp', 'fast', 'complex', 'ancient', 'wild', 'loud', 'soft', 'dense', 'vast'];

function ModalPanel({ seed }: { seed: Seed }) {
  const floats = useMemo(() => seedToFloats(seed, 24), [seed.$hash]);
  const W = 280; const H = 160;
  const cx = W / 2; const cy = H / 2;
  const maxR = Math.min(cx, cy) - 24;
  const n = MODAL_AXES.length;

  const points = MODAL_AXES.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = (floats[i] * 0.85 + 0.1) * maxR;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, angle, label: MODAL_AXES[i], value: floats[i] };
  });

  const polyPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  const gridLines = MODAL_AXES.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return `M${cx},${cy} L${(cx + Math.cos(angle) * maxR).toFixed(1)},${(cy + Math.sin(angle) * maxR).toFixed(1)}`;
  });

  const gridCircles = [0.25, 0.5, 0.75, 1.0].map(f => {
    const r = f * maxR;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
    }
    return d + 'Z';
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {gridCircles.map((d, i) => <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />)}
      {gridLines.map((d, i) => <path key={i} d={d} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />)}
      <path d={polyPath} fill="rgba(236,72,153,0.18)" stroke="#ec4899" strokeWidth="1.2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2.5" fill="#ec4899" />
          <text
            x={(cx + Math.cos(p.angle) * (maxR + 14)).toFixed(1)}
            y={(cy + Math.sin(p.angle) * (maxR + 14) + 3).toFixed(1)}
            textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)" fontFamily="monospace"
          >{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

interface PossibleNode {
  id: string; label: string; depth: number; x: number; y: number;
  probability: number; domain: string; parentId: string | null;
}

function PossiblePanel({ seed }: { seed: Seed }) {
  const floats = useMemo(() => seedToFloats(seed, 48), [seed.$hash]);
  const W = 280; const H = 180;

  const nodes = useMemo<PossibleNode[]>(() => {
    const result: PossibleNode[] = [];
    const currentDomain = seed.$domain ?? 'visual2d';
    const branchDomains = ['music', 'narrative', 'game', 'character', 'shader', 'world', 'website', 'quantum', 'field', 'molecule'];

    result.push({ id: 'root', label: currentDomain, depth: 0, x: W / 2, y: 20, probability: 1.0, domain: currentDomain, parentId: null });

    const numBranches = 3 + Math.floor(floats[0] * 3);
    for (let i = 0; i < numBranches; i++) {
      const domain = branchDomains[i % branchDomains.length];
      const prob = 0.2 + floats[1 + i] * 0.6;
      const x = (W / (numBranches + 1)) * (i + 1);
      result.push({ id: `b${i}`, label: domain, depth: 1, x, y: 70, probability: prob, domain, parentId: 'root' });

      const numLeaves = 1 + Math.floor(floats[4 + i] * 2);
      for (let j = 0; j < numLeaves; j++) {
        const leafDomain = branchDomains[(i * 3 + j + 4) % branchDomains.length];
        const leafProb = prob * (0.3 + floats[8 + i * 3 + j] * 0.5);
        const lx = x + (j - (numLeaves - 1) / 2) * 36;
        result.push({ id: `l${i}_${j}`, label: leafDomain, depth: 2, x: Math.max(12, Math.min(W - 12, lx)), y: 130, probability: leafProb, domain: leafDomain, parentId: `b${i}` });
      }
    }
    return result;
  }, [floats, seed.$domain]);

  const edges = nodes.filter(n => n.parentId !== null).map(n => {
    const parent = nodes.find(p => p.id === n.parentId);
    if (!parent) return null;
    return { x1: parent.x, y1: parent.y, x2: n.x, y2: n.y, prob: n.probability };
  }).filter(Boolean);

  const DOMAIN_HUE: Record<string, number> = {
    music: 200, narrative: 40, game: 120, character: 280, shader: 300, world: 160,
    website: 220, quantum: 260, field: 20, molecule: 90, visual2d: 180,
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {edges.map((e, i) => e && (
        <line key={i} x1={e.x1.toFixed(1)} y1={e.y1.toFixed(1)} x2={e.x2.toFixed(1)} y2={e.y2.toFixed(1)}
          stroke={`rgba(16,185,129,${(e.prob * 0.6).toFixed(2)})`} strokeWidth={0.5 + e.prob * 1.5} />
      ))}
      {nodes.map(n => {
        const hue = DOMAIN_HUE[n.domain] ?? 120;
        const r = n.depth === 0 ? 10 : n.depth === 1 ? 7 : 5;
        return (
          <g key={n.id}>
            <circle cx={n.x.toFixed(1)} cy={n.y.toFixed(1)} r={r + 4} fill={`hsla(${hue},70%,50%,0.08)`} />
            <circle cx={n.x.toFixed(1)} cy={n.y.toFixed(1)} r={r} fill={`hsla(${hue},70%,50%,0.9)`} />
            <text x={n.x.toFixed(1)} y={(n.y + r + 10).toFixed(1)} textAnchor="middle"
              fontSize={n.depth === 0 ? 8 : 6.5} fill="rgba(255,255,255,0.55)" fontFamily="monospace">
              {n.label}
            </text>
            {n.probability < 1 && (
              <text x={n.x.toFixed(1)} y={(n.y + r + 18).toFixed(1)} textAnchor="middle"
                fontSize={5.5} fill="rgba(255,255,255,0.3)" fontFamily="monospace">
                {(n.probability * 100).toFixed(0)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SemanticPanel({ seed }: { seed: Seed }) {
  const floats = useMemo(() => seedToFloats(seed, 60), [seed.$hash]);
  const W = 280; const H = 160;

  const clusters = useMemo(() => {
    const domains = ['music', 'narrative', 'game', 'character', 'shader', 'world', 'website', 'physics', 'visual2d', 'sprite', 'agent', 'ecosystem'];
    const currentDomain = seed.$domain ?? domains[0];
    return domains.map((d, i) => {
      const isCurrent = d === currentDomain;
      const cx = 20 + floats[i * 2] * (W - 40);
      const cy = 10 + floats[i * 2 + 1] * (H - 20);
      return { domain: d, x: cx, y: cy, isCurrent, mass: 0.3 + floats[i] * 0.7 };
    });
  }, [floats, seed.$domain]);

  const currentCluster = clusters.find(c => c.isCurrent);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {currentCluster && clusters.filter(c => !c.isCurrent).map((c, i) => {
        const dist = Math.sqrt((c.x - currentCluster.x) ** 2 + (c.y - currentCluster.y) ** 2);
        const maxDist = Math.sqrt(W * W + H * H);
        const proximity = 1 - dist / maxDist;
        return proximity > 0.35 ? (
          <line key={i} x1={currentCluster.x.toFixed(1)} y1={currentCluster.y.toFixed(1)}
            x2={c.x.toFixed(1)} y2={c.y.toFixed(1)}
            stroke={`rgba(139,92,246,${(proximity * 0.4).toFixed(2)})`} strokeWidth={proximity * 1.5} />
        ) : null;
      })}
      {clusters.map(c => (
        <g key={c.domain}>
          {c.isCurrent && <circle cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} r={16} fill="rgba(139,92,246,0.15)" />}
          <circle cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} r={c.isCurrent ? 7 : 4}
            fill={c.isCurrent ? '#8b5cf6' : `rgba(139,92,246,0.5)`} />
          <text x={c.x.toFixed(1)} y={(c.y - 10).toFixed(1)} textAnchor="middle"
            fontSize={c.isCurrent ? 8 : 6} fill={c.isCurrent ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'}
            fontFamily="monospace">{c.domain}</text>
        </g>
      ))}
    </svg>
  );
}

function StructuralPanel({ seed }: { seed: Seed }) {
  const W = 280; const H = 160;
  const genes = seed.genes ? Object.keys(seed.genes) : ['scalar', 'categorical', 'vector', 'temporal', 'sovereignty'];
  const floats = useMemo(() => seedToFloats(seed, 60), [seed.$hash]);

  const nodes = useMemo(() => {
    return genes.slice(0, 8).map((g, i) => {
      const angle = (i / Math.min(genes.length, 8)) * Math.PI * 2 - Math.PI / 2;
      const r = 55 + floats[i] * 20;
      return { id: g, x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r, type: (seed.genes?.[g]?.type ?? 'scalar') };
    });
  }, [genes, floats]);

  const GENE_TYPE_COLOR: Record<string, string> = {
    scalar: '#f97316', categorical: '#22d3ee', vector: '#6366f1', temporal: '#22d3ee',
    sovereignty: '#ffd700', graph: '#10b981', quantum: '#8b5cf6', resonance: '#ec4899',
    field: '#f59e0b', symbolic: '#a78bfa', struct: '#34d399', regulatory: '#fb7185',
  };

  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (floats[20 + i * 3 + j] > 0.55) {
        edges.push({ x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y });
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {edges.map((e, i) => <line key={i} x1={e.x1.toFixed(1)} y1={e.y1.toFixed(1)} x2={e.x2.toFixed(1)} y2={e.y2.toFixed(1)} stroke="rgba(249,115,22,0.2)" strokeWidth="0.7" />)}
      {nodes.map(n => {
        const color = GENE_TYPE_COLOR[n.type] ?? '#888';
        return (
          <g key={n.id}>
            <circle cx={n.x.toFixed(1)} cy={n.y.toFixed(1)} r={7} fill={color} opacity={0.85} />
            <text x={n.x.toFixed(1)} y={(n.y - 10).toFixed(1)} textAnchor="middle"
              fontSize={6.5} fill="rgba(255,255,255,0.45)" fontFamily="monospace">{n.id.slice(0, 10)}</text>
          </g>
        );
      })}
      <circle cx={W / 2} cy={H / 2} r={5} fill="#f97316" />
      <text x={W / 2} y={H / 2 + 16} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.4)" fontFamily="monospace">seed</text>
    </svg>
  );
}

const DIM_PANELS: Record<DimId, React.ComponentType<{ seed: Seed }>> = {
  spatial:    SpatialPanel,
  temporal:   TemporalPanel,
  spectral:   SpectralPanel,
  modal:      ModalPanel,
  possible:   PossiblePanel,
  semantic:   SemanticPanel,
  structural: StructuralPanel,
};

const ALL_DIMS: DimId[] = ['spatial', 'temporal', 'spectral', 'modal', 'possible', 'semantic', 'structural'];

export function DimensionalViewer({ seed, className }: DimensionalViewerProps) {
  const [activeDim, setActiveDim] = useState<DimId>('possible');
  const [layout, setLayout] = useState<'focus' | 'grid'>('focus');

  if (!seed) {
    return (
      <div className={`flex items-center justify-center h-64 ${className ?? ''}`}
        style={{ background: '#080812', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: 12 }}>
          No seed selected — grow something to see across all 7 dimensions
        </p>
      </div>
    );
  }

  const ActivePanel = DIM_PANELS[activeDim];

  return (
    <div className={className ?? ''} style={{ background: '#080812', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
            DIMENSIONAL SUBSTRATE
          </span>
          {seed.$domain && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: DIM_COLORS[activeDim], background: `${DIM_COLORS[activeDim]}18`, padding: '2px 6px', borderRadius: 3 }}>
              {seed.$domain}
            </span>
          )}
        </div>
        <button
          onClick={() => setLayout(l => l === 'focus' ? 'grid' : 'focus')}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 8px', color: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'monospace', cursor: 'pointer' }}
        >
          {layout === 'focus' ? 'GRID' : 'FOCUS'}
        </button>
      </div>

      <div style={{ padding: '8px 10px', display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {ALL_DIMS.map(dim => (
          <button
            key={dim}
            onClick={() => setActiveDim(dim)}
            style={{
              background: activeDim === dim ? `${DIM_COLORS[dim]}22` : 'transparent',
              border: `1px solid ${activeDim === dim ? DIM_COLORS[dim] : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 4, padding: '3px 8px',
              color: activeDim === dim ? DIM_COLORS[dim] : 'rgba(255,255,255,0.3)',
              fontSize: 8, fontFamily: 'monospace', cursor: 'pointer', letterSpacing: '0.06em',
              transition: 'all 0.15s',
            }}
          >
            {DIM_LABELS[dim]}
          </button>
        ))}
      </div>

      {layout === 'focus' ? (
        <div style={{ padding: 12 }}>
          <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: DIM_COLORS[activeDim], letterSpacing: '0.08em' }}>
              {DIM_LABELS[activeDim]}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
              {DIM_DESCS[activeDim]}
            </span>
          </div>
          <ActivePanel seed={seed} />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
              hash: {(seed.$hash ?? '').slice(0, 16)}…
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
              fitness: {typeof seed.$fitness === 'number' ? seed.$fitness.toFixed(3) : '—'}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ALL_DIMS.map(dim => {
            const Panel = DIM_PANELS[dim];
            return (
              <div key={dim} onClick={() => { setActiveDim(dim); setLayout('focus'); }}
                style={{ cursor: 'pointer', borderRadius: 6, border: `1px solid ${activeDim === dim ? DIM_COLORS[dim] : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
                <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 7, color: DIM_COLORS[dim], letterSpacing: '0.08em' }}>{DIM_LABELS[dim]}</span>
                </div>
                <Panel seed={seed} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DimensionalViewer;
