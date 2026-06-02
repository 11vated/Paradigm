# Design Document — Paradigm Platform: Full Completion (Bug Fixes + Phase 1 Advancement)

## Overview

This document describes the technical approach for resolving four concrete bugs and advancing three Phase 1 gate items in the Paradigm Absolute platform. All changes are surgical and additive; no existing architecture is altered. The Spine invariants (determinism, sovereignty, quality) are preserved throughout.

The six work items are:

| # | Item | Type | Effort |
|---|------|------|--------|
| 1 | Add `path` exports to `browser-node-shim.ts` | Bug fix | Small |
| 2 | Fix `TransformationName[]` type error in `character-contract.ts` | Bug fix | Trivial |
| 3 | Wire waiver-aware logic into `lint-canonical-rename.ts` | Bug fix | Small |
| 4 | Regenerate golden snapshot for 3 new character seeds | Bug fix | Trivial |
| 5 | Make `lint-no-evasion.ts` waiver-aware + tighten CI threshold | Phase 1 | Small |
| 6 | Add Vite `manualChunks` code splitting | Phase 1 | Small |
| 7 | Update README to reflect verified June 2026 state | Phase 1 | Trivial |

---

## Architecture

No architectural changes are introduced. All modifications are confined to:

- `src/lib/kernel/browser-node-shim.ts` — export surface extension
- `src/lib/kernel/generators/character-contract.ts` — one-line type assertion
- `scripts/lint-canonical-rename.ts` — waiver-registry integration
- `scripts/lint-no-evasion.ts` — waiver-registry integration + output format
- `.paradigm/golden-hashes.json` — snapshot update (via `npm run golden:write`)
- `vite.config.ts` — `manualChunks` addition inside `build.rollupOptions`
- `README.md` — text accuracy updates

The existing Vite alias table, the `paradigm-node-builtin-guard` plugin, and the `paradigm-heavy-generator-stub` plugin are untouched.

---

## Components and Interfaces

### 1. Browser Node Shim — Path Export Extension

**File:** `src/lib/kernel/browser-node-shim.ts`

**Current state:** Exports `fs` members only (`promises`, `readFile`, `writeFile`, etc.). The `vite.config.ts` alias table maps both `fs` and `path` (and their `node:` prefixed variants) to this single file. Generator files that import `join`, `dirname`, `resolve`, `basename`, `extname` from `path` receive "not exported" warnings at build time.

**Design:** Add a second block of named exports that mirror the `path` module's public API. Each function returns a safe stub value (empty string or a joined-path approximation) and never throws. The `sep` constant is `'/'`, `posix` and `win32` are minimal stub objects. The default export object is extended to include all new members.

```typescript
// path stubs — safe no-ops for browser bundle
export const join = (..._args: string[]): string => '';
export const dirname = (_p: string): string => '';
export const resolve = (..._args: string[]): string => '';
export const basename = (_p: string, _ext?: string): string => '';
export const extname = (_p: string): string => '';
export const sep: string = '/';
export const posix: any = { join, dirname, resolve, basename, extname, sep };
export const win32: any = { join, dirname, resolve, basename, extname, sep: '\\' };
```

The default export is updated:

```typescript
const shimDefault: any = {
  // existing fs members ...
  join, dirname, resolve, basename, extname, sep, posix, win32,
};
export default shimDefault;
```

**Why stubs return empty string:** Generator files that import `path` functions use them to construct file paths for Node-side I/O (e.g., `path.join(os.tmpdir(), 'pdgm-ch-')`). In the browser bundle these code paths are never reached because the `paradigm-heavy-generator-stub` plugin intercepts the generator imports before they reach the browser. The stubs only need to satisfy the module-load-time named export check; they are never called in the browser.

**Server-side isolation:** The `vite.config.ts` `resolve.alias` table is processed exclusively by the Vite bundler. When `tsx server.ts` runs, Node.js resolves `path` to the real built-in module. No server behaviour changes.

---

### 2. Character Contract — TransformationName Type Fix

**File:** `src/lib/kernel/generators/character-contract.ts`, line 77

**Current state:**
```typescript
transformationPotential: ['Base'],
```
TypeScript infers this as `string[]`. The `CharacterGenes` interface (from `src/lib/contracts/domains/character.ts`) declares `transformationPotential: TransformationName[]`. This produces a type error because `string[]` is not assignable to `TransformationName[]`.

**Design:** Apply a type assertion at the point of construction:

```typescript
transformationPotential: ['Base'] as TransformationName[],
```

This is the minimal, zero-risk fix. The runtime value is unchanged. The `TransformationName` type is already imported transitively through `character15` from `src/lib/contracts/domains/character.ts`; no new import is needed.

**Alternative considered:** `as const` assertion (`['Base'] as const`) would produce type `readonly ['Base']`, which is not assignable to `TransformationName[]` without an additional cast. The direct `as TransformationName[]` assertion is cleaner.

---

### 3. Canonical Rename Lint — Waiver-Aware Logic

**File:** `scripts/lint-canonical-rename.ts`

**Current state:** The script groups generator files by base name and reports any group with more than one member as a violation. It has no knowledge of the waiver registry. `food-delivery.ts` and `food-contract.ts` share the base `food`, triggering a violation.

**Root cause analysis:** The regex `/(-(v\d+|enhanced|gpu|3d|animated|delivery|contract)\.ts$)/` strips `-delivery` and `-contract` suffixes, collapsing `food-delivery.ts` and `food-contract.ts` into the same base `food`. The waiver for `food-delivery.ts` already exists in `docs/waivers/registry.json` with `id: "phase0-food-sibling"` and `sunset: "2026-08-15"`.

**Design:** Add waiver-registry reading to the script:

```typescript
import { readFileSync, existsSync } from 'fs';

interface Waiver { id: string; file: string; sunset: string; }

function loadWaivers(): Set<string> {
  const registryPath = 'docs/waivers/registry.json';
  if (!existsSync(registryPath)) return new Set();
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const waived = new Set<string>();
  for (const w of registry.waivers as Waiver[]) {
    if (w.sunset < today) {
      console.error(`[canonical-rename] Waiver ${w.id} expired on ${w.sunset}. Fix or renew.`);
      process.exit(1);
    }
    // file field may be a path or a description; match by basename
    waived.add(w.file);
  }
  return waived;
}
```

Before reporting a violation, the script checks whether any file in the sibling group is covered by a waiver entry. If all extra siblings are waived, the group is skipped. If a waiver is expired, the script exits non-zero immediately.

**Waiver matching strategy:** The waiver `file` field for `phase0-food-sibling` is `"src/lib/kernel/generators/food-delivery.ts"`. The script normalises file paths to forward-slash relative paths before comparison.

---

### 4. Golden Snapshot Synchronisation

**Mechanism:** The `npm run golden:write` command invokes `scripts/replay.mts golden --tier flagship`. The replay script calls `loadContracts({ tier: 'flagship' })`, which loads the `CharacterQualityContract`. The contract's `curated()` method returns three seeds: `ch-warrior`, `ch-mage`, `ch-rogue`. The script synthesises each seed, hashes the artifact, and writes the entries to `.paradigm/golden-hashes.json`.

**Current gap:** The three character seeds exist in `character-contract.ts` `CURATED` array but are not yet in the golden snapshot. Running `npm run golden:write` will add them. The `--merge` flag is not needed because the script in non-merge mode rewrites the full file for the selected tier; the existing 35 entries for other contracts are preserved because the flagship tier includes all flagship contracts.

**Verification:** After writing, `npm run golden:verify` must exit 0. The verify command compares live synthesis hashes against the snapshot. Because `synthesizeFrom15Contract` is deterministic (driven by `rngFromHash(seed.$hash)`), the hashes will match on any machine with the same Node.js version.

**Note on `canvas` dependency:** The character contract falls back to `synthesizeFrom15Contract` when the native `canvas` package is unavailable (CI / minimal hosts). The fallback is fully deterministic. The golden hashes will reflect the fallback path on machines without native canvas, which is the expected behaviour.

---

### 5. Evasion Pattern Lint — Waiver-Aware + CI Threshold

**File:** `scripts/lint-no-evasion.ts`

**Current state:** The script counts all evasion patterns in the three scanned directories and prints the total. It does not read the waiver registry. The CI threshold is not enforced (the script always exits 0).

**Design:**

1. **Waiver subtraction:** Read `docs/waivers/registry.json`. For each waiver entry that covers a file or a batch (e.g., `phase0-evasion-336-batch` with `count: 336`), subtract the waived count from the total. Report waived and unwaived counts separately.

2. **CI threshold enforcement:** Add a `--max-unwaived <N>` flag. When the unwaived count exceeds `N`, exit non-zero. The CI `doctrine-gates` job passes `--max-unwaived 338`.

3. **Output format:**
   ```
   Total evasion patterns found: 340
   Waived (registry): 336
   Unwaived: 4
   Top unwaived offenders:
     3 in src/lib/kernel/some-new-file.ts
     1 in src/lib/evolution/other.ts
   ```

4. **Header comment:** Document the Phase 1 exit gate target (0 unwaived) and the current baseline (338 waived).

**Waiver count resolution:** The `phase0-evasion-336-batch` waiver has `count: 336` and `file: "multiple"`. The script treats batch waivers with a numeric `count` field as a flat subtraction from the total, rather than per-file matching. This is intentional — the batch waiver covers a known quantity of patterns that were present at Phase 0 close.

**Progressive tightening:** As patterns are fixed in subsequent sessions, the waiver `count` is reduced and the CI threshold is lowered. The script and CI job are designed to make this tightening mechanical.

---

### 6. Vite Bundle Code Splitting

**File:** `vite.config.ts`

**Current state:** No `build.rollupOptions` is configured. Vite produces a single large main chunk (~1.8 MB) containing all vendor and application code.

**Design:** Add a `build` section with `rollupOptions.output.manualChunks`. The function receives a module ID and returns a chunk name string or `undefined` (meaning "put in the default chunk").

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

**Chunk size rationale:**
- `vendor-three`: Three.js + `@react-three/fiber` + `@react-three/drei` account for the largest share of the bundle (~600 KB). Splitting this into its own chunk allows the browser to cache it independently.
- `vendor-react`: React 19 + React-DOM + React-Router are stable and change rarely. Caching them separately improves repeat-visit performance.
- `vendor-viz`: Framer Motion, Recharts, and D3 are used only on specific pages. Splitting them reduces the initial parse cost.
- `vendor-chain`: Ethers.js is large and only needed for on-chain operations. Splitting it avoids loading it on non-blockchain pages.

**Main chunk target:** After splitting, the main entry-point chunk should contain application bootstrap code (React app root, router, page components) and remain below 800 KB. The main chunk must not be empty — it must contain the application entry point.

**Compatibility:** Vite's `manualChunks` is a standard Rollup feature. It does not affect the dev server (`npm run dev`), only the production build. All lazy-loaded routes continue to work because Vite handles dynamic imports independently of `manualChunks`.

---

### 7. README Accuracy Update

**File:** `README.md`

**Changes required:**

| Location | Current value | Updated value |
|----------|--------------|---------------|
| Verification status table — TypeScript | `⚠️ 1 type error` | `✅ 0 errors` |
| Verification status table — Build | `✅ succeeds (with warnings)` | `✅ succeeds (0 warnings)` |
| Verification status table — Golden replay | `✅ 35/35 hashes` | `✅ 38/38 hashes` |
| Verification status table — Full test suite | `✅ 1512/1512 pass` | `✅ <current count>/pass` |
| Current State Snapshot table — Tests | `1497 passing across 108 files` | current actual count |
| Current State Snapshot table — Golden hashes | `30/30` or `35/35` | `38/38` |

The README update is applied last, after all other fixes are verified, so the status indicators are accurate at the time of commit.

---

## Data Models

No new data models are introduced. The existing interfaces are unchanged:

- `GoldenEntry` / `GoldenFile` in `scripts/replay.mts` — unchanged; three new entries are added to the `entries` array.
- `QualityContract<TSeed, TArtifact, TGenes>` — unchanged.
- `CharacterGenes` in `src/lib/contracts/domains/character.ts` — unchanged; the fix is a type assertion at the call site, not a model change.
- Waiver registry schema in `docs/waivers/registry.json` — unchanged; the `phase0-food-sibling` entry already exists.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The changes in this spec are primarily infrastructure fixes (build configuration, type assertions, lint script updates, snapshot writes, and documentation). Most acceptance criteria are integration tests, smoke tests, or concrete examples rather than universal properties. However, two universal properties emerge from the analysis:

### Property 1: Path Stub Functions Never Throw

*For any* combination of string arguments passed to `join`, `dirname`, `resolve`, `basename`, or `extname` exported from `browser-node-shim.ts`, the function SHALL return a value of type `string` without throwing an exception.

**Validates: Requirements 1.1**

### Property 2: Golden Snapshot Preservation

*For any* entry present in `.paradigm/golden-hashes.json` before `npm run golden:write` is executed, that entry SHALL still be present with the same `artifactHash` value after the write completes, provided the entry belongs to a contract that is not being regenerated in the current write operation.

**Validates: Requirements 4.4**

### Property 3: Waiver Exclusion Correctness

*For any* file whose path appears in a valid, non-expired waiver entry in `docs/waivers/registry.json`, the `lint-no-evasion.ts` script SHALL NOT include that file's evasion pattern count in the reported unwaived total.

**Validates: Requirements 5.5**

---

## Error Handling

### Build Warnings (Requirement 1)
If the path stubs are added but a generator file imports a `path` member not covered by the stubs (e.g., `path.format`, `path.parse`), the build will still warn. The design covers all members imported by the 24 affected files. If new generators are added that import additional `path` members, the shim must be extended.

### Expired Waivers (Requirements 3, 5)
Both lint scripts exit non-zero when a waiver's `sunset` date has passed. This is intentional — expired waivers are treated as violations to enforce the progressive cleanup mandate of Doctrine v2.

### Golden Write Failures (Requirement 4)
If `synthesizeFrom15Contract` throws during `npm run golden:write`, the replay script logs `[skip] character/<id>: <message>` and continues. The golden file will be written without the failed entry. The developer must investigate the failure before the snapshot is considered complete.

### Bundle Size Regression (Requirement 6)
If a future dependency addition causes the main chunk to exceed 800 KB again, the `manualChunks` function must be updated to route the new dependency to an appropriate vendor chunk. The build does not fail on chunk size by default; a Vite plugin or CI size check would be needed to enforce the limit automatically (out of scope for this spec).

---

## Testing Strategy

This feature set is primarily infrastructure and configuration work. The appropriate testing strategy is:

**Unit tests (example-based):**
- Test that `browser-node-shim.ts` exports `join`, `dirname`, `resolve`, `basename`, `extname`, `sep`, `posix`, `win32`.
- Test that calling each path stub function with representative arguments returns a string without throwing.
- Test that `synthesizeFrom15Contract` returns `transformationPotential: ['Base']` with the correct type.
- Test that `lint-canonical-rename.ts` skips files covered by valid waivers and fails on expired waivers.
- Test that `lint-no-evasion.ts` correctly subtracts waived counts and reports them separately.

**Property-based tests:**
- Property 1: Path stub functions never throw for any string arguments.
- Property 2: Golden snapshot preservation — existing entries are not modified by a write operation targeting different contracts.
- Property 3: Waiver exclusion — any file with a valid waiver is excluded from the unwaived count.

The property-based testing library for this TypeScript project is **fast-check** (already available in the ecosystem; if not installed, add as a dev dependency). Each property test runs a minimum of 100 iterations.

**Integration tests:**
- `npm run build` exits 0 with zero "not exported" warnings.
- `npm run typecheck` exits 0.
- `npm run lint:canonical-rename` exits 0.
- `npm run golden:verify` exits 0 after snapshot update.
- `npm test` — all existing tests continue to pass.

**Smoke tests:**
- `npm run lint:no-evasion` reports unwaived count ≤ 338.
- CI `doctrine-gates` job passes with the updated threshold.
