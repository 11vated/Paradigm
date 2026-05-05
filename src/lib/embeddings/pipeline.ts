import { createPgVectorStore, type PgVectorStore, type SimilaritySearchResult } from './pgvector';
import { createHash } from 'crypto';

export interface EmbeddingRequest {
  seedId: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResponse {
  seedId: string;
  embedding: number[];
  dimension: number;
}

const DEFAULT_SBERT_URL = process.env.SBERT_URL || 'http://localhost:8000';
const DEFAULT_DIMENSION = 384;

export class EmbeddingPipeline {
  private store: PgVectorStore | null = null;
  private sbertUrl: string;
  private defaultDimension: number;

  constructor(sbertUrl: string = DEFAULT_SBERT_URL, defaultDimension: number = DEFAULT_DIMENSION) {
    this.sbertUrl = sbertUrl;
    this.defaultDimension = defaultDimension;
  }

  async initialize(): Promise<void> {
    this.store = createPgVectorStore();
    await this.store.connect();
  }

  async embedText(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.sbertUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`SBERT error: ${response.status}`);
      }

      const data = await response.json();
      return data.embedding || data.embeddings?.[0] || [];
    } catch (error) {
      console.error('[EmbeddingPipeline] SBERT unavailable, using deterministic fallback');
      return this.deterministicEmbedding(text);
    }
  }

  private deterministicEmbedding(text: string): number[] {
    const hash = createHash('sha256').update(text).digest();
    const embedding: number[] = [];
    
    for (let i = 0; i < this.defaultDimension; i++) {
      const chunk = hash.slice(Math.floor(i / 8) % 32, Math.floor(i / 8) % 32 + 8);
      let value = 0;
      for (let j = 0; j < chunk.length; j++) {
        value = (value << 8) | chunk[j];
      }
      embedding.push((value % 1000) / 1000);
    }

    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / norm);
  }

  async embedSeed(seed: {
    $hash: string;
    $name?: string;
    $domain?: string;
    genes?: Record<string, any>;
  }): Promise<void> {
    if (!this.store) {
      throw new Error('EmbeddingPipeline not initialized');
    }

    const text = this.seedToText(seed);
    const embedding = await this.embedText(text);

    await this.store.insertEmbedding({
      seedId: seed.$hash,
      embedding,
      dimension: this.defaultDimension,
      createdAt: new Date(),
    });
  }

  private seedToText(seed: { $name?: string; $domain?: string; genes?: Record<string, any> }): string {
    const parts: string[] = [];

    if (seed.$name) parts.push(seed.$name);
    if (seed.$domain) parts.push(seed.$domain);

    if (seed.genes) {
      for (const [geneName, gene] of Object.entries(seed.genes)) {
        if (gene && typeof gene === 'object' && 'value' in gene) {
          parts.push(`${geneName}:${JSON.stringify(gene.value)}`);
        }
      }
    }

    return parts.join(' ');
  }

  async findSimilar(seedId: string, limit: number = 10): Promise<SimilaritySearchResult[]> {
    if (!this.store) {
      throw new Error('EmbeddingPipeline not initialized');
    }

    return this.store.findSimilarToSeed(seedId, limit);
  }

  async findSimilarByText(text: string, limit: number = 10): Promise<SimilaritySearchResult[]> {
    if (!this.store) {
      throw new Error('EmbeddingPipeline not initialized');
    }

    const embedding = await this.embedText(text);
    return this.store.findSimilar(embedding, limit);
  }

  async getAllEmbeddings(limit: number = 1000): Promise<{ seedId: string; metadata: any }[]> {
    if (!this.store) {
      throw new Error('EmbeddingPipeline not initialized');
    }

    return this.store.getAllSeeds(limit);
  }

  async hasEmbedding(seedId: string): Promise<boolean> {
    if (!this.store) {
      return false;
    }

    const embedding = await this.store.getEmbedding(seedId);
    return embedding !== null;
  }

  async deleteEmbedding(seedId: string): Promise<void> {
    if (!this.store) {
      throw new Error('EmbeddingPipeline not initialized');
    }

    await this.store.deleteEmbedding(seedId);
  }

  async count(): Promise<number> {
    if (!this.store) {
      return 0;
    }

    return this.store.count();
  }

  async shutdown(): Promise<void> {
    if (this.store) {
      await this.store.disconnect();
      this.store = null;
    }
  }
}

export const createEmbeddingPipeline = (sbertUrl?: string) => new EmbeddingPipeline(sbertUrl);