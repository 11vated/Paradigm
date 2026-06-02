# Implementation Plan: Paradigm Full Completion (Phases 1–15)

## Overview

Tasks are organized in six dependency waves. Waves 1–2 are infrastructure and quality foundations. Waves 3–4 are agent and corpus work. Wave 5 is surfaces. Wave 6 is final verification. Tasks within each wave are independent and can be executed in parallel.

The Spine invariant applies to every task: no `Math.random`, no `Date.now` in kernel paths, no `@ts-nocheck`, 0 TypeScript errors after every task.

---

## Tasks

### Wave 1 — Server Trim · CI Hardening · Stratum Predicate Expansion

- [ ] 1. Trim `server.ts` to ≤500 LOC
  - Remove the duplicate inline `/api/substrate/health` GET handler (lines ~200–230 inside `startServer()`) — `registerSubstrateHealthRoutes(app)` already handles this endpoint later in the file
  - After removal, run `wc -l server.ts`; if still above 500, extract the Prometheus metrics middleware block (the `metrics` object + histogram setup + `app.use` middleware) into `src/server/routes/metrics-middleware.ts` following the `registerXxxRoutes(app, deps)` pattern
  - Verify: `wc -l server.ts` reports ≤500; `npm run typecheck` reports 0 errors; `npm test` passes with no regressions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 1.1 Write regression test confirming server.ts LOC gate
    - Add a test in `tests/api/server-size.test.ts` that reads `server.ts` with `fs.readFileSync` and asserts `lines.length <= 500`
    - _Requirements: 1.1_

- [ ] 2. Harden CI `doctrine-gates` job
  - In `.github/workflows/ci.yml`, add three new steps to the `doctrine-gates` job after the existing "Full Pre-flight Report" step:
    1. `Stratum Contracts (hard gate)`: `npx vitest run tests/contracts/`
    2. `Golden Hash Verify (hard gate)`: `npm run golden:verify` (remove the `|| true` from the existing "Golden Hash Spot Check" step)
    3. `paradigm make smoke test`: `npx tsx scripts/paradigm.ts make "a lone monk who paints with living sound" --domain music` with `timeout-minutes: 3`
  - Tighten the `no-evasion` step: change the threshold from `150` to `0` (the linter reads `docs/waivers/registry.json` and subtracts valid waivers automatically)
  - Add an expired-waiver detection step: `npx tsx scripts/lint-no-evasion.ts --check-expired` that exits non-zero if any waiver's `sunset` date has passed
  - Ensure the `doctrine-gates` job runs on every PR targeting `main` and every push to `main` (add `pull_request: branches: [main]` trigger if not already present)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_


- [ ] 3. Expand stratum predicate axes to ≥6 named exports per stratum
  - [ ] 3.1 Expand `src/lib/contracts/strata/form.ts` with named axis exports
    - Add individually callable exports: `symmetryScore(a)`, `complexityScore(a)`, `boundingBoxAspectRatio(a)`, `vertexDensity(a)`, `curvatureVariance(a)`, `topologicalGenus(a)` — each returns `number` in `[0,1]`, returns `0` for null/undefined input, never throws
    - Each function extracts its signal from the artifact object defensively (use optional chaining throughout)
    - _Requirements: 3.1, 3.10, 3.11_

  - [ ]* 3.2 Write tests for Form stratum axes
    - Create `tests/contracts/form.test.ts` with ≥1 test per axis: valid input returns [0,1], null input returns 0, boundary values
    - **Property 2: Stratum score range invariant** — for any valid artifact, all axis functions return values in [0,1]
    - **Validates: Requirements 3.1, 3.10**
    - _Requirements: 3.12_

  - [ ] 3.3 Expand `src/lib/contracts/strata/motion.ts` with named axis exports
    - Add: `velocityMagnitude(a)`, `accelerationSmoothness(a)`, `trajectoryArcLength(a)`, `periodicityScore(a)`, `collisionResponseTime(a)`, `inertiaConsistency(a)`
    - Same null-safety and range contracts as Form
    - _Requirements: 3.2, 3.10, 3.11_

  - [ ]* 3.4 Write tests for Motion stratum axes
    - Create `tests/contracts/motion.test.ts`
    - **Property 1: Stratum predicate null safety** — null input returns 0 without throwing
    - **Validates: Requirements 3.2, 3.11**
    - _Requirements: 3.12_

  - [ ] 3.5 Expand `src/lib/contracts/strata/sound.ts` with named axis exports
    - Add: `lufsIntegratedLoudness(a)`, `spectralCentroid(a)`, `dynamicRange(a)`, `rhythmicDensity(a)`, `harmonicComplexity(a)`, `onsetStrength(a)`
    - _Requirements: 3.3, 3.10, 3.11_

  - [ ]* 3.6 Write tests for Sound stratum axes
    - Create `tests/contracts/sound.test.ts`
    - _Requirements: 3.12_

  - [ ] 3.7 Expand `src/lib/contracts/strata/world.ts` (Space) with named axis exports
    - Add: `spatialExtent(a)`, `densityDistribution(a)`, `navigationConnectivity(a)`, `landmarkVisibility(a)`, `biomeCoherence(a)`, `altitudeVariance(a)`
    - _Requirements: 3.4, 3.10, 3.11_

  - [ ]* 3.8 Write tests for World/Space stratum axes
    - Create `tests/contracts/world.test.ts`
    - _Requirements: 3.12_

  - [ ] 3.9 Expand `src/lib/contracts/strata/time.ts` with named axis exports
    - Add: `temporalResolution(a)`, `causalConsistency(a)`, `branchingFactor(a)`, `epochDuration(a)`, `eventDensity(a)`, `narrativeVelocity(a)`
    - _Requirements: 3.5, 3.10, 3.11_

  - [ ]* 3.10 Write tests for Time stratum axes
    - Create `tests/contracts/time.test.ts`
    - _Requirements: 3.12_

  - [ ] 3.11 Expand `src/lib/contracts/strata/field.ts` (Structure) with named axis exports
    - Add: `hierarchyDepth(a)`, `nodeConnectivity(a)`, `modularity(a)`, `redundancy(a)`, `loadBalanceScore(a)`, `interfaceCohesion(a)`
    - _Requirements: 3.6, 3.10, 3.11_

  - [ ]* 3.12 Write tests for Field/Structure stratum axes
    - Create `tests/contracts/field.test.ts`
    - _Requirements: 3.12_

  - [ ] 3.13 Expand `src/lib/contracts/strata/story.ts` (Semantics) with named axis exports
    - Add: `conceptualCoherence(a)`, `lexicalDiversity(a)`, `narrativeConsistency(a)`, `intentAlignment(a)`, `ambiguityScore(a)`, `referentialIntegrity(a)`
    - _Requirements: 3.7, 3.10, 3.11_

  - [ ]* 3.14 Write tests for Story/Semantics stratum axes
    - Create `tests/contracts/story.test.ts`
    - _Requirements: 3.12_

  - [ ] 3.15 Expand `src/lib/contracts/strata/culture.ts` with named axis exports
    - Add: `culturalAuthenticity(a)`, `archetypeResonance(a)`, `symbolDensity(a)`, `ritualCoherence(a)`, `aestheticConsistency(a)`, `transmissionFidelity(a)`
    - _Requirements: 3.8, 3.10, 3.11_

  - [ ]* 3.16 Write tests for Culture stratum axes
    - Create `tests/contracts/culture.test.ts`
    - _Requirements: 3.12_

  - [ ] 3.17 Expand `src/lib/contracts/strata/mind.ts` (Possibility) with named axis exports
    - Add: `branchReachability(a)`, `outcomeVariance(a)`, `agencyScore(a)`, `reversibilityIndex(a)`, `emergenceCoefficient(a)`, `decisionDepth(a)`
    - _Requirements: 3.9, 3.10, 3.11_

  - [ ]* 3.18 Write tests for Mind/Possibility stratum axes
    - Create `tests/contracts/mind.test.ts`
    - _Requirements: 3.12_

- [ ] 4. Checkpoint Wave 1 — Ensure all tests pass, ask the user if questions arise.


---

### Wave 2 — Stratum Conformance Index · Tier-1 Wiring · Evasion Elimination

- [ ] 5. Add `stratumConformanceIndex` and `stratumBreakdown` to `/api/substrate/health`
  - In `src/server/routes/substrate-health.ts`, extend the GET `/api/substrate/health` handler:
    1. After computing `predicateDemo`, compute `stratumConformanceIndex`: iterate `listContracts()`, for each contract run `runStratumPredicate(stratum, firstCuratedSeed)` for each declared stratum, count generators passing all their strata
    2. Build `stratumBreakdown` array: one entry per stratum with `{ stratum, passingGenerators, totalGenerators, conformanceScore, failingGeneratorIds, failingPredicateAxes }`
    3. Cache the SCI calculation for 30 seconds using the existing in-memory cache (key: `"sci-cache"`)
    4. Add `stratumConformanceIndex` and `stratumBreakdown` to the JSON response
    5. Ensure the endpoint responds within 5000ms (add a `Promise.race` with a 4500ms timeout that returns partial data)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.1 Write property test for SCI calculation consistency
    - Create `tests/contracts/sci.test.ts`
    - **Property 8: SCI calculation consistency** — for any set of registered generators, `stratumConformanceIndex` equals the fraction passing all declared strata predicates
    - **Validates: Requirements 4.2, 4.3**
    - _Requirements: 4.2_

- [ ] 6. Wire Tier-1 generators with `strata` declarations and `stratumScores` artifact output
  - [ ] 6.1 Update `QualityContract` interface in `src/lib/kernel/quality-contract.ts`
    - Add `StratumManifest` return type to `manifest()` method signature
    - Keep `strata` optional for now (will be required after sweep)
    - _Requirements: 5.1_

  - [ ] 6.2 Wire `friend` generator contract with strata and stratumScores
    - In the friend contract file, add `strata: ['Form', 'Mind', 'Culture'] as const`
    - In `synthesize()`, after building the artifact, call `runStratumPredicate` for each declared stratum and attach `stratumScores` to the returned artifact
    - Add `manifest()` returning `{ domain, version, strata, clauses, determinism: 'strict' }`
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [ ] 6.3 Wire `world` generator contract with strata and stratumScores
    - Add `strata: ['World', 'Time', 'Culture'] as const`; wire `stratumScores` in `synthesize()`; add `manifest()`
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [ ] 6.4 Wire `game` generator contract with strata and stratumScores
    - Add `strata: ['Mind', 'Story', 'Field'] as const`; wire `stratumScores`; add `manifest()`
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [ ] 6.5 Wire `music` generator contract with strata and stratumScores
    - Add `strata: ['Sound', 'Time'] as const`; wire `stratumScores`; add `manifest()`
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [ ] 6.6 Wire `character` generator contract with strata and stratumScores
    - Add `strata: ['Form', 'Motion', 'Culture'] as const`; wire `stratumScores`; add `manifest()`
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [ ] 6.7 Wire remaining 7 Tier-1 generators (`visual2d`, `sprite`, `narrative`, `audio`, `animation`, `shader`, `typography`)
    - For each: add `strata` declaration per the design table, wire `stratumScores` in `synthesize()`, add `manifest()`
    - If a declared stratum has no predicate, log a warning and set `stratumScores[stratum] = 0` (do not throw)
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7_

  - [ ]* 6.8 Write tests for Tier-1 stratum wiring
    - Create `tests/contracts/tier1-wiring.test.ts`
    - For each Tier-1 generator: call `synthesize(firstCuratedSeed)`, assert `artifact.stratumScores` is defined and all declared strata have scores in [0,1]
    - **Property 2: Stratum score range invariant**
    - **Validates: Requirements 5.3, 5.6**
    - _Requirements: 5.5_

  - [ ] 6.9 Verify `npm run quality:contract` reports ≥80% contracts conformant
    - Run `npm run quality:contract` and confirm ≥80% green
    - _Requirements: 5.5_


- [ ] 7. Eliminate `as any` evasion patterns in core domain files
  - [ ] 7.1 Fix `as any` patterns in `src/lib/kernel/gspl-bytecode.ts`
    - Define `type Operand = number | string | boolean | null | Operand[]` and `type Instruction = { op: string; operands: Operand[] }`
    - Replace all `as any` casts with proper typed alternatives; use type guards where needed
    - Run `npm run typecheck` after each batch of fixes to confirm 0 errors
    - _Requirements: 12.1, 12.4_

  - [ ] 7.2 Fix `as any` patterns in `src/lib/kernel/gspl-interpreter.ts`
    - Define `type StackValue = number | string | boolean | null | StackValue[]` and `interface ExecutionContext { stack: StackValue[]; env: Map<string, StackValue>; }`
    - Replace all `as any` casts; use discriminated unions for instruction dispatch
    - _Requirements: 12.1, 12.4_

  - [ ] 7.3 Fix `as any` patterns in `src/lib/kernel/quality-contract.ts`
    - Replace `globalThis as any` assignments with typed module augmentation using `declare global { var __PARADIGM_15_CONTRACTS__: ... }`
    - Replace `module as any` HMR check with a proper type guard
    - Remove the `// TODO: Phase 1 strict` comments as each pattern is fixed
    - _Requirements: 12.1, 12.4_

  - [ ] 7.4 Update `docs/waivers/registry.json` after evasion fixes
    - Remove waiver entries for patterns that have been fixed
    - For any remaining patterns that genuinely cannot be typed, add new waiver entries with sunset dates ≤6 months out and documented rationale
    - Confirm `npm run lint:no-evasion` reports 0 unwaived patterns
    - _Requirements: 12.2, 12.3, 12.6_

  - [ ]* 7.5 Write test confirming 0 unwaived evasion patterns
    - Create `tests/lint/no-evasion.test.ts` that runs `lint-no-evasion.ts` programmatically and asserts the unwaived count is 0
    - _Requirements: 12.1, 12.5_

- [ ] 8. Checkpoint Wave 2 — Ensure all tests pass, ask the user if questions arise.


---

### Wave 3 — Agent Reproducibility · `paradigm make` Hardening

- [ ] 9. Implement agent reproducibility harness
  - [ ] 9.1 Add `memory_hash` and `seed_corpus_hash` computation to the agent pipeline
    - In `src/lib/agent/` (the main pipeline entry point), add `computeMemoryHash(memoryState)` and `computeSeedCorpusHash(seeds)` using `createHash('sha256')` from Node `crypto` — never `Math.random` or wall-clock
    - Before executing any decision, log: `[reproducibility] intent="..." memory_hash="..." seed_corpus_hash="..."`
    - _Requirements: 6.5, 6.6_

  - [ ] 9.2 Create reproducibility fixture directory and five canonical fixture files
    - Create `tests/agent/reproducibility/` directory
    - Create five fixture files: `state-intent-to-first-artifact.json`, `friend-world-to-quest.json`, `quest-to-game.json`, `game-to-oracle-grade.json`, `seed-mutation-cycle.json`
    - Each fixture: `{ "intent": "...", "memory_hash": "...", "seed_corpus_hash": "...", "output_hash": "..." }`
    - Populate by running the pipeline once and recording the hashes
    - _Requirements: 6.2_

  - [ ] 9.3 Implement reproducibility test harness
    - Create `tests/agent/reproducibility/reproducibility.test.ts`
    - For each fixture file: load it, replay the agent pipeline with the same tuple, compute `sha256(JSON.stringify(output))`, assert it matches `output_hash`
    - If no fixture files exist, pass without error (bootstrap mode)
    - If two runs with the same tuple produce different hashes, report the divergence with both hashes and the step at which divergence occurred
    - **Property 3: Agent reproducibility round-trip** — for any recorded tuple, replay produces the same output hash
    - **Validates: Requirements 6.1, 6.3**
    - _Requirements: 6.1, 6.3, 6.4, 6.8_

  - [ ] 9.4 Wire reproducibility harness into CI `doctrine-gates` job
    - Add step to `.github/workflows/ci.yml` `doctrine-gates` job: `npx vitest run tests/agent/reproducibility/`
    - _Requirements: 6.4_

- [ ] 10. Harden `paradigm make` as the universal entry point
  - [ ] 10.1 Add `--strata`, `--reproduce`, `--seed`, `--output`, `--format` flags to `scripts/paradigm.ts`
    - Parse new flags in the `make` case using the existing args loop pattern
    - `--strata`: after artifact generation, print per-stratum conformance scores
    - `--reproduce <tuple>`: parse `intent|memory_hash|seed_corpus_hash` tuple, replay pipeline with recorded state
    - `--seed <hex>`: override the RNG seed used for generation
    - `--output <path>`: write artifact to specified path instead of `artifacts/`
    - `--format <json|gseed>`: output format (default: json)
    - _Requirements: 7.1, 7.3, 7.4_

  - [ ] 10.2 Add performance warning and `--help` text to `paradigm make`
    - Use `kernelNow()` to track elapsed time; at 30s (non-LLM) or 120s (LLM intent), log `[PERF WARNING] elapsed=<ms>ms` and continue
    - Implement `paradigm make --help` printing full syntax, all flags, and ≥5 usage examples
    - Ensure non-zero exit code on any failure condition
    - _Requirements: 7.2, 7.5, 7.7_

  - [ ] 10.3 Print reproducibility tuple in `paradigm make` output
    - After artifact generation, always print: `Reproducibility: intent="..." memory_hash="..." seed_corpus_hash="..."`
    - _Requirements: 7.1, 6.7_

  - [ ] 10.4 Write `docs/cli/paradigm-make.md`
    - Full syntax reference, all flags with descriptions, ≥5 usage examples, reproducibility section explaining the tuple format and `--reproduce` flag
    - _Requirements: 7.6_

  - [ ]* 10.5 Write integration test for `paradigm make` smoke
    - Create `tests/cli/paradigm-make.test.ts` that spawns `npx tsx scripts/paradigm.ts make "test intent" --domain music` and asserts: exit code 0, stdout contains "Reproducibility:", stdout contains "Stratum"
    - _Requirements: 7.1, 7.5, 7.8_

- [ ] 11. Checkpoint Wave 3 — Ensure all tests pass, ask the user if questions arise.


---

### Wave 4 — Corpus Generation · Flagship `.gseed` Files

- [ ] 12. Implement corpus generation script
  - [ ] 12.1 Create `scripts/generate-canonical-corpus.ts`
    - Parse `--count <N>` and `--rng-seed <hex>` flags
    - Initialize RNG: `rngFromHash(rngSeedArg || sha256("paradigm-canonical-corpus-v1"))`
    - For each seed i in 0..N: derive child RNG via `rngFromHash(parentSeed + i)`, generate GameSeed genes, call `growSeed()`, call `oracle.evaluate()`, compute `sha256(JSON.stringify(genes))` as seed hash
    - Write `golden/corpus/<hash>.json` manifest with: `seedHash`, `genes`, `oracleFitnessReport`, `stratumScores`, `generationTimestamp`, `rngSeed`
    - Print summary: total generated, passing (all oracle axes ≥0.5), failing, score distribution
    - Exit non-zero if total elapsed time exceeds 10 minutes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [ ] 12.2 Add `corpus:generate` npm script to `package.json`
    - `"corpus:generate": "npx tsx scripts/generate-canonical-corpus.ts"`
    - _Requirements: 8.1_

  - [ ] 12.3 Create `golden/corpus/README.md`
    - Describe corpus structure, oracle grading schema (FitnessReport axes), and instructions for extending the corpus
    - _Requirements: 8.10_

  - [ ]* 12.4 Write property test for corpus generation determinism
    - Create `tests/corpus/determinism.test.ts`
    - **Property 4: Corpus generation determinism** — running the generator twice with the same `--rng-seed` produces the same set of seed hashes in the same order
    - **Validates: Requirements 8.2, 8.5**
    - _Requirements: 8.5_

- [ ] 13. Generate 12 hero flagship `.gseed` files
  - [ ] 13.1 Create `scripts/generate-flagship-gseeds.ts`
    - Read `.paradigm/flagships/flagships.json`
    - For each flagship: derive deterministic RNG via `rngFromHash("flagship-" + id + "-v1")`, call `growSeed(genes, rng)`, run oracle and stratum predicates, build `GseedPackage` using `encodeGseed`, sign with a deterministic test key derived from `rngFromHash("paradigm-flagship-signing-key-v1")`, call `writeGseedFile(".paradigm/flagships/" + id + ".gseed", pkg)`
    - Write companion manifest `.paradigm/flagships/<id>.manifest.json` with: `id`, `seedHash`, `lineage: []`, `oracleFitnessReport`, `stratumScores`, `generationTimestamp`, `generatorVersion`
    - Log a warning (but continue) for any flagship scoring below 0.7 overall
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.8_

  - [ ] 13.2 Verify Aleph flagship exercises all 9 strata
    - After generation, assert `aleph.manifest.json` has non-zero `stratumScores` for all 9 strata: Form, Motion, Sound, World, Time, Field, Story, Culture, Mind
    - _Requirements: 9.5_

  - [ ] 13.3 Wire flagship seeds into `npm run golden:verify`
    - Update `scripts/replay.mts` (or the golden hash verification script) to include the 12 flagship `.gseed` files in the verified set
    - _Requirements: 9.7_

  - [ ] 13.4 Implement `paradigm make flagship:<id>` command
    - In `scripts/paradigm.ts`, add handling for `make flagship:<id>`: load `.paradigm/flagships/<id>.gseed` via `readGseedFile`, decode with `decodeGseed`, run the appropriate generator with the decoded params, print the artifact summary
    - _Requirements: 9.9_

  - [ ] 13.5 Create `docs/flagships/README.md`
    - Describe each of the 12 flagships: name, strata stress, theme, and forking instructions
    - _Requirements: 9.10_

  - [ ]* 13.6 Write property test for flagship oracle gate
    - Create `tests/flagships/oracle-gate.test.ts`
    - **Property 6: Flagship oracle gate** — for each of the 12 flagships, passing the seed through its generator and evaluating with the oracle produces FitnessReport overall score ≥ 0.7
    - **Validates: Requirements 9.6**
    - _Requirements: 9.6_

- [ ] 14. Checkpoint Wave 4 — Ensure all tests pass, ask the user if questions arise.


---

### Wave 5 — WCAG 2.2 AA · Onboarding Funnel · Studio First-Artifact Flow

- [ ] 15. WCAG 2.2 AA accessibility audit and remediation
  - [ ] 15.1 Audit `src/components/studio/PromptBar.tsx` and `src/pages/StudioPage.tsx`
    - Add `aria-label` to all `<button>` and `<input>` elements that lack visible label text
    - Add `alt` text to all `<img>` elements; add `aria-label` to all `<svg>` elements
    - Add `role="status"` and `aria-live="polite"` to the progress indicator
    - _Requirements: 10.4, 10.5_

  - [ ] 15.2 Audit remaining studio components for accessibility
    - Audit all files in `src/components/studio/`: `AgentPanel.tsx`, `GeneEditor.tsx`, `SeedLibrary.tsx`, `GalleryGrid.tsx`, `ExportPanel.tsx`, `MintPanel.tsx`, and all viewport components
    - Add missing `aria-label`, `tabIndex={0}`, and `onKeyDown` handlers to all custom interactive elements
    - Ensure all interactive elements are reachable via keyboard navigation with visible focus indicators (`:focus-visible` CSS)
    - _Requirements: 10.4, 10.7_

  - [ ] 15.3 Fix color contrast and motion issues
    - Audit color contrast ratios using axe-core; fix any element below 4.5:1 (normal text) or 3:1 (large text)
    - Wrap all CSS animations and transitions in `@media (prefers-reduced-motion: reduce)` checks
    - _Requirements: 10.6, 10.8_

  - [ ] 15.4 Ensure CLI output uses color as supplementary information only
    - Audit `scripts/paradigm.ts` output: every piece of information conveyed by ANSI color must also be conveyed in plain text (e.g., "✓ PASS" not just green text)
    - _Requirements: 10.3_

  - [ ] 15.5 Create `docs/accessibility/audit-report.md`
    - Document baseline audit results, known issues with remediation plans, and testing methodology (axe-core version, test date, scope)
    - _Requirements: 10.10_

  - [ ]* 15.6 Write automated accessibility test
    - Create `tests/a11y/studio.test.ts` using axe-core (or vitest-axe) to run against the Studio surface
    - Assert zero critical WCAG 2.2 AA violations
    - Add `test:a11y` npm script: `"test:a11y": "npx vitest run tests/a11y/"`
    - _Requirements: 10.1, 10.9_

- [ ] 16. Instrument onboarding funnel with timing checkpoints
  - [ ] 16.1 Add timing instrumentation to `src/pages/StudioPage.tsx`
    - Import `kernelNow` from `src/lib/kernel/clock.ts`
    - Add timing checkpoints using `kernelNow()` (never `Date.now()` or `performance.now()`): `pageLoadComplete` (useEffect on mount), `firstInteractiveElement` (when PromptBar mounts), `firstIntentSubmitted` (in submit handler), `agentPipelineStarted` (before API call), `artifactGenerationStarted` (on API response), `firstArtifactRendered` (in viewport onArtifactReady callback)
    - When `firstArtifactRendered` is set, compute total elapsed and log to observability layer; if elapsed > 60s, log warning with step-by-step breakdown
    - _Requirements: 11.1, 11.2, 11.5_

  - [ ] 16.2 Add `<ProgressIndicator>` component to Studio surface
    - Create `src/components/studio/ProgressIndicator.tsx` showing current pipeline stage
    - In `StudioPage.tsx`, set `isGenerating = true` synchronously on intent submit (before any async call) and render `<ProgressIndicator stage={currentStage} />`
    - _Requirements: 11.8, 13.2_

  - [ ]* 16.3 Write onboarding funnel integration test
    - Create `tests/onboarding/funnel.test.ts`
    - Simulate the new-user flow using jsdom/vitest: mount StudioPage, submit an intent, wait for artifact render
    - **Property 7: Onboarding timing bound** — assert total elapsed ≤ 60 seconds
    - **Validates: Requirements 11.3, 11.6**
    - _Requirements: 11.6, 11.7_

- [ ] 17. Harden Studio first-artifact flow
  - [ ] 17.1 Ensure CTA is visible on load and PromptBar has autoFocus
    - In `src/pages/StudioPage.tsx`, ensure the PromptBar is in the initial viewport (no scroll required)
    - Add `autoFocus` to the intent input element in `src/components/studio/PromptBar.tsx`
    - Add a prominent headline "What will you create?" visible within 10 seconds of page load
    - _Requirements: 13.1_

  - [ ] 17.2 Implement viewport auto-selection logic
    - In `StudioPage.tsx`, implement `selectViewport(artifact)` function that maps artifact type to viewport: mesh→3D, audio/stems→Audio, scenes→Game, svg→SVG, code→Code, simulation→Sim, frames→Animation, default→2D
    - Wire this to the CenterStage viewport selector
    - _Requirements: 13.4_

  - [ ] 17.3 Implement Fork button flow
    - In the artifact display area, add a "Fork" button that calls `growSeed(currentSeed, mutatedRng)` and opens the new seed for editing
    - Use `rngFromHash(currentSeed.$hash + "-fork-" + Date.now())` for the fork RNG (wall-clock is acceptable here as it's a user-triggered UI action, not a kernel path)
    - _Requirements: 13.6_

  - [ ] 17.4 Verify stratum scores display in AmbientStrip panel
    - Ensure `src/components/studio/` has an AmbientStrip component that displays `artifact.stratumScores` after artifact render
    - If AmbientStrip doesn't exist, create it as a horizontal bar showing per-stratum scores
    - _Requirements: 13.5_

  - [ ] 17.5 Verify responsive layout at 768px and 1024px breakpoints
    - Audit `StudioPage.tsx` CSS/Tailwind classes for responsive breakpoints
    - Ensure the layout is usable (no overflow, no hidden CTA) at `min-width: 768px` and `min-width: 1024px`
    - _Requirements: 13.7_

- [ ] 18. Checkpoint Wave 5 — Ensure all tests pass, ask the user if questions arise.


---

### Wave 6 — Final Verification Gate

- [ ] 19. Wire corpus regression gate into CI
  - In `.github/workflows/ci.yml` `doctrine-gates` job, add step:
    ```yaml
    - name: Corpus Regression Gate (hard gate)
      run: npx tsx scripts/golden-corpus-regression.ts --strict
      timeout-minutes: 5
    ```
  - Verify `scripts/golden-corpus-regression.ts` auto-discovers all `golden/corpus/*.json` files without manual configuration
  - Verify the script exits non-zero on any hash mismatch and reports: `MISMATCH seed=<hash> expected=<hash> actual=<hash>`
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ]* 19.1 Write property test for corpus regression completeness
    - Create `tests/corpus/regression.test.ts`
    - **Property 5: Corpus regression completeness** — for any seed manifest in `golden/corpus/`, regenerating the artifact produces the same hash as stored (when no code changes have been made)
    - **Validates: Requirements 14.2, 14.3**
    - _Requirements: 14.2_

- [ ] 20. Verify Phase 2 canonical collapse is complete
  - Run `npm run lint:canonical-rename` and confirm 0 unwaived versioned siblings (`-v2`, `-v3`, `-enhanced`, `-gpu`) in `src/lib/kernel/generators/`
  - Run `npm run golden:verify` and confirm all hashes pass
  - Confirm every generator in `src/lib/kernel/generators/` has exactly one entry in `src/lib/kernel/engines.ts`
  - If any unwaived siblings remain: fix them by merging features into the canonical file and deleting the sibling, then regenerate golden hashes with `npm run golden:write`
  - Update the `canonical-rename` CI gate threshold from 8 to 0
  - Create `docs/phase2-closure.md` with evidence: lint output, golden verify output, engines.ts entry count
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 21. Final verification — run all doctrine gates and confirm Phase 1 exit
  - Run the full doctrine gate suite locally:
    1. `npm run typecheck` → 0 errors
    2. `npm run determinism:check` → 0 violations
    3. `npm run lint:canonical-rename` → 0 unwaived
    4. `npm run lint:no-evasion` → 0 unwaived
    5. `npx vitest run tests/determinism/` → all pass
    6. `npx vitest run tests/composition/` → all pass
    7. `npm run golden:verify` → all hashes match
    8. `npx vitest run tests/contracts/` → all pass
    9. `npx tsx scripts/paradigm.ts make "a lone monk who paints with living sound" --domain music` → exit 0
  - Confirm `wc -l server.ts` ≤ 500
  - Confirm `/api/substrate/health` returns `stratumConformanceIndex` and `stratumBreakdown`
  - Confirm all 12 flagship `.gseed` files exist in `.paradigm/flagships/`
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each wave
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
- The Spine invariant (determinism, sovereignty, quality) must hold after every task: run `npm run typecheck && npm run determinism:check` before marking any task complete
- All timing in kernel paths must use `kernelNow()` from `src/lib/kernel/clock.ts` — never `Date.now()` or `performance.now()`

