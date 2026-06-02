# Requirements Document

## Introduction

This specification covers the full completion work required to bring the Paradigm Absolute platform to a clean, gate-passing state. It addresses four concrete bugs discovered during technical analysis and three Phase 1 advancement items mandated by `13b_Phase_Gates.md`. Together these items eliminate all known build warnings, close the single outstanding TypeScript error, resolve the canonical rename lint violation, synchronise the golden snapshot with the three new character seeds, begin the progressive evasion-pattern reduction required by the Phase 1 exit gate, reduce the main bundle chunk to a code-split architecture, and update the README to reflect the verified June 2026 state.

All work is governed by Doctrine v2 (`13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`). The Spine invariants — determinism, sovereignty, quality — must remain unbroken throughout.

---

## Glossary

- **Browser_Node_Shim**: The file `src/lib/kernel/browser-node-shim.ts`, aliased in `vite.config.ts` for both `fs` and `path` module identifiers, providing inert named exports so browser bundles do not crash on Node-only imports.
- **Canonical_Rename_Lint**: The script `scripts/lint-canonical-rename.ts` that enforces a single canonical file per generator domain; exits non-zero on violations.
- **Character_Contract**: The file `src/lib/kernel/generators/character-contract.ts` that registers the `CharacterQualityContract` and contains the `synthesizeFrom15Contract` fallback.
- **Evasion_Pattern**: Any occurrence of `as any`, `@ts-ignore` (without a `// waived` annotation), `@ts-nocheck`, or an empty `catch()` block in the scanned directories (`src/lib/kernel`, `src/lib/contracts`, `src/lib/evolution`).
- **Golden_Snapshot**: The file `.paradigm/golden-hashes.json` containing SHA-256 hashes of curated artifact outputs used to verify cross-machine determinism.
- **Lint_No_Evasion**: The script `scripts/lint-no-evasion.ts` that counts evasion patterns and reports the total; currently non-blocking but gated by progressive CI thresholds in Phase 1.
- **ManualChunks**: The Vite `build.rollupOptions.output.manualChunks` configuration that splits the bundle into named chunks to reduce the main entry-point size.
- **Path_Shim**: The set of `path` module exports (`join`, `dirname`, `resolve`, `basename`, `extname`, `sep`, `posix`, `win32`) that must be added to `browser-node-shim.ts` so that the 24 generator files importing them receive valid no-op stubs in the browser bundle.
- **TransformationName**: The union type `'Base' | 'SSJ' | 'SSJ2' | 'SSJ3' | 'SSJGod' | 'SSJBlue' | 'UI' | 'UI_True'` defined in `src/lib/contracts/domains/character.ts`.
- **Waiver_Registry**: The append-only file `docs/waivers/registry.json` that records sunset-dated waivers for Doctrine v2 gates.

---

## Requirements

### Requirement 1: Path Exports in Browser Node Shim

**User Story:** As a developer building the Vite production bundle, I want `browser-node-shim.ts` to export all `path` module members that generator files import, so that the build completes without "not exported" warnings and the browser bundle does not crash at runtime.

#### Acceptance Criteria

1. THE `Browser_Node_Shim` SHALL export named functions `join`, `dirname`, `resolve`, `basename`, `extname` that accept any arguments and return a safe browser-stub string (e.g. the empty string or a descriptive placeholder) without throwing.
2. THE `Browser_Node_Shim` SHALL export named constants `sep` and `posix` and `win32` as inert stub objects.
3. WHEN the Vite production build runs after this change, THE build system SHALL produce zero "not exported" warnings originating from `browser-node-shim.ts`, regardless of whether any generator module throws during load.
4. WHEN any of the 24 affected generator files (`boardgame.ts`, `animation.ts`, `shader.ts`, `particle.ts`, `ecosystem.ts`, `procedural.ts`, `typography.ts`, `architecture.ts`, `vehicle.ts`, `furniture.ts`, `fashion.ts`, `robotics.ts`, `circuit.ts`, `food.ts`, `choreography.ts`, `alife.ts`, `physics.ts`, `field.ts`, `quantum.ts`, `molecule.ts`, `cosmology.ts`, `world.ts`, `game-wasm.ts`, `gspl-module-resolver.ts`) are imported in a browser context, THE `Browser_Node_Shim` SHALL satisfy those imports without throwing at module-load time.
5. THE `Browser_Node_Shim` default export SHALL include all newly added `path` stub members alongside the existing `fs` members.
6. WHEN server-side code (run by `tsx`) imports `path`, THE real Node.js `path` module SHALL be used because `vite.config.ts` aliases apply only to the Vite browser bundle and do not affect the `tsx` server runtime.

---

### Requirement 2: TypeScript Type Correctness in Character Contract

**User Story:** As a TypeScript developer running `npm run typecheck`, I want `character-contract.ts` to pass strict type checking with zero errors, so that the CI `typecheck` gate remains green and the type system accurately reflects the domain model.

#### Acceptance Criteria

1. THE `Character_Contract` SHALL declare `transformationPotential` in `synthesizeFrom15Contract` with the type `TransformationName[]` rather than the inferred `string[]`.
2. WHEN `npm run typecheck` is executed after this change, THE TypeScript compiler SHALL report zero errors across the entire `src/` tree.
3. THE fix SHALL use a type assertion (`as TransformationName[]`) or an `as const` assertion that satisfies the `TransformationName[]` constraint without widening the type.
4. THE fix SHALL not alter the runtime value of `transformationPotential`; the array `['Base']` SHALL remain the sole element.

---

### Requirement 3: Canonical Rename Lint — Food-Delivery Waiver Verification

**User Story:** As a developer running `npm run lint:canonical-rename`, I want the lint script to exit zero and report no violations, so that the canonical rename gate is clean and the CI `doctrine-gates` job passes.

#### Acceptance Criteria

1. WHEN `npm run lint:canonical-rename` is executed, THE `Canonical_Rename_Lint` script SHALL exit with code 0.
2. THE `Waiver_Registry` SHALL contain an entry with `id: "phase0-food-sibling"` that covers `src/lib/kernel/generators/food-delivery.ts` as a sibling of `food-contract.ts`.
3. IF the waiver entry already exists in `docs/waivers/registry.json`, THE `Canonical_Rename_Lint` script SHALL be updated to read the waiver registry and skip any file listed therein before reporting violations; IF the waiver registry file does not exist, THE script SHALL skip the waiver check entirely and proceed with normal linting.
4. THE waiver entry SHALL include a `sunset` date no later than `2026-08-15` and a `reason` explaining that `food-delivery.ts` is a legacy domain from the pre-canonical era.
5. WHEN the sunset date is reached and the waiver is expired, THE `Canonical_Rename_Lint` script SHALL exit with a non-zero failure code for the affected file, treating the expired waiver as a violation.

---

### Requirement 4: Golden Snapshot Synchronisation

**User Story:** As a developer running `npm run golden:verify`, I want the golden snapshot to include hashes for all three new character curated seeds (`ch-mage`, `ch-rogue`, `ch-warrior`), so that the verify command reports 38/38 matches and the determinism gate is fully green.

#### Acceptance Criteria

1. WHEN `npm run golden:write` is executed, THE `Golden_Snapshot` file `.paradigm/golden-hashes.json` SHALL be updated to include entries for `ch-mage`, `ch-rogue`, and `ch-warrior` under the `character` contract.
2. WHEN `npm run golden:verify` is executed after the snapshot update, THE verify command SHALL report all hashes as matching with zero mismatches.
3. THE three new entries SHALL each contain `contract: "character"`, a `contractVersion` matching the current `CharacterQualityContract.version`, and a `curatedId` matching the `id` field in the `CURATED` array of `character-contract.ts`.
4. THE `Golden_Snapshot` SHALL preserve all 35 existing entries without modification.
5. WHEN the same `npm run golden:verify` command is run on a second machine with the same Node.js version, THE hashes SHALL match, confirming cross-machine determinism.

---

### Requirement 5: Progressive Evasion Pattern Reduction

**User Story:** As a platform engineer advancing Phase 1, I want the count of unwaived evasion patterns in kernel code to decrease measurably from the baseline of 338, so that the Phase 1 exit gate (`lint:no-evasion` reports 0 unwaived patterns) is approached progressively and the CI threshold tightens.

#### Acceptance Criteria

1. THE `Lint_No_Evasion` script SHALL be updated to read `docs/waivers/registry.json` and subtract waived counts from the total before reporting.
2. WHEN `npm run lint:no-evasion` is executed after this change, THE script SHALL report the number of unwaived evasion patterns separately from waived ones.
3. THE CI `doctrine-gates` job SHALL enforce a hard threshold of no more than 338 unwaived evasion patterns (the current baseline), failing the build only when the count exceeds 338.
4. THE `Lint_No_Evasion` script SHALL scan the directories `src/lib/kernel`, `src/lib/contracts`, and `src/lib/evolution` for the patterns `as any`, `@ts-ignore` (without `// waived`), `@ts-nocheck`, and empty `catch()` blocks.
5. WHERE a file contains an evasion pattern that is covered by a valid, non-expired waiver entry in `docs/waivers/registry.json`, THE `Lint_No_Evasion` script SHALL exclude that file's count from the unwaived total.
6. THE Phase 1 exit gate target of 0 unwaived evasion patterns SHALL be documented as the long-term goal in the script's header comment.

---

### Requirement 6: Bundle Size Reduction via Code Splitting

**User Story:** As a developer shipping the production build, I want the main Vite chunk to be split into named sub-chunks so that the 1.8 MB main entry-point is reduced and the browser can load the application faster through parallel chunk fetching.

#### Acceptance Criteria

1. THE `vite.config.ts` SHALL define a `build.rollupOptions.output.manualChunks` function that separates vendor libraries into named chunks.
2. WHEN `npm run build` is executed after this change, THE main entry-point chunk SHALL be no larger than 800 KB (gzipped or uncompressed, whichever the Vite reporter shows).
3. THE `manualChunks` configuration SHALL place Three.js and `@react-three/*` into a chunk named `vendor-three`.
4. THE `manualChunks` configuration SHALL place React, React-DOM, and React-Router into a chunk named `vendor-react`.
5. THE `manualChunks` configuration SHALL place Framer Motion, Recharts, and D3 into a chunk named `vendor-viz`.
6. THE `manualChunks` configuration SHALL place Ethers.js and smart-contract-related modules into a chunk named `vendor-chain`.
7. WHEN `npm run build` completes, THE build SHALL succeed with exit code 0, all existing tests SHALL continue to pass, and the main entry-point chunk SHALL contain a non-trivial amount of application bootstrap code (not be reduced to an empty or near-empty shell).
8. THE code splitting SHALL not alter any runtime behaviour; all routes and lazy-loaded components SHALL continue to function correctly.

---

### Requirement 7: README Accuracy Update

**User Story:** As a new contributor reading the README, I want the verification status table and metrics to reflect the actual verified state as of June 2026 (1512 tests, 38 golden hashes, 1 TypeScript error resolved, build warnings resolved), so that the README is an honest, trustworthy entry point consistent with Doctrine v2's "no evasion" principle.

#### Acceptance Criteria

1. THE `README.md` SHALL update the test count in the verification status table to reflect the current actual passing test count at the time the change is applied, rather than a fixed number.
2. THE `README.md` SHALL update the golden hash count from `35/35` to `38/38` after the snapshot synchronisation in Requirement 4 is complete.
3. THE `README.md` SHALL update the TypeScript status from `⚠️ 1 type error` to `✅ 0 errors` after the fix in Requirement 2 is applied.
4. THE `README.md` SHALL update the build status to `✅ succeeds (0 warnings)` after the path shim fix in Requirement 1 eliminates the "not exported" build warnings.
5. THE `README.md` SHALL update the `Current State Snapshot` table to reflect the June 2026 verified metrics (1512 tests, 38 golden hashes, 0 TypeScript errors).
6. THE `README.md` SHALL retain all existing sections, links, and governance references; no content SHALL be removed, only updated for accuracy.
7. WHEN a developer follows the Quick Start and runs the verification commands listed in the README, THE commands SHALL produce output consistent with the status indicators shown in the README.
