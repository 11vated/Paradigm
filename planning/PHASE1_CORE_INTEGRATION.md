# PHASE 1: CORE INTEGRATION
## Weeks 3-5 — 17 Gene Types, GSPL Kernel Wiring, Sovereignty, Determinism, DAO Contracts

**Objective:** All 17 gene types with 6 operators, GSPL produces real artifacts, determinism verified, sovereignty signing working, DAO contracts audited.

---

## DAY 11-16: Complete 17-Type Gene System (P1.1)

**File:** `src/lib/kernel/gene_system.ts`

### Missing Gene Types to Implement

| Type | Priority | Operators | Test Strategy |
|------|----------|-----------|---------------|
| `topology` | High | validate, mutate, crossover, distance, canonicalize, repair | Mesh topology validity check |
| `regulatory` | High | Same 6 | GRN structure validity |
| `field` | High | Same 6 | Spatial distribution validity |
| `symbolic` | High | Same 6 | S-expression well-formedness |
| `quantum` | Medium | Same 6 | State vector normalization |
| `gematria` | Low | Same 6 | Numerological mapping validity |
| `resonance` | Medium | Same 6 | Frequency profile validity |
| `dimensional` | High | Same 6 | Embedding vector norm |
| `sovereignty` | High | validate, distance, canonicalize (mutate/crossover FORBIDDEN) | Key validity |

### Operator Implementation Steps (for each of 7 missing types):
1. Define TypeScript type interface
2. Implement `validate(value, schema)`
3. Implement `mutate(value, rate, rng, schema)` — deterministic
4. Implement `crossover(a, b, rng)` — deterministic
5. Implement `distance(a, b)` — symmetric, non-negative
6. Implement `canonicalize(value)` — byte-stable
7. Implement `repair(value)` — fix common issues
8. Write property-based tests

### Property-Based Tests (fast-check)

```typescript
// For each type:
test('validate passes for valid values', () => { ... })
test('validate fails for invalid values', () => { ... })
test('mutate with rate=0 is identity', () => { ... })
test('mutate is deterministic: same input = same output', () => { ... })
test('crossover is deterministic', () => { ... })
test('distance is symmetric', () => { ... })
test('distance(a, a) = 0', () => { ... })
test('canonicalize is stable across calls', () => { ... })
test('repair(validate(invalid)) passes', () => { ... })
```

---

## DAY 14-15: Wire GSPL Builtins (P1.2)

**File:** `src/gspl/interpreter.ts`

### Builtins to Wire (13 total)

| Builtin | Maps To | Verification |
|---------|---------|-------------|
| `mutate(seed, rate)` | `gene_system.ts → mutateGene()` | GSPL mutate → kernel mutate → deterministic |
| `breed(a, b)` | `gene_system.ts → crossoverGene()` | GSPL breed → kernel crossover |
| `grow(seed)` | `engines.ts → growSeed()` | GSPL grow → actual artifact |
| `evolve(pop, fn, gn)` | `ga.ts → evolve()` | Full evolution loop |
| `seed(domain, genes)` | `new UniversalSeed()` | Returns valid UniversalSeed |
| `signed(seed, key)` | `universal-seed.ts → sign()` | Signs seed |
| `distance(a, b)` | `gene_system.ts → distanceGene()` | Returns number |
| `compose(seeds, target)` | `composition.ts → composeSeeds()` | Returns composed seed |
| `len(x)` | JavaScript `.length` | Correct |
| `domains()` | `DOMAINS` constant | Returns array |
| `range(n)` | Loop helper | Correct |
| `Math.*` | Math functions | Correct |
| `print(x)` | Console output | Correct |

### Integration Test

```typescript
// tests/gspl/gspl-kernel-integration.test.ts
test('GSPL mutate calls actual kernel mutation', () => {
  const script = `
    let s = seed('character', { size: 1.0 });
    let m = mutate(s, 0.5);
    print(genes(m).size);
  `
  const rng = new Xoshiro256StarStar(12345)
  const result = runGSPL(script, { rng })
  expect(result).not.toEqual('1.0') // mutated value is different
  // Run again with same RNG
  const result2 = runGSPL(script, { rng: new Xoshiro256StarStar(12345) })
  expect(result).toEqual(result2) // Deterministic
})
```

---

## DAY 16-20: Determinism Suite (P1.3)

**Directory:** `tests/determinism/`

### Test Files to Create

| File | Tests | Cross-Runtime? |
|------|-------|----------------|
| `self-replay.test.ts` | grow twice → same bytes | Node only |
| `cross-platform.test.ts` | Linux/macOS/Windows parity | CI matrix |
| `browser-parity.test.ts` | Node vs Chrome vs Firefox | CI + headless browsers |
| `mutation-determinism.test.ts` | mutate twice → same seed | Node only |
| `breeding-determinism.test.ts` | breed twice → same seed | Node only |
| `round-trip.test.ts` | encode/decode, canonicalize/parse | Node only |
| `regression-seeds.test.ts` | 100 canonical seeds, known hashes | Node + CI |
| `floating-point-consistency.test.ts` | IEEE 754 across operations | All platforms |

---

## DAY 17-19: Sovereignty Signing (P1.4)

### Methods on `UniversalSeed`

```typescript
class UniversalSeed {
  sign(privateKey: JWK): UniversalSeed
  // 1. canonicalize seed sans signature
  // 2. ECDSA-P256 sign canonical bytes
  // 3. Store signature in $sovereignty.signature
  // 4. Use RFC 6979 for deterministic nonces!

  verify(publicKey: JWK): boolean
  // 1. canonicalize seed sans signature
  // 2. ECDSA-P256 verify canonical bytes vs stored signature

  signGene(name: string, privateKey: JWK, license: string): UniversalSeed
  // Per-gene signing with license type

  verifyGene(name: string, publicKey: JWK): boolean
}
```

### API Endpoints

```
POST /api/seeds/:id/sign
POST /api/seeds/:id/verify
POST /api/seeds/:id/sign-gene
POST /api/seeds/:id/transfer-gene
GET  /api/seeds/:id/sovereignty
```

---

## DAY 18-20: DAO Phase 1 — Contracts (P1.5)

### Tasks

- [ ] Review `contracts/` — SeedNFT.sol, PARAToken.sol, GovernorBravo.sol
- [ ] `npx hardhat compile` — fix errors
- [ ] `npx hardhat test` — pass
- [ ] `scripts/deploy.ts` — deploy to localhost
- [ ] Wire basic API routes:
  - `POST /api/blockchain/mint` — mint SeedNFT from signed seed
  - `GET /api/blockchain/seed/:hash` — look up on-chain ownership

---

## DAY 15-20: GSPL Extensions (P1.6)

- [ ] `match` expression (pattern matching)
- [ ] `|>` pipe operator
- [ ] `import` / `export`
- [ ] `type`, `trait`, `impl` declarations
- [ ] Full stdlib implementation

---

## PHASE 1 COMPLETION CRITERIA

- [ ] All 17 gene types implemented with 6 operators each
- [ ] Property-based tests pass for each type
- [ ] GSPL `mutate()` calls kernel `mutateGene()` — verified by integration test
- [ ] GSPL `grow()` produces real artifact — verified
- [ ] Determinism suite: self-replay, cross-platform, browser parity all pass
- [ ] Seed can be signed with ECDSA-P256 and verified
- [ ] Per-gene sovereignty works (signGene, verifyGene)
- [ ] GSPL `match`, pipe, import, type system all functional
- [ ] Contracts compile via Hardhat
- [ ] `npm run test` → 100% pass
- [ ] `npm run typecheck` → 0 errors
