import { motion, AnimatePresence } from 'framer-motion';

/**
 * CategoricalCarousel — Pill-based selector for categorical genes.
 * Selected option glows cyan, others are dim. Shockwave on selection.
 */
export default function CategoricalCarousel({ value, options = [], onChange, color = '#00E5FF' }) {
  const choices = options.length > 0 ? options : [value || 'unknown'];

  return (
    <div className="flex flex-wrap gap-1.5">
      <AnimatePresence mode="popLayout">
        {choices.map((opt) => {
          const isActive = opt === value;
          return (
            <motion.button
              key={opt}
              layout
              onClick={() => onChange?.(opt)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                boxShadow: isActive
                  ? `0 0 12px ${color}40, inset 0 0 8px ${color}15`
                  : '0 0 0 transparent',
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`
                px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider
                border transition-colors duration-200
                ${isActive
                  ? 'border-transparent text-black font-bold'
                  : 'border-[#262626] text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'
                }
              `}
              style={isActive ? { background: color, color: '#050505' } : {}}
            >
              {opt}
              {/* Ripple on selection */}
              {isActive && (
                <motion.span
                  className="absolute inset-0 rounded-sm pointer-events-none"
                  initial={{ boxShadow: `0 0 0 0 ${color}60` }}
                  animate={{ boxShadow: `0 0 0 8px ${color}00` }}
                  transition={{ duration: 0.4 }}
                  style={{ position: 'absolute', inset: 0 }}
                />
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
