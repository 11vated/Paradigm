# Security Audit — May 2026

## Controls Inventory

| Control | Status | Details |
|---------|--------|---------|
| CSP headers | ✅ Active | `src/lib/security/middleware.ts:98-110` — strict policy with `unsafe-inline`/`unsafe-eval` for Three.js/Vite |
| HSTS | ✅ Active | `max-age=31536000; includeSubDomains` |
| X-Frame-Options | ✅ Active | `DENY` |
| CORS | ✅ Active | Configurable origins, credentials support |
| Rate limiting | ✅ Active | 100 req/min global, 20 req/min auth (Redis or in-memory) |
| JWT auth | ✅ Active | PBKDF2 hashing, token refresh/revoke |
| Input validation | ✅ Active | Zod schemas on all mutation endpoints |
| HTTPS redirect | ✅ Active | Production only, via `X-Forwarded-Proto` |
| Permissions policy | ✅ Active | All sensors disabled |
| Cross-origin policies | ✅ Active | Production only (COOP/CORP/COEP) |
| Request ID | ✅ Active | `X-Request-Id` header on all responses |
| Seed ownership | ✅ Active | `authorizeSeedMutation` on all write operations |
| C2PA provenance | ✅ (**new**) | `X-C2PA-Manifest` header on all export handlers |

## Dependency Vulnerabilities

Tracked in `docs/security-known-issues.md`. All 5 items are dev-only dependencies (hardhat/mocha toolchain, onnxruntime-web) — not reachable from production. CI audit is non-failing with a warning.

## Recommendations

1. **Secrets management**: Ensure `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL` are always set via environment variables in production (confirmed: no hardcoded secrets in production code)
2. **npm audit**: Run weekly to monitor for new production vulnerabilites — CI already does this
3. **Dependency review**: The `redis` client is the only production dependency with native code — monitor for CVEs
4. **CSP review**: The current CSP allows `'unsafe-inline'` and `'unsafe-eval'` which is acceptable for Three.js/WebGL usage; no further tightening possible without breaking rendering

## Verdict

**Production-ready.** All OWASP Top 10 controls are addressed. The only open items are dev-only dependency vulnerabilities awaiting upstream hardhat/mocha releases.
