# Paradigm Absolute - Agent Collaboration Guide

This document provides context for AI agents working with the Paradigm codebase.

---

## Project Overview

**Paradigm Absolute** is a Deterministic Synthetic Evolution Operating System where every digital artifact is a "seed" that can be bred, mutated, evolved, and composed.

- **Core guarantee:** Same seed + same RNG = bit-identical output forever
- **Stack:** TypeScript, React 19, Express, Three.js, WebGPU, Solidity
- **Scale:** ~50,000 lines across 315+ files

---

## Architecture Layers

```
Layer 1:  xoshiro256** RNG (deterministic, 256-bit state)
Layer 2:  Universal Seed (17 gene types)
Layer 3:  GSPL Language (lexer → parser → interpreter)
Layer 4:  Cognitive Architecture (reflection, memory, reasoning)
Layer 5:  27 Domain Engines (166 generators)
Layer 6:  50+ Cross-domain Functors
Layer 7:  GPU/Distributed Compute (WebGPU + Workers)
Layer 8:  Visual Studio (React + Three.js)
Layer 9:  Blockchain (PARA token + SeedNFT)
Layer 10: Enterprise Scaling
Layer 11: Metaverse Export
Layer 12: Quantum Physics (QFT solvers)
Layer 13: DAO Governance
Layer 14: Federated Knowledge Graph
```

---

## Key Conventions

### File Organization
- Core kernel: `src/lib/kernel/`
- Evolution algorithms: `src/lib/evolution/`
- Domain generators: `src/lib/kernel/generators/`
- Physics: `src/lib/physics/`
- Smart contracts: `contracts/`

### Naming Patterns
- Classes: PascalCase (`Xoshiro256Star`, `GeneticAlgorithm`)
- Functions: camelCase (`rngFromHash`, `growSeed`)
- Constants: UPPER_SNAKE (`GENE_TYPES`, `ENGINES`)
- Test files: `*.test.ts`

### TypeScript Conventions
- Use explicit types for public APIs
- Use `interface` for objects, `type` for unions
- Export core types from `index.ts` barrels

---

## Core Modules

### Seed System (`src/lib/kernel/seed-class.ts`)
- Universal Seed class with 17 gene types
- Operations: `mutate()`, `cross()`, `clone()`, `distance()`
- Serialization: `toJSON()`, `fromJSON()`

### RNG (`src/kernel/xoshiro.ts`)
- xoshiro256** algorithm
- Key functions: `Xoshiro256StarStar`, `rngFromHash`
- **CRITICAL:** Must be deterministic for seed reproducibility

### GSPL (`src/lib/kernel/gspl-interpreter.ts`)
- Interpreter with kernel-wired builtins: `mutate`, `breed`, `evolve`, `crossover`
- Uses actual kernel operators, not stubs

### Evolution (`src/lib/evolution/ga.ts`)
- Genetic Algorithm with tournament selection
- Supports elitism, custom fitness functions

### Composition (`src/lib/kernel/composition.ts`)
- 50+ cross-domain functors
- Functions: `character→clothing`, `music→dance`, etc.

---

## Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build

# Testing
npm run test            # Run vitest suite
npm run test:simple     # Quick generator test

# Deployment
npx hardhat run scripts/deploy.ts --network localhost
```

---

## What NOT To Do

1. **Don't modify RNG seeding** - Changing `xoshiro256**` breaks determinism
2. **Don't add random numbers without RNG** - Use seeded RNG, never `Math.random()`
3. **Don't break backward compatibility** - Seeds must remain reproducible
4. **Don't hardcode secrets** - Use environment variables, not `.env` in code
5. **Don't bypass authentication** - All mutations require ownership verification

---

## Emergency Procedures

### If build fails with TypeScript errors
```bash
npx tsc --noEmit  # Check specific errors
```

### If tests fail
```bash
npm run test -- --verbose  # Detailed output
```

### If server won't start
```bash
# Check port usage
lsof -i :3000
# Kill if needed
kill -9 <PID>
```

---

## Adding New Features

1. **New domain engine:** Add to `src/lib/kernel/engines.ts`
2. **New generator:** Add to `src/lib/kernel/generators/`
3. **New cross-domain functor:** Add to `src/lib/kernel/composition.ts`
4. **New API endpoint:** Add to `server.ts` with Zod validation schema

---

## Environment Variables

Required for full functionality:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - Authentication secret
- `PARA_TOKEN_ADDRESS` - Deployed token (production)
- `SEED_NFT_ADDRESS` - Deployed NFT (production)

---

*Last updated: May 2026*