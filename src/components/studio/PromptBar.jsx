import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSeed } from '@/services/api';
import { Sparkles, Loader2 } from 'lucide-react';

// Genesis particles that fly upward on seed creation
function GenesisParticles({ active }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 300,
    y: -(Math.random() * 200 + 60),
    delay: Math.random() * 0.3,
    size: 2 + Math.random() * 3,
  }));

  return (
    <AnimatePresence>
      {active && particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute bottom-full left-1/2 rounded-full"
          style={{ width: p.size, height: p.size, background: '#00E5FF' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </AnimatePresence>
  );
}

export default function PromptBar({ onSeedCreated }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setShowParticles(true);

    try {
      const seed = await generateSeed(prompt.trim());
      setSuccess(true);
      onSeedCreated(seed);
      setPrompt('');
      setTimeout(() => setSuccess(false), 1200);
    } catch (err) {
      console.error('Generation failed:', err);
    }
    setLoading(false);
    setTimeout(() => setShowParticles(false), 1000);
  }, [prompt, loading, onSeedCreated]);

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20" data-testid="prompt-bar-container">
      {/* Genesis particles */}
      <div className="relative">
        <GenesisParticles active={showParticles} />
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className={`relative prompt-glow glass-panel flex items-center gap-2 px-4 py-2.5 transition-all duration-300 ${
          success ? 'glow-cyan-strong' : ''
        }`}
        animate={success ? { scale: [1, 1.01, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {/* Scanline overlay on the bar */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute inset-0 animate-scanline" style={{
            background: 'linear-gradient(transparent, rgba(0,229,255,0.04), transparent)',
            height: '40%',
          }} />
        </div>

        <motion.div
          animate={loading ? { rotate: 360 } : { rotate: 0 }}
          transition={loading ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
        >
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
        </motion.div>

        <input
          data-testid="prompt-input"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your creation... (e.g., 'a menacing iron warrior')"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 outline-none font-mono relative z-10"
          disabled={loading}
        />

        <motion.button
          data-testid="prompt-submit-btn"
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-4 py-1.5 bg-primary text-black font-bold text-[10px] uppercase tracking-wider hover:bg-primary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 relative z-10 btn-press"
          whileHover={{ boxShadow: '0 0 12px rgba(0,229,255,0.3)' }}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Generate'}
        </motion.button>
      </motion.form>
    </div>
  );
}
