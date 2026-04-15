# Paradigm GSPL Engine — Master Production Build Plan
**Sovereign Omni-Architect v4.0 Output · Reality-Grounded · 5T-Vision Aligned**

> **Document purpose.** This is the single authoritative planning document for the full production build of the Paradigm GSPL Engine — the sovereign, deterministic, seed-first creative operating system. It supersedes `Research_and_planning.txt` and `the roadmap research.txt`. Every claim in this plan has been verified against the actual source code in this repository as of 2026-04-14. Where prior docs were wrong, this document says so explicitly.
>
> **Audience.** The creator/inventor (non-developer) driving the build with AI assistants. Every task in this plan is sized to be executable by an AI agent given a single, scoped prompt and the relevant file paths.
>
> **Structure.** Follows the Sovereign Omni-Architect 5-part protocol: (1) Seed Analysis & Gap Fill, (2) Sovereign Architecture & Master Plan, (3) Detailed Implementation Blueprint, (4) Validation/Tests/Security/Sovereignty, (5) Evolution Paths & Cross-Invention Synergies.

---

## Table of Contents

1. **Part 1 — UniversalSeed Analysis & Live Gap Fill**
   1.1 What Paradigm actually is, grounded in source
   1.2 What the user is building it to become (the 5T vision)
   1.3 Ground-truth state vs prior-doc claims (verified contradictions)
   1.4 Live gap fill — the complete, deduplicated gap register
2. **Part 2 — Sovereign Architecture & Master Plan**
   2.1 The 7-layer sovereign architecture (with trust boundaries)
   2.2 Determinism guarantees and how to prove them
   2.3 Data flows and execution flows
   2.4 Sovereignty model (cryptographic, on-chain, provenance)
   2.5 Evolution roadmap — phases 0 through 7
3. **Part 3 — Detailed Implementation Blueprint**
   3.1 Phase 0 — Emergency stabilization (1–2 days)
   3.2 Phase 1 — Production hardening (Weeks 1–2)
   3.3 Phase 2 — Determinism & engine parity (Weeks 3–5)
   3.4 Phase 3 — Agent v2 full buildout (Weeks 6–10)
   3.5 Phase 4 — Sovereignty & on-chain (Weeks 11–13)
   3.6 Phase 5 — Studio & UX polish (Weeks 14–16)
   3.7 Phase 6 — Intelligence layer (Weeks 17–20)
   3.8 Phase 7 — Vision features (Weeks 21+)
   3.9 AI-executable task library (prompt templates)
4. **Part 4 — Validation, Tests, Edge Cases, Security, Sovereignty**
   4.1 Test pyramid & coverage targets
   4.2 Determinism verification harness
   4.3 Security audit plan
   4.4 Sovereignty verification plan
   4.5 Performance & load testing
   4.6 Observability
5. **Part 5 — Evolution Paths & Cross-Invention Synergies**
   5.1 Near-horizon evolution (12 months)
   5.2 Mid-horizon evolution (12–36 months)
   5.3 Long-horizon evolution (3–10 years; 5T framing)
   5.4 Cross-invention synergies
   5.5 Recursive self-improvement protocol
6. **Appendices**
   A. Ground-truth file inventory
   B. Every verified bug with exact file/line
   C. Every contradiction between prior docs and code
   D. Open decisions that need the user's call
   E. Glossary of GSPL terms

---

# Part 1 — UniversalSeed Analysis & Live Gap Fill

## 1.1 What Paradigm actually is (grounded in source)

Paradigm is a **sovereign, deterministic, seed-first creative platform** implemented as a single TypeScript/React monorepo that runs on Node 20+. It is substantially more built than the prior planning docs imply — and has several real defects they understate or get wrong.

Verified facts as of 2026-04-14 (file:line citations are real):

**Core runtime.** A single unified Express server, `server.ts` at repo root (1,695 LOC), boots the entire platform. It serves the React SPA, registers all `/api/*` REST routes, and upgrades `/ws/agent` to a custom RFC 6455 WebSocket for agent streaming. The Vite dev server is hot-mounted through Express in dev, and static assets are served from `dist/` in production. `package.json` confirms: `"dev": "tsx server.ts"`, `"start": "node server.ts"`, `"build": "vite build"`.

**Kernel.** `src/lib/kernel/` is real and substantial (≈ 2,387 LOC across 7 files).
- `rng.ts` (169 LOC) implements Blackman & Vigna's **xoshiro256\*\*** with SHA-256 → SplitMix64 seeding. Bit-identical across platforms.
- `gene_system.ts` implements all **17 gene types** with four operators each (`validate`, `mutate`, `crossover`, `distance`): scalar, categorical, vector, expression, struct, array, graph, topology, temporal, regulatory, field, symbolic, quantum, gematria, resonance, dimensional, sovereignty.
- `engines.ts` registers **27 distinct `growXxx` functions** (I counted them: character, sprite, music, visual2d, procedural, fullgame, animation, geometry3d, narrative, ui, physics, audio, ecosystem, game, alife, shader, particle, typography, architecture, vehicle, furniture, fashion, robotics, circuit, food, choreography, agent) plus a `growGeneric` fallback. Each function produces structurally distinct artifacts — the "sphere problem" feared by the prior docs does **not exist at the engine layer**. It exists at the *asset preview* layer (see below).
- `composition.ts` implements the functor registry, `findCompositionPath` (BFS over the adjacency list), and `composeSeed`. **This file contains a real determinism bug:** line 32 sets `seed.$fitness = { overall: 0.5 + Math.random() * 0.3 }`.
- `fitness.ts` implements per-domain fitness heuristics.

**GSPL language.** `src/lib/gspl/` (≈ 1,279 LOC) contains a real lexer, a recursive-descent parser that emits a proper AST, a tree-walking interpreter, and a compiler. This is **not regex dispatch** — the prior analysis was wrong to imply otherwise. The AST covers literals, identifiers, arrays, objects, binary/unary expressions, calls, member access, and index access; statements include `seed_decl`, `let_binding`, `fn_decl`, conditionals, loops, returns, expression statements.

**Agent.** `src/lib/agent/` (≈ 2,898 LOC across 8 files) is **not** a 600-line spec — it is **built**. It implements a tiered architecture with Tier 0 = deterministic kernel routing, Tier 1 = fast local model, Tier 2 = mid local model, Tier 3 = optional Gemini. `processAsync()` correctly awaits tool execution. An `inference` client reaches a llama.cpp-compatible server at `LLAMA_SERVER_URL`. The prior claim that "Agent v2 is 0% implemented" is obsolete. What *is* still missing is the fine-tuned model weights, the training data pipeline, and the 3-tier router as specified in `GSPL-AGENT-ARCHITECTURE.md`.

**QFT solvers.** `src/lib/qft/` (≈ 1,299 LOC across 6 files) are real numerical PDE solvers, not procedural approximations: EM (FDTD), Dirac (spinor evolution), QED coupling, QCD (SU(2) lattice gauge theory with Metropolis sampling), Gravity (BSSN-style), plus an orchestrating `engine.ts`. **Bug:** `qcd_solver.ts` lines 108–110 and 139 use `Math.random()`. This violates determinism and must be fixed.

**Sovereignty.** `src/lib/sovereignty/` contains an ECDSA P-256 signing module and a full `onchain.ts` (≈ 600 LOC) that wires up `ethers.js`, an ERC-721 contract ABI (`mint(to, tokenId, uri)`, `tokenURI`, `seedHash`), an IPFS/data-URI metadata pipeline, and a Sepolia RPC client. Mainnet is unconfigured; gas costs cited in prior docs ("$200+/mint during peak") are a Sepolia-era approximation and not load-bearing for this plan.

**Data layer.** `src/lib/data/` has `JsonStore` (file-backed, flushes on a 5s interval, **not atomic** — writes use `fs.writeFileSync` without a temp-file-then-rename), `MongoStore` (async, paginated, indexed on `domain` / `created_at` / `fitness`), and a migration runner.

**Auth.** `src/lib/auth/` implements JWT access/refresh rotation, PBKDF2 password hashing (OWASP-compliant iteration count), RBAC middleware, and a per-IP rate limiter using an in-memory `Map<string, number[]>`. Process-local. No Redis-backed distributed variant.

**Frontend.** React 19 + Vite + Zustand + Radix UI + Tailwind CSS. Pages: `LandingPage`, `AuthPage`, `StudioPage`. Studio components: `AgentPanel`, `BreedPanel`, `CompositionPanel`, `MintPanel`, `GeneEditor`, `PreviewViewport`, `GSPLEditor`, `LineageGraph`, `GalleryGrid`, and more. `src/services/api.jsx` is the axios wrapper; `src/services/wsAgent.jsx` handles the WebSocket.

**Data seeds.** `data/seed-commons/inventories/` contains 20 `.gspl` batch files (one per sub-domain) with real seed definitions; `data/spec/` contains the 8-file GSPL specification; `data/genesis-seeds.json` contains structurally complete genesis seeds with valid `$lineage`, `$hash`, `$fitness`, and typed `genes`.

**Infrastructure.** `Dockerfile` is a correct multi-stage build. `docker-compose.yml` defines six services (app, mongo, redis, nginx, prometheus, grafana). `nginx.conf` has two rate-limit zones (30 r/s for API, 5 r/s for auth). **Bug:** its CSP includes `'unsafe-eval'` (line 24). `.github/workflows/ci.yml` defines 8 CI stages. `monitoring/` has a Grafana datasource + one dashboard.

**Python backend.** `paradigm/backend/` is a complete parallel FastAPI implementation (kernel, gene system, engines, composition, GSPL parser, agent, sovereignty). It is **orphaned**: the React frontend targets the TypeScript Express server; no compose service runs the Python backend; no nginx upstream points to it. It exists as a reference implementation. **Decision needed (Appendix D, Decision D-1): keep as reference, excise, or promote for specific workloads.**

**Test count.** Prior docs claim 359 tests. The actual grep of `it(` / `test(` / `describe(` across all test files returns ≈ 495 blocks. The CI badge is stale.

## 1.2 What the user is building Paradigm to become — the 5T Living Creative OS

The user's stated vision, preserved verbatim where I can and restated where it helps (from auto-memory + planning corpus):

- "**5T-scale Living Creative OS.**" Not a tool — a creative partner and substrate. Every artifact (character, song, game, contract, design) is a seed; every seed is auditable, breedable, signable, and ownable.
- **Full game / asset generation.** Characters, sprites, animations, whole games generated from GSPL seeds — reproducible forever.
- **Native GSPL Agent** (fine-tuned LLama 3 70B with QLoRA + ChromaDB RAG + WebSocket streaming + multi-step reasoning). "Must not be a Gemini wrapper."
- **On-chain sovereignty** (L2 NFT minting, IPFS/Arweave storage, ZK proofs).
- **Infinite canvas UI** (zoomable/panable seed constellation).
- **Agent swarms** (Idea / Style / Critic agents collaborating on seeds).
- **Git for Seeds** (branch/merge/diff/history on compositions).
- **Dream mode** (autonomous seed generation during idle).
- **Self-improving engines** (fine-tune from user likes/remixes).
- **"100% across the board"** — no mocks, no placeholders, no spheres. "We are going for 100% of the full true GSPL vision 100% all across the board."

The 5T framing is a horizon, not a line item. This plan's job is to make every incremental build increment *directionally true* to that horizon while remaining shippable.

## 1.3 Ground-truth state vs prior-doc claims (verified contradictions)

| Claim in prior planning docs | Verified reality | Verdict |
|---|---|---|
| "CompositionPanel.jsx has a missing `useEffect` import bug" | `useEffect` is imported at line 1 and called at line 12 | **FALSE — refuted** |
| "Agent v2 is 0% implemented (spec-only)" | Agent is ≈ 2,898 LOC across 8 files with async tool execution and a multi-tier inference client | **STALE — substantially built** |
| "Engines produce spheres for everything" | 27 distinct `growXxx` functions produce structurally distinct artifacts (character stats, sprite palettes, music tempo, etc.) | **FALSE at engine layer — TRUE at asset-preview layer** |
| "Mesh extractor uses marching cubes" / "Spec requires marching cubes" | `mesh_extractor.ts` is voxel-cube isosurface extraction (adds cube-face quads when neighbor is below threshold). Not marching cubes. | **TRUE — gap confirmed** |
| "xoshiro256** is used everywhere; determinism is pure" | RNG is xoshiro256**, but `composition.ts:32` and `qcd_solver.ts:108-110, 139` use `Math.random()` | **PARTIAL — 5 `Math.random` sites leak non-determinism** |
| "JsonStore writes atomically" | Uses `fs.writeFileSync` without temp-file-rename. Not atomic. | **FALSE — must be fixed** |
| "359 tests" | ≈ 495 test/describe/it blocks across tests | **Outdated count** |
| "CSP is strict" | `nginx.conf:24` allows `'unsafe-eval'` | **Compromised** |
| "Rate limiting is distributed" | Per-process in-memory `Map` | **False — single-instance only** |
| "26 engines" (in some docs) vs "27 engines" (in README) | 27 real grow functions incl. `agent`; 26 user-facing domains + `agent` is the 27th | **README is correct** |
| "9 functor bridges" vs "12 functor bridges" | Current registry is ≈ 9; 12 is the target after agent-domain bridges land | **Both claims are correct in different time-frames** |
| "Python backend is dormant / not wired" | Confirmed — no compose service, no nginx upstream | **TRUE — orphaned** |
| "MintPanel has missing API functions (`mintSeed`, `getNftInfo`, `getSeedPortraitUrl`)" | `api.jsx` has no exports named these; server routes at `/api/seeds/:id/mint`, `/api/seeds/:id/nft`, `/api/seeds/:id/portrait` exist (server.ts:1280, 1359, 1373). MintPanel will import-error on mount. | **TRUE — real ship-blocker bug** |
| "`growSeed` frontend wrapper calls `/seeds/:id/grow`" | `api.jsx` routes it to `/pipeline/execute`. Different endpoint shape; need to confirm server handler matches. | **Ambiguity — see Decision D-2** |
| "Gemini wrapping itself as the agent" | The Gemini path is an optional Tier-3 enhancer; the kernel tier is deterministic-only. User's concern is legacy. | **OBSOLETE — user concern satisfied by current architecture** |

## 1.4 Live gap register (deduplicated, priority-tagged, verified)

Priority legend: **P0** = blocks first usable build · **P1** = blocks first production release · **P2** = blocks the 5T vision · **P3** = quality/polish.

### Ship-blocker defects (P0)
- **G-01** `src/components/studio/MintPanel.jsx` imports `mintSeed`, `getNftInfo`, `getSeedPortraitUrl` from `@/services/api`. None are exported. Fix: add the three functions to `api.jsx`. *File: `src/services/api.jsx`.*
- **G-02** `src/services/api.jsx#growSeed` POSTs to `/pipeline/execute`; server registers `/api/seeds/:id/grow` at `server.ts:826`. Decide the contract (Decision D-2) and either extend the server handler or update the client.
- **G-03** `nginx.conf:24` CSP includes `'unsafe-eval'`. Remove it; if any third-party UI library requires it, isolate behind a stricter nonce-based policy.
- **G-04** `src/lib/kernel/composition.ts:32` uses `Math.random()` for fitness; breaks reproducibility claim. Replace with `rngFromHash(seed.$hash)`.
- **G-05** `src/lib/qft/qcd_solver.ts:108-110, 139` use `Math.random()`. Thread a deterministic RNG through the solver. The user's explicit feedback is "never produce mock/placeholder code" — non-deterministic physics in a deterministic platform is the same class of defect.
- **G-06** `src/lib/data/json-store.ts` writes with `fs.writeFileSync` directly. Data-loss risk on crash mid-write. Fix: write to `*.tmp` then `fs.renameSync`. Add `fsync` before rename on Linux.
- **G-07** Rate limiter is per-process. Behind the `nginx` upstream it is fine for a single `app` container; the moment we scale to N replicas it becomes a silent downgrade. Either pin to single replica in `docker-compose.yml` with a warning, or move the limiter to Redis now.
- **G-08** CI claims "359 tests." Reality is ≈ 495 blocks. Fix the badge and the CI summary step; establish a single source of truth (`vitest run --reporter=json` → extracted count).

### First-release gaps (P1)
- **G-10** No export from the Python backend. If we keep it, at minimum document it as "reference only" and add a `paradigm/backend/README.md` marking it orphaned (Decision D-1).
- **G-11** Asset preview mesh extraction produces blocky cubes. Replace with **Marching Cubes 33** (correct topology) for isosurfaces; for domain artifacts that are not implicit fields (sprites, music) keep dedicated visualizers. *Files: `src/lib/asset_pipeline/mesh_extractor.ts`, `src/lib/asset_pipeline/preview_generator.ts`.*
- **G-12** No API versioning. Move all current routes from `/api/...` to `/api/v1/...`, keep an alias for one minor release, ship an OpenAPI `Deprecation` header on the alias.
- **G-13** Gene-level semantic validation is incomplete in GSPL type checker (e.g., `scalar` values outside `[0, 1]` may parse without error). Tighten the type-checker with Zod-or-hand-rolled refinements per gene type.
- **G-14** No structured logging. `pino` is the canonical zero-dep choice. Emit JSON lines with `traceId`, `userId`, `seedId`, `operation`, `durationMs`.
- **G-15** `/metrics` endpoint exposed through nginx with no auth. Either bind-local only or require a scrape token.
- **G-16** `$lineage` is written on create but not always extended by mutation/crossover/composition through multi-step chains. Audit `engines.ts`, `composition.ts`, and `gene_system.ts` mutation paths to ensure `$lineage.parents` always reflects real parentage.
- **G-17** Evolution/agent audit log is minimal. Add an append-only event store (`data/audit/*.jsonl`) with one line per mutate/breed/compose/evolve/grow.
- **G-18** No OpenAPI schema for the WebSocket agent. Document frame shapes (`thinking`, `plan`, `tool_call`, `tool_result`, `result`, `error`) with a versioned schema in `src/lib/openapi/ws.md`.
- **G-19** `tests/e2e/studio.spec.ts` appears to be a single Playwright smoke. Expand to cover: login → create seed → mutate → breed → compose → sign → (mock-)mint → logout.
- **G-20** No component tests for React — 0 of ~80 files. Establish a baseline with React Testing Library for the 10 most critical components.
- **G-21** No load tests. Add `k6` scenarios for seed create, mutate, compose, and agent query.
- **G-22** WebGPU is mentioned in the roadmap for QFT acceleration; currently solvers are CPU-only TS `Float32Array`. This is fine for P0, but document it as the scaling lever.
- **G-23** No migrations test harness for Mongo. The migrations file exists; add a round-trip test in `tests/api/migrations.test.ts` (file exists — check it covers up/down/rollback).
- **G-24** No distinction between `seed.id` (internal) and the canonical `$hash` in storage indices. Risk of duplicate content-seeds. Add a uniqueness constraint on `$hash`.
- **G-25** Frontend state has no error boundary or skeleton loading pattern. Add `ErrorBoundary` around Studio, and `<SkeletonCard />` placeholders in gallery/library.

### Vision-horizon gaps (P2)
- **G-30** Agent v2's fine-tuned models are not in-repo. Need a training pipeline: Axolotl + QLoRA + LLama 3 or Phi-4-mini; dataset under `llm-inference/data/`.
- **G-31** Three-tier router logic (Tier 1 kernel → Tier 2 fast model → Tier 3 heavy model) needs to be codified as a state machine with explicit confidence thresholds.
- **G-32** Memory (context window) is session-scoped. Add optional persistent memory keyed by the agent seed's `$hash`.
- **G-33** Embedding pipeline (for similarity search & "find seeds that feel like this") is stubbed. Pick a provider: local (SBERT) or Gemini for dev, self-hosted for prod. Integrate HNSW in-process or Postgres+pgvector for managed scale.
- **G-34** `PinchTab` accessibility-tree web-browsing tool is spec-only. Reference implementation via Playwright's `page.accessibility.snapshot()` is straightforward.
- **G-35** Infinite canvas UI (zoomable constellation) is not built. Use `react-flow` or a custom WebGL canvas (pixi/regl).
- **G-36** Git-for-Seeds — branches, merges, diffs — is a first-class feature in the 5T vision. Prototype on top of `$lineage`.
- **G-37** Dream mode — autonomous seed generation on idle — is not built. This is Phase 7.
- **G-38** Self-improving engines (learn-from-likes) require a feedback table and a nightly fine-tune job.
- **G-39** On-chain: mainnet deployment untested, L2 not chosen. Candidate: Base or OP mainnet via OP Stack; lower gas, fast finality.
- **G-40** ZK proofs of lineage (zkLineage): prove "this seed descends from that genesis seed" without revealing intermediaries. R&D item; Phase 7.
- **G-41** IPFS pinning vs Arweave permanence: choose. Recommendation: Arweave for genesis seeds (permanence), IPFS via `web3.storage` for working seeds (cheap).
- **G-42** Export pipeline — glTF for characters/environments, WAV/MIDI for music, GIF for sprites — only glTF exporter exists. Build exporters per domain.

### Quality polish (P3)
- **G-50** No A/B testing framework. Defer.
- **G-51** No collaborative/real-time editing. Defer to Phase 7 (CRDT with Yjs).
- **G-52** No i18n. Defer.
- **G-53** No offline PWA. Defer.
- **G-54** No undo/redo. Add to Phase 5.
- **G-55** Domain colors duplicated across components. Extract to a theme token file.
- **G-56** `LineageGraph` re-runs 80 layout iterations each render; memoize or move to a web worker.

---

# Part 2 — Sovereign Architecture & Master Plan

## 2.1 The 7-layer sovereign architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ L7  Studio & Marketplace     React 19 SPA · Zustand · Radix/Tailwind │
│                              Infinite Canvas · Git-for-Seeds UI       │
├─────────────────────────────────────────────────────────────────────┤
│ L6  Intelligence Layer       Native GSPL Agent v2                    │
│                              Tier1 kernel · Tier2 fast LM · Tier3    │
│                              reasoning LM · Embeddings · RAG          │
├─────────────────────────────────────────────────────────────────────┤
│ L5  Evolution & Composition  GA · 12 functor bridges · BFS pathing   │
│                              Fitness per domain · Lineage propagation │
├─────────────────────────────────────────────────────────────────────┤
│ L4  Domain Engines           27 grow pipelines (character → agent)   │
│                              Asset pipeline (mesh, glTF, textures)    │
├─────────────────────────────────────────────────────────────────────┤
│ L3  GSPL Language            Lexer · Parser · AST · TypeChecker ·    │
│                              Interpreter · @gpu codegen (WGSL target) │
├─────────────────────────────────────────────────────────────────────┤
│ L2  Seed System              UniversalSeed · 17 gene types · 4 ops   │
│                              Canonicalization (JCS) · $hash · $lineage│
├─────────────────────────────────────────────────────────────────────┤
│ L1  Kernel                   xoshiro256** · SplitMix64 seeding ·     │
│                              QFT PDE solvers (EM/Dirac/QED/QCD/Grav) │
└─────────────────────────────────────────────────────────────────────┘
     Sovereignty cross-cuts  Auth cross-cuts  Observability cross-cuts
```

**Trust boundaries (who can say what is true):**
- The **kernel** is the source of truth for every mutation, crossover, composition, and growth. No other layer is allowed to introduce randomness or mutation logic. Violating this rule is a P0 defect (see G-04, G-05).
- **Sovereignty** is the source of truth for identity and provenance. Only the signing module may mutate `$sovereignty`; only the on-chain module may mutate `$sovereignty.tx_hash`.
- **Agent** is never trusted to mutate seeds directly — it **proposes** operations and the kernel **executes** them. This is the bright line that prevents a compromised model from producing ghost lineage.
- **Frontend** never holds private keys in plaintext; at P1, migrate from `localStorage` to WebAuthn-bound passkeys.
- **Network boundaries:** CORS is allow-listed via `CORS_ORIGINS` env var; all mutating endpoints require JWT; `/metrics` is bind-local or token-protected; on-chain RPC uses a server-side signer, never exposes the private key to the browser.

## 2.2 Determinism guarantees and how to prove them

The user's non-negotiable is: *given the same GSPL input, we produce bit-identical output on every machine, forever.* To honor this:

**Invariants we commit to**
1. No `Math.random()` anywhere in the execution path. The only entropy source is `rngFromHash(seed.$hash | parent.$hash | operation)`.
2. All floating-point comparisons use `Number.EPSILON`-bounded tolerances where needed, but we never branch on non-canonical IEEE 754 bit patterns (no reliance on `NaN` identity, no `-0` vs `+0` leaks).
3. Seed JSON is canonicalized via **JCS (RFC 8785)** before hashing and signing.
4. Time is never read from the system clock inside kernel operations. If a time gene is needed, it's an input; if creation time is stored, it's stored *outside* the hash-covered fields.

**Harness to prove it** (Part 4 §4.2 gives the full plan):
- A **cross-platform determinism suite** runs `npm test -- determinism` on x86_64-linux, arm64-linux, and Windows x64 in CI. Each suite computes the hash of a 1,000-operation fixture and compares against a committed golden file. A single byte of drift fails CI.
- A **replay harness** re-runs every seed's `$lineage` forward from a primordial seed and asserts bit-identical output. Ships as `npm run verify:replay`.
- The **QCD solver** gets its own determinism test with a fixed seed and 100 Metropolis steps — the final gauge link state must match a committed golden.

## 2.3 Data flows and execution flows

### Create-seed flow (happy path)
```
user → StudioPage.GeneEditor
     → api.createSeed(data)                     [POST /api/v1/seeds]
     → server.ts handler (optionalAuth → Zod validate → rng init from hash
        → canonicalize → $hash → persist → audit log append → return)
     → SeedStore (JsonStore atomic / MongoStore)
     → Zustand seedStore append
     → GalleryGrid re-renders
```

### Evolve flow
```
user → StudioPage.EvolvePanel (choose fitness / generations / algorithm)
     → api.evolveSeed(id, config)                [POST /api/v1/seeds/:id/evolve]
     → server.ts handler
        → populate population via rngFromHash
        → loop generations: select → crossover → mutate → evaluate fitness
        → update $lineage.parents += [parentA.$hash, parentB.$hash] per child
        → persist elites
        → audit log one line per generation
     → return elite set
     → Studio updates preview
```

### Agent query (tiered)
```
user → AgentPanel send("Breed fire warrior with ice mage")
     → WebSocket /ws/agent (JWT auth)
     → agent.processAsync(query, context)
        → parseQuery → intent:breed, entities:[warrior,mage], tier:FAST
        → Tier 1 (kernel): if intent is list_domains/help/describe → respond
        → Tier 2 (fast LM via llama.cpp HTTP): generates plan AST
        → kernel.executeTool(breed, parent_a, parent_b)        [deterministic]
        → reflect: compose summary + rendered artifact
     → stream frames: thinking | tool_call | tool_result | result
```

### Sign + mint flow
```
user → StudioPage.MintPanel enter ownerAddress
     → api.signSeed(id, privateKey)              [POST /api/v1/seeds/:id/sign]
     → server ECDSA P-256 sign → store $sovereignty.signature
     → api.mintSeed(id, ownerAddress)             [POST /api/v1/seeds/:id/mint]
     → server onchain.mint()
        → JCS canonicalize metadata → IPFS pin / data URI
        → ethers.js sendTransaction via SEPOLIA_RPC_URL
        → poll receipt → store $sovereignty.tx_hash, block, tokenId
     → api.getNftInfo(id) to render NFT card
```

## 2.4 Sovereignty model (cryptographic, on-chain, provenance)

**Hashing.** `sha256(JCS(seed_without_$hash_and_$sovereignty))`. Result stored as `"sha256:" + hex`.

**Signing.** ECDSA P-256 deterministic signatures (RFC 6979). `sovereignty.sign(seed, privKey)` returns `{ alg: "ES256", publicKeyJwk, signature, signedAt }`. Because signing is deterministic, a byte-identical seed always yields a byte-identical signature.

**Canonicalization.**
- Top-level key order: `$gst` → `$domain` → `$name` → `$lineage` → `genes` → `$metadata`.
- Gene key order: lexicographic.
- Each gene: `{"type": "<typeName>", "value": <canonicalized value>}`.
- Excluded from hash: `$hash`, `$sovereignty`, `$fitness`, anything under `$metadata` (treat `$metadata` as audit scaffolding, not identity).

**Lineage.**
| Operation | `$lineage.parents` | `$lineage.operation` |
|---|---|---|
| Primordial/genesis | `[]` | `"primordial"` |
| Mutate | `[parent.$hash]` | `"mutate"` |
| Breed | `[parentA.$hash, parentB.$hash]` | `"breed"` |
| Compose | `[source.$hash]` + `[via functor path]` | `"compose"` |

**Royalty split (on-chain).** 10% platform / 70% seller / 20% split across ancestors with geometric decay. Codified in the royalty contract (to be written in Phase 4).

**Key storage.**
- P0: `localStorage` (current) — document as dev-only.
- P1: **WebAuthn passkey** backed storage. Key never leaves device. The signer uses WebCrypto + the passkey's `sign` capability.
- P2: Optional: hardware-wallet integration (Ledger via WebUSB/WebHID) for high-value seeds.

**NFT contract sketch** (Solidity):
```solidity
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ParadigmSeedNFT is ERC721URIStorage, ERC2981, Ownable {
    mapping(uint256 => bytes32) private _seedHashes;
    mapping(uint256 => address[]) private _ancestorAddresses;
    uint96 public constant PLATFORM_ROYALTY_BPS = 1000;  // 10%

    function mint(address to, uint256 tokenId, string calldata uri,
                  bytes32 seedHash, address[] calldata ancestors) external onlyOwner {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _seedHashes[tokenId] = seedHash;
        _ancestorAddresses[tokenId] = ancestors;
        _setTokenRoyalty(tokenId, address(this), PLATFORM_ROYALTY_BPS);
    }
    function seedHash(uint256 tokenId) external view returns (bytes32) { return _seedHashes[tokenId]; }
    // ERC2981 handles on-chain royalty signals; marketplace-side splitter handles the 70/20.
}
```

**Chain choice.** Sepolia for staging; **Base** or **OP Mainnet** for production (L2 on OP Stack — cheap, fast, EVM-equivalent). Decision D-3.

## 2.5 Evolution roadmap — phases 0 through 7

| Phase | Duration | Focus | Exit criteria |
|---|---|---|---|
| 0 | 1–2 days | Emergency stabilization | No import errors, no ship-blocker determinism violations, CI badge accurate |
| 1 | Weeks 1–2 | Production hardening | TLS, atomic storage, structured logging, `/v1/` routes, rate-limit hardening, OpenAPI |
| 2 | Weeks 3–5 | Determinism & engine parity | 100% `Math.random` audited out; cross-platform determinism suite green; mesh extractor replaced; `$lineage` always correct |
| 3 | Weeks 6–10 | Agent v2 full buildout | 3-tier router implemented; training data pipeline; fine-tuned model served; WebSocket streaming end-to-end |
| 4 | Weeks 11–13 | Sovereignty & on-chain | WebAuthn keys; royalty contract audited; Sepolia → Base promotion ready; IPFS/Arweave pinning |
| 5 | Weeks 14–16 | Studio & UX polish | Infinite canvas MVP; error boundaries; skeleton loaders; a11y WCAG 2.1 AA; undo/redo |
| 6 | Weeks 17–20 | Intelligence layer | Embedding pipeline + HNSW + "seeds that feel like this"; recommender; context persistence |
| 7 | Weeks 21+ | Vision features | Git-for-Seeds, dream mode, agent swarms, self-improving engines, ZK lineage proofs |

Each phase is detailed in Part 3.

---

# Part 3 — Detailed Implementation Blueprint

All tasks below are written as **AI-executable chunks**: one file or small cluster of files, with acceptance criteria that an AI agent can self-verify via tests or a run command. File paths are absolute-relative from repo root. Test names are suggested; re-use existing test harnesses wherever possible.

## 3.1 Phase 0 — Emergency stabilization (1–2 days)

**Goal:** every user action in the Studio works without crashing, and no P0 determinism violation remains.

### Task 0.1 — Fix MintPanel import error (G-01, G-02)
- **Files:** `src/services/api.jsx`
- **Change:** add
  ```js
  export const mintSeed    = (id, ownerAddress) =>
    api.post(`/seeds/${id}/mint`, { owner: ownerAddress }).then(r => r.data);
  export const getNftInfo  = (id) =>
    api.get(`/seeds/${id}/nft`).then(r => r.data);
  export const getSeedPortraitUrl = (id) =>
    `${API_URL}/api/seeds/${id}/portrait`;
  ```
- **Also:** fix `growSeed` to target `/seeds/${id}/grow` (matching server.ts:826) unless the `/pipeline/execute` route is intentional. Confirm against server.ts and pick one (see Decision D-2).
- **Accept:** load `/studio`, click Mint tab, no red console error, network tab shows `/api/seeds/:id/nft` request firing.

### Task 0.2 — Strip `'unsafe-eval'` from CSP (G-03)
- **Files:** `nginx.conf`
- **Change:** remove `'unsafe-eval'` from `script-src`. If Vite dev mode needs it, scope it to a separate dev server config (`nginx.dev.conf`).
- **Accept:** `curl -I http://localhost/` shows `Content-Security-Policy` without `unsafe-eval`; Studio still loads.

### Task 0.3 — Replace `Math.random` in composition fitness (G-04)
- **Files:** `src/lib/kernel/composition.ts:32`
- **Change:** replace `Math.random()` with a single draw from `rngFromHash(seed.$hash + ':fitness')`. Clamp to `[0.5, 0.8]`.
- **Accept:** `tests/kernel/composition.test.ts` gets a new case asserting `composeSeed(x).$fitness.overall` is identical across two runs on the same input.

### Task 0.4 — Deterministic QCD solver (G-05)
- **Files:** `src/lib/qft/qcd_solver.ts:108-110, 139`, plus the solver's constructor.
- **Change:** accept an `rng: () => number` in the constructor (from `rngFromHash(seed.$hash)`). Replace all `Math.random()` call sites.
- **Accept:** new test `tests/kernel/qcd-determinism.test.ts` runs 100 Metropolis steps twice with the same seed and asserts byte-identical final gauge-link state.

### Task 0.5 — Atomic JsonStore writes (G-06)
- **Files:** `src/lib/data/json-store.ts`
- **Change:** write to `${path}.tmp.${pid}.${timestamp}`, `fsyncSync` the fd (Linux), then `renameSync` to the target. Add a crash-safety comment.
- **Accept:** new test `tests/api/data-layer.test.ts` case that simulates a crash between tmp-write and rename (truncate the tmp file) asserting the target file is untouched.

### Task 0.6 — Fix test count source of truth (G-08)
- **Files:** `.github/workflows/ci.yml`, `README.md`
- **Change:** the test step writes `TEST_COUNT=$(node scripts/count-tests.mjs)` into `$GITHUB_ENV`; the README has a badge pulling from a workflow run artifact.
- **Accept:** CI job writes the number; README no longer hard-codes `359`.

## 3.2 Phase 1 — Production hardening (Weeks 1–2)

**Goal:** the platform is safe to expose publicly behind TLS on a single VM.

### Task 1.1 — API versioning (G-12)
- Move all `/api/*` routes under `/api/v1/*`. Add a thin `/api/*` proxy that emits a `Deprecation: true` response header and logs a `deprecation_hit{path}` Prometheus counter.

### Task 1.2 — Structured logging via pino (G-14)
- Install `pino` and `pino-http` (zero-dep, JSON-line output).
- Create `src/lib/observability/logger.ts` exporting a singleton logger with request-scoped child loggers bound to `traceId`.
- Replace every `console.log/error/warn` in `server.ts`, `src/lib/**`.

### Task 1.3 — Redis-backed rate limiting (G-07)
- Create `src/lib/auth/rate-limit.ts` implementing a token-bucket in Redis via Lua script; fall back to in-memory when Redis is unreachable (with a warning logged once per minute).
- Wire it into `/api/v1/auth/*` (5 r/s/IP) and `/api/v1/seeds/*` mutation endpoints (30 r/s/user).

### Task 1.4 — Move `/metrics` behind an auth token (G-15)
- Add `METRICS_TOKEN` env var; the nginx config strips the query param and forwards a bearer header; any non-matching request is 401.

### Task 1.5 — TLS in Docker Compose
- Add a Certbot sidecar or Caddy-alternative service. Simpler path: swap nginx for **Caddy** in production compose — auto-TLS via Let's Encrypt, simpler config. Optional; stay on nginx if preferred (Decision D-4).

### Task 1.6 — OpenAPI fully covers routes (G-18)
- Audit `src/lib/openapi/spec.ts` (or equivalent) to match every registered route, including `/ws/agent` frame shapes in a companion `ws-schema.md`.

### Task 1.7 — Migrations rollback (G-23)
- Add `down()` functions to each migration. Add a `npm run db:rollback` script. Test in `tests/api/migrations.test.ts`.

### Task 1.8 — `$hash` uniqueness (G-24)
- Add a Mongo unique index on `$hash`. For JsonStore, add a pre-write uniqueness check.

### Task 1.9 — ErrorBoundary + skeleton loaders (G-25)
- `src/components/ErrorBoundary.jsx` wraps `StudioPage`. `src/components/ui/SkeletonCard.jsx` used in gallery and library.

## 3.3 Phase 2 — Determinism & engine parity (Weeks 3–5)

**Goal:** bit-identical outputs across machines; all 27 engines produce domain-distinct, visually meaningful artifacts; mesh extraction no longer blocky.

### Task 2.1 — `Math.random` scanner (G-04, G-05 follow-through)
- Add `scripts/check-no-math-random.mjs` — greps `src/**` (excluding tests) for `Math.random` and fails if found. Wire into CI lint.

### Task 2.2 — Cross-platform determinism suite (§4.2)
- New job matrix in CI: `{ os: [ubuntu-latest, macos-latest, windows-latest] }`, runs `npm run verify:determinism` against a committed golden.
- Golden artifact: `tests/golden/determinism-v1.json`.

### Task 2.3 — Replay harness
- `npm run verify:replay` → walks every seed, re-runs its `$lineage`, asserts `$hash` match.

### Task 2.4 — Marching Cubes 33 implementation (G-11)
- Replace `MeshExtractor.extractIsosurface` with a correct **Marching Cubes 33** (Chernyaev's variant handles all ambiguous cases). Keep the voxel implementation under a `--legacy` flag for comparison tests.
- New test suite: `tests/asset_pipeline/mesh_extractor.test.ts` covering analytic spheres, toruses, and merged fields.

### Task 2.5 — Domain-aware preview generators (G-11 continuation)
- Split `preview_generator.ts`:
  - `preview_sprite.ts` → canvas 2D with the palette/resolution genes
  - `preview_music.ts` → Tone.js or WebAudio offline render → WAV blob
  - `preview_character.ts` → marching-cubes body mesh + palette texture
  - `preview_fullgame.ts` → composite (character + terrain + narrative card)
- No domain should fall back to a sphere unless its explicitly "geometry3d" with no field data.

### Task 2.6 — `$lineage` audit (G-16)
- Add a lineage-well-formedness check after every mutation path. A new pure function `ensureLineage(parentHashes, operation, child) → child'` enforces the invariant. All engines, breeders, and composers route through it.

### Task 2.7 — Audit log event store (G-17)
- `src/lib/data/audit.ts` — append-only JSONL; one event per operation; fields: `{ at, traceId, userId, operation, seedId, parentHashes, resultHash, durationMs }`. Rotate daily.

### Task 2.8 — Tightened GSPL type checker (G-13)
- Extend `src/lib/gspl/type_checker.ts` (or equivalent) with per-gene-type refinements:
  - `scalar` ∈ `[0, 1]`
  - `vector<N>` length matches declared `N`
  - `categorical` value ∈ declared enum
  - `graph` acyclic where the schema requires
- New test suite: `tests/gspl/type_checker.test.ts` with 30+ failure cases.

### Task 2.9 — Domain exporter plan (G-42, scaffold only)
- Create empty exporters in `src/lib/asset_pipeline/exporters/` for `character.glb.ts`, `sprite.gif.ts`, `music.wav.ts`, `fullgame.zip.ts`. Fill one (glTF) fully to lock the pattern.

## 3.4 Phase 3 — Agent v2 full buildout (Weeks 6–10)

**Goal:** the agent is fully native GSPL, multi-tier, streaming, with fine-tuned local weights, zero hard Gemini dependency.

### Task 3.1 — Three-tier router state machine (G-31)
- `src/lib/agent/router.ts` — explicit FSM over `{ KERNEL, FAST, HEAVY }` with:
  - Regex/rule match → KERNEL (always)
  - Confidence from rule match ≥ 0.85 → skip LM; else FAST.
  - If FAST returns `needs_reasoning = true` or plan has > 4 steps → HEAVY.
  - If any LM is unavailable, degrade to next tier down; KERNEL is always available.
- Tests: `tests/agent/router.test.ts` with 100 labeled queries.

### Task 3.2 — llama.cpp server orchestration
- `llm-inference/docker-compose.llm.yml` — separate compose file for the inference server (so it can be started on a GPU host while the main app runs on a CPU host).
- Start script: `llm-inference/start.sh`:
  ```bash
  ./server --model $MODEL_PATH -t $THREADS -ngl $NGL -c 8192 --port 8080
  ```
- Healthcheck: GET `/health` against llama.cpp.

### Task 3.3 — Training data pipeline (G-30)
- Directory layout:
  ```
  llm-inference/data/
    router_classifications.jsonl    # 5,000+ (query, tier, intent)
    seed_generation.jsonl           # 2,000+ (prompt, gspl_source, seed_hash)
    complex_planning.jsonl          #   500+ (prompt, plan_steps, outcome)
    gspl_syntax.jsonl               # 1,000+ (prompt → gspl_source with valid AST)
  ```
- Generator scripts (`llm-inference/generate/*.mjs`) produce synthetic data from the kernel itself (every kernel call yields one gold datum).
- Fine-tune recipe: Axolotl config `llm-inference/configs/phi4-mini-qlora.yml`. Base: `microsoft/Phi-4-mini-instruct`. QLoRA r=32, 4-bit NF4.
- Validation set held out; loss / perplexity tracked. Goal: router accuracy ≥ 92%, seed-generation AST validity ≥ 95%.

### Task 3.4 — Reasoning loop (PLAN/EXECUTE/REFLECT/RESPOND)
- `src/lib/agent/reasoning.ts` — already partly exists; finish:
  - `plan()`: produce AST of kernel operations.
  - `execute()`: call kernel tools sequentially; capture results.
  - `reflect()`: if fitness ∉ target band, replan once (max 1 replan; hard-cap total steps ≤ 12).
  - `respond()`: synthesize prose + rendered artifact + suggested next seeds.

### Task 3.5 — Tool permissions (G-32)
- `src/lib/agent/tools.ts` — every tool has a `permission` level: `public`, `authenticated`, `admin`. The agent's seed carries `tool_permissions: struct`. The executor checks both the user's role and the agent-seed's permissions before calling a tool.

### Task 3.6 — Memory with optional persistence
- `src/lib/agent/memory.ts` — sliding window with `context_window` gene controlling length. Add optional write-to `data/agent-memory/<agent_hash>.jsonl`.

### Task 3.7 — PinchTab accessibility-tree browsing (G-34)
- `src/lib/agent/tools/web_browse.ts` — Playwright-backed: navigate, `page.accessibility.snapshot()`, compress to ~800 tokens, return. Actions: `click [ref]`, `type [ref] "text"`, `scroll up|down`.

### Task 3.8 — Agent-as-seed (27th domain) end-to-end
- `growAgent` already exists (engines.ts:336). Add agent-domain functor bridges: `agent → narrative` (persona sheet), `agent → character` (persona as character), `agent × agent → agent` (breeding swarms).

### Task 3.9 — WebSocket frame schema
- `src/lib/openapi/ws-schema.md` and `src/lib/openapi/ws-schema.ts` (Zod). Frames: `{type: "thinking"|"plan"|"tool_call"|"tool_result"|"result"|"error", payload: …}`.

## 3.5 Phase 4 — Sovereignty & on-chain (Weeks 11–13)

### Task 4.1 — WebAuthn passkey signing
- `src/lib/sovereignty/webauthn.ts` — create/get credentials via `navigator.credentials.create/get`. Sign operations via the passkey's assertion. Server verifies the assertion against the stored public key.
- UI: Settings → "Create sovereign key." No raw key ever stored.

### Task 4.2 — Royalty splitter contract
- Solidity file `contracts/RoyaltySplitter.sol`: receives royalty, splits 10/70/20 as ERC-2981 signals + on-receive distribution.
- Audit checklist (internal): reentrancy (use `Checks-Effects-Interactions`), overflow (Solidity 0.8.x), pause switch for emergency.

### Task 4.3 — Chain promotion: Sepolia → Base
- Env vars `CHAIN_ID`, `RPC_URL`, `CONTRACT_ADDRESS` per environment. Staging runs on Base Sepolia; prod on Base Mainnet.
- Mint cost estimate: ≈ $0.01–$0.05/mint on Base. Acceptable for user-driven minting.

### Task 4.4 — IPFS + Arweave
- `src/lib/sovereignty/storage.ts` — pluggable backend: `ipfs` (via `web3.storage`), `arweave` (via `arweave-js`). Genesis seeds → Arweave; working seeds → IPFS.

### Task 4.5 — `verify(seed)` CLI tool
- `scripts/verify-seed.mjs` — given a `.gseed` file, runs canonicalization + signature verification + lineage walk. Zero network required (offline-safe).

## 3.6 Phase 5 — Studio & UX polish (Weeks 14–16)

### Task 5.1 — Infinite canvas (G-35)
- New route `/studio/canvas`. Use `react-flow` for seed nodes + functor edges. Pan/zoom/cluster. Click-to-focus opens the GeneEditor inline.

### Task 5.2 — Undo/redo
- Zustand middleware for command pattern; every mutation goes through `dispatch({type, payload})`. Stack in memory for the session; persist `lastN` to `sessionStorage`.

### Task 5.3 — Accessibility pass (WCAG 2.1 AA)
- Run the `design:accessibility-review` skill. Track fixes in `docs/a11y.md`. Keyboard shortcuts table.

### Task 5.4 — Theme tokens (G-55)
- `src/styles/tokens.css` — one source of truth for domain colors, spacing, motion durations.

### Task 5.5 — LineageGraph performance (G-56)
- Memoize the layout call; move force iterations to a web worker; reduce to ≤ 20 iterations per render with early-stop.

### Task 5.6 — 60%+ component test coverage for critical components
- Start with AuthPage, StudioPage, GeneEditor, MintPanel, CompositionPanel, AgentPanel, LineageGraph, GalleryGrid, BreedPanel, GSPLEditor. Use React Testing Library.

## 3.7 Phase 6 — Intelligence layer (Weeks 17–20)

### Task 6.1 — Embedding pipeline (G-33)
- Per seed: flatten genes + `$lineage.operation` into a prompt, call the embedding model, store `embedding: Float32Array` in Mongo (or alongside in JsonStore as base64).
- Provider swap: dev = Gemini, prod = self-hosted SBERT behind the llama.cpp sidecar or a dedicated `sentence-transformers` service.

### Task 6.2 — HNSW index
- Postgres + `pgvector` path or in-process `hnswlib` (Node binding). Trade-off: managed (pgvector) vs zero-dep (hnswlib). Recommend **pgvector** once we move off JsonStore for any production scale.

### Task 6.3 — "Seeds that feel like this" UI
- GalleryGrid → "Similar" action on any seed card. Shows top-8 by cosine distance. Click to open.

### Task 6.4 — Recommendation: "compose with these"
- For the currently selected seed, find the top-3 seeds whose functor-path to the current one has the highest historical success (simple popularity prior until we have engagement data).

## 3.8 Phase 7 — Vision features (Weeks 21+)

### Task 7.1 — Git-for-Seeds (G-36)
- Branches: `seed.$branch = "main" | "feature/<name>"`. Merge: run the composition engine with three-way merge over genes (scalars → average, categoricals → pick, structs → recurse).
- Diff view: GeneEditor side-by-side, highlighting changed genes.

### Task 7.2 — Dream mode (G-37)
- Background worker that, on user-idle signal, generates seeds by sampling embedding latent space near the user's recent activity. Stores to a private "latent library." User can promote any to the main gallery.

### Task 7.3 — Agent swarms (G-38)
- `src/lib/agent/swarm.ts` — N agents (Idea, Style, Critic, Historian, Architect) with distinct `persona` and `domain_focus`. Each round: Idea proposes → Style refines → Critic scores → Architect composes final. Swarm output: a seed with `$lineage.operation = "swarm"` and parents of all contributors.

### Task 7.4 — Self-improving engines
- Each "like" / "remix" event is logged with user + seed hash. Nightly job trains a small reward model per domain; the engines' grow() functions consume the reward model as a soft bias on gene initialization ranges.

### Task 7.5 — zkLineage proofs (G-40)
- R&D item. Circom/Noir circuit proves "there exists a sequence of (operation, gene-change) tuples from genesis `g0` to current `sN` such that applying them yields `sN.$hash` == claimed hash." Useful for marketplace trust without revealing intermediate work.

### Task 7.6 — Marketplace (L7)
- Listings, bids, sales, royalty distribution, curation lanes. Scaffolded only — real marketplace is a platform stance, not a sprint.

## 3.9 AI-executable task library (prompt templates)

For each task above, here is the template to hand an AI coding agent (Cowork/Claude Code/equivalent):

```
You are implementing <Task ID> from the Paradigm Master Plan.
Repo root: /path/to/paradigm_goe
Goal: <one-sentence goal from the task>
Files to change: <exact paths>
Constraints:
  - No Math.random() anywhere in src/** outside tests/fixtures.
  - All kernel ops must be deterministic.
  - Follow the existing TS style (strict mode, no `any` without a TODO comment).
  - Add or update tests under <exact tests path>.
Acceptance:
  - <exact assertion the task lists>
  - `npm test -- <specific suite>` passes.
  - `npm run lint` clean.
Produce a single PR-sized diff. Do not refactor unrelated code.
```

---

# Part 4 — Validation, Tests, Edge Cases, Security, Sovereignty

## 4.1 Test pyramid & coverage targets

| Layer | Tool | Current | Target (P1) | Target (P2) |
|---|---|---|---|---|
| Unit (kernel, gspl, engines, sovereignty) | Vitest | ≈ 400 | 500 | 700 |
| Unit (React components) | Vitest + RTL | 0 | 150 (60% of 10 critical) | 400 (80% of all) |
| API integration | Vitest + supertest | ≈ 80 | 150 | 250 |
| WebSocket | Vitest custom harness | 0 | 30 | 60 |
| E2E | Playwright | 1 | 8 (critical journeys) | 25 |
| Load | k6 | 0 | 4 scenarios | 12 scenarios |
| Determinism | Custom `verify:*` scripts | 0 | matrix x3 OSes | matrix x4 OSes (+arm64-mac) |

## 4.2 Determinism verification harness

- **Unit level.** Every `growXxx` has a test asserting `growXxx(seed) == growXxx(seed)` and that changing one gene changes the output.
- **Integration level.** A 1,000-step pipeline fixture (GSPL source → parse → execute → evolve 100 generations → compose → grow) computes a final `$hash` and asserts it matches a committed golden.
- **Cross-OS level.** Matrix CI runs the integration fixture on Linux x64, Linux arm64, Windows x64, macOS arm64. Any byte-level drift fails CI.
- **Replay level.** For each seed with `$lineage.parents != []`, we can reconstruct it from ancestors. `npm run verify:replay --seed <hash>` proves it for any seed; CI does it for a sampled subset of the seed-commons.

## 4.3 Security audit plan

| Category | Current state | Required for P1 | Tool / technique |
|---|---|---|---|
| Auth | JWT + PBKDF2, in-mem rate limit | Redis rate limit, WebAuthn option | — |
| Input validation | Zod at API boundary | Zod + GSPL type checker tightened | fuzz tests via `fast-check` |
| CSP | unsafe-eval permitted | unsafe-eval removed | headers test in integration suite |
| CORS | Allow-list env | Keep; add preflight cache headers | — |
| HTTPS | Dev only | Auto-cert (Caddy or Certbot) | — |
| Secrets | `.env` file | `.env` + SOPS / age encryption for staging/prod | — |
| Dependency audit | Manual | `npm audit` + `snyk` in CI nightly | — |
| SQL injection | N/A (Mongo + JSON) | N/A | — |
| NoSQL injection | Raw queries? Audit. | Parameterize; no `$where` | code review |
| XSS | React escapes by default | Keep; audit `dangerouslySetInnerHTML` use | grep for it |
| CSRF | SameSite cookie? Review JWT in header vs cookie | Prefer httpOnly cookie for refresh; header for access | — |
| Supply chain | Lockfile present | Enable `npm ci` and `--strict-peer-deps`; sign releases | — |
| On-chain key exposure | Private keys not in browser | Keep; WebAuthn for P1 | — |
| Rate-limit bypass | per-IP | per-user + per-IP; burst caps | — |
| Replay attacks | JWT with exp | Add nonce to sign-in responses | — |

Run `design:accessibility-review`, `engineering:code-review`, and a lightweight internal pen-test at the end of Phase 1.

## 4.4 Sovereignty verification plan

- **Canonicalization round-trip test.** For N=1,000 random seeds: `JCS(S)` → bytes → `parse` → must equal `S`. Also: any reordering of keys before `JCS` produces identical output.
- **Signature determinism test.** Sign the same seed 100 times with the same key; all 100 signatures byte-identical (RFC 6979).
- **Cross-seed signature isolation.** Signature on seed A does not verify against seed B.
- **Tampering test.** Mutate a gene value post-signing; verification fails.
- **On-chain metadata round-trip (test chain).** Mint on Anvil (local Ethereum node), fetch `tokenURI`, parse metadata, verify signature — all offline-reproducible.

## 4.5 Performance & load testing

- **k6 scenarios** (run against staging):
  1. Baseline: 50 vus steady, 2 min, `GET /api/v1/seeds`. Target: p95 < 50 ms.
  2. Create burst: 100 vus, 1 min, `POST /api/v1/seeds`. Target: p95 < 150 ms.
  3. Evolve: 10 vus, 10 min, `POST /api/v1/seeds/:id/evolve` with 50 generations. Target: p95 < 8 s.
  4. Agent WebSocket: 25 concurrent streams, 5 min. Target: first-token < 1.5 s, full-response < 12 s.

## 4.6 Observability

- **Logs.** Pino JSON lines → Docker stdout → Loki (optional) or a file-based aggregator.
- **Metrics.** Prometheus scrapes `/metrics` (token-protected). Minimum metric set:
  - `paradigm_seed_create_total{domain}`
  - `paradigm_seed_evolve_duration_seconds{domain,generations}`
  - `paradigm_agent_query_total{tier,intent,status}`
  - `paradigm_agent_latency_seconds{tier}`
  - `paradigm_mint_total{chain,status}`
  - `paradigm_auth_fail_total{reason}`
- **Traces.** OpenTelemetry SDK initialized in `src/lib/observability/tracer.ts`; instrument Express middleware + the WebSocket handler + kernel ops (light sampling).
- **Dashboards.** Grafana:
  1. "Platform Overview" (RPS, p95, error rate, active users).
  2. "Agent Health" (tier mix, latency per tier, replans).
  3. "Sovereignty" (mints/h, signing failures, RPC errors).
  4. "Kernel" (engine latency per domain, RNG call count).
- **Alerts.** Alertmanager rules: `auth_fail_spike > 100/5m`, `agent_error_rate > 5%/5m`, `mint_error_rate > 10%/5m`, `p95 > 500ms/5m`.

---

# Part 5 — Evolution Paths & Cross-Invention Synergies

## 5.1 Near-horizon (12 months)

- Ship Phases 0–5. Public beta by end of month 4; stable release by end of month 9.
- All 27 engines produce domain-distinct, aesthetically credible outputs.
- Agent v2 live with fine-tuned Phi-4-mini router + weights for seed generation.
- Sovereignty live on Base Mainnet; WebAuthn keys default.
- Intelligence layer online (embeddings, similarity, recommender).

## 5.2 Mid-horizon (12–36 months)

- Git-for-Seeds, dream mode, agent swarms shipped.
- Developer platform: public plugin SDK, sandboxed JS engines (QuickJS/isolated-vm) to let third parties add domains and functors.
- Marketplace: listings, bids, curation; 70/20/10 royalty splits operational.
- Federated learning: user-owned "taste vectors" improve personal recommendations without centralizing preferences.
- Export-to-Unity/Unreal/Blender plugins (companion repos).

## 5.3 Long-horizon (3–10 years; 5T framing)

- Sovereign creative OS installed like any operating system; native integrations with Figma/DAWs/game engines.
- zkLineage proofs standard across marketplaces.
- Permanent storage (Arweave) for all genesis seeds; IPFS hot cache.
- 5 trillion artifacts through ecosystem + agent swarms (user's framing). Not a literal KPI — a horizon used to prioritize scalability and composability over premature optimization.

## 5.4 Cross-invention synergies

Because the user is working on a portfolio of inventions, several patterns transfer:

- **Deterministic kernel pattern.** Any of the user's other inventions that benefit from reproducibility (contracts, lab notebooks, compliance logs) can reuse the `UniversalSeed + JCS + ECDSA` substrate.
- **Seed-first agent pattern.** Agents-as-seeds generalize: any AI assistant in another product can be stored as a seed, shared, bred, evolved.
- **Functor bridges.** Any two domains with a defined morphism (legal text → UI flow, medical note → dosing table) can be added as new bridges in the same graph.
- **Sovereignty layer.** The signing + on-chain kit is reusable for any digital artifact the user wants provenance for.

## 5.5 Recursive self-improvement protocol

This plan is itself a seed. On every sprint boundary:

1. **Reassess gap register** — remove gaps fixed; add gaps discovered.
2. **Reassess architecture** — any layer or boundary that felt wrong this sprint gets an ADR (Architecture Decision Record) in `docs/adr/`.
3. **Reassess agent training data** — every new seed created this sprint becomes one training datum for the next fine-tune.
4. **Rotate phase exit criteria** — tighten the standards as platform maturity rises (e.g., "p95 < 500 ms" becomes "p95 < 200 ms" at Phase 5 exit).
5. **Preserve determinism** — no phase is considered "done" if the cross-OS determinism suite is red.

---

# Appendices

## Appendix A — Ground-truth file inventory (top 30 files by significance)

| Path | LOC | Role |
|---|---|---|
| `server.ts` | 1,695 | Unified Express + WS server |
| `src/lib/kernel/engines.ts` | ~900 | 27 grow functions |
| `src/lib/kernel/gene_system.ts` | ~700 | 17 gene types × 4 ops |
| `src/lib/kernel/rng.ts` | 169 | xoshiro256** |
| `src/lib/kernel/composition.ts` | ~400 | 9 functors, BFS pathing, **has Math.random bug** |
| `src/lib/kernel/fitness.ts` | ~200 | Per-domain fitness |
| `src/lib/gspl/parser.ts` | 497 | Recursive-descent AST parser |
| `src/lib/gspl/lexer.ts` | ~300 | Tokenizer |
| `src/lib/gspl/interpreter.ts` | ~350 | Tree-walking interpreter |
| `src/lib/gspl/compiler.ts` | ~150 | Compile → exec plan |
| `src/lib/agent/index.ts` | ~600 | Agent orchestrator |
| `src/lib/agent/reasoning.ts` | ~400 | Reasoning loop |
| `src/lib/agent/inference.ts` | ~250 | llama.cpp HTTP client |
| `src/lib/agent/tools.ts` | ~300 | Tool registry |
| `src/lib/agent/memory.ts` | ~150 | Sliding window memory |
| `src/lib/qft/em_solver.ts` | 243 | Maxwell FDTD |
| `src/lib/qft/dirac_solver.ts` | 253 | Dirac spinor |
| `src/lib/qft/qed_coupling.ts` | 117 | QED |
| `src/lib/qft/qcd_solver.ts` | 241 | **has Math.random bug** |
| `src/lib/qft/gravity_solver.ts` | 159 | Gravity BSSN |
| `src/lib/sovereignty/index.ts` | ~600 | ECDSA P-256 |
| `src/lib/sovereignty/onchain.ts` | ~600 | ethers.js + ERC-721 |
| `src/lib/auth/index.ts` | ~350 | JWT + PBKDF2 + rate limit |
| `src/lib/data/json-store.ts` | ~200 | **non-atomic writes** |
| `src/lib/data/mongo-store.ts` | ~250 | MongoStore |
| `src/lib/asset_pipeline/mesh_extractor.ts` | ~500 | **voxel cubes, not marching cubes** |
| `src/lib/asset_pipeline/preview_generator.ts` | ~300 | Preview renderer |
| `src/services/api.jsx` | ~100 | **missing mintSeed/getNftInfo/getSeedPortraitUrl** |
| `src/services/wsAgent.jsx` | ~80 | WebSocket agent client |
| `src/components/studio/MintPanel.jsx` | ~200 | **imports undefined API functions** |

## Appendix B — Every verified bug with exact file/line

| ID | File:Line | Defect | Fix task |
|---|---|---|---|
| G-01 | `src/services/api.jsx` | Missing exports `mintSeed`, `getNftInfo`, `getSeedPortraitUrl` | Task 0.1 |
| G-02 | `src/services/api.jsx#growSeed` vs `server.ts:826` | Client POSTs `/pipeline/execute`, server expects `/seeds/:id/grow` | Task 0.1 / Decision D-2 |
| G-03 | `nginx.conf:24` | CSP allows `'unsafe-eval'` | Task 0.2 |
| G-04 | `src/lib/kernel/composition.ts:32` | `Math.random()` in fitness | Task 0.3 |
| G-05 | `src/lib/qft/qcd_solver.ts:108,109,110,139` | `Math.random()` in Metropolis | Task 0.4 |
| G-06 | `src/lib/data/json-store.ts` | Non-atomic `writeFileSync` | Task 0.5 |
| G-08 | `.github/workflows/ci.yml`, `README.md` | Hard-coded "359 tests" | Task 0.6 |

## Appendix C — Every contradiction between prior docs and code

See §1.3 above. Summary:
1. CompositionPanel useEffect bug — **refuted**.
2. Agent v2 at 0% — **stale; substantially built**.
3. Engines produce spheres — **false at engine layer; true at preview layer**.
4. xoshiro256** everywhere — **mostly, but 5 `Math.random` sites leak**.
5. JsonStore atomic — **false**.
6. 359 tests — **≈ 495**.
7. Rate limiting distributed — **false, per-process**.
8. Python backend dormant — **true, orphaned**.
9. CSP strict — **false, unsafe-eval permitted**.

## Appendix D — Open decisions (need the user's call)

| ID | Decision | Options | Recommended |
|---|---|---|---|
| D-1 | Python backend fate | (a) delete, (b) mark orphaned in README, (c) promote as an alt-runtime for a specific workload | **(b) keep as reference-only; delete at Phase 7 if still unused** |
| D-2 | `growSeed` route | (a) rename server route to `/seeds/:id/grow` consistently, (b) rename client to `/pipeline/execute`, (c) keep both with pipeline being the orchestrator | **(c) keep both: `/seeds/:id/grow` = single-engine grow; `/pipeline/execute` = multi-stage pipeline; client has two functions** |
| D-3 | Production chain | Sepolia → (a) Ethereum Mainnet, (b) **Base Mainnet**, (c) OP Mainnet, (d) Arbitrum | **(b) Base — low gas, fast, EVM-equivalent, strong indexer ecosystem** |
| D-4 | Reverse proxy | Keep nginx vs switch to Caddy | **Keep nginx**; add Caddy later only if cert automation is painful |
| D-5 | Embedding backend | Gemini (dev), local SBERT (prod), OpenAI | **Gemini dev → self-hosted SBERT prod via a sidecar** |
| D-6 | Vector DB | pgvector vs hnswlib in-process | **hnswlib in-process until 100K seeds; pgvector beyond** |
| D-7 | Local LM | Phi-4-mini vs SmolLM2 vs Llama 3 8B | **Phi-4-mini for router + fast tier; Phi-4 14B for heavy tier; Llama 3 deferred** |
| D-8 | Permanent storage | IPFS vs Arweave vs both | **Both: genesis seeds → Arweave; working seeds → IPFS** |
| D-9 | Canvas tech | react-flow vs custom WebGL (pixi/regl) | **react-flow MVP; custom WebGL when node counts > 2k** |

## Appendix E — Glossary of GSPL terms (non-developer friendly)

- **UniversalSeed** — a typed JSON object representing any creative artifact, carrying genes + lineage + signature.
- **Gene** — a typed piece of a seed, like a parameter with meaning (color palette, tempo, strength, etc.). 17 types total.
- **Domain** — the kind of thing a seed represents (character, music, game, etc.). 27 domains including `agent`.
- **Functor bridge** — a defined conversion between two domains (e.g., `character → sprite` turns a character's archetype into a pixel-art silhouette).
- **Composition** — chaining functors to go from one domain to another not directly connected (BFS over the domain graph).
- **Grow** — run a domain's dedicated engine to turn a seed into a concrete artifact (3D mesh, audio, pixel grid, etc.).
- **Evolve** — run a genetic algorithm on a population of seeds against a fitness function.
- **Mutate / Breed / Crossover** — kernel operations that produce new seeds from parents.
- **Lineage** — the chain of parent hashes + operations that produced a seed. The family tree.
- **Sovereignty** — cryptographic signing + optional on-chain minting that proves ownership.
- **JCS** — JSON Canonicalization Scheme (RFC 8785). Ensures the same seed serializes to the same bytes everywhere so hashing is consistent.
- **xoshiro256\*\*** — a fast, high-quality deterministic pseudo-random number generator. Given the same seed bytes, produces the same sequence forever.
- **Determinism** — the property that the same input always produces the same output. Paradigm's core value proposition and competitive moat.

---

**End of Master Production Plan — v1.0 (2026-04-14)**

*This plan is itself a seed. Its `$hash` and `$lineage` are managed in git. Next mutation after Phase 0 completes; next crossover with the training-data pipeline doc in Phase 3.*
