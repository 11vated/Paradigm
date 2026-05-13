# Paradigm Absolute

**Deterministic Synthetic Evolution Operating System**

[![TypeScript](https://img.shields.io/badge/TypeScript-0_errors-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-899_passing-brightgreen)]()
[![API Endpoints](https://img.shields.io/badge/endpoints-66+-blue)]()
[![Gene Types](https://img.shields.io/badge/gene_types-22-purple)]()
[![Domains](https://img.shields.io/badge/domains-27-blue)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## Overview

Paradigm Absolute is a **deterministic synthetic evolution operating system** where every digital artifact is encoded as a **seed** — a genetic blueprint that can be bred, mutated, evolved, and composed across 27 creative domains with full lineage tracking, cryptographic sovereignty, and per-gene ownership.

**The Core Guarantee:**
```
same seed + same deterministic RNG + same code = bit-identical output forever
```

This determinism enables verifiable provenance, trustless collaboration, automatic royalty distribution, and reproducible generative creation across any platform.

### 🔧 Recent Critical Fixes (May 2026)
- **GSPL Interpreter:** All 24 interpreter tests now pass — fixed async execution, control flow (if/for/while), function calls, kernel operation wiring, and built-in functions (`len`, `domains`, `range`, `Math.*`)
- **Determinism Hardened:** Replaced all `Date.now()` / `crypto.randomUUID()` with deterministic IDs and zero-timestamps in seed operations, server endpoints, and provenance
- **UniversalSeed.distance():** Added genetic distance method for GA diversity calculations
- **Engine Dispatch:** Fixed `growSeed` to correctly flatten dispatch results, resolving character/agent artifact generation
- **Fitness Evaluators:** Fixed shader evaluator penalty messages for empty genes
- **Frontend Cleanup:** Removed 4 JSX shadow duplicates (`StudioPage.jsx`, `AgentPanel.jsx`, `AuthPage.jsx`, `LandingPage.jsx`)
- **Security:** Tightened CSP headers, replaced misleading API key placeholders
- **Build:** Externalized Node.js builtins in Vite config for production builds

---

## Core Capabilities

### 🧬 22-Type Gene System (Evolvable Lattice)
Not a flat list — a **type hierarchy** where each type inherits operators from its parent. The lattice supports runtime derivation of new gene types:

| Category | Types |
|---|---|
| **Primitive** | `boolean`, `scalar`, `categorical` |
| **Container** | `vector`, `matrix`, `array`, `struct`, `graph` |
| **Spatial** | `field`, `topology`, `sdf` |
| **Temporal** | `temporal`, `keyframe`, `envelope` |
| **Symbolic** | `expression`, `symbolic`, `gematria`, `regulatory` |
| **Learned** | `dimensional`, `quantum`, `resonance` |
| **Meta** | `sovereignty` |

- **User-definable types** — register new gene types at runtime via `POST /api/gene-types/register` with law verification
- **Per-gene sovereignty** — every gene carries its own ownership chain, signature history, and license
- **Automatic law verification** — identity, symmetry, determinism, zero-rate mutation tested on registration

### 🗺️ 27 Domain Engines + 100+ Generators

| Domain | Domain | Domain | Domain |
|---|---|---|---|
| Character | Sprite | Music | Visual2D |
| Geometry3D | FullGame | Animation | Narrative |
| UI | Physics | Audio | Ecosystem |
| Game | ALife | Shader | Particle |
| Procedural | Typography | Architecture | Vehicle |
| Furniture | Fashion | Robotics | Circuit |
| Food | Choreography | Agent | |

Plus 100+ industrial domain generators (aerospace, cybersecurity, genomics, nanotechnology, etc.)

### 🔀 Cross-Domain Composition
12 category-theoretic **functor bridges** with BFS pathfinding and coherence scoring:
- `character → sprite`, `character → music`, `character → fullgame`
- `procedural → fullgame`, `music → ecosystem`, `physics → fullgame`
- `visual2d → animation`, `narrative → fullgame`, `terrain → fullgame`
- `agent → character`, `agent → narrative`, `agent → mixed`

### 📈 7 Evolution Algorithms
| Algorithm | Strategy |
|---|---|
| **GA** | Tournament selection, crossover, mutation, elitism |
| **MAP-Elites** | Quality-diversity archive by behavioral descriptors |
| **CMA-ES** | Covariance Matrix Adaptation — continuous optimization |
| **Novelty Search** | Rewards behavioral novelty over fitness |
| **AURORA** | Unsupervised quality-diversity (learns descriptors) |
| **DQD** | Differentiable Quality-Diversity with gradient guidance |
| **POET** | Paired Open-Ended Trailblazer (co-evolution) |

### 🔬 Differentiable Substrate
Gene gradients compute how quality changes w.r.t. gene values — enabling **gradient-guided mutation** and the **inverse pipeline** (description → seed).

### 🛡️ Cryptographic Sovereignty
ECDSA P-256 signing with **stateless verification** — no blockchain required:
- Per-gene ownership chains with full signature history
- Configurable licenses (CC-BY, CC-BY-NC, custom, etc.)
- Permission checking per operation (breed, mutate, commercial)
- WebAuthn passkey support
- C2PA Content Credentials on every exported artifact

### 🤖 Native GSPL Agent
Built-in AI agent with 4 inference tiers, 10 kernel tools, multi-step reasoning, swarm orchestration, and 4-layer memory — all operating above the deterministic boundary.

### 🌐 Substrate Library & Federation
17 signed namespace libraries (`chem://`, `phys://`, `mat://`, `bio://`, `earth://`, etc.) with:
- CODATA physics constants, standard materials, music theory primitives
- P2P federation protocol for peer-to-peer seed sharing
- Federated knowledge graph with typed edges and tombstone-preserved lineage

### 🏛️ Creative DAO
On-chain governance with:
- PIP proposal system (gene types, domains, royalty curves, treasury)
- Token-weighted voting with configurable thresholds
- 12 constitutional commitments (non-patchable)
- Training Data Canon — provably licensed seed corpus for AI training

### 📦 Universal Content Fabric
```
GET /api/v1/render/:hash?format=glb   — On-demand artifact rendering (cache-first)
GET /api/seeds/:id/export/pseed       — Portable .pseed format (5KB → any artifact)
GET /api/v1/formats/:domain           — Supported output formats per domain
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/11vated/Paradigm.git
cd Paradigm

# Install
npm install

# Start server
npm run dev

# In another terminal — create a seed
curl -X POST http://localhost:3000/api/seeds \
  -H 'Content-Type: application/json' \
  -d '{"domain":"character","name":"Hero","genes":{"strength":{"type":"scalar","value":0.8}}}'

# Grow it into an artifact
curl -X POST http://localhost:3000/api/seeds/<id>/grow

# Export as .pseed
curl http://localhost:3000/api/seeds/<id>/export/pseed -o hero.pseed
```

### Testing

```bash
# Run all static tests (899 tests, no server needed)
npx vitest run

# Run with server for API integration tests
npm run dev &
sleep 10
npx vitest run tests/api.test.ts

# Run specific test suites
npx vitest run tests/kernel/       # Kernel: RNG, genes, gradients, sovereignty, types
npx vitest run tests/e2e/          # End-to-end lifecycle
npx vitest run tests/agent/        # Agent system
npx vitest run tests/gspl/         # GSPL language
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                LAYER 7 — STUDIO & MARKETPLACE                    │
│  React 19 SPA | WebSocket agent streaming | REST API Gateway    │
├──────────────────────────────────────────────────────────────────┤
│                LAYER 6 — INTELLIGENCE                            │
│  GSPL Agent (5-stage pipeline) | 8 sub-agents | 4-layer memory  │
├──────────────────────────────────────────────────────────────────┤
│                LAYER 5 — EVOLUTION & COMPOSITION                 │
│  GA / MAP-Elites / CMA-ES / Novelty / AURORA / DQD / POET       │
│  12 functor bridges | BFS pathfinding | Coherence scoring       │
├──────────────────────────────────────────────────────────────────┤
│                LAYER 4 — DOMAIN ENGINES                          │
│  27 canonical engines + 100+ industrial generators              │
│  Gradient computation | Inverse pipeline                        │
├──────────────────────────────────────────────────────────────────┤
│                LAYER 3 — GSPL LANGUAGE                           │
│  Lexer | Parser | Type checker | Interpreter | Bytecode | WGSL  │
│  LSP server | @gpu annotation                                   │
├──────────────────────────────────────────────────────────────────┤
│                LAYER 2 — SEED SYSTEM                             │
│  UniversalSeed | 22-type gene lattice | 4 operators per type    │
│  Per-gene sovereignty | Canonicalization | ECDSA signing        │
├──────────────────────────────────────────────────────────────────┤
│                LAYER 1 — KERNEL                                  │
│  xoshiro256** RNG | FIM | Tick cycle | 8-effect algebraic fx    │
│  Fisher Information Matrix | Deterministic scheduler            │
└──────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints (66+)

### Seeds
```
GET    /api/seeds              — List seeds (paginated, filterable)
POST   /api/seeds              — Create seed
GET    /api/seeds/:id          — Get seed by ID
DELETE /api/seeds/:id          — Delete seed
PUT    /api/seeds/:id/genes    — Edit genes
POST   /api/seeds/generate     — Generate deterministically from prompt
POST   /api/seeds/inverse      — Inverse pipeline (description → seed)
```

### Operations
```
POST /api/seeds/:id/grow       — Grow artifact via domain engine
POST /api/seeds/:id/mutate     — Gene-level mutation
POST /api/seeds/breed          — Crossover breeding
POST /api/seeds/:id/evolve     — Population evolution
POST /api/seeds/:id/compose    — Cross-domain composition
GET  /api/seeds/:id/lineage    — Ancestry chain
GET  /api/seeds/:id/descendants — Descendant list
POST /api/seeds/distance       — Genetic distance
```

### Gene System
```
GET  /api/gene-types           — List registered types (22)
POST /api/gene-types/register  — Register custom gene type (law-verified)
POST /api/gene/validate        — Validate gene value
GET  /api/domains              — List 27 domains
```

### Sovereignty
```
POST /api/keys/generate        — Generate ECDSA keypair
POST /api/seeds/:id/sign       — Sign a seed
POST /api/seeds/:id/verify     — Verify signature
GET  /api/seeds/:id/gene/:name/provenance  — Per-gene lineage
POST /api/seeds/:id/gene/:name/license     — Set per-gene license
GET  /api/seeds/:id/gene/:name/permission  — Check operation permission
POST /api/seeds/:id/mint       — Mint as NFT
```

### Agent
```
POST /api/agent/query          — Natural language → seed operations
POST /api/agent/query/async    — Async with LLM enhancement
GET  /api/agent/help           — Command listing
```

### Render & Export
```
GET  /api/v1/render/:hash      — On-demand artifact rendering
GET  /api/v1/formats/:domain   — Supported output formats
GET  /api/seeds/:id/export/pseed — .pseed file export
POST /api/seeds/import/pseed   — .pseed file import
```

### DAO & Canon
```
GET  /api/v1/dao               — DAO state
POST /api/v1/dao/propose       — Create PIP proposal
POST /api/v1/dao/vote/:id      — Vote on proposal
POST /api/v1/dao/execute/:id   — Execute passed proposal
POST /api/v1/canon/register    — Register seed in training canon
GET  /api/v1/canon/query       — Query training data canon
```

### VCS
```
POST /api/seeds/:id/commit     — Content-addressable commit
GET  /api/seeds/:id/log        — Commit history
POST /api/seeds/:id/merge      — 3-way merge
POST /api/seeds/:id/branches   — Branch management
```

---

## Project Status

| Metric | Value |
|---|---|
| TypeScript Errors | **0** |
| Tests Passing | **899/899** (50/50 files) |
| API Endpoints | **66+** |
| Domain Engines | **27** (+100 industrial) |
| Gene Types | **22** (17 original + 5 new) |
| Gene Type Hierarchy | **7 categories** (primitive → meta) |
| Functor Bridges | **12** (category-theoretic) |
| Evolution Algorithms | **7** (GA → POET) |
| Substrate Namespaces | **17** (chem:// → psy://) |
| Smart Contracts | **3** (ParaToken, SeedNFT, Marketplace) |
| Docker Services | **10** (app, postgres, redis, caddy, etc.) |

---

## Deployment

```bash
# PostgreSQL (production)
docker compose up -d postgres redis

# Build and run
npm run build
npm run dev

# Full production stack
docker compose up -d
```

### Environment
See `.env.example` for all configuration options:
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis for cache + rate limiting
- `JWT_SECRET` — Authentication (required in production)
- `SBERT_URL` — Embedding sidecar
- `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN` — WebAuthn config

---

## License

MIT License — see [LICENSE](LICENSE).

---

## Links

- **GitHub:** https://github.com/11vated/Paradigm
- **API Docs:** http://localhost:3000/api-docs/ui
- **Health:** http://localhost:3000/health
