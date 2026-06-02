# Requirements Document

## Introduction

Paradigm Absolute is a deterministic synthetic evolution operating system governed by Doctrine v2 (`13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`). The platform is at Phase 0–1 of a 24-phase roadmap. Phase 0 is closed; Phase 1 is substantially advanced but not yet gated. This spec covers all work required to close Phase 1 and advance through Phase 15, as defined by the canonical exit gates in `13b_Phase_Gates.md` and the execution plan in `14_PARADIGM_INFINITE_EXECUTION_PLAN.md`.

The Spine — determinism, sovereignty, quality — must never be broken. Every requirement in this document is subordinated to that invariant.

**Scope:** Phases 1–15 (Epochs I–V). Phases 16–23 (Federation, Economics, Universal Reach, OS Shell) are out of scope for this spec.

**Current verified state at spec creation:**
- 0 TypeScript errors, 0 determinism violations
- 1512/1512 tests, 38/38 golden hashes, 12/12 quality contracts
- `server.ts` is 630 LOC (gate requires ≤500)
- 9 stratum contracts exist but need expanded predicates
- No versioned generator siblings (Phase 2 substantially done)
- CI `doctrine-gates` job exists; evasion threshold needs progressive tightening to 0
- `paradigm make` CLI exists but needs full strata-aware output + reproducibility harness
- 12 flagship seeds defined in `.paradigm/flagships/flagships.json` but not yet as `.gseed` files
- No corpus generation script producing large-scale GameSeeds

---

## Glossary

- **Spine**: The three non-negotiable invariants: determinism, sovereignty, quality. Defined in Doctrine v2 Part IX.
- **Stratum / Strata**: The nine orthogonal dimensions of creative output — Form, Motion, Sound, Space, Time, Structure, Semantics, Culture, Possibility — that every generator artifact is scored against.
- **Stratum Contract**: A TypeScript module in `src/lib/contracts/strata/` that defines executable predicate axes for one stratum.
- **Predicate Axis**: A single measurable, executable scoring function within a stratum contract (e.g., `symmetryScore`, `rhythmicDensity`).
- **QualityContract**: The generic TypeScript interface `QualityContract<TSeed, TArtifact, TGenes>` that every generator must implement, including `strata` declarations and a `manifest()` method.
- **Stratum Conformance Index (SCI)**: The live aggregate score (0–1) measuring how many generators pass all their declared stratum predicates, reported on `/api/substrate/health`.
- **Tier-1 Generator**: A generator that is directly invoked by the flagship seed pipeline and must return typed stratum artifacts.
- **Flagship**: One of the 12 hero `.gseed` binary files (Tidepool through Aleph) that demonstrate the full platform capability.
- **GameSeed**: A deterministic seed that produces a playable game artifact when passed through the game generator pipeline.
- **Oracle**: The evaluation subsystem (`src/lib/game/oracle.ts`) that grades a GameSeed artifact on a 5-axis FitnessReport.
- **Agent Reproducibility Harness**: The test infrastructure that proves every agent decision can be replayed from the tuple `(intent, memory_hash, seed_corpus_hash)`.
- **`paradigm make`**: The universal CLI entry point (`paradigm make <intent>`) that exercises the full agent pipeline and reports strata conformance.
- **Doctrine Gates**: The 8 pre-flight checks wired as hard blockers in `.github/workflows/ci.yml` under the `doctrine-gates` job.
- **Evasion Pattern**: A TypeScript anti-pattern (`as any`, `// @ts-ignore`, broad `catch (e) {}`) tracked by `lint-no-evasion.ts`.
- **Waiver**: A time-bounded exception in `docs/waivers/registry.json` that allows a known evasion pattern to pass CI until its sunset date.
- **GSPL**: Generative Seed Programming Language — the kernel language whose every program is a typed seed.
- **`.gseed`**: The binary file format for a serialized, signed, lineage-tracked seed.
- **Corpus**: The collection of generated GameSeeds, stored in `golden/corpus/`, used for regression and oracle grading.
- **WCAG 2.2 AA**: Web Content Accessibility Guidelines version 2.2, Level AA — the accessibility standard all Paradigm surfaces must meet.
- **Onboarding Funnel**: The instrumented sequence of UI steps from first page load to first artifact produced, with timing checkpoints.
- **Server_Router**: The Express server module after extraction of inline route handlers into `src/server/routes/`.
- **CI_Pipeline**: The GitHub Actions workflow defined in `.github/workflows/ci.yml`.
- **Substrate_Health**: The `/api/substrate/health` endpoint that reports live platform metrics including SCI, determinism violations, and gate statuses.

---

## Requirements

### Requirement 1: Server Modular Split

**User Story:** As a platform engineer, I want `server.ts` to be ≤500 lines with all inline route handlers extracted to `src/server/routes/`, so that the file is maintainable and the Phase 1 exit gate is satisfied.

#### Acceptance Criteria

1. WHEN the server modular split is complete, THE Server_Router SHALL contain ≤500 lines of code as measured by `wc -l server.ts`.
2. THE Server_Router SHALL delegate all route handling to modules under `src/server/routes/` using the `register*Routes(app)` pattern already established in the codebase.
3. WHEN a route handler is extracted, THE extracted module SHALL preserve the exact request/response contract (HTTP method, path, request body schema, response shape) of the original inline handler.
4. WHEN `npm run typecheck` is executed after the split, THE TypeScript_Compiler SHALL report 0 errors.
5. WHEN `npm test` is executed after the split, THE Test_Suite SHALL report all previously passing tests as still passing with no regressions.
6. THE Server_Router SHALL retain the server bootstrap logic (port binding, middleware registration, WebSocket upgrade) in `server.ts` itself; only route handler bodies are extracted.
7. IF a route handler references a module that is not yet imported in the target routes file, THEN THE extracted module SHALL add the required import without introducing circular dependencies.

---

### Requirement 2: CI Doctrine Gates Hardening

**User Story:** As a platform engineer, I want all 8 doctrine pre-flight gates wired as hard blockers in CI with correct thresholds, so that no PR can merge that violates the Spine invariants.

#### Acceptance Criteria

1. THE CI_Pipeline SHALL contain a `doctrine-gates` job that runs all 8 pre-flight checks as blocking steps: `determinism`, `canonical-rename`, `no-evasion`, `typecheck:strict`, `test:determinism`, `test:composition`, `test:golden-hash`, and `test:stratum-contracts`.
2. WHEN the `no-evasion` gate runs, THE CI_Pipeline SHALL pass `--max-unwaived 0` to `lint-no-evasion.ts` after all batch waivers have been subtracted, so that any new unwaived evasion pattern causes a hard failure.
3. WHEN a waiver in `docs/waivers/registry.json` has a `sunset` date that has passed, THE CI_Pipeline SHALL fail the `no-evasion` gate and report the expired waiver ID.
4. WHEN the `determinism` gate runs, THE CI_Pipeline SHALL invoke `npm run determinism:check`, parse the command output for reported violations, and fail the gate if any hard violation is reported in the output regardless of the command's exit code.
5. WHEN the `typecheck:strict` gate runs, THE CI_Pipeline SHALL invoke `npx tsc --noEmit` and fail if any TypeScript error is reported.
6. WHEN the `test:golden-hash` gate runs, THE CI_Pipeline SHALL invoke `npm run golden:verify` and fail if any hash mismatch is detected.
7. WHEN the `test:stratum-contracts` gate runs, THE CI_Pipeline SHALL invoke `npm run test -- tests/contracts` and fail if any contract test fails.
8. THE CI_Pipeline SHALL run the `doctrine-gates` job on every pull request targeting `main` and on every push to `main`.
9. IF any single gate in the `doctrine-gates` job fails, THEN THE CI_Pipeline SHALL mark the entire job as failed and block merge.
10. THE CI_Pipeline SHALL also mark the `doctrine-gates` job as failed for infrastructure or setup failures (e.g., missing dependencies, environment misconfiguration) even when all individual gate checks would otherwise pass.

---

### Requirement 3: Stratum Predicate Expansion

**User Story:** As a platform engineer, I want all 9 stratum contracts to have ≥6 real, executable predicate axes each, so that the Stratum Conformance Index reflects genuine quality measurement rather than scaffolding.

#### Acceptance Criteria

1. THE Form_Contract SHALL define ≥6 executable predicate axes including at minimum: `symmetryScore`, `complexityScore`, `boundingBoxAspectRatio`, `vertexDensity`, `curvatureVariance`, and `topologicalGenus`.
2. THE Motion_Contract SHALL define ≥6 executable predicate axes including at minimum: `velocityMagnitude`, `accelerationSmoothness`, `trajectoryArcLength`, `periodicityScore`, `collisionResponseTime`, and `inertiaConsistency`.
3. THE Sound_Contract SHALL define ≥6 executable predicate axes including at minimum: `lufsIntegratedLoudness`, `spectralCentroid`, `dynamicRange`, `rhythmicDensity`, `harmonicComplexity`, and `onsetStrength`.
4. THE Space_Contract SHALL define ≥6 executable predicate axes including at minimum: `spatialExtent`, `densityDistribution`, `navigationConnectivity`, `landmarkVisibility`, `biomeCoherence`, and `altitudeVariance`.
5. THE Time_Contract SHALL define ≥6 executable predicate axes including at minimum: `temporalResolution`, `causalConsistency`, `branchingFactor`, `epochDuration`, `eventDensity`, and `narrativeVelocity`.
6. THE Structure_Contract SHALL define ≥6 executable predicate axes including at minimum: `hierarchyDepth`, `nodeConnectivity`, `modularity`, `redundancy`, `loadBalanceScore`, and `interfaceCohesion`.
7. THE Semantics_Contract SHALL define ≥6 executable predicate axes including at minimum: `conceptualCoherence`, `lexicalDiversity`, `narrativeConsistency`, `intentAlignment`, `ambiguityScore`, and `referentialIntegrity`.
8. THE Culture_Contract SHALL define ≥6 executable predicate axes including at minimum: `culturalAuthenticity`, `archetypeResonance`, `symbolDensity`, `ritualCoherence`, `aestheticConsistency`, and `transmissionFidelity`.
9. THE Possibility_Contract SHALL define ≥6 executable predicate axes including at minimum: `branchReachability`, `outcomeVariance`, `agencyScore`, `reversibilityIndex`, `emergenceCoefficient`, and `decisionDepth`.
10. WHEN a predicate axis function is called with a valid artifact, THE predicate SHALL return a numeric score in the range [0, 1] without throwing an exception.
11. WHEN a predicate axis function is called with a null or undefined artifact, THE predicate SHALL return 0 without throwing an exception.
12. THE `tests/contracts/` directory SHALL contain ≥1 automated test per predicate axis across all 9 stratum contracts.

---

### Requirement 4: Stratum Conformance Index

**User Story:** As a platform operator, I want a live Stratum Conformance Index on `/api/substrate/health`, so that I can monitor the real-time quality posture of the platform.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/substrate/health`, THE Substrate_Health endpoint SHALL return a JSON response containing a `stratumConformanceIndex` field with a numeric value in the range [0, 1].
2. THE `stratumConformanceIndex` SHALL be calculated as the fraction of all registered generators that pass all of their declared stratum predicate axes on their curated seed set.
3. WHEN a GET request is made to `/api/substrate/health`, THE Substrate_Health endpoint SHALL return a `stratumBreakdown` object containing one entry per stratum with the stratum name, passing generator count, total generator count, and per-stratum conformance score.
4. WHEN a GET request is made to `/api/substrate/health`, THE Substrate_Health endpoint SHALL return the response within 5000 milliseconds.
5. WHEN a generator fails one or more predicate axes, THE `stratumBreakdown` entry for the affected stratum SHALL list both the failing generator IDs and the names of the failing predicate axes together in the same entry.
6. THE Substrate_Health endpoint SHALL also return `deterministicViolations`, `tsErrors`, `unwaived EvasionCount`, `goldenHashStatus`, and `testSuiteStatus` fields consistent with the existing health surface implementation.
7. WHEN `paradigm make <intent>` is executed, THE CLI SHALL print whichever of the `stratumConformanceIndex` and per-stratum summary values are available, and SHALL not fail if only partial data can be obtained.

---

### Requirement 5: Tier-1 Generator Stratum Wiring

**User Story:** As a platform engineer, I want every Tier-1 generator to import its applicable stratum contracts and return typed stratum artifacts, so that the quality measurement system has real data to score.

#### Acceptance Criteria

1. THE QualityContract_Interface SHALL be defined as `QualityContract<TSeed, TArtifact, TGenes>` with a `strata` field declaring which of the 9 strata the generator participates in, and a `manifest()` method returning a `StratumManifest` object.
2. THE QualityContract_Interface SHALL be applied to ≥80% of all registered generator contracts in `src/lib/kernel/generators/`.
3. WHEN a Tier-1 generator produces an artifact, THE artifact SHALL be typed as a stratum artifact (e.g., `FormArtifact`, `SoundArtifact`) that includes a `stratumScores` field populated by the applicable predicate axes.
4. THE following generators SHALL be wired as Tier-1 with full stratum artifact typing: `friend`, `world`, `game`, `music`, `character`, `visual2d`, `sprite`, `narrative`, `audio`, `animation`, `shader`, and `typography`.
5. WHEN `npm run quality:contract` is executed, THE Quality_Contract_Reporter SHALL report ≥80% of contracts as conformant (green).
6. WHEN a Tier-1 generator is called with a valid seed, THE generator SHALL populate `stratumScores` for every stratum declared in its `strata` field without throwing an exception.
7. IF a Tier-1 generator's `strata` field declares a stratum for which no predicate axes are defined, THEN THE Tier-1_Generator SHALL log a warning and return `stratumScores[stratum] = 0` rather than throwing an exception.

---

### Requirement 6: Agent Reproducibility Harness

**User Story:** As a platform engineer, I want every agent decision to be reproducible from the tuple `(intent, memory_hash, seed_corpus_hash)`, so that the agent pipeline satisfies the Spine determinism invariant.

#### Acceptance Criteria

1. THE Agent_Reproducibility_Harness SHALL prove that for any recorded `(intent, memory_hash, seed_corpus_hash)` tuple, replaying the agent pipeline with the same tuple produces a bit-identical decision output.
2. THE `tests/agent/reproducibility/` directory SHALL contain fixture files for all canonical user journeys: `state-intent-to-first-artifact`, `friend-world-to-quest`, `quest-to-game`, `game-to-oracle-grade`, and `seed-mutation-cycle`.
3. WHEN a reproducibility fixture is replayed, THE Agent_Reproducibility_Harness SHALL compare the replayed output hash against the recorded fixture hash and fail the test if they differ. WHILE no fixtures are present in `tests/agent/reproducibility/`, THE Agent_Reproducibility_Harness SHALL pass without error.
4. THE Agent_Reproducibility_Harness SHALL be wired into the CI `doctrine-gates` job as a blocking check.
5. WHEN the agent pipeline is invoked, THE Agent_Pipeline SHALL compute and log the `memory_hash` (a deterministic hash of the agent's memory state) and the `seed_corpus_hash` (a deterministic hash of the seed corpus used) alongside the intent.
6. THE `memory_hash` SHALL be computed using the same `rngFromHash` / SHA-256 mechanism used elsewhere in the kernel, not using `Math.random` or wall-clock time.
7. WHEN `paradigm make <intent>` is executed, THE CLI SHALL print the `(intent, memory_hash, seed_corpus_hash)` tuple so that the invocation is fully reproducible.
8. IF the agent pipeline produces a non-deterministic output (i.e., two runs with the same tuple produce different hashes), THEN THE Agent_Reproducibility_Harness SHALL report the divergence with the differing hashes and the step at which divergence occurred.

---

### Requirement 7: `paradigm make` Universal Entry Point

**User Story:** As a developer and operator, I want `paradigm make <intent>` to be the stable, documented, strata-aware, reproducibility-default universal entry point for the platform, so that any creative intent can be executed through a single command.

#### Acceptance Criteria

1. WHEN `paradigm make <intent>` is executed with a valid intent string, THE CLI SHALL invoke the full agent pipeline, produce a typed stratum artifact, and print a summary including the artifact type, stratum scores, and the reproducibility tuple `(intent, memory_hash, seed_corpus_hash)`.
2. WHEN `paradigm make --help` is executed, THE CLI SHALL print full help text including: command syntax, all supported intent formats, all flags (`--seed`, `--output`, `--format`, `--strata`, `--reproduce`), and at least 5 usage examples.
3. WHEN `paradigm make <intent> --reproduce <tuple>` is executed with a previously recorded tuple, THE CLI SHALL replay the agent pipeline with the recorded state and produce the same artifact as the original invocation.
4. WHEN `paradigm make <intent> --strata` is executed, THE CLI SHALL print the per-stratum conformance scores for the produced artifact in addition to the standard output.
5. WHEN `paradigm make <intent>` is executed in CI, THE CLI SHALL exit non-zero for any failure condition including stratum predicate failures, timeouts, invalid intents, and agent pipeline errors.
6. THE `paradigm make` command SHALL be documented in `docs/cli/paradigm-make.md` with full syntax reference, flag descriptions, examples, and a section on reproducibility.
7. WHEN `paradigm make <intent>` is executed and the elapsed time exceeds 30 seconds for a non-LLM intent or 120 seconds for an LLM intent, THE CLI SHALL log a performance warning with the elapsed time and continue execution to completion rather than hard-killing the process.
8. THE `paradigm make` command SHALL be wired into the CI `doctrine-gates` job as a smoke test that exercises the full agent pipeline with a canonical intent.

---

### Requirement 8: Corpus Generation Script

**User Story:** As a platform engineer, I want a batch corpus generation script that produces N distinct, oracle-graded GameSeeds, so that the platform has a verifiable regression corpus and the foundation for the 1M-game library.

#### Acceptance Criteria

1. THE Corpus_Generator SHALL be implemented as `scripts/generate-canonical-corpus.ts` and invoked via `npm run corpus:generate`.
2. WHEN `npm run corpus:generate -- --count <N>` is executed, THE Corpus_Generator SHALL produce exactly N distinct GameSeed artifacts, where "distinct" means no two seeds share the same `$hash` value.
3. WHEN the Corpus_Generator produces a GameSeed, THE Corpus_Generator SHALL invoke the Oracle (`src/lib/game/oracle.ts`) to grade the seed and attach the resulting `FitnessReport` to the seed's manifest.
4. THE Corpus_Generator SHALL write each generated seed's manifest (seed hash, genes summary, oracle FitnessReport, stratum scores, generation timestamp) to `golden/corpus/<seed-hash>.json`.
5. WHEN `npm run corpus:generate` is executed with the same RNG seed, THE Corpus_Generator SHALL produce the same set of GameSeeds in the same order (deterministic corpus generation).
6. THE Corpus_Generator SHALL accept a `--rng-seed <hex>` flag to specify the initial RNG state; if omitted, a default canonical seed SHALL be used.
7. WHEN a generated GameSeed fails oracle grading (FitnessReport score < 0.5 on any axis), THE Corpus_Generator SHALL log the failure with the seed hash and the failing axis, but SHALL continue generating remaining seeds.
8. WHEN `npm run corpus:generate -- --count 1000` is executed, THE Corpus_Generator SHALL complete within 10 minutes on a standard development machine; any execution exceeding 10 minutes SHALL be treated as a failure regardless of how many seeds were generated before the timeout.
9. THE Corpus_Generator SHALL output a summary report to stdout listing: total seeds generated, seeds passing all oracle axes, seeds failing at least one axis, and the distribution of oracle scores.
10. THE `golden/corpus/` directory SHALL contain a `README.md` describing the corpus structure, the oracle grading schema, and instructions for extending the corpus.

---

### Requirement 9: 12 Hero Flagship `.gseed` Files

**User Story:** As a platform curator, I want all 12 hero flagship seeds authored as `.gseed` binary files with oracle grades and full stratum manifests, so that the platform has a canonical demonstration corpus that exercises every stratum.

#### Acceptance Criteria

1. THE Flagship_Curator SHALL produce a `.gseed` binary file for each of the 12 flagships defined in `.paradigm/flagships/flagships.json`: Tidepool, Threnody, Cartograph, Mycelium, Masque, Chimaera, Loom, Nomad, Witness, Kintsugi, Vesper, and Aleph.
2. EACH flagship `.gseed` file SHALL be stored at `.paradigm/flagships/<id>.gseed` where `<id>` matches the `id` field in `flagships.json`.
3. WHEN a flagship `.gseed` file is loaded and its seed is passed through the appropriate generator, THE generator SHALL produce a deterministic artifact (same hash on every machine with the same Node.js version).
4. EACH flagship SHALL have a companion manifest file at `.paradigm/flagships/<id>.manifest.json` containing: seed hash, lineage (parent seed hashes if any), oracle FitnessReport, stratum scores for all declared strata, generation timestamp, and the generator version used.
5. THE Aleph flagship SHALL exercise all 9 strata and SHALL have non-zero stratum scores for Form, Motion, Sound, Space, Time, Structure, Semantics, Culture, and Possibility.
6. EACH flagship SHALL pass oracle grading with a FitnessReport overall score ≥ 0.7.
7. WHEN `npm run golden:verify` is executed, THE golden hash verification SHALL include the 12 flagship seeds as part of the verified set.
8. THE flagship `.gseed` files SHALL be lineage-tracked: each file SHALL contain a signed lineage chain that can be verified with `paradigm verify <file>`.
9. WHEN `paradigm make flagship:<id>` is executed, THE CLI SHALL load the corresponding `.gseed` file and render the artifact, demonstrating the full pipeline from seed to output.
10. THE `docs/flagships/` directory SHALL contain a `README.md` describing each flagship, its strata stress, its theme, and instructions for forking it.

---

### Requirement 10: WCAG 2.2 AA Accessibility

**User Story:** As a user with accessibility needs, I want all Paradigm surfaces to meet WCAG 2.2 AA standards, so that the platform is usable regardless of disability or assistive technology.

#### Acceptance Criteria

1. THE Studio_Surface SHALL pass an automated WCAG 2.2 AA audit with zero critical violations as measured by an automated accessibility testing tool (e.g., axe-core or Lighthouse accessibility audit).
2. THE Public_Surface SHALL pass an automated WCAG 2.2 AA audit with zero critical violations.
3. THE Maker_CLI output SHALL use ANSI color codes only as supplementary information, never as the sole means of conveying meaning, so that the CLI is usable in non-color terminals.
4. ALL interactive UI elements (buttons, inputs, sliders, dropdowns) in the Studio_Surface SHALL have accessible names (via `aria-label`, `aria-labelledby`, or visible label text) that describe their purpose.
5. ALL images and SVG artifacts rendered in the Studio_Surface SHALL have descriptive `alt` text or `aria-label` attributes.
6. THE Studio_Surface SHALL maintain a minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text, as defined by WCAG 2.2 Success Criterion 1.4.3.
7. ALL interactive elements in the Studio_Surface SHALL be reachable and operable via keyboard navigation alone, with visible focus indicators.
8. THE Studio_Surface SHALL not use motion or animation that cannot be disabled via the `prefers-reduced-motion` media query, in compliance with WCAG 2.2 Success Criterion 2.3.3.
9. WHEN an accessibility audit is run as part of CI, THE CI_Pipeline SHALL fail if any WCAG 2.2 AA critical violation is introduced by a PR.
10. THE `docs/accessibility/` directory SHALL contain an `audit-report.md` documenting the baseline audit results, known issues with remediation plans, and the testing methodology used.

---

### Requirement 11: Onboarding Funnel Instrumentation

**User Story:** As a product engineer, I want the new-user onboarding flow to be instrumented with timing checkpoints so that I can verify the "first artifact in <60 seconds" gate and identify bottlenecks.

#### Acceptance Criteria

1. THE Onboarding_Funnel SHALL be instrumented with timing checkpoints at: page load complete, first interactive element rendered, first intent submitted, agent pipeline started, artifact generation started, and first artifact rendered.
2. WHEN a new user completes the onboarding flow, THE Onboarding_Funnel SHALL record the elapsed time between page load and first artifact rendered, and log it to the platform's observability layer.
3. THE elapsed time from page load to first artifact rendered SHALL be ≤60 seconds for a new user on a standard broadband connection (≥10 Mbps download) with no prior session state.
4. WHEN the onboarding funnel timing exceeds 60 seconds, THE Onboarding_Funnel SHALL log a warning with the step-by-step timing breakdown so that the bottleneck can be identified.
5. THE timing instrumentation SHALL use `kernelNow()` from `src/lib/kernel/clock.ts` for all internal timing, never `Date.now()` or `performance.now()` directly, to maintain the determinism boundary.
6. THE Onboarding_Funnel SHALL include an automated integration test in `tests/onboarding/` that simulates the new-user flow and asserts that the total elapsed time is ≤60 seconds.
7. WHEN the onboarding funnel test is run in CI, THE CI_Pipeline SHALL fail if the measured elapsed time exceeds 60 seconds.
8. THE Studio_Surface SHALL display a progress indicator during artifact generation that shows which pipeline stage is currently executing, so that users understand the system is working.

---

### Requirement 12: Phase 1 Evasion Pattern Elimination

**User Story:** As a platform engineer, I want the `lint-no-evasion` gate to reach 0 unwaived evasion patterns in core domain code, so that the Phase 1 exit gate is fully satisfied.

#### Acceptance Criteria

1. WHEN `npm run lint:no-evasion` is executed, THE Evasion_Linter SHALL report 0 unwaived `as any`, `// @ts-ignore`, and broad `catch (e) {}` patterns in `src/lib/{kernel,gspl,evolution,composition,intelligence}`.
2. THE Evasion_Linter SHALL read `docs/waivers/registry.json` and subtract all valid, non-expired waiver counts from the total before computing the unwaived count.
3. WHEN a waiver entry in `docs/waivers/registry.json` has a `sunset` date that has passed, THE Evasion_Linter SHALL report the expired waiver as a violation and exit non-zero.
4. THE CI `doctrine-gates` job SHALL pass `--max-unwaived 0` to the Evasion_Linter after all batch waivers are subtracted.
5. WHEN a new evasion pattern is introduced in a PR and the net count of unwaived patterns increases compared to the base branch, THE CI_Pipeline SHALL fail the `no-evasion` gate and report the file, line number, and pattern type of the new violation. IF a PR adds patterns in some files while removing an equal or greater number in others such that the net count does not increase, THE CI_Pipeline SHALL not fail the gate on that basis alone.
6. THE `docs/waivers/registry.json` SHALL document the rationale and sunset date for every active waiver, with no waiver having a sunset date more than 6 months in the future.

---

### Requirement 13: Studio Surface — First Artifact Flow

**User Story:** As a new user, I want to produce my first artifact within 60 seconds of arriving at the Studio surface, so that I can immediately experience the platform's creative power.

#### Acceptance Criteria

1. WHEN a new user arrives at the Studio surface (`/studio`), THE Studio_Surface SHALL display a clear call-to-action that guides the user to enter a creative intent within 10 seconds of page load.
2. WHEN a user submits a creative intent, THE Studio_Surface SHALL display a progress indicator as soon as possible after submission; if the 500 millisecond target is missed, THE Studio_Surface SHALL still display the indicator rather than omitting it.
3. WHEN the agent pipeline completes, THE Studio_Surface SHALL render the produced artifact in the CenterStage viewport within 2 seconds of pipeline completion.
4. THE Studio_Surface SHALL support all 8 viewport types: 3D, 2D, SVG, Audio, Game, Code, Sim, and Animation, and SHALL automatically select the appropriate viewport based on the artifact type.
5. WHEN an artifact is rendered, THE Studio_Surface SHALL display the artifact's stratum scores in the AmbientStrip panel.
6. WHEN a user clicks "Fork" on a rendered artifact, THE Studio_Surface SHALL create a new seed derived from the current artifact's seed and open it for editing.
7. THE Studio_Surface SHALL be responsive and usable on screen widths ≥768px (tablet) and ≥1024px (desktop).

---

### Requirement 14: Canonical Corpus Regression Gate

**User Story:** As a platform engineer, I want the corpus regression harness to be wired into CI so that any change that breaks determinism for existing corpus seeds is caught before merge.

#### Acceptance Criteria

1. THE Corpus_Regression_Harness (`scripts/golden-corpus-regression.ts`) SHALL be invoked as part of the CI `doctrine-gates` job.
2. WHEN the Corpus_Regression_Harness runs, THE harness SHALL regenerate the artifacts for all seeds in `golden/corpus/` and compare their hashes against the stored manifests.
3. IF any regenerated artifact hash differs from the stored manifest hash, THEN THE Corpus_Regression_Harness SHALL continue checking all remaining seeds, collect all mismatches, and exit non-zero after completing the full analysis, reporting each mismatch with its seed hash, expected artifact hash, and actual artifact hash.
4. THE Corpus_Regression_Harness SHALL complete within 5 minutes for a corpus of up to 1000 seeds.
5. WHEN a new seed is added to the corpus via `npm run corpus:generate`, THE Corpus_Regression_Harness SHALL automatically include it in subsequent regression runs without manual configuration.

---

### Requirement 15: Phase 2 Generator Canonical Collapse (Verification)

**User Story:** As a platform engineer, I want to verify that Phase 2 (canonical generator collapse) is fully complete with no versioned siblings remaining, so that the Phase 2 exit gate can be formally closed.

#### Acceptance Criteria

1. WHEN `npm run lint:canonical-rename` is executed, THE Canonical_Rename_Linter SHALL report 0 unwaived versioned siblings (`-v2`, `-v3`, `-enhanced`, `-gpu`) in `src/lib/kernel/generators/`.
2. THE Canonical_Rename_Linter SHALL read `docs/waivers/registry.json` and skip any sibling group where all extra siblings are covered by valid, non-expired waivers.
3. WHEN `npm run golden:verify` is executed after the canonical collapse, THE golden hash verification SHALL pass for all generators that were renamed or consolidated.
4. EVERY generator in `src/lib/kernel/generators/` SHALL declare exactly one canonical entry point in `src/lib/kernel/engines.ts` or the domain configuration.

