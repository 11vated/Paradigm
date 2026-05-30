# If We Vanish — Paradigm Anti-Fragility Protocol

**Status:** Canonical (Doctrine v2 Part XXI.3).  
**Owner:** Sovereignty Custodian + Kernel Custodian (quorum for changes).

This document describes how an external operator or community can take over the Paradigm substrate if the originating organization (or all current custodians) disappear.

The goal is **sovereignty by design**, not by trust.

---

## 1. Kernel Repository Mirrors

The canonical kernel lives at:
- Primary: https://github.com/11vated/Paradigm (or successor org)
- Required mirrors (must be maintained by custodians):
  - At least one independent GitHub org or self-hosted GitLab instance under a different legal entity.
  - IPFS or Arweave content-addressed snapshot of the `main` branch + all release tags (scripted in `scripts/mirror-to-ipfs.sh` or equivalent).

If the primary disappears:
1. The most recent signed release tag is the recovery root.
2. Any operator can `git clone` from a mirror and continue development under the irrevocable fork-permissive license (see LICENSE + Fork Pledge in Doctrine XXI.1).

---

## 2. Key Escrow & Recovery

- Operator signing keys for Federation are **local-only by default** (Doctrine IX.13). There is no central SSO that can be revoked.
- For high-value Civilization / treasury keys (if they exist at the time of vanishing):
  - Shamir's Secret Sharing (or equivalent) split among the Operator Council (Part XVIII.4) with a published threshold (e.g., 3-of-5).
  - The split is published in encrypted form in the repo (or on a well-known IPFS CID) with instructions.
  - Recovery requires the surviving council members + public verification that the threshold was met.

No single custodian (or the original organization) can unilaterally control the substrate after a vanishing event.

---

## 3. Civilization Governance Handoff

- `CivilizationSeed` (Part X.4) is a public, content-addressed artifact.
- Governance rules + dividend distribution logic are encoded in the seed + the on-chain contracts (or signed ledger if off-chain at the time).
- Any operator can fork the CivilizationSeed and continue the lineage. The fork becomes the new canonical if it gathers the majority of active lineage weight (transparent, on-ledger or verifiable log).

The original organization's disappearance does **not** kill the Civilization — it only removes one (optional) steward.

---

## 4. Marketplace Migration Path

If a central marketplace existed:
- All listings, royalties, and operator data are exportable via the public API + `.gseed` packages.
- Operators can stand up their own discovery index (the marketplace is a directory, not a vault — Doctrine XIV.1).
- The Fork Pledge guarantees that no one can be locked out of their own seeds or royalties.

---

## 5. "We Are Gone" Signal + Activation

- A canonical file `.paradigm/vanished` (or a signed message from the last known custodian keys) published to the primary repo + all mirrors is the activation signal.
- Any operator seeing this file (or 90+ days of no activity on the primary + no response on the declared communication channels) may declare themselves a recovery steward by:
  1. Publishing a signed statement to the repo.
  2. Calling a one-time on-chain (or ledger) "steward-claim" function if the contracts support it.
  3. Running the annual handoff drill (Doctrine XXI.2) in public within 30 days.

The first credible recovery steward that passes the handoff drill and gathers lineage weight becomes the new de-facto coordinator — until the next vanishing or election.

---

## 6. What Survives Automatically

- Every `.gseed` ever exported by any operator is sovereign on that operator's machine.
- All lineage, signatures, and royalty configs baked into seeds at fork time continue to function.
- The kernel itself (deterministic, offline-capable) continues to run everywhere it was installed.
- GSPL programs, custom generators, and evolved artifacts are portable by design.

The substrate was never "theirs to turn off."

---

## 7. Communication Channels (at time of writing)

- Primary repo issues + discussions
- Declared Operator Council contact (published in the CivilizationSeed metadata)
- `security@paradigm` (or successor) for vulnerability reports during transition

These channels are advisory. The protocol above works even if all of them go dark.

---

**This is the anti-fragility guarantee.**

Paradigm becomes more sovereign when its originators vanish, not less.

*Land with 13_* Doctrine v2. Update on every annual doctrine review.*