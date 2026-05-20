import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * VectorRadar — SVG radar chart for vector genes.
 * Displays 3+ axes with interactive points and color preview.
 */
export default function VectorRadar({ value = [0.5, 0.5, 0.5], onChange, labels }) {
  const values = Array.isArray(value) ? value.map(v => Math.max(0, Math.min(1, typeof v === 'number' ? v : 0.5))) : [0.5, 0.5, 0.5];
  const n = values.length;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  const axisLabels = labels || (n === 3 ? ['R', 'G', 'B'] : values.map((_, i) => `${i}`));

  const axes = useMemo(() =>
    values.map((_, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        angle,
      };
    }), [n]);

  const points = values.map((v, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius * v,
      y: cy + Math.sin(angle) * radius * v,
    };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Color preview if it's a 3-element palette
  const colorPreview = n === 3
    ? `rgb(${Math.round(values[0] * 255)}, ${Math.round(values[1] * 255)}, ${Math.round(values[2] * 255)})`
    : null;

  const handleAxisClick = (i, e) => {
    const svg = e.currentTarget.closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const newVal = Math.max(0, Math.min(1, dist / radius));
    const newValues = [...values];
    newValues[i] = +newVal.toFixed(3);
    onChange?.(newValues);
  };

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} className="shrink-0">
        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1].map(r => (
          <circle key={r} cx={cx} cy={cy} r={radius * r}
            fill="none" stroke="#1a1a1a" strokeWidth={0.5} />
        ))}

        {/* Axis lines */}
        {axes.map((a, i) => (
          <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y}
            stroke="#262626" strokeWidth={0.5} />
        ))}

        {/* Data polygon */}
        <motion.path
          d={pathD}
          fill="rgba(0, 229, 255, 0.08)"
          stroke="#00E5FF"
          strokeWidth={1.5}
          initial={false}
          animate={{ d: pathD }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} onClick={(e) => handleAxisClick(i, e)} className="cursor-pointer">
            <circle cx={p.x} cy={p.y} r={8} fill="transparent" />
            <motion.circle
              cx={p.x} cy={p.y} r={3}
              fill="#00E5FF"
              initial={false}
              animate={{ cx: p.x, cy: p.y }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.5))' }}
            />
          </g>
        ))}

        {/* Axis labels */}
        {axes.map((a, i) => {
          const labelOffset = 12;
          const lx = cx + Math.cos(a.angle) * (radius + labelOffset);
          const ly = cy + Math.sin(a.angle) * (radius + labelOffset);
          return (
            <text key={i} x={lx} y={ly}
              textAnchor="middle" dominantBaseline="central"
              fill="#525252" fontSize={8} fontFamily="JetBrains Mono">
              {axisLabels[i]}
            </text>
          );
        })}
      </svg>

      {/* Values + color preview */}
      <div className="flex flex-col gap-1">
        {values.map((v, i) => (
          <div key={i} className="font-mono text-[9px] text-neutral-500">
            <span className="text-neutral-700">{axisLabels[i]}:</span>{' '}
            <span className="text-[#00E5FF]">{v.toFixed(3)}</span>
          </div>
        ))}
        {colorPreview && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-4 h-4 rounded-sm border border-[#262626]"
              style={{ background: colorPreview, boxShadow: `0 0 8px ${colorPreview}40` }} />
            <span className="font-mono text-[8px] text-neutral-600">{colorPreview}</span>
          </div>
        )}
      </div>
    </div>
  );
}
