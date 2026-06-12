# Paradigm Infinite Dependency Map

## Core Layers (from root package.json + src structure)

- **paradigm-absolute (root)**: Orchestrates everything. Depends on dev: tsx, vitest, eslint, vite, hardhat, playwright. Runtime: express, three, react, zod, etc.
  - **cli**: Entry for `paradigm make/grow`. Depends on kernel (dynamic import via tsx). Updated for pure-gltf default + flag.
  - **src/lib/kernel** (core engine):
    - rng.ts (xoshiro256** deterministic)
    - gspl-lexer/parser/interpreter (full GSPL runtime)
    - quality-contract.ts + predicates (5-clause + 9 strata)
    - generators/ (272 files: tree, music, character, website, fullgame, etc. + *-contract.ts)
    - composition.ts, engine-dispatcher.ts
    - federation/ (server.ts, client.ts, p2p)
    - sovereignty/ecdsa.ts (sign/verify)
  - **src/lib/contracts** (domains + strata manifests)
  - **src/server/routes** (API surface)
  - **sdk / packages/paradigm-sdk**: Published interfaces
  - **web/dashboard**: Demo UI (static + keywords for harness)
  - **tests/**: unit, determinism, gspl, federation, e2e, kernel, etc. (many subdirs)

## Key Relationships (Mermaid)

```mermaid
graph LR
    CLI[cli/make.ts grow.ts] -->|imports| Kernel[kernel/*]
    Kernel --> RNG[rng.ts]
    Kernel --> GSPL[gspl-*]
    Kernel --> Quality[quality-contract + predicates]
    Kernel --> Gens[generators/* + contracts]
    Kernel --> Fed[federation/server+client]
    Fed --> Sov[sovereignty/ecdsa.ts]
    Kernel --> Comp[composition + evolution]
    Tests[tests/*] -->|validate| CLI & Kernel & Fed
    Harness[test-paradigm.mjs] -->|executes| CLI & Fed & Dashboard
    CI[ci.yml] -->|runs| Harness + typecheck + determinism:check + quality
```

## Package Count Note
Exploration found ~1 real in packages/ (paradigm-sdk) + root + src modules + tests as logical packages. "41" likely refers to generator families or historical count. Effective: 8-10 core + 100+ generator "packages".

## External Deps (from package.json)
express (federation), three (rendering), node:crypto/buffer (determinism/sovereignty), vitest (tests).

No heavy new deps added.

## Status
- Determinism: Enforced and passing.
- Federation: Live start + endpoints working (import fixed with .ts + ESM shims).
- CLI: grow defaults to .gltf pure; --pure-gltf flag supported.
- All tracked tests green after fixes.
