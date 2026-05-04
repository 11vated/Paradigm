import { createEmbeddingPipeline, type EmbeddingPipeline } from './pipeline';

export interface SeedRecommendation {
  seedId: string;
  score: number;
  reason: string;
}

export class RecommendationEngine {
  private pipeline: EmbeddingPipeline;

  constructor(pipeline?: EmbeddingPipeline) {
    this.pipeline = pipeline || createEmbeddingPipeline();
  }

  async initialize(): Promise<void> {
    await this.pipeline.initialize();
  }

  async recommendForSeed(
    seedId: string,
    options: {
      limit?: number;
      includeComposer?: boolean;
      includeEvolver?: boolean;
    } = {}
  ): Promise<SeedRecommendation[]> {
    const { limit = 10 } = options;

    try {
      const similar = await this.pipeline.findSimilar(seedId, limit);
      return similar.map((s, i) => ({
        seedId: s.seedId,
        score: s.similarity,
        reason: `Similarity match #${i + 1}`,
      }));
    } catch {
      return [];
    }
  }

  async recommendForText(
    query: string,
    options: {
      limit?: number;
      domain?: string;
    } = {}
  ): Promise<SeedRecommendation[]> {
    const { limit = 10, domain } = options;

    try {
      const similar = await this.pipeline.findSimilarByText(query, limit * 2);
      
      let results = similar.map((s, i) => ({
        seedId: s.seedId,
        score: s.similarity,
        reason: `Text similarity match #${i + 1}`,
      }));

      if (domain) {
        results = results.filter(r => r.metadata?.domain === domain);
      }

      return results.slice(0, limit);
    } catch {
      return [];
    }
  }

  async recommendComposables(seedId: string, limit: number = 5): Promise<SeedRecommendation[]> {
    try {
      const allEmbeddings = await this.pipeline.getAllEmbeddings(200);
      
      const sourceEmbedding = await this.pipeline.findSimilar(seedId, 1);
      if (!sourceEmbedding.length) return [];

      const sourceDomain = sourceEmbedding[0].metadata?.domain;

      const compositionTargets: SeedRecommendation[] = [];

      for (const seed of allEmbeddings) {
        if (seed.seedId === seedId) continue;
        if (seed.metadata?.domain !== sourceDomain) {
          compositionTargets.push({
            seedId: seed.seedId,
            score: seed.metadata?.domain ? 0.7 : 0.3,
            reason: `Cross-domain composition: ${sourceDomain} → ${seed.metadata?.domain}`,
          });
        }
      }

      compositionTargets.sort((a, b) => b.score - a.score);
      return compositionTargets.slice(0, limit);
    } catch {
      return [];
    }
  }

  async recommendForBreeding(seedId: string, limit: number = 5): Promise<SeedRecommendation[]> {
    try {
      const similar = await this.pipeline.findSimilar(seedId, limit * 2);
      
      const allEmbeddings = await this.pipeline.getAllEmbeddings(500);
      const sourceSeed = allEmbeddings.find(s => s.seedId === seedId);
      const sourceDomain = sourceSeed?.metadata?.domain;

      const breedingPool: SeedRecommendation[] = [];

      for (const seed of similar) {
        if (seed.seedId === seedId) continue;
        
        const otherSeed = allEmbeddings.find(s => s.seedId === seed.seedId);
        if (otherSeed?.metadata?.domain === sourceDomain && otherSeed.seedId !== seedId) {
          breedingPool.push({
            seedId: seed.seedId,
            score: seed.similarity,
            reason: 'Same domain, good genetic distance',
          });
        }
      }

      breedingPool.sort((a, b) => b.score - a.score);
      return breedingPool.slice(0, limit);
    } catch {
      return [];
    }
  }

  async shutdown(): Promise<void> {
    await this.pipeline.shutdown();
  }
}

export const createRecommendationEngine = (pipeline?: EmbeddingPipeline) => 
  new RecommendationEngine(pipeline);