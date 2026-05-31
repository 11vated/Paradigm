# Paradigm Absolute

**Deterministic Synthetic Evolution Operating System**

> Every digital artifact is a seed. A seed is a genetic, reproducible blueprint that can be grown, mutated, bred, composed, signed, exported, and replayed with bit-identical output forever.

```text
same seed + same deterministic RNG + same code = reproducible artifact
```

Paradigm is not a generative app. It is the operating substrate of generated reality: a deterministic, evolvable, sovereign kernel that compresses any creative artifact — a game, a song, a film, a novel, a building, a molecule, a culture — into a `.gseed`, breeds seeds with seeds, renders across modalities, and lets operators own what they make at the substrate level.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [What's Built](#whats-built)
- [Architecture](#architecture)
- [Domains](#domains)
- [Game Types](#game-types)
- [Verification](#verification)
- [API Reference](#api-reference)
- [OS Shell](#os-shell)
- [Federation](#federation)
- [Economic Substrate](#economic-substrate)
- [Recursive Closure](#recursive-closure)
- [Smart Contracts](#smart-contracts)
- [Repository Map](#repository-map)
- [Development](#development)
- [Documentation](#documentation)
- [License](#license)

---

## Quick Start

```bash
git clone https://github.com/11vated/Paradigm.git
cd Paradigm
npm install
npm run dev
```

Open `http://localhost:3000` for the Studio, or `http://localhost:3000/os` for the OS Shell desktop.

```bash
# Verify everything works
npm run preflight:all
```

---

## Core Concepts

### Seeds

A seed is the canonical unit of creation. It contains identity, domain, lineage, metadata, and typed genes. Seeds can be:

- **Grown** into artifacts (games, music, 3D models, sprites, narratives)
- **Mutated** to explore design space
- **Bred** with other seeds to combine properties
- **Composed** across domains (Friend × Music → Singing Avatar)
- **Evolved** using genetic algorithms, novelty search, quality diversity
- **Signed** with ECDSA-P256 for cryptographic ownership
- **Exported** in 10+ formats (JSON, GLTF, WAV, SVG, PNG, MIDI, .gseed, C2PA)
- **Replayed** with identical output forever

### Determinism

**The platform's most important invariant.** All randomness flows through `xoshiro256**` — a deterministic PRNG seeded from the artifact hash. No `Math.random()`, no `Date.now()` in the kernel. Same seed → same artifact across machines, runtimes, decades.

Enforced by ESLint, CI gates, golden hashes, and the determinism boundary check.

### Sovereignty

No central server required. The kernel runs offline. Forking is a first-class right. Every seed can be cryptographically signed, traced through lineage, and anchored on-chain.

### Quality Contracts

Every generator has a measurable contract across **9 strata**:

| Stratum | What It Measures |
|---------|-----------------|
| Form | Geometry quality (vertices, faces, symmetry, coherence) |
| Motion | Animation quality (trajectory, velocity, momentum) |
| Sound | Audio quality (LUFS, timbre, rhythm, harmony) |
| Space | Spatial quality (scale, density, connectivity) |
| Time | Temporal quality (urgency, progression, causality) |
| Structure | Architectural quality (hierarchy, modularity, symmetry) |
| Semantics | Meaning quality (coherence, depth, distinctiveness) |
| Culture | Cultural quality (familiarity, novelty, resonance) |
| Possibility | Combinatorial quality (branching, exploration, reachability) |

Each stratum has **8-10 executable predicates** that score artifacts on a 0–1 scale.

---

## What's Built

| Component | Count | Status |
|-----------|-------|--------|
| Domain generators | 272 | All registered, typechecked, determinism-verified |
| Playable game types | 10 | 5 card + 5 board (HTML5 Canvas) |
| Inverters (artifact → seed) | 15 modalities | image, audio, text, narrative, video, MIDI, code, game-replay, sensor, genome, map, legal, persona, seed-graph |
| Server routes | 30 files | 60+ endpoint registrations |
| Quality contracts | 7/7 Tier-1 green | friend, sprite, visual2d, narrative, game, music, world |
| Stratum predicates | 9 × 8-10 axes | All executable, scored live on /api/substrate/health |
| Golden hashes | 35 verified | Cross-runtime determinism checked |
| Evolution algorithms | 7 | GA, CMA-ES, MAP-Elites, POET, DQD, AURORA, NSLC |
| Composition functors | 252 | Cross-domain bridges (Friend × Music, World × Quest, etc.) |
| Smart contracts | 5 | ParaToken, SeedNFT, Marketplace, Governor, Timelock |
| C2PA provenance | 10 export handlers | Signed artifacts with Content Authenticity metadata |
| Tests | 617+ | Kernel, determinism, game, sovereignty, VCS, quality, agent, contracts |
| OS Shell | 14 apps | Desktop environment with terminal, canvas, synthesizer, world builder |
| Federation | 7 endpoints | P2P seed exchange with signature verification |
| Royalty engine | 5 endpoints | Waterfall computation, ledger, creator earnings |
| MetaGenerator | 6 endpoints | Recursive self-improvement (generators that generate generators) |
| Corpus | 100 seeds | Batch generation at 3571 seeds/second |

---

## Architecture

```text
Layer 1   Deterministic RNG
          xoshiro256**, seeded streams, reproducible random choices

Layer 2   Seed and Gene System
          17 gene types, Universal Seed class, mutation/crossover/distance

Layer 3   GSPL
          Generative Seed Programming Language
          Lexer → Parser → Interpreter → Bytecode → GPU Compiler

Layer 4   Domain Engines
          272 generators across 27 canonical + 107 industry domains

Layer 5   Evolution and Composition
          GA, CMA-ES, MAP-Elites, POET, novelty search
          252 cross-domain functor bridges

Layer 6   Quality Contracts
          9-stratum conformance framework
          8-10 executable predicates per stratum

Layer 7   Agent Intelligence
          6-stage pipeline, 8+ sub-agents, 4-layer memory
          Deterministic reproducibility harness

Layer 8   Sovereignty and Provenance
          ECDSA-P256, C2PA manifests, .gseed binary format
          Lineage tracking, per-gene ownership

Layer 9   Federation
          P2P seed exchange, signature verification, lineage merge

Layer 10  Economic Substrate
          Royalty waterfalls, licensing tiers, DAO governance

Layer 11  Studio and API
          React 19 Studio, Express backend, 30 route modules

Layer 12  OS Shell
          Web-based desktop, 14 seed-powered apps, terminal

Layer 13  Recursive Closure
          MetaGenerator, self-improvement loop, GSPL v∞

Layer 14  Compute and Export
          WebGPU, GLTF, WAV, SVG, PNG, MIDI, .gseed, C2PA, HTML5 games
```

---

## Domains

### 27 Canonical Domains

| Domain | Output | Description |
|--------|--------|-------------|
| character | GLTF | 3D character generation with skeleton, materials, animation |
| sprite | PNG | Pixel art with symmetry, dithering, equipment |
| music | WAV | Procedural synthesis with ADSR envelopes, harmony, MIDI export |
| visual2d | SVG/PNG | 2D art with gradients, filters, provenance |
| game | HTML/JSON | Playable games with levels, physics, power-ups |
| fullgame | HTML | Complete HTML5 games with Canvas rendering |
| cardgame | HTML | Blackjack, poker, solitaire, war, hearts |
| boardgame | HTML | Chess, checkers, tic-tac-toe, snakes-ladders, parcheesi |
| narrative | JSON | Story generation with beats, branching, character arcs |
| world | JSON | Era × biome × conflict, locations, factions |
| architecture | GLTF | 3D buildings with floors, roofs, windows, materials |
| fashion | GLTF | 3D garments with buttons, collar, sleeves |
| food | GLTF | 3D food items with toppings, layers, textures |
| furniture | GLTF | 3D furniture with legs, cushions, headboards |
| vehicle | GLTF | 3D vehicles with wheels, headlights, windshield |
| robotics | GLTF | 3D robots (humanoid, drone, rover) with sensors |
| shader | GLSL | Raymarching, PBR, toon, compute shaders |
| particle | JSON/HTML | Particle systems with forces, emitters, WebGL |
| typography | HTML/CSS | Variable fonts, bitmap glyphs, specimen pages |
| animation | GLTF | Skeletal + morph target animations |
| physics | JSON/HTML | Rigid body simulations with constraints |
| audio | WAV | Sound synthesis with reverb, delay, spatialization |
| ecosystem | JSON | Species, food webs, environmental zones |
| alife | JSON/HTML | Cellular automata, evolutionary simulations |
| geometry3d | GLTF | 3D primitives, CSG, implicit surfaces |
| procedural | JSON/PNG | Terrain, noise fields, pattern generation |
| agent | JSON | Behavior trees, FSMs, utility AI |

### 107 Industry Domains

aerospace, agriculture, agtech, app, architecture-3d, ar, art, automotive, av, battery, beer, biomedical, biotechnology, blockchain, chemistry, city, climate, cloud, coffee, cosmetics, cybersecurity, dance, data-science, devops, drones, drug, edtech, education, electronics, energy, event-planning, fashion-3d, film, finance, fitness, food-3d, furniture-3d, gaming, gardening, genome, genomics, healthcare, hospitality, insurance, interior-design, jewelry, journalism, landscaping, legal, lighting, literature, logistics, marine, marketing, material, media, metaverse, molecule, ml, nanobot, nanotechnology, neuroscience, optics, personalized-medicine, pet-care, photography, procedural-3d, protein, publishing, quantum, quantum-circuit, quantum-computing, reactor, real-estate, renewable-energy, robotics-3d, robotics-industrial, security, semiconductors, sensors, smart-grid, smart-home, space, space-tourism, spirits, sports, synthetic-biology, tea, textiles, theater, tourism, transportation, ui, universe, vr, wearables, website, wine, world

---

## Game Types

### Card Games (HTML5 Canvas)

| Game | Players | Description |
|------|---------|-------------|
| Blackjack | 1+AI | Beat the dealer to 21 |
| Poker | 1+AI | Five-card draw with betting |
| Solitaire | 1 | Classic klondike |
| War | 2 | Flip and compare |
| Hearts | 2-4 | Avoid taking hearts and queen of spades |

### Board Games (HTML5 Canvas)

| Game | Players | Description |
|------|---------|-------------|
| Chess | 2 | Full chess with piece movement |
| Checkers | 2 | Draughts with jumps and kings |
| Tic-Tac-Toe | 2 | Classic 3×3 |
| Snakes & Ladders | 2 | Race to 100 with snakes and ladders |
| Parcheesi | 2-4 | Cross and enter home |

### Action/Platformer Games (HTML5 Canvas)

| Genre | Mechanics |
|-------|-----------|
| Platformer | Jump, collect, reach finish |
| Shooter | Dodge, shoot enemies |
| Puzzle | Match, solve, clear |
| Racing | Speed, drift, finish first |
| Action | Move, score, survive |

---

## Verification

```bash
# Full pre-commit verification
npm run preflight:all

# Individual gates
npm run typecheck              # 0 TypeScript errors
npm run determinism:check      # 0 entropy violations
npm run lint:canonical-rename  # 0 deprecated siblings
npm run reproducibility:gate   # Agent determinism proof
npm run golden:matrix          # Cross-runtime verification
npm run quality:contract       # 7/7 Tier-1 contracts green
npm run golden:verify          # 35 golden hashes match
npm test                       # 617+ tests passing
```

---

## API Reference

### Seed Lifecycle

```
POST /api/seeds/create          Create a new seed
POST /api/seeds/generate        Generate from domain + genes
POST /api/seeds/:id/mutate      Mutate a seed
POST /api/seeds/:id/breed       Breed two seeds
POST /api/seeds/:id/grow        Grow seed into artifact
GET  /api/seeds/:id             Get seed details
POST /api/seeds/:id/sign        Sign with ECDSA
POST /api/seeds/:id/verify      Verify signature
POST /api/seeds/:id/export      Export as JSON/GLTF/WAV/PNG/.gseed
```

### Federation (P2P)

```
GET  /federation/status         Node status
GET  /federation/peers          Known peers
POST /federation/discover       Peer discovery
POST /federation/offer          Send seed offer
POST /federation/accept         Accept seed
POST /federation/reject         Reject seed
POST /federation/exchange       Full exchange with receipt
```

### Royalty (Economics)

```
POST /royalty/calculate         Compute royalty splits
POST /royalty/transaction       Record sale
GET  /royalty/ledger            Transaction history
GET  /royalty/summary           Revenue summary
GET  /royalty/creator/:id       Creator earnings
```

### MetaGenerator (Recursive)

```
POST /meta/generate             Create new generator from spec
POST /meta/verify               Test generated generator
GET  /meta/list                 All generated generators
GET  /meta/:id                  Specific generator source
POST /meta/improve              Self-improvement attempt
GET  /meta/improvements         Improvement history
```

### Health & Monitoring

```
GET  /api/substrate/health      Full health with stratum conformance
GET  /health                    Basic health check
GET  /api/metrics               Prometheus metrics
```

---

## OS Shell

Navigate to `/os` for a web-based desktop environment where every window is a seed-powered artifact.

**14 Built-in Apps:** Terminal, Canvas, Synthesizer, World Builder, Character Lab, Game Engine, Card Games, Board Games, 3D Studio, Story Engine, Evolution Lab, Seed Vault, Settings, About

**Terminal Commands:**
```text
help          Show available commands
seed <domain> Create a new seed
grow <seed>   Grow a seed into an artifact
evolve <seed> Evolve a seed
compose <a> <b> Compose two seeds
list          List active seeds
clear         Clear terminal
about         About Paradigm
```

---

## Federation

P2P seed exchange between independent Paradigm nodes. No central server required.

**Protocol:**
1. Node A sends `POST /federation/offer` with seed + signature
2. Node B verifies signature, stores seed, returns receipt
3. Both nodes replay seed deterministically
4. Lineage merge preserves fork history

**Spec:** `docs/federation-protocol.md`

---

## Economic Substrate

### Royalty Waterfall

When a seed is purchased, royalties flow up the lineage tree:

```text
Price: $100
  10% → Creator of sold seed
   5% → Parent seed creator
   2% → Grandparent seed creator
   2% → Platform fee
  81% → Seller
```

### Universe Licensing

Creators set usage tiers:
- **Free:** Unlimited personal use
- **Indie:** <1000 seeds, 10% royalty
- **Studio:** <100K seeds, 5% royalty
- **Enterprise:** Unlimited, 2% royalty

### Multi-Chain

Seeds can be anchored on:
- Ethereum (high-value, high-security)
- Polygon (low-cost, high-volume)
- Arbitrum (fast finality)
- Base (Coinbase L2)

---

## Recursive Closure

The **MetaGenerator** creates new generators from specifications. This is how Paradigm builds the next version of itself.

```typescript
const metaGen = new MetaGenerator();
const generator = metaGen.generate({
  domain: 'music',
  name: 'ambient-generator',
  parameters: [
    { name: 'mood', type: 'string', default: 'calm' },
    { name: 'duration', type: 'number', default: 300 },
  ],
  strata: ['Sound', 'Time'],
});
```

The **SelfImprovementLoop** attempts to improve existing generators by generating new versions and testing them against quality contracts.

---

## Smart Contracts

```text
contracts/
├── ParaToken.sol              ERC-20 governance token
├── SeedNFT.sol                ERC-721 seed ownership
├── ParadigmMarketplace.sol    Decentralized marketplace
├── ParadigmGovernor.sol       DAO voting
└── ParadigmTimelock.sol       Governance delay
```

Deploy locally: `npx hardhat run scripts/deploy.ts --network localhost`

---

## Repository Map

```text
src/
├── lib/
│   ├── kernel/               Core deterministic substrate
│   │   ├── rng.ts            xoshiro256** PRNG
│   │   ├── seed-class.ts     Universal Seed class
│   │   ├── engines.ts        Engine router
│   │   ├── engine-dispatcher.ts  272 generator routing
│   │   ├── composition.ts    252 cross-domain functors
│   │   ├── quality-contract.ts   9-stratum quality framework
│   │   ├── quality/predicates.ts 8-10 predicates per stratum
│   │   ├── generators/       272 domain generators
│   │   ├── gspl-*.ts         GSPL language pipeline
│   │   ├── meta-generator.ts Recursive self-improvement
│   │   ├── clock.ts          Injectable wall-clock
│   │   └── provenance.ts     Canonicalization + C2PA
│   ├── evolution/            GA, CMA-ES, MAP-Elites, POET, DQD, AURORA, NSLC
│   ├── friend/               Sovereign digital companion (6 genes, ECDSA, ERC-721)
│   ├── world/                Era × biome × conflict + quest composition
│   ├── game/                 Quest → scene graph + 5-axis oracle
│   ├── intelligence/         Agent pipeline, inverters, embeddings, memory
│   │   ├── inverse/          15-modality artifact → seed pipeline
│   │   └── agent/            6-stage pipeline, 8 sub-agents
│   ├── sovereignty/          ECDSA, C2PA, .gseed binary, royalty waterfall
│   ├── blockchain/           Multi-chain support (ETH, Polygon, Arbitrum, Base)
│   ├── os-shell/             Desktop environment (14 apps)
│   ├── onboarding/           Creator onboarding flows
│   ├── gspl/                 GSPL v∞ research tracker
│   ├── rendering/            WebGPU, Three.js, path tracing
│   ├── vcs/                  Version control for seeds
│   └── validation/           Zod schemas, middleware
├── server/routes/            30 route modules
├── pages/                    React page components
├── components/               UI components
└── seeds/                    Canonical seed types
```

---

## Development

### Commands

```bash
npm run dev                    # Start dev server (tsx server.ts)
npm run build                  # Production build (vite build)
npm run test                   # Full test suite (vitest run)
npm run preflight:all          # Complete verification
npm run generate:corpus        # Generate seed corpus
```

### Adding a Generator

1. Create `src/lib/kernel/generators/my-domain.ts`
2. Export: `export async function generateMyDomain(seed, outputPath) { ... }`
3. Register in `src/lib/kernel/engines.ts`
4. Add domain config in `src/lib/kernel/pipeline/domain-config.ts`
5. Run `npm run typecheck && npm run determinism:check`

### Rules

- **Never** use `Math.random()` in kernel code
- **Always** seed RNG from artifact hash
- **Always** verify determinism after changes
- **Always** run `npm run preflight:all` before commit

---

## Documentation

| Document | Purpose |
|----------|---------|
| [Getting Started](docs/getting-started.md) | Public guide for new users |
| [Doctrine v2](Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md) | Canonical governing document |
| [Phase Gates](Documents/Paradigm-Analysis/13b_Phase_Gates.md) | Entry/exit criteria for every phase |
| [Execution Plan](Documents/Paradigm-Analysis/14_PARADIGM_INFINITE_EXECUTION_PLAN.md) | 24-phase roadmap |
| [Federation Protocol](docs/federation-protocol.md) | P2P seed exchange specification |
| [Architecture Diagrams](ARCHITECTURE_DIAGRAMS.md) | Visual architecture walkthroughs |
| [Comprehensive Analysis](COMPREHENSIVE_CODEBASE_ANALYSIS.md) | Full codebase evaluation |
| [Strategic Reference](STRATEGIC_QUICK_REFERENCE.md) | Business + technical overview |
| [If We Vanish](docs/if-we-vanish.md) | Anti-fragility protocol |

---

## License

MIT

---

## Links

- **GitHub:** https://github.com/11vated/Paradigm
- **Local Studio:** http://localhost:3000/studio
- **OS Shell:** http://localhost:3000/os
- **Health:** http://localhost:3000/api/substrate/health
- **Federation:** http://localhost:3000/federation/status
- **Royalty:** http://localhost:3000/royalty/summary
- **MetaGenerator:** http://localhost:3000/meta/list

---

*Paradigm Absolute — Deterministic Synthetic Evolution Operating System*
*Every seed is sovereign. Every artifact is reproducible. Every creation is owned.*
