# Contributing to Paradigm Infinite

Thank you for your interest in contributing to Paradigm Infinite — the deterministic, sovereign Digital Creation OS.

We welcome contributions that uphold the core invariants:
- Determinism (same seed + same code = bit-identical artifact)
- Sovereignty (local-first, cryptographically signed, fork-friendly)
- Quality (executable 9-strata contracts, no evasion)
- Transparency and reproducibility

## Code of Conduct
Please read and follow our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Getting Started
1. Fork the repo and clone your fork.
2. Install: `npm install` (or `pnpm install`).
3. Run the validation harness: `node test-paradigm.mjs` (must pass core checks).
4. Read the doctrine: `Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md` and `docs/PARADIGM_INFINITE_GUIDE.md`.
5. Explore: `docs/ROADMAP.md` for current priorities.

## Development Workflow
- Branch from `v1.0.1` (or main for new features).
- Make small, focused PRs.
- All changes must preserve determinism: run `npm run determinism:check` and relevant tests.
- Use the semver tool: `node scripts/bump-version.js patch` (updates package + auto-appends to CHANGELOG).
- For new domains/GSPL: add generator + `-contract.ts`, update golden corpus, add to harness if applicable.
- Sign commits where possible for sovereignty.

## Pull Request Process
1. Ensure `npm run typecheck && npm run determinism:check && node test-paradigm.mjs` (core) passes.
2. Update docs/ and CHANGELOG.md (the bump script helps).
3. Include reproducibility proof (e.g., before/after hashes for artifacts).
4. Request review from maintainers.
5. For significant changes, open an issue first using the templates.

## Reporting Issues
Use the GitHub issue templates:
- Bug report
- Feature request
- Documentation improvement

Provide:
- Exact seed + command that reproduces
- Expected vs actual artifact (hashes, files)
- Environment (node version, OS)

## Community
- Discussions: Use GitHub Discussions for ideas, questions, showcase.
- Real-time: (Future) Discord or Matrix (see roadmap).
- Security: Report privately via security@ or the security-audit.md process.

## Recognition
Contributors are credited in releases and the reproducibility ledger where applicable.

Thank you for helping keep the kernel truthful and the substrate sovereign.
