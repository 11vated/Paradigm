import { Xoshiro256SS } from './xoshiro';
import { FIM, FoldState, FIMConfig } from './fim';
import { TickSystem, TickConfig, TickMetrics } from './tick';
import { Effects, Genome, Gene, EffectType, EffectConfig, GeneValue } from './effects';
import { GeneOperators, GeneOperator } from './operators';

export interface KernelConfig {
  seed: number;
  tickRate: number;
  foldProbability: number;
  mutationRate: number;
  crossoverRate: number;
  maxHistory: number;
}

export class Kernel {
  private rng: Xoshiro256SS;
  private fim: FIM;
  private tick: TickSystem;
  private config: KernelConfig;
  private genomes: Map<string, Genome> = new Map();
  private activeGenome: Genome | null = null;

  constructor(config: Partial<KernelConfig> = {}) {
    this.config = {
      seed: config.seed ?? Date.now(),
      tickRate: config.tickRate ?? 60,
      foldProbability: config.foldProbability ?? 0.1,
      mutationRate: config.mutationRate ?? 0.01,
      crossoverRate: config.crossoverRate ?? 0.7,
      maxHistory: config.maxHistory ?? 1000
    };

    this.rng = new Xoshiro256SS(this.config.seed);
    this.fim = new FIM({ foldProbability: this.config.foldProbability });
    this.tick = new TickSystem({ tickRate: this.config.tickRate });
  }

  initialize(): void {
    this.tick.registerCallback('genomeEvolution', async () => {
      if (this.activeGenome) {
        this.evolve(this.activeGenome);
      }
    });
    this.tick.start();
  }

  createGenome(genes: Map<string, Gene> = new Map()): Genome {
    const genome: Genome = {
      id: crypto.randomUUID(),
      genes,
      fitness: undefined,
      lineage: []
    };

    this.genomes.set(genome.id, genome);
    this.activeGenome = genome;

    return genome;
  }

  addGene(type: string, value: GeneValue, metadata?: Partial<Gene['metadata']>): void {
    if (!this.activeGenome) {
      this.activeGenome = this.createGenome();
    }

    const gene: Gene = {
      id: crypto.randomUUID(),
      type,
      value,
      metadata: {
        mutable: true,
        dominant: false,
        expressionRange: [0, 1],
        mutationRate: this.config.mutationRate,
        ...metadata
      }
    };

    this.activeGenome.genes.set(gene.id, gene);
  }

  evolve(genome: Genome): Genome {
    const effectConfig: EffectConfig = {
      intensity: this.config.mutationRate,
      probability: this.config.crossoverRate
    };

    let evolved = Effects.applyAll(genome, effectConfig, this.rng);
    evolved = this.fim.createInitialState({ genomeId: evolved.id }) as unknown as Genome;
    this.genomes.set(evolved.id, evolved);

    if (this.activeGenome?.id === genome.id) {
      this.activeGenome = evolved;
    }

    return evolved;
  }

  breed(parentA: Genome, parentB: Genome, count: number = 1): Genome[] {
    const offspring: Genome[] = [];
    const effectConfig: EffectConfig = {
      intensity: this.config.mutationRate,
      probability: this.config.crossoverRate
    };

    for (let i = 0; i < count; i++) {
      let child = Effects.applyEffect(parentA, EffectType.CROSSOVER, effectConfig, this.rng, [parentB]);
      child = Effects.applyEffect(child, EffectType.MUTATION, effectConfig, this.rng);
      child = Effects.applyEffect(child, EffectType.HOMEOSTASIS, effectConfig, this.rng);

      this.genomes.set(child.id, child);
      offspring.push(child);
    }

    return offspring;
  }

  selectFittest(genomes: Genome[], count: number = 10): Genome[] {
    return [...genomes]
      .sort((a, b) => (b.fitness ?? 0) - (a.fitness ?? 0))
      .slice(0, count);
  }

  evaluate(genome: Genome, fitnessFn: (g: Genome) => number): Genome {
    const evaluated = {
      ...genome,
      fitness: fitnessFn(genome)
    };
    this.genomes.set(genome.id, evaluated);
    return evaluated;
  }

  getGenome(id: string): Genome | undefined {
    return this.genomes.get(id);
  }

  getAllGenomes(): Genome[] {
    return Array.from(this.genomes.values());
  }

  getRNG(): Xoshiro256SS {
    return this.rng;
  }

  getFIM(): FIM {
    return this.fim;
  }

  getTick(): TickSystem {
    return this.tick;
  }

  getConfig(): KernelConfig {
    return { ...this.config };
  }

  getMetrics(): TickMetrics {
    return this.tick.getMetrics();
  }

  saveState(): object {
    return {
      config: this.config,
      rngState: this.rng.getState(),
      genomes: Array.from(this.genomes.entries())
    };
  }

  loadState(state: { rngState: number[]; genomes?: [string, Genome][] }): void {
    if (state.rngState) {
      this.rng.setState(state.rngState);
    }
    if (state.genomes) {
      this.genomes = new Map(state.genomes);
    }
  }

  fork(): Kernel {
    const forked = new Kernel(this.config);
    forked.rng = this.rng.fork();
    return forked;
  }

  shutdown(): void {
    this.tick.stop();
    this.fim.pruneHistory(this.config.maxHistory);
  }
}

export { Xoshiro256SS, FIM, TickSystem, Effects, GeneOperators };
export { EffectType, GeneOperator, Genome, Gene, GeneValue, EffectConfig };