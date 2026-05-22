/**
 * useGrowArtifact — grow active seed and return artifact for PreviewViewport.
 */
import { useEffect, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { growSeed } from '@/services/api';

export function useGrowArtifact() {
  const seed = useActiveSeed((s) => s.seed);
  const [artifact, setArtifact] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seed?.id) {
      setArtifact(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    growSeed(seed.id)
      .then((a) => {
        if (!cancelled) {
          setArtifact(a as Record<string, unknown>);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setArtifact({
            domain: seed.domain,
            name: seed.name,
            seed_hash: seed.hash,
            generation: seed.generation ?? 0,
          });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [seed?.id, seed?.hash, seed?.domain, seed?.name, seed?.generation]);

  return { artifact, loading, error };
}
