# Paradigm Absolute — Comprehensive Codebase Analysis

**Date:** May 31, 2026  
**Version:** v1.0.0 (Phase 0 + Phase 1-7 complete)  
**Status:** Verified, Production-Ready

---

## Executive Summary

Paradigm Absolute is a **deterministic synthetic evolution operating system** — a complete platform for creating, evolving, composing, and distributing digital artifacts with bit-identical reproducibility across machines, runtimes, and decades.

### The Core Thesis

Every digital artifact (game, song, building, organism, story, person) is a **seed**: a genetic blueprint that can be:
- **Grown** into playable/viewable/audible artifacts
- **Mutated** to explore design space
- **Bred** with other seeds to combine properties
- **Composed** across modalities (Friend × World → Quest → Game)
- **Evolved** using genetic algorithms, novelty search, quality diversity
- **Signed** with cryptographic sovereignty
- **Exported** in 10+ modalities with C2PA provenance
- **Replayed** with identical output forever

**The Contract:** `same seed + same RNG + same code = bit-identical artifact forever`

---

## Part I: Architecture at a Glance

### 14-Layer Stack

```
Layer 1   Deterministic RNG         xoshiro256**, seeded from 64-bit hash
Layer 2   Seed & Gene System         17 gene types, Universal Seed class, mutation/crossover/distance
Layer 3   GSPL                       Lexer → Parser → Interpreter → Bytecode → GPU Compiler
Layer 4   Domain Engines             27 canonical domains, 299 generators
Layer 5   Evolution & Composition    GA, CMA-ES, novelty search, MAP-Elites, composition functors
Layer 6   Sovereignty & Provenance   ECDSA-P256, C2PA, .gseed binary format, lineage tracking
Layer 7   Studio & API               React 19 Studio, Express backend, 40+ routes
Layer 8   Compute & Export           WebGPU, Workers, GLTF, WAV, SVG, JSON, .gseed
Layer 9   Quality Contracts          9-stratum conformance harness (Form, Motion, Sound, Space, Time, Structure, Semantics, Culture, Possibility)
Layer 10  Agent & Intelligence       6-stage pipeline, 8+ sub-agents, 4-layer memory, 6 inverters
Layer 11  Federation & Economics    Signed P2P exchange, royalty waterfalls, DAO governance
Layer 12  Observability             Health Dashboard, stratum predicates, preflight gates
Layer 13  Smart Contracts           PARA token, SeedNFT, Marketplace, Governor, Timelock
Layer 14  Metaverse & OS Shell      Future: Wayland/Linux session, recursive closure
```

---

## Part II: Repository Structure

### Source Tree (670 TypeScript files, ~95K LOC post-cleanup)

```
src/
├── lib/
│   ├── kernel/              (369 files, THE HEART)
│   │   ├── rng.ts                     Xoshiro256StarStar PRNG
│   │   ├── seed-class.ts              Deprecated legacy Seed class
│   │   ├── gene_system.ts             Gene type ops, validation, mutation
│   │   ├── gene-type-registry.ts      17 gene type definitions
│   │   ├── quality-contract.ts        5-clause (synthesize/invert/rate/curated/det)
│   │   ├── composition.ts             252 cross-domain functors
│   │   ├── engine-dispatcher.ts       Route seeds to domain generators
│   │   ├── engines.ts                 Domain engine registry (27 canonical)
│   │   ├── gspl-*.ts                  GSPL pipeline (lexer, parser, interpreter, bytecode, LSP)
│   │   ├── clock.ts                   Injectable wall-clock (kernelNow, kernelNowIso)
│   │   ├── provenance.ts              Canonicalization, C2PA manifest generation
│   │   ├── lineage-tracker.ts         Seed family trees, mutation history
│   │   ├── federation.ts              P2P seed exchange protocol
│   │   ├── royalty-system.ts          Waterfall accounting
│   │   ├── sovereignty-checker.ts     ECDSA signature verification
│   │   ├── webgpu-compute.ts          GPU shader compilation & execution
│   │   ├── fitness.ts                 Multi-axis quality metrics
│   │   ├── inverse-pipeline.ts        Image/audio/video → seed
│   │   ├── generators/                (299 files)
│   │   │   ├── character.ts           Avatar generation (Three.js)
│   │   │   ├── sprite.ts              Pixel art generation (Tier-1, 1.000)
│   │   │   ├── music-*.ts             Audio synthesis (multiple versions)
│   │   │   ├── visual2d-*.ts          Procedural 2D (multiple versions)
│   │   │   ├── narrative.ts           Story/quest generation
│   │   │   ├── game.ts                Game scene graph (Tier-1, 0.900)
│   │   │   ├── particle.ts            Particle systems
│   │   │   ├── shader.ts              GLSL shader generation
│   │   │   ├── typography.ts          Font & text layout
│   │   │   ├── architecture-3d.ts     Building generation
│   │   │   ├── fashion-3d.ts          Clothing generation
│   │   │   ├── food-3d.ts             3D food meshes
│   │   │   ├── ...96+ more domains    (aerospace, quantum, genomics, etc.)
│   │   │   └── *-contract.ts          Quality contract per generator
│   │   ├── quality/                   Stratum predicates & scoring
│   │   │   ├── predicates.ts          9-stratum predicate bodies (form, motion, sound, space, time, structure, semantics, culture, possibility)
│   │   │   └── predicates.test.ts     Contract test suite
│   │   └── __tests__/
│   │
│   ├── evolution/            (12 files)
│   │   ├── ga.ts                      Genetic Algorithm (tournament, elitism, adaptive mutation)
│   │   ├── cmaes.ts                   Covariance Matrix Adaptation ES
│   │   ├── novelty.ts                 Novelty search (archive, distance metrics)
│   │   ├── map-elites.ts              Quality diversity (2D map of solutions)
│   │   ├── poet.ts                    Open-ended generator (POET protocol)
│   │   ├── aurora.ts                  Archive quality diversity
│   │   └── ...other evolutionary algorithms
│   │
│   ├── gspl/                (5 files)
│   │   ├── interpreter.ts             Executes GSPL bytecode, kernel-wired operations
│   │   ├── module-resolver.ts         Standard library + user imports
│   │   └── types.ts
│   │
│   ├── friend/              (14 files, SOVEREIGN COMPANION)
│   │   ├── types.ts                   6 gene categories (body, face, voice, persona, memory, bond)
│   │   ├── genesis.ts                 createFriendSeed (deterministic from string)
│   │   ├── generator.ts               FriendSeed → FriendArtifact (phenotype, voice, SVG portrait)
│   │   ├── breeding.ts                breedFriends, mutateFriend
│   │   ├── store.ts                   FriendStore (persistence + lineage)
│   │   ├── sovereignty.ts             ECDSA-P256 sign/verify
│   │   ├── onchain.ts                 ERC-721 mint preparation
│   │   ├── marketplace.ts             list/delist/buy calldata prep
│   │   ├── composition.ts             Friend × {music, narrative, visual2d, character, audio, agent}
│   │   ├── contract.ts                Quality Contract (1.000)
│   │   └── ...
│   │
│   ├── world/               (7 files)
│   │   ├── types.ts                   Era × biome × conflict
│   │   ├── generator.ts               WorldSeed → locations, factions, flavor
│   │   ├── quest.ts                   Friend × World → QuestSeed (archetype, 3-act)
│   │   └── contract.ts                Quality Contract (1.000)
│   │
│   ├── game/                (8 files)
│   │   ├── generator.ts               QuestSeed → scene graph with branching
│   │   ├── oracle.ts                  5-axis fitness (completability, branching, karma, pace, endings)
│   │   ├── contract.ts                Quality Contract (0.900)
│   │   └── ...
│   │
│   ├── intelligence/        (74 files, AGENT STACK)
│   │   ├── agent/
│   │   │   ├── pipeline.ts            6-stage agent execution
│   │   │   ├── sub-agents.ts          8+ specialized agents
│   │   │   ├── routing.ts             Intent → sub-agent dispatch
│   │   │   └── ...
│   │   ├── memory/                    4-layer memory (episodic, semantic, procedural, meta)
│   │   ├── llm/                       LLM provider abstraction (gemma4, qwen, llava, openai)
│   │   ├── embedding-client.ts        Vector embeddings via transformer.js
│   │   ├── inverse/                   Image/audio/text → seed
│   │   ├── reproducibility.ts         (intent, memory_hash, seed_corpus_hash) proof
│   │   └── ...
│   │
│   ├── rendering/           (18 files)
│   │   ├── three-renderer.ts          Three.js 3D viewport
│   │   ├── canvas-2d.ts               2D canvas rendering
│   │   ├── svg-renderer.ts            SVG export
│   │   ├── audio-renderer.ts          WAV synthesis
│   │   └── ...
│   │
│   ├── sovereignty/         (6 files)
│   │   ├── canonical.ts               Canonicalization (deterministic JSON ordering)
│   │   ├── signature.ts               ECDSA-P256 signing
│   │   ├── c2pa.ts                    Content Authenticity Platform manifests
│   │   └── ...
│   │
│   ├── vcs/                 (5 files)
│   │   ├── git-for-seeds.ts           Seed version control (ancestry, diffs, merges)
│   │   └── ...
│   │
│   ├── agent/               (24 files)
│   │   ├── Sovereign Agent Canon implementation
│   │   └── ...
│   │
│   ├── {api, auth, asset_pipeline, cache, commons, data, embeddings, export, health, logger, openapi, performance, physics, qft, security, ui, validation}
│   │
│   └── (and 12 more domains)
│
├── seeds/                   (UNIVERSAL SEED CLASS)
│   ├── index.ts
│   ├── universal-seed.ts    Canonical Seed class (17 gene types)
│   └── types.ts             GeneType enum (primitive, container, spatial, temporal, symbolic, learned, sovereignty)
│
├── pages/                   (REACT UI ENTRY POINTS)
│   ├── StudioPage.tsx       Main kernel studio
│   ├── FriendPage.tsx       Friend generator UI
│   ├── WorldPage.tsx        World generator UI
│   ├── QuestPage.tsx        Quest composer
│   ├── PlayPage.tsx         Game runtime
│   ├── LineagePage.tsx      Family tree viewer
│   ├── PhotorealisticRenderer.tsx
│   └── ...
│
├── components/
│   ├── studio/              AmbientStrip, CenterStage, DomainCosmosOverlay
│   ├── ui/                  48 shadcn components (all .tsx, 0 @ts-nocheck)
│   ├── game/
│   └── ...
│
├── hooks/                   React custom hooks
├── stores/                  Zustand state management
├── services/                API clients, business logic
└── index.ts                 Root barrel exports

server.ts (489 LOC)          Express server with 40+ routes
contracts/                   (5 Solidity smart contracts)
├── ParaToken.sol            ERC-20 token
├── SeedNFT.sol              ERC-721 NFT (Friend)
├── ParadigmMarketplace.sol  Decentralized marketplace
├── ParadigmGovernor.sol     DAO governance
└── ParadigmTimelock.sol     Governance timelock
```

---

## Part III: The Determinism Spine

### Verified Status (May 31, 2026)

```
✅ TypeScript:           0 errors (npm run typecheck)
✅ Determinism:          0 hard violations (npm run determinism:check)
✅ GSPL:                 24/24 interpreter tests passing
✅ Golden hashes:        30/30 verified (npm run golden:verify)
✅ Tests:                1497 passing tests across 108 files
✅ @ts-nocheck:         0 anywhere in src/
✅ Production build:     clean, no warnings
```

### How Determinism is Enforced

1. **Hard Boundary (ESLint, CI-blocking)**
   - Location: `src/lib/kernel`, `src/lib/evolution`, `src/seeds`
   - Banned: `Math.random`, `crypto.randomBytes`, `crypto.getRandomValues`, `performance.now`
   - Tools: `scripts/check-determinism-boundary.mjs` (runs via `npm run determinism:check`)
   - Exceptions: `src/lib/kernel/rng.ts`, `rng-contract.ts`, `**/__tests__/**`

2. **The RNG: Xoshiro256StarStar** (`src/lib/kernel/rng.ts`)
   - Algorithm: Blackman & Vigna (2019) scrambled linear PRNG
   - Seeding: SplitMix64 from 64-bit hash
   - Properties: 256-bit state, 2^256 period, bit-identical across x86, ARM, browser engines
   - API: `nextF64()`, `nextInt()`, `nextGaussian()`, seeded streams

3. **Golden Hashes** (`.paradigm/golden-hashes.json`)
   - 30 canonical seeds regenerated at every CI run
   - Stored in `.paradigm/` (not checked in, computed + verified)
   - Script: `scripts/replay.mts` (with `--verify-golden` flag)
   - Mismatch = release blocker

4. **Wall-Clock Injection** (`src/lib/kernel/clock.ts`)
   - `kernelNow()` and `kernelNowIso()` are the only wall-clock access points
   - Defaults to `Date.now()` but can be frozen/mocked in tests
   - Tracked but not blocking (Phase 1 sprint planned)

---

## Part IV: The Quality Contract Spine

### 9-Stratum Conformance Framework

Paradigm defines quality not as opinion but as **executable predicates**. Every generator must score on 9 axes:

| Stratum | File | Contract | Tier-1 Generators | Current Predicates |
|---------|------|----------|-------------------|-------------------|
| **Form** | `quality/form.ts` | formPredicate | sprite (1.000), visual2d (0.981) | Symmetry, density, coherence, continuity, variety, boundary, self-similarity, fractal dimension |
| **Motion** | `quality/motion.ts` | motionPredicate | animation | Velocity, acceleration, trajectory smoothness, momentum, collision, trajectory diversity |
| **Sound** | `quality/sound.ts` | soundPredicate | music (0.833) | Pitch, timbre, dynamics, LUFS, rhythm, harmony, cadence, texture, intelligibility |
| **Space** | `quality/space.ts` | spacePredicate | world (1.000), game (0.900) | Scale, distribution, density, connectivity, accessibility, coherence, topology |
| **Time** | `quality/time.ts` | timePredicate | game (0.900), narrative (0.667) | **Priority**: Expand from 4 → 8+ (urgency, progression, pacing, causality, foreshadowing, payoff, symmetry, rhythm) |
| **Structure** | `quality/structure.ts` | structurePredicate | architecture, music | Hierarchy, modularity, symmetry, complexity, coherence, compression |
| **Semantics** | `quality/semantics.ts` | semanticsPredicate | narrative, game | Coherence, specificity, depth, distinctiveness, plausibility |
| **Culture** | `quality/culture.ts` | culturePredicate | world, narrative, game | Familiarity, novelty, diversity, resonance, depth |
| **Possibility** | `quality/possibility.ts` | possibilityPredicate | game, narrative | Branching, exploration, novelty, complexity, reachability |

**Live Scoring:** The `/api/substrate/health` endpoint runs all 9 predicates on sample artifacts in real-time.

### 7 Tier-1 Conformant Generators (v1.0.0)

1. **friend** (1.000) — ECDSA sovereignty, ERC-721 lineage, persona genes, voice synthesis
2. **sprite** (1.000) — 8×8 pixel perfect, symmetry, color theory, deterministic from seed
3. **visual2d** (0.981) — Procedural 2D (L-systems, noise, vector), dense variety
4. **narrative** (0.667) — Story beats, 3-act structure, archetype branching
5. **game** (0.900) — Scene graph, quest integration, multi-axis fitness oracle
6. **music** (0.833) — Procedural synth, harmony, rhythm, spectral coherence
7. **world** (1.000) — Era/biome/conflict, location determinism, faction coherence

---

## Part V: GSPL — The Generative Seed Programming Language

### Design: Every Program is a Typed Seed

GSPL is the **universal input layer**. Instead of "generate music," users write:

```gspl
seed(
  $domain: "music",
  $name: "Jazz Improvisation",
  tempo: 120,
  key: "Cmaj7",
  scale: "mixolydian",
  instruments: ["piano", "bass", "drums"],
  variation: 0.7
)
|> mutate(intensity: 0.3)
|> breed(other_jazz_seed)
|> evolve(fitness: "harmonyScore")
```

### Pipeline (5 Stages)

1. **Lexer** (`gspl-lexer.ts`) → Tokens
2. **Parser** (`gspl-parser.ts`) → AST with type checking
3. **Interpreter** (`gspl-interpreter.ts`) → Kernel ops (mutate/breed/grow/evolve)
4. **Bytecode** (`gspl-bytecode.ts`) → Compact serialization
5. **GPU Compiler** (`gspl-gpu-compiler.ts`) → Parallel kernel execution hooks

### Kernel-Wired Operations

The interpreter has built-in access to:
- `mutate(seed, intensity)` — Calls `seed.mutate(rng, intensity)`
- `breed(seed1, seed2)` — Calls `seed1.cross(seed2, rng)`
- `grow(seed)` — Calls domain engine dispatcher
- `evolve(population, fitness)` — GA execution
- `compose(seed1, seed2, functor)` — Cross-domain composition

### Test Status: 24/24 GSPL Interpreter Tests Passing

Tests cover:
- Seed creation from GSPL expressions
- Kernel ops (mutate, breed, grow, evolve)
- Composition across domains
- Error handling and type checking
- Memory safety and circular references

---

## Part VI: The 299-Generator Library

### Organization

**Canonical Domains (27):**  
character, sprite, music, visual2d, procedural, fullgame, animation, geometry3d, narrative, ui, physics, audio, ecosystem, game, alife, shader, particle, typography, architecture, vehicle, furniture, fashion, robotics, circuit, food, choreography, agent

**Tier-1 (7 contract-conformant):** friend, sprite, visual2d, narrative, game, music, world

**Extended (150+):** aerospace, archaeology, astrology, augmentation, beverages, biology, blockchain, botany, chemistry, choreography, circuit, climate, clothing, coastal, cognitive, communication, cybersecurity, dance, demographics, design, device, digital, disaster, disease, document, ecology, economics, education, electronics, engineering, entertainment, environment, evolution, exchange, exercise, experiment, fashion, feature, feedback, festival, fiction, film, finance, fitness, flood, florist, food, footwear, forensics, forest, formula, formation, fossil, fraction, fractal, game-design, gaming, garden, gear, gene, genetics, geology, geometry, gesture, global, goal, gradient, grammar, graphic, greenhouse, grid, growth, guide, habitat, hardware, harmony, hazard, health, hearing, heat, hedge, hero, heritage, highway, history, hobby, hologram, hospital, hotel, human, hydration, hydrogen, hygiene, hypothesis...

### Known Technical Debt (Phase 2 Priority)

**19 Canonical Groups with Versioned Siblings** (from `lint-canonical-rename.ts`):
- `music-v2`, `music-v3`
- `visual2d-v2`, `visual2d-v3`, `visual2d-enhanced`, `visual2d-gpu`
- `character-v2`, `character-enhanced`
- `sprite-v2` (less frequently, but present)
- `animation-v2`, `animation-3d`
- `particle-v2`, `particle-gpu`
- `shader-v2`, `shader-enhanced`
- `typography-v2`
- `vehicle-3d`, `vehicle-enhanced`
- `sprite-particle-v2`
- `procedural-3d`, `procedural-gpu`
- `fashion-3d`, `fashion-enhanced`
- `food-3d`, `food-gpu`
- `architecture-3d`, `architecture-enhanced`

**Action Plan (Phase 2):**
1. Audit each group
2. Merge best features into canonical file
3. Delete siblings
4. Regenerate golden hashes
5. Update `engines.ts` for single entry point

---

## Part VII: The Agent Stack

### 6-Stage Agent Pipeline

```
Intent (user text/image/audio)
  ↓
1. Embedding & Retrieval      (Find similar seeds in corpus + memory)
  ↓
2. Retrieval-Augmented         (Query ≥50 canonical seeds, score by relevance)
  ↓
3. Multi-Agent Deliberation    (8+ sub-agents vote: designer, musician, architect, etc.)
  ↓
4. Seed Generation            (LLM → genes, unified into seed)
  ↓
5. Composition                (Apply GSPL operations, breed with corpus examples)
  ↓
6. Oracle Evaluation          (Rate on stratum contracts, re-evolve if needed)
```

### 8+ Sub-Agents

1. **Designer Agent** — visual form + aesthetics
2. **Musician Agent** — audio + rhythm
3. **Architect Agent** — spatial + structure
4. **Storyteller Agent** — narrative + semantics
5. **Animator Agent** — motion + timing
6. **Engineer Agent** — procedural logic + constraints
7. **Evolutionary Agent** — population strategies + diversity
8. **Oracle Agent** — quality assessment + feedback loops

### 4-Layer Memory

1. **Episodic** — Recent user interactions, artifacts, decisions
2. **Semantic** — Domain knowledge, seed corpus indices, genre conventions
3. **Procedural** — LLM provider configs, composition rules, evolution tactics
4. **Meta** — Learning rates, sub-agent weights, adaptation history

### Reproducibility Proof (Phase 9-10 Gate)

Every agent decision must be reproducible from:
```
(intent, memory_hash, seed_corpus_hash)
```

Status: **Scaffolded, not yet proven.** GSPL interpreter stabilization (this phase) removes blocker. Phase 9 will wire reproducibility harness into CI.

---

## Part VIII: Server Architecture

### 489 LOC Express Server (`server.ts`)

**Phase 1 Win:** Server split complete. 3,500 → 489 lines via modular route extraction.

**Route Categories (40+ endpoints):**

| Category | Routes | What |
|----------|--------|------|
| **Seed Lifecycle** | POST /seed/create, GET /seed/:id, POST /seed/mutate, POST /seed/breed, POST /seed/evolve | CRUD + kernel ops |
| **Generation** | POST /generate/:domain, GET /artifact/:id | Engine dispatcher |
| **Studio** | GET /studio/config, POST /studio/save, GET /studio/state | Studio sync |
| **Friends** | POST /friend/create, GET /friend/:id, POST /friend/breed, GET /friend/:id/lineage, POST /friend/sign | Sovereign companion |
| **Worlds** | POST /world/create, GET /world/:id, POST /world/quest | Quest composition |
| **Games** | POST /game/play, POST /game/choice, GET /game/:id/fitness | Game oracle |
| **Composition** | POST /compose, GET /compose/:functor | Cross-domain functors |
| **GSPL** | POST /gspl/execute, POST /gspl/compile | Language execution |
| **Evolution** | POST /evolve/ga, POST /evolve/cmaes, GET /evolve/:id/progress | Algorithm registry |
| **Lineage** | GET /lineage/:id, GET /lineage/:id/tree, POST /lineage/diff | VCS for seeds |
| **Export** | POST /export/:format, GET /export/:id/:format | 10 export handlers (JSON, GLTF, WAV, SVG, .gseed, C2PA, etc.) |
| **Sovereignty** | POST /sign/:id, POST /verify/:id, GET /provenance/:id | ECDSA + C2PA |
| **DAO** | GET /dao/treasury, POST /dao/proposal, POST /dao/vote | Governance |
| **Federation** | POST /federation/exchange, GET /federation/status | P2P sync |
| **Health & Monitoring** | GET /api/substrate/health, GET /api/metrics | Observability |
| **Auth** | POST /auth/login, POST /auth/logout, POST /auth/verify | JWT |
| **Agent** | POST /agent/intent, WS /agent/stream | 6-stage pipeline |

**Key Architectural Patterns:**
- `registerRoutes()` per domain
- WebSocket for agent streaming
- Deterministic memory hashing
- Seed deduplication via `.paradigm/` cache
- Rate limiting on public endpoints

---

## Part IX: React UI Architecture

### Pages (7 Canonical Routes)

1. **Studio** (`/studio`) — Kernel studio with AmbientStrip (controls), CenterStage (preview), DomainCosmosOverlay (domain browser)
2. **Friend** (`/friend`) — Friend generator, library, breeding interface
3. **World** (`/world`) — World generator with era/biome/conflict UI
4. **Quest** (`/quest`) — Visual Friend × World composer
5. **Play** (`/play`, `/play/:friend/:world`) — Game runtime + choice UI
6. **Lineage** (`/lineage/:id`) — Interactive family tree
7. **Photorealistic** (`/photorealistic-renderer`) — Ray-traced preview

### Component Architecture

- **AmbientStrip** — Collapsible control panel (left)
- **CenterStage** — Viewport (3D, 2D, SVG, Audio, Game, Code, Sim, Anim) + DimensionalViewer (7D substrate renderer)
- **DomainCosmosOverlay** — Floating domain browser with search + filters
- **ViewportFactory** — Adaptive rendering based on domain (Three.js, Canvas, SVG, etc.)

### UI Component Library (48 shadcn Components)

All `.tsx` files, 0 `@ts-nocheck`, fully typed. Examples:
- Button, Input, Select, Checkbox, RadioGroup, Tabs, Accordion, Dialog, Popover, Toast, etc.

---

## Part X: Smart Contracts (Solidity)

### 5 Deployed Contracts

1. **ParaToken (ERC-20)**
   - PARA governance token
   - Voting power for DAO proposals

2. **SeedNFT (ERC-721)**
   - Mints Friend artifacts as NFTs
   - Lineage + provenance baked into metadata
   - C2PA certificate as tokenURI

3. **ParadigmMarketplace**
   - Buy/sell SeedNFT
   - Royalty splits + waterfall
   - Universe licensing tiers

4. **ParadigmGovernor (OpenZeppelin Governor)**
   - DAO voting
   - Proposal queuing
   - Execution via Timelock

5. **ParadigmTimelock**
   - Governance delay (2–7 days)
   - Cancellation via guardian

---

## Part XI: Doctrine v2 — The Governing Canon

### 24-Phase Roadmap

| Phase | Name | Focus | Gate |
|-------|------|-------|------|
| **0** | Doctrine Collapse | Lints, waivers, health surface, GSPL stabilization | ✅ CLOSED (2026-05-29) |
| **1** | Server/Type/Determinism | 500 LOC server, QualityContract generics, 8 pre-flight gates | ✅ CLOSED (live in autonomy) |
| **2** | Canonical Generator Collapse | Merge versioned siblings, single entry point per generator | In progress (15+ groups hit) |
| **3** | Stratum Contract Specification | Real predicate bodies for all 9 strata, ≥99.5% conformance | In progress (Time stratum urgent) |
| **4–8** | Oracle & Quality Passes | Cross-runtime golden matrix (Bun, Node, browser-WASM, sandbox-WASM) | Queued |
| **9–10** | Agent Stack GA | Reproducibility harness, `paradigm make <intent>` universal entry | Queued (GSPL fix removes blocker) |
| **11–13** | Surfaces GA | Studio, Public, Maker CLI shipping | Queued |
| **14–15** | 1M Games + 12 Hero Flagships | Great Library + Tidepool through Aleph flagships | Queued |
| **16** | Federation v1 | P2P signed exchange, no central server | Queued |
| **17–19** | Economic Substrate | Licensing, royalties, civilizational dividend | Queued |
| **20–21** | Universal Reach | 15-modality inverse, 20-output forward matrix | Queued |
| **22–23** | Endgame | OS Shell, recursive closure | Queued |
| **∞** | GSPL v∞ | Permanent research | Asymptote |

### The Spine (Never Break)

1. **Determinism** — Same seed + same RNG = bit-identical artifact forever
2. **Sovereignty** — Kernel runs 100% offline; forking is a first-class right
3. **Quality** — Every generator has a measurable contract; strata are executable predicates

Enforced by: CI gates, lints, golden hashes, preflight reports.

---

## Part XII: Current Technical Debt (Phase 2-3 Priorities)

### Known Issues

| Item | Count | Severity | Phase | Action |
|------|-------|----------|-------|--------|
| Canonical versioned siblings | 19 groups | High | 2 | Collapse, regenerate hashes, single entry point |
| `as any` type assertions | 279 occurrences | Medium | 1 | Typing layers (heavy in character.ts Three.js code) |
| Broad `catch {}` blocks | 47 occurrences | Low | 1 | Progressive waivers + refactoring |
| Time stratum predicates | 4 claiming | **URGENT** | 3 | Expand to 8+ (urgency, progression, causality, etc.) |
| Legacy `server/` vs `src/server/` | Duplication | Medium | 1 | Resolve tree structure |
| Wall-clock leaks | 122 sites | Tracked | Future | `Date.now()` → `kernelNow()` migration |

### Waiver Registry (4 Active Entries, All Sunset 2026-08-25)

1. `src/lib/intelligence/llm/provider-llama.ts:18` — `as any` for LLM SDK type mismatch
2. `src/lib/intelligence/llm/provider-openai.ts:45` — `as any` for OpenAI API compatibility
3. `src/lib/kernel/generators/character.ts:200–300` — `catch (e: any)` in Three.js canvas paths (3D rendering)
4. `src/pages/StudioPage.tsx:89` — `// @ts-ignore` for shadcn form builder dynamic types

---

## Part XIII: Testing & CI/CD

### Test Suite (1497 Passing Tests)

```
Determinism tests      ✅ 124 tests
GSPL interpreter       ✅ 24 tests (all 24 passing)
Golden hashes          ✅ 30 verified
Quality contracts      ✅ 7/7 conformant generators
Composition tests      ✅ 87 tests
Sovereignty           ✅ 56 tests
VCS / lineage         ✅ 34 tests
Evolution algorithms  ✅ 89 tests
Rendering             ✅ 102 tests (visual regressions)
API integration       ✅ 234 tests
Auth & security       ✅ 67 tests
Agent pipeline        ✅ 78 tests
...and more
```

### CI/CD Checklist (Every Commit)

```bash
npm run typecheck               # 0 errors
npm run determinism:check      # 0 hard violations
npm run lint:doctrine          # determinism + canonical-rename + no-evasion
npm run test                   # all 1497 tests
npm run golden:verify          # 30/30 hashes
npm run quality:contract       # 7/7 contracts (Tier-1)
```

---

## Part XIV: File Locations Cheat Sheet

| Concern | Path | LOC | Files |
|---------|------|-----|-------|
| Doctrine v2 Canon | `Documents/Paradigm-Analysis/13_*.md` | 336 | 3 |
| Waiver registry | `docs/waivers/registry.json` | 30 | 1 |
| Anti-fragility | `docs/if-we-vanish.md` | 94 | 1 |
| Determinism boundary check | `scripts/check-determinism-boundary.mjs` | 89 | 1 |
| Preflight report | `scripts/preflight-report.ts` | 200+ | 1 |
| Golden hash replay | `scripts/replay.mts` | 500+ | 1 |
| Quality contract report | `scripts/quality-contract-report.mts` | 300+ | 1 |
| Stratum predicates | `src/lib/kernel/quality/predicates.ts` | 400+ | 1 |
| GSPL interpreter | `src/lib/gspl/interpreter.ts` | 500+ | 1 |
| Server main | `server.ts` | 489 | 1 |
| Engine dispatcher | `src/lib/kernel/engine-dispatcher.ts` | 200+ | 1 |
| RNG (Xoshiro256**) | `src/lib/kernel/rng.ts` | 199 | 1 |
| Seed class | `src/seeds/universal-seed.ts` | 600+ | 1 |
| Friend generator | `src/lib/friend/generator.ts` | 300+ | 1 |
| World generator | `src/lib/world/generator.ts` | 250+ | 1 |
| Game oracle | `src/lib/game/oracle.ts` | 350+ | 1 |
| Agent pipeline | `src/lib/intelligence/agent/pipeline.ts` | 500+ | 1 |
| Generators library | `src/lib/kernel/generators/` | 10K+ | 299 |
| React Studio | `src/pages/StudioPage.tsx` | 800+ | 1 |
| shadcn UI components | `src/components/ui/` | 2K+ | 48 |
| Smart contracts | `contracts/` | 2K+ Solidity | 5 |
| Tests | `tests/`, `src/**/*.test.ts` | 5K+ | 108 files |
| Data / Commons | `data/commons/` | — | 12 files |
| Configuration | `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` | — | 3 |
| Planning / Doctrine | `planning/` | 5K+ | 10+ |

---

## Part XV: How to Work in This Codebase

### Pre-Commit Verification

```bash
# Always run before committing:
npm run typecheck              # 0 errors required
npm run determinism:check      # 0 hard violations required
npm run golden:verify          # All hashes match required
npm run quality:contract       # All Tier-1 contracts green
npm run test                   # All tests pass
```

### Adding a New Generator

1. Create `src/lib/kernel/generators/my-domain.ts`
2. Export: `export async function generateMyDomain(seed: UniversalSeed): Promise<Artifact>`
3. Register in `src/lib/kernel/engines.ts`: `engineRegistry.register('mydomain', generateMyDomain)`
4. Add quality contract: `src/lib/kernel/generators/my-domain-contract.ts`
5. Wire in `/api/generate/mydomain` route
6. Add tests in `tests/generators/my-domain.test.ts`
7. Run `npm run golden:write` to capture baseline hash
8. Verify: `npm run quality:contract`

### Modifying RNG or Seed Class

1. **DO NOT change Xoshiro256StarStar algorithm** — breaks all reproducibility
2. **DO NOT change seed hash computation** — breaks lineage
3. Add new genes in `src/seeds/types.ts` with validation
4. Update gene system ops in `src/lib/kernel/gene_system.ts`
5. Regenerate golden hashes: `npm run golden:write`
6. Verify determinism: `npm run determinism:check`

### Adding a New API Route

1. Create route handler (or modular `src/server/routes/*)
2. Register via `registerXxxRoutes()` pattern in `server.ts`
3. Add Zod schema for request validation
4. Add tests in `tests/api/`
5. Document in comments (JSDoc)
6. Run `npm run typecheck` + `npm test`

### Running the Development Server

```bash
npm run dev                    # Starts server on :3000 + vite HMR
# Open http://localhost:3000/studio
```

### Viewing Health Status

```bash
# Terminal:
curl http://localhost:3000/api/substrate/health

# Or navigate to:
http://localhost:3000/api/substrate/health
```

---

## Part XVI: Strategic Insights

### What Makes Paradigm Unique

1. **Determinism as a First-Class Right** — Not a feature, but the core invariant. Every artifact is reproducible.
2. **Sovereignty by Default** — No central server needed. Seeds can be owned, signed, forked, and traded peer-to-peer.
3. **Quality as Code** — Not subjective ratings, but 9 executable predicates that measure artifact conformance to stratum ideals.
4. **Universal Composition** — Friend × World → Quest → Game. The same kernel composes across modalities.
5. **Evolutionary Plasticity** — Genetic algorithms, novelty search, quality diversity all wired into the same RNG + seed system.
6. **Economic Substrate** — Royalty waterfalls, DAO governance, and on-chain provenance built in from the start.

### Why This Matters

- **For Creators:** Build once, evolve forever. Own your creations cryptographically.
- **For Platforms:** Reduce storage (store seeds, not rendered artifacts). Enable federated marketplaces.
- **For Researchers:** Reproducible generative models as a scientific primitive.
- **For Culture:** Preserve digital artifacts across centuries via deterministic seeds.

---

## Part XVII: Next Phase (Phase 2-3, June–July 2026)

### Immediate Priorities (Phase 2)

1. **Collapse Canonical Groups** — Merge 19 versioned siblings into canonical files
2. **Regenerate Golden Hashes** — Update `.paradigm/golden-hashes.json` for merged generators
3. **Phase 2 Delivery** — 0 versioned siblings, single entry point per generator

### High-Leverage (Phase 3)

1. **Expand Time Stratum** — 4 → 8+ predicates (urgency, progression, causality, etc.)
2. **Wiring All 9 Strata** — Every Tier-1 and Tier-2 generator returns typed stratum artifacts
3. **99.5% Conformance** — All curated seeds score ≥99.5% on their stratum contracts

### Foundation for Phase 9-10 (Agent Reproducibility)

- GSPL interpreter now stable (24/24 tests)
- Kernel ops (mutate/breed/grow/evolve) produce seeds deterministically
- Composition functors apply predictably
- Next: Wire reproducibility harness + (intent, memory_hash, seed_corpus_hash) proof

---

## Part XVIII: Conclusion

**Paradigm Absolute v1.0.0** is a production-grade, deterministic seed platform with:

- ✅ **Proven determinism:** 0 entropy violations, 30 golden hashes verified, 1497 tests passing
- ✅ **Complete kernel:** 299 generators, 27 canonical domains, 252 composition functors
- ✅ **Sovereign loop:** Friend → World → Quest → Game → Oracle, fully playable
- ✅ **Quality contracts:** 7 Tier-1 conformant, 9 strata predicates executable
- ✅ **GSPL language:** Full pipeline (lexer/parser/interpreter/bytecode), 24/24 tests
- ✅ **Agent scaffolding:** 6-stage pipeline, 8+ sub-agents, 4-layer memory
- ✅ **Smart contracts:** PARA token, SeedNFT, DAO, marketplace (5 contracts, all deployed)
- ✅ **C2PA + sovereignty:** ECDSA-P256 signing, 10 export handlers, .gseed binary format
- ✅ **React UI:** Studio, Friend, World, Quest, Play, Lineage pages + 48 shadcn components

**Doctrine v2** (13_* canon) reframes v1.0.0 as **Phase 0 of Paradigm Infinite** — a 24-phase roadmap to an operating substrate of generated reality with federation, 1M games, 12 hero flagships, economic layer, and OS shell.

**The next frontier:** Phase 2 canonical collapse + Phase 3 stratum expansion will lock in quality contracts as the platform's primary guarantee alongside determinism and sovereignty.

---

*Analysis completed: May 31, 2026*  
*Paradigm Absolute v1.0.0 — Deterministic Synthetic Evolution Operating System*  
*Doctrine v2 Canonical: `Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`*
