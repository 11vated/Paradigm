# Reference Specification Summaries

**Source:** `PAradigm-reference` (spec/00–07, adr/001–011)  
**Purpose:** Quick reference for main repo developers. See full spec at `PAradigm-reference/`.

---

## SPEC 00: Overview

Paradigm inverts the creative process: **seeds** are primary, artifacts are projections. Seeds are typed, signed, deterministic genetic blueprints. Core guarantee: same seed + same RNG + same engine = bit-identical artifact forever.

Key concepts: breeding instead of prompting, lineage as first-class object, cryptographic sovereignty without blockchain, cross-domain composition via category theory, super-linear network effects.

## SPEC 01: UniversalSeed

The atomic data structure. JSON-serializable with fields:
- `$gst`, `$domain`, `$hash`, `$name`, `$lineage`, `$fitness`, `$sovereignty`, `$metadata`
- `genes`: Map of gene names to `{type, value}` pairs

8 invariants: hash correctness, lineage consistency, gene name legality, gene type legality, gene value legality, domain legality, signature validity, version support.

6 operations: `canonicalize`, `hash`, `validate`, `sign`, `verify`, `distance`.

**Implementation:** `src/seeds/universal-seed.ts` (canonical), `src/lib/kernel/seed-class.ts` (deprecated)

## SPEC 02: 17-Type Gene System

| # | Type | Encodes |
|---|------|---------|
| 1 | scalar | Continuous numeric values |
| 2 | categorical | Discrete choices |
| 3 | vector | Multi-dimensional arrays |
| 4 | expression | Mathematical formulas |
| 5 | struct | Composite records |
| 6 | array | Ordered homogeneous collections |
| 7 | graph | Nodes and edges |
| 8 | topology | Surface/manifold descriptions |
| 9 | temporal | Time-varying signals |
| 10 | regulatory | Gene-expression control networks |
| 11 | field | Continuous spatial distributions |
| 12 | symbolic | Abstract symbolic representations |
| 13 | quantum | Superposition/entanglement |
| 14 | gematria | Numerological encodings |
| 15 | resonance | Harmonic frequency profiles |
| 16 | dimensional | Embedding-space coordinates |
| 17 | sovereignty | Cryptographic ownership chains |

Each type implements: `validate`, `mutate`, `crossover`, `distance`, `canonicalize`, `repair`.

**Implementation:** `src/lib/kernel/gene_system.ts` (⚠️ ~10 of 17 types)

## SPEC 03: Kernel

Deterministic kernel (Layer 0) providing:
- Deterministic RNG: `xoshiro256**` + `splitmix64`
- Deterministic JSON canonicalizer (JCS)
- Deterministic hash (SHA-256)
- Deterministic clock (logical time)
- Algebraic effect system (declare effectful operations)

**Implementation:** `src/lib/kernel/rng.ts` ✅, `src/lib/kernel/effects.ts` ⚠️, `src/lib/kernel/tick.ts` ⚠️

## SPEC 04: GSPL Language

Domain-specific language for declaring/breeding/mutating/composing/evolving seeds.

26 keywords: seed, breed, mutate, compose, evolve, grow, export, import, let, fn, if, else, match, for, while, return, true, false, null, type, trait, impl, where, gene, domain, signed

Features: seeds as first-class, deterministic by construction, type-safe genes, pipe operator `|>`, `@gpu` annotation for WGSL.

**Implementation:** `src/gspl/` (⚠️ ~70% spec coverage)

## SPEC 05: Sovereignty

ECDSA P-256 signing with RFC 6979 deterministic nonces. Signatures live inside the seed itself.

- `sign(seed, privateKey)` → signed seed
- `verify(seed, publicKey)` → boolean
- Per-gene sovereignty with license declarations
- C2PA Content Credentials on export

**Implementation:** `src/lib/sovereignty/` (⚠️ Partial, endpoints exist)

## SPEC 06: .gseed Binary Format

Binary interchange format: magic bytes `GSEED`, version, hash algorithm, content hash (32 bytes), signature (64 bytes), Zstd-compressed canonical JSON payload.

**Implementation:** Not yet implemented in main repo.

## SPEC 07: Determinism

Hard guarantee: same seed + same engine version = bit-identical output across CPU architectures, OS, browsers, and wall-clock time.

7 test categories: self-replay, cross-platform, browser parity, mutation determinism, breeding determinism, round-trip, engine version sensitivity.

**Threats:** Wall clock, Math.random(), fp precision, GPU scheduling, hash iteration order, locale, network I/O, filesystem I/O, threading, engine version drift.

**Implementation:** `tests/determinism/` (planned, not yet created)

---

## ADR SUMMARIES

| ADR | Title | Decision | Status |
|-----|-------|----------|--------|
| 001 | Deterministic Kernel | Build thin deterministic kernel as Layer 0 | Accepted |
| 002 | JCS Canonicalization | RFC 8785 JCS for deterministic seed hashing | Accepted |
| 003 | xoshiro256** RNG | xoshiro256** + SplitMix64 seeding | Accepted |
| 004 | ECDSA P-256 Signing | ECDSA P-256 with RFC 6979 deterministic nonces | Accepted |
| 005 | GSPL as Pure Language | GSPL is a pure, deterministic language | Accepted |
| 006 | Domain Engine Pattern | All engines share staged pipeline interface | Accepted |
| 007 | MAP-Elites Default | MAP-Elites is default evolution algorithm in Studio | Accepted |
| 008 | Functor Composition | Category-theoretic functors for cross-domain mapping | Accepted |
| 009 | .gseed Binary Format | Binary format with Zstd compression + ECDSA | Accepted |
| 010 | Fastify/Postgres Stack | Fastify + Postgres for production backend | Accepted |
| 011 | C2PA Compliance | Embed C2PA Content Credentials on export | Accepted |
| 012 | Full-Capacity Agent | 6-stage agent with 8 sub-agents, tools, memory | Accepted |

---

*For full spec and ADR documents, see `C:\Users\11vat\Desktop\PAradigm-reference`*
