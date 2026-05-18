# PARADIGM ABSOLUTE: COMPREHENSIVE EXECUTION PLAN
## v1.0 "Full Glory" — Spec-to-Codebase Completion

**Prepared:** May 15, 2026  
**Target release:** August 22, 2026 (14 weeks)  
**Commitment:** Quality-first, full scope, all 27 domains playable, DAO+v1.0  
**Team:** 4 engineers (kernel lead, 2 domain engineers, frontend/AI engineer)  
**Reference:** PAradigm-reference (7 specs, 11 ADRs, 231 briefs, 1,064 inventions)

---

## TABLE OF CONTENTS
- [Strategic Architecture](#strategic-architecture)
- [Phase 0: Foundation (Weeks 1-2)](#phase-0-foundation-weeks-1-2)
- [Phase 1: Core Integration (Weeks 3-5)](#phase-1-core-integration-weeks-3-5)
- [Phase 2: Domain Elevation (Weeks 6-9)](#phase-2-domain-elevation-weeks-6-9)
- [Phase 3: AI & Composition (Weeks 10-12)](#phase-3-ai--composition-weeks-10-12)
- [Phase 4: Polish & Launch (Weeks 13-14)](#phase-4-polish--launch-weeks-13-14)
- [Architecture Decisions & Tradeoffs](#architecture-decisions--tradeoffs)
- [Success Metrics & Definition of Done](#success-metrics--definition-of-done)
- [Risk Register](#risk-register)
- [Appendix A: Reference-to-Codebase Mapping](#appendix-a-reference-to-codebase-mapping)
- [Appendix B: File Inventory by Phase](#appendix-b-file-inventory-by-phase)
- [Appendix C: DAO & Sovereignty Architecture](#appendix-c-dao--sovereignty-architecture)
- [Appendix D: Agent Specification](#appendix-d-agent-specification)

---

## STRATEGIC ARCHITECTURE

### The Core Guarantee
```
same seed + same deterministic RNG + same engine version = bit-identical artifact forever
```

### System Layers (from bottom to top)

```
Layer 7:  STUDIO (React 19, Three.js, Web Audio, Canvas, Game Iframes)
Layer 6:  API / Backend (Express, 65+ endpoints, Postgres, Redis)
Layer 5:  INTELLIGENCE (Full-Capacity Agent, 8 sub-agents, memory, tools)
Layer 4:  COMPOSITION (50+ functor bridges, BFS pathfinding, coherence)
Layer 3:  EVOLUTION (GA, MAP-Elites, CMA-ES, Novelty, AURORA, DQD, POET)
Layer 2:  DOMAIN ENGINES (27 engines, staged pipelines, deterministic)
Layer 1:  GSPL LANGUAGE (lexer, parser, type checker, interpreter, stdlib)
Layer 0:  KERNEL (xoshiro256** RNG, 17-type gene system, seed, effects)
```

### Key Architectural Decisions (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent language | TypeScript | Unified runtime with main repo |
| DAO blockchain | Ethereum (Hardhat + Solidity) | Existing setup, battle-tested |
| Seed format | JSON (storage) + .gseed (export) | Debuggability + portability |
| Commons strategy | 50 curated → 950 agent-generated → human verify | Quality + scale |
| Cross-repo port | Selective (libraries, inventories, validation) | Executable > reference |
| Project structure | Single monorepo | Simpler than multi-repo |

---

## PHASE 0: FOUNDATION (Weeks 1-2)

**Objective:** Clean, single-source-of-truth repository with verified build baseline.

### P0.1 Repository Cleanup & Cross-Repo Port (Days 1-3)

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 0.1.1 | Archive temp directories | repo_copy/, repo_latest/, planning_here/, playwright-report/, test-results/ → .archive/ | 1 hr |
| 0.1.2 | Consolidate 60 root .md docs | Move execution records → docs/history/, status docs → docs/status/CURRENT_STATUS.md. Keep: README.md, PARADIGM_DEFINITIVE_SCOPE.md, DEPLOY.md, CONTRIBUTING.md, TESTING_GUIDE.md | 3 hr |
| 0.1.3 | Port seed-commons libraries | PAradigm-reference/seed-commons/libraries/*.gspl → data/commons/libraries/ (17 files: biology.gspl, chemistry.gspl, physics.gspl, music_audio.gspl, materials.gspl, etc.) | 4 hr |
| 0.1.4 | Port seed-commons inventories | PAradigm-reference/seed-commons/inventories/*.gspl → data/commons/inventories/ (20 files) | 6 hr |
| 0.1.5 | Port seed-commons validation | PAradigm-reference/seed-commons/validation/* → tests/commons/validation/ (5 files) | 2 hr |
| 0.1.6 | Port example seeds | PAradigm-reference/examples/*.gspl, *.gseed.json → examples/ | 1 hr |
| 0.1.7 | Update .gitignore | Add .archive/, test-results/, coverage/ patterns | 15 min |
| 0.1.8 | Verify ported files are syntactically valid | Run GSPL parser on all ported .gspl files, fix any incompatibilities | 4 hr |

**Verification:** `npm run typecheck` passes, all ported .gspl files parse successfully, git status clean

### P0.2 Seed Architecture Unification (Days 4-7)

**Current state:** Two competing implementations creating type fragmentation.
- `src/seeds/universal-seed.ts` (420 lines) — modern, Map-based genes, intended canonical
- `src/lib/kernel/seed-class.ts` (482 lines) — legacy, object-keyed genes, DEPRECATED

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 0.2.1 | Audit all imports of seed-class.ts | Find every usage of `import { Seed }` or `from './seed-class'` across all src/ | 1 hr |
| 0.2.2 | Extend UniversalSeed with missing operators | Ensure clone(), toJSON(), fromJSON() are on UniversalSeed. Add distance() if missing. Seed-class.ts methods: mutate, crossover, distance, validate, serialize | 1 day |
| 0.2.3 | Migrate kernel evolution algorithms | Update `src/lib/evolution/ga.ts`, `map-elites.ts`, `cmaes.ts`, `functors.ts` to use UniversalSeed | 1 day |
| 0.2.4 | Migrate GSPL interpreter | Update `src/gspl/interpreter.ts` to return UniversalSeed | 1 day |
| 0.2.5 | Migrate server.ts seed operations | Update all CRUD/mutate/breed/evolve routes to UniversalSeed | 1 day |
| 0.2.6 | Add deprecation warning to seed-class.ts | Mark file as @deprecated with migration instructions | 15 min |
| 0.2.7 | Update type exports | `src/types/seed.ts`, `src/lib/kernel/types.ts` to export UniversalSeed | 1 hr |
| 0.2.8 | Run full test suite to verify | `npm run test`, fix any failures from migration | 4 hr |

**Spec reference:** `spec/01-universal-seed.md` (lines 1-182) — canonical schema, invariants, operations  
**Verification:** All 7 invariants checked by validate(), all tests pass, no references to seed-class.ts remain in src/

### P0.3 Fix Weak Hash Function (Day 7)

**Current state:** `src/lib/kernel/seed-class.ts` lines 22-29 uses 32-bit hash (collision risk, not SHA-256)

| Task | Description | Effort |
|------|-------------|--------|
| 0.3.1 | Replace hash function with `canonical.ts` SHA-256 | 4 hr |
| 0.3.2 | Verify hash collision resistance | Test: 1M random seeds, zero collisions | 2 hr |
| 0.3.3 | Update all hash-dependent code | canononicalize, sign, verify, lineage | 2 hr |
| 0.3.4 | Add hash versioning prefix | Results in `sha256:7f8b...` format per spec | 1 hr |

**Spec reference:** `spec/01-universal-seed.md` lines 59-60, `spec/05-sovereignty.md`  
**Verification:** `hash(seed)` produces `sha256:7f8b...` format, collision-free across 1M seeds

### P0.4 Cross-Repo Documentation (Day 8-10)

| Task | Description | Effort |
|------|-------------|--------|
| 0.4.1 | Create docs/reference/ with spec summaries | Mirror key spec/00-07 as reference-index.md, link to full PAradigm-reference | 1 day |
| 0.4.2 | Create docs/architecture/ with ADR summaries | Commissioned decision records for key architecture choices | 1 day |
| 0.4.3 | Create docs/status/ with CURRENT_STATUS.md | Single source of truth for project state, known issues, next priorities | 4 hr |
| 0.4.4 | Update README.md | Clean, production-grade README with badges, architecture diagram, quickstart | 4 hr |

### P0.5 Build Baseline Verification (Day 10)

| Task | Effort |
|------|--------|
| Clean install: `rm -rf node_modules; npm install` | 10 min |
| Build: `npm run build` | 2 min |
| TypeScript check: `npm run typecheck` | 5 min |
| Test run: `npm run test` | 10 min |
| Coverage: `npm run test:coverage` | 15 min |
| Determine check: `npm run determinism:check` | 2 min |
| Lint: `npm run lint:ci` | 2 min |
| Document baseline in docs/baseline/BUILD_BASELINE.md | 2 hr |

**Deliverable:** BUILD_BASELINE.md with:
- Build duration
- Bundle size (expect ~1.8MB)
- Test count + pass rate
- Code coverage %
- Known warnings
- Platform compatibility notes (Node version, OS, browser)

---

## PHASE 1: CORE INTEGRATION (Weeks 3-5)

**Objective:** All 17 gene types operational, GSPL produces real artifacts, determinism verified, sovereignty signing working, DAO contracts audited.

### P1.1 Complete 17-Type Gene System (Days 11-16)

**Spec reference:** `spec/02-gene-system.md` (lines 1-347) — the 17 types, operator interface, per-type semantics  
**Current:** ~10 types with 4 of 6 operators  
**Target:** All 17 types with all 6 operators (validate, mutate, crossover, distance, canonicalize, repair)

**Missing gene types to implement in `src/lib/kernel/gene_system.ts`:**

| # | Type | Validation | Mutation | Crossover | Distance | Canonicalize | Repair | Effort |
|---|------|------------|----------|-----------|----------|--------------|--------|--------|
| 8 | `topology` | Surface/manifold structure check | Subdivision perturbation | Topological blend | Wasserstein metric | Mesh canonicalization | Close holes, fix normals | 2 days |
| 9 | `temporal` | Already exists as partial | Already works | Already works | Already works | Add canonical keyframe serialization | Add keyframe repair | 0.5 day |
| 10 | `regulatory` | GRN structure validity | Edge weight mutation | Subnetwork swapping | Graph edit distance | Sorted node/edge serialization | Prune disconnected nodes | 1 day |
| 11 | `field` | Spatial distribution valid | Gaussian process perturbation | Field interpolation | L2 distance | Grid sampling canonical | Clamp to valid range | 1 day |
| 12 | `symbolic` | S-expression validity | Subtree mutation | Subtree crossover | Tree edit distance | Sorted S-expression | Well-formedness repair | 1 day |
| 13 | `quantum` | State vector normalization | Unitary evolution | State entanglement swap | Fidelity / trace distance | Amplitude canonicalization | Renormalize | 1.5 days |
| 14 | `gematria` | Numerological mapping validity | Value offset mutation | Interpolation | Numeric distance | Fixed-precision value | Clamp to valid range | 0.5 day |
| 15 | `resonance` | Frequency profile validity | Frequency perturbation | Spectral interpolation | Spectral divergence | Peak list canonical | Clamp to audible range | 0.5 day |
| 16 | `dimensional` | Embedding vector norm | Additive noise | Interpolation | Cosine distance | Normalized canonical | Re-normalize | 0.5 day |
| 17 | `sovereignty` | Key/signature validity | FORBIDDEN (type system) | FORBIDDEN (type system) | Binary (differs/identical) | Field-ordered canonical | Re-sign | 1 day |

**Add missing operators to ALL 17 types:**

| Operator | Status | Action | Effort |
|----------|--------|--------|--------|
| `validate()` | ✅ ✅ Present on 10+ types | Add to remaining 7 | 1 day |
| `mutate()` | ✅ Present | Verify determinism | 0.5 day |
| `crossover()` | ✅ Present | Verify determinism | 0.5 day |
| `distance()` | ✅ Present | Verify all types | 0.5 day |
| `canonicalize()` | ❌ Missing | Add to all 17 types | 2 days |
| `repair(value)` | ❌ Missing | Add to all 17 types | 1 day |

**Verification:** Property-based tests (fast-check) for each type:
- `validate(valid value)` → passes
- `validate(invalid value)` → fails
- `mutate(a, 0, rng)` → returns a (zero-rate identity)
- `mutate(a, rate, rng1) == mutate(a, rate, rng1)` (determinism)
- `crossover(a, b, rng1) == crossover(a, b, rng1)` (determinism)
- `distance(a, b) == distance(b, a)` (symmetry)
- `distance(a, a) == 0` (identity)
- `canonicalize(a) == canonicalize(a)` (stable)
- `repair(validate(invalid))` → passes

### P1.2 Wire GSPL Builtins to Kernel (Days 14-15)

**Spec reference:** `spec/04-gspl-language.md`, `language/stdlib.md`  
**Current:** GSPL builtins return mock values instead of calling actual kernel

**File:** `src/gspl/interpreter.ts` lines 34-100

```typescript
// CURRENT (stub):
'mutate': async (args) => {
  return { type: 'Seed', value: { ...mockSeed } }  // MOCK
}

// TARGET:
'mutate': async (args) => {
  const seed = args[0].value
  const rate = args[1]?.value ?? 0.1
  const rng = (this as any)._rng
  if (!rng) throw new GSPLError('RNG not available')
  
  const mutatedGenes = {}
  for (const [name, gene] of Object.entries(seed.genes)) {
    mutatedGenes[name] = mutateGene(gene.type, gene.value, rate, rng, gene.schema)
  }
  
  return {
    type: 'Seed',
    value: new UniversalSeed({
      ...seed,
      genes: mutatedGenes,
      $lineage: {
        parents: [seed.$hash],
        operation: 'mutate',
        generation: seed.$lineage.generation + 1,
        timestamp: deterministicTimestamp()
      }
    })
  }
}
```

**Builtins to wire (from `language/stdlib.md`):**

| Builtin | Kernel Function | File | Effort |
|---------|----------------|------|--------|
| `mutate(seed, rate)` | `mutateGene()` | `gene_system.ts` | 0.5 day |
| `breed(a, b)` | `crossoverGene()` | `gene_system.ts` | 0.5 day |
| `grow(seed)` | `growSeed()` | `engines.ts` | 0.5 day |
| `evolve(pop, fn, gens)` | `EvolveStep()` | `ga.ts` | 0.5 day |
| `seed(domain, genes)` | `new UniversalSeed()` | `universal-seed.ts` | 0.25 day |
| `len(x)` | Built-in length | interpreter.ts | 0.25 day |
| `domains()` | `DOMAINS` constant | domain-constants.ts | 0.25 day |
| `range(n)` | loop helper | interpreter.ts | 0.25 day |
| `Math.*` | Math functions | interpreter.ts | 0.25 day |
| `print(x)` | stdout | interpreter.ts | 0.25 day |
| `signed(seed, key)` | `seed.sign()` | universal-seed.ts | 0.5 day |
| `distance(a, b)` | `seedDistance()` | gene_system.ts | 0.25 day |
| `compose(seeds, target)` | `composeSeeds()` | composition.ts | 0.5 day |

**Verification:**
- 24 GSPL interpreter tests pass (already confirmed)
- NEW: 10+ integration tests: GSPL script → kernel → deterministic artifact
- `npm run test:gspl` passes

### P1.3 Determinism Verification Suite (Days 16-20)

**Spec reference:** `spec/07-determinism.md` — the 7 test categories

**Create `tests/determinism/` with:**

| Test file | Tests | Effort |
|-----------|-------|--------|
| `self-replay.test.ts` | `grow(s)` called twice, byte-compare output | 1 day |
| `cross-platform.test.ts` | Linux x86_64 vs macOS ARM64 vs Windows (CI matrix) | 2 days |
| `browser-parity.test.ts` | Node vs Chrome (jsdom) vs Firefox (headless) | 1 day |
| `mutation-determinism.test.ts` | `mutate(s, r, rng)` twice → equal | 1 day |
| `breeding-determinism.test.ts` | `breed(a, b)` twice → equal | 1 day |
| `round-trip.test.ts` | `decode(encode(s)) == s`, `canonicalize(parse(canonicalize(s)))` | 1 day |
| `regression-seeds.test.ts` | 100 canonical seeds, known output hashes | 2 days |
| `floating-point-consistency.test.ts` | IEEE-754 binary64 verified across operations | 1 day |

**CI Integration:**

```yaml
# .github/workflows/determinism.yml
name: Determinism Tests
on: [push, pull_request]
jobs:
  determinism:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test -- tests/determinism
      - run: npm run determinism:check
```

### P1.4 Sovereignty Signing (Days 17-19)

**Spec reference:** `spec/05-sovereignty.md` — ECDSA P-256, RFC 6979 deterministic nonces

**File:** `src/seeds/universal-seed.ts` — Add methods:

```typescript
sign(privateKey: JWK): UniversalSeed
  // Canonicalize seed (sans current signature)
  // ECDSA sign with RFC 6979 deterministic nonces
  // Return new seed with $sovereignty populated

verify(publicKey: JWK): boolean
  // Canonicalize seed (sans signature field)
  // ECDSA verify against stored signature

signGene(geneName: string, privateKey: JWK, license: string): UniversalSeed
  // Per-gene signing with license declaration
  // Updates $sovereignty.genes[geneName]

verifyGene(geneName: string, publicKey: JWK): boolean
  // Verify single gene's sovereignty
```

**Files to modify:**
- `src/seeds/universal-seed.ts` — add sovereignty methods (3 days)
- `src/lib/sovereignty/ecdsa.ts` — crypto utilities using ethers.js or Node crypto (1 day)
- `server.ts` — add POST /api/seeds/:id/sign, /verify, /sign-gene, /transfer-gene (1 day)

**API Endpoints:**

```
POST /api/seeds/:id/sign           ← sign seed with private key
POST /api/seeds/:id/verify         ← verify signature with public key
POST /api/seeds/:id/sign-gene      ← sign single gene with license
POST /api/seeds/:id/transfer-gene  ← transfer gene ownership
GET  /api/seeds/:id/sovereignty    ← read sovereignty metadata
```

**Verification:**
```typescript
test('sign → verify → grow produces identical artifact', () => {
  const seed = createTestSeed('character')
  const { privateKey, publicKey } = generateKeyPair()
  const signed = seed.sign(privateKey)
  expect(signed.verify(publicKey)).toBe(true)
  
  const artifact1 = growSeed(signed)
  const artifact2 = growSeed(signed)
  expect(hashArtifact(artifact1)).toBe(hashArtifact(artifact2))
})
```

### P1.5 DAO Phase 1 — Contracts Audit + Deployment (Days 18-20)

**Spec reference:** `contracts/` directory, `spec/05-sovereignty.md`

| Task | Description | Effort |
|------|-------------|--------|
| 1.5.1 | Audit existing Solidity contracts | Review `contracts/` for SeedNFT, PARA token, DAO governor | 1 day |
| 1.5.2 | Compile with Hardhat | `npx hardhat compile` — fix any compilation errors | 1 day |
| 1.5.3 | Deploy to local network | `npx hardhat run scripts/deploy.ts --network localhost` | 0.5 day |
| 1.5.4 | Basic seed-to-token mapping | Deploy SeedNFT contract, mint tokens for seeds | 1 day |
| 1.5.5 | Sovereignty → blockchain bridge | When seed is signed, also record on-chain ownership | 1 day |
| 1.5.6 | Wire POST /api/blockchain/mint | API endpoint to mint SeedNFT from signed seed | 0.5 day |

### P1.6 GSPL Language Extensions (Days 15-20)

| Feature | Spec Reference | File | Effort |
|---------|---------------|------|--------|
| `match` (pattern matching) | spec/04 lines 38-43 | parser.ts, interpreter.ts | 2 days |
| `\|>` (pipe operator) | spec/04 lines 64-68 | lexer.ts, parser.ts, interpreter.ts | 1 day |
| `import` / `export` | spec/04 lines 91-95 | parser.ts, resolver.ts | 2 days |
| `type`, `trait`, `impl` | spec/04 lines 100-120, type-system.md | type-checker.ts | 3 days |
| `@gpu` annotation | spec/04 lines 130-140 | deferred to v1.1 | - |
| `try` / `catch` / `throw` | Not spec'd for v1.0 in MVP_DEFINITION | deferred to v1.1 | - |
| Full stdlib functions | language/stdlib.md | stdlib.ts NEW | 2 days |

---

## PHASE 2: DOMAIN ELEVATION (Weeks 6-9)

**Objective:** 27 playable domains, 50+ functor bridges, working Studio viewports, dual format export.

### P2.1 Generator Fidelity Audit (Days 21-23)

**Spec reference:** `engines/_template.md`, per-domain engine specs

**Process for each of 27 domains:**

```
1. Load representative seed with domain genes
2. Call growSeed()
3. Inspect output:
   - Is it a real file (GLTF, MIDI, code) or just metadata?
   - Does it use the staged pipeline pattern?
   - Does it implement the DomainEngine interface?
   - Does it have renderHints and exportHints?
   - Does it use sub-RNG streams?
4. Rate 1-5:
   1 = placeholder/stub (output doesn't exist or is hardcoded)
   2 = metadata only (config description, no executable)
   3 = basic artifact (playable but limited features)
   4 = rich artifact (multiple features, textures, interactions)
   5 = production-ready (optimized, tested, documented)
5. Record gap and effort estimate
```

**Expected audit results based on prior analysis:**

| Rating 1-5 | Count | Domains | Action |
|:---:|:---:|---|---|
| 5 (production) | ~4 | character-v3, sprite-v2, geometry3d, fullgame | Minor polish |
| 4 (rich) | ~8 | music-v2/v3, game-v2, architecture-3d, physics, animation | Texture/feature improvements |
| 3 (basic) | ~8 | visual2d, shader, narrative, ecosystem, alife, procedural, audio | Major enhancement needed |
| 2 (metadata) | ~6 | ui, vehicle, furniture, fashion, agent, particle | Rebuild as playable |
| 1 (placeholder) | ~2 | robotics, circuit | Full implementation from spec |

### P2.2 Refactor Generators to Staged Pipeline (Days 23-27)

**Spec reference:** `architecture/engine-pattern.md`, `engines/_template.md`

**The `DomainEngine` Interface:**

```typescript
interface DomainEngine {
  readonly domain: string
  readonly version: string
  readonly geneSchema: GeneSchema
  readonly stages: Stage[]
  readonly outputType: ArtifactType

  validate(seed: UniversalSeed): Result<void, ValidationError>
  grow(seed: UniversalSeed, ctx: GrowContext): Promise<Artifact>
}
```

**Each stage is a pure function:**

```typescript
interface Stage<In, Out> {
  readonly name: string
  readonly inputType: TypeOf<In>
  readonly outputType: TypeOf<Out>
  readonly run: (input: In, seed: UniversalSeed, rng: DeterministicRng) => Out
}
```

**Implement for each generator file — target structure:**
```
src/lib/kernel/generators/<domain>.ts:
  export const <domain>Engine: DomainEngine = {
    domain: '<domain>',
    version: '1.0.0',
    geneSchema: { ... },
    stages: [
      { name: 'extract', run: ... },
      { name: 'morphogenesis', run: ... },
      { name: 'populate', run: ... },
      { name: 'parameterize', run: ... },
      { name: 'texture', run: ... },
      { name: 'pose', run: ... },
      { name: 'compose', run: ... },
      { name: 'render', run: ... },
    ],
    outputType: '<artifact_type>',
    validate: (seed) => { ... },
    grow: async (seed, ctx) => { ... },
    renderHints: { ... },
    exportHints: { ... }
  }
```

**Standard stages reused across engines:**

| Stage | Input | Output | Description |
|-------|-------|--------|-------------|
| `extract` | UniversalSeed | WorkingSet | Extract genes + type conversions |
| `morphogenesis` | WorkingSet | BaseForm | Generate base form/structure |
| `populate` | BaseForm | PopulatedForm | Add content (limbs, instruments, NPCs) |
| `parameterize` | PopulatedForm | ParameterSet | Compute derived parameters |
| `simulate` | ParameterSet | SimulatedState | Run physics/ecosystem simulation step |
| `pose` | SimulatedState | PosedState | Apply transforms, animations |
| `texture` | PosedState | Textured | Apply materials, colors |
| `light` | Textured | Lit | Compute lighting |
| `compose` | Lit | Composed | Combine layers/sub-objects |
| `render` | Composed | RawArtifact | Produce final pixels/audio/binary |
| `export` | RawArtifact | Artifact | Wrap in target format envelope |

### P2.3 Rich Artifact Implementation (Days 24-36)

**Implementation priorities by domain (parallel across 3 engineers):**

| Engineer | Week 6 | Week 7 | Week 8 | Week 9 |
|----------|--------|--------|--------|--------|
| **E1: Core** | visual2d, shader | narrative, audio | procedural, typography | ui |
| **E2: 3D** | character, geometry3d | architecture, vehicle | furniture, fashion | robotics |
| **E3: Simulation** | ecosystem, alife | physics, particle | animation, agent | food, choreography |
| **E4: Games** | fullgame, game | music, sprite | circuit | Remaining polish |

**Output formats per domain:**

| Domain | Primary Format | Library | Artifact Type |
|--------|---------------|---------|--------------|
| character | GLB (GLTF binary) | three.js export | 3D model with skeleton |
| sprite | PNG atlas | Canvas 2D | Frame-by-frame animation |
| music | MIDI + WAV | tone.js | Playable audio |
| visual2d | SVG | Canvas 2D | Vector art |
| geometry3d | OBJ/GLTF | three.js | 3D mesh |
| fullgame | HTML5 (JS+HTML+CSS) | Generated code | Playable game |
| animation | Skeletal JSON | three.js animation | Keyframe/skeletal anim |
| narrative | Markdown/JSON | Template engine | Story text |
| ui | React JSX/HTML | Component template | UI component code |
| physics | JSON config + WASM | matter-js wrapper | Simulation |
| audio | WAV | Web Audio API | Audio sample |
| ecosystem | JSON graph + viz | d3.js wrapper | Interactive graph |
| game | JavaScript/HTML5 | Generated code | Playable game |
| alife | JSON rules + sim | Custom | Agent simulation |
| shader | GLSL | WebGPU/WebGL | Shader code |
| particle | JSON system + viz | Canvas 2D | Particle effect |
| procedural | JSON pipeline | Custom | Asset generation |
| typography | WOFF2/CSS | opentype.js | Font file |
| architecture | GLTF + metadata | three.js/IFC | 3D building |
| vehicle | GLTF + specs | three.js | 3D vehicle |
| furniture | GLTF + specs | three.js | 3D furniture |
| fashion | GLTF + metadata | three.js | 3D garment |
| robotics | URDF + GLTF | Custom XML | Robot description |
| circuit | JSON netlist | Custom | Circuit topology |
| food | JSON recipe | Custom | Structured recipe |
| choreography | JSON motion + viz | Canvas 2D | Dance notation |
| agent | JSON behavior | Custom | Behavior tree/config |

### P2.4 Functor Network Expansion (Days 28-33)

**Spec reference:** `architecture/cross-domain-composition.md`

**Current:** 12 pre-defined functors (character→sprite, character→music, etc.)  
**Target:** 50+ functors covering >80% of 26² = 676 domain pairs via BFS

**Approach: Learned Embeddings + Generic Bridge**

1. **Compute domain similarity matrix:**
   - Each domain gets n-dimensional feature vector
   - Features: temporal weight, spatial weight, visual weight, behavioral weight, textual weight, complexity metric
   - Cosine similarity between all pairs → weighted graph

2. **Implement generic functor pattern:**
   ```typescript
   // Generic domain-to-domain functor using gene mapping
   function genericFunctor(
     source: UniversalSeed, 
     sourceDomain: string, 
     targetDomain: string
   ): UniversalSeed {
     // 1. Extract source gene values
     // 2. Map to target gene schema via semantic correspondences
     // 3. Generate missing target genes via RNG
     // 4. Return new seed in target domain
   }
   ```

3. **BFS pathfinding:**
   ```typescript
   function findCompositionPath(from: string, to: string): FunctorStep[]
   // Dijkstra/BFS on functor graph
   // Returns optimal path with coherence scores
   ```
   
4. **Coherence scoring:**
   ```typescript
   function coherenceScore(path: FunctorStep[]): number
   // Based on: path length, similarity at each step, domain compatibility
   ```

**Functor categories to add (38 new bridges):**

| Category | Examples | Count |
|----------|----------|-------|
| Visual → Audio | sprite→music, geometry3d→audio, visual2d→music | 6 |
| Audio → Visual | music→sprite, audio→visual2d | 4 |
| Narrative → Everything | narrative→game, narrative→music, narrative→character | 8 |
| Character → Everything | character→animation, character→game, character→narrative | 6 |
| Game → Everything | game→fullgame, game→architecture, game→ecosystem | 6 |
| Domain → Self (variant) | character→character (mutate), music→music | 4 |
| Scientific → Creative | physics→visual2d, ecosystem→game, alife→character | 4 |

### P2.5 Viewport Implementation (Days 30-36)

**Spec reference:** `architecture/studio-architecture.md`

| Viewport | Domains | Tech | Effort |
|----------|---------|------|--------|
| **3D Viewer** | character, geometry3d, architecture, vehicle, furniture, fashion, robotics | Three.js + react-three-fiber + OrbitControls | 3 days |
| **2D Raster** | sprite, visual2d, particle | Canvas 2D, animation frame loop | 2 days |
| **SVG/Vector** | visual2d, procedural, typography | React inline SVG, resizable | 2 days |
| **Audio Player** | music, audio | Web Audio API, waveform visualization | 2 days |
| **Game Iframe** | fullgame, game, alife | Sandboxed iframe, message passing | 2 days |
| **Text/Code** | narrative, circuit, procedural | Monaco/CodeMirror editor | 1 day |
| **Interactive Sim** | physics, ecosystem, agent | Canvas 2D, requestAnimationFrame | 3 days |
| **Animation Player** | animation, choreography | Three.js animation mixer | 2 days |
| **Default** | All other | JSON viewer, metadata display | 1 day |

**Verification:** Each viewport can display the artifact output of its domain engine. All viewports accessible from Studio tab panel.

### P2.6 DAO Phase 2 — Governance Wiring (Days 28-35)

| Task | Effort |
|------|--------|
| Deploy Token (PARA) contract to testnet | 1 day |
| Deploy DAO Governor contract | 2 days |
| Wire `POST /api/dao/propose` — submit proposal | 1 day |
| Wire `POST /api/dao/vote` — cast vote | 1 day |
| Wire `POST /api/dao/execute` — execute passed proposal | 1 day |
| Wire `GET /api/dao/proposals` — list proposals | 0.5 day |
| Wire `GET /api/seeds/:id/sovereignty/onchain` — verify on-chain | 1 day |
| Frontend: DAO dashboard page | 2 days |

### P2.7 Dual Format Export (.gseed) (Days 34-36)

**Spec reference:** `spec/06-gseed-format.md`, `ADR-009`

**Implementation:**

```typescript
// src/lib/export/gseed-format.ts — NEW

interface GSeedHeader {
  magic: 'GSEED'        // 5 bytes
  version: 1            // uint16
  hashAlgo: 'sha256'    // 6 bytes
  hashLength: 32        // uint8
  contentHash: Uint8Array  // 32 bytes
  signatureAlgo: 'ecdsa-p256'
  signature: Uint8Array // 64 bytes
  compressedPayload: Uint8Array  // Zstd-compressed canonical JSON
}

function encodeSeedToGSeed(seed: UniversalSeed): Uint8Array {
  // 1. Canonicalize seed to JSON
  // 2. Compress with Zstd
  // 3. Wrap in header with hash + signature
  // 4. Return binary
}

function decodeGSeedToSeed(bytes: Uint8Array): UniversalSeed {
  // 1. Parse header
  // 2. Verify hash
  // 3. Verify signature
  // 4. Decompress payload
  // 5. Parse JSON → UniversalSeed
}
```

**API Endpoints:**

```
GET /api/seeds/:id/export.gseed  ← download as .gseed binary
POST /api/seeds/import.gseed     ← upload .gseed binary → parse → store
```

---

## PHASE 3: AI & COMPOSITION (Weeks 10-12)

**Objective:** Full-capacity TypeScript agent, 1,000 canonical seeds, inverse pipeline.

### P3.1 Agent Pipeline Implementation (Days 37-44)

**Spec reference:** `ADR-0012`, `intelligence/gspl-agent-full-capacity.md`

**Architecture: 6 stages in `src/intelligence/`:**

```
agent/
├── agent.ts                # Main GSPLAgent class
├── types.ts                # Agent types and interfaces
├── stages/
│   ├── stage-0-live-context.ts    # Gather user context, preferences
│   ├── stage-1-intent-resolution.ts   # Parse description→IntentEnvelope
│   ├── stage-2-code-generation.ts     # IntentEnvelope→GSPL code
│   ├── stage-3-deterministic-growth.ts    # GSPL→seed→grow→artifact
│   ├── stage-4-validation.ts          # Verify seed matches description
│   ├── stage-5-evolution-composition.ts  # Breed/mutate refine
│   └── stage-6-archive-sign.ts        # Sign and archive seed
├── sub-agents/
│   ├── IntentOracle.ts         # LLM: parse intent from description
│   ├── Researcher.ts           # LLM + tools: web research
│   ├── CodeSmith.ts            # LLM: generate GSPL code
│   ├── Validator.ts            # Deterministic: verify outputs
│   ├── Evolver.ts              # Deterministic: GA/MAP-Elites evolution
│   ├── Composer.ts             # LLM: suggest cross-domain compositions
│   ├── MemoryArchivist.ts      # Deterministic: memory management
│   └── SovereignSigner.ts      # Deterministic: ECDSA signing
├── memory/
│   ├── MemorySystem.ts        # 4-layer memory orchestrator
│   ├── WorkingMemory.ts       # Current session context
│   ├── ExemplarMemory.ts      # Past successful examples
│   ├── EpisodicMemory.ts      # Session history
│   └── SubstrateMemory.ts     # Seed commons knowledge base
├── tools/
│   ├── WebSearchTool.ts       # Web search interface
│   ├── BrowsePageTool.ts      # Web page reader
│   ├── CodeExecutionTool.ts   # Sandboxed GSPL runner
│   ├── SeedInventoryQuery.ts  # Search seed commons
│   ├── EvolutionRunTool.ts    # Run GA/MAP-Elites
│   ├── FetchDataTool.ts       # Real-world data fetcher
│   ├── MultimodalAnalyze.ts   # Image/audio analysis
│   └── SelfFineTuneTrigger.ts # Trigger fine-tune (stretch)
└── llm/
    ├── LLMClient.ts            # Pluggable LLM backend
    ├── GeminiProvider.ts       # @google/genai integration
    ├── ClaudeProvider.ts       # Anthropic integration
    └── LocalProvider.ts        # Local OSS model (ollama)
```

**Stage 0 — Live Context:**
```typescript
// Gather user context
interface LiveContext {
  userId: string
  preferences: UserPreference[]
  recentSeeds: SeedRef[]
  activeDomain: string
  styleHints: string[]
}
```

**Stage 1 — Intent Resolution:**
```typescript
// Parse description
// Input: "Create a sad blue robot character"
// Output: IntentEnvelope
interface IntentEnvelope {
  domain: string
  genes: Record<string, string>  // Semantic gene values
  constraints: Record<string, any>
  style: string
  referenceSeeds?: string[]
}
```

**Stage 2 — Code Generation:**
```typescript
// IntentEnvelope → GSPL Code
// Uses CodeSmith: fine-tuned LLM for GSPL generation
// Output: GSPL source code string
```

**Stage 3 — Deterministic Growth:**
```typescript
// GSPL → UniversalSeed → grow → artifact
// Uses seeded RNG from intent hash
// All deterministic, no LLM in this stage
```

**Stage 4 — Validation:**
```typescript
// Verify: does artifact match original description?
// Uses LLM to compare artifact metadata with description
// If confidence < 0.7, → refine cycle (back to Stage 2)
```

**Stage 5 — Evolution/Composition:**
```typescript
// Optional: refine seed through GA/MAP-Elites
// Or compose with existing seeds
```

**Stage 6 — Archive/Sign:**
```typescript
// Sign seed with user's key
// Store in user's seed library
// Optionally publish to Commons
```

### P3.2 4-Layer Memory System (Days 41-44)

| Layer | Scope | Implementation | Storage |
|-------|-------|---------------|---------|
| **Working** | Current session context | In-memory Map<string, any> | Volatile (session) |
| **Exemplar** | Past successful seed→description pairs | Vector store (array + cosine similarity) | IndexedDB (browser) / memory (server) |
| **Episodic** | Full session history | Circular buffer, recent N sessions | JSON file / DB |
| **Substrate** | Commons seeds + reference data | Immutable knowledge base (from data/commons/) | Filesystem |

### P3.3 Verification Gate (Days 40-42)

```typescript
async function verifySeedMatchesDescription(
  seed: UniversalSeed,
  description: string,
  llm: LLMClient
): Promise<VerificationResult> {
  // 1. Grow artifact
  const artifact = await growSeed(seed)
  
  // 2. Ask LLM: does artifact match?
  const prompt = `User described: "${description}"
  System generated artifact: ${JSON.stringify(artifact.metadata)}
  Does this match? Rate confidence 0-1:`
  const response = await llm.generate(prompt)
  
  // 3. Parse response
  const { confidence, issues } = JSON.parse(response)
  
  if (confidence >= 0.7) {
    return { valid: true, confidence }
  } else {
    return { valid: false, confidence, issues, adjustedDescription: issues.join(', ') }
  }
}
```

### P3.4 Inverse Pipeline (Days 43-45)

**Spec reference:** Originally in architecture but not a first-class spec

```typescript
async function invertArtifact(
  artifact: Artifact,
  domain: string,
  iterations: number = 100,
  rng: RNG
): Promise<{ seed: UniversalSeed; fidelity: number }> {
  // Start with random seed in domain
  let candidate = UniversalSeed.random(domain, rng)
  let bestFidelity = 0
  let bestSeed = candidate
  
  for (let i = 0; i < iterations; i++) {
    // Grow candidate artifact
    const candidateArtifact = await growSeed(candidate)
    
    // Compare to target
    const fidelity = computeFidelity(candidateArtifact, artifact)
    
    if (fidelity > bestFidelity) {
      bestFidelity = fidelity
      bestSeed = candidate
    }
    
    // Use gradient-guided mutation to improve
    const gradients = computeGeneGradients(candidate, artifact, rng)
    candidate = applyGradients(candidate, gradients, 0.1 * (1 - i/iterations))
  }
  
  return { seed: bestSeed, fidelity: bestFidelity }
}
```

### P3.5 Seed Commons — 1,000 Canonical Seeds (Days 40-50)

**Strategy:** 50 curated → 950 agent-generated → human verify

| Task | Description | Effort |
|------|-------------|--------|
| 3.5.1 | Document seed creation guidelines | CONTRIBUTING-seeds.md | 1 day |
| 3.5.2 | Curate 50 canonical seeds by hand | One per major domain/category | 5 days |
| 3.5.3 | Agent-generate 950 seeds | Use GSPL Agent in batch mode | 5 days (automated) |
| 3.5.4 | Verify determinism for each | `tests/commons/validation/determinism.ts` | 1 day (automated) |
| 3.5.5 | Verify grow for each | `tests/commons/validation/grow.ts` | 1 day (automated) |
| 3.5.6 | Verify signature for each | `tests/commons/validation/signature.ts` | 1 day (automated) |
| 3.5.7 | Human review 50 seeds (5% sample) | Review quality, tag metadata | 2 days |
| 3.5.8 | Fix any failing seeds | Iterate | 2 days |
| 3.5.9 | Publish Commons CI | GitHub Actions workflow | 1 day |

**Commons CI:**
```yaml
name: Seed Commons Validation
on: [push, schedule: '0 6 * * *']
jobs:
  validate-commons:
    runs-on: ubuntu-latest
    steps:
      - run: node tests/commons/validation/grow.ts
      - run: node tests/commons/validation/determinism.ts
      - run: node tests/commons/validation/signature.ts
      - run: node tests/commons/validation/commons-lint.ts
```

---

## PHASE 4: POLISH & LAUNCH (Weeks 13-14)

**Objective:** Production-ready, compliant, documented, released v1.0.

### P4.1 C2PA Content Credentials (Days 51-53)

**Spec reference:** `compliance/c2pa.md`

```typescript
// For every exported artifact, embed C2PA manifest:
interface C2PAManifest {
  generator: 'Paradigm Absolute v1.0'
  seedHash: string
  engine: string
  engineVersion: string
  timestamp: string
  signature: string  // ECDSA over manifest
  provenance: {
    parentSeeds: string[]
    operation: 'grow' | 'mutate' | 'breed' | 'compose'
    generation: number
  }
  assertions: [
    { label: 'org.paradigm.seed', data: seed.$hash },
    { label: 'org.paradigm.domain', data: seed.$domain }
  ]
}
```

### P4.2 WCAG 2.1 AA Compliance (Days 52-54)

| Requirement | Testing Tool | Effort |
|-------------|-------------|--------|
| Color contrast (AA: 4.5:1) | axe-core, Lighthouse | 1 day |
| Keyboard navigation | Manual testing | 1 day |
| Screen reader labels | axe-core | 1 day |
| Focus indicators | Manual testing | 0.5 day |
| ARIA landmarks | axe-core | 0.5 day |

### P4.3 OpenTelemetry Observability (Days 52-55)

```typescript
// Server-wide tracing
import { trace, context } from '@opentelemetry/api'

// Trace every seed operation
function tracedGrowSeed(seed: UniversalSeed, ctx: GrowContext): Promise<Artifact> {
  const tracer = trace.getTracer('paradigm-engine')
  return tracer.startActiveSpan('grow.seed', { attributes: {
    'seed.domain': seed.$domain,
    'seed.hash': seed.$hash.substring(0, 12),
    'engine.version': ctx.engineVersion
  }}, async (span) => {
    try {
      const result = await growSeed(seed, ctx)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (e) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: e.message })
      throw e
    } finally {
      span.end()
    }
  })
}
```

**Metrics to expose:**
- `paradigm.seed.grow.duration` — histogram
- `paradigm.seed.grow.total` — counter (by domain)
- `paradigm.seed.mutate.total` — counter
- `paradigm.seed.breed.total` — counter
- `paradigm.api.request.duration` — histogram
- `paradigm.api.errors` — counter (by endpoint)
- `paradigm.determinism.checks` — counter

**Endpoint:** `GET /api/metrics` (Prometheus format)

### P4.4 Load Testing (Days 53-54)

| Scenario | Target | Tool |
|----------|--------|------|
| 100 concurrent users browsing seeds | <500ms p95 | k6 |
| 100 concurrent grow operations | <5s median | k6 |
| 1K concurrent users read-only | <200ms p95 | k6 |
| Seed store: 100K seeds | <50ms lookup | k6 |
| 10 concurrent evolution runs | Complete in <30s | k6 |

### P4.5 Security Audit (Days 54-55)

| Check | Tool | Effort |
|-------|------|--------|
| Dependency vulnerabilities | `npm audit`, Snyk | 0.5 day |
| OWASP Top 10 scan | OWASP ZAP | 1 day |
| SQL injection (Postgres) | Manual code review | 0.5 day |
| XSS prevention | Manual + ZAP | 0.5 day |
| Authentication/authorization | Manual review | 0.5 day |
| Rate limit verification | k6 test | 0.5 day |
| Secrets in code | git-secrets | 0.5 day |
| Generate SBOM | Cyclonedx plugin | 0.5 day |

### P4.6 DAO Phase 3 — Full Governance Launch (Days 53-56)

| Task | Effort |
|------|--------|
| Deploy PARA token to testnet/mainnet | 1 day |
| Deploy TimelockController | 1 day |
| Deploy GovernorBravo | 2 days |
| Wire seed ownership verification on-chain | 1 day |
| Wire marketplace escrow for seed trading | 2 days |
| Frontend: DAO proposal creation UI | 2 days |
| Frontend: Seed marketplace UI | 2 days |

### P4.7 Documentation & Tutorials (Days 55-57)

| Deliverable | Format | Effort |
|-------------|--------|--------|
| README.md rewrite | Markdown | 1 day |
| CONTRIBUTING.md | Markdown | 1 day |
| API docs (auto-generated) | Swagger/OpenAPI | 0.5 day |
| "Grow your first seed" tutorial | Video (2 min) | 1 day |
| "Breed two seeds" tutorial | Video (2 min) | 1 day |
| "Write a GSPL script" tutorial | Video (3 min) | 1 day |
| "Deploy locally" tutorial | Video (5 min) | 1 day |
| Architecture diagram | Mermaid + SVG | 0.5 day |

### P4.8 Release v1.0 (Day 56)

| Task | Effort |
|------|--------|
| Tag v1.0 in git | 5 min |
| Generate changelog | 1 hr |
| Update README with badges | 15 min |
| Create GitHub Release | 15 min |
| Deploy to production | 1 hr |
| Monitor post-launch | 24 hr |
| Social announcement | Blog post + Twitter | 2 hr |

---

## ARCHITECTURE DECISIONS & TRADEOFFS

### AD-1: TypeScript Agent (Not Python)
**Chosen:** TypeScript agent using LLM-as-service  
**Rejected:** Python agent (dual runtime complexity)  
**Consequence:** LLM integration via REST/gRPC, not in-process. Slightly higher latency, much simpler operations.

### AD-2: Dual Seed Format (JSON + .gseed)
**Chosen:** JSON for storage/development, .gseed binary for distribution  
**Rejected:** Single format  
**Consequence:** Conversion layer needed. JSON enables git diffs + human readability. Binary enables portable signed distribution.

### AD-3: Selective Cross-Repo Port (Not Full Mirror)
**Chosen:** Port seed-commons, spec summaries. Keep research briefs in reference repo.  
**Rejected:** Full mirror of 231 briefs into main repo.  
**Consequence:** Main repo stays focused on executable code. Reference repo is supplementary.

### AD-4: 17 Gene Types, Not 22
**Chosen:** 17 per locked spec/02. Defer 5 experimental types to v1.1.  
**Rejected:** Implement all 22 (5 experimental types from Brief 020).  
**Consequence:** MVP matches spec exactly. Experimental types (from Brief 020) unimplemented but reserved (IDs 18-31).

### AD-5: Learned Embeds for Functors (Not Hand-Coded Only)
**Chosen:** Domain embeddings → similarity graph → generic functor bridges  
**Rejected:** Hand-code all 676 functor pairs  
**Consequence:** Less precise per-pair functor, but covers >80% of domain pairs vs. ~2% with hand-coded only.

### AD-6: Ethereum DAO (Not ZK-Proofs v1.0)
**Chosen:** Solidity contracts, on-chain governance with PARA token  
**Rejected:** ZK-anonymous proofs (Brief 047) deferred to v1.1  
**Consequence:** Centralized in the sense of "on-chain = public." ZK proofs for private ownership come later.

### AD-7: 50 Curated → 950 Generated Commons
**Chosen:** Hybrid strategy with human review gates  
**Rejected:** Pure agent generation (quality risk) or pure human (time risk)  
**Consequence:** 2 weeks human curation up front, saves ~8 weeks of manual seed creation later.

---

## SUCCESS METRICS & DEFINITION OF DONE

### Quantitative Gates for v1.0

| Metric | Target | How Measured | Phase |
|--------|--------|-------------|-------|
| Determinism parity | 100% (same hash across Node/Browser/WASM) | `npm run test -- tests/determinism` | P1 |
| Gene type coverage | 17/17 with 6 operators | Integration test | P1 |
| Domain coverage | 27/27 playable | Each domain has E2E test | P2 |
| Functor bridges | 50+ working paths | BFS test: any domain→any domain | P2 |
| Studio viewports | 8 types (3D, 2D, Audio, Game, etc.) | Each viewport accessible in Studio | P2 |
| GSPL language spec | 100% keyword coverage | Grammar compliance test | P1 |
| Test coverage | 80%+ | `npm run test:coverage` | P4 |
| API response time | <500ms p95 | k6 load test | P4 |
| Studio load time | <2s LCP | Lighthouse | P4 |
| Commons seeds | 1,000+ | `data/commons/index.json` count | P3 |
| Agent success rate | >70% (prompt→seed verified) | Agent test suite | P3 |
| C2PA compliance | Export pipeline verified | Integration test | P4 |
| WCAG compliance | AA level | axe-core scan | P4 |

### Qualitative Gates

| Criterion | Evidence |
|-----------|----------|
| Production-ready | Docker compose up → functional Studio at localhost:3000 |
| Local-first | PWA works offline, IndexedDB storage functional |
| Deterministic guarantee | Same seed → identical file hash across 10 runs |
| Sovereign | Signed seed → verify(grow(s)) === artifact hash |
| Composable | Any two domains can produce hybrid artifact via functors |
| Reproducible | `npm run build && npm run test` passes cleanly |
| Well-documented | API explorer + getting-started guide + video tutorials |
| Community-ready | CONTRIBUTING.md + issue templates + CODE_OF_CONDUCT |

---

## RISK REGISTER

| R# | Risk | Probability | Impact | Mitigation | Trigger |
|----|------|:---:|:---:|---|--------|
| 1 | **Generator fidelity takes longer than estimated** | M | H | Parallelize across 3 engineers. Accept metadata output for 2 domains as "export config" if needed | Day 25: audit shows >5 domains at rating 1-2 |
| 2 | **LLM integration hallucinations in agent** | M | M | Strict verification gate (Stage 4). Confidence threshold. Fallback: manual gene editor | Day 40: verification fails >30% of agent outputs |
| 3 | **Determinism tests find platform-specific bugs** | H | H | Start determinism testing early (Phase 1). Have backup plan to disable WASM path | Day 18: cross-platform tests show drift |
| 4 | **Performance not meeting <5s grow target** | M | M | Profile generators early. Stage caching. Accept 10s for complex domains | Day 28: median >5s for basic domains |
| 5 | **Scope creep (Phase 3 features pulled into Phase 2)** | H | M | Strictly defer federation, ZK proofs, @gpu compile to v1.1. Use "parking lot" list | Weekly scope review |
| 6 | **DAO smart contract vulnerability** | L | H | Audit by third party before mainnet. Use timelock. Test on testnet for 1 week | Day 53: security audit findings |
| 7 | **Browser compatibility issues (WebGPU, audio)** | M | M | Graceful degradation: WebGL → Canvas 2D fallback. Audio → no-audio mode | Day 20: Studio blank in Firefox |
| 8 | **Seed commons quality** | M | M | Double the verification CI. Human review 10% sample. Reject poor seeds | Day 44: >5% of agent seeds fail verification |
| 9 | **Team availability** | M | H | Document all tasks with clear specs. Solo-capable: sequential phases (takes 14+ weeks still) | Week 1: only 1 engineer available |
| 10 | **Cross-repo dependency drift** | L | M | Pin reference repo commit in docs/reference/link to REFERENCE_COMMIT.txt | Reference branch divergence detected |

---

## APPENDIX A: REFERENCE-TO-CODEBASE MAPPING

| Reference Path | Codebase Location | Status | Phase |
|----------------|-------------------|--------|-------|
| `spec/00-overview.md` | `docs/reference/spec-summary.md` (synopsis) | ✅ Referenced | P0 |
| `spec/01-universal-seed.md` | `src/seeds/universal-seed.ts` | ⚠️ Fragmented (dual class) | P0 |
| `spec/02-gene-system.md` | `src/lib/kernel/gene_system.ts` | ⚠️ 10/17 types, 4/6 ops | P1 |
| `spec/03-kernel.md` | `src/lib/kernel/` | ⚠️ RNG OK, effects missing | P1 |
| `spec/04-gspl-language.md` | `src/gspl/` | ⚠️ 70% coverage | P1 |
| `spec/05-sovereignty.md` | `src/lib/sovereignty/`, `server.ts` | ⚠️ Partial | P1 |
| `spec/06-gseed-format.md` | `src/lib/export/gseed-format.ts` (planned) | ❌ Missing | P2 |
| `spec/07-determinism.md` | `tests/determinism/` (planned) | ❌ Missing | P1 |
| `adr/001-011` | `docs/reference/adr-summaries.md` (synopsis) | ✅ Referenced | P0 |
| `architecture/system-overview.md` | `docs/architecture/system-overview.md` (synopsis) | ✅ Referenced | P0 |
| `architecture/engine-pattern.md` | `src/lib/kernel/generators/` → staged | ❌ Not refactored | P2 |
| `architecture/cross-domain-composition.md` | `src/lib/kernel/composition.ts` | ⚠️ 12 bridges | P2 |
| `architecture/evolution-stack.md` | `src/lib/evolution/` | ✅ Core working | - |
| `engines/_template.md` | - | As design guide | P2 |
| `engines/character.md` | `src/lib/kernel/generators/character-v3.ts` | ✅ Rich, some stubs | P2 |
| `engines/*.md` (26) | Per-domain generator files | ⚠️ See fidelity audit | P2 |
| `intelligence/gspl-agent-full-capacity.md` | `src/intelligence/` | ❌ Missing | P3 |
| `seed-commons/libraries/` | `data/commons/libraries/` | ⚠️ Port needed | P0 |
| `seed-commons/inventories/` | `data/commons/inventories/` | ⚠️ Port needed | P0 |
| `seed-commons/validation/` | `tests/commons/validation/` | ⚠️ Port needed | P0 |
| `compliance/*` | - | ❌ Missing | P4 |
| `language/grammar.ebnf` | `src/gspl/parser.ts` (as implementation) | ✅ Matched | - |

---

## APPENDIX B: FILE INVENTORY BY PHASE

### Phase 0: Files Created/Modified

```
Modified:
  .gitignore                          (add archive/ temp/ patterns)
  src/seeds/universal-seed.ts         (extend with missing operators)
  src/lib/kernel/types.ts             (update exports)
  src/types/seed.ts                   (update exports)
  src/lib/evolution/ga.ts             (import UniversalSeed, not Seed)
  src/lib/evolution/map-elites.ts     (import UniversalSeed)
  src/lib/evolution/cmaes.ts          (import UniversalSeed)
  src/lib/evolution/functors.ts       (import UniversalSeed)
  src/gspl/interpreter.ts             (import UniversalSeed)
  server.ts                           (import UniversalSeed)
  README.md                           (rewrite)

New:
  .archive/                           (temp dirs moved here)
  docs/history/execution-record/      (consolidated execution docs)
  docs/status/CURRENT_STATUS.md       (single status source)
  docs/reference/spec-summaries.md    (mirrored spec synopses)
  docs/architecture/adr-summaries.md  (ADR synopses)
  docs/baseline/BUILD_BASELINE.md     (build baseline)
  data/commons/libraries/*.gspl       (17 ported .gspl library files)
  data/commons/inventories/*.gspl     (20 ported inventory files)
  tests/commons/validation/*          (5 ported validation files)
  examples/                           (8 ported .gspl + .gseed.json)

Deleted/Moved:
  src/lib/kernel/seed-class.ts        (deprecated)
  repo_copy/ → .archive/
  repo_latest/ → .archive/
  planning_here/ → .archive/
  playwright-report/ → .archive/
  test-results/ → .archive/
  53 .md files → docs/history/ or deleted
```

### Phase 1: Files Created/Modified

```
Modified:
  src/lib/kernel/gene_system.ts       (add 7 missing types, 6 ops each)
  src/gspl/interpreter.ts             (wire all builtins to kernel)
  src/gspl/lexer.ts                   (add match, pipe tokens)
  src/gspl/parser.ts                  (add match, pipe, import, type, trait, impl)
  src/gspl/type-checker.ts            (full type system)
  src/seeds/universal-seed.ts         (add sign, verify, signGene)
  src/lib/sovereignty/ecdsa.ts        (RFC 6979)
  server.ts                           (add sovereignty endpoints, DAO endpoints)
  src/lib/kernel/rng.ts               (add substream method)
  contracts/                          (audit, compile via Hardhat)

New:
  src/gspl/stdlib.ts                  (full standard library)
  tests/determinism/                   (7 test files)
  tests/gspl/gspl-kernel-integration.test.ts
  tests/sovereignty/signing.test.ts
  .github/workflows/determinism.yml
  scripts/deploy-seed-nft.ts
```

### Phase 2: Files Created/Modified

```
Modified:
  src/lib/kernel/generators/*.ts      (refactor all 27 to staged pipeline)
  src/lib/kernel/engines.ts           (DomainEngine interface)
  src/lib/kernel/engine-dispatcher.ts  (sub-RNG streams)
  src/lib/kernel/composition.ts       (50+ functors)
  src/lib/evolution/functors.ts       (generic functor + BFS)
  src/components/viewports/*          (8 viewport components)
  server.ts                           (.gseed export endpoint, DAO endpoints)

New:
  src/lib/export/gseed-format.ts       (binary format encoder/decoder)
  src/lib/composition/functor-graph.ts  (BFS with embeddings)
  src/lib/composition/domain-vectors.ts (domain feature vectors)
```

### Phase 3: Files Created/Modified

```
New:
  src/intelligence/                     (entire directory)
    agent.ts
    types.ts
    stages/                    (7 stage files)
    sub-agents/                (8 sub-agent files)
    memory/                    (4 memory files)
    tools/                     (8 tool files)
    llm/                       (3 provider files + client)
  tests/intelligence/           (agent tests)
  data/commons/index.json       (1,000 seed index)
  data/commons/verification/    (CI artifacts)
  .github/workflows/commons-ci.yml

Modified:
  server.ts                    (add agent endpoints)
  src/lib/kernel/inverse-pipeline.ts (full implementation)
```

### Phase 4: Files Created/Modified

```
Modified:
  src/lib/export/c2pa.ts                (C2PA manifest embedding)
  src/components/                       (WCAG fixes)
  server.ts                             (OpenTelemetry instrumentation)

New:
  docs/tutorials/                       (video + text)
  infrastructure/monitoring/prometheus.yml
  infrastructure/monitoring/grafana-dashboards.json
  SBOM.json                             (software bill of materials)
  .github/workflows/security-audit.yml
```

---

## APPENDIX C: DAO & SOVEREIGNTY ARCHITECTURE

### Contracts Layer (`contracts/`)

```
contracts/
├── SeedNFT.sol              → ERC-721 with seed hash → token mapping
├── PARAToken.sol            → Governance token (ERC-20)
├── GovernorBravo.sol        → DAO voting contract
├── TimelockController.sol   → Delayed execution
└── README.md

scripts/
├── deploy.ts                → Deploy all contracts
├── mint-seed-nft.ts         → Mint NFT for seed
└── verify.ts                → Verify on Etherscan
```

### Sovereignty Flow

```
User creates seed
  → seed = new UniversalSeed(...)
  → signed = seed.sign(privateKey)
  → POST /api/seeds → { seed: signed }
  → Backend stores seed, $sovereignty present
  → (Optional) POST /api/blockchain/mint → SeedNFT minted
  → Export → .gseed binary with embedded signature
  → Anyone can: parse .gseed → verify() → grow() → compare artifact hash
```

### Royalty Flow

```
SeedA (generation 0, author Alice) → signed
SeedB (generation 0, author Bob) → signed
  → breed(SeedA, SeedB) = SeedC (generation 1)
  → SeedC.sovereignty.genes = {
      gene1: { owner: Alice, license: 'CC-BY-NC' },
      gene2: { owner: Bob, license: 'COMMERCIAL' }
    }
  → SeedC is sold for 100 tokens
  → Royalty: Alice gets 50% × royalty_rate, Bob gets 50% × royalty_rate
  → Propagates backward through lineage
```

---

## APPENDIX D: AGENT SPECIFICATION

### Agent Architecture Diagram (text)

```
User Description
     │
     ▼
┌────────────────────────────────────────────────┐
│ Stage 0: Live Context                           │
│   Gather user preferences, session history       │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│ Stage 1: Intent Resolution (IntentOracle)       │
│   LLM parses description → IntentEnvelope       │
│   { domain, genes, constraints, style }         │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│ Stage 2: Code Generation (CodeSmith)            │
│   LLM generates GSPL source from intent         │
│   CodeSmith has NO tool access (security)        │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│ Stage 3: Deterministic Growth (Validator)       │
│   Runs GSPL through interpreter → seed          │
│   Grows seed through domain engine → artifact   │
│   ALL operations seeded from intent hash        │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│ Stage 4: Validation (Validator)                 │
│   Does artifact match description?              │
│   LLM checks: confidence ≥ 0.7?                 │
│   If no: refine → go back to Stage 2            │
│   If yes: proceed                               │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│ Stage 5: Evolution/Composition (Evolver)       │
│   Optional: refine via GA/MAP-Elites            │
│   Optional: compose with existing seeds         │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│ Stage 6: Archive & Sign (SovereignSigner)       │
│   Sign seed with user's private key             │
│   Store in seed library                         │
│   Optionally publish to Commons                 │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
             Final Seed
        (signed, archived, verified)
```

### Sub-Agent Interface

```typescript
interface SubAgent {
  name: string
  stage: number
  isLLMBacked: boolean     // True: uses LLM. False: deterministic
  hasToolAccess: boolean    // True: can invoke tools
  toolNames: string[]
  
  async execute(input: AgentMessage, ctx: AgentContext): Promise<AgentResult>
}
```

### Agent API Endpoints

```
POST /api/agents/generate-seed
  Body: { description: string, domain?: string, constraints?: Record<string, any> }
  Response: { seed: UniversalSeed, confidence: number, alternatives: Seed[] }
  
POST /api/agents/refine
  Body: { seedHash: string, feedback: string }
  Response: { refinedSeed: UniversalSeed, confidence: number }
  
GET /api/agents/memory/exemplars
  Response: { exemplars: SeedRef[] }
  
POST /api/agents/memory/record
  Body: { seed: UniversalSeed, description: string, rating: number }
  Response: { stored: true }
```

---

*End of Comprehensive Execution Plan — Ready for Phase 0 Kickoff*
