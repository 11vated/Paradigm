import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

/**
 * BreedingHelix — Animated SVG double-helix for seed breeding.
 * Two sine waves intertwine with connecting rungs, then burst into offspring.
 */
export default function BreedingHelix({ active, onComplete }) {
  const width = 200;
  const height = 120;
  const steps = 24;

  const helixPaths = useMemo(() => {
    const strand1 = [];
    const strand2 = [];
    const rungs = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * width;
      const y1 = height / 2 + Math.sin(t * Math.PI * 3) * 30;
      const y2 = height / 2 - Math.sin(t * Math.PI * 3) * 30;
      strand1.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y1.toFixed(1)}`);
      strand2.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y2.toFixed(1)}`);
      if (i % 3 === 0 && i > 0 && i < steps) {
        rungs.push({ x1: x, y1, x2: x, y2 });
      }
    }

    return {
      strand1: strand1.join(' '),
      strand2: strand2.join(' '),
      rungs,
    };
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {active && (
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.3 }}
        >
          <svg width={width} height={height} className="overflow-visible">
            {/* Strand 1 — Cyan */}
            <motion.path
              d={helixPaths.strand1}
              fill="none"
              stroke="#00E5FF"
              strokeWidth={2}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.5))' }}
            />

            {/* Strand 2 — Magenta */}
            <motion.path
              d={helixPaths.strand2}
              fill="none"
              stroke="#FF0055"
              strokeWidth={2}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: 'easeInOut', delay: 0.1 }}
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,0,85,0.5))' }}
            />

            {/* Connecting rungs — Purple */}
            {helixPaths.rungs.map((rung, i) => (
              <motion.line
                key={i}
                x1={rung.x1} y1={rung.y1}
                x2={rung.x2} y2={rung.y2}
                stroke="#8A2BE2"
                strokeWidth={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.2 }}
                style={{ filter: 'drop-shadow(0 0 3px rgba(138,43,226,0.4))' }}
              />
            ))}

            {/* Center burst on completion */}
            <motion.circle
              cx={width / 2} cy={height / 2} r={0}
              fill="#8A2BE2"
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: 40, opacity: [0, 0.4, 0] }}
              transition={{ delay: 1.2, duration: 0.4, ease: 'easeOut' }}
              style={{ filter: 'blur(8px)' }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
