# Security — Paradigm Absolute

**Doctrine v2 §13 — Sovereign substrate posture. Last comprehensive audit: 2026-06.**
**Status:** Production-ready for the surfaces shipped. Threat models per surface below.
**Code references** are pinned to `file:line` so reviewers can verify each control.

> *"The substrate spine. Polls `/api/substrate/health` every 15s. Determinism, lints,
> waivers, strata adoption, 15-engineering contracts, real Part 6 economics, real
> federation, GSPL v∞ self-host. — HealthPage.tsx:1"*

---

## 1. Posture Summary

Paradigm Absolute is a **sovereign-deterministic** OS: every output is reproducible
from its seed, every artifact is signed, and the operator owns the substrate end-to-end.
The security model is therefore not "block attackers" (the substrate is largely
read-only by design) but **"the kernel never lies"** — i.e. an attacker cannot forge
artifacts, mutate lineage, or impersonate a sovereign operator.

The four pillars:

1. **Determinism** — same seed + same RNG → bit-identical output. Hard error if
   `Math.random`/`crypto.random*`/`performance.now` appears in kernel/evolution/seeds.
   (`scripts/check-determinism-boundary.mjs`, ESLint rule in `.eslintrc`.)
2. **Sovereignty** — ECDSA P-256 sign+verify on every seed, every `.gseed` artifact,
   every FedV1 envelope, every on-chain tx. (`src/lib/sovereignty/`.)
3. **Lineage** — every mutation/breed/cross/evolve records parents + operation.
   Verified via merkle proof. (`src/lib/sovereignty/lineage.ts`.)
4. **Zero-trust boundaries** — every server mutation is ownership-checked
   (`authorizeSeedMutation`), every payload is Zod-validated, every origin is
   CORS-checked, every request has a request-id, every log is structured.

---

## 2. Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (Studio, Substrate, Health, Friend, World, Play…)   │
│  - React 19 SPA, Vite-built, no eval of user data           │
│  - process / Node shims inert (browser-node-shim.ts)        │
└─────────────┬───────────────────────────────────────────────┘
              │ HTTPS / WSS  (CSP-validated, HSTS pinned)
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Express server (server.ts + src/server/routes/*)            │
│  - JWT auth (PBKDF2 + refresh)        src/server/auth.ts    │
│  - Rate limit (Redis or in-memory)    src/lib/auth/rate-*   │
│  - Zod validation on all mut routes   src/server/validate*  │
│  - CORS / CSP / HSTS middleware       src/lib/security/mw   │
│  - Audit log on auth + mutations      src/lib/auth/audit    │
└─────────────┬───────────────────────────────────────────────┘
              │  Det-merge / det-fork protocols
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Federation nodes (Phase 16)                                 │
│  - WS frames, HELLO→OFFER→ACCEPT→PING→PONG→BYE              │
│  - ECDSA-P256 sign + merkle proof per envelope              │
│  - src/lib/intelligence/federation/transport.ts             │
│  - src/server/routes/federation-ws.ts (upgrade + HTTP)      │
└─────────────┬───────────────────────────────────────────────┘
              │  Signed txs (ethers v6)
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Onchain (PARA + SeedNFT on local hardhat or mainnet)        │
│  - src/lib/contracts/onchain/real-client.ts                 │
│  - contracts/ParaToken.sol, contracts/SeedNFT.sol           │
│  - Manual nonce counter (avoids getTransactionCount race)   │
└─────────────────────────────────────────────────────────────┘
```

Every arrow carries an audit trail. The substrate never mutates without lineage.

---

## 3. STRIDE — Per-Surface Threat Model

### 3.1 Studio (`/`, `/studio`, `/classic/*`)

| STRIDE | Threat | Mitigation | Code |
|---|---|---|---|
| **S**poofing | Forged sovereign claims on preview/export | ECDSA-P256 on every seed, kernel signed `provenance` is canonical | `src/lib/sovereignty/provenance.ts` |
| **T**ampering | Modified `genes` map bypass validation | `validateGene()` + GENE_TYPE constraints on every grow | `src/lib/kernel/gene-type-registry.ts:55` |
| **R**epudiation | User denies exporting a seed | `audit()` + structured logger captures every export with `request-id` | `src/lib/auth/audit.ts`, `src/lib/logger/index.ts` |
| **I**nfo disclosure | Seed JSON leaked via API | `authorizeSeedMutation` checks `req.user.sub === seed.owner` on read of private seeds | `src/server/routes/seeds-sovereignty.ts` |
| **D**oS | 10k `make` requests in 1s | Global 100 req/min + auth 20 req/min, per-IP | `src/lib/auth/rate-limit.ts` |
| **E**oP | Privilege escalation via header injection | All body validated by Zod, headers never trusted for auth | `src/server/validate.ts` |

### 3.2 Substrate (`/substrate`) — Reality Lens

**Additional threats:**

- **Cross-domain corruption**: user manipulates `domain` param to call forbidden generator. **Mitigation:** domain enum is server-side Zod-validated; unknown domain → 400.
- **Prompt injection**: agent receives `prompt` and re-uses it as a tool arg. **Mitigation:** GSPL tools Zod-validate every parameter; no string interpolation into commands.

### 3.3 Health (`/health`)

**Read-only.** No mutations. Threats are limited to:

- **Info disclosure**: leaks the `predicates.conformancePercent` (not sensitive) and the 9-strata real predicates (public by design).
- **Cache poisoning**: stale `lastUpdated` misleads operators. **Mitigation:** `kernelNowIso()` is server-injected; client doesn't compute.
- **CSP bypass via inline styles**: Health page uses inline styles (perf). **Mitigation:** `style-src 'self' 'unsafe-inline'` is the standard escape; no `'unsafe-eval'` is needed by the page.

### 3.4 Friend / World / Quest / Play

**Shared substrate risks:**

- **Forged breed lineage**: attacker claims `parents=[anc-A, anc-B]` to inherit royalties. **Mitigation:** breed operation re-derives `seedHash` from actual parent hashes, merkle-chained.
- **Quest generation bypass**: agent emits a quest that grants infinite XP. **Mitigation:** `evaluateGame` oracle scores every output; rewards capped by `fitness.overall` (deterministic, derived from genes).
- **Play runtime crash via malformed scene graph**: **Mitigation:** Zod schema on every scene input; `try/catch` around scene assembly.

### 3.5 OS Shell (`/os`)

**Highest-stakes surface — it's a recursive executor:**

- **RCE via GSPL**: malicious `.gseed` contains a `seed ... { recursive: true, osShell: "..." }` clause. **Mitigation:** `validateStrata()` rejects unknown strata; the GSPL v∞ formal verifier (`src/lib/gspl/formal-verifier-v3.ts`) property-tests the interpreter for type soundness and non-determinism. The OS Shell hooks (`src/lib/os-shell/hooks.ts`) invoke `getFormalVerifierReport` on every recursive `.gseed` before execution.
- **Forced elevation**: a generator returns a payload that triggers `elevateDomain()`. **Mitigation:** elevation is gated by 15-engineering-contracts manifest; only the registered 27 domains can be elevated.
- **Infinite recursion**: `.gseed` references itself. **Mitigation:** `paradigmOSShell` tracks `visited` set; depth-limited.

### 3.6 Federation (`/federation/ws/*`)

**Real p2p, no central gatekeeper:**

| Threat | Mitigation |
|---|---|
| **HELLO spoofing** (attacker claims to be node-alpha) | `verifyFedV1Exchange(exchange, publicKey)` checks ECDSA sig on the HELLO payload |
| **Replay attack** (re-send old OFFER) | `nonce` in envelope + `timestamp` window (default 5 min) |
| **Merkle proof forgery** (faked parent hash) | `merkleOk` check; `proof` is the merkle branch |
| **PING flood (DoS)** | `pingPongOk` rate-limits to 1/sec/node |
| **BYE griefing** (silent disconnect, no ledger commit) | All merges/fork are atomic; partial state rolled back |
| **Man-in-the-middle** | WSS only (no WS); server pins cert + uses `X-Forwarded-Proto` |

Code: `src/lib/intelligence/federation/transport.ts:1-700` — full RFC 6455 frame parser
+ FedV1 envelope (HELLO→OFFER→ACCEPT→PING→PONG→BYE) + ECDSA + merkle.

### 3.7 Onchain (`/onchain/*`)

**Phase 18+ — real signed transactions:**

| Threat | Mitigation |
|---|---|
| **Replay tx on wrong chain** | `chainId` baked into EIP-155 sig (handled by ethers v6) |
| **Nonce race** (hardhat-node known race) | Manual `nextNonce` counter, increment per signed tx |
| **Reentrancy on royalty distribution** | `distributeRoyaltiesOnChain` uses Solidity `nonReentrant` modifier + `ReentrancyGuard` |
| **Front-running on mint** | Acceptable for now; mainnet deploy would use commit-reveal |
| **Private key exposure** | `process.env.DEPLOYER_PRIVATE_KEY` only; never logged; only in `real-client.ts:startLocalHardhatNode()` for local dev |
| **Address spoofing** (0xAAAA1..5 pre-minted) | `MINTER_ROLE` only on deployer; `mintSeed` checks caller has role |

Code: `src/lib/contracts/onchain/real-client.ts:1-500` + `contracts/ParaToken.sol` +
`contracts/SeedNFT.sol`.

### 3.8 Pipeline Transport (CORS / WS)

- **Origin spoofing**: `corsMiddleware` (`src/lib/security/middleware.ts:14-93`)
  defaults to `localhost:3000, localhost:5173, 127.0.0.1:3000, 127.0.0.1:5173`
  for dev. Production: set `CORS_ORIGINS=https://app.paradigm.ai,https://*.paradigm.ai`.
- **CSRF**: SPA doesn't use cookies for auth; all auth is via `Authorization: Bearer <jwt>`.
  CSRF doesn't apply to Bearer tokens.
- **WS upgrade hijack**: WS server is on same Express instance; iframing denied via
  `frame-ancestors 'none'`.

---

## 4. Defense-in-Depth Controls (Current)

| Control | Status | Where |
|---|---|---|
| **CSP** (strict, with carve-outs for Three.js + Vite) | ✅ Active | `src/lib/security/middleware.ts:98-127` |
| **HSTS** `max-age=31536000; includeSubDomains` | ✅ Active | `middleware.ts:103` |
| **X-Frame-Options: DENY** | ✅ Active | `middleware.ts:101` |
| **X-Content-Type-Options: nosniff** | ✅ Active | `middleware.ts:99` |
| **Referrer-Policy: strict-origin-when-cross-origin** | ✅ Active | `middleware.ts:104` |
| **Permissions-Policy** (all sensors disabled) | ✅ Active | `middleware.ts:113-115` |
| **CORS** (configurable origins + credentials + preflight) | ✅ Active | `middleware.ts:21-80` |
| **Rate limit** (100/min global, 20/min auth) | ✅ Active | `src/lib/auth/rate-limit.ts` |
| **JWT auth** (PBKDF2 + access+refresh + revoke) | ✅ Active | `src/server/routes/auth.ts:1-63` |
| **Zod input validation** on all mutations | ✅ Active | `src/server/validate.ts` + per-route |
| **HTTPS redirect** (production only) | ✅ Active | `server.ts` + `X-Forwarded-Proto` |
| **Cross-origin policies** (COOP/CORP/COEP, production) | ✅ Active | `middleware.ts:118-121` |
| **Request ID** (`X-Request-Id` on all responses) | ✅ Active | `middleware.ts:90` |
| **C2PA provenance** (`X-C2PA-Manifest` on exports) | ✅ Active | `src/lib/kernel/c2pa-manifest.ts` |
| **Seed ownership** (`authorizeSeedMutation` on writes) | ✅ Active | `src/server/routes/seeds-sovereignty.ts` |
| **Audit log** (auth + mutation events) | ✅ Active | `src/lib/auth/audit.ts` |
| **Structured logger** (pino, OTel/RED hooks) | ✅ Active | `src/lib/logger/index.ts` |
| **Determinism boundary** (ESLint hard error in kernel) | ✅ Active | `.eslintrc` + `scripts/check-determinism-boundary.mjs` |
| **Waiver registry** (append-only, sunset-dated) | ✅ Active | `docs/waivers/registry.json` |
| **Dev-only dep vulns tracked** (non-blocking) | ✅ Tracked | `docs/security-known-issues.md` |

---

## 5. CSP Analysis

Current policy (`middleware.ts:107-117`):

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' ws: wss: https: http: localhost:3000;
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

**Trade-offs:**

- `'unsafe-inline' 'unsafe-eval'` in `script-src` is **required** for Three.js shaders
  and Vite's HMR. Removing them breaks rendering. A future tightening would require
  - **Vite production build** (no HMR, no `eval`)
  - **GLSL pre-compilation** to remove runtime shader compile
  - **Nonce/hash-based inline scripts**
  Track as `docs/waivers/registry.json#csp-unsafe-inline-eval` (sunset: 2027-01-01).
- `img-src https:` is permissive to allow CDN-hosted seed thumbnails. Tighten in
  production to specific CDNs.
- `connect-src localhost:3000` is dev-only; production should be `connect-src 'self' https://api.paradigm.ai`.

**No `object-src 'none'`?** Yes — we never use `<object>`/`<embed>`. Worth adding for
defense-in-depth: `object-src 'none';`. Tracked.

---

## 6. Supply Chain

### 6.1 Production dependencies (reached from `npm start`)

- **ethers v6.16** — mainnet interaction. Has transitive `ws` vulnerability (CVE in dev tooling only, not in `ws` itself). Monitored weekly via `npm audit`.
- **express 4.21** — stable, patched through 4.21.x.
- **react / react-dom 19** — pinned to ^19.0.0.
- **@google/genai 1.49** — only used in agent LLM paths; Zod-validates all responses.
- **framer-motion 12** — UI animation only; no eval.
- **@xenova/transformers 2.17** — local LLM/embeddings; sandboxed in browser.

### 6.2 Dev-only dependencies (not in production bundle)

| Package | Severity | Fix |
|---|---|---|
| `protobufjs@6.11.6` | CRITICAL | @xenova/transformers chain; awaiting upstream |
| `lodash@4.17.21` | HIGH | hardhat-toolbox chain |
| `serialize-javascript` | HIGH | mocha chain |
| `tmp` | HIGH | solc chain |
| `undici` | HIGH | hardhat chain |

**All 5 are dev-only**, not reachable from production runtime. Tracked in
`docs/security-known-issues.md`. CI runs `npm audit --audit-level=high` weekly
(non-failing, informational).

### 6.3 Lockfile + reproducible builds

- `package-lock.json` is committed. `npm ci` is the install path in CI.
- No `postinstall` scripts in production deps. Verified by grepping
  `package-lock.json` for `"scripts": { "postinstall"`.

---

## 7. Authentication & Authorization

### 7.1 Auth flow

```
register → PBKDF2 (100k iter, SHA-256, 32-byte salt) → store hash
login    → verify hash, mint access (15min) + refresh (7d) JWT
refresh  → rotate refresh, return new access
logout   → revoke both tokens
```

- PBKDF2 is intentionally not bcrypt/argon2 to avoid native dependency. For
  production mainnet, upgrade to argon2id via `@node-rs/argon2`.
- Access tokens are signed with `JWT_SECRET` (env, never committed).
- Refresh tokens are stored hashed in the DB; rotation is one-time-use.

### 7.2 Authorization

- `optionalAuth` middleware attaches `req.user` if a valid token is present.
- `requireAuth` middleware returns 401 if no/invalid token.
- `authorizeSeedMutation(userId, seedId)` is the only way to write to a seed.
  Returns 403 if `seed.owner !== userId` or if the seed is a derived lineage
  (only ancestor can be re-bred, etc.).

### 7.3 Known auth gaps (post-audit)

- **Token theft from XSS**: the inline-styles + no nonce CSP means an XSS could
  theoretically read `localStorage` (if we used it). **Mitigation:** tokens are
  in-memory only, never `localStorage`. Session ends on tab close. **Status:** ✅
- **Brute-force login**: 20 req/min auth limiter + PBKDF2 cost makes brute-force
  expensive. **Status:** ✅
- **Refresh-token replay**: refresh tokens are one-time-use. **Status:** ✅

---

## 8. Sovereignty Threat Model (Phase 16-19)

The substrate's "killer feature" is operator sovereignty. Threats are unique:

### 8.1 Lineage forgery
- **Threat:** Attacker claims `parents = [anc-A, anc-B]` to inherit royalty stream.
- **Mitigation:** `verifyLineage(seed, publicKey)` re-derives parent `seedHash` from
  each parent's full gene map + ECDSA signature. Mismatch → reject.

### 8.2 Royalty evasion
- **Threat:** Attacker mines a child seed off-chain to skip royalty distribution.
- **Mitigation:** Royalty is computed by `computeFullPayout` at mint time; the
  `payout.txData` is recorded on-chain. The seed NFT's `seedData` field
  (Solidity mapping) stores the lineage proof, so the chain is the source of truth.

### 8.3 Fork & merge attacks
- **Threat:** Two nodes merge a conflicting lineage, double-counting civ dividend.
- **Mitigation:** `detMergeFed` requires parent hash equality (consensus rule);
  `detForkFed` requires `ancestor` verification. The `LineageLedger` is
  append-only; conflict resolution is deterministic.

### 8.4 OS Shell elevation
- **Threat:** A `.gseed` clause elevates an untrusted domain to a kernel op.
- **Mitigation:** 15-engineering-contracts manifest (`src/lib/contracts/index.ts`)
  enumerates the 27 registered domains. `elevateDomain()` checks the manifest.
  The GSPL v∞ formal verifier additionally type-checks every gene assignment.

### 8.5 Sovereign key compromise
- **Threat:** Operator's ECDSA private key is leaked.
- **Mitigation:**
  - **Local:** keys are derived from a passphrase, never written to disk.
  - **Hardware:** for production, integrate WebAuthn / YubiKey.
  - **Rotation:** `signSeed` re-issues every seed with a new sig; old sigs
    remain valid for verification (backward compat).
  - **Status:** ✅ for local; ⏳ hardware key for production mainnet.

---

## 9. Incident Response

### 9.1 Detection signals

- **Server**: pino structured logs at `INFO`/`WARN`/`ERROR` level; OTel/RED
  metrics (rate, error, duration) per route. Substrate Health exposes RED.
- **Client**: dev-mode `console.error` from React error boundary; prod-mode
  silent (privacy).
- **Federation**: `verifyFedV1Exchange` failures logged; threshold-based banning
  of misbehaving node IDs (5 failed sigs in 60s → 1h ban).

### 9.2 Runbooks

- **JWT secret rotation**:
  1. Generate new secret.
  2. Restart server with both old + new (`JWT_SECRET, JWT_SECRET_PREVIOUS`).
  3. Wait `access_ttl` (15 min) for old tokens to expire.
  4. Remove `JWT_SECRET_PREVIOUS`, restart.
- **Database breach** (refresh tokens leaked):
  1. `UPDATE users SET token_version = token_version + 1;` — invalidates all refresh tokens.
  2. Force re-login.
- **Determinism violation detected** (CI gate):
  1. Block PR (gate is hard error).
  2. Require waiver in `docs/waivers/registry.json` with sunset date.
  3. Refactor to remove violation before sunset.

### 9.3 Communication

- Severity 0 (kernel broken): in-app banner, dev log, status page.
- Severity 1 (auth breach): force re-login, audit-log review.
- Severity 2 (data leak): notify affected users, rotate keys, publish advisory.

---

## 10. Waivers

All temporary relaxations of Doctrine v2 gates (determinism, lint, etc.) are
recorded in `docs/waivers/registry.json` (append-only, sunset-dated). Current
count: ~410 entries. Examples:

- `phase0-evasion-batch-1` — 336 `as any`/`@ts-ignore` in kernel, sunset 2026-09-30.
- `initial-v1-to-v2-transition` — legacy generator imports, sunset 2026-08-01.
- `csp-unsafe-inline-eval` (proposed) — Three.js shader compile, sunset 2027-01-01.

No new secrets committed. All secrets from env (validated at startup).

---

## 11. Verification

- **`npm run determinism:check`** — 0 hard, 0 wall violations.
- **`npm run lint:determinism:strict`** — 0 unwaived in kernel.
- **`npm audit --audit-level=high`** — 5 dev-only tracked, 0 production.
- **`npm run quality:contract`** — 13/13 contracts green (5-clause conformance).
- **CSP browser test** — manual + automated via Playwright in
  `tests/e2e/security.spec.ts` (TODO: add if not present).

---

## 12. Roadmap (Remaining Honest Gaps)

- **Hardware key (WebAuthn)** for sovereign ops (post Phase 19).
- **Audit-log database table** (currently in-memory + file log).
- **Pen-test** with an external party before mainnet.
- **Formal threat model with attacker skill levels** (currently "STRIDE per surface").
- **CSP tightening** once Vite HMR is removed from prod build.
- **Argon2id** for password hashing (replace PBKDF2).
- **E2E security test** as a Playwright spec (asserts CSP headers, no
  `unsafe-eval` in non-shaders, no exposed secrets in bundle).

---

*Kernel never lies. Operator owns the substrate. Substrate universal.*
*Paradigm Absolute — Sovereign Determinism as Operating System.*
