# GSPL Language Reference
## Generative Seed Programming Language — v2.0

GSPL is the sovereign language of digital creation. Every digital artifact — image, audio, 3D model, game, molecule, world, website, app, simulation — is a seed that grows reproducibly under a verifiable deterministic kernel.

---

## Core Concepts

### Seeds
A **seed** is a typed generative program. It declares genes, constraints, and relationships. The kernel grows a seed into a real artifact using a seeded PRNG (xoshiro256**) — same seed always produces the same artifact.

```gspl
seed GlitchPoster {
  gene aesthetic:   categorical in ["brutalist", "cyberpunk", "minimal"]
  gene density:     scalar in [0.1, 1.0]
  gene colorDepth:  scalar in [0.0, 1.0]
  gene hasGlitch:   boolean
}
```

### Growing
`grow` executes the generator for a seed, producing a real file:

```gspl
grow GlitchPoster from {
  aesthetic: "cyberpunk",
  density:   0.8,
  colorDepth: 0.9,
  hasGlitch: true
}
```

### Breeding
`breed` combines two seeds genetically:

```gspl
let child = breed(seedA, seedB)
```

### Mutation
`mutate` applies small stochastic perturbations within a budget:

```gspl
let variant = mutate(parent, budget: 0.15)
```

### Composition
`compose` bridges seeds across domains:

```gspl
let musicFromWorld = compose(worldSeed as "world", to: "music")
```

### Evolution
`evolve` runs a selection algorithm to optimize for a fitness function:

```gspl
evolve GlitchPoster
  using map-elites
  for 100 generations
  optimizing { density, colorDepth }
  where fitness = rate(grow(self))
```

---

## Gene Types

| Type | Description | Example |
|---|---|---|
| `scalar` | Continuous number | `gene density: scalar in [0.0, 1.0]` |
| `categorical` | Enum choice | `gene style: categorical in ["minimal","brutalist"]` |
| `vector` | Float array | `gene palette: vector[3] in [-1.0, 1.0]` |
| `expression` | Math formula | `gene curve: expression` |
| `struct` | Named fields | `gene body: struct { height: scalar, width: scalar }` |
| `array` | Homogeneous list | `gene layers: array[scalar]` |
| `graph` | Nodes + edges | `gene stateMachine: graph` |
| `topology` | Surface/manifold | `gene surface: topology` |
| `temporal` | Time-varying signal | `gene envelope: temporal` |
| `regulatory` | Gene-expression network | `gene network: regulatory` |
| `field` | Spatial distribution | `gene heightmap: field` |
| `symbolic` | Abstract symbol | `gene sigil: symbolic` |
| `quantum` | Superposition state | `gene state: quantum` |
| `gematria` | Numerological encoding | `gene name: gematria` |
| `resonance` | Harmonic profile | `gene timbre: resonance` |
| `dimensional` | Embedding coordinates | `gene position: dimensional` |
| `sovereignty` | Ownership chain (**immutable**) | `gene owner: sovereignty` |

---

## Standard Library

### `std/core`
```gspl
import { map, filter, reduce, zip, range, lerp, clamp, smoothstep } from "std/core"
```

### `std/geometry`
```gspl
import { Vec2, Vec3, Vec4, Mat3, Mat4, Quaternion, AABB, Ray } from "std/geometry"
```

### `std/noise`
```gspl
import { fbm, perlin, simplex, voronoi, worley, domain_warp } from "std/noise"
let h = fbm(x, y, octaves: 6, persistence: 0.5, lacunarity: 2.0)
```

### `std/color`
```gspl
import { RGB, HSL, HSV, oklch, srgb_to_linear, gamut_clip } from "std/color"
```

### `std/music`
```gspl
import { Note, Scale, Chord, Interval, MIDI, TET12 } from "std/music"
let chord = Chord.from(Note.C4, Scale.dorian)
```

### `std/physics`
```gspl
import { Vec3, integrate_euler, integrate_rk4, spring, collision_elastic } from "std/physics"
```

---

## Domain Libraries

All domain libraries are imported from `data/commons/libraries/`:

```gspl
import { AminoAcid, CodonTable, BodyPlan } from "biology"
import { Element, Bond, Molecule, NIST_CONSTANTS } from "chemistry"
import { PlanckUnits, FundamentalConstants } from "physics"
import { Galaxy, StellarClass, HubbleConstant } from "cosmology"
import { TetrominoSet, ScrabbleBag, MorseCode } from "culture_history"
```

---

## Full Example: Sovereign Music Seed

```gspl
import { Note, Scale, Chord } from "std/music"

seed SovereignTrack {
  gene tempo:      scalar in [60.0, 180.0]
  gene key:        categorical in ["C","D","E","F","G","A","B"]
  gene scale:      categorical in ["major","minor","dorian","phrygian","lydian","mixolydian","locrian"]
  gene complexity: scalar in [0.0, 1.0]
  gene mood:       categorical in ["dark","bright","melancholic","triumphant","ambient","frantic"]
  gene duration:   scalar in [30.0, 300.0]
  gene owner:      sovereignty
}

fn fitness(track: SovereignTrack) -> scalar {
  let harmonic  = rate_harmonic_coherence(track)
  let rhythmic  = rate_rhythmic_variation(track)
  let emotional = rate_emotional_arc(track)
  return (harmonic + rhythmic + emotional) / 3.0
}

evolve SovereignTrack
  using map-elites
  for 200 generations
  optimizing { tempo, complexity }
  where fitness = fitness(self)
```

---

## Operators

| Operator | Description |
|---|---|
| `breed(a, b)` | Cross two seeds |
| `mutate(s, budget)` | Perturb a seed |
| `compose(s, to: domain)` | Cross-domain composition |
| `grow(s)` | Execute generator |
| `evolve ... using ... for ... optimizing ... where fitness =` | Evolution loop |
| `rate(a)` | Rate an artifact |
| `sign(s)` | Sign with device key |
| `anchor(s)` | Anchor on-chain |
| `diff(a, b)` | Gene distance |
| `interpolate(a, b, t)` | Lerp between seeds |

---

## Grammar Summary

```
program       := (import_decl | seed_decl | fn_decl | type_decl | trait_decl | evolve_stmt | expr_stmt)*
import_decl   := 'import' '{' ident (',' ident)* '}' 'from' string_lit
seed_decl     := 'seed' IDENT '{' gene_decl* '}'
gene_decl     := 'gene' IDENT ':' gene_type ('in' range_lit)?
gene_type     := 'scalar' | 'categorical' | 'vector' '[' INT ']' | 'boolean' | 'struct' | 'array' | 'graph' | 'topology' | 'temporal' | 'regulatory' | 'field' | 'symbolic' | 'quantum' | 'gematria' | 'resonance' | 'dimensional' | 'sovereignty'
fn_decl       := 'fn' IDENT '(' params ')' '->' type '{' stmt* '}'
evolve_stmt   := 'evolve' IDENT 'using' algorithm 'for' INT 'generations' ('optimizing' '{' idents '}')? ('where' 'fitness' '=' expr)?
algorithm     := 'ga' | 'map-elites' | 'cmaes' | 'poet' | 'nslc' | 'dqd' | 'aurora'
```
