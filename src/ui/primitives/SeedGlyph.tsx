/**
 * SeedGlyph — every seed's unique visual signature.
 *
 * Deterministic: the SVG geometry is derived from the seed's hash + domain
 * via the kernel's RNG (forked off `ui-glyph`). Same seed = same glyph,
 * forever, on any machine.
 *
 * Visual language: a 6-pointed asterism + 1–3 inner rings + a centered dot.
 * Each seed's hash determines the rotation of the asterism, the count and
 * radii of the rings, the dot offset, and the ink weight. Domain color
 * tints all strokes.
 *
 * Sizes: 16 (inline), 24 (left-rail), 32 (card), 48 (active-seed pin),
 * 64 (lineage node), 120 (empty-state).
 */
import React, { useMemo } from 'react';
import { rngFromHash } from '@/lib/kernel/rng';
import { useDomainColor } from '@/hooks/useDomainColor';

export interface SeedGlyphProps {
  /** Seed hash. If missing, falls back to a genesis glyph. */
  hash?: string | null;
  /** Domain — drives glyph color. */
  domain?: string | null;
  /** Pixel size (square). */
  size?: number;
  /** Whether to apply the breathing animation. */
  breathing?: boolean;
  className?: string;
  title?: string;
}

const GENESIS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000001';

interface GlyphSpec {
  rotation: number;
  rings: Array<{ r: number; opacity: number }>;
  spokes: number;
  spokeOffset: number;
  dotR: number;
  dotDx: number;
  dotDy: number;
  ink: number;        // stroke weight 0.8..1.6
}

function computeSpec(hash: string): GlyphSpec {
  const rng = rngFromHash(hash).fork('ui-glyph');
  const rotation     = rng.nextInt(0, 359);
  const ringCount    = 1 + rng.nextInt(0, 2);       // 1..3 rings
  const rings = Array.from({ length: ringCount }, () => ({
    r:       0.22 + rng.nextF64() * 0.18,            // 0.22..0.40
    opacity: 0.32 + rng.nextF64() * 0.34,            // 0.32..0.66
  }));
  const spokes      = 4 + rng.nextInt(0, 4) * 2;     // 4, 6, 8, 10, 12
  const spokeOffset = rng.nextF64() * (Math.PI * 2) / spokes;
  const dotR        = 0.04 + rng.nextF64() * 0.045;  // 0.04..0.085
  const dotDx       = (rng.nextF64() - 0.5) * 0.10;
  const dotDy       = (rng.nextF64() - 0.5) * 0.10;
  const ink         = 0.8 + rng.nextF64() * 0.8;     // 0.8..1.6
  return { rotation, rings, spokes, spokeOffset, dotR, dotDx, dotDy, ink };
}

export const SeedGlyph: React.FC<SeedGlyphProps> = ({
  hash,
  domain,
  size = 32,
  breathing = false,
  className,
  title,
}) => {
  const safeHash = hash && hash.length > 0 ? hash : GENESIS_HASH;
  const spec = useMemo(() => computeSpec(safeHash), [safeHash]);
  const color = useDomainColor(domain);

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.46; // outer asterism radius

  const stroke = spec.ink * (size / 32);
  const glow = color;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={title ?? 'seed glyph'}
      style={{
        display: 'block',
        animation: breathing ? 'p-glyph-breathe 4s ease-in-out infinite' : undefined,
      }}
    >
      <defs>
        <radialGradient id={`p-glyph-bg-${safeHash.slice(0, 8)}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={glow} stopOpacity={0.30} />
          <stop offset="55%"  stopColor={glow} stopOpacity={0.08} />
          <stop offset="100%" stopColor={glow} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* halo */}
      <circle cx={cx} cy={cy} r={size * 0.48} fill={`url(#p-glyph-bg-${safeHash.slice(0, 8)})`} />

      <g transform={`rotate(${spec.rotation} ${cx} ${cy})`}>
        {/* rings */}
        {spec.rings.map((ring, i) => (
          <circle
            key={`r${i}`}
            cx={cx}
            cy={cy}
            r={ring.r * size}
            fill="none"
            stroke={color}
            strokeWidth={stroke * 0.7}
            opacity={ring.opacity}
          />
        ))}

        {/* asterism spokes */}
        {Array.from({ length: spec.spokes }).map((_, i) => {
          const a = spec.spokeOffset + (i / spec.spokes) * Math.PI * 2;
          const x1 = cx + Math.cos(a) * size * 0.20;
          const y1 = cy + Math.sin(a) * size * 0.20;
          const x2 = cx + Math.cos(a) * R;
          const y2 = cy + Math.sin(a) * R;
          return (
            <line
              key={`s${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              opacity={0.92}
            />
          );
        })}

        {/* centered dot */}
        <circle
          cx={cx + spec.dotDx * size}
          cy={cy + spec.dotDy * size}
          r={spec.dotR * size}
          fill={color}
          style={{ filter: `drop-shadow(0 0 ${size * 0.06}px ${glow})` }}
        />
      </g>
    </svg>
  );
};

export default SeedGlyph;
