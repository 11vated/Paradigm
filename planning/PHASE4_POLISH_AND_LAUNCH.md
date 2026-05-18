# PHASE 4: POLISH & LAUNCH
## Weeks 13-14 — Compliance, Performance, Security, Documentation, v1.0 Release

**Objective:** Production-ready, compliant, documented, released v1.0.

---

## DAY 51-53: C2PA Compliance (P4.1)

### C2PA Manifest

```typescript
// src/lib/export/c2pa.ts
interface C2PAManifest {
  generator: 'Paradigm Absolute v1.0'
  seed_hash: string
  domain: string
  engine_version: string
  timestamp: string  // ISO 8601
  signature: string  // ECDSA over manifest
  provenance: {
    parent_seeds: string[]
    operation: 'grow' | 'mutate' | 'breed' | 'compose'
    generation: number
  }
  assertions: [
    { label: 'org.paradigm.seed', data: string },
    { label: 'org.paradigm.domain', data: string },
    { label: 'org.paradigm.engine_version', data: string }
  ]
}

function attachC2PA(artifact: Artifact, seed: UniversalSeed): Artifact {
  // Embed C2PA manifest in artifact metadata
  // For PNG: embed in metadata chunk
  // For GLTF: embed in extras
  // For WAV: embed in iXML chunk
  // For HTML: embed in meta tags
}
```

- [ ] C2PA manifest generation
- [ ] Embed in PNG export
- [ ] Embed in GLTF export
- [ ] Embed in WAV export
- [ ] Embed in HTML export
- [ ] Verification test

---

## DAY 52-54: WCAG 2.1 AA (P4.2)

### Accessibility Checklist

- [ ] Color contrast: 4.5:1 minimum (AA) for all text
- [ ] Keyboard navigation: all interactive elements focusable
- [ ] Screen reader: ARIA labels on all controls
- [ ] Focus indicators: visible focus ring on all interactive elements
- [ ] ARIA landmarks: header, main, nav, complementary
- [ ] Form labels: all inputs have labels
- [ ] Error messages: descriptive, not just codes
- [ ] Skip navigation link

### Testing

```bash
npx axe src/components/ --exit  # axe-core scan
npx playwright test tests/visual/regressions.spec.ts  # Visual regression
```

---

## DAY 52-55: OpenTelemetry (P4.3)

### Instrumentation

```typescript
// server.ts
import { trace } from '@opentelemetry/api'
const tracer = trace.getTracer('paradigm-server')

// Instrument all seed operations
app.post('/api/seeds/:id/grow', async (req, res) => {
  return tracer.startActiveSpan('grow', async (span) => {
    span.setAttribute('seed.id', req.params.id)
    span.setAttribute('seed.domain', seed.$domain)
    try {
      const result = await growSeed(seed)
      span.setStatus({ code: SpanStatusCode.OK })
      res.json(result)
    } catch (e) {
      span.recordException(e)
      span.setStatus({ code: SpanStatusCode.ERROR })
      res.status(500).json({ error: e.message })
    } finally {
      span.end()
    }
  })
})
```

### Metrics to Export

| Metric | Type | Labels |
|--------|------|--------|
| `paradigm_grow_duration_ms` | Histogram | domain, success |
| `paradigm_grow_total` | Counter | domain |
| `paradigm_mutate_total` | Counter | domain |
| `paradigm_breed_total` | Counter | domain |
| `paradigm_evolve_total` | Counter | algorithm |
| `paradigm_api_request_duration` | Histogram | endpoint, method, status |
| `paradigm_api_errors` | Counter | endpoint, error_code |

### Endpoint

```
GET /api/metrics  → Prometheus text format
```

---

## DAY 53-54: Load Testing (P4.4)

### k6 Scenarios

```javascript
// k6/seed-grow.js
import http from 'k6/http'

export const options = {
  scenarios: {
    grow_test: {
      executor: 'ramping-arrival-rate',
      stages: [
        { target: 10, duration: '30s' },   // Ramp up
        { target: 100, duration: '2m' },    // Sustained load
        { target: 0, duration: '30s' },     // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // 95% under 5s
    http_req_failed: ['rate<0.01'],     // <1% errors
  },
}

export default function () {
  const seed = JSON.stringify({
    $domain: 'character',
    $name: 'load-test',
    genes: { size: 1.5 }
  })
  
  http.post('http://localhost:3000/api/seeds', seed, {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### Performance Budgets

| Metric | Budget |
|--------|--------|
| Median grow time | <2s |
| P95 grow time | <5s |
| P99 grow time | <10s |
| API p95 latency | <500ms |
| Studio LCP | <2s |
| Memory usage (server) | <512MB baseline |
| Memory usage (grow operation) | <200MB peak |

---

## DAY 54-55: Security Audit (P4.5)

### Checklist

- [ ] `npm audit` — zero critical vulnerabilities
- [ ] OWASP ZAP scan — no high findings
- [ ] SQL injection review — parameterized queries only
- [ ] XSS review — all user input escaped/sanitized
- [ ] CSRF protection — tokens on state-changing requests
- [ ] Authentication — JWT rotation, secure cookie flags
- [ ] Rate limiting — verified per-endpoint
- [ ] Secrets check — `git secrets --scan`
- [ ] SBOM generation — `cyclonedx-bom`

---

## DAY 53-56: DAO Phase 3 — Full Governance (P4.6)

- [ ] Deploy PARA token to mainnet
- [ ] Deploy TimelockController
- [ ] Deploy GovernorBravo
- [ ] Seed ownership on-chain verification
- [ ] Seed marketplace escrow
- [ ] DAO proposal UI
- [ ] Seed marketplace UI

---

## DAY 55-57: Documentation (P4.7)

### Deliverables

| Document | Format | Audience |
|----------|--------|----------|
| README.md | Markdown | Everyone |
| CONTRIBUTING.md | Markdown | Contributors |
| API Reference | Swagger/OpenAPI | Developers |
| Architecture Guide | Markdown + Mermaid | Developers |
| User Guide | Markdown | Users |
| Tutorial: Grow | Video (2 min) | New users |
| Tutorial: Breed | Video (2 min) | New users |
| Tutorial: GSPL | Video (3 min) | Developers |
| Tutorial: Deploy | Video (5 min) | Operators |

---

## DAY 56: Release v1.0 (P4.8)

### Release Checklist

- [ ] All Phase 0-3 completion criteria met
- [ ] `npm run test` → 100% pass
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run build` → succeeds, bundle <2MB
- [ ] `npm run lint` → clean
- [ ] `npm run determinism:check` → pass
- [ ] Docker compose up → runs locally
- [ ] All viewports functional
- [ ] Agent → generate seed → verify → sign → export → download
- [ ] DAO → propose → vote → execute
- [ ] Tag v1.0 in git
- [ ] Changelog generated
- [ ] GitHub Release created
- [ ] Blog post published
- [ ] Social announcement

---

## PHASE 4 COMPLETION CRITERIA

- [ ] C2PA Content Credentials on all exported artifacts
- [ ] WCAG 2.1 AA compliance verified by axe-core
- [ ] OpenTelemetry instrumentation active
- [ ] Metrics endpoint `/api/metrics` returning Prometheus format
- [ ] Load test passes: 100 concurrent grows, <5s p95
- [ ] Security audit: zero critical vulnerabilities
- [ ] SBOM generated
- [ ] DAO governance fully wired (propose, vote, execute)
- [ ] Seed marketplace functional (list, buy, sell, royalty)
- [ ] Documentation published
- [ ] Video tutorials published
- [ ] v1.0 tagged and released
- [ ] Docker + Caddy production deployment documented
