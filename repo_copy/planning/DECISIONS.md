# Appendix D Decisions — Locked 2026-04-14

These answer the 9 open decisions from the Master Production Plan and
unblock Phase 1. Bold entries are where the user chose the more ambitious
path — they reshape Phase 1 scope vs. the recommended defaults.

| ID  | Decision                      | Chosen                                                                 | Notes |
|-----|-------------------------------|------------------------------------------------------------------------|-------|
| D-1 | Python FastAPI backend        | Keep as reference-only                                                 | Mark orphaned in README; revisit at Phase 7. |
| D-2 | `grow` vs `pipeline` routes   | Keep both, document the split                                          | `/seeds/:id/grow` = single-engine. `/pipeline/execute` = multi-stage. |
| D-3 | Production mint chain         | **Base Mainnet**                                                       | Sepolia remains testnet. Indexers: Basescan, The Graph. |
| D-4 | Reverse proxy                 | **Switch to Caddy now**                                                | Rewrite `nginx.conf` → `Caddyfile`. Auto-HTTPS out of the box. |
| D-5 | Embeddings                    | **Self-hosted SBERT from day one**                                     | Python inference sidecar. No vendor embedding API in the critical path. |
| D-6 | Vector DB                     | **pgvector from day one**                                              | Postgres joins the stack immediately. No hnswlib → pgvector migration later. |
| D-7 | Local LM                      | Phi-4-mini (router + fast) + Phi-4 14B (heavy); Llama 3 deferred       | Via llama.cpp or Ollama. Permissive license. |
| D-8 | Permanent storage             | Both — Arweave for genesis seeds, IPFS for working seeds               | Gateway reads; sign uploads on the client. |
| D-9 | Canvas tech                   | **Custom WebGL (pixi.js or regl) from day one**                        | No react-flow stopgap. Selection, zoom, minimap built in-house. |

## What these decisions imply for Phase 1

The three bolded picks add real scope to Phase 1. In order of impact:

1. **Caddy migration (D-4).** Replaces `nginx.conf` with a `Caddyfile`,
   updates `docker-compose.prod.yml`, and has to re-solve the CSP story we
   just fixed in Phase 0 (no `unsafe-eval`; script-src nonces for Vite).
   Cert automation simplifies, but CI/staging need a domain + DNS so
   LetsEncrypt HTTP-01 can succeed.

2. **pgvector + self-hosted SBERT (D-5 + D-6).** Postgres becomes a
   first-class service alongside the JSON store. SBERT runs in a Python
   sidecar (FastAPI or a thin gRPC server) and exposes
   `/embed?text=` → `Float32Array[384]`. Embeddings are written into a
   `pgvector` column on seed insert/update; similarity search is a
   `<=>` query with an HNSW or IVFFlat index. This is a full vertical
   slice of infra work, not a feature.

3. **Custom WebGL canvas (D-9).** pixi.js or regl from day one. Budget
   3–4 sprints of Studio frontend work: pan/zoom, node rendering,
   edge routing, hit-testing, selection, minimap, viewport culling for
   large graphs. We defer the lineage-tree view (D3 is still fine there)
   and the composition-path view to the new canvas.

## Phase 1 scope update (supersedes master plan §4)

Original Phase 1 was "auth + CI/CD + docker + logging + health". With
these decisions folded in, Phase 1 becomes:

| # | Track                  | Deliverable                                                                                  |
|---|------------------------|----------------------------------------------------------------------------------------------|
| 1 | **Infra**              | Caddyfile + auto-HTTPS (D-4), Postgres in compose (D-6), SBERT sidecar container (D-5)       |
| 2 | **Auth**               | OAuth2 + JWT via fastapi-users-equivalent pattern in Express/TS; httpOnly refresh cookie     |
| 3 | **CI/CD**              | GitHub Actions: lint → test → build images → push GHCR → deploy staging; smoke tests        |
| 4 | **Observability**      | Pino structured logs, `/health` + `/ready`, Prometheus metrics endpoint                      |
| 5 | **Embedding pipeline** | SBERT sidecar + pgvector column on seeds + `/seeds/similar?id=` endpoint                     |
| 6 | **Canvas foundation**  | pixi.js canvas with pan/zoom/selection, rendering N seeds as nodes with lineage edges        |
| 7 | **Validation**         | Zod or TypeBox schemas for every mutation endpoint (parity with the Python Pydantic models)  |

## What Phase 1 does **not** include (explicit non-goals)

- Agent swarms, dream mode, self-improving engines (Creative Prompt)
- Arweave/IPFS upload pipelines (D-8 infra lands in Phase 2; testnet mint
  still uses local blob + on-chain hash in Phase 1)
- Phi-4 local LM inference (D-7 lands in Phase 2 alongside the agent rewrite)
- Base Mainnet deploy (D-3 is Phase 2; Sepolia continues to serve through Phase 1)
- 27 engines hardened. Phase 1 picks 3–5 that are real today and freezes the rest.

## Decision revisit schedule

- D-4 (Caddy): re-evaluate end of Phase 1. If ops finds it harder than nginx was, revert.
- D-5 + D-6: re-evaluate at 10k seeds — SBERT latency and pgvector query plan both.
- D-9 (custom WebGL): re-evaluate at end of Phase 1. If canvas work dominates
  more than one sprint of the two allotted, fall back to react-flow for MVP
  and keep custom WebGL as a Phase 3 rewrite.

---

*Recorded 2026-04-14 at the close of Phase 0. Next review: Phase 1 sprint 0 kick-off.*
