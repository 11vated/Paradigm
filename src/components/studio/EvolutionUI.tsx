/**
 * Evolution UI — Visual interface for genetic algorithms
 * Phase II.3: Monitor and control evolution in real-time
 *
 * Features:
 * - Population visualization
 * - Fitness graph
 * - Generation controls
 * -个体 inspection
 * - Diversity metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Play, Pause, SkipForward, RotateCcw, Settings, Eye, BarChart3 } from 'lucide-react';

// Evolution configuration
interface EvolutionConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitism: number;
  fitnessFunction: string;
  selectionMethod: 'tournament' | 'roulette' | 'rank';
}

// Individual in population
interface Individual {
  id: string;
  seed: any;
  fitness: number;
  genes: Record<string, any>;
  generation: number;
}

// Generation statistics
interface GenerationStats {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  diversity: number;
  population: Individual[];
}

// Default evolution config
const DEFAULT_CONFIG: EvolutionConfig = {
  populationSize: 50,
  generations: 100,
  mutationRate: 0.1,
  crossoverRate: 0.8,
  elitism: 2,
  fitnessFunction: 'fitness_default',
  selectionMethod: 'tournament',
};

// Mock evolution engine (would connect to real GSPL evolve in production)
class EvolutionEngine {
  private config: EvolutionConfig;
  private running: boolean = false;
  private generation: number = 0;
  private stats: GenerationStats[] = [];
  private onUpdate?: (stats: GenerationStats) => void;

  constructor(config: EvolutionConfig) {
    this.config = config;
  }

  setUpdateCallback(callback: (stats: GenerationStats) => void) {
    this.onUpdate = callback;
  }

  async start(): Promise<void> {
    this.running = true;
    this.generation = 0;
    this.stats = [];

    // Initialize population
    let population = this.initializePopulation();

    while (this.running && this.generation < this.config.generations) {
      const stats = this.evaluateGeneration(population);
      this.stats.push(stats);
      this.generation++;

      if (this.onUpdate) {
        this.onUpdate(stats);
      }

      // Evolve to next generation
      population = this.evolve(population);

      // Simulate time for visualization
      await this.sleep(100);
    }
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  getStats(): GenerationStats[] {
    return this.stats;
  }

  private initializePopulation(): Individual[] {
    const population: Individual[] = [];
    for (let i = 0; i < this.config.populationSize; i++) {
      population.push(this.createRandomIndividual(i));
    }
    return population;
  }

  private createRandomIndividual(index: number): Individual {
    const genes = {
      size: 0.5 + Math.random() * 1.5,
      speed: Math.random(),
      strength: Math.random(),
      color: [Math.random(), Math.random(), Math.random()],
    };

    return {
      id: `ind_${this.generation}_${index}`,
      seed: { $name: `Individual ${index}`, phrase: `seed_${index}` },
      fitness: 0,
      genes,
      generation: this.generation,
    };
  }

  private evaluateGeneration(population: Individual[]): GenerationStats {
    // Calculate fitness for each individual
    for (const ind of population) {
      ind.fitness = this.calculateFitness(ind);
    }

    // Sort by fitness
    population.sort((a, b) => b.fitness - a.fitness);

    const fitnesses = population.map(ind => ind.fitness);
    const bestFitness = fitnesses[0];
    const worstFitness = fitnesses[fitnesses.length - 1];
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;

    // Calculate diversity (average gene variance)
    const diversity = this.calculateDiversity(population);

    return {
      generation: this.generation,
      bestFitness,
      avgFitness,
      worstFitness,
      diversity,
      population: [...population],
    };
  }

  private calculateFitness(ind: Individual): number {
    // Mock fitness function - in reality would use GSPL fitness expression
    const { size, speed, strength } = ind.genes;
    return (size * 0.3 + speed * 0.4 + strength * 0.3);
  }

  private calculateDiversity(population: Individual[]): number {
    if (population.length === 0) return 0;

    const genes = ['size', 'speed', 'strength'];
    let totalVariance = 0;

    for (const gene of genes) {
      const values = population.map(ind => ind.genes[gene]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      totalVariance += variance;
    }

    return totalVariance / genes.length;
  }

  private evolve(population: Individual[]): Individual[] {
    const newPopulation: Individual[] = [];

    // Elitism: keep best individuals
    for (let i = 0; i < this.config.elitism && i < population.length; i++) {
      newPopulation.push(population[i]);
    }

    // Fill rest with crossover and mutation
    while (newPopulation.length < this.config.populationSize) {
      const parent1 = this.selectParent(population);
      const parent2 = this.selectParent(population);

      let child = Math.random() < this.config.crossoverRate
        ? this.crossover(parent1, parent2)
        : { ...parent1 };

      if (Math.random() < this.config.mutationRate) {
        child = this.mutate(child);
      }

      child.id = `ind_${this.generation}_${newPopulation.length}`;
      child.generation = this.generation;

      newPopulation.push(child);
    }

    return newPopulation;
  }

  private selectParent(population: Individual[]): Individual {
    if (this.config.selectionMethod === 'tournament') {
      const tournamentSize = 3;
      let best = population[Math.floor(Math.random() * population.length)];
      for (let i = 1; i < tournamentSize; i++) {
        const contender = population[Math.floor(Math.random() * population.length)];
        if (contender.fitness > best.fitness) {
          best = contender;
        }
      }
      return best;
    }

    // Default: random selection
    return population[Math.floor(Math.random() * population.length)];
  }

  private crossover(p1: Individual, p2: Individual): Individual {
    const child: Individual = {
      id: '',
      seed: { ...p1.seed },
      fitness: 0,
      genes: {},
      generation: 0,
    };

    // Uniform crossover
    for (const gene of Object.keys(p1.genes)) {
      child.genes[gene] = Math.random() < 0.5 ? p1.genes[gene] : p2.genes[gene];
    }

    return child;
  }

  private mutate(ind: Individual): Individual {
    const mutated = { ...ind, genes: { ...ind.genes } };

    for (const gene of Object.keys(mutated.genes)) {
      if (Array.isArray(mutated.genes[gene])) {
        // Mutate color array
        mutated.genes[gene] = mutated.genes[gene].map((v: number) =>
          Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.2))
        );
      } else {
        // Mutate scalar
        mutated.genes[gene] = Math.max(0, mutated.genes[gene] + (Math.random() - 0.5) * 0.2);
      }
    }

    return mutated;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function EvolutionUI() {
  const [config, setConfig] = useState<EvolutionConfig>(DEFAULT_CONFIG);
  const [engine] = useState(() => new EvolutionEngine(config));
  const [running, setRunning] = useState(false);
  const [currentStats, setCurrentStats] = useState<GenerationStats | null>(null);
  const [statsHistory, setStatsHistory] = useState<GenerationStats[]>([]);
  const [selectedIndividual, setSelectedIndividual] = useState<Individual | null>(null);
  const [view, setView] = useState<'graph' | 'population' | 'fitness'>('graph');

  useEffect(() => {
    engine.setUpdateCallback((stats) => {
      setCurrentStats(stats);
      setStatsHistory(prev => [...prev, stats]);
    });
  }, [engine]);

  const startEvolution = async () => {
    setRunning(true);
    setStatsHistory([]);
    await engine.start();
    setRunning(false);
  };

  const stopEvolution = () => {
    engine.stop();
    setRunning(false);
  };

  const resetEvolution = () => {
    engine.stop();
    setRunning(false);
    setCurrentStats(null);
    setStatsHistory([]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold">Evolution UI</h2>
        </div>
        <div className="flex items-center gap-2">
          {!running ? (
            <button
              onClick={startEvolution}
              className="px-4 py-1 text-sm bg-green-600 hover:bg-green-500 rounded flex items-center gap-1"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : (
            <button
              onClick={stopEvolution}
              className="px-4 py-1 text-sm bg-red-600 hover:bg-red-500 rounded flex items-center gap-1"
            >
              <Pause className="w-4 h-4" />
              Stop
            </button>
          )}
          <button
            onClick={resetEvolution}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Controls */}
        <div className="w-64 p-4 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-3">Configuration</h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Population Size</label>
              <input
                type="number"
                value={config.populationSize}
                onChange={(e) => setConfig({ ...config, populationSize: parseInt(e.target.value) })}
                className="w-full mt-1 px-2 py-1 bg-gray-700 rounded text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Generations</label>
              <input
                type="number"
                value={config.generations}
                onChange={(e) => setConfig({ ...config, generations: parseInt(e.target.value) })}
                className="w-full mt-1 px-2 py-1 bg-gray-700 rounded text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Mutation Rate</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.mutationRate}
                onChange={(e) => setConfig({ ...config, mutationRate: parseFloat(e.target.value) })}
                className="w-full mt-1"
              />
              <span className="text-xs text-gray-400">{config.mutationRate}</span>
            </div>

            <div>
              <label className="text-xs text-gray-400">Crossover Rate</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.crossoverRate}
                onChange={(e) => setConfig({ ...config, crossoverRate: parseFloat(e.target.value) })}
                className="w-full mt-1"
              />
              <span className="text-xs text-gray-400">{config.crossoverRate}</span>
            </div>

            <div>
              <label className="text-xs text-gray-400">Selection Method</label>
              <select
                value={config.selectionMethod}
                onChange={(e) => setConfig({ ...config, selectionMethod: e.target.value as any })}
                className="w-full mt-1 px-2 py-1 bg-gray-700 rounded text-sm"
              >
                <option value="tournament">Tournament</option>
                <option value="roulette">Roulette</option>
                <option value="rank">Rank</option>
              </select>
            </div>
          </div>

          {/* Current Stats */}
          {currentStats && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3">Current Gen {currentStats.generation}</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Best</span>
                  <span className="text-green-400">{currentStats.bestFitness.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg</span>
                  <span className="text-blue-400">{currentStats.avgFitness.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Diversity</span>
                  <span className="text-yellow-400">{currentStats.diversity.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Visualization */}
        <div className="flex-1 flex flex-col">
          {/* View Tabs */}
          <div className="flex px-4 bg-gray-800 border-b border-gray-700">
            {(['graph', 'population', 'fitness'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-sm capitalize ${
                  view === v
                    ? 'text-green-400 border-b-2 border-green-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Visualization Content */}
          <div className="flex-1 p-4 overflow-auto">
            {view === 'graph' && (
              <FitnessGraph stats={statsHistory} />
            )}
            {view === 'population' && (
              <PopulationView
                stats={currentStats}
                onSelectIndividual={setSelectedIndividual}
              />
            )}
            {view === 'fitness' && (
              <FitnessDistribution stats={currentStats} />
            )}
          </div>
        </div>
      </div>

      {/* Individual Detail Modal */}
      {selectedIndividual && (
        <IndividualModal
          individual={selectedIndividual}
          onClose={() => setSelectedIndividual(null)}
        />
      )}
    </div>
  );
}

// Fitness Graph Component
function FitnessGraph({ stats }: { stats: GenerationStats[] }) {
  if (stats.length === 0) {
    return <div className="text-gray-500 italic">Start evolution to see fitness graph...</div>;
  }

  const data = stats.map(s => ({
    generation: s.generation,
    best: s.bestFitness,
    avg: s.avgFitness,
    worst: s.worstFitness,
    diversity: s.diversity,
  }));

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="generation" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
          <Line type="monotone" dataKey="best" stroke="#4ade80" name="Best" />
          <Line type="monotone" dataKey="avg" stroke="#60a5fa" name="Average" />
          <Line type="monotone" dataKey="worst" stroke="#f87171" name="Worst" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Population View Component
function PopulationView({
  stats,
  onSelectIndividual,
}: {
  stats: GenerationStats | null;
  onSelectIndividual: (ind: Individual) => void;
}) {
  if (!stats) {
    return <div className="text-gray-500 italic">No population data yet...</div>;
  }

  return (
    <div className="grid grid-cols-5 gap-2">
      {stats.population.slice(0, 20).map((ind, i) => (
        <div
          key={ind.id}
          onClick={() => onSelectIndividual(ind)}
          className="p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 transition-colors"
        >
          <div className="text-xs text-gray-400 mb-1">#{i + 1}</div>
          <div className="text-sm font-semibold text-green-400">{ind.fitness.toFixed(3)}</div>
          <div className="mt-1 space-y-1">
            {Object.entries(ind.genes).slice(0, 3).map(([key, val]) => (
              <div key={key} className="text-xs text-gray-500">
                {key}: {typeof val === 'number' ? val.toFixed(2) : String(val).substring(0, 10)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Fitness Distribution Component
function FitnessDistribution({ stats }: { stats: GenerationStats | null }) {
  if (!stats) {
    return <div className="text-gray-500 italic">No fitness data yet...</div>;
  }

  const data = stats.population.map((ind, i) => ({
    index: i,
    fitness: ind.fitness,
  }));

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="index" name="Individual" stroke="#888" />
          <YAxis dataKey="fitness" name="Fitness" stroke="#888" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Population" data={data} fill="#4ade80" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// Individual Detail Modal
function IndividualModal({
  individual,
  onClose,
}: {
  individual: Individual;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{individual.seed.$name || 'Individual'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-xs text-gray-400">ID</span>
            <div className="text-sm">{individual.id}</div>
          </div>

          <div>
            <span className="text-xs text-gray-400">Fitness</span>
            <div className="text-lg font-bold text-green-400">{individual.fitness.toFixed(4)}</div>
          </div>

          <div>
            <span className="text-xs text-gray-400">Generation</span>
            <div className="text-sm">{individual.generation}</div>
          </div>

          <div>
            <span className="text-xs text-gray-400">Genes</span>
            <div className="mt-1 space-y-1">
              {Object.entries(individual.genes).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-300">{key}</span>
                  <span className="text-blue-400">
                    {Array.isArray(val) ? `[${val.map(v => v.toFixed(2)).join(', ')}]` : typeof val === 'number' ? val.toFixed(3) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
