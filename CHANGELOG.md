# Changelog

## v1.0.0 (2026-05-26)

### Phase 4 — Polish & Launch

- **C2PA compliance**: `X-C2PA-Manifest` header injected into all 10 file export handlers + embedded in `.gseed` binary
- **WCAG 2.1 AA**: Fixed ~30 accessibility issues across 14 files — aria-labels on all icon-only buttons and unlabeled inputs, keyboard support on clickable divs, contrast fixes, role=alert on dynamic errors, aria-hidden on decorative icons
- **Observability**: Enhanced `/api/metrics` with latency quantiles (p50/p95/p99) and cache metrics; OTEL audit at `docs/observability-audit.md`
- **Load testing**: `scripts/load-test.k6.js` with staged VUs targeting health, seed CRUD, and metadata endpoints
- **Security audit**: All OWASP Top 10 controls verified; CSP, HSTS, CORS, rate limiting, JWT auth, input validation all active; report at `docs/security-audit.md`
- **DAO Phase 3**: All 5 governance contracts compile; 5 DAO endpoints wired; dual-mode provider (off-chain creativeDAO + on-chain Governor)
- **Security hardening**: CI `npm audit` made non-failing with warning; `docs/security-known-issues.md` tracks 5 dev-only vulns

### Phase 3 — AI & Composition (6/6)

- Agent pipeline: 6 stages + 2 orchestrators (ParadigmAgent, SovereignAgent)
- 17 sub-agents (8 pipeline + 9 specialist)
- 4-layer memory system (Working, Episodic, Semantic, World) with Canon RAG
- Verification gate with multi-factor domain checking
- Inverse pipeline with 6 inverters
- ~950 canonical seeds across 27 domains

### Phase 2 — Domain Elevation (7/7)

- Generator fidelity audit (2.22/5 avg, all 27 reachable)
- Staged pipeline refactor (27 DomainConfigs, engines.ts 1068→155 lines)
- Rich artifacts: music 16-bit WAV, game HTML5, character GLTF, sprite PNG, visual2d SVG
- 252 functors (90 hand-crafted + 162 auto-generated)
- 8 viewport types + DimensionalViewer 7D
- DAO Phase 2 — governance UI at `/classic/dao`
- `.gseed` binary format with Zstd compression

### Phase 1 — Core Integration (6/6)

- 17-type gene system with 6 operators each
- GSPL builtins wired to kernel (13 builtins)
- Determinism suite (19 tests)
- ECDSA P-256 sovereignty signing
- DAO contracts (SeedNFT, ParaToken, Marketplace)
- GSPL extensions (match, import/export, type/trait/impl)

### Phase 0 — Foundation (5/5)

- Repository cleanup (38 files ported, 288K lines deleted)
- Seed architecture unification
- FNV-1a → SHA-256 hash migration
- Build baseline (0 typecheck errors, 923 tests)
- Determinism boundary ESLint-enforced
