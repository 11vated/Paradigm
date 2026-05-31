# Paradigm Absolute — Visual Architecture

## System Diagram: Seed → Artifact → Composition → Playable Experience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PARADIGM ABSOLUTE ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │   INPUT LAYER: Deterministic RNG     │
                    │     (Xoshiro256StarStar PRNG)        │
                    │  Seed Fingerprint → 256-bit State    │
                    └──────────────────┬───────────────────┘
                                       │
                    ┌──────────────────▼───────────────────┐
                    │   SEED SYSTEM (17 Gene Types)        │
                    │   - Primitive (number, string, etc)  │
                    │   - Container (array, object)        │
                    │   - Spatial (vector, matrix, color)  │
                    │   - Temporal (time, frequency)       │
                    │   - Symbolic (pattern, enum)         │
                    │   - Learned (embedding, tensor)      │
                    │   - Sovereignty (owner, license)     │
                    └──────────────────┬───────────────────┘
                                       │
                    ┌──────────────────▼───────────────────┐
                    │   GSPL: Generative Seed Language     │
                    │   Lexer → Parser → Interpreter       │
                    │   Bytecode → GPU Compiler            │
                    │                                       │
                    │  seed(...) |> mutate |> breed        │
                    │  |> evolve |> compose |> grow        │
                    └──────────────────┬───────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        │                                                              │
        │           KERNEL OPERATIONS (Always Deterministic)          │
        │                                                              │
        ├─────────────────┬──────────────────┬──────────────────┐     │
        │                 │                  │                  │     │
   ┌────▼─────┐    ┌─────▼──────┐  ┌───────▼────┐   ┌────────▼──┐  │
   │  MUTATE   │    │   BREED    │  │    GROW    │   │  EVOLVE   │  │
   │ (perturb) │    │ (crossover)│  │ (generate) │   │ (GA, CMA) │  │
   │           │    │            │  │            │   │           │  │
   └────┬──────┘    └─────┬──────┘  └───────┬────┘   └────┬──────┘  │
        │                 │                 │             │          │
        │                 └────────────┬────────────────┬─┘          │
        │                              │                │             │
        └──────────────────────────────┴────────────────┘             │
                                       │
        ┌──────────────────────────────▼──────────────────────────────┐
        │                    ENGINE DISPATCHER                         │
        │  Seed.domain → Generator function → Artifact                │
        │                                                              │
        │   27 Canonical Domains + 272 Extended Generators            │
        │                                                              │
        ├─────────────┬──────────────┬─────────────┬────────────┐    │
        │             │              │             │            │    │
   ┌────▼─────┐  ┌───▼────┐  ┌──────▼──┐  ┌──────▼──┐ ┌──────▼──┐ │
   │  Friend  │  │ Sprite │  │ Visual  │  │ Narrative│ │ Music  │ │
   │(1.000)   │  │(1.000) │  │  2D    │  │ (0.667)  │ │(0.833) │ │
   │ 6 genes  │  │ pixels │  │(0.981) │  │  story   │ │ tempo  │ │
   │ ECDSA    │  │ color  │  │Procedur│  │ 3-acts   │ │ harmony│ │
   │ ERC-721  │  │ palset │  │ noise  │  │ choice   │ │ timbre │ │
   └────┬─────┘  └────┬───┘  └───┬────┘  └──┬───────┘ └────┬──┘ │
        │             │          │          │              │     │
   ┌────▼─────┐  ┌───▼────┐  ┌──▼─────┐  ┌──▼──────┐  ┌──▼───┐ │
   │  World   │  │ Particle│ │Shader  │  │Architec-│  │Games │ │
   │(1.000)   │  │System   │ │ GLSL   │  │ture 3D  │  │(0.900)│ │
   │era/biome │  │physics  │ │effects │  │buildings│  │oracle │ │
   └────┬─────┘  └────┬───┘  └───┬────┘  └──┬──────┘  └────┬──┘ │
        │             │          │          │              │     │
        └─────────────┴──────────┴──────────┴──────────────┘     │
                                 │                                │
        ┌────────────────────────▼──────────────────────────────┐ │
        │        COMPOSITION: Cross-Domain Functors              │ │
        │                                                         │ │
        │  Friend × Music → Singing Avatar                       │ │
        │  Friend × World → Quest                                │ │
        │  World × Quest → Game                                  │ │
        │  Quest × Game → Playable Experience                    │ │
        │                                                         │ │
        │  (252 functors wired, extensible)                      │ │
        └────────────────────────┬──────────────────────────────┘ │
                                 │                                 │
        ┌────────────────────────▼──────────────────────────────┐ │
        │         QUALITY CONTRACTS (9-Stratum)                 │ │
        │                                                         │ │
        │  ✓ Form      → Symmetry, Density, Coherence             │ │
        │  ✓ Motion    → Velocity, Trajectory, Smoothness         │ │
        │  ✓ Sound     → Pitch, Timbre, Dynamics, LUFS            │ │
        │  ✓ Space     → Scale, Distribution, Connectivity        │ │
        │  ✓ Time      → Urgency, Progression, Causality          │ │
        │  ✓ Structure → Hierarchy, Modularity, Symmetry          │ │
        │  ✓ Semantics → Coherence, Specificity, Depth            │ │
        │  ✓ Culture   → Familiarity, Novelty, Resonance          │ │
        │  ✓ Possibility → Branching, Exploration, Complexity     │ │
        │                                                         │ │
        │  Score each artifact on all 9 axes                     │ │
        │  (Live scoring at /api/substrate/health)               │ │
        │                                                         │ │
        └────────────────────────┬──────────────────────────────┘ │
                                 │                                 │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   SOVEREIGNTY & PROVENANCE │
                    │                             │
                    │  ✓ ECDSA-P256 Signatures   │
                    │  ✓ C2PA Manifests          │
                    │  ✓ Lineage Tracking        │
                    │  ✓ .gseed Binary Format    │
                    │  ✓ Smart Contract Anchor   │
                    │                             │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────────┐
                    │   EXPORT (10 Handlers)        │
                    │                                │
                    │  • JSON                        │
                    │  • GLTF (3D)                   │
                    │  • WAV (Audio)                 │
                    │  • SVG (2D Vector)             │
                    │  • PNG (Bitmap)                │
                    │  • MIDI (Music)                │
                    │  • .gseed (Binary Seed)        │
                    │  • C2PA (Provenance Manifest)  │
                    │  • Code (TypeScript)           │
                    │  • Archive (.zip)              │
                    │                                │
                    └─────────────┬──────────────────┘
                                  │
                    ┌─────────────▼──────────────────┐
                    │      PLAYABLE ARTIFACT        │
                    │                                │
                    │  Game, Song, Building, Story   │
                    │  Document, Character, etc.     │
                    │                                │
                    │  Deterministic Output          │
                    │  Forever Reproducible          │
                    │  Cryptographically Owned       │
                    │  On-chain Anchored             │
                    │                                │
                    └────────────────────────────────┘
```

---

## Pipeline: Friend → World → Quest → Game

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                   THE SOVEREIGN CREATION LOOP                             ║
╚═══════════════════════════════════════════════════════════════════════════╝

    STAGE 1: CREATE FRIEND (Companion Seed)
    ┌────────────────────────────────────────┐
    │                                         │
    │  FriendSeed {                          │
    │    body: humanoid | animal | mythic   │
    │    face: symmetric | expressive        │
    │    voice: pitch, timbre, accent        │
    │    persona: archetype, personality    │
    │    memory: episodic state             │
    │    bond: loyalty, connection          │
    │  }                                     │
    │                                         │
    │  →  FriendArtifact {                  │
    │      phenotype: SVG portrait          │
    │      voice: WAV synthesis             │
    │      stats: strength, wisdom, etc.    │
    │      on-chain: SeedNFT                │
    │    }                                   │
    │                                         │
    └──────────────────┬─────────────────────┘
                       │
    STAGE 2: CREATE WORLD (Setting Seed)
    ┌──────────────────▼─────────────────────┐
    │                                         │
    │  WorldSeed {                           │
    │    era: ancient | medieval | future   │
    │    biome: forest | desert | ocean     │
    │    conflict: peace | strife | war     │
    │  }                                     │
    │                                         │
    │  →  WorldArtifact {                   │
    │      locations: 10+ seeds             │
    │      factions: 3+ with allegiances    │
    │      flavor: hooks, quests, NPCs      │
    │    }                                   │
    │                                         │
    └──────────────────┬─────────────────────┘
                       │
    STAGE 3: COMPOSE QUEST (Friend × World)
    ┌──────────────────▼─────────────────────┐
    │                                         │
    │  QuestSeed {                           │
    │    friend: (from stage 1)              │
    │    world: (from stage 2)               │
    │    archetype: hero's journey           │
    │    acts: [setup, confrontation, climax]│
    │    choices: 5+ branching points       │
    │  }                                     │
    │                                         │
    │  →  QuestArtifact {                   │
    │      narrative: story beats           │
    │      encounters: enemies, allies      │
    │      loot: treasures, rewards         │
    │      callbacks: lore references       │
    │    }                                   │
    │                                         │
    └──────────────────┬─────────────────────┘
                       │
    STAGE 4: GENERATE GAME (Quest → Playable)
    ┌──────────────────▼─────────────────────┐
    │                                         │
    │  GameSeed {                            │
    │    quest: (from stage 3)               │
    │    rules: turn-based | realtime       │
    │    victory: criteria                  │
    │    karma: morality tracker             │
    │  }                                     │
    │                                         │
    │  →  GameArtifact {                    │
    │      sceneGraph: rooms, entities      │
    │      dialogue: choice trees           │
    │      combat: mechanics, balance       │
    │      endings: 5+ based on karma      │
    │    }                                   │
    │                                         │
    │  →  Oracle (5-axis fitness):          │
    │      completability: reachable?       │
    │      branching: choice health?        │
    │      karmaArc: morality impact?       │
    │      paceVariance: rhythm varied?     │
    │      endingDiversity: payoff varied?  │
    │                                         │
    └──────────────────┬─────────────────────┘
                       │
                       ▼
            PLAYABLE GAME (Web/Mobile)
            ┌──────────────────┐
            │  Friend seeks    │
            │  treasure in     │
            │  the Shadowwood  │
            │  while changing  │
            │  their karma     │
            │  through choices │
            │                  │
            │  Play → Replay   │
            │  with new choice │
            │  or new Quest    │
            └──────────────────┘
```

---

## Data Flow: Request → Artifact

```
CLIENT REQUEST (Browser or CLI)
    │
    ├─ POST /generate/:domain { seed: {...} }
    │
    ▼
EXPRESS SERVER (server.ts:489 LOC)
    │
    ├─ Route handler validates Zod schema
    ├─ Check determinism boundary (no Math.random)
    ├─ Load seed from request
    │
    ▼
ENGINE DISPATCHER (src/lib/kernel/engine-dispatcher.ts)
    │
    ├─ Lookup domain in registry (27 canonical)
    ├─ Find generator function
    ├─ Pass seed + RNG stream
    │
    ▼
GENERATOR FUNCTION (e.g., generateSprite)
    │
    ├─ Extract genes from seed
    ├─ Use RNG for all randomness
    ├─ Apply quality contract if Tier-1
    ├─ Return Artifact
    │
    ▼
QUALITY CONTRACT (if applicable)
    │
    ├─ Synthesize: Can you create this?
    ├─ Invert: Can you reverse-engineer this?
    ├─ Rate: Score this artifact (0–1)
    ├─ Curated: Is this in the canon?
    ├─ Deterministic: Is it reproducible?
    │
    ▼
COMPOSITION (if multi-domain)
    │
    ├─ Friend × Music: Singing avatar
    ├─ Friend × World: Meet locals
    ├─ World × Quest: Adventure hook
    ├─ Quest × Game: Playable scene
    │
    ▼
EXPORT HANDLER (Choose format)
    │
    ├─ JSON: Raw artifact object
    ├─ GLTF: 3D model
    ├─ WAV: Audio synthesis
    ├─ SVG: Vector graphic
    ├─ PNG: Bitmap
    ├─ MIDI: Sheet music
    ├─ .gseed: Binary seed
    ├─ C2PA: Provenance manifest
    ├─ Code: TypeScript generator
    ├─ ZIP: Archive
    │
    ▼
RESPONSE (with C2PA header)
    │
    └─ Artifact + Signature + Lineage
```

---

## Agent Pipeline: Intent → Artifact

```
USER INTENT (text, image, or audio)
    │
    ▼
STAGE 1: EMBEDDING & RETRIEVAL
    │
    ├─ Embed intent via transformer.js
    ├─ Query seed commons (950+ seeds)
    ├─ Find similar by cosine distance
    │
    ▼
STAGE 2: RETRIEVAL-AUGMENTED GENERATION
    │
    ├─ Load ≥50 similar seeds
    ├─ Score by relevance
    ├─ Add to context window
    │
    ▼
STAGE 3: MULTI-AGENT DELIBERATION
    │
    ├─ Designer Agent    → visual form
    ├─ Musician Agent    → audio/rhythm
    ├─ Architect Agent   → spatial layout
    ├─ Storyteller Agent → narrative
    ├─ Animator Agent    → motion/timing
    ├─ Engineer Agent    → logic/constraints
    ├─ Evolutionary Agent → diversity
    ├─ Oracle Agent      → quality assessment
    │
    │ Each agent votes on domain contribution
    │
    ▼
STAGE 4: SEED GENERATION
    │
    ├─ Unified LLM (gemma4:26b for reasoning)
    ├─ Parse: intent + context → gene values
    ├─ Construct: UniversalSeed with all genes
    ├─ Validate: Against all type contracts
    │
    ▼
STAGE 5: COMPOSITION
    │
    ├─ Apply GSPL operations
    ├─ Breed with corpus examples
    ├─ Mutate for variation
    │
    ▼
STAGE 6: ORACLE EVALUATION
    │
    ├─ Score artifact on all 9 strata
    ├─ Check contract conformance
    ├─ If <threshold: re-evolve with feedback
    ├─ Return with fitness report
    │
    ▼
ARTIFACT (with reproducibility proof)
    │
    └─ (intent, memory_hash, seed_corpus_hash) → deterministic
```

---

## CI/CD: Quality Gates

```
┌────────────────────────────────────────────────────────────────┐
│                    CONTINUOUS INTEGRATION                      │
│                                                                 │
│  Every Commit Runs:                                            │
└────────────────────────────────────────────────────────────────┘

    GATE 1: TYPECHECK
    ├─ npm run typecheck
    ├─ tsc --noEmit (strict mode)
    └─ Status: ✅ 0 errors

    GATE 2: DETERMINISM BOUNDARY
    ├─ npm run determinism:check
    ├─ Check for Math.random / crypto.random* / performance.now
    ├─ Hard violations: ❌ FAIL
    ├─ Wall-clock (Date.now): ⚠️  WARN
    └─ Status: ✅ 0 hard violations

    GATE 3: CANONICAL RENAME
    ├─ npm run lint:canonical-rename
    ├─ Find versioned siblings (-v2, -v3, -enhanced, -gpu)
    ├─ Report groups (Phase 2 collapse)
    └─ Status: ⚠️  19 groups (expected, non-blocking)

    GATE 4: NO EVASION
    ├─ npm run lint:no-evasion
    ├─ Find 'as any', broad catch, @ts-ignore
    ├─ Report with waivers from registry
    └─ Status: ⚠️  279 as-any, 47 catch (tracked, Phase 1 swallow)

    GATE 5: GSPL INTERPRETER
    ├─ npm run test -- tests/gspl/interpreter.test.ts
    ├─ All kernel ops (mutate/breed/grow/evolve)
    └─ Status: ✅ 24/24 tests passing

    GATE 6: GOLDEN HASHES
    ├─ npm run golden:verify
    ├─ Regenerate 30 canonical seeds
    ├─ Compare against committed hashes
    └─ Status: ✅ 30/30 verified

    GATE 7: QUALITY CONTRACTS
    ├─ npm run quality:contract
    ├─ Score all Tier-1 generators on 9 strata
    ├─ Report conformance %
    └─ Status: ✅ 7/7 generators conformant

    GATE 8: FULL TEST SUITE
    ├─ npm run test
    ├─ All unit + integration + e2e
    └─ Status: ✅ 1497/1497 tests passing

    ┌─ ALL GATES GREEN ─┐
    │                    │
    │  ✅ COMMIT PASSES  │
    │                    │
    └────────────────────┘
```

---

## Storage Layout: Reproducibility Cache

```
.paradigm/                          Seed cache + golden hashes
├── golden-hashes.json              30 verified canonical seeds
├── seed-cache/                     Deterministic artifact storage
│   ├── friend/                     Friend artifacts by hash
│   ├── sprite/                     Sprite artifacts by hash
│   ├── game/                       Game artifacts by hash
│   └── ...                         (other domains)
├── lineage-index/                  Seed family trees
└── federation-state/               P2P exchange metadata

data/
├── commons/                        950+ canonical seeds
│   ├── friends.json                Friend corpus
│   ├── worlds.json                 World corpus
│   ├── quests.json                 Quest corpus
│   ├── games.json                  Game corpus
│   └── ...                         (other domains)
└── ...

src/
├── lib/
│   └── (as detailed above)
└── pages/
    └── (React UI entry points)

contracts/                          Smart contract deployment
└── deployments/                    On-chain verification

tests/                              Full test suite
├── contracts/
├── gspl/
├── generators/
├── api/
├── agent/
└── ...
```

---

## Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                  PRODUCTION DEPLOYMENT                      │
└─────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────┐
    │  CDN (Vercel / CloudFlare)          │
    │  - Static assets (JS, CSS, images)  │
    │  - Vite build output                │
    └─────────────┬───────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────────┐
    │  Express Server (Vite Middleware)   │
    │  - server.ts (489 LOC)              │
    │  - 40+ API routes                   │
    │  - WebSocket for agent streaming    │
    │  - Seed generation on-demand        │
    └─────────────┬───────────────────────┘
                  │
        ┌─────────┴──────────┬────────────┐
        │                    │            │
        ▼                    ▼            ▼
    ┌────────┐        ┌──────────┐   ┌─────────┐
    │PostgreSQL        │MongoDB   │   │ Redis   │
    │- Users           │- Artifacts   │- Cache  │
    │- Lineage         │- Metadata    │- RNG    │
    │- Governance      │              │  state  │
    └────────┘        └──────────┘   └─────────┘
        │
        ├─ Seed persistence
        ├─ Oracle results (cached)
        └─ Agent memory (embeddings)

    ┌─────────────────────────────────────┐
    │  Blockchain Layer (Optional)        │
    │  - Ethereum mainnet / Polygon       │
    │  - ParaToken (governance)           │
    │  - SeedNFT (Friend anchor)          │
    │  - Royalty waterfall contracts      │
    └─────────────────────────────────────┘

    ┌─────────────────────────────────────┐
    │  Federation Network (P2P)           │
    │  - Paradigm node 1                  │
    │  - Paradigm node 2                  │
    │  - Paradigm node N                  │
    │  (No central server required)       │
    └─────────────────────────────────────┘
```

---

*Architecture Documentation — Paradigm Absolute v1.0.0*  
*Last Updated: May 31, 2026*
