# GSPL Language Reference

**Generative Seed Programming Language v2.0**

GSPL is a declarative language for defining, evolving, and composing **UniversalSeeds** — living blueprints that carry typed genes and grow into domain-specific artifacts through deterministic engines.

---

## Seed Declaration

Every GSPL program defines one or more seeds:

```gspl
seed DragonKnight {
  domain: character;
  gene strength: scalar = 0.85;
  gene agility: scalar = 0.6;
  gene element: categorical = "fire" | "ice" | "shadow";
  gene palette: vector = [0.8, 0.2, 0.1];
}
```

A seed declaration consists of a name, a domain, and one or more gene definitions.

**Syntax:**
```
seed <Name> {
  domain: <domain>;
  gene <name>: <type> = <value>;
  ...
}
```

---

## Domains (27)

Each domain has a dedicated growth engine that transforms seed genes into a domain-specific artifact.

| Domain | Description | Key Genes |
|--------|-------------|-----------|
| `character` | RPG characters with stats, appearance, equipment | strength, agility, palette, class |
| `sprite` | 2D pixel art with animation frames | resolution, palette, frame_count |
| `music` | Music generation — tempo, key, instruments | tempo, key, scale, instruments |
| `visual2d` | 2D art — style, palette, composition | style, palette, composition |
| `procedural` | Procedural content — L-systems, noise | rule_set, iterations, scale |
| `fullgame` | Complete game blueprints | genre, mechanics, world_size |
| `animation` | Skeletal animation — keyframes, motion | fps, keyframes, easing |
| `geometry3d` | 3D meshes — vertices, faces | resolution, topology, subdivisions |
| `narrative` | Story generation — plot, characters, arcs | tone, structure, length |
| `ui` | UI components — layout, styles | layout, theme, density |
| `physics` | Physics simulation — forces, constraints | gravity, friction, elasticity |
| `audio` | Sound effects — synthesis, filters | frequency, waveform, envelope |
| `ecosystem` | Ecosystems — populations, interactions | species_count, carrying_capacity |
| `game` | Game rules — state machines, win conditions | complexity, player_count |
| `alife` | Artificial life — boids, evolution | population, mutation_rate |
| `shader` | GLSL shader code generation | technique, complexity, inputs |
| `particle` | Particle systems — emitters, forces | emit_rate, lifetime, forces |
| `typography` | Font/text generation — glyphs, kerning | weight, style, x_height |
| `architecture` | Building generation — rooms, structure | floors, style, symmetry |
| `vehicle` | Vehicle design — chassis, physics | speed, handling, weight |
| `furniture` | Parametric furniture | material, ergonomics, style |
| `fashion` | Clothing patterns and design | fabric, silhouette, color |
| `robotics` | Robot design — joints, sensors | dof, sensor_count, actuators |
| `circuit` | Electronic circuits — logic gates | gate_count, depth, io_pins |
| `food` | Recipe generation — ingredients, steps | cuisine, complexity, servings |
| `choreography` | Dance/motion sequences | tempo, style, duration |
| `agent` | Native GSPL agent — personality, reasoning | personality, capability, memory |

---

## Gene Types (17)

Each gene carries a typed value. Every type implements four operators: **validate**, **mutate**, **crossover**, and **distance**.

### `scalar`
A floating-point value in [0, 1].
```gspl
gene strength: scalar = 0.8;
```
- **Mutate:** Gaussian perturbation, clamped to [0, 1]
- **Crossover:** Weighted blend between parents
- **Distance:** Absolute difference

### `categorical`
One value from a fixed set of choices.
```gspl
gene element: categorical = "fire" | "ice" | "shadow" | "light";
```
- **Mutate:** Random shuffle to another choice
- **Crossover:** Single-point selection from either parent
- **Distance:** Hamming distance (0 = same, 1 = different)

### `vector`
Array of floats (any dimension).
```gspl
gene palette: vector = [0.8, 0.2, 0.1];
gene position: vector = [0.0, 0.5, 1.0, 0.3];
```
- **Mutate:** Per-component Gaussian perturbation
- **Crossover:** Component-wise interpolation
- **Distance:** Euclidean distance

### `expression`
Mathematical expression string, evaluated symbolically.
```gspl
gene growth_rate: expression = "sin(t) * 0.5 + 0.5";
```
- **Mutate:** Coefficient perturbation or operator swap
- **Crossover:** Sub-expression exchange

### `struct`
Nested key-value object.
```gspl
gene appearance: struct = { height: 1.8, build: "athletic", scars: 2 };
```
- **Mutate:** Per-field mutation based on inferred sub-types
- **Crossover:** Field-wise selection from parents

### `array`
Ordered list of homogeneous items.
```gspl
gene inventory: array = ["sword", "shield", "potion"];
```
- **Mutate:** Insert, remove, or swap elements
- **Crossover:** Alternating selection

### `graph`
Node-edge structure.
```gspl
gene skill_tree: graph = { nodes: ["attack", "defend", "magic"], edges: [["attack", "magic"]] };
```
- **Mutate:** Add/remove nodes or edges
- **Crossover:** Graph union
- **Distance:** Edit distance

### `topology`
Spatial connectivity description (adjacency, boundaries).
- **Mutate:** Boundary deformation
- **Crossover:** Region merge

### `temporal`
Time-series or duration data.
```gspl
gene lifecycle: temporal = { duration: 60, events: [0.0, 0.3, 0.7, 1.0] };
```
- **Mutate:** Time stretch/compress
- **Crossover:** Temporal merge
- **Distance:** Dynamic time warping

### `regulatory`
Gene expression control (on/off switches, thresholds).
- **Mutate:** Threshold shift
- **Crossover:** Boolean combination

### `field`
Continuous scalar/vector field over a domain (e.g., temperature map).
- **Mutate:** Noise perturbation
- **Crossover:** Field blending

### `symbolic`
Symbolic token sequence (DNA-like or rule-based).
- **Mutate:** Token substitution
- **Crossover:** Single-point or two-point crossover

### `quantum`
Complex amplitude vector (quantum state representation).
```gspl
gene state: quantum = { amplitudes: [0.707, 0.707], phases: [0.0, 3.14] };
```
- **Mutate:** Phase rotation
- **Crossover:** Quantum entanglement (state mixing)
- **Distance:** Fidelity metric

### `gematria`
Numeric encoding of text (letter-to-number mapping).
- **Mutate:** Letter substitution preserving numeric sum
- **Crossover:** Substring exchange

### `resonance`
Frequency/harmonic data.
```gspl
gene harmonics: resonance = { fundamental: 440, overtones: [880, 1320] };
```
- **Mutate:** Frequency shift
- **Crossover:** Harmonic blending

### `dimensional`
Multi-dimensional coordinate or embedding.
- **Mutate:** Displacement in latent space
- **Crossover:** Midpoint interpolation

### `sovereignty`
Immutable ownership/provenance data. Cannot be mutated or crossed over.
```gspl
gene provenance: sovereignty = { creator: "0x...", signed: true };
```
- **Mutate:** No-op (immutable by design)
- **Crossover:** No-op
- **Distance:** Binary (0 = identical, 1 = different)

---

## Operations

### Mutation
Perturb a seed's genes by a mutation rate (0.0 = no change, 1.0 = maximum change).
```
POST /api/seeds/:id/mutate
{ "rate": 0.3 }
```

### Breeding (Crossover)
Create an offspring from two parent seeds via gene crossover.
```
POST /api/seeds/breed
{ "parent_a_id": "...", "parent_b_id": "..." }
```

### Evolution
Run a genetic algorithm: generate a population, mutate, breed, select fittest.
```
POST /api/seeds/:id/evolve
{ "population_size": 8, "generations": 3 }
```

### Growth
Execute the domain engine to produce a concrete artifact from the seed.
```
POST /api/seeds/:id/grow
```

### Composition
Transform a seed from one domain to another via functor bridges.
```
POST /api/seeds/:id/compose
{ "target_domain": "sprite" }
```

---

## Functor Bridges (12)

Functors define how genes map between domains. The composition engine finds multi-hop paths via BFS.

| From | To | Functor | Semantic Mapping |
|------|----|---------|------------------|
| character | sprite | character_to_sprite | Appearance genes to pixel art parameters |
| character | music | character_to_music | Class/personality to key/tempo/instrumentation |
| character | visual2d | character_to_visual | Appearance to color palette and composition |
| music | character | music_to_character | Key/tempo to personality and agility |
| visual2d | music | visual_to_music | Hue to pitch, saturation to timbre |
| procedural | geometry3d | proc_to_mesh | L-system rules to vertex buffer |
| narrative | character | story_to_character | Role/backstory to stats and personality |
| agent | character | agent_to_character | Agent personality to character genes |
| agent | narrative | agent_to_narrative | Reasoning style to plot structure |
| character | agent | character_to_agent | Character traits to agent personality |
| geometry3d | visual2d | mesh_to_sprite | 3D silhouette to 2D sprite outline |
| physics | animation | physics_to_animation | Force simulation to motion keyframes |

Multi-hop example: `music` → `character` → `sprite` (music becomes a character, character becomes a sprite).

---

## Deterministic RNG

All operations use **xoshiro256\*\*** seeded by the seed's `$hash`. Given the same seed JSON, every operation produces identical results. No `Math.random()` is used anywhere in the kernel.

---

## GSPL Examples

### Create a character and compose to music
```gspl
seed WarriorBard {
  domain: character;
  gene strength: scalar = 0.9;
  gene charisma: scalar = 0.7;
  gene class: categorical = "bard" | "fighter" | "rogue";
  gene palette: vector = [0.8, 0.3, 0.1];
}
```
Then via API: `POST /api/seeds/:id/compose { "target_domain": "music" }` to produce a musical interpretation of the warrior.

### Define an ecosystem
```gspl
seed CoralReef {
  domain: ecosystem;
  gene species_count: scalar = 0.8;
  gene temperature: scalar = 0.6;
  gene depth: scalar = 0.4;
  gene biodiversity: vector = [0.9, 0.7, 0.5, 0.3];
}
```

### Create an agent
```gspl
seed CreativeAssistant {
  domain: agent;
  gene personality: struct = { curiosity: 0.9, creativity: 0.8, precision: 0.6 };
  gene capability: categorical = "generalist" | "specialist" | "critic";
  gene memory: scalar = 0.7;
}
```

---

## API Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Create seed | POST | `/api/seeds` |
| Generate from prompt | POST | `/api/seeds/generate` |
| Mutate | POST | `/api/seeds/:id/mutate` |
| Breed | POST | `/api/seeds/breed` |
| Evolve | POST | `/api/seeds/:id/evolve` |
| Grow (execute engine) | POST | `/api/seeds/:id/grow` |
| Compose (cross-domain) | POST | `/api/seeds/:id/compose` |
| Edit gene | PUT | `/api/seeds/:id/genes` |
| GSPL parse | POST | `/api/gspl/parse` |
| GSPL execute | POST | `/api/gspl/execute` |
| Agent query | POST | `/api/agent/query` |
| Sign seed | POST | `/api/seeds/:id/sign` |
| Mint NFT | POST | `/api/seeds/:id/mint` |
| Interactive docs | GET | `/api-docs/ui` |

Full OpenAPI specification available at `/api-docs`.
