import { motion, useReducedMotion } from 'framer-motion';

interface HealthPulseProps {
  status?: 'ok' | 'error' | 'loading';
}

export function HealthPulse({ status = 'loading' }: HealthPulseProps) {
  const reducedMotion = useReducedMotion();

  const colorMap = {
    ok: 'var(--p-emerald)',
    error: 'var(--p-rose)',
    loading: 'var(--p-text-3)',
  };

  const labelMap = {
    ok: 'online',
    error: 'offline',
    loading: '…',
  };

  const color = colorMap[status];

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wider"
      style={{
        color: 'var(--p-text-3)',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--p-glass-border)',
        fontFamily: 'var(--p-font-mono)',
      }}
    >
      <motion.span
        className="block w-1.5 h-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        animate={
          reducedMotion
            ? undefined
            : status === 'ok'
              ? { scale: [1, 1.3, 1] }
              : status === 'error'
                ? { opacity: [1, 0.4, 1] }
                : { opacity: [0.4, 0.8, 0.4] }
        }
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span>{labelMap[status]}</span>
    </div>
  );
}
