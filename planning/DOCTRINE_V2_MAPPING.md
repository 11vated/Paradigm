# Doctrine v2 Mapping — Old 4-Phase Model to 24-Phase Canon

**Purpose:** Reconciliation document. Shows how the work shipped in v1.0.0 (Phases 0-4 of the old model) maps to the new 24-phase Doctrine v2 roadmap.

## High-Level Mapping

| Old Phase | Old Deliverables | Doctrine v2 Phase(s) | Status | Notes |
|-----------|------------------|----------------------|--------|-------|
| Phase 0 (Foundation) | Deterministic RNG, Universal Seed, basic generators | Phase 0 + early Phase 1 | Complete | Kernel invariants landed |
| Phase 1 | GSPL, 27 domains, contracts | Phase 1 + Phase 2 (partial) | Partial | Many contracts exist but lack full generics + strata |
| Phase 2 | Evolution suite, agent scaffolding | Phase 3-5 | Partial | Good foundation, missing reproducibility harness |
| Phase 3-4 | Studio surfaces, CLI, sovereignty | Phase 6-8 + Surface Doctrine | Partial | Studio works after isolation fixes; `paradigm make` missing |

## Detailed Reconciliation

See `13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md` Part VIII for the full 24-phase ordered list.

The work done in the "bug hunt" sessions (May 2026) that fixed the raw .ts 404s in the browser was **necessary infrastructure hygiene** to have a usable development environment. It is not counted as a numbered phase — it unblocked the real Phase 0-1 deliverables.

## Next Executable Items (as of this session)

1. Finish wiring the two new lints (`lint-canonical-rename`, `lint-no-evasion`) into package.json and CI.
2. Populate `waivers/registry.json` with the current intentional swallows from the isolation work.
3. Add `/api/substrate/health` endpoint returning the Phase 0 metrics.
4. Begin the QualityContract generics + strata sweep on the 27 domain contracts.
5. Server modular split (reduce server.ts size).

This document will be updated at the end of every major session until the 24-phase roadmap is complete.
