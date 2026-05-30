# Paradigm Infinite — 24-Phase Execution Plan

**Canonical governance:** Subordinated to `13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`.
**Exit gates:** Defined in `13b_Phase_Gates.md`. No phase is complete until its gates are green.
**Status:** Phases 0–4 complete (v1.0.0 shipped). Phase 0 (Doctrine Collapse) re-opened for this session.

---

## QUICK REFERENCE

```bash
# Every session starts with:
npm run typecheck          # 0 errors
npm run determinism:check  # 0 hard violations
npm run quality:contract   # ≥7/7 contracts green
npm run golden:verify      # 30/30 hashes match

# Phase 0 tools to build:
scripts/lint-canonical-rename.ts   # Enforce single canonical generator names
scripts/lint-no-evasion.ts         # Ban `as any`, `// @ts-ignore`, broad `catch` in kernel
docs/waivers/registry.json         # Append-only, sunset-dated waiver registry
docs/if-we-vanish.md               # Fork pledge, bus factor protocol
planning/DOCTRINE_V2_MAPPING.md    # Maps old 4-phase model to 24-phase doctrine
```

---

## EPOCH I: FOUNDATION COLLAPSE (~6 weeks)
*Replace the old planning model with the new canon. Ship the scaffolding the remaining 20 phases rest on.*

### Phase 0 — Doctrine Collapse (Session)
**Exit gates** (13b_Phase_Gates.md §Phase 0):
1. `13_*.md` + `13b_*.md` committed and referenced from AGENTS.md + README
2. `planning/DOCTRINE_V2_MAPPING.md` reconciles old 4-phase model with 24-phase doctrine
3. `scripts/lint-canonical-rename.ts` + `scripts/lint-no-evasion.ts` exist, wired to `package.json`, run clean
4. `docs/waivers/registry.json` exists with initial intentional swallows
5. `docs/if-we-vanish.md` exists, referenced from AGENTS.md
6. `/api/substrate/health` returns Phase 0 metrics (determinism=0, @ts-nocheck=0, waiver registry valid)
7. Phase 1 starting points concrete (`paradigm make`, QualityContract sweep, agent reproducibility)

**Deliverables:**
| Item | File | Day |
|------|------|:---:|
| Doctrine docs landed | `13_*.md`, `13b_*.md` | 0 |
| Mapping doc | `planning/DOCTRINE_V2_MAPPING.md` | 1 |
| Canonical rename lint | `scripts/lint-canonical-rename.ts` | 1 |
| No-evasion lint | `scripts/lint-no-evasion.ts` | 1 |
| Waiver registry | `docs/waivers/registry.json` | 1 |
| If-we-vanish | `docs/if-we-vanish.md` | 2 |
| Health endpoint | `/api/substrate/health` | 2 |
| GSPL interpreter fix | `src/lib/gspl/interpreter.ts` | 2–5 |
| Server modular split | `src/server/*.ts` (3.5K→~500 lines) | 3–5 |
| Quality contract sweep | `src/lib/kernel/generators/*-contract.ts` (7→13+) | 4–6 |
| Strata predicate wiring | `src/lib/kernel/quality/predicates.ts` → tests | 5–6 |

---

### Phase 1 — Server / Type / Determinism Cleanup
**Exit gates:**
- 0 `@ts-nocheck` in `src/`
- `lint:no-evasion` reports 0 unwaived `as any` / broad-catch / `// @ts-ignore` in domain code
- All 8 pre-flight gates green (determinism, canonical-rename, no-evasion, typecheck:strict, test:determinism, test:composition, test:golden-hash, test:stratum-contracts)
- `server.ts` ≤500 lines or modular split complete
- `QualityContract<TSeed, TArtifact, TGenes>` + `strata` + `manifest()` applied to ≥50% of registered contracts

**Workstreams:**
1. **Server split** — `src/server/routes/*`, `middleware/*`, `api-types.ts` — 3,500→~500 LOC
2. **Type strictness** — Remove all `@ts-nocheck`, enforce `strict: true` in tsconfig
3. **8 pre-flight gates** — Wire all into CI as blocking checks
4. **QualityContract generics** — Refactor the contract system to typed generics, add `strata` field and `manifest()` to every contract

---

### Phase 2 — Canonical Generator Collapse
**Exit gates:**
- 0 versioned siblings (`-v2`, `-v3`, `-enhanced`, `-gpu`) in `src/lib/kernel/generators/`
- `09_Canonical_Rename_Audit_Catalog.md` (or successor) closed with all 24+ pairs resolved
- Music + Sprite canonical renames have dedicated PRs with golden-hash regeneration
- Every generator declares exactly one canonical entry point in `engines.ts` / domain config

**Workstreams:**
1. **Audit all generator versioning** — Find every `-v2`, `-v3`, `-enhanced`, `-gpu` sibling
2. **Collapse to canonical** — Merge features into single file, delete siblings
3. **Regenerate golden hashes** — Update `golden.json` for every affected generator
4. **Update domain config** — Single entry point per generator in `engines.ts`

---

### Phase 3 — Stratum Contract Specification
**Exit gates:**
- All 9 stratum contracts (`src/lib/contracts/{form,motion,sound,...}.ts`) have real, executable predicate bodies
- Every Tier-1 and Tier-2 generator imports its applicable contracts and returns typed stratum artifacts
- Stratum Conformance Index ≥99.5% on curated regression set
- `tests/contracts/` has ≥1 test per predicate

**The 9 Strata:**

| Stratum | Contract File | Current Predicates | Target Predicates |
|---------|--------------|--------------------|-------------------|
| Form | `contracts/form.ts` | formPredicate | 8+ |
| Motion | `contracts/motion.ts` | motionPredicate | 6+ |
| Sound | `contracts/sound.ts` | soundPredicate | 9+ (add LUFS) |
| Space | `contracts/space.ts` | spacePredicate | 6+ |
| Time | `contracts/time.ts` | timePredicate | 4→8+ (urgent) |
| Structure | `contracts/structure.ts` | structurePredicate | 6+ |
| Semantics | `contracts/semantics.ts` | semanticsPredicate | 5+ |
| Culture | `contracts/culture.ts` | culturePredicate | 5+ |
| Possibility | `contracts/possibility.ts` | possibilityPredicate | 5+ |

**Priority:** Time stratum has only 4 claiming contracts — needs expansion to 8+.

---

## EPOCH II: ORACLE & QUALITY (~6 weeks)
*Every generator earns its QualityContract. Golden hashes span all runtimes.*

### Phase 4 — Oracle & Quality Pass A
- Oracle regression suite covers every contract
- All generators hit ≥95% on their stratum contracts
- Cross-runtime golden-hash matrix: Bun reference + Node

### Phase 5 — Quality Pass B
- All generators hit ≥99.5% on stratum contracts
- Browser-Wasm runtime added to golden matrix

### Phase 6 — Quality Pass C
- Sandbox-Wasm runtime added to golden matrix
- Zero mismatches across all 4 runtimes on canonical corpus

### Phase 7 — Cross-Runtime Golden Matrix
- Full matrix automated in CI
- Mismatch = release blocker
- Canonical seed corpus expanded to 500+

### Phase 8 — Extended Quality & Edge Cases
- Edge-case seed corpus (extreme values, boundary conditions)
- Fuzz testing for determinism violations
- Performance regression benchmarks

---

## EPOCH III: AGENT STACK GA (~5 weeks)
*Every agent decision is reproducible. The universal entry point ships.*

### Phase 9 — Agent Reproducibility
- Every published agent decision reproducible from `(intent, memory_hash, seed_corpus_hash)`
- Reproducibility harness exists in CI
- Fixtures for all canonical user journeys captured and replayed

### Phase 10 — Agent Full Pipeline GA
- 6-stage pipeline + 8 sub-agents + 4-layer memory exercised end-to-end with deterministic memory hashing
- `paradigm make <intent>` — the universal entry point — ships
- LLM providers: gemma4:26b (reasoning) + qwen2.5-coder:14b (code) + llava (vision) + nomic-embed-text (embeddings)

---

## EPOCH IV: SURFACES GA (~6 weeks)
*Three surfaces go GA: Studio, Public, Maker CLI.*

### Phase 11 — Studio Surface GA
- Zero-onboarding: new user produces first artifact in <60 seconds
- Studio three-pane layout finalized (AmbientStrip, CenterStage, DomainCosmosOverlay)
- All 8 viewport types hardened (3D, 2D, SVG, Audio, Game, Code, Sim, Anim)
- DimensionalViewer 7D substrate renderer stabilized

### Phase 12 — Public Surface GA
- Public Site hero loop playable from homepage
- Conversion analytics instrumented
- WCAG 2.2 AA across all surfaces
- Mobile/tablet read+render parity for `.gseed` artifacts

### Phase 13 — Maker CLI GA
- `paradigm make <intent>` is documented, deterministic, CI-reproducible happy path
- 12+ CLI commands hardened: grow, mutate, breed, evolve, compose, gspl, play, verify, sign, export, vcs, server

---

## EPOCH V: CORPUS & FLAGSHIPS (~8 weeks)
*The Great Library: 1M games + 12 hero flagships.*

### Phase 14 — 1M Game Corpus
- Public, browsable, oracle-graded corpus of ≥1,000,000 distinct playable GameSeeds
- Batch generation script (`scripts/generate-canonical-corpus.ts`)
- Seed Commons CI validates every seed deterministically
- 500K curated (Phase 14) → 1M exhaustive (Phase 14b)

### Phase 15 — 12 Hero Flagships
All 12 flagship `.gseed` files exist, lineage-tracked, oracle-graded, with full manifests:

| # | Flagship | Strata Stress | Description |
|:-:|----------|:-------------:|-------------|
| 1 | Tidepool | Form, Space | Living ocean ecosystem |
| 2 | Threnody | Sound, Time | Procedural elegy, evolving |
| 3 | Cartograph | Space, Structure | Infinite atlas generator |
| 4 | Mycelium | Structure, Semantics | Distributed intelligence network |
| 5 | Masque | Culture, Semantics | Generative theater of masks |
| 6 | Chimaera | Form, Motion, Sound | Chimera breeding ground |
| 7 | Loom | Time, Structure | Timeline weaving game |
| 8 | Nomad | Space, Time, Culture | Wandering civilization sim |
| 9 | Witness | Semantics, Possibility | Alternate history engine |
| 10 | Kintsugi | Form, Culture | Broken-beauty ceramics |
| 11 | Vesper | Sound, Time, Possibility | Bell-toll prophecy engine |
| 12 | Aleph | ALL 9 | The Everything seed |

---

## EPOCH VI: FEDERATION & ECONOMICS (~8 weeks)
*Paradigm becomes a peer-to-peer substrate with sovereign economics.*

### Phase 16 — Federation v1
- Two independent Paradigm nodes perform signed seed exchange with no central server
- Lineage preserved across exchange
- Deterministic merge on identical sub-trees; explicit fork on divergence
- Cryptographic verification of signatures + Merkle inclusion in protocol

### Phase 17 — Economic Substrate: Licensing
- Universe licensing (typed tiers, one-time + lineage royalty share) enforceable
- Locally-signed royalty ledger MVP
- On-chain deployment (Phase 17b)

### Phase 18 — Economic Substrate: Royalties
- Royalties flow at arbitrary depth (Universe → Game → Mod → Modder's-Mod)
- Cut schedule cryptographically baked at fork time
- PARA token + SeedNFT integration

### Phase 19 — Economic Substrate: Civilizational Dividend
- Civilizational dividend (fraction of royalties → CivilizationSeed → periodic operator-weighted payouts)
- Transparently auditable
- Operator opt-out + surgical takedown protocol live and legally reviewed

---

## EPOCH VII: UNIVERSAL REACH & ENDGAME (~10 weeks)
*Paradigm reads any artifact and writes to any output. The OS shell boots.*

### Phase 20 — Universal Reach: Inverse Pipeline
- 15-modality inverse pipeline: image, audio, video, text, 3D, MIDI, code, game replay, sensor, genome, map, legal, cultural corpus, historical, mind transcript → canonical seeds
- Failure-mode UX: targeted questions, N candidate branches, typed refusal

### Phase 21 — Universal Reach: 20-Output Matrix
- 20-output forward render matrix GA
- Routing declared + tested in `src/lib/composition/output_routing.ts`

### Phase 22 — Endgame: OS Shell
- Standalone Wayland/Linux session where every window, app, action is a seed + kernel op
- Paradigm-as-OS prototype

### Phase 23 — Endgame: Recursive Closure
- Paradigm can build the next version of itself: kernel ops, engines, agent stack, marketplace, OS Shell — all expressed as `.gseed` compositions
- Recursive self-improvement protocol operational

### Phase ∞ — GSPL v∞
- Permanent research axis. No exit gate. The asymptote.

---

## RISK REGISTER

| # | Risk | P | I | Mitigation |
|---|------|---|---|------------|
| R1 | GSPL interpreter fix uncovers deeper kernel issues | M | H | Gate Phase 0 exit on 0 failing tests; defer kernel rewrites to Phase 1 |
| R2 | Server split breaks existing API surface | M | H | Integration test suite must pass before split is merged; feature-flag old paths |
| R3 | QualityContract generics refactor too abstract | M | M | Prototype on 1 contract first; accept simpler interface if generics cause TS complexity |
| R4 | 9-stratum predicate wiring reveals missing contracts | H | M | Prioritize Time stratum (only 4 claiming contracts); accept 7/9 for Phase 3 exit |
| R5 | Local LLM stack insufficient for agent reproducibility | M | H | Deterministic fallback: pattern-match + template agent without LLM; gemma4:26b is our top |
| R6 | Canonical generator collapse breaks golden hashes | H | M | Regenerate all golden hashes in the same PR; verify cross-platform before merge |
| R7 | 1M game corpus exceeds storage/compute budget | M | M | Generate on-demand; store manifests only; cache artifacts by hash |
| R8 | Federation protocol design unresolved | M | H | Start Phase 16 with simple HTTP exchange; upgrade to libp2p/DHT later |
| R9 | Economic substrate legal uncertainty | L | H | Phase 2 ledger is locally-signed only; legal review before Phase 17 on-chain deploy |
| R10 | OS Shell requires low-level systems work beyond TypeScript | H | M | Rust/WASI for OS Shell (Phase 22); kernel remains TypeScript |

---

## SPINE (NEVER BREAK)

1. **Determinism** — Same seed + same RNG = bit-identical artifact. Forever. Across machines, decades, civilizations.
2. **Sovereignty** — No central server required. Kernel runs offline. Forking is a first-class right.
3. **Quality** — Every generator has a measurable contract. Strata are not aspirations; they are predicates.

**Enforced by:** `npm run determinism:check`, `npm run quality:contract`, `npm run golden:verify`, CI gates.

---

## COMMANDS CHEAT SHEET

```bash
# Core verification
npm run typecheck                      # 0 errors required
npm run determinism:check              # 0 hard violations
npm run quality:contract               # all contracts green
npm run golden:verify                  # all hashes match

# Phase-specific
npm run lint:canonical-rename          # Phase 0 / Phase 2
npm run lint:no-evasion                # Phase 1
npm run test -- tests/determinism      # Phase 1
npm run test -- tests/contracts        # Phase 3
npm run test -- tests/agent            # Phase 9-10
npm run corpus:generate                # Phase 14
npm run federation:test                # Phase 16

# Development
npm run dev                            # Start dev server
npm run build                          # Production build
npm run test                           # Full test suite
npm run golden:write                   # Regenerate golden hashes
```

---

## FILE LOCATIONS CHEAT SHEET

| Concern | Path |
|---------|------|
| Doctrine v2 | `Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md` |
| Phase gates | `Documents/Paradigm-Analysis/13b_Phase_Gates.md` |
| This plan | `Documents/Paradigm-Analysis/14_PARADIGM_INFINITE_EXECUTION_PLAN.md` |
| Waiver registry | `docs/waivers/registry.json` |
| If-we-vanish | `docs/if-we-vanish.md` |
| Doctrine mapping | `planning/DOCTRINE_V2_MAPPING.md` |
| Stratum predicates | `src/lib/kernel/quality/predicates.ts` |
| Stratum tests | `src/lib/kernel/quality/predicates.test.ts` |
| GSPL interpreter | `src/lib/gspl/interpreter.ts` |
| Server monolith | `src/server.ts` |
| Domain config | `src/lib/kernel/engines.ts` |
| Generators (196) | `src/lib/kernel/generators/*.ts` |
| Quality contracts | `src/lib/kernel/generators/*-contract.ts` |
| Composition functors | `src/lib/kernel/composition.ts` |
| Agent pipeline | `src/lib/intelligence/` |
| Seed commons | `data/commons/` |
| Smart contracts | `contracts/` |
| Task tracker | `planning/TASK_TRACKER.md` |

---

*Governed by Doctrine v2. Exit gates per `13b_Phase_Gates.md`. Subordinate planning docs in `planning/` remain valuable execution history.*
