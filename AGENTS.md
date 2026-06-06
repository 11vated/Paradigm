# Paradigm Absolute - Agent Collaboration Guide

This document provides context for AI agents working with the Paradigm codebase.

**CRITICAL (Doctrine v2):** For any build session after 2026-05, **read `Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md` FIRST**. It is the canonical governing document. This AGENTS.md is execution context and is subordinated to the 13_* series.

---

## Doctrine v2 Governance (New Canonical)

- **READ FIRST:** `Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`
- **Phase Gates:** `Documents/Paradigm-Analysis/13b_Phase_Gates.md`
- **Waiver Registry:** `docs/waivers/registry.json` (append-only, sunset-dated)
- **If We Vanish Protocol:** `docs/if-we-vanish.md`
- **Planning Reconciliation:** `planning/DOCTRINE_V2_MAPPING.md` (in progress)

Prior canon (`05_*`, `07_*`, `12_*`) is superseded. Do not edit 13_* in place — create `14_*` successor only on annual review or breaking change.

---

## Project Overview

**Paradigm Absolute** is a Deterministic Synthetic Evolution Operating System where every digital artifact is a "seed" that can be bred, mutated, evolved, and composed.

> **GSPL — the Generative Seed Programming Language — is the founding invention.** It is the kernel concept the entire substrate is built around: a language whose every program is a typed seed, whose every output is a deterministic artifact, whose every expression can be evolved, bred, and signed. Paradigm is the operating system GSPL needed to exist.

- **Core guarantee:** Same seed + same RNG = bit-identical output forever
- **Stack:** TypeScript, React 19, Express, Three.js, WebGPU, Solidity
- **Scale (post-Phase 0):** ~94,666 lines across 523 source files (down from ~382,000 LOC after removing ~288K lines of dead/duplicate code)

---

## Current Doctrine v2 Status (as of 2026-05 session)

**Phase 0 — Doctrine Collapse: CLOSED**

- All 7 explicit exit gates from `13b_Phase_Gates.md` satisfied.
- GSPL interpreter stabilized (24/24 tests green; seed creation + kernel ops `mutate`/`breed`/`grow`/`evolve` now reliable).
- Lints (`lint-canonical-rename`, `lint-no-evasion`), waiver registry, `if-we-vanish.md`, Substrate Health surface (`/api/substrate/health`), and this planning reconciliation all landed.
- See `planning/DOCTRINE_V2_MAPPING.md` for the bridge from v1.0.0 work to the 24-phase canon, plus the 5 highest-leverage Phase 1 slices.

**Active canonical documents (READ FIRST for any work):**
- `Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`
- `Documents/Paradigm-Analysis/13b_Phase_Gates.md`
- `Documents/Paradigm-Analysis/14_PARADIGM_INFINITE_EXECUTION_PLAN.md`
- `planning/DOCTRINE_V2_MAPPING.md` (living reconciliation)

**Next for agents:** Phase 1 (Server/Type/Determinism Cleanup + QualityContract generics + 8 pre-flight gates as blocking CI). The old 4-phase / `05_*` planning is superseded.

---

## Architecture Layers (still accurate)

## Architecture Layers

```
Layer 1:  xoshiro256** RNG (deterministic, 256-bit state)
Layer 2:  Universal Seed (17 gene types)
Layer 3:  GSPL — Generative Seed Programming Language (lexer → parser → interpreter)
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

## Phase 0 Cleanup — what changed

The repo went through a Phase 0 surgical cleanup pass that established a single canonical architecture, deleted ~288,000 lines of dead/duplicate code, and locked the determinism invariant into CI. Commits live on the `phase0` branch (or merged to `main`). Summary:

1. **(1/6) Deleted dead engine files (~136K LOC).**
   `src/engines/index_fixed_start.ts` (87,783 lines of duplicate class declarations), `index_new_start.ts` (48,469 lines), `index_part1.ts` (300 lines). They were already excluded from `tsconfig`; the `tsconfig.json` exclude list is now clean.

2. **(2/6) Deleted broken `visual2d.ts`** — contained 3 pasted copies of the same generator (19 baseline TS errors). All real callers route through `visual2d-v2.ts` / `visual2d-v3.ts` / `visual2d-svg.ts`.

3. **(3/6) Collapsed 5 duplicate architectural roots.**
   - `src/kernel/`        (@deprecated) → `src/lib/kernel/`
   - `src/gspl/`          → `src/lib/gspl/` (+ `src/lib/kernel/gspl-*`)
   - `src/evolution/`     → `src/lib/evolution/`
   - `src/intelligence/`  → `src/lib/intelligence/`
   - `src/studio/`        → orphaned, removed (canonical Studio is `src/pages/StudioPage.tsx`)
   Two thin re-export shims (`src/lib/evolution/{cmaes,functors}.ts`) deleted along with their parents. `src/index.ts` rewritten to point at canonical paths only.

4. **(4/6) Swept orphan top-level dirs and legacy artifacts (~4 MB, 100+ files).**
   - `paradigm/`                     (~1.9 MB) — a second, orphaned **Python** implementation (Emergent.sh fork). Never imported by the TS code.
   - `frontend/next.config.js`       — leftover Next.js config (project is Vite)
   - `app/applet/`                   — one-shot AI test-rewriter scripts
   - `conversation history.txt`      (~1.8 MB) — AI chat log committed to repo root
   - `Paradigm-Planning.txt`         (~28 KB)  — superseded by Documents/Paradigm-Vision/
   - `docs/history/`                 (~2.2 MB) — legacy analyses and a duplicate of the conversation log

5. **(5/6) Migrated 27 non-UI `.jsx` → `.tsx`.**
   `src/{stores,services,hooks,lib,components/studio,pages}/*` are now `.tsx`. All 48 shadcn UI components in `src/components/ui/` are `.tsx` with 0 type errors. No `@ts-nocheck` remains in the codebase.

6. **(6/6) Determinism boundary — ESLint-enforced, CI-gated.**
   The substrate's most important invariant is now enforced in lint.
   - HARD ERROR: `Math.random`, `crypto.randomBytes`, `crypto.getRandomValues`, `performance.now` inside `src/lib/kernel`, `src/lib/evolution`, `src/seeds`.
   - WARN (tracked, non-blocking): `Date.now` / `new Date` (122 sites — Wall-clock Sprint follow-up).
   - Carve-outs: `src/lib/kernel/rng.ts`, `rng-contract.ts`, `src/seeds/types.ts`, and all `**/__tests__/**` + `*.test.{ts,tsx}` paths.
   - CI gate: `scripts/check-determinism-boundary.mjs`, run via `npm run determinism:check` (wired into `.github/workflows/ci.yml` `determinism` job).
   - Audit result: **zero true entropy violations** in the kernel today.

### Canonical paths after Phase 0

| Concern | Canonical home |
|---|---|
| Deterministic RNG | `src/lib/kernel/rng.ts` (Xoshiro256StarStar) |
| Seed types & schema | `src/seeds/` |
| Universal Seed class | `src/seeds/universal-seed.ts` |
| Domain generators (197) | `src/lib/kernel/generators/` |
| Engine dispatch | `src/lib/kernel/engine-dispatcher.ts` |
| GSPL implementation | `src/lib/kernel/gspl-*` + `src/lib/gspl/` |
| Evolution algorithms | `src/lib/evolution/` |
| Intelligence / LLM | `src/lib/intelligence/` |
| Agent system | `src/lib/agent/` |
| Sovereignty | `src/lib/sovereignty/` |
| Rendering | `src/lib/rendering/` |
| Studio UI | `src/pages/StudioPage.tsx`, `src/components/studio/*` |
| Seed naming | `src/lib/naming/seed-namer.ts` (11 domain vocabularies in `src/lib/naming/vocab/`) |
| Strata radar | `src/components/studio/StrataRadar.tsx` (3×3 grid + 9-axis SVG radar) |
| Server routes | `server.ts` (3,500 LOC; route-splitting is a future sprint) |

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
---

## Phase 0–7 Substrate Map (May 2026)

After Phase 0 surgical cleanup and seven phases of substrate work, the canonical modules are:

```
src/lib/
├── naming/                Seed naming (Tier 0/1/2 — PoS-pairing + LLM)
│   ├── seed-namer.ts      nameSeed / nameSeedSync / etymologyFor / nameOnly
│   └── vocab/             11 domain vocabularies (character, world, music, …)
├── kernel/
src/lib/
├── kernel/                  Deterministic RNG, generators, composition, clock shim, Quality Contract
│   ├── clock.ts             kernelNow / kernelNowIso — injectable wall-clock
│   ├── composition.ts       Functor bridges (Friend × any → projection, with custom transforms)
│   ├── quality-contract.ts  5-clause conformance framework
│   └── generators/          196 generators, 7 contract-conformant
├── friend/                  Sovereign digital companion
│   ├── types.ts             6 gene categories
│   ├── genesis.ts           createFriendSeed (deterministic from string)
│   ├── generator.ts         FriendSeed → FriendArtifact (phenotype + voice + SVG portrait)
│   ├── breeding.ts          breedFriends / mutateFriend
│   ├── store.ts             FriendStore (persistence + lineage)
│   ├── sovereignty.ts       ECDSA-P256 sign + verify
│   ├── onchain.ts           ERC-721 mint preparation
│   ├── marketplace.ts       list / delist / buy calldata prep
│   ├── composition.ts       Friend × {music, narrative, visual2d, character, audio, agent}
│   └── contract.ts          Quality Contract (1.000)
├── world/
│   ├── types.ts             Era × biome × conflict
│   ├── genesis.ts + generator.ts
│   ├── quest.ts             Friend × World → QuestSeed (composeQuest)
│   └── contract.ts          (1.000)
└── game/
    ├── types.ts + generator.ts   QuestSeed → playable scene graph
    ├── oracle.ts                 evaluateGame → 5-axis FitnessReport
    └── contract.ts          (0.900)
```

### Determinism contract (do not break)
1. Inside `src/lib/{kernel,evolution,seeds,friend,world,game}` — never call `Math.random`, `crypto.random*`, `performance.now`, or read wall-clock directly. ESLint enforces this as a hard error.
2. Need a timestamp? Use `kernelNow()` / `kernelNowIso()` from `src/lib/kernel/clock`.
3. Need entropy? Derive a stable hash from inputs and feed it to `Xoshiro256StarStar` from `src/lib/kernel/rng`.
4. Adding a new generator? Write a Quality Contract for it (`src/lib/<domain>/contract.ts`), import it from `scripts/quality-contract-report.mts`, and add curated seeds to `npm run golden:write` to lock in cross-machine determinism.

### Web routes
- `/studio` `/friend` `/world` `/quest` `/play` `/play/:friend/:world` `/lineage/:id` `/photorealistic-renderer`

### Verification commands (always run before commit)
```bash
npm run typecheck          # 0 errors
npm run determinism:check  # 0 hard violations
npm run quality:contract   # 13/13 contracts green
npm run golden:verify      # flagship tier hashes match
npm run build              # vite build (clean)
```
