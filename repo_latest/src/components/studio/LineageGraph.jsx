import { useRef, useEffect, useState } from 'react';
import { DOMAIN_COLORS, OP_COLORS } from '@/lib/constants';

function simpleForceLayout(nodes, edges, width, height) {
  const positions = nodes.map((_, i) => ({
    x: width / 2 + (Math.cos(i * 2.399) * Math.min(width, height) * 0.35),
    y: height / 2 + (Math.sin(i * 2.399) * Math.min(height, width) * 0.3),
    vx: 0, vy: 0,
  }));
  const nodeMap = {};
  nodes.forEach((n, i) => { nodeMap[n.id] = i; });
  for (let iter = 0; iter < 80; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 2000 / (d * d);
        positions[i].vx -= (dx / d) * force;
        positions[i].vy -= (dy / d) * force;
        positions[j].vx += (dx / d) * force;
        positions[j].vy += (dy / d) * force;
      }
    }
    for (const edge of edges) {
      const si = nodeMap[edge.source], ti = nodeMap[edge.target];
      if (si === undefined || ti === undefined) continue;
      const dx = positions[ti].x - positions[si].x;
      const dy = positions[ti].y - positions[si].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (d - 100) * 0.05;
      positions[si].vx += (dx / d) * force;
      positions[si].vy += (dy / d) * force;
      positions[ti].vx -= (dx / d) * force;
      positions[ti].vy -= (dy / d) * force;
    }
    for (let i = 0; i < nodes.length; i++) {
      positions[i].vx += (width / 2 - positions[i].x) * 0.01;
      positions[i].vy += (height / 2 - positions[i].y) * 0.01;
      positions[i].x += positions[i].vx * 0.3;
      positions[i].y += positions[i].vy * 0.3;
      positions[i].vx *= 0.85;
      positions[i].vy *= 0.85;
      positions[i].x = Math.max(30, Math.min(width - 30, positions[i].x));
      positions[i].y = Math.max(30, Math.min(height - 30, positions[i].y));
    }
  }
  return positions;
}

export default function LineageGraph({ seeds, currentSeed, onSelect }) {
  const [dimensions, setDimensions] = useState({ w: 600, h: 400 });
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width > 0 && height > 0) setDimensions({ w: width, h: height });
    }
  }, [seeds]);

  if (!Array.isArray(seeds) || seeds.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4" data-testid="lineage-graph-empty">
        <p className="font-mono text-[10px] text-neutral-600 text-center">No seeds to visualize. Generate seeds to see the lineage graph.</p>
      </div>
    );
  }

  const hashMap = {};
  seeds.forEach(s => { hashMap[s.$hash] = s; });
  const nodes = seeds.map(s => ({
    id: s.id || s.$hash,
    hash: s.$hash,
    name: s.$name,
    domain: s.$domain,
    generation: s.$lineage?.generation || 0,
    operation: s.$lineage?.operation || 'primordial',
    fitness: s.$fitness?.overall || 0,
    isCurrent: currentSeed && s.id === currentSeed.id,
  }));
  const edges = [];
  const idMap = {};
  seeds.forEach(s => { idMap[s.$hash] = s.id || s.$hash; });
  seeds.forEach(s => {
    (s.$lineage?.parents || []).forEach(ph => {
      if (idMap[ph]) edges.push({ source: idMap[ph], target: s.id || s.$hash });
    });
  });
  const positions = simpleForceLayout(nodes, edges, dimensions.w, dimensions.h);
  const posMap = {};
  nodes.forEach((n, i) => { posMap[n.id] = positions[i]; });

  return (
    <div ref={containerRef} className="w-full h-full relative" data-testid="lineage-graph">
      <svg width={dimensions.w} height={dimensions.h} className="w-full h-full">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#404040" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const s = posMap[e.source], t = posMap[e.target];
          if (!s || !t) return null;
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#262626" strokeWidth={1} markerEnd="url(#arrow)" />;
        })}
        {nodes.map((n, i) => {
          const p = positions[i];
          const color = DOMAIN_COLORS[n.domain] || '#525252';
          const opColor = OP_COLORS[n.operation?.split(':')[0]] || '#525252';
          const r = n.isCurrent ? 10 : 6 + n.fitness * 6;
          return (
            <g key={n.id} onClick={() => {
              const seed = seeds.find(s => (s.id || s.$hash) === n.id);
              if (seed) onSelect(seed);
            }} style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r={r + 2} fill="none" stroke={n.isCurrent ? 'var(--primary)' : 'transparent'} strokeWidth={2} />
              <circle cx={p.x} cy={p.y} r={r} fill={color} opacity={0.8} />
              <circle cx={p.x} cy={p.y} r={2} fill={opColor} />
              <text x={p.x} y={p.y + r + 10} textAnchor="middle" fill="#a3a3a3" fontSize={8} fontFamily="JetBrains Mono">{n.name?.slice(0, 12)}</text>
              <text x={p.x} y={p.y + r + 18} textAnchor="middle" fill="#737373" fontSize={7} fontFamily="JetBrains Mono">G{n.generation}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
