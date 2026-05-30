# Paradigm Golden Corpus — 1M Seed/Artifact Corpus (Phase 3+ Foundation)

**Vision (Doctrine v2 Phase 3 and beyond):**  
A sovereign, reproducible, 1,000,000+ seed/artifact corpus that exercises every stratum, every major generator family, and every cross-stack path (TS + Python oracle/agent/composition/engines). This corpus becomes the permanent regression spine for determinism, quality, conformance, and reproducibility.

**Status (as of this wave):**  
- Phase 2 Golden Corpus Priorities — First Cohort CLOSED (sprite, particle, vehicle fully PINNED with live regression enforcement in preflight + dedicated harness).
- Executable capture + regression tooling live for the initial cohort.
- Python cross-stack bridge live (src/server/python/golden_corpus.py).
- This directory is the seed structure for the full 1M corpus.

**Directory Structure (proposed & growing):**
`
golden/corpus/
├── README.md                 # This file
├── pinned/                   # Officially pinned fixtures (JSON + metadata)
│   ├── sprite/
│   ├── particle/
│   ├── vehicle/
│   └── ...
├── generation/               # Scripts/notes for mass generation (GSPL templates, agent pipelines)
├── validation/               # Conformance, determinism, and stratum scoring harnesses
├── metadata/                 # Manifests, lineage, C2PA, strata coverage reports
└── index/                    # Searchable index (by strata, domain, conformance score, etc.)
`

**Integration Hooks (live and planned):**
- scripts/golden-corpus-regression.ts — Official CI-grade harness (JSON output, strict mode, exit codes). Currently validates the first cohort; designed to scale to 1M.
- scripts/preflight-report.ts — Now includes multi-family goldenCorpus gate with live comparison vs pinned fixtures.
- src/server/python/golden_corpus.py — Functional Python bridge that can invoke the TS regression harness and return structured results (extendable to native oracle calls).
- src/lib/kernel/engines.ts + src/server/python/ — Cross-stack enforcement points (CANONICAL_PRIMARY lists, predicate scoring, manifest enrichment).
- Future: Direct integration into paradigm make, agent pipelines, and continuous corpus expansion (target: 1M distinct, high-conformance artifacts).

**Expansion Plan:**
- Add every new PINNED family to the harness and preflight gate.
- Generate at scale using paradigm make + SovereignAgent + reproducibility harness.
- Score every artifact with the full 9-stratum calculateStratumConformance + contract manifests.
- Maintain cryptographic lineage (C2PA) and sovereign signing.
- Use for:
  - Determinism boundary regression
  - Quality pass A/B/C
  - Cross-runtime golden matrix (Node/Bun/browser-Wasm)
  - Evolutionary pressure in the agent stack
  - Public corpus releases (Phase 14+)

**Current Cohort (Phase 2 closure):**
- sprite — PINNED (4 CURATED heroes, stable hashes, live enforcement)
- particle — PINNED (3 targets, consistent, live enforcement)
- vehicle — PINNED (3 targets, stabilized, live enforcement)

**Next Milestones (subsequent waves):**
- Pin additional families (typography, robotics, etc.)
- Begin actual pruning of remaining siblings
- Scale generation toward 1M (batch + agent-driven)
- Full CI integration of golden-corpus-regression.ts as blocking gate
- Python oracle/agent/composition full parity with TS conformance

This structure is sovereign-first, reproducible by design, and intended to become the permanent spine of the Paradigm corpus.

Run 
px tsx scripts/golden-corpus-regression.ts --json --strict to exercise the current cohort.
