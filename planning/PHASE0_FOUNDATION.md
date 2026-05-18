# PHASE 0: FOUNDATION
## Weeks 1-2 — Repository Cleanup, Seed Unification, Cross-Repo Port

**Objective:** Clean, single-source-of-truth repository with verified build baseline.

---

## DAY 1-3: Repository Cleanup & Cross-Repo Port

### Task List

- [ ] **P0.1.1** Archive temp directories → `.archive/`
  - `repo_copy/`, `repo_latest/`, `planning_here/`, `playwright-report/`, `test-results/`
  - Verify: `git status` shows no untracked temp dirs
  - Command: `mkdir .archive && mv repo_copy repo_latest planning_here playwright-report test-results .archive/`

- [ ] **P0.1.2** Consolidate 60 root .md docs to 7
  - KEEP: `README.md`, `PARADIGM_DEFINITIVE_SCOPE.md`, `DEPLOY.md`, `CONTRIBUTING.md`, `TESTING_GUIDE.md`
  - MOVE execution records → `docs/history/execution-record/`
  - MOVE status docs → `docs/status/CURRENT_STATUS.md` (single file)
  - DELETE duplicate/outdated status files

- [ ] **P0.1.3** Port seed-commons libraries (17 files)
  - Source: `C:\Users\11vat\Desktop\PAradigm-reference\seed-commons\libraries\`
  - Dest: `data/commons/libraries/`
  - Files: biology.gspl, built_world.gspl, chemistry.gspl, chemistry-invocations.gspl, cosmology.gspl, culture_history.gspl, earth_sciences.gspl, lifestyle.gspl, linguistics.gspl, materials.gspl, mathematics.gspl, media_studio.gspl, music_audio.gspl, particles_fields.gspl, physics.gspl, power_systems.gspl, psychology.gspl, vehicles_grammar.gspl

- [ ] **P0.1.4** Port seed-commons inventories (20 files)
  - Source: `C:\Users\11vat\Desktop\PAradigm-reference\seed-commons\inventories\`
  - Dest: `data/commons/inventories/`

- [ ] **P0.1.5** Port seed-commons validation (5 files)
  - Source: `C:\Users\11vat\Desktop\PAradigm-reference\seed-commons\validation\`
  - Dest: `tests/commons/validation/`

- [ ] **P0.1.6** Port example seeds (8+ files)
  - Source: `C:\Users\11vat\Desktop\PAradigm-reference\examples\`
  - Dest: `examples/`

- [ ] **P0.1.7** Update `.gitignore`
  - Add: `.archive/`, `test-results/`, `coverage/`, `dist/coverage/`

- [ ] **P0.1.8** Verify all ported .gspl files parse correctly in current interpreter
  - Run GSPL parser on each ported file
  - Fix any syntax incompatibilities

---

## DAY 4-7: Seed Architecture Unification

### Task List

- [ ] **P0.2.1** Audit all imports of `seed-class.ts`
  - Search: `from.*seed-class|require.*seed-class`
  - Document every file that needs migration

- [ ] **P0.2.2** Extend `UniversalSeed` with missing operators
  - Compare operations: Seed (seed-class.ts) vs UniversalSeed (universal-seed.ts)
  - Missing from UniversalSeed: `merge()`, `toPlainObject()`, `fromPlainObject()`, `setGene()`, `getGene()`
  - Add all missing

- [ ] **P0.2.3** Migrate `src/lib/evolution/*.ts`
  - Files: ga.ts, map-elites.ts, cmaes.ts, gradient-evolution.ts, parallel-ga.ts, functors.ts
  - Change `import { Seed }` to `import { UniversalSeed }`
  - Update type signatures

- [ ] **P0.2.4** Migrate `src/gspl/interpreter.ts`
  - Change `Seed` return types to `UniversalSeed`
  - Update seed construction in builtins

- [ ] **P0.2.5** Migrate `server.ts`
  - Update seed CRUD routes
  - Update mutate/breed/evolve routes

- [ ] **P0.2.6** Add deprecation to `seed-class.ts`
  - `/** @deprecated Use UniversalSeed from src/seeds/universal-seed.ts */`

- [ ] **P0.2.7** Update type exports in `src/types/seed.ts`, `src/lib/kernel/types.ts`

- [ ] **P0.2.8** Run full test suite
  - `npm run test` → verify all tests pass
  - `npm run typecheck` → verify 0 errors
  - `npm run build` → verify bundle succeeds

---

## DAY 7: Fix Weak Hash Function

### Task List

- [ ] **P0.3.1** Replace `seed-class.ts` 32-bit hash with `canonical.ts` SHA-256
  - Use `crypto.subtle.digest('SHA-256', ...)` or Node.js `crypto.createHash('sha256')`
  - Target format: `sha256:7f8b3b...` (per spec/01)

- [ ] **P0.3.2** Verify collision resistance
  - Test: 1M random seeds, verify zero hash collisions
  - Pseudo: `const hashes = seeds.map(hash); expect(new Set(hashes).size).toBe(seeds.length)`

- [ ] **P0.3.3** Update all hash-dependent code
  - Lineage resolution checks
  - Sovereignty signing references
  - Seed store lookups

- [ ] **P0.3.4** Add hash version prefix (`sha256:`)

---

## DAY 8-10: Cross-Repo Documentation

### Task List

- [ ] **P0.4.1** Create `docs/reference/` with spec summaries
  - Spec 00: Overview
  - Spec 01: UniversalSeed
  - Spec 02: Gene System
  - Spec 03: Kernel
  - Spec 04: GSPL Language
  - Spec 05: Sovereignty
  - Spec 06: .gseed Format
  - Spec 07: Determinism

- [ ] **P0.4.2** Create `docs/architecture/` with ADR summaries
  - ADR 001: Deterministic Kernel
  - ADR 002: JCS Canonicalization
  - ADR 003: xoshiro256** RNG
  - ADR 004: ECDSA P-256 Signing
  - (etc. for all 11 ADRs)

- [ ] **P0.4.3** Create `docs/status/CURRENT_STATUS.md`

---

## DAY 10: Build Baseline

### Task List

- [ ] **P0.5.1** Clean install & build
  - Capture: `npm install`, `npm run build`
  - Record: build duration, bundle size, warnings

- [ ] **P0.5.2** Run test suite
  - Capture: `npm run test`, `npm run test:coverage`
  - Record: test count, pass rate, coverage %

- [ ] **P0.5.3** TypeScript check
  - `npm run typecheck` → 0 errors
  - `npm run lint:ci` → pass

- [ ] **P0.5.4** Determinism check
  - `npm run determinism:check` → pass

- [ ] **P0.5.5** Write `docs/baseline/BUILD_BASELINE.md`

---

## PHASE 0 COMPLETION CRITERIA

- [ ] `git status` shows clean working tree
- [ ] Root directory has <7 .md files (excluding docs/)
- [ ] No temp directories (repo_copy, etc.)
- [ ] `src/seeds/universal-seed.ts` is sole canonical seed class
- [ ] `src/lib/kernel/seed-class.ts` has @deprecated tag
- [ ] All ported .gspl files parse correctly
- [ ] `npm run test` → 100% pass
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] BUILD_BASELINE.md documents current state
- [ ] docs/reference/ and docs/architecture/ created
