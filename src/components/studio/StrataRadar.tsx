/**
 * StrataRadar — 3×3 grid + 9-axis radar view of the 9 canonical strata.
 *
 * Doctrine v2 §III.3 — every artifact lives at the composition of some subset
 * of these 9 axes. The radar surfaces the *distribution* of conformance across
 * axes, not just the global score, so users can see *which* axis a seed
 * excels at and *which* needs work.
 *
 * Modes:
 *  - grid (default): 3×3 cells, one per stratum, with score + pass/fail
 *  - radar:          9-axis SVG radar overlay
 *
 * Reads from:
 *  - activeSeed.strata.perStratum (Record<Stratum, number>)
 *  - activeSeed.strata.overall    (number 0-1)
 * Falls back to calculating from the seed's raw artifact when needed.
 */
import React, { useMemo } from 'react';
import type { ActiveSeed } from '@/stores/activeSeed';
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';

export type StratumName =
  | 'Form' | 'Motion' | 'Sound' | 'Mind'
  | 'Story' | 'World' | 'Field' | 'Culture' | 'Time';

export const STRATA: ReadonlyArray<{ name: StratumName; blurb: string }> = [
  { name: 'Form',    blurb: 'shape, geometry, topology' },
  { name: 'Motion',  blurb: 'kinematics, dynamics, gait' },
  { name: 'Sound',   blurb: 'timbre, rhythm, harmony' },
  { name: 'Mind',    blurb: 'intent, behavior, cognition' },
  { name: 'Story',   blurb: 'narrative, dialogue, beat' },
  { name: 'World',   blurb: 'space, biome, place' },
  { name: 'Field',   blurb: 'physics, magic, rule-set' },
  { name: 'Culture', blurb: 'language, custom, ritual' },
  { name: 'Time',    blurb: 'causality, history, era' },
] as const;

export type StrataScores = Record<StratumName, number>;

function emptyScores(): StrataScores {
  return {
    Form: 0, Motion: 0, Sound: 0, Mind: 0, Story: 0,
    World: 0, Field: 0, Culture: 0, Time: 0,
  };
}

function readScores(seed: ActiveSeed | null): { per: StrataScores; overall: number; source: 'live' | 'computed' | 'none' } {
  if (!seed) return { per: emptyScores(), overall: 0, source: 'none' };

  // 1) Use pre-computed perStratum if present.
  const per = (seed.strata?.perStratum as Partial<StrataScores> | undefined) ?? null;
  if (per && Object.keys(per).length >= 3) {
    const filled = emptyScores();
    let sum = 0;
    let count = 0;
    for (const s of STRATA) {
      const v = (per as Record<string, number>)[s.name];
      if (typeof v === 'number' && Number.isFinite(v)) {
        filled[s.name] = v;
        sum += v;
        count += 1;
      } else {
        filled[s.name] = 0;
      }
    }
    const overall = seed.strata?.overall ?? (count > 0 ? sum / count : 0);
    return { per: filled, overall, source: 'live' };
  }

  // 2) Fall back to a single overall number.
  if (typeof seed.strata?.overall === 'number') {
    return { per: emptyScores(), overall: seed.strata.overall, source: 'live' };
  }

  // 3) Compute from raw artifact as a last resort.
  try {
    const raw = (seed as any).raw;
    if (raw) {
      const computed = calculateStratumConformance([raw]);
      const filled = emptyScores();
      let sum = 0;
      let count = 0;
      for (const s of STRATA) {
        const v = (computed.perStratum as Record<string, { score?: number }>)[s.name]?.score;
        if (typeof v === 'number' && Number.isFinite(v)) {
          filled[s.name] = v;
          sum += v;
          count += 1;
        }
      }
      if (count > 0) {
        return { per: filled, overall: (computed as { overall?: number }).overall ?? sum / count, source: 'computed' };
      }
    }
  } catch {
    /* fall through to zeroed state */
  }

  return { per: emptyScores(), overall: 0, source: 'none' };
}

function scoreBucket(score01: number): 'high' | 'mid' | 'low' | 'none' {
  if (score01 >= 0.85) return 'high';
  if (score01 >= 0.55) return 'mid';
  if (score01 > 0) return 'low';
  return 'none';
}

const BUCKET_COLOR: Record<ReturnType<typeof scoreBucket>, string> = {
  high: '#7ee08c',
  mid: '#e0c87e',
  low: '#e08e7e',
  none: 'rgba(255,255,255,0.15)',
};

interface StrataRadarProps {
  seed: ActiveSeed | null;
  /** "grid" (default) or "radar" — radar is the 9-axis SVG overlay. */
  mode?: 'grid' | 'radar';
  /** Compact = 80px cells; full = 110px. */
  density?: 'compact' | 'full';
  /** Optional click handler for a stratum cell. */
  onStratumClick?: (s: StratumName) => void;
  /** Title shown above the radar. */
  title?: string;
}

export const StrataRadar: React.FC<StrataRadarProps> = ({
  seed,
  mode = 'grid',
  density = 'compact',
  onStratumClick,
  title,
}) => {
  const { per, overall, source } = useMemo(() => readScores(seed), [seed]);

  if (mode === 'radar') {
    return <StrataRadarSvg per={per} overall={overall} source={source} title={title} onStratumClick={onStratumClick} />;
  }
  return <StrataGrid per={per} overall={overall} source={source} density={density} title={title} onStratumClick={onStratumClick} />;
};

/* ─── Grid view ─────────────────────────────────────────────────── */

interface StrataGridProps {
  per: StrataScores;
  overall: number;
  source: 'live' | 'computed' | 'none';
  density: 'compact' | 'full';
  title?: string;
  onStratumClick?: (s: StratumName) => void;
}

const StrataGrid: React.FC<StrataGridProps> = ({ per, overall, source, density, title, onStratumClick }) => {
  const cellSize = density === 'full' ? 110 : 86;
  return (
    <div className="p-strata-radar" data-density={density} data-source={source}>
      {title && (
        <div className="p-strata-radar-title" style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span>{title}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }} title="Overall conformance">
            overall {Math.round(overall * 100)}%
          </span>
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 4,
        }}
        role="group"
        aria-label="9-strata conformance"
      >
        {STRATA.map((s) => {
          const v = per[s.name] ?? 0;
          const pct = Math.round(v * 100);
          const bucket = scoreBucket(v);
          const color = BUCKET_COLOR[bucket];
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => onStratumClick?.(s.name)}
              className="p-strata-cell"
              data-bucket={bucket}
              data-stratum={s.name}
              title={`${s.name} · ${s.blurb} · ${pct}%`}
              style={{
                appearance: 'none',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${color}`,
                borderRadius: 2,
                padding: 6,
                minHeight: cellSize,
                cursor: onStratumClick ? 'pointer' : 'default',
                color: 'inherit',
                fontFamily: 'inherit',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.name}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--r-font-num, monospace)', color }}>{pct}</span>
              </div>
              <div
                aria-hidden
                style={{
                  height: 3,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: color,
                    transition: 'width 200ms ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', lineHeight: 1.2 }}>{s.blurb}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Radar view ─────────────────────────────────────────────────── */

interface StrataRadarSvgProps {
  per: StrataScores;
  overall: number;
  source: 'live' | 'computed' | 'none';
  title?: string;
  onStratumClick?: (s: StratumName) => void;
}

const StrataRadarSvg: React.FC<StrataRadarSvgProps> = ({ per, overall, source, title, onStratumClick }) => {
  const cx = 110;
  const cy = 110;
  const radius = 92;
  const n = STRATA.length;

  const points = STRATA.map((s, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const v = per[s.name] ?? 0;
    const r = radius * Math.max(0, Math.min(1, v));
    return {
      name: s.name,
      blurb: s.blurb,
      score: v,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      lx: cx + Math.cos(angle) * (radius + 14),
      ly: cy + Math.sin(angle) * (radius + 14),
      bucket: scoreBucket(v),
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map((t) => {
    const ringPoints = STRATA.map((_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = radius * t;
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
    });
    return { t, points: ringPoints.join(' ') };
  });

  return (
    <div className="p-strata-radar" data-source={source}>
      {title && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {title} · overall {Math.round(overall * 100)}%
        </div>
      )}
      <svg viewBox="0 0 220 240" width="100%" style={{ maxWidth: 320, display: 'block' }} role="img" aria-label="9-axis strata radar">
        {/* concentric rings */}
        {rings.map((r) => (
          <polygon
            key={r.t}
            points={r.points}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={0.5}
          />
        ))}
        {/* axes */}
        {STRATA.map((_, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(angle) * radius}
              y2={cy + Math.sin(angle) * radius}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={0.5}
            />
          );
        })}
        {/* the actual radar polygon */}
        <polygon
          points={polygon}
          fill="rgba(124, 224, 140, 0.18)"
          stroke="rgba(124, 224, 140, 0.7)"
          strokeWidth={1.2}
        />
        {/* per-axis dots */}
        {points.map((p) => (
          <circle
            key={`dot-${p.name}`}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill={BUCKET_COLOR[p.bucket]}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={0.5}
          />
        ))}
        {/* axis labels */}
        {points.map((p) => (
          <g
            key={`lbl-${p.name}`}
            onClick={() => onStratumClick?.(p.name as StratumName)}
            style={{ cursor: onStratumClick ? 'pointer' : 'default' }}
          >
            <text
              x={p.lx}
              y={p.ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              fontFamily="var(--r-font-mono, monospace)"
              fill="rgba(255,255,255,0.7)"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {p.name}
            </text>
            <text
              x={p.lx}
              y={p.ly + 9}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={7}
              fontFamily="var(--r-font-num, monospace)"
              fill={BUCKET_COLOR[p.bucket]}
            >
              {Math.round(p.score * 100)}
            </text>
          </g>
        ))}
        {/* center */}
        <circle cx={cx} cy={cy} r={1.5} fill="rgba(255,255,255,0.4)" />
      </svg>
    </div>
  );
};

export default StrataRadar;
