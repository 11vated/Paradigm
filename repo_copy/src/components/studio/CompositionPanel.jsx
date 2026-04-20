import { useState, useEffect } from 'react';
import { GitBranch, ArrowRight, Loader2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { api } from '@/services/api';

export default function CompositionPanel({ seed, onComposed }) {
  const [targetDomain, setTargetDomain] = useState('sprite');
  const [loading, setLoading] = useState(false);
  const [graph, setGraph] = useState(null);
  const [path, setPath] = useState(null);

  useEffect(() => {
    api.get('/composition/graph').then(r => setGraph(r.data)).catch(() => {});
  }, []);

  const handleCompose = async () => {
    if (!seed || loading) return;
    setLoading(true);
    try {
      const res = await api.post(`/seeds/${seed.id}/compose`, { target_domain: targetDomain });
      if (res.data.seed) onComposed(res.data.seed);
      setPath(res.data.path);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleFindPath = async () => {
    if (!seed) return;
    try {
      const res = await api.get('/composition/path', { params: { source: seed.$domain, target: targetDomain } });
      setPath(res.data);
    } catch (e) { console.error(e); }
  };

  const availableTargets = graph?.edges?.filter(e => e.source === seed?.$domain).map(e => e.target) || [];

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
          <div className="p-2 border border-neutral-900 bg-black/30">
            <div className="font-mono text-[8px] text-neutral-700 uppercase">Source</div>
            <div className="font-mono text-[10px] text-primary">{seed.$domain}</div>
            <div className="font-mono text-[9px] text-neutral-400">{seed.$name}</div>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-neutral-700" />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Target Domain</label>
            <Select value={targetDomain} onValueChange={(v) => { setTargetDomain(v); setPath(null); }}>
              <SelectTrigger className="h-7 text-[10px] font-mono bg-transparent border-neutral-800 rounded-none" data-testid="compose-target-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-neutral-800 max-h-48">
                {['sprite', 'music', 'fullgame', 'animation', 'ecosystem', 'visual2d', 'narrative', 'physics', 'procedural', 'audio', 'character'].map(d => (
                  <SelectItem key={d} value={d} className="text-[10px] font-mono">{d}{availableTargets.includes(d) ? ' (direct)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {path && (
            <div className="p-2 border border-accent/20 bg-accent/5">
              <div className="font-mono text-[8px] text-accent uppercase mb-1">Composition Path</div>
              {path.path ? (
                <div className="flex items-center gap-1 flex-wrap">
                  {path.path.map((step, i) => (
                    <span key={i} className="font-mono text-[9px]">
                      {i > 0 && <span className="text-neutral-700 mx-1">→</span>}
                      <span className="text-neutral-400">{step[0]}</span>
                      <span className="text-accent/60 text-[8px] ml-0.5">({step[2]})</span>
                    </span>
                  ))}
                  <span className="text-neutral-700 mx-1">→</span>
                  <span className="text-primary font-mono text-[9px]">{targetDomain}</span>
                </div>
              ) : (
                <span className="font-mono text-[9px] text-red-400">No path found</span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button data-testid="find-path-btn" onClick={handleFindPath}
              className="flex-1 py-1.5 border border-neutral-800 text-neutral-400 font-mono text-[9px] hover:border-neutral-600 transition-colors">
              Find Path
            </button>
            <button data-testid="compose-btn" onClick={handleCompose} disabled={loading}
              className="flex-1 py-1.5 bg-accent text-white font-bold text-[9px] uppercase tracking-wider hover:bg-accent/80 transition-colors disabled:opacity-30 flex items-center justify-center gap-1">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitBranch className="w-3 h-3" />}
              Compose
            </button>
          </div>

          {/* Functor Graph Mini */}
          {graph && (
            <div className="pt-2 border-t border-neutral-900">
              <div className="font-mono text-[8px] text-neutral-700 uppercase mb-1">Functor Graph ({graph.edges?.length} bridges)</div>
              <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                {graph.edges?.map((e, i) => (
                  <div key={i} className="flex items-center gap-1 font-mono text-[8px]">
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
