/**
 * useGrowArtifact — grow active seed and return artifact for PreviewViewport.
 *
 * Refetches automatically when the active seed changes, or when a
 * `paradigm:grow-success` window event fires (from a manual grow action).
 */
import { useCallback, useEffect, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { growSeed } from '@/services/api';
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';

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
      // Promote live strata to activeSeed for HUDs everywhere (from server or compute)
      try {
        const aa: any = a || {};
        const sc = aa.strataCompliance ?? aa.axes?.strataCompliance ?? aa.strata?.overall;
        const per = aa.strata?.perStratum || aa.perStratum;
        if (typeof sc === 'number' || per) {
          const overall = typeof sc === 'number' ? sc : (per ? Object.values(per).reduce((x:number,y:any)=>x+(y.score||y||0),0)/9 : 0.7);
          useActiveSeed.getState().patchSeed({ strata: { overall, perStratum: per || {}, compliance: overall } });
        } else {
          // compute to ensure every grow has strata
          const conf = calculateStratumConformance([aa]);
          useActiveSeed.getState().patchSeed({ strata: { overall: conf.overall, perStratum: Object.fromEntries(Object.entries(conf.perStratum).map(([k,v]:any)=>[k,v.score||0.5])), compliance: conf.overall } });
        }
      } catch {}
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
        const det: any = detail.artifact;
        setArtifact(det as Record<string, unknown>);
        setError(null);
        // promote strata on event too for live all-ops
        try {
          const sc = det.strataCompliance ?? det.strata?.overall;
          if (typeof sc === 'number') {
            useActiveSeed.getState().patchSeed({ strata: { overall: sc, perStratum: det.strata?.perStratum, compliance: sc } });
          }
        } catch {}
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
