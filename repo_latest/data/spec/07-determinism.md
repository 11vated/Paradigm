# 07 — Determinism

Determinism is Paradigm's load-bearing wall. Every other invariant — lineage, sovereignty, royalties, breeding, evolution — depends on the property that **the same seed grows into the same artifact, every time, on every machine, forever**. This spec enumerates exactly what determinism means in Paradigm, what the threats are, and how to preserve it.

## The Guarantee

> Given a UniversalSeed `s` and an engine version `E`, the artifact produced by `grow(s, E)` is **bit-identical** across:
> - Every CPU architecture (x86_64, ARM64, RISC-V).
> - Every operating system.
> - Every browser engine that implements WebGPU and WebCrypto to spec.
> - Every Node.js version ≥ 20.
> - Every wall-clock time.

This is a hard guarantee, not a best effort. Any divergence is a bug at a severity equal to a corrupted database.

## What "Same Artifact" Means

For each output type the comparison is exact:

- **Images:** byte-identical PNG output (same pixels, same metadata, same compression).
- **Meshes:** byte-identical glTF output (same vertices, same indices, same UVs, same materials).
- **Audio:** byte-identical WAV output (same samples, same headers).
- **Game bundles:** byte-identical HTML5 archive (same files, same hashes).
- **JSON-shaped artifacts:** canonicalized via JCS and compared.

## Sources of Non-Determinism (and How They're Eliminated)

| Source | Threat | Mitigation |
|---|---|---|
| Wall-clock time | Random output for time-stamped logs / IDs | All `Time` effect handlers replay from a recorded clock in deterministic mode. Wall clock is informational only. |
| `Math.random()` / `crypto.getRandomValues()` | Direct non-determinism | Forbidden anywhere in pipeline code except for ECDSA nonces. Lint rule + runtime guard. |
| Floating-point CPU extended precision | x87 80-bit intermediates differ from SSE2 64-bit | Force IEEE-754 binary64 throughout. Compile with `--no-x87`. Use `fma` only when explicitly available on target. |
| Floating-point operation order | `(a+b)+c ≠ a+(b+c)` for fp | Pin operation order in pseudocode; never parallelize fp reductions across threads in deterministic mode. Use Kahan summation for accumulators. |
| GPU scheduling (WebGPU) | Different drivers may schedule workgroups differently | Force compute kernel reductions to be schedule-independent (atomic-free, fixed-size workgroups, single-pass writes). Use deterministic reduction patterns. |
| Hash-table iteration order | JS `Map` and `Object` iteration is insertion-order, but bugs sneak in | Always sort keys before iterating in pipeline code. Use the canonicalization helpers. |
| Locale-dependent string operations | `toLocaleLowerCase()`, locale-aware sort | Forbidden. Use ASCII-only operators and explicit Unicode normalization (NFC). |
| Network I/O | LLM responses, federation seeds | Network is its own effect type and is recorded/replayed in deterministic mode. Replays use cached responses bound to seed hash. |
| Filesystem I/O | Reading a file that has changed | The seed store is content-addressed by hash; reads are immutable. |
| Threading | Race conditions in parallel evolution | Tie-break parallel work by seed hash. Two implementations (sequential and parallel) must produce bit-identical outputs. |
| Engine version drift | Engine v1.2.3 differs from v1.2.4 | Engine version is part of the canonicalized metadata and is checked at grow time. Re-grow is required after engine upgrade. |

## Determinism Budgets per Engine

Some engines must enforce stricter rules than others because their outputs are more sensitive to floating-point edge cases.

| Engine | Determinism Strictness | Notes |
|---|---|---|
| Sprite | exact bytes | Pixel-perfect; uses integer coordinates almost throughout. |
| Geometry3D | exact bytes after canonicalization | Mesh vertices canonicalized to fixed-precision (e.g., 7 decimal digits) and re-sorted. |
| Music | exact bytes (MIDI) / canonical bytes (WAV) | DSP synthesis uses integer-fixed-point internally to avoid fp drift. |
| FullGame | exact bytes (HTML5 zip) | Generated game files are deterministic; the resulting *gameplay* may have its own non-determinism if the user enables physics, but the *bundle* is deterministic. |
| Animation | exact bytes (canonical glTF) | Skinning weights canonicalized. |
| Procedural | exact bytes | Noise functions are seeded explicitly. |
| Narrative | exact bytes | Grammar derivations are deterministic with seeded RNG. |
| UI | exact bytes (HTML/CSS bundle) | DOM children sorted before serialization. |
| Physics | exact bytes (parameters) / approximate bytes (simulated trajectories) | Trajectories use deterministic Verlet/XPBD; reproducible to within rounding error which is bit-identical on conformant hardware. |
| Visual2D | exact bytes (PNG) | Same as Sprite. |
| Audio | exact bytes (WAV) | Same as Music. |
| Ecosystem | exact bytes (state log) | Population dynamics are deterministic given a seeded RNG. |
| Game | exact bytes | Mechanic specs are pure data. |
| ALife | exact bytes (initial state) / approximate bytes (long simulation) | Initial seed is exact; long simulations are deterministic on conformant hardware but sensitive to fp accumulation; documented as such. |
| Character | exact bytes | Morphology and personality are pure data. |

## Verification Tests

Every engine must ship with at least the following determinism tests, run on CI on every commit:

1. **Self-replay.** `grow(s, E)` is called twice; outputs are byte-compared.
2. **Cross-platform.** The output of `grow(s, E)` on Linux x86_64 is byte-compared against macOS ARM64 and Windows x86_64. (CI matrix.)
3. **Browser parity.** The output of `grow(s, E)` in Node ≥ 20 is byte-compared against Chrome (V8 + WebGPU) and Firefox (SpiderMonkey + WebGPU). (Headless browser test runner.)
4. **Mutation determinism.** `mutate(s, rate, seeded_rng)` is called twice with the same RNG seed; outputs are equal.
5. **Breeding determinism.** `breed(a, b)` is called twice; outputs are equal.
6. **Round-trip.** `decode(encode(s)) == s` and `canonicalize(parse(canonicalize(s))) == canonicalize(s)`.
7. **Engine version sensitivity.** `grow(s, E_old)` vs `grow(s, E_new)` is expected to differ if `E_old ≠ E_new`; the test asserts the *boundary* (a fresh build under the same version is identical; an explicit version bump is required to change behavior).

## Threats That Cannot Be Fully Eliminated

- **Hardware bugs.** A faulty CPU or GPU may produce wrong floating-point results. We accept this — it's outside the platform's threat model.
- **Browser engine bugs.** A spec-compliant browser is assumed; violations are filed as bugs against the browser, not Paradigm.
- **External LLM responses.** When the GSPL Agent calls an external LLM, the response is non-deterministic by nature. This is why the Agent **operates above the deterministic boundary**: its output is a seed, and the seed is then deterministically grown. The non-determinism is captured at the seed-creation boundary and never leaks into the artifact pipeline. To replay an LLM-driven generation, the user replays the same seed, not the same prompt.
- **Network race conditions in federation.** Two federation peers can independently produce different seeds for the same prompt; they are reconciled by their content hashes (which are deterministic given the seed) and merged or kept separate as the user prefers.

## What This Buys You

A deterministic substrate is not a "nice property." It is the engine of the entire economic and cryptographic model:

1. **Lineage is verifiable.** Anyone can re-grow a seed and check that the artifact matches what the seller advertised.
2. **Royalties are auditable.** A regulator can re-derive the entire breeding chain from primordial roots.
3. **Sovereignty is meaningful.** A signed seed is provably the same artifact today and in 2050.
4. **Federation is trustless.** Two Paradigm instances can exchange seeds and independently produce the same artifacts; they don't need to trust each other's renderers.
5. **Bug reports are reproducible.** A user reports "this seed grows into garbage" and the engineer can re-grow it bit-for-bit on their machine.
6. **Marketplace fraud is detectable.** A seller cannot advertise an artifact whose seed does not actually produce it.

Determinism is the property that makes Paradigm a *platform* and not a *generator*. Without it, the entire structure collapses to "another AI image tool."
