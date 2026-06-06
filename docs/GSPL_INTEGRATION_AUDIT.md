# GSPL Integration Audit — Phase 4

**Date:** 2026-06-04
**Status:** In Progress

## Overview

This document maps all GSPL integration points in the Paradigm Absolute codebase, identifies gaps where GSPL should be used but isn't, and documents the current status of the GSPL parser and interpreter.

## GSPL Implementation Status

### Canonical Implementation: `src/lib/kernel/gspl-*`

The canonical GSPL implementation lives in `src/lib/kernel/` and includes:

- **gspl-lexer.ts** - Tokenization of GSPL source code
- **gspl-parser.ts** - AST generation from tokens (handles all seed operations)
- **gspl-interpreter.ts** - Execution with kernel wiring (breed, mutate, evolve, crossover all invoke actual kernel operators)
- **gspl-module-resolver.ts** - Standard library + commons import system
- **gspl-bytecode.ts** - Bytecode compilation
- **gspl-gpu-compiler.ts** - GPU compilation for WebGPU
- **gspl-lsp-server.ts** - Language Server Protocol support
- **gspl-diagnose.ts** - Diagnostic utilities
- **gspl-gene-type.ts** - Gene type validation
- **gspl-test.ts** - Test suite (24/24 tests green)

### Deprecated Bridge: `src/lib/gspl/`

A deprecated bridge exists that re-exports from the kernel implementation. This directory will be removed once all callers are updated to use the kernel directly.

## Integration Points

### 1. UI Components

| Component | Location | Usage | Status |
|-----------|----------|-------|--------|
| GSPLEditor | `src/components/studio/GSPLEditor.tsx` | GSPL code editor | Active |
| GsplRepl | `src/components/studio/GsplRepl.tsx` | GSPL REPL interface | Active |
| GsplStrip | `src/ui/rails/AgentPanel/GsplStrip.tsx` | Agent panel GSPL strip | Active |
| GsplSourceCard | `src/ui/rails/AgentPanel/cards/GsplSourceCard.tsx` | GSPL source card | Active |
| SeedChat | `src/components/studio/SeedChat.tsx` | Seed chat with GSPL | Active |

### 2. Server Routes

| Route | Location | Usage | Status |
|-------|----------|-------|--------|
| /api/gspl | `src/server/routes/gspl.ts` | GSPL execution API | Active |

### 3. Agent Tools

| Tool | Location | Usage | Status |
|------|----------|-------|--------|
| execute_gspl | `src/lib/agent/tools.ts` | GSPL execution tool | Active (wired to kernel) |
| makeSeed | `src/lib/agent/tools.ts` | Seed creation via GSPL | Active (uses executeGspl) |

### 4. Generators

| Generator | Location | GsplModuleResolver Import | Actual Usage | Status |
|-----------|----------|---------------------------|--------------|--------|
| character | `src/lib/kernel/generators/character.ts` | ✓ Imported | ❌ Not used | Dead import |
| narrative | `src/lib/kernel/generators/narrative.ts` | ✓ Imported | ❌ Not used | Dead import |
| fullgame | `src/lib/kernel/generators/fullgame.ts` | ✓ Imported | ❌ Not used | Dead import |
| geometry3d | `src/lib/kernel/generators/geometry3d.ts` | ✓ Imported | ❌ Not used | Dead import |
| app | `src/lib/kernel/generators/app.ts` | ✓ Imported | ❌ Not used | Dead import |

**Finding:** All generators import `GsplModuleResolver` but do not actually use it. These are dead imports that should be removed.

### 5. Tests

| Test | Location | Status |
|------|----------|--------|
| gspl.test.ts | `src/lib/kernel/__tests__/gspl.test.ts` | 24/24 tests green |

## Current GSPL Parser & Interpreter Status

### Parser Status: ✅ Functional

- Handles all GSPL token types
- Parses seed declarations, let bindings, function declarations, type declarations
- Parses seed operations: breed, mutate, evolve, compose, grow, signed
- Handles match expressions, control flow (if, for, while)
- Parses import/export statements
- No known parsing errors

### Interpreter Status: ✅ Functional & Kernel-Wired

- Executes GSPL AST from parser
- **Wired to kernel operations:**
  - `breed()` → calls `Seed.cross()` with deterministic RNG
  - `mutate()` → calls `Seed.mutate()` with deterministic RNG
  - `evolve()` → runs GA/MAP-Elites/CMA-ES with deterministic RNG
  - `compose()` → calls cross-domain composition functors
  - `distance()` → calculates genetic distance between seeds
  - `grow()` → executes domain engines to generate artifacts
- Supports standard library imports (std/core, std/geometry, std/music, etc.)
- Supports commons imports (data/commons/libraries/*.gspl)
- Validates strata against Doctrine v2 canonical 9 strata
- Deterministic: same seed + same RNG = bit-identical output

### Module Resolver Status: ✅ Functional

- Resolves import statements in GSPL programs
- Resolution order:
  1. Built-in standard library (inline)
  2. data/commons/libraries/*.gspl
  3. data/commons/seeds/*.gspl
  4. Absolute filesystem paths
  5. Relative paths
- Includes standard library modules:
  - std/core (clamp, lerp, smoothstep, map, sign, fract, mix)
  - std/geometry (Vec2, Vec3, vector math functions)
  - std/music (Note, Scale, chord functions)
  - std/color (Color, HSL, RGB conversions)

## Gaps: Where GSPL Should Be Used But Isn't

### 1. Hardcoded Generator Logic

**Gap:** Generators (character, narrative, fullgame, geometry3d, app) use hardcoded procedural generation logic instead of GSPL.

**Impact:**
- Generators are not composable via GSPL
- Cannot use GSPL's seed operations (breed, mutate, evolve) within generators
- Missing standard library functions that could simplify generator code

**Recommendation:** 
- Refactor generators to accept GSPL programs as input
- Use GSPL for parameter mapping and procedural logic
- Leverage standard library functions (std/geometry, std/music, etc.)

### 2. Seed Creation Paths

**Gap:** Some seed creation paths bypass GSPL entirely (direct API calls, UI actions).

**Impact:**
- Inconsistent seed creation across the system
- Some seeds created without GSPL validation
- Missing determinism guarantees for non-GSPL paths

**Recommendation:**
- Route all seed creation through GSPL interpreter
- Ensure UI actions use GSPL for seed operations
- Add GSPL validation to all seed creation endpoints

### 3. Domain Engine Integration

**Gap:** Domain engines are not directly accessible from GSPL.

**Impact:**
- Cannot call domain-specific generators from GSPL
- GSPL programs limited to kernel operations
- Missing domain-specific standard library modules

**Recommendation:**
- Expose domain engines as GSPL functions
- Create domain-specific standard library modules (std/character, std/narrative, etc.)
- Add GSPL bindings for engine-dispatcher

### 4. Composition Functor Integration

**Gap:** Cross-domain composition functors are not directly accessible from GSPL.

**Impact:**
- Cannot use composition functors in GSPL programs
- Limited cross-domain seed composition capabilities
- Missing std/composition module

**Recommendation:**
- Expose composition functors as GSPL functions
- Create std/composition module with common composition patterns
- Add GSPL bindings for findCompositionPath, composeSeed

## Dead Code to Remove

### Dead Imports in Generators

The following files import `GsplModuleResolver` but never use it:

- `src/lib/kernel/generators/character.ts`
- `src/lib/kernel/generators/narrative.ts`
- `src/lib/kernel/generators/fullgame.ts`
- `src/lib/kernel/generators/geometry3d.ts`
- `src/lib/kernel/generators/app.ts`

**Action:** Remove these imports.

### Deprecated Bridge Directory

The `src/lib/gspl/` directory is a deprecated bridge that re-exports from the kernel.

**Action:** Once all callers are updated to use `src/lib/kernel/gspl-*` directly, remove `src/lib/gspl/`.

## Next Steps

1. **Remove dead imports** from generators (character, narrative, fullgame, geometry3d, app)
2. **Refactor generators** to use GSPL for procedural logic
3. **Expose domain engines** as GSPL functions
4. **Create domain-specific standard library modules** (std/character, std/narrative, etc.)
5. **Add composition functor bindings** to GSPL
6. **Route all seed creation** through GSPL interpreter
7. **Remove deprecated bridge** once all callers updated
