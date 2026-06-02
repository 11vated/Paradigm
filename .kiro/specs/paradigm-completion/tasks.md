# Implementation Plan: Paradigm Platform — Full Completion (Bug Fixes + Phase 1 Advancement)

## Overview

Seven discrete work items executed in dependency order. Items 1–4 are bug fixes that unblock clean CI. Items 5–7 are Phase 1 advancement tasks. Each task is self-contained and verifiable. The full verification gate (`npm run typecheck && npm run build && npm test && npm run golden:verify && npm run lint:canonical-rename && npm run lint:no-evasion`) must be green after all tasks are complete.

---

## Tasks

- [x] 1. Fix Bug 1 — Add `path` exports to `browser-node-shim.ts`
  - Open `src/lib/kernel/browser-node-shim.ts`
  - After the existing `fs` named exports, add a new block of `path` stub exports:
    - `export const join = (..._args: string[]): string => '';`
    - `export const dirname = (_p: string): string => '';`
    - `export const resolve = (..._args: string[]): string => '';`
    - `export const basename = (_p: string, _ext?: string): string => '';`
    - `export const extname = (_p: string): string => '';`
    - `export const sep: string = '/';`
    - `export const posix: any = { join, dirname, resolve, basename, extname, sep };`
    - `export const win32: any = { join, dirname, resolve, basename, extname, sep: '\\\\' };`
  - Extend the `fsDefault` object at the bottom to include all new path members
  - _Requirements: 1.1, 1.2, 1.5_

  - [ ]* 1.1 Write unit tests for path stub exports
    - In `tests/kernel/browser-node-shim.test.ts` (create if absent), assert each of `join`, `dirname`, `resolve`, `basename`, `extname` is exported and returns a string
    - Assert `sep` is a string, `posix` and `win32` are objects
    - Assert the default export contains all path members
    - _Requirements: 1.1, 1.2, 1.5_

  - [ ]* 1.2 Write property test — path stubs never throw
    - **Property 1: Path Stub Functions Never Throw**
    - Using fast-check, generate arbitrary arrays of strings and verify that calling each of `join`, `dirname`, `resolve`, `basename`, `extname` with those arguments returns a string without throwing
    - Run minimum 100 iterations
    - _Requirements: 1.1_

- [x] 2. Verify build warnings are eliminated
  - Run `npm run build` and confirm zero "not exported" warnings in the output
  - If any warnings remain, identify the missing export and add it to the shim
  - _Requirements: 1.3, 1.4, 1.6_

- [x] 3. Fix Bug 2 — TypeScript type error in `character-contract.ts`
  - Open `src/lib/kernel/generators/character-contract.ts`
  - Locate line 77: `transformationPotential: ['Base'],`
  - Change to: `transformationPotential: ['Base'] as TransformationName[],`
  - Verify `TransformationName` is accessible in scope (it is imported transitively via `character15` from `src/lib/contracts/domains/character.ts`; add a direct import if the type is not in scope: `import type { TransformationName } from '../../contracts/domains/character';`)
  - Run `npm run typecheck` and confirm 0 errors
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 3.1 Write unit test for synthesizeFrom15Contract return value
    - In `tests/kernel/character-contract.test.ts` (create if absent), call `synthesizeFrom15Contract` with a minimal seed `{ $hash: 'test-seed' }` and assert `transformationPotential` equals `['Base']`
    - _Requirements: 2.4_

- [x] 4. Fix Bug 3 — Wire waiver-aware logic into `lint-canonical-rename.ts`
  - Open `scripts/lint-canonical-rename.ts`
  - Add a `loadWaivers()` function that reads `docs/waivers/registry.json` (if it exists), checks each waiver's `sunset` date against today, exits non-zero if any waiver is expired, and returns a `Set<string>` of waived file paths
  - Before reporting a violation for a sibling group, check whether all extra siblings (beyond the canonical one) have their full path in the waived set; if so, skip the group
  - Confirm `docs/waivers/registry.json` already contains the `phase0-food-sibling` entry covering `src/lib/kernel/generators/food-delivery.ts`; if not, add it
  - Run `npm run lint:canonical-rename` and confirm exit code 0
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.1 Write unit tests for waiver-aware canonical rename lint
    - Test that a file covered by a valid waiver is skipped (no violation reported)
    - Test that a file covered by an expired waiver causes exit non-zero
    - Test that when the registry file does not exist, linting proceeds normally
    - _Requirements: 3.3, 3.5_

- [x] 5. Fix Bug 4 — Regenerate golden snapshot for new character seeds
  - Run `npm run golden:write` to regenerate `.paradigm/golden-hashes.json` for the flagship tier
  - Confirm the output file contains entries for `ch-mage`, `ch-rogue`, and `ch-warrior` under the `character` contract
  - Confirm all 35 pre-existing entries are preserved with unchanged hashes
  - Run `npm run golden:verify` and confirm exit code 0 with all hashes matching
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.1 Write property test — golden snapshot preservation
    - **Property 2: Golden Snapshot Preservation**
    - Using fast-check, generate a random subset of existing golden entries, simulate a write operation targeting a different contract, and verify all entries in the subset are still present with unchanged hashes
    - Run minimum 100 iterations
    - _Requirements: 4.4_

- [x] 6. Checkpoint — Verify all bug fixes are green
  - Run the full verification gate:
    ```bash
    npm run typecheck
    npm run build
    npm run golden:verify
    npm run lint:canonical-rename
    npm test
    ```
  - All commands must exit 0 with no errors or unexpected warnings
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Phase 1 Item 1 — Make `lint-no-evasion.ts` waiver-aware and tighten CI threshold
  - Open `scripts/lint-no-evasion.ts`
  - Add a header comment documenting the Phase 1 exit gate target (0 unwaived evasion patterns) and the current baseline (338 waived under `phase0-evasion-336-batch`)
  - Add waiver-registry reading: load `docs/waivers/registry.json`, sum up `count` fields from batch waivers and collect per-file waivers; subtract from the total to produce an unwaived count
  - Update the output to report both waived and unwaived counts separately
  - Add a `--max-unwaived <N>` CLI flag; when the unwaived count exceeds `N`, exit non-zero
  - Update `package.json` `lint:no-evasion` script to pass `--max-unwaived 338`
  - Run `npm run lint:no-evasion` and confirm it reports the correct breakdown and exits 0
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [ ]* 7.1 Write unit tests for waiver-aware evasion lint
    - Test that a batch waiver with `count: 336` reduces the unwaived total by 336
    - Test that a per-file waiver excludes that file's patterns from the unwaived count
    - Test that `--max-unwaived 338` exits 0 when unwaived ≤ 338 and exits non-zero when unwaived > 338
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 7.2 Write property test — waiver exclusion correctness
    - **Property 3: Waiver Exclusion Correctness**
    - Using fast-check, generate a random set of files with evasion patterns and a random set of valid waiver entries covering some of those files; verify that the reported unwaived count equals the total minus the sum of waived counts
    - Run minimum 100 iterations
    - _Requirements: 5.5_

- [x] 8. Phase 1 Item 2 — Add Vite `manualChunks` code splitting
  - Open `vite.config.ts`
  - Inside the `return { ... }` block, add a `build` section with `rollupOptions.output.manualChunks`:
    ```typescript
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
              return 'vendor-three';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') ||
                id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion') ||
                id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
              return 'vendor-viz';
            }
            if (id.includes('node_modules/ethers') || id.includes('node_modules/@openzeppelin')) {
              return 'vendor-chain';
            }
          }
        }
      }
    }
    ```
  - Run `npm run build` and confirm:
    - Exit code 0
    - Output lists chunks named `vendor-three`, `vendor-react`, `vendor-viz`, `vendor-chain`
    - Main entry-point chunk is below 800 KB
    - Main chunk is not empty (contains application bootstrap code)
  - Run `npm test` and confirm all tests still pass
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 9. Phase 1 Item 3 — Update README to reflect verified June 2026 state
  - Run `npm test -- --reporter=verbose 2>&1 | tail -5` to get the current passing test count
  - Open `README.md`
  - Update the verification status table:
    - TypeScript row: change to `✅ 0 errors`
    - Build row: change to `✅ succeeds (0 warnings)`
    - Golden replay row: change to `✅ 38/38 hashes`
    - Full test suite row: update to the current actual passing count
  - Update the `Current State Snapshot` table:
    - Tests row: update to current actual count
    - Golden hashes row: update to `38/38`
  - Update the `Current State — v1.0.0 Release` section metrics to match
  - Verify no sections, links, or governance references have been removed
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 10. Final checkpoint — Full verification gate
  - Run the complete verification suite:
    ```bash
    npm run typecheck
    npm run determinism:check
    npm run build
    npm run golden:verify
    npm run lint:canonical-rename
    npm run lint:no-evasion
    npm test
    ```
  - All commands must exit 0
  - Confirm build output shows named vendor chunks and no "not exported" warnings
  - Confirm `lint:no-evasion` reports unwaived count ≤ 338
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster fix-only pass
- Tasks 1–6 (bug fixes + first checkpoint) should be completed before Phase 1 items (Tasks 7–10)
- The golden snapshot write (Task 5) must be run after the TypeScript fix (Task 3) to ensure the character contract compiles cleanly before synthesis
- Property tests use **fast-check** (`npm install --save-dev fast-check` if not already present)
- Each property test must include a comment referencing the design document property: `// Feature: paradigm-completion, Property N: <property_text>`
- The README update (Task 9) is the final task and should reflect the state after all other tasks are complete

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "3", "4"], "description": "Bug fixes — parallel" },
    { "wave": 2, "tasks": ["2", "5"], "description": "Verify build + golden write — depend on wave 1" },
    { "wave": 3, "tasks": ["6"], "description": "Checkpoint — all bug fixes green" },
    { "wave": 4, "tasks": ["7", "8"], "description": "Phase 1 items — parallel" },
    { "wave": 5, "tasks": ["9"], "description": "README update — after all fixes verified" },
    { "wave": 6, "tasks": ["10"], "description": "Final verification gate" }
  ]
}
```
