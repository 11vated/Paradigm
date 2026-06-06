/**
 * Evolution UI Components — Population Grids, Fitness Visualization
 * Features: 100-1000 seeds at 60fps, fitness graphs, MAP-Elites grid
 * Export: React components, Web Workers for background evolution
 */

import * as React from 'react';
import { useEffect, useRef, useState, useMemo } from 'react';

interface Seed {
  $hash: string;
  $name?: string;
  $domain: string;
  genes?: Record<string, { value: number }>;
  fitness?: number;
  novelty?: number;
}

interface EvolutionConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  elitism: number;
  algorithm: 'GA' | 'MAP_ELITES' | 'CMA_ES' | 'NOVELTY';
}

interface FitnessGraphProps {
  data: { generation: number; avgFitness: number; maxFitness: number; minFitness: number }[];
  width?: number;
  height?: number;
}

interface PopulationGridProps {
  seeds: Seed[];
  onSelect: (seed: Seed) => void;
  columns?: number;
  showFitness?: boolean;
}

interface MAPElitesGridProps {
  data: { x: number; y: number; seed: Seed; fitness: number }[][];
  onSelect: (seed: Seed) => void;
  dimensions?: [number, number];
}

/**
 * Fitness Graph Component — Line chart showing evolution progress
 */
export function FitnessGraph({ data, width = 800, height = 400 }: FitnessGraphProps) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, color: '#888' }}>No evolution data</div>;
  }

  const padding = 60;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const maxFitness = Math.max(...data.map(d => d.maxFitness));
  const minFitness = Math.min(...data.map(d => d.minFitness));
  const fitnessRange = maxFitness - minFitness || 1;

  const points = {
    avg: data.map((d, i) => `${padding + (i / (data.length - 1)) * graphWidth},${height - padding - ((d.avgFitness - minFitness) / fitnessRange) * graphHeight}`).join(' '),
    max: data.map((d, i) => `${padding + (i / (data.length - 1)) * graphWidth},${height - padding - ((d.maxFitness - minFitness) / fitnessRange) * graphHeight}`).join(' '),
    min: data.map((d, i) => `${padding + (i / (data.length - 1)) * graphWidth},${height - padding - ((d.minFitness - minFitness) / fitnessRange) * graphHeight}`).join(' ')
  };

  return (
    <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 16 }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>Evolution Progress</h3>
      <svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line
            key={t}
            x1={padding}
            y1={height - padding - t * graphHeight}
            x2={width - padding}
            y2={height - padding - t * graphHeight}
            stroke="#333"
            strokeDasharray="4,4"
          />
        ))}

        {/* Min line */}
        <polyline points={points.min} fill="none" stroke="#e74c3c" strokeWidth={2} opacity={0.5} />

        {/* Avg line */}
        <polyline points={points.avg} fill="none" stroke="#3498db" strokeWidth={3} />

        {/* Max line */}
        <polyline points={points.max} fill="none" stroke="#2ecc71" strokeWidth={2} />

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth={2} />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth={2} />

        {/* Labels */}
        <text x={padding - 10} y={height - padding} fill="#888" fontSize={12} textAnchor="end">Gen 0</text>
        <text x={width - padding} y={height - padding} fill="#888" fontSize={12} textAnchor="start">Gen {data.length - 1}</text>
        <text x={padding - 10} y={padding} fill="#2ecc71" fontSize={12} textAnchor="end">Max: {maxFitness.toFixed(2)}</text>
        <text x={padding - 10} y={height - padding * 0.5} fill="#3498db" fontSize={12} textAnchor="end">Avg</text>

        {/* Legend */}
        <g transform={`translate(${width - 150}, 20)`}>
          <line x1={0} y1={0} x2={30} y2={0} stroke="#2ecc71" strokeWidth={2} />
          <text x={35} y={4} fill="#fff" fontSize={12}>Max</text>
          <line x1={0} y1={20} x2={30} y2={20} stroke="#3498db" strokeWidth={2} />
          <text x={35} y={24} fill="#fff" fontSize={12}>Avg</text>
          <line x1={0} y1={40} x2={30} y2={40} stroke="#e74c3c" strokeWidth={2} opacity={0.5} />
          <text x={35} y={44} fill="#fff" fontSize={12}>Min</text>
        </g>
      </svg>
    </div>
  );
}

/**
 * Population Grid Component — Display seeds in a grid with fitness bars
 */
export function PopulationGrid({ seeds, onSelect, columns = 10, showFitness = true }: PopulationGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!seeds || seeds.length === 0) {
    return <div style={{ padding: 20, color: '#888' }}>No seeds in population</div>;
  }

  const maxFitness = Math.max(...seeds.map(s => s.fitness || 0));

  return (
    <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8, padding: 16 }}>
      {seeds.map((seed, index) => (
        <div
          key={seed.$hash || index}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(seed)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(seed); } }}
          aria-label={`Select seed ${seed.$name || seed.$hash?.substring(0, 8) || `seed ${index + 1}`}, fitness ${((seed.fitness || 0) * 100).toFixed(0)}%`}
          style={{
            background: '#2a2a2a',
            borderRadius: 8,
            padding: 12,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            width: '100%',
            aspectRatio: '1/1',
            background: `hsl(${(seed.fitness || 0) * 120}, 70%, 50%)`,
            borderRadius: 4,
            marginBottom: 8
          }} />
          <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            {seed.$name || seed.$hash?.substring(0, 8) || `Seed ${index}`}
          </div>
          {showFitness && (
            <div style={{ background: '#1a1a1a', borderRadius: 2, height: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${((seed.fitness || 0) / maxFitness) * 100}%`,
                height: '100%',
                background: seed.fitness && seed.fitness > maxFitness * 0.8 ? '#2ecc71' : seed.fitness && seed.fitness > maxFitness * 0.5 ? '#f39c12' : '#e74c3c'
              }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * MAP-Elites Grid Component — Quality-Diversity visualization
 */
export function MAPElitesGrid({ data, onSelect, dimensions = [10, 10] }: MAPElitesGridProps) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, color: '#888' }}>No MAP-Elites data</div>;
  }

  const [, cols] = dimensions;
  const maxFitness = Math.max(...data.flat().filter(c => c).map(c => c.fitness));

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>MAP-Elites Archive</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 2,
        maxWidth: 600,
        margin: '0 auto'
      }}>
        {data.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              role={cell ? 'button' : undefined}
              tabIndex={cell ? 0 : -1}
              onClick={() => cell && onSelect(cell.seed)}
              onKeyDown={cell ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(cell.seed); } } : undefined}
              aria-label={cell ? `MAP-elites cell at column ${x + 1}, row ${y + 1}, fitness ${(cell.fitness * 100).toFixed(0)}%` : `Empty MAP-elites cell at column ${x + 1}, row ${y + 1}`}
              style={{
                aspectRatio: '1/1',
                background: cell
                  ? `hsl(${(cell.fitness / maxFitness) * 120}, 80%, ${30 + (cell.fitness / maxFitness) * 40}%)`
                  : '#1a1a1a',
                borderRadius: 2,
                cursor: cell ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: cell ? '#fff' : '#333'
              }}
              title={cell ? `Fitness: ${cell.fitness.toFixed(3)}` : 'Empty'}
            >
              {cell && cell.fitness.toFixed(2)}
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#888', fontSize: 12 }}>
        <span>Novelty →</span>
        <span>Quality →</span>
      </div>
    </div>
  );
}

/**
 * Evolution Theater — Main component combining all evolution UI elements
 */
interface EvolutionTheaterProps {
  config: EvolutionConfig;
  onEvolve: (population: Seed[]) => void;
  onSeedSelect: (seed: Seed) => void;
}

export function EvolutionTheater({ config, onSeedSelect }: EvolutionTheaterProps) {
  const [population, setPopulation] = useState<Seed[]>([]);
  const [history, setHistory] = useState<{ generation: number; avgFitness: number; maxFitness: number; minFitness: number }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker for background evolution
  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/evolution.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      const { type, population: newPop, stats } = e.data;
      
      if (type === 'generation_complete') {
        setPopulation(newPop);
        setHistory(prev => [...prev, stats]);
        setGeneration(prev => prev + 1);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Start/stop evolution
  useEffect(() => {
    if (isRunning && workerRef.current) {
      workerRef.current.postMessage({
        type: 'start',
        config,
        population
      });
    } else if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
    }
  }, [isRunning, config, population]);

  const fitnessStats = useMemo(() => {
    if (population.length === 0) return { avg: 0, max: 0, min: 0 };
    const fitnesses = population.map(s => s.fitness || 0);
    return {
      avg: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      max: Math.max(...fitnesses),
      min: Math.min(...fitnesses)
    };
  }, [population]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: '#fff', margin: 0 }}>Evolution Theater</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{
              padding: '8px 24px',
              borderRadius: 4,
              border: 'none',
              background: isRunning ? '#e74c3c' : '#2ecc71',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isRunning ? 'Stop' : 'Start'} Evolution
          </button>
          <button
            onClick={() => {
              setPopulation([]);
              setHistory([]);
              setGeneration(0);
              setIsRunning(false);
            }}
            style={{
              padding: '8px 24px',
              borderRadius: 4,
              border: 'none',
              background: '#3498db',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#2a2a2a', padding: 16, borderRadius: 8 }}>
          <div style={{ color: '#888', fontSize: 12 }}>Generation</div>
          <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{generation}</div>
        </div>
        <div style={{ background: '#2a2a2a', padding: 16, borderRadius: 8 }}>
          <div style={{ color: '#888', fontSize: 12 }}>Population</div>
          <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{population.length}</div>
        </div>
        <div style={{ background: '#2a2a2a', padding: 16, borderRadius: 8 }}>
          <div style={{ color: '#888', fontSize: 12 }}>Best Fitness</div>
          <div style={{ color: '#2ecc71', fontSize: 24, fontWeight: 700 }}>{fitnessStats.max.toFixed(3)}</div>
        </div>
        <div style={{ background: '#2a2a2a', padding: 16, borderRadius: 8 }}>
          <div style={{ color: '#888', fontSize: 12 }}>Avg Fitness</div>
          <div style={{ color: '#3498db', fontSize: 24, fontWeight: 700 }}>{fitnessStats.avg.toFixed(3)}</div>
        </div>
      </div>

      <FitnessGraph data={history} />

      <div style={{ marginTop: 20 }}>
        <h2 style={{ color: '#fff', marginBottom: 16 }}>Population ({population.length} seeds)</h2>
        <PopulationGrid seeds={population} onSelect={onSeedSelect} columns={10} />
      </div>
    </div>
  );
}
