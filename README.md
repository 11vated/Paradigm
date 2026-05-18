# Paradigm Absolute

Paradigm Absolute is a deterministic synthetic evolution operating system.

In plain terms: Paradigm treats every digital artifact as a seed. A seed is a genetic, reproducible blueprint that can be grown, mutated, bred, composed with other seeds, signed, exported, and replayed later with bit-identical output.

```text
same seed + same deterministic RNG + same code = reproducible artifact
```

That guarantee is the center of the system. It turns generative media into something closer to software, biology, and version control: reproducible, inspectable, evolvable, and attributable.

## Current State

Verified locally on May 18, 2026:

| Area | Status |
|---|---:|
| TypeScript | 0 errors |
| Production build | passing, no warnings |
| Test suite | 995 passing tests across 59 files |
| Source surface | ~554 source files under `src` |
| Source size | ~286k source lines under `src` |
| TypeScript generators | 196 generator files |
| Canonical domains | 27 |
| Industrial/domain generators | 100+ |
| Runtime stack | TypeScript, React 19, Express, Three.js, WebGPU, Solidity |

Validation commands:

```bash
npm run typecheck
npm run build
npm run test
```

## What We Have

Paradigm currently contains a working end-to-end platform skeleton for deterministic synthetic creation:

- A deterministic kernel based on `xoshiro256**`
- A universal seed and gene system
- A GSPL language layer with lexer, parser, interpreter, bytecode, GPU compiler hooks, and LSP scaffolding
- A large domain generator library covering creative, scientific, industrial, and simulation domains
- Evolution algorithms including GA, CMA-ES, novelty search, MAP-Elites-style quality diversity, AURORA, DQD, NSLC, and POET-oriented modules
- Cross-domain composition and functor bridges
- A React Studio for exploring, growing, editing, and previewing seeds
- Express API routes for seed lifecycle, generation, auth, export, lineage, agent actions, DAO/governance, and VCS-style operations
- Cryptographic sovereignty primitives: canonicalization, signing, per-gene provenance, C2PA-oriented metadata, and `.gseed` binary export
- Smart contracts for PARA token, SeedNFT, marketplace, governor, and timelock flows
- Test coverage across determinism, kernel behavior, GSPL, API, auth, sovereignty, VCS, visual regression, and integration paths

## Architecture

```text
Layer 1   Deterministic RNG
          xoshiro256**, seeded streams, reproducible random choices

Layer 2   Seed and Gene System
          Universal seeds, gene values, gene type registry, mutation/crossover/distance

Layer 3   GSPL
          Lexer, parser, interpreter, bytecode, GPU compiler hooks, language tooling

Layer 4   Domain Engines
          27 canonical domains plus 100+ broader generators

Layer 5   Evolution and Composition
          GA, CMA-ES, quality diversity, novelty, open-ended systems, functor bridges

Layer 6   Sovereignty and Provenance
          Canonicalization, signatures, per-gene ownership, C2PA, .gseed packages

Layer 7   Studio and API
          React 19 Studio, Express backend, artifact rendering, agent workflows

Layer 8   Compute and Export
          WebGPU, workers, GLTF, WAV, SVG, JSON, .gseed, contracts
```

## Core Concepts

### Seeds

A seed is the canonical unit of creation. It contains identity, domain, lineage, metadata, and genes.

Seeds can be:

- grown into artifacts
- mutated
- crossed with other seeds
- evolved in populations
- composed across domains
- signed and verified
- exported and replayed

### Genes

Genes are typed values that drive artifact generation. A music seed might contain tempo, key, scale, timbre, and melody genes. A geometry seed might contain primitive, scale, material, and SDF parameters.

The system includes a broad gene type registry with primitives, containers, spatial types, temporal types, symbolic types, learned types, and sovereignty-aware metadata.

### Domains

Canonical domains include:

```text
character, sprite, music, visual2d, procedural, fullgame, animation,
geometry3d, narrative, ui, physics, audio, ecosystem, game, alife,
shader, particle, typography, architecture, vehicle, furniture,
fashion, robotics, circuit, food, choreography, agent
```

The repository also contains many broader domain generators, including aerospace, cybersecurity, genomics, nanotechnology, finance, healthcare, logistics, smart grid, robotics-industrial, quantum computing, synthetic biology, and more.

### Determinism

All randomness must flow through the deterministic RNG. Generator code should not use `Math.random()` for seeded behavior.

This is the platform's most important technical invariant.

## Repository Map

```text
src/lib/kernel/             Core kernel, RNG, GSPL, engine routing, provenance
src/lib/kernel/generators/  Domain generators and artifact emitters
src/lib/kernel/pipeline/    Seed -> generator -> artifact pipeline
src/lib/evolution/          Evolution and quality-diversity algorithms
src/lib/sovereignty/        Canonicalization, signatures, ownership checks
src/lib/asset_pipeline/     Asset synthesis and export utilities
src/components/studio/      React Studio components and viewports
src/pages/                  App pages
src/services/               Client API services
server.ts                   Express backend and API entrypoint
contracts/                  Solidity contracts
tests/                      Unit, integration, determinism, API, visual, e2e tests
data/                       Seeds, specs, commons libraries, artifacts
```

## Quick Start

```bash
git clone https://github.com/11vated/Paradigm.git
cd Paradigm
npm install
npm run dev
```

The development server runs through `tsx server.ts`.

Useful local URLs:

```text
http://localhost:3000
http://localhost:3000/health
http://localhost:3000/api-docs/ui
```

## Verification

Run the full local gate:

```bash
npm run typecheck
npm run build
npm run test
```

Focused commands:

```bash
npx vitest run tests/kernel
npx vitest run tests/gspl
npx vitest run tests/determinism
npx vitest run tests/gseed-format.test.ts
npx playwright test tests/visual/regressions.spec.ts
```

## Development Notes

- Preserve deterministic behavior. Do not introduce unseeded randomness into generators or seed operations.
- Keep seed and gene serialization backward compatible where possible.
- Prefer domain-local validation for generator-specific gene shapes.
- Keep the universal pipeline seed type flexible; genes are intentionally heterogeneous.
- For browser-facing code, avoid static imports of Node-only modules such as `fs`, `crypto`, `zlib`, or stream-based writers.
- Use the existing generator and pipeline patterns before adding new abstractions.

## Recent Stabilization

The current stabilization pass completed the TypeScript and build gates and fixed the remaining full-suite issue:

- Resolved generator type mismatches caused by `unknown` gene values at the pipeline boundary
- Added literal-union guards in selected generators
- Fixed CMA-ES covariance matrix typing
- Fixed Geometry3D V4 parameter typing and RNG call typo
- Fixed Music V4 chord progression shape handling
- Made `.gseed` compression browser-safe while preserving Node compression behavior
- Removed build warnings from conflicting dynamic/static imports
- Replaced fragile stream-based WAV writing in simple audio generators with deterministic synchronous WAV encoding
- Verified `npm run typecheck`, `npm run build`, and `npm run test`

## Smart Contracts

Contracts live in `contracts/`:

```text
ParaToken.sol
SeedNFT.sol
ParadigmMarketplace.sol
ParadigmGovernor.sol
ParadigmTimelock.sol
```

Hardhat scripts and artifacts are included for local deployment and testing.

## Environment

See `.env.example` for available configuration.

Common production variables:

```text
DATABASE_URL
REDIS_URL
JWT_SECRET
PARA_TOKEN_ADDRESS
SEED_NFT_ADDRESS
```

## License

MIT

## Links

- GitHub: https://github.com/11vated/Paradigm
- Local health: http://localhost:3000/health
- Local API docs: http://localhost:3000/api-docs/ui
