import { motion, useReducedMotion } from 'framer-motion';

interface GerminatingSpinnerProps {
  label?: string;
}

export function GerminatingSpinner({ label = 'Growing seed…' }: GerminatingSpinnerProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center gap-3 select-none">
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Dot → helix animation */}
        {reducedMotion ? (
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--p-cyan)' }}
          />
        ) : (
          <>
            <motion.div
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--p-cyan)' }}
              animate={{
                scale: [1, 0.3, 0.3, 1],
                opacity: [1, 0.5, 0.5, 1],
                x: [0, -8, 8, 0],
                y: [0, -6, -6, 0],
              }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--p-violet)' }}
              animate={{
                scale: [0.3, 1, 1, 0.3],
                opacity: [0.5, 1, 1, 0.5],
                x: [0, 8, -8, 0],
                y: [0, 6, 6, 0],
              }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}
      </div>
      <span
        className="text-[10px] uppercase tracking-widest"
        style={{ color: 'var(--p-text-3)', fontFamily: 'var(--p-font-mono)' }}
      >
        {label}
      </span>
    </div>
  );
}
