# Paradigm Absolute

**Paradigm Absolute** is a deterministic synthetic evolution operating system for generating, mutating, breeding, evolving, composing, and exporting digital artifacts as reproducible genetic seeds.

The core guarantee is simple:

```text
same seed + same deterministic RNG + same code = reproducible output
```

This repository is now updated to reflect the completed stabilization pass from the implementation planning work: typechecking is clean, the full Vitest suite passes, GSPL compatibility modules are wired for tests, and the GitHub `main` branch is synchronized.

---

## Current Status

| Area | Status |
| --- | --- |
| TypeScript typecheck | Passing |
| Full test suite | Passing |
| GSPL tests | Passing |
| Swarm orchestration tests | Passing |
| Parity tests | Passing |
| GitHub `main` | Updated |

Verified locally before the latest GitHub update:

```text
Test Files  40 passed (40)
Tests       771 passed (771)
```

---

## What Paradigm Provides

- **Deterministic seed kernel** using seeded RNG instead of ambient randomness for reproducible evolution paths.
- **Universal seed model** with typed genes, lineage metadata, mutation, crossover, cloning, serialization, and distance operations.
- **GSPL language support** for seed-oriented scripting through lexer, parser, interpreter, compiler, and compatibility modules.
- **Evolution systems** including genetic algorithm support and deterministic parity coverage.
- **Domain engine infrastructure** for synthesizing artifacts across many creative, scientific, and simulation domains.
- **Agent and swarm systems** for multi-role reasoning, critique, synthesis, and verdict parsing.
- **Studio UI components** for seed chat, GSPL REPL workflows, canvas interaction, and generated artifact inspection.
- **Persistence and auth infrastructure** with test-compatible local fallbacks.
- **Parity fixtures** for seed commons validation and reproducibility-oriented regression tests.

---

## Architecture

```text
Layer 1   Deterministic RNG and kernel primitives
Layer 2   Universal seeds and typed genes
Layer 3   GSPL lexer, parser, interpreter, compiler
Layer 4   Evolution algorithms and parity checks
Layer 5   Domain engines and generators
Layer 6   Cross-domain composition and functors
Layer 7   Agent, swarm, memory, and reasoning systems
Layer 8   GPU, physics, rendering, and metaverse export paths
Layer 9   React studio and interactive authoring UI
Layer 10  Tests, CI-oriented checks, and compatibility shims
```

---

## Repository Layout

```text
src/
  kernel/                 Core runtime kernel and RNG
  seeds/                  UniversalSeed, GeneType, seed serialization
  evolution/              Evolution algorithms and functors
  gspl/                   Public GSPL entrypoints
  lib/gspl/               GSPL compatibility and kernel bridge modules
  lib/kernel/             Engines, generators, provenance, composition
  lib/agent/              Agent and swarm systems
  lib/auth/               Auth helpers and test-safe Redis fallback
  components/studio/      React studio components
  pages/                  Application pages
  services/               API service layer

commons/data/             CommonJS seed commons fixture for parity tests
tests/                    Vitest suites
scripts/                  Determinism and project utility scripts
```

---

## Quick Start

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run typecheck:

```bash
npm run typecheck
```

Run tests:

```bash
npm run test
```

Run determinism checks:

```bash
npm run determinism:check
```

Build for production:

```bash
npm run build
```

---

## GSPL Example

```typescript
import { executeGSPL } from './src/lib/gspl/index.js';

const source = `
seed Character {
  palette: [0.8, 0.2, 0.1]
  mood: "focused"
}

let intensity = 0.15
print(intensity)
`;

const result = executeGSPL(source, { seedPhrase: 'demo-seed' });

console.log(result.seeds);
console.log(result.output);
console.log(result.errors);
```

---

## Seed Example

```typescript
import { UniversalSeed, GeneType } from './src/seeds/index.js';
import { Xoshiro256SS } from './src/kernel/index.js';

const rng = new Xoshiro256SS(42);

const seed = new UniversalSeed();
seed.setGene(GeneType.COLOR, [1, 0, 0]);
seed.setGene(GeneType.SHAPE, 'circle');

const mutated = seed.mutate(rng, 0.1);

console.log(mutated.getAllGenes());
```

Use seeded RNG objects for reproducibility. Do not use `Math.random()` in deterministic production paths.

---

## Verification Commands

The current repository state was validated with:

```bash
npx tsc --noEmit --pretty false
npm run test
npx vitest run tests/gspl --reporter=dot
npx vitest run tests/parity.test.ts --reporter=dot
```

Expected current result:

```text
Typecheck: passing
Full test suite: 40 files, 771 tests passing
```

---

## Latest Stabilization Work Reflected Here

The GitHub update includes the completed hardening work from the planning session:

- GSPL lexer/parser/interpreter/compiler compatibility modules added or corrected.
- GSPL tests brought to green for editor-format syntax expectations.
- Swarm test contract implemented with `SwarmOrchestrator`, `DEFAULT_ROLES`, and `parseVerdict`.
- Auth Redis behavior made test-safe with local fallback behavior.
- Parity test resolution fixed through seed commons compatibility fixtures.
- Forked RNG stream behavior corrected for kernel parity expectations.
- Typecheck blockers across core kernel, GSPL, UI, agent, and ambient module declarations addressed.
- Full test suite verified before pushing to GitHub.

---

## GitHub Sync

Current pushed branch:

```text
main -> origin/main
```

Latest code stabilization commit:

```text
42522ed fix: harden GSPL and test compatibility
```

This README documents the completed state after that stabilization work.

---

## Contributing

1. Create a focused branch.
2. Keep deterministic paths seeded.
3. Add or update tests for behavior changes.
4. Run typecheck and tests before opening a PR.
5. Avoid committing local backup files, generated scratch files, secrets, or private user data.

---

## License

MIT

---

**Paradigm Absolute** — deterministic evolution for digital artifacts.
