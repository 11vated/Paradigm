# Contributor Onboarding Guide

Welcome! This guide helps new contributors get productive quickly while protecting Paradigm's invariants.

## Prerequisites
- Node >= 20, pnpm or npm
- Git
- Read the core doctrine: `Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`
- Run the harness successfully: `node test-paradigm.mjs` (core sections must pass)

## First Steps (30 minutes)
1. Fork + clone.
2. `npm install`
3. `node scripts/bump-version.js patch` (practice; don't push)
4. Make a tiny change (e.g., improve a comment in a generator or add a test assertion).
5. Run `npm run typecheck && npm run determinism:check`
6. Open a draft PR with the onboarding template.

## Key Concepts for Contributors
- **Seeds are programs**: Every change must preserve bit-identical output for the same seed material.
- **Quality Contracts**: New domains require a `-contract.ts` with executable predicates for the 9 strata.
- **Sovereignty**: Federation changes must use real signatures (see `src/lib/sovereignty/ecdsa.ts`).
- **No evasion**: Strict lint gates. Use the waivers registry only as last resort.

## Where to Contribute
See `docs/ROADMAP.md` for current priorities (new domains, GSPL evolution, federation hardening).

Good first issues are labeled `good-first-issue` and scoped to one module.

## Communication
- GitHub Discussions for questions and ideas.
- Issues for concrete work.
- PRs for code/docs.

## Release Process (for maintainers)
- Use `node scripts/bump-version.js` on the appropriate branch.
- Nightly CI + release-verification job must pass (hash + signature).
- Update reproducibility logs in `.paradigm/`.
- Tag and publish using the release script.

Thank you for helping build the truthful substrate.
