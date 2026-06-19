# GSPL v∞ — Formal Properties

**Canonical invariant document for GSPL as the founding invention.**
Every program is a typed seed. Every output is a deterministic artifact. Every expression can be evolved, bred, and signed.

---

## 1. Determinism (P1)

**Statement:** For any GSPL source `S` and any seed phrase `P`, two independent executions `executeGspl(S, P)` and `executeGspl(S, P)` produce bit-identical seeds, outputs, and errors.

**Proof sketch:** The kernel derives its sole entropy source from `Xoshiro256StarStar` seeded via `rngFromHash(P)`. No path through `gspl-interpreter.ts`, `UniversalSeed.mutate()`, `UniversalSeed.cross()`, `GeneticAlgorithm.evolve()`, or any kernel builtin calls `Math.random`, `crypto.random*`, `performance.now`, or reads the wall clock inside deterministic paths. The ESLint rule in `scripts/check-determinism-boundary.mjs` enforces this as a hard error. `kernelNow`/`kernelNowIso` are used only for metadata provenance and never feed into RNG or seed logic.

**Enforced by:**
- `src/lib/kernel/rng.ts` — xoshiro256** implementation
- `scripts/check-determinism-boundary.mjs` — ESLint gate
- `npm run determinism:check` — CI job
- `docs/waivers/registry.json` — carve-out registry

**Verifier:** `verifyGSPLProgramDeterminismAsync()` in `formal-verifier.ts`

---

## 2. 17-Gene Type Soundness (P2)

**Statement:** Every gene expression in a GSPL program (seed declarations, expression bodies) conforms to one of the 17 canonical gene types: `scalar`, `categorical`, `vector`, `expression`, `struct`, `array`, `graph`, `topology`, `temporal`, `regulatory`, `field`, `symbolic`, `quantum`, `gematria`, `resonance`, `dimensional`, `sovereignty`. No ill-typed gene value reaches kernel mutation, crossover, or distance operators.

**Proof sketch:** The tolerant parser accepts bare values without explicit type annotations (types are inferred by the kernel at runtime). When explicit type annotations are present, `checkGeneTypesInGSPLProgram()` validates them against the canonical set. The `GeneSystem` in `src/lib/kernel/gene_system.ts` enforces type-specific validation, mutation, and distance functions. All 17 types are registered in `GSPL_GENE_TYPE_NAMES` and `GENE_TYPE_DEFINITIONS`.

**Enforced by:**
- `GSPL_GENE_TYPE_NAMES` constant in `formal-verifier.ts`
- `GeneType` union in `src/seeds/types.ts`
- `validateGene()` in `gene_system.ts`

**Verifier:** `checkGeneTypesInGSPLProgram()` in `formal-verifier.ts`

---

## 3. Termination (P3)

**Statement:** Every GSPL program terminates within bounded time and steps. The interpreter enforces a maximum iteration cap (`MAX_ITERATIONS = 1000`) on all `for` loops. Recursion is not supported in the GSPL core. Builtin operations (`mutate`, `breed`, `evolve`, `grow`, `compose`) have bounded execution time proportional to gene count and population size.

**Proof sketch:** The interpreter's `evaluateForLoop` caps iterations at `MAX_ITERATIONS`. All kernel builtins operate on finite data structures (genes, populations) with no recursion. The GSPL grammar has no unbounded recursion or infinite loop construct. The verifier runs sample programs with a timeout budget and reports non-termination as a property failure.

**Enforced by:**
- `MAX_ITERATIONS` constant in `gspl-interpreter.ts`
- Bounded kernel builtins (no recursion)

**Verifier:** `verifyTerminationAsync()` in `formal-verifier.ts`

---

## 4. Compositional Determinism (P4)

**Statement:** For any seed `A` with domain `D` and any target domain `T`, the composition `composeSeed(A, T)` is deterministic: same input yields identical output across invocations. For any two seeds `A`, `B` and domain `T`, the multi-seed composition `composeN([A, B, ...], T)` is also deterministic.

**Proof sketch:** `composeSeed()` in `src/lib/kernel/composition.ts` uses only pure gene projection logic and a deterministic hash for the composed seed's `$hash`. No RNG or wall-clock is consulted during composition. `composeSeed` is a pure function — given the same inputs, it always produces the same output.

**Enforced by:**
- Pure functions in `composition.ts` (no side effects)
- Deterministic `$hash` derivation from source seed hash + target domain

**Verifier:** `verifyCompositionAsync()` in `formal-verifier.ts`

---

## 5. Breed Properties (P5)

**Statement (5a — Determinism):** For any two seeds `A`, `B` and RNG phrase `P`, `breed(A, B)` with identical RNG state produces identical offspring across invocations.

**Statement (5b — Heritability):** The offspring of `breed(A, B)` has genes that are a subset of the union of parent genes, with each gene inherited from exactly one parent via uniform random selection.

**Statement (5c — Closure):** The offspring of `breed(A, B)` is itself a valid, breedable seed — it can participate in further breed operations, preserving the algebraic closure of the seed space under breeding.

**Proof sketch:** `UniversalSeed.cross()` iterates over the gene map of the first parent, and for each gene present in both parents, selects uniformly from one parent using the injected deterministic RNG. No novel gene values are synthesized. The offspring is a full `UniversalSeed` instance with complete gene map, lineage, and derivation, making it eligible for further breeding.

**Enforced by:**
- `UniversalSeed.cross()` in `universal-seed.ts`
- Deterministic RNG injection (never `Math.random`)
- Lineage tracking preserves parent hashes

**Verifier:** `verifyBreedPropertiesAsync()` in `formal-verifier.ts`

---

## Summary Table

| #  | Property                  | Scope              | Enforced By                                      | Verifier Function                 |
|----|---------------------------|--------------------|--------------------------------------------------|-----------------------------------|
| P1 | Determinism               | All GSPL execution | ESLint boundary, xoshiro256** only                | `verifyGSPLProgramDeterminismAsync` |
| P2 | 17-Gene Type Soundness    | Gene declarations  | GeneType enum, gene_system.ts validation          | `checkGeneTypesInGSPLProgram`     |
| P3 | Termination               | All GSPL programs  | MAX_ITERATIONS, bounded builtins                  | `verifyTerminationAsync`          |
| P4 | Compositional Determinism | Cross-domain ops   | Pure functions in composition.ts                  | `verifyCompositionAsync`          |
| P5 | Breed Properties          | Seed breeding      | UniversalSeed.cross(), deterministic RNG          | `verifyBreedPropertiesAsync`      |

---

*Part of the GSPL v∞ permanent research axis. See `docs/GSPL-v-infty-research.md` for research notes and `src/lib/gspl/formal-verifier.ts` for implementation.*

*Generated 2026-06 — Phase 5 closed, Phase ∞ active.*
