-- ─── Paradigm Absolute — Complete Production Schema ─────────────────────────
-- PostgreSQL 16 + pgvector extension.
-- Safe to re-run: every object uses IF NOT EXISTS.
-- ────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER FUNCTION: updated_at
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    username             TEXT UNIQUE NOT NULL,
    email                TEXT UNIQUE,
    display_name         TEXT NOT NULL DEFAULT '',
    password_hash        TEXT NOT NULL,
    sovereignty_pubkey   JSONB,
    sovereignty_thumbprint TEXT UNIQUE,
    stripe_account_id    TEXT,
    role                 TEXT NOT NULL DEFAULT 'user',
    is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    seed_count           INTEGER NOT NULL DEFAULT 0,
    last_login_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_thumbprint_idx ON users(sovereignty_thumbprint);

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSKEYS (WebAuthn)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS passkeys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id   BYTEA NOT NULL UNIQUE,
    public_key      BYTEA NOT NULL,
    counter         BIGINT NOT NULL DEFAULT 0,
    transports      TEXT[],
    nickname        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS passkeys_user_idx ON passkeys(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEEDS (primary table)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS seeds (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    hash              TEXT UNIQUE NOT NULL,
    domain            TEXT NOT NULL,
    payload           JSONB NOT NULL,
    signature         BYTEA,
    author_id         UUID REFERENCES users(id) ON DELETE RESTRICT,
    parent_count      INTEGER NOT NULL DEFAULT 0,
    quality_vector    REAL[],
    quality_scalar    REAL,
    embedding         vector(384),
    title             TEXT,
    description       TEXT,
    tags              TEXT[],
    license           TEXT NOT NULL DEFAULT 'CC-BY-4.0',
    visibility        TEXT NOT NULL DEFAULT 'private',
    is_marketplace    BOOLEAN NOT NULL DEFAULT FALSE,
    generation        INTEGER NOT NULL DEFAULT 0,
    operation         TEXT NOT NULL DEFAULT 'primordial',
    lineage_parents   TEXT[],
    fitness_overall   REAL DEFAULT 0.5,
    federation_origin TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seeds_author_idx ON seeds(author_id);
CREATE INDEX IF NOT EXISTS seeds_domain_idx ON seeds(domain);
CREATE INDEX IF NOT EXISTS seeds_visibility_idx ON seeds(visibility);
CREATE INDEX IF NOT EXISTS seeds_tags_idx ON seeds USING GIN(tags);
CREATE INDEX IF NOT EXISTS seeds_payload_idx ON seeds USING GIN(payload jsonb_path_ops);
CREATE INDEX IF NOT EXISTS seeds_embedding_idx ON seeds USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;
CREATE INDEX IF NOT EXISTS seeds_created_idx ON seeds(created_at DESC);
CREATE INDEX IF NOT EXISTS seeds_hash_idx ON seeds(hash);
CREATE INDEX IF NOT EXISTS seeds_operation_idx ON seeds(operation);

DROP TRIGGER IF EXISTS seeds_updated_at ON seeds;
CREATE TRIGGER seeds_updated_at BEFORE UPDATE ON seeds FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- LINEAGE EDGES (parent → child DAG)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lineage_edges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    parent_seed_id  TEXT NOT NULL,
    child_seed_id   TEXT NOT NULL,
    relation        TEXT NOT NULL,
    functor_id      TEXT,
    weight          REAL NOT NULL DEFAULT 1.0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lineage_parent_idx ON lineage_edges(parent_seed_id);
CREATE INDEX IF NOT EXISTS lineage_child_idx ON lineage_edges(child_seed_id);
CREATE INDEX IF NOT EXISTS lineage_relation_idx ON lineage_edges(relation);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED EMBEDDINGS (pgvector, separate from seeds table for independent evolution)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS seed_embeddings (
    seed_hash      TEXT PRIMARY KEY,
    seed_id        TEXT NOT NULL,
    domain         TEXT NOT NULL,
    name           TEXT,
    embedding      vector(384) NOT NULL,
    model_id       TEXT NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    embed_version  INT NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seed_embeddings_hnsw ON seed_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS seed_embeddings_name_trgm ON seed_embeddings USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS seed_embeddings_domain ON seed_embeddings (domain);

DROP TRIGGER IF EXISTS seed_embeddings_updated_at ON seed_embeddings;
CREATE TRIGGER seed_embeddings_updated_at BEFORE UPDATE ON seed_embeddings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- MARKETPLACE LISTINGS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS listings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    seed_id         TEXT NOT NULL,
    seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    price_cents     INTEGER NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'USD',
    royalty_pct     REAL NOT NULL DEFAULT 0.10,
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings(seller_id);
CREATE INDEX IF NOT EXISTS listings_seed_idx ON listings(seed_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);

DROP TRIGGER IF EXISTS listings_updated_at ON listings;
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- SALES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sales (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    listing_id          UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    buyer_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seed_id             TEXT NOT NULL,
    gross_cents         INTEGER NOT NULL,
    platform_fee_cents  INTEGER NOT NULL,
    royalty_pool_cents  INTEGER NOT NULL,
    net_seller_cents    INTEGER NOT NULL,
    stripe_payment_intent TEXT UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_buyer_idx ON sales(buyer_id);
CREATE INDEX IF NOT EXISTS sales_seller_idx ON sales(seller_id);
CREATE INDEX IF NOT EXISTS sales_seed_idx ON sales(seed_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROYALTY PAYOUTS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS royalty_payouts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    ancestor_seed_id TEXT NOT NULL,
    weight          REAL NOT NULL,
    cents           INTEGER NOT NULL,
    stripe_transfer_id TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS royalty_recipient_idx ON royalty_payouts(recipient_id);
CREATE INDEX IF NOT EXISTS royalty_status_idx ON royalty_payouts(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- AGENT RUNS (cached agent invocations for replay)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id TEXT NOT NULL,
    concept_text    TEXT NOT NULL,
    concept_hash    TEXT NOT NULL,
    parsed_intent   JSONB,
    resolved_spec   JSONB,
    construction_plan JSONB,
    output_seed_id  TEXT,
    agent_version   TEXT NOT NULL,
    provider        TEXT NOT NULL,
    model           TEXT NOT NULL,
    duration_ms     INTEGER NOT NULL,
    cost_micros     BIGINT NOT NULL DEFAULT 0,
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_runs_user_idx ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS agent_runs_concept_hash_idx ON agent_runs(concept_hash);
CREATE INDEX IF NOT EXISTS agent_runs_created_idx ON agent_runs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- WORKSPACES (team collaboration)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workspaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            TEXT NOT NULL,
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    semantic_memory JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS workspaces_updated_at ON workspaces;
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'viewer',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEDERATION PEERS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS federation_peers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    url             TEXT UNIQUE NOT NULL,
    pubkey          JSONB NOT NULL,
    is_trusted      BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- TEMPLATES (GSPL Agent template registry)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    template_id     TEXT NOT NULL,
    version         TEXT NOT NULL,
    engine          TEXT NOT NULL,
    body            JSONB NOT NULL,
    author_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status          TEXT NOT NULL DEFAULT 'draft',
    usage_count     BIGINT NOT NULL DEFAULT 0,
    avg_quality     REAL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, version)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    username        TEXT,
    action          TEXT NOT NULL,
    resource        TEXT NOT NULL,
    resource_id     TEXT,
    details         JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC);
