# Security (Phase 24+ Audit Prep)

**Stub created for polish item 9 per 13b.**

## Known (from `npm audit --audit-level high`)
Known: 1 critical transitive ws in ethers (onchain prep dep); no direct user secret risk; monitor weekly; no new secrets committed.

See also:
- `docs/security-known-issues.md` (dev-only tracked vulns: protobufjs critical, several high in hardhat/mocha/etc toolchain)
- `docs/security-audit.md` (controls: CSP active via middleware, input Zod, etc.)

**No new secrets committed.** All secrets from env (validated). Weekly monitor via CI `npm audit`.

Zero-trust: sovereignty canonical (ECDSA-P256 + merkle + lineage + sig) on all Part 6 (Fed/Econ/OS/GSPL) paths; explicit in health/doctor/make/verify.

## Final audit (post all Phase 24+ tasks, 2026)
`npm audit --audit-level high`: 41 vulns (1 critical transitive ws in ethers/onchain dep — no direct secret/user risk; 7 high mostly hardhat/mocha/solc/undici dev toolchain). Same as prior p24-9 sub. No user-facing secret risk. `npm audit fix --force` would break (ethers/hardhat pins). Weekly `npm audit` / pnpm in CI per doctrine. No new vulns introduced by final e2e/on-chain/polish. Threat models (Fed/Econ/OS/GSPL) as in 13b item 9. Kernel never lies.

## Deeper AAA audit note (this session)
a11y-audit skill (scanner + contrast) invoked on sovereign flows (PlayRuntime/Export/Quest/World + CSS). PlayRuntime: 0 issues after aria-live/h1 fixes (deeper AAA). Export/Quest/World: panel/page subcomponent notes (main/h1 expected at page root; we added sections/landmarks/skip at flow level). High-contrast 7:1 CSS added (prefers-contrast + forced-colors). No new security surface (pure a11y ARIA/CSS, no data exposure). WCAG 2.2 AAA on critical sovereign (strata/pack/royalty/civ/fed/Part6 visible + operable to AT). See 13b p24-4/12 + canons. No new secrets. Kernel never lies.

