# Paradigm Infinite Documentation Portal

This is the central entry point for all public documentation.

## Quick Links
- [Getting Started](getting-started.md)
- [Full User & Developer Guide](PARADIGM_INFINITE_GUIDE.md)
- [Roadmap & Expansion Plans](ROADMAP.md)
- [Contributor Onboarding](CONTRIBUTOR_ONBOARDING.md)
- [Security & Audits](security-audit.md)
- [Federation Protocol](federation-protocol.md)
- [GSPL Language Reference](GSPL_LANGUAGE_REFERENCE.md)
- [If We Vanish / Anti-Fragility](if-we-vanish.md)
- [Audit Logs & Reproducibility Proofs](audit/) — nightly + release artifacts (hashes, golden corpus, federation logs)
- [Waivers Registry](waivers/registry.json) — append-only, sunset-dated
- [Final Build & Release Reports](../FINAL_BUILD_REPORT.md) (root)

## Governance & Transparency
- All releases include automated hash + signature verification (see CI release-verification job).
- Reproducibility proofs are published here after every nightly and tagged release.
- Federation audit logs (signed offers, lineage merges) are mirrored to `audit/`.

## For Contributors
See [CONTRIBUTING.md](../CONTRIBUTING.md) and the onboarding guide above.

## Versioning
Current stable: see root package.json and GitHub tags.
Maintenance branch: `v1.0.1`
Next: v1.1.0 per ROADMAP.

The kernel never lies. The operator owns the substrate.
