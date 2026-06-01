# If We Vanish Protocol

**Status:** Canonical. Part of Doctrine v2.

## The Pledge

If the primary custodians of Paradigm (the people who can still push to the canonical repo and sign releases) become unavailable for more than 90 days, the following becomes automatically true:

1. The repository is considered abandoned.
2. Any fork that passes the full Verification Ladder (see 13b_Phase_Gates.md) may declare itself the new canonical continuation.
3. All existing sovereign seeds, signatures, and lineage remain valid forever — the new canonical may not rewrite history.
4. The economic substrate (royalties, PARA token claims, SeedNFT ownership) continues on whatever chain the last signed release targeted, or migrates via the signed federation protocol if the original chain is dead.

## Bus Factor Mitigation

- At least 3 independent signers must control the release keys at all times.
- The full source + golden corpus + agent reproducibility harness must be mirrored to at least two independent immutable stores (IPFS + Arweave at minimum).
- This document and the current list of custodians must be part of every major release.

## Fork Succession

A fork may claim succession only if it:
- Passes all 8 pre-flight gates with 0 unwaived violations.
- Publishes a signed statement containing the hash of the last known good canonical commit.
- Maintains the "if we vanish" pledge in its own docs.

Last updated: 2026-05-31 (Doctrine v2 session)
