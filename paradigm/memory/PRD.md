# Paradigm — Genetic Computing Platform PRD

## Original Problem Statement
Build Paradigm, a groundbreaking genetic computing platform where every digital artifact is encoded as a living genetic blueprint called a "seed." Full 7-layer architecture with Creation Studio, 17-type gene system, 26 domain engines, MAP-Elites evolution, ECDSA P-256 sovereignty, and GPT-5.2 powered GSPL Agent.

## Architecture
- **Backend**: FastAPI + MongoDB + Emergent LLM (GPT-5.2)
- **Frontend**: React + Tailwind + Zustand + Three.js + D3 + Shadcn UI
- **7 Layers**: Kernel → Seed System → GSPL → Domain Engines → Evolution → Intelligence → Studio

## What's Been Implemented

### Phase 1 (2026-04-09)
- kernel.py: xoshiro256** deterministic RNG, SHA-256 hashing, JCS canonicalization
- gene_system.py: All 17 gene types with validate/mutate/crossover/distance operators
- sovereignty.py: ECDSA P-256 key generation, signing, verification
- evolution.py: MAP-Elites, GA, fitness evaluation, seed distance
- engines.py: 5 initial domain engines (Character, Sprite, Music, Visual2D, Procedural) + generic fallback
- agent.py: GSPL Agent using GPT-5.2 for concept-to-seed pipeline with fallback templates
- server.py: 16 API endpoints covering CRUD, generation, mutation, breeding, evolution, signing, growing
- Landing Page: Hero, 7-layer architecture display, 5 core inventions, stats bar
- Creation Studio: 3-panel layout with Gallery, Lineage, Viewport, Gene Editor, Evolve, Breed, Export

### Phase 2 (2026-04-09) - COMPLETED
- **GSPL Parser** (gspl_parser.py): Full lexer, AST builder, type checker for Genetic Seed Programming Language
- **Cross-Domain Composition** (composition.py): 9 functor bridges, path-finding between domains
- **Seed Library** (seed_library.py): 20 curated base seeds across 11 categories
- **All 26 Domain Engines** (engines.py): Character, sprite, music, visual2d, procedural, fullgame, animation, narrative, ui, physics, audio, ecosystem, game, alife, shader, typography, architecture, vehicle, furniture, fashion, robotics, circuit, food, choreography, geometry3d, particle
- **Three.js 3D Preview Viewport**: Pure Three.js renderer with domain-specific meshes, orbit controls, 3D/2D toggle
- **Force-Directed Lineage Graph**: SVG-based with custom force simulation, node sizing by fitness, color-coded by domain
- **GSPL Editor UI**: Code editor with Parse/Run buttons, error/warning display, type environment viewer
- **Composition Panel UI**: Domain selector, path finder, compose button, functor graph mini-view
- **Seed Library UI**: Category filtering, seed browser, one-click import
- **Studio Tabs**: Left (Gallery/Lineage/Library), Right (Genes/Evolve/Breed/Compose/GSPL/Export)
- **Full API**: 20+ endpoints including GSPL parse/execute, composition graph/path/compose, library browse/import, engines listing

## Testing Status
- Backend: 100% (22/22 tests passed)
- Frontend: 100% (all UI components and integrations working)
- Test report: /app/test_reports/iteration_2.json

## Core Requirements
- Zero global variables (Zustand stores)
- Deterministic: xoshiro256** RNG, content-addressed SHA-256 hashing
- Pure functions for gene operators and engines
- 17 gene types: scalar, categorical, vector, expression, struct, array, graph, topology, temporal, regulatory, field, symbolic, quantum, gematria, resonance, dimensional, sovereignty

## P0 (SHIPPED)
- Full seed CRUD + generation + mutation + breeding + evolution
- ECDSA P-256 sovereignty (sign/verify)
- GPT-5.2 GSPL Agent
- All 26 domain engines
- GSPL Language parser with lexer, AST, type checker
- Three.js 3D preview viewport with orbit controls
- Cross-domain composition with functor bridges
- Seed library with 20 base seeds
- Force-directed lineage graph
- Studio UI with all panels integrated

## Phase 1: API Integration (COMPLETED)
- /api/compile - End-to-end compile endpoint
- /api/pipeline/status - Pipeline status
- /api/audio/synthesize - Single sound generation
- /api/audio/profile - Complete audio profile
- /api/behavior/compile - Behavior tree generation
- /api/behavior/decide - Runtime decision making
- /api/quality/{seed_id} - Quality scoring

## Phase 2: Production Quality (COMPLETED)
- worker_pool.py - Async task queue
- database_setup.py - MongoDB indexes
- sprite_blueprint.py - Intelligent sprite system
- audio_synthesis.py - Pure procedural audio
- behavior_compiler.py - Gene-to-behavior-tree
- pipeline.py - End-to-end runner with quality validation

## P1 (Next)
- Sprite intelligence integration with domain engine
- SDF detail system (faces, hands, equipment)
- Live preview hot-reload
- Enhanced GSPL editor

## P2 (Future)
- WGSL codegen from GSPL
- Multi-user collaboration
- Seed trading/marketplace with royalties
- Prometheus/Grafana observability
- AURORA and POET evolution algorithms
- Marketplace & federation layer
- Game engine integrations (Unity, Godot)
