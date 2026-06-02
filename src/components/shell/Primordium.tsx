import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface PrimordiumProps {
  prompt?: string;
}

/**
 * Empty-state visual for the Preview pane.
 * A glowing primordial orb that "germinates" (brightens, vibrates faster)
 * as the user types in the prompt bar. Replaces the black-void empty state.
 *
 * Uses inline styles only — no Tailwind h-full dependency — so it always
 * fills its container reliably.
 */
export function Primordium({ prompt = '' }: PrimordiumProps) {
  const reducedMotion = useReducedMotion();
  const [brightness, setBrightness] = useState(0.4);

  useEffect(() => {
    const intensity = Math.min(1, prompt.length / 40);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from prompt; effect is correct
    setBrightness(0.4 + intensity * 0.6);
  }, [prompt]);

  const cycleDur = prompt.length > 0 ? 1.6 : 3.2;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {/* Orb (with glow + core) */}
      <motion.div
        style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        animate={
          reducedMotion
            ? undefined
            : {
                scale: [1, 1.06, 1],
                opacity: [brightness, Math.min(1, brightness + 0.15), brightness],
              }
        }
        transition={{ duration: cycleDur, ease: 'easeInOut', repeat: Infinity }}
      >
        {/* Outer halo */}
        <div
          style={{
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(0,229,255,${brightness * 0.30}) 0%, rgba(167,139,250,${brightness * 0.10}) 40%, transparent 75%)`,
            filter: 'blur(18px)',
          }}
        />
        {/* Mid ring */}
        <div
          style={{
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: '50%',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            boxShadow: `0 0 24px rgba(0,229,255,${brightness * 0.30})`,
          }}
        />
        {/* Core orb */}
        <div
          style={{
            position: 'relative',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, rgba(180,245,255,${brightness * 0.95}) 0%, rgba(0,229,255,${brightness * 0.55}) 35%, rgba(167,139,250,${brightness * 0.25}) 75%, transparent 100%)`,
            border: '1px solid rgba(0, 229, 255, 0.4)',
            boxShadow: `0 0 32px rgba(0,229,255,${brightness * 0.6}), inset 0 0 20px rgba(255,255,255,${brightness * 0.10})`,
          }}
        />
      </motion.div>

      {/* Title */}
      <div
        style={{
          fontFamily: 'var(--p-font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 3,
          color: 'var(--p-cyan)',
          opacity: 0.7,
        }}
      >
        Primordium
      </div>

      {/* Hint text */}
      <motion.div
        style={{
          fontFamily: 'var(--p-font-mono)',
          fontSize: 11,
          color: 'var(--p-text-3)',
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 1.5,
        }}
        animate={reducedMotion ? undefined : { opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {prompt.trim().length > 0
          ? 'Germinating — press Generate to grow this seed'
          : 'Describe your creation in the prompt bar below'}
      </motion.div>

      {/* Live prompt echo */}
      {prompt.trim().length > 0 && (
        <motion.div
          style={{
            fontFamily: 'var(--p-font-mono)',
            fontSize: 11,
            color: 'var(--p-text-2)',
            maxWidth: 320,
            textAlign: 'center',
            padding: '6px 14px',
            borderRadius: 6,
            background: 'rgba(0, 229, 255, 0.04)',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          “{prompt.trim()}”
        </motion.div>
      )}
    </div>
  );
}
