/**
 * NSLC (Novelty Search with Local Competition)
 *
 * Combines novelty search (rewarding behavioral uniqueness) with
 * local competition (competing against similar individuals).
 * Drives open-ended exploration while maintaining quality pressure.
 */

import type { Seed } from '../kernel/types';
import { rngFromHash } from '../kernel/rng';

interface ArchiveEntry {
  fitness: number;
  measures: number[];
}

export interface NSLCConfig {
  archiveSize: number;
  generations: number;
  mutationRate: number;
  noveltyK: number;
  noveltyWeight: number;
}

export interface NSLCResult {
  archive: { seed: Seed; novelty: number; localQuality: number; combined: number; measures: number[] }[];
  best: Seed;
  bestNovelty: number;
  history: { generation: number; bestNovelty: number; archiveSize: number }[];
}

export class NSLC {
  private config: NSLCConfig;

  constructor(config: Partial<NSLCConfig> = {}) {
    this.config = {
      archiveSize: config.archiveSize || 1000,
      generations: config.generations || 200,
      mutationRate: config.mutationRate || 0.2,
      noveltyK: config.noveltyK || 15,
      noveltyWeight: config.noveltyWeight || 0.7,
    };
  }

  async run(
    initialPopulation: Seed[],
    fitnessFn: (seed: Seed) => Promise<number>,
    measureFn: (seed: Seed) => number[]
  ): Promise<NSLCResult> {
    const rng = rngFromHash(initialPopulation[0]?.$hash || 'nslc-default');
    const archive: { seed: Seed; fitness: number; novelty: number; localQuality: number; combined: number; measures: number[] }[] = [];

    for (const seed of initialPopulation) {
      const fitness = await fitnessFn(seed);
      const measures = measureFn(seed);
      archive.push({ seed, fitness, novelty: 0, localQuality: 0, combined: fitness, measures });
    }

    for (const entry of archive) {
      entry.novelty = this.computeNovelty(entry.measures, archive);
    }

    const history: NSLCResult['history'] = [];
    let bestNovelty = 0;
    let best = initialPopulation[0];

    for (let gen = 0; gen < this.config.generations; gen++) {
      for (const entry of archive) {
        entry.novelty = this.computeNovelty(entry.measures, archive);
        entry.localQuality = this.computeLocalQuality(entry, archive);
        entry.combined = this.config.noveltyWeight * entry.novelty + (1 - this.config.noveltyWeight) * entry.localQuality;
      }

      const parent = this.selectParent(archive, rng);
      const child = this.mutate(parent.seed, rng);
      const fitness = await fitnessFn(child);
      const measures = measureFn(child);
      const novelty = this.computeNovelty(measures, archive);
      const localQuality = this.computeLocalQualityForNew(measures, fitness, archive);
      const combined = this.config.noveltyWeight * novelty + (1 - this.config.noveltyWeight) * localQuality;

      if (novelty > bestNovelty) {
        bestNovelty = novelty;
        best = child;
      }

      if (archive.length < this.config.archiveSize || combined > this.getMinCombined(archive)) {
        archive.push({ seed: child, fitness, novelty, localQuality, combined, measures });
        if (archive.length > this.config.archiveSize) {
          archive.sort((a, b) => b.combined - a.combined);
          archive.splice(this.config.archiveSize);
        }
      }

      history.push({ generation: gen, bestNovelty, archiveSize: archive.length });
    }

    return {
      archive: archive.map(a => ({ seed: a.seed, novelty: a.novelty, localQuality: a.localQuality, combined: a.combined, measures: a.measures })),
      best,
      bestNovelty,
      history,
    };
  }

  private computeNovelty(measures: number[], archive: { measures: number[] }[]): number {
    const distances = archive
      .map(a => this.distance(measures, a.measures))
      .sort((a, b) => a - b);
    const k = Math.min(this.config.noveltyK, distances.length);
    return distances.slice(0, k).reduce((a, b) => a + b, 0) / (k || 1);
  }

  private computeLocalQuality(entry: ArchiveEntry, archive: ArchiveEntry[]): number {
    const neighbors = archive
      .map(a => ({ dist: this.distance(entry.measures, a.measures), fitness: a.fitness }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, this.config.noveltyK);
    return neighbors.length > 0 ? neighbors.reduce((a, b) => a + b.fitness, 0) / neighbors.length : entry.fitness;
  }

  private computeLocalQualityForNew(measures: number[], fitness: number, archive: ArchiveEntry[]): number {
    const neighbors = archive
      .map(a => ({ dist: this.distance(measures, a.measures), fitness: a.fitness }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, this.config.noveltyK);
    const all = [...neighbors, { dist: 0, fitness }];
    return all.reduce((a, b) => a + b.fitness, 0) / all.length;
  }

  private selectParent(archive: { seed: Seed; combined: number }[], rng: { nextF64: () => number }) {
    const tournamentSize = Math.min(7, archive.length);
    let best: typeof archive[0] | null = null;
    for (let i = 0; i < tournamentSize; i++) {
      const c = archive[Math.floor(rng.nextF64() * archive.length)];
      if (!best || c.combined > best.combined) best = c;
    }
    return best!;
  }

  private getMinCombined(archive: { combined: number }[]): number {
    if (archive.length === 0) return 0;
    return Math.min(...archive.map(a => a.combined));
  }

  private mutate(seed: Seed, rng: { nextF64: () => number }): Seed {
    const child = JSON.parse(JSON.stringify(seed));
    if (!child.genes) return child;
    for (const [, gene] of Object.entries(child.genes)) {
      if (rng.nextF64() < this.config.mutationRate) {
        const g = gene as any;
        if (typeof g.value === 'number') {
          g.value = Math.max(0, Math.min(1, g.value + (rng.nextF64() - 0.5) * 0.25));
        }
      }
    }
    return child;
  }

  private distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }
}

export function createNSLC(config?: Partial<NSLCConfig>): NSLC {
  return new NSLC(config);
}
