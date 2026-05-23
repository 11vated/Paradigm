/**
 * useGrowArtifact — grow active seed and return artifact for PreviewViewport.
 *
 * Refetches automatically when the active seed changes, or when a
 * `paradigm:grow-success` window event fires (from a manual grow action).
 */
import { useCallback, useEffect, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { growSeed } from '@/services/api';

export function useGrowArtifact() {
  const seed = useActiveSeed((s) => s.seed);
  const [artifact, setArtifact] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grow = useCallback(async (signal?: { cancelled: boolean }) => {
    if (!seed?.id) {
      setArtifact(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const a = await growSeed(seed.id);
      if (signal?.cancelled) return;
      setArtifact(a as Record<string, unknown>);
    } catch (e: any) {
      if (signal?.cancelled) return;
      const msg = String(e?.message ?? e);
      setError(msg);
      // Fallback artifact so PreviewViewport has something to show
      setArtifact({
        domain: seed.domain,
        name: seed.name,
        seed_hash: seed.hash,
        generation: seed.generation ?? 0,
        error: msg,
      });
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, [seed?.id, seed?.domain, seed?.hash, seed?.name, seed?.generation]);

  useEffect(() => {
    const signal = { cancelled: false };
    grow(signal);
    return () => { signal.cancelled = true; };
  }, [grow]);

  // Listen for manual grow events fired from action chips / agent commands
  useEffect(() => {
    const onGrowSuccess = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (detail?.artifact) {
        setArtifact(detail.artifact as Record<string, unknown>);
        setError(null);
      } else {
        // Fallback — re-run grow
        grow();
      }
    };
    window.addEventListener('paradigm:grow-success', onGrowSuccess as EventListener);
    return () => window.removeEventListener('paradigm:grow-success', onGrowSuccess as EventListener);
  }, [grow]);

  return { artifact, loading, error, refetch: grow };
}
