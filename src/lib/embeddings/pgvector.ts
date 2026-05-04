import { createClient, type ClientConfig } from 'pg';

export interface EmbeddingResult {
  seedId: string;
  embedding: number[];
  dimension: number;
  createdAt: Date;
}

export interface SimilaritySearchResult {
  seedId: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface PgVectorStoreConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

export class PgVectorStore {
  private client: any;
  private tableName: string;

  constructor(config: PgVectorStoreConfig = {}) {
    this.tableName = 'seed_embeddings';
  }

  async connect(): Promise<void> {
    const config: ClientConfig = {
      host: process.env.POSTGRES_HOST || config.connectionString?.replace(/.*@/, '').replace(/:.*/, '') || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || config.database || 'paradigm',
      user: process.env.POSTGRES_USER || config.user || 'paradigm',
      password: process.env.POSTGRES_PASSWORD || config.password || 'paradigm',
    };

    if (config.connectionString) {
      Object.assign(config, { connectionString: config.connectionString });
    }

    this.client = createClient(config);
    await this.client.connect();

    await this.ensureTable();
  }

  private async ensureTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        seed_id VARCHAR(255) PRIMARY KEY,
        embedding vector(384),
        dimension INTEGER NOT NULL DEFAULT 384,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS ${this.tableName}_idx 
      ON ${this.tableName} 
      USING hnsw (embedding vector_cosine_ops);
    `;

    await this.client.query(createTableSQL);
  }

  async insertEmbedding(result: EmbeddingResult): Promise<void> {
    const sql = `
      INSERT INTO ${this.tableName} (seed_id, embedding, dimension, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (seed_id) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        created_at = EXCLUDED.created_at
    `;

    await this.client.query(sql, [
      result.seedId,
      `[${result.embedding.join(',')}]`,
      result.dimension,
      JSON.stringify(result.metadata || {}),
      result.createdAt,
    ]);
  }

  async getEmbedding(seedId: string): Promise<number[] | null> {
    const sql = `SELECT embedding FROM ${this.tableName} WHERE seed_id = $1`;
    const result = await this.client.query(sql, [seedId]);

    if (result.rows.length === 0) return null;

    const embedding = result.rows[0].embedding;
    return Array.isArray(embedding) ? embedding : [];
  }

  async findSimilar(
    embedding: number[],
    limit: number = 10,
    filter?: (seedId: string) => boolean
  ): Promise<SimilaritySearchResult[]> {
    const embeddingStr = `[${embedding.join(',')}]`;
    
    let sql = `
      SELECT 
        seed_id,
        1 - (embedding <=> $1::vector) as similarity,
        metadata
      FROM ${this.tableName}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;

    const result = await this.client.query(sql, [embeddingStr, limit]);

    let results: SimilaritySearchResult[] = result.rows.map((row: any) => ({
      seedId: row.seed_id,
      similarity: 1 - row.similarity,
      metadata: row.metadata,
    }));

    if (filter) {
      results = results.filter(r => filter(r.seedId));
    }

    return results;
  }

  async findSimilarToSeed(
    seedId: string,
    limit: number = 10
  ): Promise<SimilaritySearchResult[]> {
    const embedding = await this.getEmbedding(seedId);
    if (!embedding) {
      throw new Error(`No embedding found for seed ${seedId}`);
    }

    return this.findSimilar(embedding, limit, (id) => id !== seedId);
  }

  async getAllSeeds(limit: number = 1000): Promise<{ seedId: string; metadata: any }[]> {
    const sql = `SELECT seed_id, metadata FROM ${this.tableName} ORDER BY created_at DESC LIMIT $1`;
    const result = await this.client.query(sql, [limit]);

    return result.rows.map((row: any) => ({
      seedId: row.seed_id,
      metadata: row.metadata,
    }));
  }

  async deleteEmbedding(seedId: string): Promise<void> {
    const sql = `DELETE FROM ${this.tableName} WHERE seed_id = $1`;
    await this.client.query(sql, [seedId]);
  }

  async count(): Promise<number> {
    const sql = `SELECT COUNT(*) FROM ${this.tableName}`;
    const result = await this.client.query(sql);
    return parseInt(result.rows[0].count);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
    }
  }
}

export const createPgVectorStore = (config?: PgVectorStoreConfig) => new PgVectorStore(config);