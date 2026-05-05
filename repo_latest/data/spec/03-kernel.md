# 03 — The Kernel

The kernel is the deterministic execution substrate that every seed operation runs on. It owns the RNG, the tick cycle, the effect system, and the Fisher Information seed manifold. Everything above it (engines, evolution, composition, intelligence) depends on the kernel's guarantees.

## Subsystems

The kernel has five subsystems. Each is described in full below.

1. **DeterministicRng** — the RNG hierarchy (`xoshiro256**` + `SplitMix64` + `FNV-1a` + `Box–Muller`).
2. **SeedManifold** — the Fisher Information Matrix representation of the seed space.
3. **TickCycle** — the 8-phase execution loop.
4. **EffectSystem** — the 8 algebraic effects and their handlers.
5. **Scheduler** — the deterministic task queue.

---

## 1. DeterministicRng

All randomness in Paradigm flows from this subsystem. No other source of randomness is permitted anywhere above the kernel (the only exceptions are ECDSA signature nonces, which come from a cryptographic RNG, and are never used to produce artifact content).

### The primary algorithm: xoshiro256\*\*

`xoshiro256**` (Blackman–Vigna 2018) is the primary PRNG. It has:

- 256-bit state (four 64-bit words).
- A period of 2²⁵⁶ − 1.
- Excellent statistical properties (passes BigCrush).
- O(1) jump-ahead by 2¹²⁸ for parallel streams without overlap.
- Fast scalar output: a few nanoseconds per draw on modern CPUs.

The state update is a fixed 5-line algorithm; the output is `rotl(s[1] * 5, 7) * 9`. Reference pseudocode:

```
state: u64[4]

fn next() -> u64:
    result = rotl(state[1] * 5, 7) * 9
    t = state[1] << 17
    state[2] ^= state[0]
    state[3] ^= state[1]
    state[1] ^= state[2]
    state[0] ^= state[3]
    state[2] ^= t
    state[3] = rotl(state[3], 45)
    return result

fn rotl(x: u64, k: int) -> u64:
    return (x << k) | (x >> (64 - k))
```

### Seeding: SplitMix64

The four state words of `xoshiro256**` are initialized by running `SplitMix64` four times from a single 64-bit seed. `SplitMix64` is a high-quality mixing function with a 64-bit state:

```
fn splitmix64(seed: u64) -> u64:
    seed = seed + 0x9E3779B97F4A7C15
    z = seed
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9
    z = (z ^ (z >> 27)) * 0x94D049BB133111EB
    return z ^ (z >> 31)
```

### Seeding source: content hash

The 64-bit seed fed to SplitMix64 is derived from the **first 8 bytes of the seed's SHA-256 content hash**, interpreted as a little-endian u64. This means any two UniversalSeeds with the same hash produce the same RNG stream, which is the foundation of reproducibility.

```
fn rng_from_seed(seed: UniversalSeed) -> DeterministicRng:
    hash_bytes = sha256(canonicalize(seed))            // 32 bytes
    seed_u64 = u64_from_little_endian(hash_bytes[0..8])
    state = [0; 4]
    for i in 0..4:
        seed_u64 = splitmix64(seed_u64)
        state[i] = seed_u64
    return Xoshiro256StarStar { state }
```

### Per-gene sub-streams: FNV-1a + jump-ahead

Engines and evolution operators need independent RNG streams *per gene* without consuming the parent stream and without collisions. The scheme is:

1. Compute a 64-bit sub-seed by FNV-1a hashing the gene name into the parent seed hash.
2. Use `xoshiro256**`'s jump-ahead-by-2^128 to produce a non-overlapping stream, then re-seed the jumped stream with the sub-seed via SplitMix64 for an additional layer of decorrelation.

```
fn substream_for_gene(rng: DeterministicRng, gene_name: str) -> DeterministicRng:
    sub_seed = fnv1a_64(gene_name, initial = rng.current_hash())
    jumped = rng.clone().jump_128()
    jumped.reseed(sub_seed)
    return jumped
```

This guarantees that mutating gene A does not affect the RNG stream used by gene B, which is essential for stable partial-mutation semantics.

### Derived distributions

All higher-order distributions must be derived from `xoshiro256**` outputs via fixed transforms:

- **Uniform [0, 1):** `(next() >> 11) * (1.0 / 2^53)` — produces a double in [0, 1).
- **Uniform integer [0, n):** Lemire's rejection method to avoid modulo bias.
- **Gaussian N(0, 1):** Box–Muller: `sqrt(-2 * ln(u1)) * cos(2π * u2)` from two uniforms.
- **Bernoulli(p):** `uniform() < p`.
- **Categorical over weights:** cumulative-weight binary search on a uniform draw.

No other method is permitted. Implementations that use rejection sampling must use a deterministic rejection bound.

---

## 2. SeedManifold — Fisher Information Matrix

The space of all seeds forms a curved geometric object whose local metric is given by the **Fisher Information Matrix (FIM)** of the fitness distribution. The FIM tells you, at any point in the seed space, which directions contain more information about fitness and which are "flat."

Given a seed `s` with gene parameters `θ` and a probabilistic fitness model `p(fitness | θ)`, the FIM is:

```
F(θ)_{i,j} = E[ ∂log p(fitness | θ) / ∂θ_i · ∂log p(fitness | θ) / ∂θ_j ]
```

In practice, Paradigm approximates the FIM empirically via finite differences on the refinement loop's QualityVector:

```
approximate_fim(seed):
    genes = flatten_numeric_genes(seed)
    fim = zeros(|genes|, |genes|)
    for each gene_i, gene_j:
        fim[i, j] = empirical_covariance(
            ∂quality / ∂gene_i,
            ∂quality / ∂gene_j,
            samples = perturb(seed, k=16)
        )
    return regularize(fim)  // add εI for numerical stability
```

### What the FIM is used for

- **Natural gradient descent** in evolution: `θ' = θ + η * F⁻¹ * ∇fitness` updates in the direction of steepest *information* gain rather than steepest parameter change. This dramatically accelerates CMA-ES and DQD convergence.
- **Informed mutation step sizes:** the diagonal of F⁻¹ gives per-gene scaling that prevents over-mutation of high-sensitivity genes and under-mutation of low-sensitivity ones.
- **Distance metric in MAP-Elites archives:** seed-to-seed distance under the FIM metric is more meaningful than Euclidean distance in raw gene space.

Implementations may compute the FIM lazily and cache it on the seed as a `$fitness.fim` sub-field; it does not participate in the content hash.

---

## 3. TickCycle — 8-Phase Execution

Every seed operation (grow, mutate, breed, compose, evolve-step) runs through the same 8-phase tick cycle. The phases are strictly ordered, and each phase produces a typed output consumed by the next.

```
1. intake    : receive the input seed(s) and operation
2. validate  : check all invariants from spec/01
3. plan      : compute the operation plan (which genes, which operators)
4. mutate    : apply gene-type operators (may be a no-op)
5. execute   : run the domain engine's developmental pipeline (for `grow`)
6. reduce    : collapse multi-valued intermediate results
7. emit      : produce the output seed(s) and artifact(s)
8. persist   : write to the seed store, update fitness cache
```

### Phase invariants

- Every phase is **pure with respect to the seed state at its entry**. Side effects are confined to the `EffectSystem`, which handles them in a deferred, deterministic order between phases.
- Phases 1–4 are fully deterministic. Phase 5 (execute) is deterministic for a given `(seed, engine_version)` pair. Phases 6–8 are deterministic modulo storage backend timestamps.
- If any phase fails, the cycle aborts with a typed error and no partial state is visible to subsequent operations.

### Why 8 phases

The split exists so that:

- Validation can reject bad seeds before any expensive work happens.
- Plan can be cached and re-used for bulk mutations.
- Execute is isolated and can be GPU-accelerated independently.
- Emit can fan out into multiple outputs (e.g., a primary artifact plus a preview thumbnail).
- Persist can be deferred or batched without affecting correctness.

---

## 4. EffectSystem — Algebraic Effects

The kernel uses an **algebraic effects** system (inspired by Koka, Eff, and Unison) to separate pure computation from side effects. There are 8 effect types:

| Effect | Purpose |
|--------|---------|
| `Read` | Read from seed store or filesystem |
| `Write` | Write to seed store or filesystem |
| `Random` | Draw from a deterministic RNG stream |
| `Time` | Read a monotonic clock (informational only) |
| `Network` | HTTP / WebSocket I/O (federation, LLM calls) |
| `GPU` | Dispatch a WebGPU compute or render pass |
| `Log` | Emit a structured log entry |
| `Sign` | Perform an ECDSA signing or verification |

### Effect semantics

Pure code does not perform effects directly. It *requests* effects by yielding `Effect` values, which a handler interprets. Handlers are:

- **Deterministic** — the `Random` handler is the kernel's RNG; the `Time` handler in replay mode returns recorded timestamps.
- **Composable** — a test harness replaces the `Network` and `Write` handlers with mocks without touching any engine code.
- **Traceable** — every effect is logged to the tick's effect journal for reproducibility auditing.

### The effect-free kernel core

The core data transformations (gene mutation, crossover, validation, canonicalization, hashing) use **no effects at all**. They are ordinary pure functions. Effects appear only at the boundary of the tick cycle: intake reads, persist writes, execute may dispatch to GPU, and so on.

This lets the kernel be tested end-to-end without any I/O, and lets it be embedded in contexts that have no filesystem or network (browser, edge runtime, embedded devices).

---

## 5. Scheduler — Deterministic Task Queue

The scheduler runs the tick cycles for all pending operations in a deterministic order. In single-threaded mode it is simply a FIFO. In multi-threaded or GPU-parallel mode, it uses a **topological sort** of the task dependency graph and breaks ties by the seed content hash (lexicographic).

Parallelism must not affect results. Two implementations, one sequential and one parallel, running the same operations over the same seeds, must produce bit-identical outputs. The scheduler's tie-breaking rules exist precisely to make this guarantee hold.

---

## Kernel API Surface

The minimum public API every kernel implementation must expose:

```ts
interface Kernel {
  // RNG
  rngFromSeed(seed: UniversalSeed): DeterministicRng;
  substream(rng: DeterministicRng, name: string): DeterministicRng;

  // Tick cycle
  tick<I, O>(op: Operation<I, O>, input: I): Promise<O>;

  // Effects
  withHandlers(handlers: EffectHandlers, fn: () => Promise<unknown>): Promise<unknown>;

  // Fisher manifold
  approximateFim(seed: UniversalSeed, samples?: number): Matrix;
  naturalGradient(seed: UniversalSeed, grad: Vector): Vector;

  // Validation and hashing
  canonicalize(seed: UniversalSeed): Uint8Array;
  hash(seed: UniversalSeed): ContentHash;
  validate(seed: UniversalSeed): Result<void, ValidationError>;
}
```

Engines, evolution algorithms, and the intelligence layer all depend on this interface and nothing else from the kernel. Changes to the kernel API are breaking changes and require a major version bump of `$gst`.
