# Getting Started with Paradigm Absolute

**Paradigm** is a deterministic synthetic evolution operating system. Every digital artifact is a "seed" — a genetic blueprint that can be grown, mutated, bred, composed, signed, exported, and replayed with bit-identical output forever.

## Quick Start (60 seconds)

### 1. Install & Run

```bash
# Clone the repository
git clone https://github.com/paradigm-absolute/paradigm.git
cd paradigm

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### 2. Create Your First Seed

**Option A: Web Studio**
- Navigate to `/studio`
- Click "Generate" in any domain
- Your seed is created deterministically

**Option B: Command Line**

## Production Setup & Full Generation Quality (for prod + best local gens)

For production or full-fidelity local server generations:

1. **Set secrets for prod** (copy `.env.example` → `.env`):
   - `JWT_SECRET=...` (run `openssl rand -hex 32`)
   - `DATABASE_URL=postgresql://...` (enables Postgres instead of JSON fallback)
   - In `NODE_ENV=production`, server refuses to boot without `JWT_SECRET`.

2. **Canvas native libs** (for server-side 2D/character/SVG/PNG generation in some engines):
   - macOS: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`
   - Windows: Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ workload) + Python; then `npm rebuild canvas`.
   - Linux: `sudo apt install build-essential libcairo2-dev libpango1.0-dev ...`
   - **Easier alternative**: Use the browser-based Studio (`/studio`) — it uses native browser Canvas/WebGL for rendering. Server shims are fine for CLI/API seed creation and logic. See polyfill warnings on `npm run dev`.

See `DEPLOY.md` and top of `.env.example` for full details.
```bash
# Generate a game seed
npx tsx cli/paradigm.ts grow game --genes genre=platformer

# Generate a music seed
npx tsx cli/paradigm.ts grow music --genes tempo=120,key=C

# Generate a character
npx tsx cli/paradigm.ts grow character --genes bodyType=humanoid
```

**Option C: OS Shell**
- Navigate to `/os`
- Click the diamond icon to open the app launcher
- Choose any app (Synthesizer, World Builder, Character Lab, etc.)
- Click "Generate Artifact"

### 3. Explore Your Seed

```bash
# View seed details
npx tsx cli/paradigm.ts verify <seed-file.json>

# Export as different formats
npx tsx cli/paradigm.ts export <seed-id> --format html
npx tsx cli/paradigm.ts export <seed-id> --format gltf
npx tsx cli/paradigm.ts export <seed-id> --format wav
npx tsx cli/paradigm.ts export <seed-id> --format png
```

### 4. Evolve Your Seed

```bash
# Mutate a seed
npx tsx cli/paradigm.ts mutate <seed-file.json> --budget 0.1

# Breed two seeds
npx tsx cli/paradigm.ts breed <seed-a.json> <seed-b.json>

# Evolve a population
npx tsx cli/paradigm.ts evolve game --algorithm map-elites --generations 100
```

### 5. Sign & Own Your Creation

```bash
# Sign a seed (cryptographic ownership)
npx tsx cli/paradigm.ts sign <seed-file.json>

# Verify signature
npx tsx cli/paradigm.ts verify <seed-file.json>
```

## Core Concepts

### Seeds

A seed is the canonical unit of creation. It contains:
- **Identity**: Unique hash (SHA-256)
- **Domain**: What kind of artifact (game, music, character, etc.)
- **Genes**: Typed parameters that drive generation
- **Lineage**: Parent hashes, generation number, operations
- **Signature**: ECDSA-P256 proof of ownership

### Determinism

**Same seed + same code = bit-identical artifact forever.**

This is the platform's most important invariant. All randomness flows through the deterministic RNG (`xoshiro256**`). No `Math.random()`, no `Date.now()` in the kernel.

### Quality Contracts

Every generator has a measurable contract across 9 strata:
- **Form** (geometry quality)
- **Motion** (animation quality)
- **Sound** (audio quality)
- **Space** (spatial quality)
- **Time** (temporal quality)
- **Structure** (architectural quality)
- **Semantics** (meaning quality)
- **Culture** (cultural quality)
- **Possibility** (combinatorial quality)

### Sovereignty

- **Cryptographic ownership**: ECDSA-P256 signatures
- **C2PA provenance**: Content Authenticity metadata
- **Forking is a right**: Fork any public seed
- **No central server**: Kernel runs offline

## Available Domains

Paradigm supports 27+ domains:

| Domain | Description | Example |
|--------|-------------|---------|
| game | Playable games | Platformers, shooters, puzzles |
| music | Procedural music | Jazz, classical, electronic |
| character | Avatar generation | Heroes, NPCs, creatures |
| world | World building | Biomes, civilizations, maps |
| sprite | Pixel art | Heroes, items, effects |
| visual2d | 2D art | Geometric, organic, abstract |
| narrative | Stories | Quests, lore, dialogue |
| cardgame | Card games | Blackjack, poker, solitaire |
| boardgame | Board games | Chess, checkers, Go |
| architecture | Buildings | Modern, classical, gothic |
| fashion | Clothing | Casual, formal, sport |
| food | Cuisine | Recipes, 3D food models |
| furniture | Furniture | Chairs, tables, beds |
| geometry3d | 3D models | Objects, scenes, characters |
| shader | GLSL shaders | Raymarching, PBR, toon |
| particle | Particle effects | Fire, smoke, magic |
| typography | Fonts | Variable fonts, specimens |
| animation | Animations | Skeletal, morph, physics |
| physics | Simulations | Rigid body, fluid, cloth |
| ecosystem | Ecosystems | Flora, fauna, food webs |
| alife | Artificial life | Evolution, cellular automata |
| audio | Sound design | SFX, ambient, music |
| procedural | Procedural gen | Terrain, noise, patterns |
| robotics | Robots | Humanoid, drone, rover |
| vehicle | Vehicles | Car, truck, motorcycle |
| circuit | Electronics | PCB, circuits, components |
| agent | AI agents | Behavior trees, FSMs |

## API Reference

### REST API

```
POST /api/seeds/create          Create a new seed
POST /api/seeds/generate        Generate seed from domain
POST /api/seeds/:id/mutate      Mutate a seed
POST /api/seeds/:id/breed       Breed two seeds
POST /api/seeds/:id/grow        Grow seed into artifact
GET  /api/seeds/:id             Get seed details
POST /api/seeds/:id/sign        Sign a seed
POST /api/seeds/:id/verify      Verify signature

POST /federation/offer          P2P seed exchange
POST /federation/accept         Accept seed exchange

POST /royalty/calculate         Compute royalty splits
POST /royalty/transaction       Record royalty transaction

POST /meta/generate             Generate new generator
POST /meta/improve              Self-improvement loop
```

### WebSocket

```
WS /ws/agent                    Agent streaming (intent → seed)
```

## Verification Commands

```bash
npm run typecheck              # 0 TypeScript errors
npm run determinism:check      # 0 determinism violations
npm run quality:contract       # All quality contracts green
npm run golden:verify          # All golden hashes verified
npm run reproducibility:gate   # Agent reproducibility check
npm run preflight:all          # Full pre-commit verification
```

## Troubleshooting

### Build fails
```bash
npm run clean
rm -rf node_modules
npm install
npm run build
```

### Tests fail
```bash
npm run test -- --verbose     # Detailed output
```

### Server won't start
```bash
lsof -i :3000                 # Check port usage
kill -9 <PID>                 # Kill if needed
```

## Learn More

- [Doctrine v2](Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md) — The canonical governing document
- [Phase Gates](Documents/Paradigm-Analysis/13b_Phase_Gates.md) — Entry/exit criteria for every phase
- [Execution Plan](Documents/Paradigm-Analysis/14_PARADIGM_INFINITE_EXECUTION_PLAN.md) — 24-phase roadmap
- [Federation Protocol](docs/federation-protocol.md) — P2P seed exchange
- [If We Vanish](docs/if-we-vanish.md) — Anti-fragility protocol

---

*Paradigm Absolute v1.0.0 — Deterministic Synthetic Evolution Operating System*
