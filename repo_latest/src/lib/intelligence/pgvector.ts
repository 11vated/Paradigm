/**
 * pgvector repository for seed embeddings (Phase 1.4 / Appendix D D-6).
 *
 * Thin wrapper around `pg.Pool` that implements the minimum we need for the
 * intelligence layer: upsert a seed's embedding, delete on seed removal, and
 * ANN query by cosine distance. The migration that creates the table and
 * HNSW index lives in migrations/postgres/001_pgvector_seeds.sql.
 *
 * We keep this module tiny and SQL-explicit — no ORM, no query builder —
 * because the query count is small (<5) and pgvector's operators (`<=>`)
 * require raw SQL anyway.
 *
 * Pool lifecycle:
 *   - A single Pool is cached per process. On Node exit we don't explicitly
 *     close it; Postgres handles idle connections fine and tests manage
 *     their own pools via createPgPool.
 *   - If DATABASE_URL is unset we DO NOT throw on import; the module is
 *     safely present in environments without pg (e.g. unit tests that
 *     don't exercise similarity). Callers check readiness before use.
 */
import { Pool, type PoolConfig } from 'pg';

export interface EmbeddingRow {
  seed_hash: string;
  seed_id: string;
  domain: string;
  name: string | null;
  embedding: number[]; // decoded from the pgvector text representation
  model_id: string;
  embed_version: number;
}

export interface SimilarityHit {
  seed_hash: string;
  seed_id: string;
  domain: string;
  name: string | null;
  /** Cosine distance — pgvector `<=>` — smaller = more similar. Range [0, 2]. */
  distance: number;
}

export interface UpsertParams {
  seed_hash: string;
  seed_id: string;
  domain: string;
  name?: string | null;
  embedding: number[];
  model_id?: string;
  embed_version?: number;
}

export interface SimilarityQuery {
  vector: number[];
  limit?: number;
  /** Optional domain filter — "give me similar seeds, but only in `audio`". */
  domain?: string;
  /** Exclude a specific seed_hash (e.g. the query seed itself). */
  excludeHash?: string;
}

let _pool: Pool | null = null;

/**
 * Lazily initialise (and cache) the process-wide pg pool. Env-driven so test
 * harnesses can override DATABASE_URL before the first call.
 */
export function getPgPool(config?: PoolConfig): Pool {
  if (_pool) return _pool;
  const connectionString = config?.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString && !config) {
    throw new Error('DATABASE_URL is not set and no PoolConfig provided');
  }
  _pool = new Pool({
    connectionString,
    // 10s statement timeout keeps a bad HNSW query from wedging a worker.
    statement_timeout: 10_000,
    // Pool defaults are fine for a single app instance; revisit on horizontal scale.
    max: 10,
    ...config,
  });
  // Surface pool errors to stderr rather than letting them kill the process
  // silently. pg emits these when idle clients die (e.g. pg restart).
  _pool.on('error', (err) => {
    // eslint-disable-next-line no-console -- pool-level error path, before logger may exist
    console.error('[pgvector] pool error:', err.message);
  });
  return _pool;
}

/**
 * Reset the cached pool. Tests use this between setup/teardown so each run
 * gets a fresh pool against a fresh DB. Not meant for production use.
 */
export async function resetPgPool(): Promise<void> {
  if (_pool) {
    await _pool.end().catch(() => {
      /* swallow — we're tearing down anyway */
    });
    _pool = null;
  }
}

/**
 * pgvector accepts `[0.1,0.2,...]` as the input literal for vector columns.
 * Building this as a JS string (not a bound param) is the documented idiom;
 * we then bind the whole string via `$1::vector(N)` so the query plan is
 * stable. Guards against NaN/Infinity which would round-trip to `NaN` text
 * and trigger a pg conversion error.
 */
export function encodeVector(v: number[]): string {
  if (!Array.isArray(v) || v.length === 0) {
    throw new Error('encodeVector: vector must be a non-empty array');
  }
  const parts: string[] = new Array(v.length);
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (!Number.isFinite(x)) {
      throw new Error(`encodeVector: non-finite value at index ${i}`);
    }
    parts[i] = String(x);
  }
  return `[${parts.join(',')}]`;
}

/**
 * Decode pgvector's text representation `[0.1,0.2,...]` back to number[].
 * Used by selectByHash which returns the stored vector for diffing/debug.
 */
export function decodeVector(s: string): number[] {
  if (typeof s !== 'string' || s.length < 2 || s[0] !== '[' || s[s.length - 1] !== ']') {
    throw new Error('decodeVector: expected pgvector text form [a,b,...]');
  }
  const inner = s.slice(1, -1);
  if (inner.length === 0) return [];
  return inner.split(',').map((n) => Number(n));
}

/**
 * Upsert an embedding row keyed by seed_hash. Hash is content-addressable
 * (sha256 of canonical genes) — same hash means same inputs, so an existing
 * row with the same model_id + embed_version is already correct. We still
 * run the UPDATE so updated_at moves, which helps cache invalidation.
 */
export async function upsertEmbedding(params: UpsertParams, pool?: Pool): Promise<void> {
  const p = pool ?? getPgPool();
  const {
    seed_hash,
    seed_id,
    domain,
    name = null,
    embedding,
    model_id = 'sentence-transformers/all-MiniLM-L6-v2',
    embed_version = 1,
  } = params;

  const vecLiteral = encodeVector(embedding);
  // The `::vector` cast is required because bound params are typed as text
  // by default. Without it pg sees a string and the insert fails at runtime
  // with "invalid input syntax for type vector".
  await p.query(
    `INSERT INTO seed_embeddings
       (seed_hash, seed_id, domain, name, embedding, model_id, embed_version)
     VALUES ($1, $2, $3, $4, $5::vector, $6, $7)
     ON CONFLICT (seed_hash) DO UPDATE
       SET seed_id       = EXCLUDED.seed_id,
           domain        = EXCLUDED.domain,
           name          = EXCLUDED.name,
           embedding     = EXCLUDED.embedding,
           model_id      = EXCLUDED.model_id,
           embed_version = EXCLUDED.embed_version,
           updated_at    = now()`,
    [seed_hash, seed_id, domain, name, vecLiteral, model_id, embed_version],
  );
}

/**
 * ANN similarity search. `<=>` is pgvector's cosine distance; the HNSW index
 * in the migration (`vector_cosine_ops`) matches this operator. Both the
 * ORDER BY and the SELECT list reference the same expression so the planner
 * reuses the computed distance.
 */
export async function findSimilar(
  q: SimilarityQuery,
  pool?: Pool,
): Promise<SimilarityHit[]> {
  const p = pool ?? getPgPool();
  const limit = Math.max(1, Math.min(100, q.limit ?? 10));
  const vecLiteral = encodeVector(q.vector);

  const conds: string[] = [];
  const params: unknown[] = [vecLiteral];
  let paramIdx = 2;
  if (q.domain) {
    conds.push(`domain = $${paramIdx++}`);
    params.push(q.domain);
  }
  if (q.excludeHash) {
    conds.push(`seed_hash <> $${paramIdx++}`);
    params.push(q.excludeHash);
  }
  params.push(limit);
  const whereClause = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const sql = `
    SELECT seed_hash,
           seed_id,
           domain,
           name,
           embedding <=> $1::vector AS distance
      FROM seed_embeddings
      ${whereClause}
     ORDER BY embedding <=> $1::vector ASC
     LIMIT $${paramIdx}`;
  const { rows } = await p.query(sql, params);
  return rows.map((r: any) => ({
    seed_hash: r.seed_hash,
    seed_id: r.seed_id,
    domain: r.domain,
    name: r.name,
    distance: Number(r.distance),
  }));
}

export async function deleteEmbedding(seed_hash: string, pool?: Pool): Promise<void> {
  const p = pool ?? getPgPool();
  await p.query(`DELETE FROM seed_embeddings WHERE seed_hash = $1`, [seed_hash]);
}

/**
 * Liveness probe for readiness checks. Runs the cheapest query pg supports
 * (`SELECT 1`) and returns if it lands. Throws on any failure.
 */
export async function probePg(pool?: Pool): Promise<void> {
  const p = pool ?? getPgPool();
  await p.query('SELECT 1');
}
