# Paradigm Infinite — Developer & User Guide

**Paradigm Infinite** is a deterministic, sovereign, self-hosting Digital Creation Reality OS powered by GSPL (Generative Seed Programming Language).

Every artifact (GLTF 3D, UI, game scenes, audio, JSON, etc.) is a **seed** that produces **bit-identical output** given the same seed material + kernel.

## Quick Start (CLI)

```bash
# From repo root
pnpm paradigm:make "a cybernetic tree that sings" --seed="myseed42" --domain=tree --pure-gltf

# Or grow (defaults to pure GLTF now)
pnpm paradigm:grow --seed="myseed42" --domain=tree

# Output:
# PURE_GLTF: artifacts/tree_myseed42.gltf
# HASH: <sha256 of result or pure artifact>
# CONFORMANCE: 0.70xx
```

Flags:
- `--seed=...` : Deterministic seed material (string).
- `--domain=tree|music|...` : Target domain.
- `--pure-gltf` : Force clean GLTF export (make only; grow defaults to it).
- `--format=gltf` : Output format.

## Architecture (Mermaid)

```mermaid
graph TD
    CLI[paradigm make / grow] --> Kernel[GSPL Interpreter + RNG + Quality Contracts]
    Kernel --> Generators[200+ Domain Generators + *-contract.ts]
    Kernel --> Strata[9-Strata Conformance: Form, Motion, Sound, Mind, Story, World, Field, Culture, Time]
    Kernel --> Federation[Federation Server + Client + ECDSA]
    Federation --> Sovereignty[ecdsa.ts - deriveKeyPair, signSovereign, verifySovereign]
    CLI --> Artifacts[artifacts/*.gltf + *.gltf.json (hashable)]
    Web[web/dashboard] --> CLI
    Tests[test-paradigm.mjs] --> All
```

## Seed Lifecycle
1. Intent / GSPL → `paradigmMake` / `paradigmGrow`
2. Seeded RNG (xoshiro256**) + generator
3. 9-strata scoring + hash
4. Sovereign signature (optional)
5. Federation offer / lineage-merge (signed)
6. Pure artifact export (deterministic bytes)

## Federation
```bash
# Terminal 1
pnpm exec tsx src/lib/federation/server.ts   # listens on 8787

# Terminal 2 (or via client)
node -e '
  // see src/lib/federation/client.ts quickOffer
'
```

Endpoints:
- POST /federation/offer {seed, signature, fromNode}
- POST /federation/lineage-merge {records[], fromNode}

All messages carry ECDSA signatures (ed25519 derived from seed material).

## Determinism Guarantee
Same seed material + same code = identical artifact bytes + identical SHA256.

Verified by:
- `pnpm determinism:check` (source boundary)
- `node test-paradigm.mjs` (end-to-end grow twice + file hash)
- Pure GLTF: `tree_<seed>.gltf`

## Running the Full Validation Harness

```bash
node test-paradigm.mjs
```

It covers:
- CLI make/grow (with pure GLTF)
- Bit-identical hashes
- Quality contracts
- Federation live (health + signed offer/merge)
- Dashboard content
- GLTF structure validation
- Core gates (typecheck, determinism:check, tests)

## CI/CD
See `.github/workflows/ci.yml` (enhanced with e2e-paradigm job that runs the harness + pure GLTF validation).

## Onboarding for New Domains
1. Add generator in `src/lib/kernel/generators/<domain>.ts`
2. Add matching `<domain>-contract.ts` implementing the 5-clause QualityContract + strata.
3. Wire in engine-dispatcher or composition.
4. Add test seeds to golden corpus.
5. Update CLI help / docs if new top-level domain.

## Examples
- 3D / GLTF: tree, character, architecture, vehicle
- UI / Web: website, ui, app
- Game / Narrative: fullgame, narrative, boardgame
- Audio: audio, music, acoustics
- Others: 100+ (see generators/)

All produce deterministic, hash-verifiable outputs.

## Production Readiness
- TypeScript strict
- Determinism enforced at lint + runtime
- Sovereign (ECDSA, no SaaS dependency for core loop)
- Self-hostable (CLI + local server + static dashboard)
- Auditable lineage via signed federation

**The kernel never lies.**

---

*Maintained as part of Paradigm Infinite completion (2026 session).*
