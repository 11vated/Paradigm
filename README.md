<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Paradigm GSPL Engine v2.0

**The Genetic Operating Environment for Digital Creation**

27 domains | 17 gene types | 12 functor bridges | 7 architectural layers | 359 tests

</div>

## What is Paradigm?

Paradigm is a sovereign creative platform where every artifact is a living blueprint encoded as a **UniversalSeed**. Seeds carry typed genes (scalar, vector, quantum, sovereignty, and 13 more), evolve through deterministic mutation and crossover, compose across domains via category-theoretic functor bridges, and can be cryptographically signed and minted as ERC-721 NFTs.

The entire core engine runs with **zero external AI dependency**. All mutation, breeding, composition, evolution, and growth operations are handled by a local deterministic kernel powered by a xoshiro256\*\* PRNG.

## Architecture

```
Layer 7  Studio & Marketplace     React 19 SPA, JWT auth, WebSocket agent, ErrorBoundary
Layer 6  Intelligence             Native GSPL Agent v2 (multi-step reasoning, 3-tier inference)
Layer 5  Evolution & Composition  GA, crossover, 12 functor bridges, BFS pathfinding
Layer 4  Domain Engines           27 developmental pipelines (character→fullgame, agent)
Layer 3  GSPL Language            Lexer, recursive-descent parser, type checker
Layer 2  Seed System              UniversalSeed, 17 gene types, 4 operators each
Layer 1  Kernel                   xoshiro256** RNG, deterministic everything
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Local Development

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start dev server (Vite + Express)
npm run dev
```

The app starts at `http://localhost:3000`. Register an account at `/auth`, then enter the Creation Studio.

### Docker (Production)

```bash
# Build and start all services (app + MongoDB + Redis + Nginx)
docker compose up -d

# Check health
curl http://localhost/health
```

Services: App (port 3000), MongoDB (27017), Redis (6379), Nginx reverse proxy (port 80).

## API Overview

All endpoints are under `/api`. Authentication uses JWT Bearer tokens with refresh rotation. Full interactive docs at `/api-docs/ui` (Swagger UI).

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account, returns JWT pair |
| POST | `/api/auth/login` | Authenticate, returns JWT pair |
| POST | `/api/auth/refresh` | Rotate access + refresh tokens |
| POST | `/api/auth/logout` | Revoke current tokens |

### Seeds
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/seeds` | List seeds (paginated, filterable) |
| POST | `/api/seeds` | Create seed |
| POST | `/api/seeds/generate` | Generate seed from prompt |
| POST | `/api/seeds/:id/mutate` | Mutate seed genes |
| POST | `/api/seeds/breed` | Crossover two parent seeds |
| POST | `/api/seeds/:id/evolve` | Run genetic algorithm |
| PUT | `/api/seeds/:id/genes` | Edit individual gene |
| POST | `/api/seeds/:id/grow` | Execute domain engine |
| POST | `/api/seeds/:id/compose` | Compose to target domain |

### Sovereignty
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/keys/generate` | Generate ECDSA P-256 keypair |
| POST | `/api/seeds/:id/sign` | Sign seed with private key |
| POST | `/api/seeds/:id/verify` | Verify seed signature |
| POST | `/api/seeds/:id/mint` | Prepare/execute ERC-721 mint |
| GET | `/api/seeds/:id/nft` | Get NFT metadata |
| GET | `/api/seeds/:id/portrait` | Get SVG gene portrait |

### Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/query` | Send natural language query |
| GET | `/api/agent/help` | Get agent capabilities |
| WS | `/ws/agent` | WebSocket streaming interface |

### Kernel Info
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/domains` | List 27 domains |
| GET | `/api/gene-types` | List 17 gene types |
| GET | `/api/engines` | List all engines |
| GET | `/api/composition/graph` | Get functor bridge graph |
| GET | `/api/stats` | Platform statistics |
| GET | `/api/audit` | Audit log (admin only) |
| GET | `/health` | Server health check |
| GET | `/metrics` | Prometheus-format metrics |
| GET | `/api-docs` | OpenAPI 3.1 spec (JSON) |
| GET | `/api-docs/ui` | Swagger UI |

## 17 Gene Types

Each gene type implements four operators: `validate`, `mutate`, `crossover`, `distance`.

scalar, categorical, vector, expression, struct, array, graph, topology, temporal, regulatory, field, symbolic, quantum, gematria, resonance, dimensional, sovereignty

## 26 Domain Engines

character, sprite, animation, music, ecosystem, fullgame, architecture, fashion, cuisine, language, ritual, narrative, vehicle, weapon, terrain, weather, economy, politics, philosophy, mathematics, chemistry, biology, astronomy, technology, art, poetry

## Testing

```bash
# Run full test suite (359 tests across 13 files)
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Smoke test (requires running server)
node scripts/smoke-test.mjs http://localhost:3000
```

Test coverage: kernel RNG (15), 17 gene types (90), 27 engines (9), composition/pathfinding (14), native agent (74), JWT auth lifecycle (26), Zod validation schemas (43), security middleware + OpenAPI (45), data layer CRUD/pagination/audit (20), LRU cache (13), database migrations (10).

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`):
1. **Lint** — TypeScript type checking
2. **Test** — Vitest suite
3. **Build** — Vite production build
4. **Docker** — Build and push to GHCR
5. **Deploy Staging** — Auto-deploy on push to main
6. **Deploy Production** — Manual approval gate

## Project Structure

```
server.ts                    # Express + WebSocket server (unified)
src/
  lib/
    kernel/
      rng.ts                 # xoshiro256** deterministic PRNG
      gene_system.ts         # 17 gene types + 4 operators
      engines.ts             # 26 domain growth engines
      composition.ts         # 9 functor bridges + BFS pathfinding
    agent/index.ts           # Native GSPL agent (zero AI dependency)
    auth/index.ts            # JWT + PBKDF2 + RBAC + token refresh/revoke
    data/                    # Data access layer (JsonStore + MongoStore)
    validation/              # Zod v4 schemas for all endpoints
    security/                # CORS + security headers (zero-dependency)
    openapi/                 # OpenAPI 3.1 spec + Swagger UI
    sovereignty/
      index.ts               # ECDSA P-256 signing
      onchain.ts             # ERC-721 NFT minting (Sepolia)
    qft/                     # Quantum field theory solvers
    pipeline/                # Asset production pipeline
    gspl/                    # GSPL language tools
  pages/
    LandingPage.jsx          # Marketing page
    AuthPage.jsx             # Login/Register
    StudioPage.jsx           # Creation Studio
  components/studio/
    AgentPanel.jsx           # GSPL Agent chat (WebSocket + HTTP)
    MintPanel.jsx            # On-chain NFT minting
    GeneEditor.jsx           # Gene manipulation
    PreviewViewport.jsx      # Three.js 3D preview
    CompositionPanel.jsx     # Cross-domain composition
    GSPLEditor.jsx           # GSPL code editor
    ...
  services/
    api.jsx                  # Axios client + JWT interceptors
    wsAgent.jsx              # WebSocket agent client
  stores/
    seedStore.jsx            # Zustand seed state
    authStore.jsx            # Zustand auth state
tests/
  kernel/
    rng.test.ts              # 15 tests — determinism, distribution, forking
    gene_system.test.ts      # 90 tests — all 17 types, all operators
    engines.test.ts          # 9 tests — 27 engines, growth, determinism
    composition.test.ts      # 14 tests — graph, pathfinding, composition
  agent/
    agent.test.ts            # 20 tests — intents, creation, GSPL, evolution
    agent-v2.test.ts         # 54 tests — multi-step reasoning, 3-tier inference
  api/
    validation.test.ts       # 43 tests — all Zod schemas, edge cases
    security.test.ts         # 45 tests — CORS, headers, OpenAPI spec
    auth-lifecycle.test.ts   # 17 tests — JWT refresh, revoke, RBAC
    data-layer.test.ts       # 20 tests — CRUD, pagination, persistence
  auth.test.ts               # 9 tests — register, login, rate limiting
Dockerfile                   # Multi-stage Node.js build
docker-compose.yml           # App + MongoDB + Redis + Nginx
nginx.conf                   # Reverse proxy + security headers
.github/workflows/ci.yml     # 6-stage CI/CD pipeline
```

## Environment Variables

```bash
# Required (fatal in production if missing)
JWT_SECRET=your-secret-key-min-32-chars  # openssl rand -hex 32

# Optional — Database & Cache
MONGO_URI=mongodb://localhost:27017/paradigm  # Omit for JSON file storage
REDIS_URL=redis://localhost:6379

# Optional — Server
PORT=3000
NODE_ENV=development         # development | production
LOG_LEVEL=INFO               # DEBUG, INFO, WARN, ERROR
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Optional — Intelligence (non-critical)
GEMINI_API_KEY=              # Only for embedding generation

# Optional — On-chain minting
SEPOLIA_RPC_URL=

# Docker Compose overrides
APP_PORT=3000
NGINX_PORT=80
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
```

## License

GSPL Open Specification License — Genetically Organized Evolution
