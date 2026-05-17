import { motion, useReducedMotion } from 'framer-motion';

interface SeedGlyphProps {
  animated?: boolean;
  size?: number;
}

export function SeedGlyph({ animated = true, size = 24 }: SeedGlyphProps) {
  const reducedMotion = useReducedMotion();
  const hw = size / 2;
  const r = size * 0.32;
  const strands = 6;

  const strandPaths = Array.from({ length: strands }, (_, i) => {
    const angle = (i / strands) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x1 = hw + cos * r;
    const y1 = hw + sin * r;
    const x2 = hw - cos * r;
    const y2 = hw - sin * r;
    return { x1, y1, x2, y2, id: i };
  });

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0"
      animate={
        animated && !reducedMotion
          ? { rotate: 360 }
          : undefined
      }
      transition={
        animated && !reducedMotion
          ? { repeat: Infinity, duration: 30, ease: 'linear' }
          : undefined
      }
    >
      {strandPaths.map(({ x1, y1, x2, y2, id }) => (
        <line
          key={id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={id % 2 === 0 ? 'var(--p-cyan)' : 'var(--p-violet)'}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={Math.max(0.1, 0.7 - id * 0.08)}
          style={{ filter: 'drop-shadow(0 0 2px rgba(0,229,255,0.3))' }}
        />
      ))}
      <circle
        cx={hw}
        cy={hw}
        r={2}
        fill="var(--p-cyan)"
        opacity={0.6}
      />
    </motion.svg>
  );
}
