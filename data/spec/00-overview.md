# 00 — Overview

## The Core Thesis

Every digital creation tool on the market today treats artifacts as the **output** of a creative process. You open Photoshop, you make an image, you save an image. You open Unity, you assemble a game, you export a build. You prompt Midjourney, you receive an image. The artifact is the terminus.

Paradigm inverts this. In Paradigm, the **seed** is the primary object and the artifact is a *projection* of it. A seed is a typed, signed, deterministic genetic blueprint. Running a seed through a domain engine's developmental pipeline produces an artifact — but the seed persists, can be bred with other seeds, can be mutated, can be evolved in populations, can be composed across domains, and can be signed with cryptographic sovereignty. The artifact is replayable, forkable, and recombinable in ways that files simply cannot be.

This shift — from *artifact-primary* to *seed-primary* — is what enables everything else: breeding, lineage, sovereignty, marketplace royalties, cross-domain composition, super-linear network effects, and the mathematical moat of the Fisher Information seed manifold.

## Why This Matters

### 1. Reproducibility by Construction

Same seed + same deterministic RNG + same engine version = bit-identical artifact on any machine, forever. This is a guarantee, not a best effort. Every piece of randomness in the pipeline is derived from the seed's content hash via `xoshiro256**` seeded through `SplitMix64`. No `Math.random()`, no wall clock, no network time. If a seed produces an image today, it will produce the same image in 2050 on a machine that did not exist when the seed was created.

### 2. Breeding Instead of Prompting

Because artifacts come from seeds, you can combine two seeds into a new seed whose genes are a deterministic crossover of the parents', run that through the engine, and get a new artifact that is provably a descendant of both. You can do this across 26 domains. You can do it in populations of thousands. You can run it for generations. You can measure behavioral diversity with MAP-Elites. You can optimize with CMA-ES. Prompting is one-shot. Breeding compounds.

### 3. Lineage as a First-Class Object

Every seed carries its complete ancestry. Not a reference to it — the ancestry lives inside the seed as a list of parent hashes. This means the *provenance* of an artifact is as portable as the artifact itself. When a buyer purchases a seed from the marketplace and breeds it into something new, the royalty calculation propagates backward through the lineage chain automatically, paying every ancestor's sovereign author with diminishing per-generation rates. The lineage is mathematical, not social.

### 4. Cryptographic Sovereignty Without Blockchain

Every seed is signed by its author with an ECDSA P-256 key, and the signature lives *inside* the seed itself. Verification is stateless: `verify(seed.signature, seed.hash, seed.author_pubkey)`. No chain, no gas, no mining, no reliance on a central registry. Signatures compose: a child seed produced by breeding carries the signatures of both parents, and the child's own signature commits to that. An entire genealogy can be verified without any network access.

### 5. Cross-Domain Composition via Category Theory

A character seed can become a sprite, a song, a simulation, or a full game — because there are pre-registered **functor bridges** between domains that define gene-to-gene correspondences and artifact-to-artifact correspondences, with coherence scoring to tell you how well the composition worked. Nine bridges ship by default: `character→sprite`, `character→music`, `character→fullgame`, `procedural→fullgame`, `music→ecosystem`, `physics→fullgame`, `visual2d→animation`, `narrative→fullgame`, `terrain→fullgame`. The category-theoretic framing means compositions obey laws (associativity, identity) that can be verified by property tests.

### 6. Super-Linear Network Effects

With 26 domains and N seeds per domain, the number of possible breeding pairs scales as C(26·N, 2), and the number of cross-domain compositions scales with the number of valid functor paths between domains. A library of one million seeds yields on the order of 13 trillion breeding pairs. Every seed added to the library increases the value of every existing seed. Traditional asset marketplaces have linear network effects; Paradigm has combinatorial ones.

## How the Pieces Fit

```
                       ┌───────────────────┐
                       │   GSPL Program    │
                       │    (source)       │
                       └─────────┬─────────┘
                                 │ lex → parse → typecheck
                                 ▼
                       ┌───────────────────┐
                       │      AST          │
                       └─────────┬─────────┘
                                 │ interpret / compile
                                 ▼
                       ┌───────────────────┐      ┌──────────────────┐
     (alt. entry)  ──▶ │  UniversalSeed    │ ◀─── │   GSPL Agent     │
   (natural language)  │  (signed, hashed) │      │  (NL → seed)     │
                       └─────────┬─────────┘      └──────────────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │    Domain Engine  │
                       │   (8-phase tick,  │
                       │  developmental    │
                       │    pipeline)      │
                       └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │     Artifact      │
                       │  (2D/3D/audio/    │
                       │   game/narrative) │
                       └─────────┬─────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
      ┌──────────┐        ┌──────────┐         ┌──────────┐
      │ Renderer │        │  Export  │         │  Evolve  │
      │  (r3f,   │        │  (glTF,  │         │  (GA,    │
      │  WebGPU) │        │   USD,   │         │  MAP-E,  │
      │          │        │   WAV)   │         │  CMA-ES) │
      └──────────┘        └──────────┘         └──────────┘
```

Two entry points, one substrate, one projection, three exit points.

## What Paradigm Is Not

- **Not a generative model.** Paradigm does not train a neural network to produce pixels. It runs deterministic developmental pipelines over typed genes. LLMs are used *only* at the intelligence layer — to translate natural language into seeds — not to produce artifacts directly.
- **Not a blockchain.** Sovereignty is cryptographic but stateless. No chain, no token, no gas, no central registry. Signatures are self-contained in the seed.
- **Not a prompt wrapper.** The GSPL Agent uses LLMs to parse intent, but the artifact itself comes from the domain engine's deterministic pipeline, not from an LLM output. This is what enables reproducibility and lineage.
- **Not an asset marketplace.** Paradigm has a marketplace, but the unit of trade is a *breedable, evolvable seed*, not a static asset. Every purchase enables downstream breeding, which triggers royalties backward through lineage.
- **Not a game engine.** Unity and Unreal assemble static assets into scenes. Paradigm grows seeds into complete playable games via the FullGame domain engine, and those games can be bred with other games.

## Scope of This Reference

This repository specifies **what Paradigm is** in enough detail for a capable AI agent to rebuild it from first principles. It does *not* mandate implementation languages, libraries, or deployment topologies beyond those choices that are load-bearing for determinism or interoperability (e.g., the RNG algorithm, the canonicalization procedure, the signature algorithm, the `.gseed` format).

The existing production codebase — 182,471 lines of TypeScript — is mirrored into [`/codebase`](../codebase/) as a **reference implementation**, not as a prescription. A clean rebuild in a different language is a perfectly valid outcome of reading this reference, provided the rebuild matches the deterministic and cryptographic contracts in [`spec/`](.).

## Next Steps in the Spec

1. [`01-universal-seed.md`](01-universal-seed.md) — the atomic data structure.
2. [`02-gene-system.md`](02-gene-system.md) — the 17 gene types with operators.
3. [`03-kernel.md`](03-kernel.md) — determinism, tick cycle, effects.
4. [`04-gspl-language.md`](04-gspl-language.md) — the language spec.
5. [`05-sovereignty.md`](05-sovereignty.md) — cryptographic identity.
6. [`06-gseed-format.md`](06-gseed-format.md) — binary file format.
7. [`07-determinism.md`](07-determinism.md) — the guarantees and how to preserve them.
