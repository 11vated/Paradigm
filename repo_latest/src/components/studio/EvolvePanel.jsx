import { useState } from 'react';
import { evolveSeed } from '@/services/api';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, Zap } from 'lucide-react';

export default function EvolvePanel({ seed, onEvolved }) {
  const [algorithm, setAlgorithm] = useState('map_elites');
  const [popSize, setPopSize] = useState(12);
  const [generations, setGenerations] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleEvolve = async () => {
    if (!seed || loading) return;
    setLoading(true);
    try {
      const result = await evolveSeed(seed.id, { algorithm, population_size: popSize, generations });
      onEvolved(result.population || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-5 p-1" data-testid="evolve-panel">
      {!seed ? (
        <p className="font-mono text-[10px] text-[#555] p-3 border border-[#1a1a1a] rounded-sm bg-[#050505] text-center">
          No seed selected for evolution.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] text-[#888] uppercase tracking-widest">Algorithm Engine</label>
            <Select value={algorithm} onValueChange={setAlgorithm}>
              <SelectTrigger className="h-8 text-[10px] font-mono bg-[#050505] border-[#1a1a1a] rounded-sm text-[#ccc] focus:ring-0 focus:border-secondary/50" data-testid="evolve-algorithm-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#050505] border-[#1a1a1a] rounded-sm">
                {['map_elites', 'ga', 'cma_es', 'novelty'].map(a => (
                  <SelectItem key={a} value={a} className="text-[10px] font-mono border-b border-[#111] last:border-0 hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white cursor-pointer transition-colors text-[#ccc]">
                    {a.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="font-mono text-[9px] text-[#888] uppercase tracking-widest">Population Bound</label>
              <span className="font-mono text-[9px] text-[#ccc] tabular-nums bg-[#1a1a1a] px-1.5 py-0.5 rounded-sm">{popSize}</span>
            </div>
            <Slider value={[popSize]} onValueChange={([v]) => setPopSize(v)} min={4} max={50} step={2} data-testid="evolve-pop-slider" className="pt-1" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="font-mono text-[9px] text-[#888] uppercase tracking-widest">Generational Depth</label>
              <span className="font-mono text-[9px] text-[#ccc] tabular-nums bg-[#1a1a1a] px-1.5 py-0.5 rounded-sm">{generations}</span>
            </div>
            <Slider value={[generations]} onValueChange={([v]) => setGenerations(v)} min={1} max={20} step={1} data-testid="evolve-gen-slider" className="pt-1" />
          </div>

          <button
            data-testid="evolve-seed-button"
            onClick={handleEvolve}
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-sm font-mono text-[10px] uppercase tracking-widest hover:bg-secondary/20 hover:border-secondary/40 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            {loading ? 'SYNTHESIZING...' : `EVOLVE [ ${popSize} ]`}
          </button>
        </>
      )}
    </div>
  );
}
