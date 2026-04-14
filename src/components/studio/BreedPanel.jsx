import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { breedSeeds } from '@/services/api';
import { Loader2, Heart } from 'lucide-react';
import BreedingHelix from './effects/BreedingHelix';

export default function BreedPanel({ gallery, onBred }) {
  const [parentA, setParentA] = useState('');
  const [parentB, setParentB] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelix, setShowHelix] = useState(false);
  const [offspring, setOffspring] = useState(null);

  const handleBreed = async () => {
    if (!parentA || !parentB || parentA === parentB || loading) return;
    setLoading(true);
    setShowHelix(true);

    try {
      const child = await breedSeeds(parentA, parentB);
      setOffspring(child);
      onBred(child);
    } catch (e) { console.error(e); }

    setTimeout(() => {
      setShowHelix(false);
      setTimeout(() => setOffspring(null), 1500);
    }, 1800);
    setLoading(false);
  };

  const seeds = Array.isArray(gallery) ? gallery : [];

  return (
    <div className="p-3 space-y-4" data-testid="breed-panel">
      <div className="flex items-center gap-2">
        <Heart className="w-3 h-3 text-accent" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Breed</span>
      </div>

      {seeds.length < 2 ? (
        <p className="font-mono text-[10px] text-neutral-600">Need at least 2 seeds in gallery to breed.</p>
      ) : (
        <>
          {/* Parent A */}
          <div className="space-y-1">
            <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Parent A</label>
            <select
              data-testid="breed-parent-a"
              value={parentA}
              onChange={(e) => setParentA(e.target.value)}
              className="w-full h-7 bg-transparent border border-neutral-800 text-[10px] font-mono text-white px-2 focus:border-accent/40 transition-colors"
            >
              <option value="">Select seed...</option>
              {seeds.map(s => (
                <option key={s.id} value={s.id}>{s.$name} (G{s.$lineage?.generation || 0})</option>
              ))}
            </select>
          </div>

          {/* Helix animation in the middle */}
          <div className="flex items-center justify-center min-h-[40px]">
            <AnimatePresence mode="wait">
              {showHelix ? (
                <BreedingHelix active={true} />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-[10px] text-neutral-700"
                >
                  &times;
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Parent B */}
          <div className="space-y-1">
            <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Parent B</label>
            <select
              data-testid="breed-parent-b"
              value={parentB}
              onChange={(e) => setParentB(e.target.value)}
              className="w-full h-7 bg-transparent border border-neutral-800 text-[10px] font-mono text-white px-2 focus:border-accent/40 transition-colors"
            >
              <option value="">Select seed...</option>
              {seeds.map(s => (
                <option key={s.id} value={s.id}>{s.$name} (G{s.$lineage?.generation || 0})</option>
              ))}
            </select>
          </div>

          {/* Offspring flash */}
          <AnimatePresence>
            {offspring && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-2 border border-accent/30 bg-accent/5 glow-purple"
              >
                <div className="font-mono text-[8px] text-accent uppercase">Offspring Created</div>
                <div className="font-mono text-[10px] text-neutral-300">{offspring.$name || offspring.seed?.$name}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            data-testid="breed-submit-btn"
            onClick={handleBreed}
            disabled={loading || !parentA || !parentB || parentA === parentB}
            className="w-full py-2 bg-accent text-white font-bold text-[10px] uppercase tracking-wider hover:bg-accent/80 transition-colors disabled:opacity-30 flex items-center justify-center gap-2 btn-press"
            whileHover={{ boxShadow: '0 0 16px rgba(138,43,226,0.3)' }}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className="w-3 h-3" />}
            {loading ? 'Breeding...' : 'Breed Seeds'}
          </motion.button>
        </>
      )}
    </div>
  );
}
