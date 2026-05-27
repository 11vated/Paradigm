# Paradigm Infinite

> **Deterministic synthetic-content substrate with sovereign provenance.**
> One seed in. The same artifact out, every time. Forever.

Paradigm is the operating substrate for digital creation. Every artifact is a *seed* — a deterministic, signed, license-attached, lineage-tracked genome. The same seed and the same code always produce the same artifact, bit-for-bit, on every machine, today and a decade from now. Forks pay back their ancestors. Sales return a dividend to every creator in the lineage. No central server. No platform tax. No silent rewrite.

This repo is the canonical implementation.

- **Doctrine:** [`Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`](Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md)
- **Phase Gates:** [`Documents/Paradigm-Analysis/13b_Phase_Gates.md`](Documents/Paradigm-Analysis/13b_Phase_Gates.md)
- **Anti-fragility protocol:** [`docs/anti-fragility/if-we-vanish.md`](docs/anti-fragility/if-we-vanish.md)
- **Session log:** [`Documents/Paradigm-Analysis/14_Phase0_Doctrine_v2_Session_Log.md`](Documents/Paradigm-Analysis/14_Phase0_Doctrine_v2_Session_Log.md)

---

## See it in 60 seconds

```bash
bun install
bun run dev
```

Then open:

| URL | What it is |
| --- | --- |
| [`/`](http://localhost:3000) | Reality OS three-pane studio |
| [`/genesis`](http://localhost:3000/genesis) | **Hero loop** — your unique signed seed in <1s |
| [`/atlas`](http://localhost:3000/atlas) | The whole substrate as a constellation (1,030 seeds, panable / zoomable) |
| [`/explore`](http://localhost:3000/explore) | The public commons corpus, filterable / searchable |
| [`/substrate`](http://localhost:3000/substrate) | Single seed lensed across nine substrate strata |

Or from the CLI:

```bash
bun run cli/paradigm.ts make "a melancholy bard with a lute"
# → byte-identical output, every time. Provenance + license + cost in the manifest.

bun run cli/paradigm.ts bench "stress test the substrate" --runs 5
# → PASS bench: mean=6.93ms  p95=30.04ms  byteStable=true
```

---

## The thesis, in one test

[`tests/integration/end-to-end-loop.test.ts`](tests/integration/end-to-end-loop.test.ts) proves the full economic loop in a single file:

1. **Operator A** runs `paradigm make` → produces a signed seed.
2. **Operator A** publishes to its federation peer-store.
3. **Operator B** pulls from A via `/api/federation/objects/:hash` — verifies hash + ECDSA signature client-side.
4. **B** forks the seed; lineage is preserved across the operator boundary.
5. A sale of B's fork triggers `computeLineageRoyalty` — A receives an ancestor payout depth-walked from the lineage.
6. The same sale contributes to the civilizational dividend pool that returns to every participant.

No central server is involved at any step.

```bash
bun run vitest tests/integration/end-to-end-loop.test.ts
# 6/6 pass — "THE THESIS: deterministic make → federated transfer → lineage-anchored payout, no central party"
```

---

## What's actually shipped

**516+ tests passing across 42 test files.** 0 typecheck errors. 0 determinism-lint violations across 389 files in determinism-critical roots. The full suite runs in under 20 seconds.

### Substrate — the kernel

| Layer | Status | Source |
| --- | --- | --- |
| Deterministic kernel (Xoshiro256**, injected clock, no entropy leaks) | ✓ | `src/lib/kernel/` |
| Seed / Gene system (sign, mutate, breed, export, replay) | ✓ | `src/lib/kernel/engines.ts` + 130 generators |
| Generative Seed Programming Language (lexer / parser / interpreter / REPL) | ✓ | `src/lib/gspl/` |
| Evolution layer (GA, CMA-ES, MAP-Elites, novelty, NSLC, POET, …) | ✓ | `src/lib/evolution/` |
| Cross-domain composition (252 functors over 27 canonical domains) | ✓ | `src/lib/composition/` |
| Inverse pipeline (6 inverters) | ✓ | `src/lib/inverse/` |
| Nine stratum contracts with real predicate bodies | ✓ | `src/lib/contracts/` |
| Quality Contract registry + Stratum manifests on every generator | ✓ | `src/lib/kernel/quality-contract.ts` |
| Sovereignty (ECDSA-P256 signing, ERC-721 anchor, C2PA manifests) | ✓ | `src/lib/sovereignty/` |
| In-memory federation peer-store with content-addressed objects | ✓ | `src/lib/intelligence/federation/peer-store.ts` |
| Intelligence stack: 17 sub-agents, 4 memory layers, 5 LLM providers | ✓ | `src/lib/intelligence/` |

### Economic substrate

| Engine | What it does | Source |
| --- | --- | --- |
| **Lineage royalty** | Depth-walking ancestor payouts; geometric decay; cent-exact reconciliation | `src/lib/kernel/lineage-royalty.ts` |
| **Seed license** | Seven canonical license archetypes; signed by custodian; ride inside federation payload | `src/lib/kernel/seed-license.ts` |
| **Seed cost** | License + royalty composed; the marketplace primitive | `src/lib/kernel/seed-cost.ts` |
| **Civilizational dividend** | Epoch-based pro-rata pool that pays every distinct lineage participant | `src/lib/kernel/civilizational-dividend.ts` |

### Public HTTP APIs

```
GET  /api/genesis/:shortHash                     hero loop seed permalink
POST /api/genesis                                allocate a new genesis (deterministic from session)
POST /api/genesis/:shortHash/fork                fork with lineage preserved

GET  /api/atlas?domains=&limit=                  whole-substrate constellation (deterministic layout)
GET  /api/atlas/health                           layout-hash byte-stability check

GET  /api/commons                                paginated browse over 1,030 commons seeds
GET  /api/commons/seeds/:id                      full seed body + provenance
GET  /api/commons/stats                          per-domain stats for filter UI

GET  /api/federation/info                        peer identity + capabilities + head hash
GET  /api/federation/manifest                    paginated list of hosted contentHashes
GET  /api/federation/objects/:contentHash        fetch one object (verify client-side)

POST /api/royalty/compute                        lineage-walked royalty manifest
POST /api/license/build                          build a structured license
POST /api/license/evaluate                       evaluate allowed / requirements / royalty for a use
POST /api/seed/cost                              composed marketplace verdict

POST /api/dividend/epoch                         open a dividend epoch
POST /api/dividend/epoch/:id/add                 add a sale's royalty manifest
POST /api/dividend/epoch/:id/close               close the epoch and produce the distribution
GET  /api/dividend/epoch/:id                     epoch status + distribution if closed

GET  /api/substrate/health                       Substrate Health Dashboard
GET  /api/substrate/health/strata                per-stratum predicate coverage index
POST /api/substrate/health/report                CI reporters publish preflight summaries here
GET  /api/substrate/health/reports               recent reports
```

### CLI

```
paradigm make "<intent>" [--out DIR] [--dry-run] [--json]
paradigm bench "<intent>" [--runs N] [--budget-ms N] [--json]
paradigm grow <domain> [--genes k=v…] [--out DIR]
paradigm gspl <file.gspl>
paradigm domains
paradigm play <friend> <world>
```

`paradigm make` is **deterministic by construction**: bit-identical artifact across runs given the same intent. `paradigm bench` enforces the Studio GA exit gate (first artifact under 60 seconds — empirically << 1 second on the substrate today).

---

## Doctrine progress

The roadmap is the 24-phase plan in `13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`. As of this commit:

| Phase | Status |
| --- | --- |
| 0 — Doctrine substrate (gates, contracts scaffold, dashboard, waiver registry) | ✓ shipped |
| 1 — Server / type / determinism cleanup | 🟡 partial (29% of `as any` debt cleared; 132 contracts mass-migrated) |
| 2 — Canonical generator collapse | ⏸ deferred per audit (`09_Canonical_Rename_Audit_Catalog.md`) |
| 3 — Stratum contract bodies (9/9 strata) | ✓ complete |
| 11 — Studio GA cold-start gate | ✓ shipped (`paradigm bench`) |
| 12 — Public hero loop | ✓ shipped (Genesis Experience) |
| 13 — Maker CLI GA | ✓ shipped (`paradigm make`, deterministic in CI) |
| 14 — Public corpus browser | ✓ substrate shipped (API + UI) |
| 16 — Federation v1 | ✓ shipped (two-operator exchange, lineage preserved) |
| 17 — Lineage royalties at depth | ✓ shipped |
| 18 — Universe licensing | ✓ shipped (7 archetypes, signed, federation-portable) |
| 19 — Civilizational dividend | ✓ shipped |
| 20 — Marketplace primitive | ✓ v0 shipped (`/api/seed/cost`) |
| 23 — OS shell substrate | ✓ v0 shipped (The Atlas) |
| 15, 21, 22, 24 | ⏳ pending |

The **end-to-end economic thesis is proven** by `tests/integration/end-to-end-loop.test.ts` and exercises every shipped phase together.

---

## Doctrine guarantees (always-on, machine-enforced)

```bash
bun run scripts/lint-determinism.ts        # 0 violations across 389 files
bun run scripts/lint-canonical-rename.ts   # banned sibling-suffix guard
bun run scripts/lint-no-evasion.ts         # @ts-nocheck / @ts-ignore / as any / bare-catch guard
bun run scripts/preflight-report.ts        # full pre-flight, emits JSON, optional POST to dashboard
```

Any waiver from these gates must be filed in [`docs/waivers/registry.json`](docs/waivers/registry.json) with sunset date and named custodian (Doctrine XXIII.2).

---

## Architecture (one diagram)

```
┌────────────────────────────────────────────────────────────────────┐
│                          USER SURFACES                             │
│  /genesis   /atlas   /explore   /substrate   Studio   CLI         │
└──────┬───────────────────────────────────────────────────────┬─────┘
       │                                                       │
       │                Public HTTP API                        │
       ▼                                                       ▼
┌────────────────────────────────────────────────────────────────────┐
│  ECONOMIC SUBSTRATE                                                │
│   Royalty  ─►  License  ─►  Cost  ─►  Dividend                    │
└──────┬───────────────────────────────────────────────────────┬─────┘
       │                                                       │
       ▼                                                       ▼
┌────────────────────────────────────────────────────────────────────┐
│  STRATUM CONTRACTS (9)                                             │
│   form  motion  sound  mind  story  world  field  culture  time   │
└──────┬───────────────────────────────────────────────────────┬─────┘
       │                                                       │
       ▼                                                       ▼
┌────────────────────────────────────────────────────────────────────┐
│  KERNEL                                                            │
│   Seeds · Genes · Lineage · GSPL · Evolution · Inverse · Sigs     │
│   Xoshiro256**  ·  Injected clock  ·  No entropy leaks            │
└──────┬───────────────────────────────────────────────────────┬─────┘
       │                                                       │
       ▼                                                       ▼
┌────────────────────────────────────────────────────────────────────┐
│  FEDERATION                                                        │
│   Content-addressed peer-store  ·  Client-side trust              │
│   /api/federation/info  +  /objects/:hash  +  /manifest           │
└────────────────────────────────────────────────────────────────────┘
```

---

## Sovereignty bet

If we vanish, the substrate keeps working. The [`docs/anti-fragility/if-we-vanish.md`](docs/anti-fragility/if-we-vanish.md) doctrine documents how any external operator takes over: clone the repo, run `bun install && bun run dev`, point a peer at any active operator's `/api/federation/info`, and the network continues. Every artifact is content-addressable, every seed is signed by its author, every lineage is verifiable from the data alone. No license server, no auth provider, no platform key.

---

## License

This repository is dual-licensed under MIT (code) and CC-BY-SA-4.0 (commons seeds). Individual artifacts produced by the substrate carry their own license under the seed-license schema (`src/lib/kernel/seed-license.ts`).

---

*Paradigm Infinite is built in the open at [github.com/11vated/Paradigm](https://github.com/11vated/Paradigm).*
