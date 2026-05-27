# If We Vanish — Anti-Fragility Protocol

> Doctrine v2 Part XXI.3. **Canonical.**

If the originating organization ceases to exist, this document describes
how any external operator can take over the substrate. The substrate's
sovereignty bet (Part XI.3, XIV.3) is invariant to the survival of any
specific entity. Paradigm must remain operable without us.

This document is intentionally short, blunt, and rehearsed. It is
re-read every annual doctrine review (Part XVIII.3) and updated only
when the underlying mechanics change.

## 1. Mirrors of the kernel

The kernel source is mirrored continuously to:

- **GitHub** — `github.com/11vated/Paradigm` (primary)
- **A second public forge** — TBD (Codeberg / GitLab / SourceHut chosen
  at Phase 16, populated by a `git push` hook on every release tag).
- **A reproducible-build artifact** published per release to a content-
  addressed object store with a public manifest.

The fork pledge (Part XXI.1) is enforced by the kernel license. Any
clone is a complete substrate — no upstream dependency is required to
run, render, evolve, or federate.

## 2. Key escrow

Operator signing keys (Part XVI.5, IX.13) are operator-held by default.
Civilizational signing keys (the keys that mint `CivilizationSeed`
lineage records and dividend distributions) are held by an N-of-M
Shamir secret-sharing scheme across geographically distributed
custodians. The threshold and member list are published in the
Civilization registry.

If we vanish, the surviving threshold-quorum of Civilizational
custodians can:

1. Recover the Civilizational signing key.
2. Hand off the `CivilizationSeed` lineage to the Operator Council
   (Part XVIII.4).
3. Continue dividend distribution from the existing escrowed pool.

Operator personal keys are unaffected — they never left operator
machines.

## 3. Federation continuity

Federation v1 (Phase 16) is signed seed exchange between peers with no
central server. If we vanish, federation continues unchanged. The
optional marketplace directory (Part X.5) goes dark; this does not
break the substrate.

A replacement marketplace can be stood up by any operator group with a
clone of the kernel and the public lineage ledger.

## 4. Governance handoff

The Operator Council (Part XVIII.4) and Civilization stewardship body
(Part XVIII.5) are external to the originating organization. They
continue governing the substrate's economic surface and the
`CivilizationSeed` corpus.

The kernel custodian role passes to the highest-bandwidth contributor
in the public commit history at the time of vanishing, per the bus
factor doctrine (Part XXI.2). Quorum decisions on kernel changes
follow Part XVIII.2 with whatever Engine Owner roster is present.

## 5. The "vanishing" trigger

This document is invoked when **all** of the following hold for thirty
consecutive days:

- The primary kernel repository has no signed commits from the
  originating organization.
- The Civilizational dividend distribution has not run on schedule.
- The originating organization's primary communication channels are
  unresponsive.

Triggering is a public, irrevocable declaration. The trigger is
recorded on the lineage ledger by Civilizational custodian signature.

## 6. What does not change

- The kernel license remains in force.
- All published `.gseed` artifacts remain valid and renderable.
- All operator royalty schedules remain in force (Part X.2).
- Determinism guarantees (Part IX) hold — old artifacts continue to
  render identically forever.

## 7. Rehearsal

This protocol is rehearsed annually. The rehearsal is logged in the
Self-Improvement Log and the doctrine successor (if any) updated
accordingly.

---

*The substrate is the operator's, not ours. Vanishing must change
nothing that matters.*
