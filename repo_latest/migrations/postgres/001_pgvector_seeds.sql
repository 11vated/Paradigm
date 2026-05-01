-- ─── Paradigm Absolute — pgvector embedding schema ────────────────────────
-- Per Appendix D D-6: pgvector from day one.
-- Runs automatically via Postgres' docker-entrypoint-initdb.d hook.
-- Safe to re-run: every object uses IF NOT EXISTS.
-- ────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Embeddings live in their own table rather than a column on `seeds` because
-- (a) the primary source of truth for seeds is the JSON store (or Mongo)
-- (b) embeddings are a derived view that can be rebuilt from the seed payload
-- (c) splitting lets us evolve the seed schema and the embedding model
--     independently. The seed_hash is the stable join key.
CREATE TABLE IF NOT EXISTS seed_embeddings (
    seed_hash      TEXT PRIMARY KEY,
    seed_id        TEXT NOT NULL,
    domain         TEXT NOT NULL,
    name           TEXT,
    -- 384 dims matches all-MiniLM-L6-v2 (the default in sidecars/sbert).
    -- A later migration can ALTER TYPE to 768 if we swap to mpnet-base.
    embedding      vector(384) NOT NULL,
    model_id       TEXT NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    embed_version  INT  NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for cosine distance. vector_cosine_ops pairs with the `<=>`
-- operator so `ORDER BY embedding <=> $1 LIMIT N` is the canonical ANN query.
CREATE INDEX IF NOT EXISTS seed_embeddings_hnsw
    ON seed_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Trigram index on name for hybrid search (vector + text fallback).
CREATE INDEX IF NOT EXISTS seed_embeddings_name_trgm
    ON seed_embeddings USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS seed_embeddings_domain
    ON seed_embeddings (domain);

-- updated_at trigger — cheap to include, useful for cache invalidation later.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS seed_embeddings_updated_at ON seed_embeddings;
CREATE TRIGGER seed_embeddings_updated_at
    BEFORE UPDATE ON seed_embeddings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
