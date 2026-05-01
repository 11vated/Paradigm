# 02 — The 17-Type Gene System

The gene system is the **formal type theory of creative expression** on which the entire platform stands. Each of the 17 types encodes a fundamentally different kind of creative information and comes with its own mutation, crossover, distance, and validation operators. The set is closed under composition: any artifact in any domain can be expressed as a combination of these 17 types.

This spec is load-bearing. Any rebuild must match these 17 types exactly, with identical operator semantics.

## The 17 Types

| # | Name | Encodes | Example Gene |
|---|------|---------|--------------|
| 1 | `scalar` | Continuous numeric values | `size`, `intensity`, `speed` |
| 2 | `categorical` | Discrete choices from finite sets | `species`, `genre`, `archetype` |
| 3 | `vector` | Multi-dimensional numeric arrays | `color(rgb)`, `position(xyz)`, `direction(xy)` |
| 4 | `expression` | Runtime-evaluated mathematical formulas | `x → sin(x*π)/2` |
| 5 | `struct` | Composite records with named fields | `{head, torso, limbs}` |
| 6 | `array` | Ordered homogeneous collections | `melody_notes[32]` |
| 7 | `graph` | Nodes and edges encoding relational structure | `state_machine`, `skill_tree` |
| 8 | `topology` | Surface and manifold descriptions | `silhouette`, `blend_shapes` |
| 9 | `temporal` | Time-varying signals and envelopes | `motion_curve`, `ADSR` |
| 10 | `regulatory` | Gene-expression control networks | `personality_traits → behavior_bias` |
| 11 | `field` | Continuous spatial distributions | `density_field`, `temperature_map` |
| 12 | `symbolic` | Abstract symbolic representations | `story_grammar`, `dialogue_tree` |
| 13 | `quantum` | Superposition and entanglement states | `style_superposition(cubist, art_nouveau)` |
| 14 | `gematria` | Numerological / symbolic-numeric encodings | `name_numerology`, `title_resonance` |
| 15 | `resonance` | Harmonic frequency profiles | `voice_timbre`, `material_tap_tone` |
| 16 | `dimensional` | Embedding-space coordinates | `style_embedding`, `semantic_vector` |
| 17 | `sovereignty` | Cryptographic ownership chains | `author_key`, `lineage_proof` |

Every gene in every seed is exactly one of these 17 types.

## Common Operator Interface

Every gene type implements the same four operators. In TypeScript-like pseudocode:

```ts
interface GeneType<T> {
  readonly name: string;

  // Validation: is this value a legal instance of the type?
  validate(value: unknown): Result<T, ValidationError>;

  // Mutation: produce a new value from an existing one under the given rate and RNG.
  mutate(value: T, rate: number, rng: DeterministicRng): T;

  // Crossover: combine two parent values into a child value.
  crossover(a: T, b: T, rng: DeterministicRng): T;

  // Distance: symmetric, non-negative metric, 0 iff a == b.
  distance(a: T, b: T): number;

  // Canonicalization: produce a byte-stable representation for hashing.
  canonicalize(value: T): Bytes;
}
```

The operators must be:

- **Pure** — no side effects, no wall clock, no network.
- **Deterministic** — given the same inputs (including RNG state), produce the same output bit-for-bit.
- **Symmetric** where appropriate — `distance(a, b) == distance(b, a)`; `crossover(a, b)` should be either symmetric or documented as asymmetric (e.g., for directed graphs).

## Type-by-Type Specification

### 1. `scalar`

**Value type:** `f64` (IEEE-754 double precision)

**Validation:** must be finite (no NaN, no ±∞). Optional bounded variants `scalar<min, max>` enforce inclusive bounds.

**Mutation:** Gaussian additive mutation. `v' = clamp(v + sigma * N(0, 1))` where `sigma = rate * (max - min)` for bounded scalars, or `sigma = rate * max(|v|, 1)` for unbounded. `N(0, 1)` is drawn via Box–Muller from the deterministic RNG.

**Crossover:** Blend (BLX-α) with α = 0.5: `v' = v_a + rng.uniform() * (v_b - v_a)`.

**Distance:** `|a - b|` normalized by the range for bounded scalars, or by `max(|a|, |b|, 1)` for unbounded.

**Canonicalization:** IEEE-754 binary64, little-endian.

### 2. `categorical`

**Value type:** string, constrained to a finite enumerated set `choices: string[]`

**Validation:** `value ∈ choices`.

**Mutation:** with probability `rate`, pick a different choice uniformly at random via the RNG.

**Crossover:** pick `a` or `b` with equal probability.

**Distance:** 0 if equal, 1 if different. (Hamming-style.)

**Canonicalization:** UTF-8 bytes of the chosen string.

### 3. `vector`

**Value type:** `f64[N]` for fixed `N` given by the gene spec.

**Validation:** length matches `N`; every component is finite.

**Mutation:** component-wise Gaussian additive; each component mutates independently under the same `rate`.

**Crossover:** arithmetic mean with per-component blend weight drawn from the RNG: `v'[i] = α[i] * a[i] + (1 - α[i]) * b[i]`.

**Distance:** Euclidean norm `||a - b||_2`.

**Canonicalization:** concatenation of IEEE-754 binary64 components, little-endian.

### 4. `expression`

**Value type:** an AST of a small pure expression language with numeric variables, standard math functions (sin, cos, exp, log, pow, abs, min, max, clamp), arithmetic, and constants.

**Validation:** parses; all referenced variables are declared; no recursion; AST depth ≤ 32.

**Mutation:** one of: substitute a sub-tree with a randomly generated one of matching arity; perturb a numeric constant (Gaussian); swap an operator with a compatible one; simplify via algebraic rewrite rules.

**Crossover:** sub-tree swap — pick a node in `a` and a compatible node in `b`, swap their sub-trees.

**Distance:** tree edit distance between canonicalized ASTs.

**Canonicalization:** post-order serialization of the AST with fully-parenthesized operators and IEEE-754 constants.

### 5. `struct`

**Value type:** a fixed-schema record `{field_1: GeneValue, field_2: GeneValue, ...}` where each field has its own gene type.

**Validation:** every field in the schema is present and validates under its field-specific type.

**Mutation:** with probability `rate`, mutate one randomly-chosen field using its type's mutator.

**Crossover:** for each field independently, either take `a`'s value, `b`'s value, or apply that field type's own crossover, chosen uniformly.

**Distance:** weighted sum of per-field distances, weights supplied by the struct schema.

**Canonicalization:** serialize fields in declared order, each via its own canonicalizer, prefixed with the field name.

### 6. `array`

**Value type:** `GeneValue[N]` where every element is the same gene type and `N` is either fixed or bounded.

**Validation:** length within bounds; every element validates under the element type.

**Mutation:** one of: mutate a randomly-chosen element; insert a new randomly-generated element (if variable-length); delete an element; swap two elements.

**Crossover:** one-point crossover at an index drawn from the RNG, for fixed-length arrays. For variable-length, ordered crossover (OX) from genetic-programming literature.

**Distance:** for equal-length arrays, mean per-element distance. For variable-length, edit distance under the element type's own distance.

**Canonicalization:** length-prefixed, element-wise.

### 7. `graph`

**Value type:** `{ nodes: Node[], edges: Edge[] }` where nodes and edges may carry typed attributes drawn from the 17-type system.

**Validation:** every edge references existing node ids; no self-loops unless explicitly allowed; node and edge attributes validate under their types.

**Mutation:** one of: add a node; remove a node (and its incident edges); add an edge; remove an edge; mutate a node attribute; mutate an edge attribute.

**Crossover:** pick a random sub-graph of `a`, find a compatible insertion point in `b`, splice.

**Distance:** graph edit distance (approximate). Canonical implementation uses the Weisfeiler-Lehman hashing shortcut for non-isomorphism detection and falls back to assignment-based GED only when hashes collide.

**Canonicalization:** sort nodes by a stable canonical id derived from their attributes, then serialize in sorted order; edges serialized as sorted (from, to, attributes) tuples.

### 8. `topology`

**Value type:** a surface descriptor — typically a pair `(base_mesh, blend_shapes[])` or an implicit description via SDF (signed distance function) parameters.

**Validation:** the surface is manifold (every edge shared by exactly two faces) OR an explicit non-manifold flag is set; all vertex references are in-range.

**Mutation:** one of: perturb vertex positions; perturb blend-shape weights; perturb SDF parameters; insert/remove a loop cut.

**Crossover:** for SDF-based topology, interpolate SDF parameters. For mesh-based, remesh-then-blend via a shared UV parameterization.

**Distance:** Hausdorff distance between surface samples, normalized by bounding box diagonal.

**Canonicalization:** vertex buffer + index buffer, vertices sorted by (x, y, z) lexicographic order with a deterministic tie-breaker, indices re-mapped accordingly.

### 9. `temporal`

**Value type:** a time-varying signal — either keyframed (`(time, value)[]`) or procedural (`expression` over `t`) or a parametric envelope (`{attack, decay, sustain, release}`).

**Validation:** keyframes monotonically non-decreasing in time; all values finite; procedural expressions reference only `t` and declared constants.

**Mutation:** one of: perturb keyframe values; perturb keyframe times (preserving monotonicity); insert a new keyframe at a random time; delete a keyframe; mutate a procedural expression.

**Crossover:** for keyframed, interleave keyframes from both parents at shared time points using per-keyframe blend. For procedural, use `expression` crossover.

**Distance:** L2 distance between densely sampled values over a normalized time interval.

**Canonicalization:** sorted keyframes serialized as fixed-precision (time, value) pairs, or canonicalized AST for procedural.

### 10. `regulatory`

**Value type:** a gene-regulatory network `{nodes: regulator[], edges: {from, to, weight, delay}[]}` modelling how one gene's activation biases another's expression.

**Validation:** nodes reference declared gene names; weights finite; delays non-negative integers.

**Mutation:** perturb weights (Gaussian); add or remove edges; add or remove regulators; alter a regulator's activation function.

**Crossover:** edge-set crossover — take a random subset of `a`'s edges and overlay onto `b`'s node set, reconciling weight conflicts by averaging.

**Distance:** structural edit distance plus weight L2.

**Canonicalization:** sorted node list then sorted edge list by (from, to) with stable id mapping.

### 11. `field`

**Value type:** a continuous spatial distribution, typically represented by an SDF composition tree with primitives (sphere, box, cylinder, torus, capsule, cone, hexPrism), operators (union, intersect, subtract, smoothUnion, displace, twist, bend, repeat, scale), and noise layers (Perlin, Simplex, turbulence, domain warp).

**Validation:** tree depth bounded; all parameters finite; operator arities satisfied.

**Mutation:** one of: perturb primitive parameters; swap an operator; add a noise layer; remove a primitive; replace a sub-tree with a randomly-generated one.

**Crossover:** sub-tree swap under operator-type compatibility.

**Distance:** L2 distance between densely sampled field values over a bounding volume.

**Canonicalization:** post-order serialization of the field composition tree.

### 12. `symbolic`

**Value type:** an abstract symbolic structure — typically a grammar derivation, a dialogue tree, a story graph, or a rule set.

**Validation:** well-formed with respect to its declared grammar or schema; all symbols in a declared alphabet; no orphan references.

**Mutation:** one of: rewrite a sub-tree using a grammar rule; swap a leaf symbol; add or remove a production.

**Crossover:** sub-tree swap across compatible non-terminals.

**Distance:** tree edit distance on the canonical parse tree.

**Canonicalization:** canonical parse-tree serialization in a fixed grammar-derivation order.

### 13. `quantum`

**Value type:** a superposition `{amplitudes: complex[], basis: string[]}` where `|amplitudes|^2` sums to 1. Basis entries are discrete choices the superposition is over. Optional entanglement pointers reference other `quantum` genes.

**Validation:** normalization within ε; basis ⊆ declared domain vocabulary; entangled references exist.

**Mutation:** unitary rotation by a random angle on a randomly chosen basis pair; or partial collapse (projection onto a sub-space).

**Crossover:** tensor-product combination followed by re-normalization.

**Distance:** fidelity distance `1 - |⟨a|b⟩|^2`.

**Canonicalization:** amplitudes sorted by basis in canonical lexicographic order, serialized as (real, imag) IEEE-754 pairs.

**Note:** `quantum` is used for stylistic superpositions, probabilistic dialogue branches, and non-committal creative choices that collapse at grow-time based on auxiliary RNG draws. It is not physical quantum computation.

### 14. `gematria`

**Value type:** a mapping from symbol sequences (names, titles, words) to numeric encodings under one of several declared gematric systems (Hebrew, Greek, English ordinal, English reduced, Pythagorean, etc.).

**Validation:** symbol sequence legal under the declared alphabet; numeric encoding matches the system's rules.

**Mutation:** substitute a symbol with one of equivalent numeric weight; perturb to a neighbor in the encoding space.

**Crossover:** sequence crossover respecting total numeric weight as a soft constraint.

**Distance:** numeric distance plus edit distance on the symbol sequence.

**Canonicalization:** `(system, sequence, computed_value)` triple.

**Note:** `gematria` is used for archetypal/numerological grounding in narrative, character, and naming systems. It is a formal encoding, not a mystical claim.

### 15. `resonance`

**Value type:** a harmonic frequency profile `{fundamentals: f64[], partials: {freq_ratio, amplitude, phase}[], damping: f64}` representing a timbral signature.

**Validation:** all frequencies positive; amplitudes in [0, 1]; phases in [0, 2π); damping in [0, 1].

**Mutation:** perturb a partial's amplitude; shift a phase; add or remove a partial; adjust damping.

**Crossover:** partial-set crossover with amplitude blending on shared partials.

**Distance:** L2 distance in (frequency, amplitude) space after alignment.

**Canonicalization:** partials sorted by frequency ratio, serialized as fixed-precision triples.

**Note:** `resonance` is used by the Audio engine for synthesized voices and by Character/Physics for material tap-tones (a sword rings differently than a wooden staff).

### 16. `dimensional`

**Value type:** a fixed-dimensional embedding vector `f64[D]`, typically `D ∈ {64, 128, 256, 512, 768, 1024}`.

**Validation:** length matches `D`; all components finite.

**Mutation:** Gaussian additive with clipping to the unit ball (optional).

**Crossover:** SLERP (spherical linear interpolation) for unit-normalized vectors, or linear for unconstrained.

**Distance:** cosine distance `1 - (a·b)/(||a|| ||b||)`, or Euclidean as a fallback.

**Canonicalization:** length-prefixed IEEE-754 binary64 components, little-endian.

**Note:** `dimensional` is the bridge to learned-embedding spaces (CLIP-like style embeddings, semantic vectors, behavior descriptors for Novelty Search and MAP-Elites axes). It's the only type that can carry information produced by an external ML model, and it's explicitly marked as such to preserve determinism boundaries.

### 17. `sovereignty`

**Value type:** `{author_pubkey: JWK, lineage_proof: ContentHash[], signature: Bytes}`.

**Validation:** public key parses; lineage_proof is non-empty for non-primordial seeds; signature verifies against the canonicalized seed sans `$sovereignty.signature`.

**Mutation:** **forbidden**. Sovereignty genes are immutable once signed; mutation of any other gene produces a *new* sovereignty gene via re-signing by the mutator's own key.

**Crossover:** **forbidden**. Breeding produces a new sovereignty gene whose `lineage_proof` is the union of both parents' hashes, signed by the breeder.

**Distance:** equality on the public key; otherwise distance is undefined (not a metric space).

**Canonicalization:** JWK in RFC 7638 canonical form; lineage_proof sorted; signature base64.

**Note:** `sovereignty` is a meta-type. It does not represent creative content — it represents cryptographic identity over the rest of the seed.

## Cross-Type Coercion

The platform does **not** support implicit coercion between gene types. A `scalar` cannot be read as a `vector`, a `categorical` cannot be read as a `symbolic`. Explicit casts exist but must be annotated in GSPL source:

```gspl
let my_scalar_as_vec = vector::from_scalar(my_scalar, dim = 3)
```

Coercion operators are type-pair-specific and limited to a small whitelist documented in [`language/stdlib.md`](../language/stdlib.md).

## Why Exactly 17

The 17 types are not arbitrary. They are the result of asking: *what is the minimum set of types closed under composition that can express every artifact in every domain we care about?*

- `scalar`, `categorical`, `vector`, `struct`, `array` are the basic algebra of data.
- `expression`, `graph`, `symbolic` are the algebra of *computation and structure*.
- `topology`, `field`, `temporal`, `resonance` are the algebra of *physical and perceptual continua*.
- `regulatory`, `quantum`, `dimensional` are the algebra of *indirection and learned spaces*.
- `gematria` is the algebra of *culturally-grounded symbolism* (names, titles, lore).
- `sovereignty` is the algebra of *identity and authorship*.

Removing any type loses expressiveness in a way that cannot be recovered by composition of the rest. Adding any further type introduces redundancy. The set was arrived at empirically by implementing all 26 domain engines and pruning until no engine needed a type outside the set.

## Implementation Notes

Every gene type must ship with an extensive property-test suite verifying:

1. `validate(canonicalize⁻¹(canonicalize(v))) == Ok(v)` (round-trip stability)
2. `distance(a, a) == 0` (identity)
3. `distance(a, b) == distance(b, a)` (symmetry)
4. `distance(a, c) ≤ distance(a, b) + distance(b, c)` (triangle inequality, where defined)
5. `mutate(v, 0, rng) == v` (zero rate is the identity)
6. `crossover(a, a, rng) == a` (idempotence on identical parents)
7. `mutate` and `crossover` are deterministic functions of `(input, rng_state)`

These property tests are the type theory's "did we implement it correctly" safety net and must run on every CI build.
