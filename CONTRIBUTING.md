# Contributing to Paradigm Absolute

Thank you for your interest in contributing! This project is a **deterministic synthetic evolution operating system** — every artifact is a seed that can be bred, mutated, evolved, and composed across 27 creative domains.

## Quick Start

```bash
npm install
npm run build
npm run test
```

## Development Workflow

1. **Branch:** Create a feature branch from `main`
2. **Code:** Make changes following existing patterns
3. **TypeScript:** `npm run typecheck` — must pass with 0 errors
4. **Lint:** `npm run lint:ci` — must pass clean
5. **Determinism:** `npm run determinism:check` — no Math.random() in kernel code
6. **Tests:** `npm run test` — all tests must pass
7. **PR:** Submit with clear description of changes

## Key Conventions

- **Determinism first:** All RNG must be seeded. Never `Math.random()` in kernel/engine code
- **Seed-based:** Operations on seeds (grow/mutate/breed) must produce deterministic output
- **UniversalSeed:** The canonical seed class. Legacy `Seed` class is deprecated
- **TypeScript:** strict mode. Use explicit types for public APIs
- **Tests:** Property-based tests for gene operators. Integration tests for domains

## Project Structure

```
src/
  kernel/         — RNG, gene system, effects (determinism foundation)
  seeds/          — UniversalSeed class (canonical seed implementation)
  gspl/           — GSPL language (lexer, parser, interpreter, type checker)
  engines/        — Domain engine dispatch
  evolution/      — GA, MAP-Elites, CMA-ES, etc.
  intelligence/   — Agent system, memory, tools
  components/     — React components
  services/       — API client
data/commons/       — Canonical seed library (1,000 seeds)
docs/               — Documentation (reference, architecture, status)
planning/           — Execution plans and task tracking
```

## License

This project is open source. All contributions are under the same license.
