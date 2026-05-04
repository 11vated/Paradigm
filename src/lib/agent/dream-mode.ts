import { createEmbeddingPipeline } from './pipeline';
import { growSeed, getAllDomains } from './engines';
import { createSeed } from './seeds';
import { rngFromHash } from './rng';

export interface DreamConfig {
  enabled: boolean;
  minIdleMs: number;
  maxConcurrent: number;
  domains: string[];
  targetFitness: number;
}

export interface DreamSeed {
  seed: any;
  reason: string;
  generationMs: number;
}

export interface DreamState {
  isRunning: boolean;
  lastDreamTime: string | null;
  seedsGenerated: number;
  errors: number;
}

class DreamMode {
  private config: DreamConfig;
  private state: DreamState;
  private idleTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(config?: Partial<DreamConfig>) {
    this.config = {
      enabled: false,
      minIdleMs: 5 * 60 * 1000,
      maxConcurrent: 3,
      domains: ['character', 'sprite', 'music', 'visual2d', 'procedural'],
      targetFitness: 0.7,
      ...config,
    };
    this.state = {
      isRunning: false,
      lastDreamTime: null,
      seedsGenerated: 0,
      errors: 0,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.state.isRunning = true;
    this.scheduleDream();
    console.log('[DreamMode] Started - will dream after 5 minutes of idle');
  }

  stop(): void {
    this.running = false;
    this.state.isRunning = false;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    console.log('[DreamMode] Stopped');
  }

  private scheduleDream(): void {
    if (!this.running) return;

    this.idleTimer = setTimeout(() => {
      this.dream();
    }, this.config.minIdleMs);
  }

  resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.running) {
      this.scheduleDream();
    }
  }

  private async dream(): Promise<DreamSeed[]> {
    console.log('[DreamMode] Waking up to dream...');
    const results: DreamSeed[] = [];
    const startTime = Date.now();

    try {
      for (const domain of this.config.domains.slice(0, this.config.maxConcurrent)) {
        try {
          const seed = await this.generateDreamSeed(domain);
          if (seed) {
            results.push(seed);
            this.state.seedsGenerated++;
          }
        } catch (e) {
          console.error(`[DreamMode] Error generating ${domain}:`, e);
          this.state.errors++;
        }
      }
    } finally {
      this.state.lastDreamTime = new Date().toISOString();
      console.log(`[DreamMode] Dreamed ${results.length} seeds in ${Date.now() - startTime}ms`);
      this.scheduleDream();
    }

    return results;
  }

  private async generateDreamSeed(domain: string): Promise<DreamSeed | null> {
    const startTime = Date.now();
    const seedHash = `dream-${domain}-${Date.now()}`;
    const rng = rngFromHash(seedHash);

    const seed = createSeed({
      $domain: domain,
      $name: `Dream ${domain} ${Date.now().toString(36)}`,
      $lineage: {
        operation: 'dream',
        generation: 0,
        parents: [],
      },
      genes: this.generateGenes(domain, rng),
    });

    try {
      const artifact = await growSeed(seed);

      if (artifact?.$fitness?.overall >= this.config.targetFitness) {
        return {
          seed,
          reason: `Generated ${domain} with fitness ${artifact.$fitness.overall}`,
          generationMs: Date.now() - startTime,
        };
      }

      return {
        seed,
        reason: `Generated ${domain} with fitness ${artifact?.$fitness?.overall || 0}`,
        generationMs: Date.now() - startTime,
      };
    } catch (e) {
      console.error(`[DreamMode] Failed to generate ${domain}:`, e);
      return null;
    }
  }

  private generateGenes(domain: string, rng: any): Record<string, any> {
    const domainGenes: Record<string, Record<string, any>> = {
      character: {
        archetype: { type: 'categorical', value: ['warrior', 'mage', 'rogue', 'healer'][rng.nextInt(0, 3)] },
        strength: { type: 'scalar', value: rng.nextF64() },
        agility: { type: 'scalar', value: rng.nextF64() },
      },
      sprite: {
        resolution: { type: 'int', value: 64 + rng.nextInt(0, 3) * 32 },
        style: { type: 'categorical', value: ['pixel', 'pixel-art', 'low-poly'][rng.nextInt(0, 2)] },
      },
      music: {
        tempo: { type: 'int', value: 80 + rng.nextInt(0, 80) },
        key: { type: 'categorical', value: ['C', 'G', 'D', 'A', 'E'][rng.nextInt(0, 4)] },
        mood: { type: 'categorical', value: ['happy', 'sad', 'energetic', 'calm'][rng.nextInt(0, 3)] },
      },
      visual2d: {
        width: { type: 'int', value: 512 + rng.nextInt(0, 2) * 512 },
        height: { type: 'int', value: 512 + rng.nextInt(0, 2) * 512 },
        style: { type: 'categorical', value: ['abstract', 'geometric', 'organic'][rng.nextInt(0, 2)] },
      },
      procedural: {
        octaves: { type: 'int', value: 2 + rng.nextInt(0, 4) },
        scale: { type: 'scalar', value: 0.5 + rng.nextF64() * 0.5 },
        persistence: { type: 'scalar', value: rng.nextF64() },
      },
    };

    return domainGenes[domain] || {};
  }

  getState(): DreamState {
    return { ...this.state };
  }

  getConfig(): DreamConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<DreamConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const dreamMode = new DreamMode();

export { DreamMode, type DreamConfig, type DreamState, type DreamSeed };