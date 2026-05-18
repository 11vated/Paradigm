# PHASE 2: DOMAIN ELEVATION
## Weeks 6-9 — 27 Playable Domains, 50+ Functors, Viewports, .gseed Export, DAO Governance

**Objective:** All 27 domains produce interactive artifacts. 50+ functor bridges. Working Studio viewports. Dual format export. DAO governance functional.

---

## DAY 21-23: Generator Fidelity Audit (P2.1)

### Audit each of 27 domains:

| Domain | Type | Current Rating (1-5) | Target | Gap Description |
|--------|------|:---:|:---:|-----------------|
| character | 3D Model | 4 | 5 | Texture placeholders |
| sprite | 2D Sprite | 4 | 5 | Better frame animation |
| music | Audio | 3 | 5 | WAV export missing |
| visual2d | 2D Art | 3 | 4 | SVG export |
| geometry3d | 3D Mesh | 4 | 5 | Texture mapping |
| fullgame | Game | 3 | 5 | WASM compilation stub |
| animation | Animation | 3 | 4 | Skeletal animation |
| narrative | Story | 2 | 4 | Story engine missing |
| ui | UI | 2 | 3 | Code generation |
| physics | Physics | 2 | 3 | Better sim params |
| audio | Audio | 3 | 4 | Synthesis params |
| ecosystem | Simulation | 2 | 3 | Food web |
| game | Game | 3 | 4 | Playable loops |
| alife | Simulation | 2 | 3 | Agent behavior |
| shader | Visual | 3 | 4 | GLSL code gen |
| particle | Visual | 3 | 4 | Particle system |
| procedural | Assets | 2 | 3 | Asset generation |
| typography | Design | 2 | 3 | Font generation |
| architecture | 3D | 3 | 4 | BIM/CAD export |
| vehicle | 3D | 2 | 3 | Model generation |
| furniture | 3D | 2 | 3 | Model generation |
| fashion | 3D | 2 | 3 | Garment generation |
| robotics | Engineering | 1 | 3 | URDF export |
| circuit | Engineering | 1 | 3 | SPICE netlist |
| food | Lifestyle | 1 | 3 | Recipe output |
| choreography | Motion | 2 | 3 | Dance notation |
| agent | AI | 2 | 4 | Behavior config |

---

## DAY 23-27: Staged Pipeline Refactor (P2.2)

### Refactor each generator to DomainEngine interface

```typescript
// Template for all 27 domains
export const <domain>Engine: DomainEngine = {
  domain: '<domain>',
  version: '1.0.0',
  geneSchema: { /* domain-specific genes */ },
  stages: [
    { name: 'extract', run: (seed, ctx) => { /* extract genes */ } },
    { name: 'morphogenesis', run: (input, seed, rng) => { /* base form */ } },
    { name: 'populate', run: (input, seed, rng) => { /* populate */ } },
    { name: 'parameterize', run: (input, seed, rng) => { /* params */ } },
    { name: 'simulate', run: (input, seed, rng) => { /* sim */ } },
    { name: 'pose', run: (input, seed, rng) => { /* transforms */ } },
    { name: 'texture', run: (input, seed, rng) => { /* materials */ } },
    { name: 'render', run: (input, seed, rng) => { /* pixels/binary */ } },
  ],
  outputType: '<artifact_type>',
  validate: (seed) => { /* per-engine validation */ },
  grow: async (seed, ctx) => {
    // Ordered pipeline execution
    let state = seed
    for (const stage of this.stages) {
      const substream = ctx.rng.substream(stage.name)  // Deterministic sub-RNG!
      state = await stage.run(state, seed, substream)
    }
    return state  // Final artifact
  },
  renderHints: { viewportMode: '3d', ... },
  exportHints: { formats: ['glb', 'usdz'], ... }
}
```

---

## DAY 24-36: Rich Artifact Implementation (P2.3)

### Execution Plan (3 engineers, 12 days)

**Engineer 1 (Core Visual):**
- [ ] Sprite: PNG atlas with frame metadata
- [ ] Visual2D: SVG rendering engine
- [ ] Shader: GLSL code generation
- [ ] Particle: JSON particle system definition
- [ ] Procedural: JSON asset generation pipeline

**Engineer 2 (3D + Engineering):**
- [ ] Character: Full GLTF with skeleton + morph targets
- [ ] Geometry3D: OBJ/GLTF mesh export
- [ ] Architecture: GLTF with BIM metadata
- [ ] Vehicle: GLTF 3D model + specs
- [ ] Furniture: GLTF 3D model
- [ ] Fashion: GLTF garment model
- [ ] Robotics: URDF + GLTF visual

**Engineer 3 (Simulation + Audio + Games):**
- [ ] Music: MIDI + WAV synthesis
- [ ] Audio: WebAudio synthesis
- [ ] FullGame: HTML5 playable game
- [ ] Game: Minimal playable game
- [ ] Animation: Skeletal animation JSON
- [ ] Narrative: Markdown story output
- [ ] Ecosystem: Interactive simulation graph
- [ ] ALife: Agent behavior simulation
- [ ] Physics: Physics simulation params
- [ ] UI: React component code generation
- [ ] Typography: CSS/font output
- [ ] Food: Structured recipe JSON
- [ ] Choreography: Motion JSON + visualization
- [ ] Circuit: SPICE netlist JSON
- [ ] Agent: Behavior tree configuration

---

## DAY 28-33: Functor Network Expansion (P2.4)

### Categories (38 new functors)

| Category | From → To | Method |
|----------|-----------|--------|
| Visual→Audio | sprite→music, geometry3d→audio | Gene mapping + embeddings |
| Audio→Visual | music→sprite, audio→visual2d | Spectral→visual mapping |
| Narrative→X | narrative→game, →music, →character | Semantic transfer |
| Character→X | →animation, →game, →narrative | Domain vectors |
| Game→X | →fullgame, →architecture, →ecosystem | Feature composition |
| Domain→Self | character→char (mutation), music→music | Genetic drift |
| Scientific→Creative | physics→visual2d, ecosystem→game | Abstract→concrete |

### BFS Pathfinding

```typescript
function findCompositionPath(from: Domain, to: Domain): FunctorStep[] {
  // Dijkstra on functor graph
  // Nodes: 26 domains
  // Edges: registered functors (50+ after expansion)
  // Weight: 1 - similarity(functor.source, functor.target)
  // Returns optimal path + coherence score
}
```

---

## DAY 30-36: Viewport Implementation (P2.5)

| Viewport | Component | Domains |
|----------|-----------|---------|
| 3D | `Viewport3D.tsx` | character, geometry3d, architecture, vehicle, furniture, fashion, robotics |
| 2D Raster | `Viewport2D.tsx` | sprite, visual2d, particle |
| SVG | `ViewportSVG.tsx` | visual2d, procedural, typography |
| Audio | `ViewportAudio.tsx` | music, audio |
| Game | `ViewportGame.tsx` | fullgame, game, alife |
| Text | `ViewportCode.tsx` | narrative, circuit, procedural |
| Sim | `ViewportSim.tsx` | physics, ecosystem, agent |
| Anim | `ViewportAnimation.tsx` | animation, choreography |

---

## DAY 28-35: DAO Phase 2 (P2.6)

- [ ] Deploy PARA token to testnet
- [ ] Deploy DAO Governor contract
- [ ] API: `POST /api/dao/propose`
- [ ] API: `POST /api/dao/vote`
- [ ] API: `POST /api/dao/execute`
- [ ] API: `GET /api/dao/proposals`
- [ ] API: `GET /api/seeds/:id/sovereignty/onchain`

---

## DAY 34-36: .gseed Export (P2.7)

- [ ] Binary format encoder/decoder
- [ ] Compression (Zstd)
- [ ] Embedded signature
- [ ] API: `GET /api/seeds/:id/export.gseed`
- [ ] API: `POST /api/seeds/import.gseed`

---

## PHASE 2 COMPLETION CRITERIA

- [ ] All 27 domains produce artifacts (verified by E2E tests)
- [ ] All generators use staged pipeline with DomainEngine interface
- [ ] All generators use sub-RNG streams
- [ ] 50+ functor bridges registered
- [ ] BFS pathfinding works between any two domains
- [ ] 8 viewport types implemented and functional in Studio
- [ ] .gseed binary format: encode → decode → round-trip verified
- [ ] DAO governance functional (propose, vote, execute)
- [ ] SeedNFT minting on-chain via API
- [ ] `npm run test` → 100% pass (including new domain tests)
