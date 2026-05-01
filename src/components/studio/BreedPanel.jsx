import { useState } from 'react';
import { useSeedStore } from '@/stores/seedStore';
import { Loader2, Heart } from 'lucide-react';

export default function BreedPanel({ gallery, onBred }) {
  const [parentA, setParentA] = useState('');
  const [parentB, setParentB] = useState('');
  const [loading, setLoading] = useState(false);
  const breedSeedsInStore = useSeedStore((s) => s.breedSeeds);

  const handleBreed = async () => {
    if (!parentA || !parentB || parentA === parentB || loading) return;
    setLoading(true);
    try {
      const child = await breedSeedsInStore(parentA, parentB);
      if (onBred) onBred(child);
    } catch (e) { console.error(e); }
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
          <div className="space-y-1">
            <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Parent A</label>
            <select
              data-testid="breed-parent-a"
              value={parentA}
              onChange={(e) => setParentA(e.target.value)}
              className="w-full h-7 bg-transparent border border-neutral-800 text-[10px] font-mono text-white px-2"
            >
              <option value="">Select seed...</option>
              {seeds.map(s => (
                <option key={s.id} value={s.id}>{s.$name} (G{s.$lineage?.generation || 0})</option>
              ))}
            </select>
          </div>

          <div className="text-center font-mono text-[10px] text-neutral-700">&times;</div>

          <div className="space-y-1">
            <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Parent B</label>
            <select
              data-testid="breed-parent-b"
              value={parentB}
              onChange={(e) => setParentB(e.target.value)}
              className="w-full h-7 bg-transparent border border-neutral-800 text-[10px] font-mono text-white px-2"
            >
              <option value="">Select seed...</option>
              {seeds.map(s => (
                <option key={s.id} value={s.id}>{s.$name} (G{s.$lineage?.generation || 0})</option>
              ))}
            </select>
          </div>

          <button
            data-testid="breed-submit-btn"
            onClick={handleBreed}
            disabled={loading || !parentA || !parentB || parentA === parentB}
            className="w-full py-2 bg-accent text-white font-bold text-[10px] uppercase tracking-wider hover:bg-accent/80 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className="w-3 h-3" />}
            {loading ? 'Breeding...' : 'Breed Seeds'}
          </button>
        </>
      )}
    </div>
  );
}
