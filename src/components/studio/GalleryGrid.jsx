import { motion, AnimatePresence } from 'framer-motion';
import { DOMAIN_COLORS } from '@/lib/constants';

export default function GalleryGrid({ seeds, onSelect, selectedId }) {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 p-4" data-testid="gallery-empty">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border border-dashed border-neutral-800 flex items-center justify-center animate-breathe">
            <div className="w-2 h-2 rounded-full bg-primary/30" />
          </div>
          <p className="font-mono text-[10px] text-neutral-600 text-center">
            Gallery empty. Generate seeds to populate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px bg-neutral-900 p-px" data-testid="gallery-grid">
      <AnimatePresence mode="popLayout">
        {seeds.map((seed, index) => {
          const isSelected = seed.id === selectedId;
          const color = DOMAIN_COLORS[seed.$domain] || '#525252';
          const fitness = seed.$fitness?.overall || 0;
          return (
            <motion.button
              key={seed.id}
              layout
              data-testid={`gallery-seed-${seed.id}`}
              onClick={() => onSelect(seed)}
              initial={{ opacity: 0, scale: 0.5, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                type: 'spring', stiffness: 300, damping: 25,
                delay: Math.min(index * 0.03, 0.3),
              }}
              whileHover={{
                backgroundColor: 'rgba(0,229,255,0.04)',
                boxShadow: `0 0 16px ${color}15, inset 0 0 16px ${color}05`,
                y: -1,
              }}
              className={`bg-[#050505] p-3 text-left transition-colors relative overflow-hidden ${
                isSelected ? 'ring-1 ring-primary/50 glow-cyan' : ''
              }`}
            >
              {/* Scanline on selected */}
              {isSelected && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 animate-scanline opacity-20" style={{
                    background: `linear-gradient(transparent, ${color}10, transparent)`,
                    height: '30%',
                  }} />
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-1.5 relative">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                  animate={isSelected ? { boxShadow: `0 0 8px ${color}` } : { boxShadow: 'none' }}
                />
                <span className="font-mono text-[8px] text-neutral-600 uppercase">{seed.$domain}</span>
              </div>
              <div className="font-heading text-[11px] text-neutral-300 truncate mb-1 relative">
                {seed.$name || 'Untitled'}
              </div>
              <div className="fitness-bar mb-1">
                <motion.div
                  className="fitness-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${fitness * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between relative">
                <span className="font-mono text-[8px] text-neutral-700">G{seed.$lineage?.generation || 0}</span>
                <span className="font-mono text-[8px] text-neutral-700">{(fitness * 100).toFixed(0)}%</span>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
