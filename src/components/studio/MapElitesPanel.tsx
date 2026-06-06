/**
 * MapElitesPanel — Live Quality-Diversity Archive
 *
 * Shows the MAP-Elites archive as a 2D heatmap grid. Each cell is the
 * elite occupant for that (behavior1 × behavior2) niche. Click any cell
 * to inspect that seed. Run evolution to fill the archive in real time.
 *
 * The archive is fetched from /api/evolve/map-elites. Cells animate in
 * as they're discovered.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RefreshCw } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EliteCell {
  x: number;
  y: number;
  fitness: number;
  seed: Record<string, unknown>;
  domain: string;
  discoveredAt: number;
}

interface ArchiveState {
  cells: EliteCell[];
  gridX: number;
  gridY: number;
  behaviorX: string;
  behaviorY: string;
  generation: number;
  coverage: number;
  maxFitness: number;
}

interface MapElitesPanelProps {
  domain: string;
  seed?: Record<string, unknown>;
  onSelectSeed?: (seed: Record<string, unknown>) => void;
}

// ─── Color scale (viridis-like, dark-to-bright) ───────────────────────────────

function fitnessToColor(fitness: number, max: number): string {
  const t = max > 0 ? fitness / max : 0;
  const r = Math.round(68 + t * (253 - 68));
  const g = Math.round(1  + t * (231 - 1));
  const b = Math.round(84 + t * (37  - 84));
  return `rgb(${r},${g},${b})`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MapElitesPanel({ domain, seed, onSelectSeed }: MapElitesPanelProps) {
  const [archive, setArchive] = useState<ArchiveState | null>(null);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<EliteCell | null>(null);
  const [generations, setGenerations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const GRID = 16;

  const fetchArchive = useCallback(async () => {
    try {
      const res = await fetch(`/api/evolve/map-elites?domain=${domain}&gridX=${GRID}&gridY=${GRID}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setArchive(data);
      setGenerations(data.generation ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'fetch failed');
    }
  }, [domain]);

  const runStep = useCallback(async () => {
    try {
      await fetch('/api/evolve/map-elites/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ domain, seed, steps: 10 }),
      });
      await fetchArchive();
    } catch {/* silent */ }
  }, [domain, seed, fetchArchive]);

  useEffect(() => { fetchArchive(); }, [fetchArchive]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(runStep, 800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, runStep]);

  const cellMap = new Map<string, EliteCell>();
  archive?.cells.forEach(c => cellMap.set(`${c.x},${c.y}`, c));

  const coverage = archive ? ((archive.cells.length / (GRID * GRID)) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-widest">
            MAP-Elites
          </span>
          <span className="text-xs text-zinc-500">{domain}</span>
          <span className="text-xs text-emerald-400 font-mono">
            {coverage}% coverage
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            gen {generations}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRunning(r => !r)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {running ? 'Pause' : 'Evolve'}
          </button>
          <button
            onClick={fetchArchive}
            aria-label="Refresh map-elites archive"
            className="p-1 rounded hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <RefreshCw aria-hidden="true" className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {error ? (
          <div className="text-xs text-rose-400 font-mono text-center">
            <p>{error}</p>
            <button onClick={() => { setError(null); fetchArchive(); }}
              className="mt-2 px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-300">
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {/* Y-axis label */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-zinc-500 font-mono w-16 text-right truncate">
                {archive?.behaviorY ?? 'dim-2'}
              </span>
              <span className="text-[10px] text-zinc-600 font-mono">↑</span>
            </div>
            {Array.from({ length: GRID }, (_, row) => (
              <div key={row} className="flex gap-0.5">
                <span className="text-[9px] text-zinc-700 font-mono w-4 text-right self-center">
                  {GRID - row}
                </span>
                {Array.from({ length: GRID }, (_, col) => {
                  const cell = cellMap.get(`${col},${GRID - 1 - row}`);
                  return (
                    <motion.button
                      key={col}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => {
                        if (cell) {
                          setSelected(cell);
                          onSelectSeed?.(cell.seed);
                        }
                      }}
                      title={cell ? `fitness: ${cell.fitness.toFixed(3)}` : 'empty'}
                      style={{
                        width: 20, height: 20,
                        backgroundColor: cell
                          ? fitnessToColor(cell.fitness, archive?.maxFitness ?? 1)
                          : 'rgba(255,255,255,0.04)',
                        border: selected && selected.x === col && selected.y === GRID - 1 - row
                          ? '1.5px solid white'
                          : '1px solid transparent',
                        borderRadius: 2,
                        flexShrink: 0,
                        cursor: cell ? 'pointer' : 'default',
                      }}
                    />
                  );
                })}
              </div>
            ))}
            {/* X-axis label */}
            <div className="flex items-center gap-2 mt-1 ml-5">
              <span className="text-[10px] text-zinc-600 font-mono">→</span>
              <span className="text-[10px] text-zinc-500 font-mono truncate">
                {archive?.behaviorX ?? 'dim-1'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Selected cell detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800 px-4 py-3 shrink-0 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-zinc-300 mb-1">
                  Cell ({selected.x}, {selected.y}) — fitness{' '}
                  <span className="text-emerald-400">{selected.fitness.toFixed(4)}</span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  {selected.domain} · discovered gen {selected.discoveredAt}
                </div>
              </div>
              <button
                onClick={() => onSelectSeed?.(selected.seed)}
                className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors shrink-0"
              >
                Open seed
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color legend */}
      <div className="px-4 pb-3 pt-1 flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-zinc-600 font-mono">0</span>
        <div
          className="flex-1 h-1.5 rounded"
          style={{
            background: 'linear-gradient(to right, rgb(68,1,84), rgb(59,82,139), rgb(33,145,140), rgb(94,201,98), rgb(253,231,37))',
          }}
        />
        <span className="text-[10px] text-zinc-600 font-mono">
          {archive?.maxFitness.toFixed(2) ?? '1.00'}
        </span>
      </div>
    </div>
  );
}
