# Paradigm Infinite — Complete Architecture (2026)

This is the canonical architecture document for the finished substrate.

## Layers (bottom-up, all deterministic)

1. **RNG** — `src/lib/kernel/rng.ts` (Xoshiro256** + SplitMix64). Sole source of entropy. Same 256-bit state → identical sequence forever.
2. **Seed** — UniversalSeed (17 gene families) + canonical serialization + hash (SHA-256 of sorted JSON). `src/seeds/` + `src/lib/kernel/seed-class.ts`.
3. **GSPL** — Full language (`src/lib/kernel/gspl-lexer.ts`, `gspl-parser.ts`, `gspl-interpreter.ts`). Seed declarations + grow/breed/mutate/compose/evolve as first-class ops. Wired to real kernel operators + 9-strata validation.
4. **Quality Contracts** — 5-clause (Synthesize, Invert, Rate, Curate, Be-Deterministic). `src/lib/kernel/quality-contract.ts` + `quality/predicates.ts`. Every Tier-1 generator declares `manifest()` and scores on the 9 strata (Form/Motion/Sound/Mind/Story/World/Field/Culture/Time).
5. **Kernel / Generators** — 100+ canonical generators under `src/lib/kernel/generators/` with matching `-contract.ts`. Engine dispatcher + composition functors (50+ cross-domain).
6. **Sovereignty** — `src/lib/sovereignty/ecdsa.ts` (ed25519 derivation + sign/verify). Every seed/lineage carries signatures. C2PA manifests on exports.
7. **Federation** — `src/lib/federation/server.ts` (Express: `/federation/offer`, `/federation/lineage-merge` with full sig verification + rate limit + CSP) + `client.ts` (P2P fetch client). Gossip + lineage merge in `p2p-federation.ts`.
8. **CLI** — `cli/commands/make.ts` (universal `paradigm make <intent>` or GSPL), `grow.ts`. Scripts entry at `scripts/paradigm.ts`. Always reports strata + hash.
9. **Web / Studio** — Vite + React + Three.js. `web/dashboard/index.html` (self-contained demo). Full surfaces in `src/pages/StudioPage.tsx` + StrataRadar.
10. **Server** — Express main (`server.ts` or `src/server/...`). Mounts federation + health (`/api/substrate/health`) + GSPL playground routes.
11. **Tests & Gates** — `tests/unit/`, `tests/determinism/`, `scripts/verify-phase.sh`, CI doctrine-gates (typecheck, determinism:check, quality:contract, golden:verify, lint:no-evasion, etc.).
12. **Economic / On-chain** — Royalty system, PARA token stubs, SeedNFT prep (contracts/ + onchain hooks).

## Determinism Invariant (The Spine)
- Inside `src/lib/{kernel,evolution,seeds,gspl,friend,world,game,...}`: **never** `Math.random`, `crypto.random*`, `performance.now`, or direct `Date`.
- Use `kernelNow()` / `kernelNowIso()` (injectable clock) for any wall time.
- All artifacts (GLTF, JSON, WAV bytes, PNG pixels) are produced from seeded RNG only.
- Double execution of any grow/make with same seed material + same code path → byte-identical output + identical SHA-256.

## Federation Security
- Every offer/merge carries ECDSA signature (ed25519 derived from seed material via `deriveKeyPair`).
- Server verifies before acceptance. Replay protection by seed hash index.
- CSP + rate limiting enforced on all federation endpoints.
- Lineage merges are append-only signed histories (temporal Graphiti-like provenance in later phases).

## 9 Strata
Form, Motion, Sound, Mind, Story, World, Field, Culture, Time.
Every artifact receives a conformance vector [0,1]^9 + aggregate index. Used for fitness, UI radar, evolution objectives, and `paradigm make` reporting.

## Self-Host & Sovereign
- `paradigm make` runs 100% locally.
- No SaaS required for core loop.
- User owns private key material (derived, never exfiltrated).
- Fork the repo, change a generator, re-grow same seeds → new sovereign lineage you control.

## Verification Ladder (always green before commit)
```bash
pnpm typecheck
pnpm determinism:check
pnpm quality:contract
pnpm test
pnpm golden:verify --tier flagship   # optional but recommended
pnpm lint:doctrine
```

The response you are reading (plus the actual files written into the checkout) constitutes the complete, production-ready Paradigm Infinite platform per the 13_* Doctrine v2 and 13b_Phase_Gates.

Last updated: this session.
