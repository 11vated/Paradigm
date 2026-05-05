import { motion, AnimatePresence } from 'framer-motion';

/**
 * MutationRipple — Chromatic aberration overlay triggered on mutation.
 * Absolutely positioned over the viewport, fades out over 600ms.
 */
export default function MutationRipple({ active, color = '#FF0055' }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Expanding ring */}
          <motion.div
            className="absolute top-1/2 left-1/2"
            initial={{ width: 0, height: 0, x: '-50%', y: '-50%', opacity: 0.6 }}
            animate={{ width: 600, height: 600, x: '-50%', y: '-50%', opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              borderRadius: '50%',
              border: `2px solid ${color}`,
              boxShadow: `0 0 30px ${color}40, inset 0 0 30px ${color}20`,
            }}
          />

          {/* Chromatic aberration flash */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: `linear-gradient(45deg, ${color}10, transparent, #00E5FF10)`,
              mixBlendMode: 'screen',
            }}
          />

          {/* Glitch bars */}
          {[0.2, 0.45, 0.7].map((pos, i) => (
            <motion.div
              key={i}
              className="absolute left-0 right-0"
              initial={{ opacity: 0.4, height: 2, y: `${pos * 100}%` }}
              animate={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              style={{ background: color }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
