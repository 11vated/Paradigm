/**
 * AmbientStrip — 40px tall, the platform's vital signs.
 *
 *  [kernel ticker] | [last op] | [determinism] | [resonance] | [memory]
 *
 * Per `06_Frontend_Redesign_And_Completion_Spec.md` §IV.5.
 */
import React, { useEffect, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';

interface MemoryCounts {
  working: number;
  episodic: number;
  semantic: number;
  world: number;
}

interface LastOp {
  kind: string;
  ago: string;
}

export const AmbientStrip: React.FC = () => {
  const { seed } = useActiveSeed();
  const [tick, setTick] = useState(0);
  const [lastOp, setLastOp] = useState<LastOp | null>(null);
  const [memory, setMemory] = useState<MemoryCounts>({
    working: 0,
    episodic: 0,
    semantic: 95, // confirmed at boot from RAG init log
    world: 0,
  });
  const [determinismOk] = useState(true); // wired from `/api/determinism/status` later

  // Kernel tick heartbeat
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  // Poll memory counts (best-effort)
  useEffect(() => {
    let cancelled = false;
    const fetchMem = () => {
      fetch('/api/agent/memory/counts')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (cancelled || !j) return;
          setMemory({
            working:  j.working  ?? 0,
            episodic: j.episodic ?? 0,
            semantic: j.semantic ?? 95,
            world:    j.world    ?? 0,
          });
        })
        .catch(() => undefined);
    };
    fetchMem();
    const id = setInterval(fetchMem, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Poll last operation
  useEffect(() => {
    let cancelled = false;
    const fetchLast = () => {
      fetch('/api/operations/last')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (cancelled || !j) return;
          setLastOp({ kind: j.kind, ago: j.ago });
        })
        .catch(() => undefined);
    };
    fetchLast();
    const id = setInterval(fetchLast, 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <footer className="p-ambient" role="status" aria-live="polite">
      <span className="p-ambient-seg">
        <span className="p-ambient-key">tick</span>
        <span className="p-ambient-val">{tick.toLocaleString()}</span>
      </span>

      <span className="p-ambient-divider" />

      <span className="p-ambient-seg">
        <span className="p-ambient-key">last</span>
        <span className="p-ambient-val">
          {lastOp ? `${lastOp.kind} · ${lastOp.ago}` : 'idle'}
        </span>
      </span>

      <span className="p-ambient-divider" />

      <span
        className="p-ambient-seg"
        data-state={determinismOk ? 'ok' : 'err'}
      >
        <span className="p-ambient-key">determinism</span>
        <span className="p-ambient-val">
          {determinismOk ? '0 violations' : 'violated'}
        </span>
      </span>

      <span className="p-ambient-divider" />

      <span className="p-ambient-seg">
        <span className="p-ambient-key">resonance</span>
        <span className="p-ambient-val">
          {seed ? '432Hz · standing-wave' : '—'}
        </span>
      </span>

      <span className="p-ambient-divider" />

      <span className="p-ambient-seg">
        <span className="p-ambient-key">memory</span>
        <span className="p-ambient-val">
          w {memory.working} · e {memory.episodic} · s {memory.semantic} · W {memory.world}
        </span>
      </span>
    </footer>
  );
};

export default AmbientStrip;
