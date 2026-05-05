import { useState, useEffect, useMemo } from 'react';
import { useSeedStore } from '@/stores/seedStore';

interface SimilarSeed {
  id: string;
  name: string;
  domain: string;
  similarity: number;
}

interface SeedSimilarityListProps {
  seedId?: string;
  limit?: number;
  onSelect?: (seedId: string) => void;
}

export default function SeedSimilarityList({ 
  seedId, 
  limit = 8, 
  onSelect 
}: SeedSimilarityListProps) {
  const [similar, setSimilar] = useState<SimilarSeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeds = useSeedStore((s) => s.seeds);

  const currentSeed = useMemo(() => {
    return seedId ? seeds?.find((s: any) => s.id === seedId || s.$hash === seedId) : null;
  }, [seedId, seeds]);

  useEffect(() => {
    if (!currentSeed && !seedId) return;

    const fetchSimilar = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/seeds/${seedId || currentSeed?.$hash}/similar?limit=${limit}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch similar seeds: ${response.statusText}`);
        }

        const data = await response.json();
        
        const mapped: SimilarSeed[] = (data.similar || data.results || []).map((item: any) => ({
          id: item.seedId || item.id || item.hash,
          name: item.name || item.seed_name || item.$name || item.seed_id?.slice(0, 8) || 'Unknown',
          domain: item.domain || item.$domain || 'default',
          similarity: item.similarity || item.score || 0,
        }));

        setSimilar(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSimilar([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [seedId, currentSeed?.$hash, limit]);

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-neutral-600">Similar Seeds</h3>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: limit / 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-neutral-100 animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-neutral-600">Similar Seeds</h3>
        <p className="text-xs text-neutral-500">Unable to load similar seeds</p>
      </div>
    );
  }

  if (similar.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-neutral-600">Similar Seeds</h3>
        <p className="text-xs text-neutral-500">
          Generate more seeds to see similarity matches
        </p>
      </div>
    );
  }

  const domainColors: Record<string, string> = {
    character: 'bg-orange-500',
    sprite: 'bg-lime-500',
    music: 'bg-cyan-500',
    visual2d: 'bg-violet-500',
    game: 'bg-pink-500',
    procedural: 'bg-teal-500',
    agent: 'bg-slate-500',
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-neutral-600">
        Similar Seeds
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {similar.map((seed) => (
          <button
            key={seed.id}
            onClick={() => onSelect?.(seed.id)}
            className="flex items-center gap-2 p-2 bg-white border border-neutral-200 rounded-md hover:border-neutral-400 hover:bg-neutral-50 transition-colors text-left"
          >
            <div 
              className={`w-2 h-2 rounded-full ${
                domainColors[seed.domain] || 'bg-neutral-400'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {seed.name}
              </p>
              <p className="text-[10px] text-neutral-500">
                {(seed.similarity * 100).toFixed(0)}% match
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}