# PARADIGM REFERENCE REPOSITORY ANALYSIS
# Architectural Insights, Patterns, and Specifications for Main Repo Cleanup

**Analysis Date:** May 15, 2026
**Scope:** PAradigm-reference, paradigm_goe, Paradigm_GSPL_Engine, paradigm-os-platform
**Purpose:** Extract definitive specs, identify gaps, conflicts, and drive main repo cleanup

---

## PART 1: CANONICAL SPECIFICATIONS

### 1.1 DEFINITIVE SEED/GENE/KERNEL SPECS (PAradigm-reference is source of truth)

**UniversalSeed Schema** (spec/01-universal-seed.md - LOCKED)
- Top-level fields: \, \, \, \, \, genes, \, \, \
- Required: gst=1.0, domain (one of 26), hash (SHA256), lineage {parents[], operation, generation, timestamp}
- All gene names must match ^[a-z][a-zA-Z0-9_]*\$ (no \$ prefix allowed)
- 8 Invariants: hash correctness, lineage consistency, gene legality, type legality, domain legality, signature validity, version support
- Operations: canonicalize(), hash(), validate(), sign(), verify(), mutate(), breed(), compose(), distance(), grow()

**The 17 Kernel Gene Types** (spec/02-gene-system.md - LOCKED)
1. scalar - bounded numeric values [0,1] or unbounded
2. categorical - discrete choices from finite sets
3. vector - f64[N] arrays
4. expression - runtime-evaluated math formulas (AST-based)
5. struct - composite records with named fields
6. array - ordered homogeneous collections
7. graph - typed nodes/edges (dialogue trees, dependency networks)
8. topology - surfaces and manifolds (mesh + blend shapes, or SDF)
9. temporal - time-varying signals (keyframed or procedural)
10. regulatory - gene regulatory networks (control networks)
11. field - continuous spatial distributions (SDF composition tree)
12. symbolic - grammar derivations, dialogue trees, story graphs
13. quantum - superposition states with entanglement pointers
14. gematria - symbol-to-numeric mappings (numerological encoding)
15. resonance - harmonic frequency profiles (timbre/material signatures)
16. dimensional - embedding vectors (CLIP-like style embeddings)
17. sovereignty - cryptographic ownership chains (IMMUTABLE - no mutate/crossover)

CRITICAL: Each type implements 6-operator interface:
  - validate(value) -> Result<T, ValidationError>
  - mutate(value, rate, rng) -> T
  - crossover(a, b, rng) -> T
  - distance(a, b) -> number
  - canonicalize(value) -> Bytes
  - repair(value) -> T (optional data healing)

**Deterministic Kernel** (spec/03-kernel.md - LOCKED)
- Core subsystems: DeterministicRng, SeedManifold (Fisher Information), TickCycle (8-phase), EffectSystem, Scheduler
- RNG: xoshiro256** (256-bit state, period 2^256-1) + SplitMix64 (seeding) + FNV-1a (per-gene substreams) + Box-Muller (Gaussian)
- Seed hash (first 8 bytes, LE u64) → SplitMix64 → initialize xoshiro256** state
- Jump-ahead-by-2^128 for non-overlapping per-gene streams
- Distributions: Uniform [0,1) via (next()>>11)*1.0/2^53, Gaussian via Box-Muller, Categorical via cumulative weight search
- TickCycle: intake → validate → plan → mutate → execute → reduce → emit → persist
- EffectSystem: 8 algebraic effects (Read, Write, Random, Time, Network, GPU, Log, Sign)
- All operations MUST be deterministic, pure w.r.t. seed content

**GSPL Language Spec** (spec/04-gspl-language.md - LOCKED)
- 26 Keywords: seed, breed, mutate, compose, evolve, grow, export, import, let, fn, if, else, match, for, while, return, true, false, null, type, trait, impl, where, gene, domain, signed
- ~30 operators: +,-,*,/,%,**,==,!=,<,<=,>,>=,&&,||,!,&,|,^,~,<<,>>,=,|>,..=,.,[]
- 25+ AST node types
- Type system: Hindley-Milner + dependent-type refinements
- Builtins wired to kernel: seed(), mutate(), breed(), grow(), compose(), evolve()
- GPU: @gpu annotation for WGSL codegen
- Parser: recursive descent, precedence climbing

**Sovereignty & Signing** (spec/05-sovereignty.md - LOCKED)
- ECDSA P-256 (NIST curve) + RFC 6979 deterministic nonces
- JWK portable format for keys
- Signature: over canonicalized seed minus \.signature field
- JCS (RFC 8785) canonicalization: sorted keys, no whitespace, deterministic UTF-8
- Content hash: SHA-256 over JCS canonical payload
- Lineage proof: array of parent content hashes

**Binary Format** (spec/06-gseed-format.md & ADR-009 - LOCKED)
- MessagePack serialization for efficiency
- Carries: genes, lineage, sovereignty, hash, metadata
- Not all metadata participates in hash (whitelisted: engine_version, license only)

**Determinism Guarantees** (spec/07-determinism.md - LOCKED)
- Same seed + same RNG = bit-identical output forever
- No walltime reads (except informational \.timestamp)
- No Math.random() except ECDSA nonces
- No network I/O, filesystem state, environment variables
- No floating-point ops with CPU-architecture dependence
- Integer arithmetic preferred for hash-critical paths
- GPU determinism requires WGSL portable subset + vendor cross-validation

### 1.2 ADRs (Architecture Decision Records) - DEFINITIVE

All 11 ADRs are ACCEPTED and locked:

| ADR | Title | Key Decision |
|---|---|---|
| 001 | Deterministic kernel | All operations must be deterministic; no OS RNG |
| 002 | JCS canonicalization | RFC 8785 for JSON serialization in hashing |
| 003 | xoshiro256** RNG | Period 2^256-1, jump-ahead for substreams |
| 004 | ECDSA P-256 signing | NIST P-256 with RFC 6979 deterministic nonces |
| 005 | GSPL pure language | Algebraic effects for side effect isolation |
| 006 | Domain engine pattern | Staged pipelines, all engines siblings (no nesting) |
| 007 | MAP-Elites default | Quality-diversity algorithm as evolution default |
| 008 | Functor composition | Category-theoretic functors for cross-domain bridges |
| 009 | .gseed binary format | MessagePack core, not Protocol Buffers or BSON |
| 010 | Fastify+Postgres stack | Backend: Fastify, PostgreSQL + pgvector, Redis |
| 011 | C2PA compliance | Coalition for Content Provenance embedded in artifacts |

**Critical Note:** ADRs are immutable once accepted. Any change requires a NEW ADR that supersedes.

### 1.3 COMPLIANCE REQUIREMENTS

**C2PA (Coalition for Content Provenance and Authenticity)** - ADR-011
- 6,000+ member organizations (as of 2026)
- Cryptographically signed content credentials
- Becoming legally required in select jurisdictions
- Binds artifact to sovereign author + provenance chain
- Focus: transparency on AI-generated content

**EU AI Act Article 50** - compliance/eu-ai-act-article-50.md
- Enforcement: August 2026
- Requires machine-readable AI disclosure on AI-generated content
- Brief 010 is canonical risk assessment

**California SB 942** - compliance/california-sb-942.md
- Effective: January 2026
- Requires AI transparency metadata

**WCAG 2.1 AA** - compliance/wcag-2-1-aa.md
- Web Content Accessibility Guidelines
- Target level for Creation Studio

---

## PART 2: ENGINE SPECIFICATION PATTERNS

### 2.1 27-DOMAIN TARGET SPECIFICATION

**15 Implemented Engines** (as of April 2026):
1. Sprite - PNG atlas + metadata
2. Character - glTF rigged mesh + animations
3. Music - WAV + MIDI
4. FullGame - HTML5 zip (playable game)
5. Geometry3D - glTF mesh
6. Animation - glTF animation
7. Procedural - layered assets (heightmap, biomes)
8. Narrative - structured story (plot, characters, arc)
9. UI - HTML/CSS bundle
10. Physics - simulation params + trajectories (JSON + preview)
11. Visual2D - PNG/SVG
12. Audio - WAV samples (5-30 sec)
13. Ecosystem - species interaction graph (Lotka-Volterra)
14. Game - game mechanic spec (rules, win/lose conditions)
15. ALife - cellular automaton (Conway's Game of Life or custom)

**11 Planned Engines**:
16. Shader - WGSL/GLSL source (real-time 60fps)
17. Particle - particle system spec (JSON config)
18. Typography - typeface with glyphs (TTF/OTF)
19. Architecture - building with floorplan (GLTF)
20. Vehicle - vehicle model + dynamics (GLTF + JSON specs)
21. Furniture - parametric furniture (GLTF)
22. Fashion - garment mesh + drape (GLTF, Marvelous Designer export)
23. Robotics - robot with DOF (URDF + control policy)
24. Circuit - circuit schematic (KiCad/Gerber)
25. Food - recipe + nutrition (PDF recipe, JSON nutrition)
26. Choreography - dance motion sequence (BVH, FBX)
27. Agent - running agent config (JSON config, WebSocket API)

**Engine Pattern** (architecture/engine-pattern.md)
- All engines conform to DomainEngine interface
- Staged pipeline: extract → process* → render → export
- Pure deterministic functions (input seed, RNG, engine_version) → Artifact
- Independent siblings (no engine calls another; composition via functors)
- Each engine defines:
  * Gene schema (named genes with types, ranges, required/optional)
  * Stage pipeline (ordered deterministic stages)
  * Render hints (2D/3D/audio/game/text viewport mode)
  * Export hints (supported formats, recommended format)
  * Fitness hints (meaningful QualityVector axes, MAP-Elites descriptors)
  * Determinism notes (floating-point hot spots, GPU parity tests)
  * Validation rules (cross-gene constraints, output size bounds)
  * Anti-patterns (things to avoid)

### 2.2 CROSS-DOMAIN COMPOSITION (12 Functor Bridges)

Bridges defined in architecture/cross-domain-composition.md:
- Character → Sprite (2D projection)
- Character → Animation (skeletal motion)
- Character → Fashion (garment morphing)
- Music → Audio (audio synth)
- Music → Choreography (rhythm-driven dance)
- Geometry3D → Physics (collision mesh extraction)
- Visual2D → Shader (style transfer)
- Procedural → Geometry3D (heightmap to mesh)
- ... 4 more (full list in composition.ts:214 lines)

**Functor Pattern:**
- Gene-to-gene correspondence (e.g., character.palette → sprite.color_palette)
- Artifact-to-artifact correspondence (e.g., character mesh → sprite projection)
- Coherence scoring function (how well does the target capture the source?)

---

## PART 3: GAP ANALYSIS (Reference Specs vs Main Repo Implementation)

### 3.1 CRITICAL SPEC-IMPL GAPS

**GSPL Interpreter Integration** (CRITICAL)
- Spec: interpreter.mutate() calls gene_system.mutateGene()
- Main Repo: interpreter.mutate() uses basic Math.random() modifications
- Main Repo: interpreter.breed() doesn't call gene_system.crossoverGene()
- Main Repo: interpreter.grow() NOT IMPLEMENTED
- Status: Integration layer missing; backend kernels exist separately
- Fix: Wire builtins to kernel (Phase 2 in current plan)

**Gene Type Completeness** (MEDIUM)
- Spec: 17 types (all defined in spec/02)
- Main Repo: 15 types implemented (missing quantum, gematria)
- quantum, gematria needed for: stylistic superposition, numerological narrative grounding
- Status: Low priority for MVP but locks out advanced use cases
- Fix: Implement per Brief 020 (deferred to Phase 2)

**Sovereignty Signing** (MEDIUM)
- Spec: Every seed carries ECDSA P-256 signature (RFC 6979)
- Main Repo: Sovereignty gene type exists but signing not wired end-to-end
- Status: Sign-time gate not yet enforced
- Fix: Wire signature creation/verification in seed operations

**GPU Determinism** (LOW-MEDIUM)
- Spec: @gpu annotation for WGSL codegen, determinism verified across vendors
- Main Repo: GPU layer exists but not determinism-verified
- Status: GPU used for rendering, not critical path generation
- Fix: Add GPU parity matrix (Brief 196)

**Agent Intelligence** (CRITICAL)
- Spec: GSPLAgent (5-stage pipeline, 8 sub-agents, memory system)
- Main Repo: Regex-only placeholder
- Status: Agent is the population engine for commons; needed for P0-2
- Fix: Implement per intelligence/gspl-agent.md + P0-2 full-capacity spec

### 3.2 SPEC CLARIFICATIONS NEEDED IN MAIN REPO

**Content Hash Domain** (RESOLVED in reference, needs confirmation in main)
- Spec clarification (research/synthesis.md): content hash is UNCOMPRESSED canonical payload
- This affects .gseed file format and ZIP storage
- Status: LOCKED in reference repo (April 2026 pass); main repo should align

**Fitness QualityVector Definition** (CLEAR in reference)
- 6-dimensional metric: geometry, texture, animation, coherence, style, novelty
- Each component in [0, 1]
- Per-domain meaningful axes defined in each engine spec
- Status: In spec but implementation sparse

**Tick Cycle Strictness** (DEFINED)
- 8 phases STRICTLY ordered, no skipping
- If any phase fails, entire operation aborts
- Phase invariants documented
- Status: Defined in spec/03; main repo should formalize

### 3.3 NO CONFLICTS FOUND

The reference repo (PAradigm-reference) and main repo (Paradigm) are **not conflicting**; reference is the spec that main implements. Key findings:

**paradigm_goe** (GOE repo):
- Contains copies of reference specs (in data/spec/)
- Implements engines on top of same spec
- Can be consolidated into main repo or treated as reference implementation
- No conflicting specs; just different dev track

**Paradigm_GSPL_Engine**:
- Contains briefs, research documents, and monorepo setup attempts
- No new specs; all source from reference repo
- Should be consolidated

**paradigm-os-platform**:
- React/Next.js frontend attempt
- Not spec-conflicting; different UX layer

---

## PART 4: MVP DEFINITION (THE CRITICAL DOCUMENT)

**MVP_DEFINITION.md** in reference repo is THE definitive scope statement:

**MVP = smallest configuration of GSPL still satisfying the 7-axis discipline + 8 engine targets + 231 briefs + 1,064 inventions**

**Not optional (literally):**
- All 231 research briefs (231 invoked to mean "complete")
- All 1,064 inventions across 7 rounds of research
- All 17 kernel gene types
- All 13 pattern libraries (Tier B)
- All 12 genre recipes (Tier E)
- All 8 engine export targets (Tier D)
- All 11 platform store targets (Tier H - Brief 226)
- All 6 federated network surfaces (Tier F)
- **All 7 axes: signed, typed, lineage-tracked, graph-structured, confidence-bearing, rollback-able, differentiable**

**Build sequence (ordered to minimize rework):**
1. Phase 1.0 (weeks 1-4): Substrate kernel verification
2. Phase 1.1 (weeks 5-10): Tier A primitives (152-164)
3. Phase 1.2 (weeks 8-14, parallel): Tier G developer experience (217-223) - needed EARLY
4. Phase 1.3 (weeks 12-20): Tier B pattern libraries (165-176)
5. Phase 1.4 (weeks 16-26): Tier C authoring surfaces (177-187)
6. Phase 1.5 (weeks 20-32): Tier D engine export pipelines (188-195)
7. Phase 1.6 (weeks 28-36): Tier E genre recipes (197-208)
8. Phase 1.7 (weeks 30-42): Tier F multiplayer/live-service (209-216)
9. Phase 1.8 (weeks 36-48): Tier H cross-cutting/governance (224-230)
10. Phase 1.9 (weeks 44-52): Final integration and MVP test

---

## PART 5: STRATEGIC GAPS (P0/P1/P2 Priority Tiers)

From STRATEGIC_GAP_AUDIT.md:

### P0 — Unblock adoption TODAY (next 90 days)

**P0-1: Seed Commons Materialization** (8 → 1,000 seeds)
- Current: examples/ has ~8 demo seeds
- Target: seed-commons/ with 1,000 canonical seeds across 26 domains
- Files needed: primitives/, libraries/, inventories/{13 categories}, recipes/, validation/
- Effort: Bulk mechanical work; Full-Capacity Agent (P0-2) does it autonomously
- Blocker removed: P0-2 agent

**P0-2: Full-Capacity GSPL Agent** (the population engine)
- Current: agent.ts is regex-only placeholder
- Target: Sovereign self-bootstrapping agent with tool layer
- Tools: web_search, browse_page, code_execution, evolution_run, multimodal_analyze
- Self-loop: uses only validated GSPL seeds as training data
- Local fine-tune: QLoRA + Unsloth on commodity GPUs
- Effort: 1 week spec + 2-3 weeks tool layer + 1-2 weeks self-loop + 7-14 days training
- Impact: exponential commons growth

**P0-3: Live Public MVP** (no demo → web studio in browser)
- Current: No live demo, no CLI
- Target: Web-based studio (3-4 engines + basic agent + breed/sign/export)
- Try-a-seed experience: prompt → grow → sign → export in 60 seconds
- Effort: 60-90 day engineering sprint
- Impact: adoption curves don't bend for specs; they bend for working software

**P0-4: Validation & CI for Commons** (open PRs without gates → self-policing)
- Current: No CI harness
- Target: grow.ts, determinism.ts, signature.ts, commons-lint.ts, graph.ts, .github/workflows/commons-ci.yml
- Auto-runs on every commons PR
- Effort: 1-2 weeks (thin wrappers around kernel)

### P1 — Unblock growth (next 6 months)

**P1-1:** 11 remaining engine bootstraps (Shader, Particle, Vehicle, Fashion, etc.)
- Need minimum viable doc + stdlib.gspl + 20-50 seeds per engine
- Effort: 1-2 weeks per engine with agent assist

**P1-2:** Business model doc (optional services layered on open spec)
- Revenue: hosted inference tiers, federation hosting, enterprise SLA, marketplace fees
- Constraint: 100% free forever (substrate is open)

**P1-3:** Ecosystem & distribution (SDKs + shareable URLs)
- Unity/Unreal/Godot/.blend importer plugins
- Shareable URLs: .gseed in browser instantly
- Effort: 2-4 weeks per SDK; full set 4-6 months

**P1-4:** IP strategy (patents on mechanisms while keeping spec open)

### P2 — Unblock scale (next 12-24 months)

**P2-1:** Marketplace + federation reference implementation
**P2-2:** Full 1,000-seed armory populated
**P2-3:** Cross-engine parity test suite (60 fixtures × 8 engines)
**P2-4:** Round 4 libraries materialized (chemistry, physics, materials, biology, music, language, culture)

---

## PART 6: SOURCE OF TRUTH BY COMPONENT

| Component | Source of Truth | Location | Status |
|---|---|---|---|
| UniversalSeed schema | spec/01 + ADR-002,004,009 | PAradigm-reference | LOCKED |
| 17 Gene types | spec/02 | PAradigm-reference | LOCKED |
| Kernel subsystems | spec/03 + ADR-001,003,005 | PAradigm-reference | LOCKED |
| GSPL language | spec/04 | PAradigm-reference | LOCKED |
| Sovereignty model | spec/05 + ADR-004 | PAradigm-reference | LOCKED |
| .gseed format | spec/06 + ADR-009 | PAradigm-reference | LOCKED |
| Determinism rules | spec/07 + ADR-001 | PAradigm-reference | LOCKED |
| 26 domain engines | engines/*.md | PAradigm-reference | 15 locked, 11 planned |
| Cross-domain functors | architecture/cross-domain-composition.md | PAradigm-reference | LOCKED (12 bridges) |
| Evolution algorithms | architecture/evolution-stack.md | PAradigm-reference | LOCKED (7 algos) |
| GSPL agent | intelligence/gspl-agent.md + siblings | PAradigm-reference | Skeleton (architecture defined) |
| MVP scope | MVP_DEFINITION.md | PAradigm-reference | LOCKED (231 briefs, 1,064 inventions) |
| Strategic gaps | STRATEGIC_GAP_AUDIT.md | PAradigm-reference | PRIORITY ROADMAP |
| Compliance | compliance/*.md | PAradigm-reference | C2PA, EU AI Act, CA SB 942 |
| Implementation | src/lib/kernel/*.ts | Paradigm (main repo) | ~70% complete |

---

## PART 7: RECOMMENDATIONS FOR MAIN REPO CLEANUP

### 7.1 IMMEDIATE ACTIONS (Week 1-2)

1. **Codify the 7-Axis Discipline** as a structural code pattern
   - Every mutation/gene type/CLI command must demonstrate all 7 axes in tests
   - Add pre-commit linter that rejects code dropping an axis

2. **Wire GSPL Interpreter to Kernel**
   - interpreter.mutate() → gene_system.mutateGene()
   - interpreter.breed() → gene_system.crossoverGene()
   - interpreter.grow() → engines.growSeed()
   - Add determinism tests proving identical outputs

3. **Formalize Tick Cycle**
   - Enforce 8-phase strict ordering in type system
   - Add phase invariant tests
   - Abort operation if any phase fails

4. **Lock Down Content Hash Definition**
   - Confirm: hash is UNCOMPRESSED JCS canonical payload
   - Update .gseed serialization docs
   - Add round-trip tests

### 7.2 PHASE 1 SEQUENCE (2-4 months)

Follow the MVP definition build order exactly:
1. Substrate kernel verification (all tests passing)
2. Tier A primitives (152-164 from briefs)
3. **Tier G (217-223) IN PARALLEL** — CLI/LSP/debugger/profiler needed early
4. Tier B pattern libraries (165-176)
5. Tier C authoring surfaces (177-187)
6. Tier D engine export pipelines (188-195) with parity matrix
7. Tier E genre recipes (197-208)
8. Tier F multiplayer/live-service (209-216)
9. Tier H cross-cutting governance (224-230)
10. Final integration: The MVP test

### 7.3 STRATEGIC PRIORITIES (Next 90 days)

**Highest leverage:**
1. **P0-2: Full-Capacity Agent** — enables exponential commons growth
2. **P0-1: Seed Commons** — 1,000 canonical seeds (agent-powered)
3. **P0-3: Live Studio** — no creator cares about a spec; they care about working software
4. **P0-4: Commons CI** — gates ensure quality as PRs scale

These four move adoption from 0% to escape velocity.

### 7.4 CONSOLIDATION (Optional but recommended)

- Merge paradigm_goe data/spec/ into main repo (specs already match)
- Fold Paradigm_GSPL_Engine research into main repo /research
- Treat paradigm-os-platform as an alternate frontend (can coexist)
- Single source of truth: Paradigm (main repo) + PAradigm-reference (canonical spec)

---

## PART 8: SPEC CONSISTENCY VERDICT

**Conflicts:** NONE found
**Gaps in main repo:** Several (wiring, agent, some engines)
**Clarifications needed:** Minor (content hash domain, fitness vectors already clear)
**Lock status:** 100% of critical spec is locked in reference repo (Rounds 1-6.5, 151 briefs, 576 inventions)
**Building on this:** Round 7 spec adds 80 briefs, 488 inventions (tiers A-H), still all locked

---

**Prepared by:** Paradigm architecture analysis for main repo cleanup
**Next action:** Adopt 7-axis discipline + wire interpreter + begin Phase 1 sequence

