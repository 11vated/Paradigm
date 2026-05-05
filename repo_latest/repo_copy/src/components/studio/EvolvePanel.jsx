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
    <div className="p-3 space-y-4" data-testid="evolve-panel">
      <div className="flex items-center gap-2">
        <Zap className="w-3 h-3 text-secondary" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Evolution</span>
      </div>

      {!seed ? (
        <p className="font-mono text-[10px] text-neutral-600">Select a seed to evolve.</p>
      ) : (
        <>
          <div className="space-y-1">
            <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Algorithm</label>
            <Select value={algorithm} onValueChange={setAlgorithm}>
              <SelectTrigger className="h-7 text-[10px] font-mono bg-transparent border-neutral-800 rounded-none" data-testid="evolve-algorithm-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-neutral-800">
                {['map_elites', 'ga', 'cma_es', 'novelty'].map(a => (
                  <SelectItem key={a} value={a} className="text-[10px] font-mono">{a.replace('_', ' ').toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Population</label>
              <span className="font-mono text-[9px] text-neutral-500">{popSize}</span>
            </div>
            <Slider value={[popSize]} onValueChange={([v]) => setPopSize(v)} min={4} max={50} step={2} data-testid="evolve-pop-slider" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Generations</label>
              <span className="font-mono text-[9px] text-neutral-500">{generations}</span>
            </div>
            <Slider value={[generations]} onValueChange={([v]) => setGenerations(v)} min={1} max={20} step={1} data-testid="evolve-gen-slider" />
          </div>

          <button
            data-testid="evolve-seed-button"
            onClick={handleEvolve}
            disabled={loading}
            className="w-full py-2 bg-secondary text-white font-bold text-[10px] uppercase tracking-wider hover:bg-secondary/80 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            {loading ? 'Evolving...' : `Evolve ${popSize} variants`}
          </button>
        </>
      )}
    </div>
  );
}
