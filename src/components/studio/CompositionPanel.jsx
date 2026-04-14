import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, ArrowRight, Loader2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { api } from '@/services/api';
import { DOMAIN_COLORS } from '@/lib/constants';

export default function CompositionPanel({ seed, onComposed }) {
  const [targetDomain, setTargetDomain] = useState('sprite');
  const [loading, setLoading] = useState(false);
  const [graph, setGraph] = useState(null);
  const [path, setPath] = useState(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    api.get('/composition/graph').then(r => setGraph(r.data)).catch(() => {});
  }, []);

  const handleCompose = async () => {
    if (!seed || loading) return;
    setLoading(true);
    setComposing(true);
    try {
      const res = await api.post(`/seeds/${seed.id}/compose`, { target_domain: targetDomain });
      if (res.data.seed) onComposed(res.data.seed);
      setPath(res.data.path);
    } catch (e) { console.error(e); }
    setLoading(false);
    setTimeout(() => setComposing(false), 2000);
  };

  const handleFindPath = async () => {
    if (!seed) return;
    try {
      const res = await api.get('/composition/path', { params: { source: seed.$domain, target: targetDomain } });
      setPath(res.data);
    } catch (e) { console.error(e); }
  };

  const availableTargets = graph?.edges?.filter(e => e.source === seed?.$domain).map(e => e.target) || [];
  const sourceColor = DOMAIN_COLORS[seed?.$domain] || '#525252';
  const targetColor = DOMAIN_COLORS[targetDomain] || '#525252';

  return (
    <div className="p-3 space-y-4" data-testid="composition-panel">
      <div className="flex items-center gap-2">
        <GitBranch className="w-3 h-3 text-accent" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Compose</span>
      </div>

      {!seed ? (
        <p className="font-mono text-[10px] text-neutral-600">Select a seed to compose across domains.</p>
      ) : (
        <>
          {/* Source */}
          <div className="p-2 border border-neutral-900 bg-black/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: sourceColor }} />
            <div className="font-mono text-[8px] text-neutral-700 uppercase">Source</div>
            <div className="font-mono text-[10px]" style={{ color: sourceColor }}>{seed.$domain}</div>
            <div className="font-mono text-[9px] text-neutral-400">{seed.$name}</div>
          </div>

          {/* Energy flow arrow */}
          <div className="flex items-center justify-center relative py-1">
            <AnimatePresence>
              {composing ? (
                <motion.div
                  className="energy-line w-full absolute"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background: `linear-gradient(90deg, ${sourceColor}00, ${sourceColor}, #8A2BE2, ${targetColor}, ${targetColor}00)`,
                    backgroundSize: '200% 100%',
                  }}
                />
              ) : null}
            </AnimatePresence>
            <ArrowRight className="w-4 h-4 text-neutral-700 relative z-10" />
          </div>

          {/* Target Domain */}
          <div className="space-y-1">
            <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Target Domain</label>
            <Select value={targetDomain} onValueChange={(v) => { setTargetDomain(v); setPath(null); }}>
              <SelectTrigger className="h-7 text-[10px] font-mono bg-transparent border-neutral-800 rounded-none" data-testid="compose-target-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-neutral-800 max-h-48">
                {['sprite', 'music', 'fullgame', 'animation', 'ecosystem', 'visual2d', 'narrative', 'physics', 'procedural', 'audio', 'character', 'choreography', 'geometry3d', 'particle', 'shader', 'ui'].map(d => (
                  <SelectItem key={d} value={d} className="text-[10px] font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: DOMAIN_COLORS[d] || '#525252' }} />
                      {d}
                      {availableTargets.includes(d) && <span className="text-accent text-[8px]">(direct)</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Composition Path */}
          <AnimatePresence>
            {path && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-2 border border-accent/20 bg-accent/5 overflow-hidden"
              >
                <div className="font-mono text-[8px] text-accent uppercase mb-1">Composition Path</div>
                {path.path ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    {path.path.map((step, i) => (
                      <motion.span
                        key={i}
                        className="font-mono text-[9px]"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 }}
                      >
                        {i > 0 && <span className="text-neutral-700 mx-1">→</span>}
                        <span className="text-neutral-400">{step[0]}</span>
                        <span className="text-accent/60 text-[8px] ml-0.5">({step[2]})</span>
                      </motion.span>
                    ))}
                    <span className="text-neutral-700 mx-1">→</span>
                    <span style={{ color: targetColor }} className="font-mono text-[9px] font-bold">{targetDomain}</span>
                  </div>
                ) : (
                  <span className="font-mono text-[9px] text-red-400">No path found</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex gap-2">
            <motion.button
              data-testid="find-path-btn"
              onClick={handleFindPath}
              className="flex-1 py-1.5 border border-neutral-800 text-neutral-400 font-mono text-[9px] hover:border-neutral-600 transition-colors btn-press"
              whileHover={{ boxShadow: '0 0 8px rgba(138,43,226,0.15)' }}
            >
              Find Path
            </motion.button>
            <motion.button
              data-testid="compose-btn"
              onClick={handleCompose}
              disabled={loading}
              className="flex-1 py-1.5 bg-accent text-white font-bold text-[9px] uppercase tracking-wider hover:bg-accent/80 transition-colors disabled:opacity-30 flex items-center justify-center gap-1 btn-press"
              whileHover={{ boxShadow: '0 0 16px rgba(138,43,226,0.3)' }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitBranch className="w-3 h-3" />}
              Compose
            </motion.button>
          </div>

          {/* Functor Graph Mini */}
          {graph && (
            <div className="pt-2 border-t border-neutral-900">
              <div className="font-mono text-[8px] text-neutral-700 uppercase mb-1">Functor Graph ({graph.edges?.length} bridges)</div>
              <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                {graph.edges?.map((e, i) => (
                  <div key={i} className="flex items-center gap-1 font-mono text-[8px]">
                    <span className="w-1 h-1 rounded-full" style={{ background: DOMAIN_COLORS[e.source] || '#333' }} />
                    <span className="text-neutral-500">{e.source}</span>
                    <span className="text-neutral-700">→</span>
                    <span className="text-neutral-500">{e.target}</span>
                    <span className="text-neutral-800 ml-auto">{e.functor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
