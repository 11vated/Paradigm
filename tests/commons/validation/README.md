# Seed Commons Validation Suite

Six deterministic checks every artifact in `seed-commons/` must pass before it can be merged. Together they enforce the 8-point commons contract and the lineage guarantees from `spec/05-sovereignty.md` and `spec/06-gseed-format.md`.

## The 6 checks

| # | Check | Script | Fails if… |
|---|---|---|---|
| 1 | **Grow determinism** | `determinism.ts` | Two grow passes produce non-identical `.gseed.json` bytes. |
| 2 | **Signature + canonicalization** | `signature.ts` | Payload does not canonicalize via JCS (RFC 8785), SHA-256 hash mismatches, or ECDSA-P256 verify fails. |
| 3 | **Grow round-trip** | `grow.ts` | `.gspl` source does not compile, does not type-check, or produces a payload that fails schema validation. |
| 4 | **Commons contract lint** | `commons-lint.ts` | Seed lacks a sovereignty gene, lacks a quality_vector, declares no license, uses a non-kernel gene, or references an unknown parent. |
| 5 | **Lineage graph integrity** | `graph.ts` | Lineage parents reference unknown seeds, form cycles, or mismatch the declared module imports in the source. |
| 6 | **Replay equivalence** | `replay.ts` | Replaying a recorded session's tool receipts produces a seed whose hash differs from the archived one. |

Checks 1, 2, 3, and 4 are **mandatory** on every PR. Check 5 runs against the whole commons after merge (incremental walk from the new nodes). Check 6 runs nightly.

## Why these six

- **Determinism** is the output contract of `gspl-agent-full-capacity.md`. If it doesn't hold, the agent cannot be trusted.
- **Signature + canonicalization** pins the repo to ADR-009: SHA-256 over JCS + RFC 6979 ECDSA-P256. Any drift to BLAKE3, raw ECDSA, or any other canonicalization fails here.
- **Grow round-trip** catches schema rot as `spec/02-gene-system.md` evolves.
- **Commons-lint** enforces the 8-point contract from `seed-commons/README.md`.
- **Lineage graph** prevents orphan seeds and malicious parent spoofing.
- **Replay equivalence** is the only test that proves the agent runtime in `intelligence/tool-layer.md` actually achieved determinism in the wild.

## Running locally

```bash
cd gspl-reference
deno task commons:validate                          # all six checks
deno task commons:validate -- --only determinism    # single check
deno task commons:validate -- --path seed-commons/inventories/lighting/
```

The default runner is Deno because the scripts import only standard libs and the GSPL compiler WASM build, so there is no `node_modules` to manage. A Rust port of the runner lives under `tools/commons-validator-rs/` for users who prefer a single static binary (matches the agent runtime's Rust stack).

## CI integration

GitHub Actions wiring lives at `.github/workflows/commons-ci.yml` and runs on every PR that touches `seed-commons/`. The workflow gates merge on checks 1–4; checks 5 and 6 are reported as annotations but do not block, per `STRATEGIC_GAP_AUDIT.md` P0-4.

## Script contracts

Each script is a pure Deno module that:

1. Reads a `.gspl` or `.gseed.json` path from argv.
2. Returns `exit 0` on pass, non-zero on fail.
3. Writes a structured JSON report to stdout (the CI parses it for annotations).
4. Never touches the network.
5. Never writes outside `$TMPDIR`.

All scripts share `_shared/canonical.ts` for JCS canonicalization and `_shared/gspl.ts` for the compiler WASM handle.
