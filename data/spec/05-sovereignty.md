# 05 — Sovereignty

Sovereignty is Paradigm's cryptographic identity and provenance system. Every seed is signed by its author; every derived seed carries its lineage back to the root; verification is stateless. There is no blockchain, no central registry, no third party.

This spec defines the canonicalization procedure, the signing protocol, the verification procedure, and the lineage propagation rules.

## Primitives

- **Hash:** SHA-256 (FIPS 180-4). 32-byte output, serialized as `"sha256:" + hex`.
- **Signature:** ECDSA over NIST P-256 (aka secp256r1 / prime256v1). Deterministic ECDSA per RFC 6979 for signature determinism.
- **Key format:** JSON Web Key (JWK, RFC 7517) with canonical thumbprint per RFC 7638.
- **Canonicalization:** JSON Canonicalization Scheme (JCS, RFC 8785) with Paradigm-specific field-ordering overrides described below.

All primitives are available natively via the Web Crypto API in modern browsers and via `crypto` / `@noble/curves` in Node. No third-party crypto library is required.

## Canonicalization

Canonicalization produces a byte-stable representation of a seed for hashing and signing. Two seeds that are semantically identical must produce byte-identical canonical forms. The rules:

1. **Encoding.** UTF-8 without BOM.
2. **Whitespace.** None. No spaces, no newlines, no indentation.
3. **Key ordering.** All object keys are sorted lexicographically (Unicode code-point order) **except** for the top-level seed fields, which follow a fixed canonical order: `$gst`, `$domain`, `$name`, `$lineage`, `genes`, `$metadata.engine_version`, `$metadata.license`. The `$hash`, `$sovereignty`, `$fitness`, and the remainder of `$metadata` are **excluded** from canonicalization.
4. **Number formatting.** Integers serialize without a decimal point. Floats serialize as the shortest round-trippable representation per ECMAScript's `Number.prototype.toString` — the same algorithm JCS mandates.
5. **String escaping.** Per JCS: `\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX` for control characters < 0x20, no other escapes.
6. **Gene ordering.** Genes are serialized in lexicographic order of gene name. Each gene serializes as `{"type": "...", "value": ...}` with the type field first.
7. **Gene value canonicalization.** Per gene type — delegated to each type's `canonicalize()` operator. See [`02-gene-system.md`](02-gene-system.md).
8. **Lineage parents.** Serialized in the order given (breeding is asymmetric; the first parent is the "A" parent). `parents` is the only lineage field that participates in the hash; `generation` and `timestamp` are informational and excluded.

### Pseudocode

```
fn canonicalize(seed: Seed) -> Bytes:
    obj = {
        "$gst":     seed.$gst,
        "$domain":  seed.$domain,
        "$name":    seed.$name,
        "$lineage": {
            "parents":   seed.$lineage.parents,
            "operation": seed.$lineage.operation
            // generation and timestamp excluded
        },
        "genes": sorted_by_key(
            seed.genes,
            canonicalize_gene_value
        ),
        "$metadata": {
            "engine_version": seed.$metadata.engine_version,
            "license":        seed.$metadata.license
        }
    }
    return jcs_serialize(obj)   // RFC 8785 with Paradigm top-level ordering
```

### Invariants

- `canonicalize(s1) == canonicalize(s2) ⇔ content_equivalent(s1, s2)`
- `canonicalize` is idempotent: `canonicalize(parse(canonicalize(s))) == canonicalize(s)`
- Round-trip: `parse(canonicalize(s))` produces a seed with the same content hash as `s`.

These must be verified by property tests on every CI build.

## Hashing

```
fn hash(seed: Seed) -> ContentHash:
    return "sha256:" + hex(sha256(canonicalize(seed)))
```

The content hash is the seed's primary identity. It is used as:

- The key in the seed store.
- The reference in lineage chains.
- The seed material for the deterministic RNG.
- The subject of the ECDSA signature.

Collisions are assumed not to occur (SHA-256 is collision-resistant). If a collision is ever demonstrated, that's a major spec event requiring a hash algorithm upgrade and version bump.

## Signing

```
fn sign(seed: Seed, private_key: JWK) -> Seed:
    // Clear any existing signature before hashing
    seed_to_sign = seed with { $sovereignty.signature = null }
    message      = canonicalize(seed_to_sign)
    digest       = sha256(message)
    signature    = ecdsa_sign_p256_rfc6979(digest, private_key)
    pub_key      = derive_public_jwk(private_key)
    return seed with {
        $sovereignty: {
            author_pubkey: pub_key,
            signature:     base64(signature),
            signed_at:     now_iso8601()  // informational, not hashed
        },
        $hash: "sha256:" + hex(digest)
    }
```

**RFC 6979 (deterministic ECDSA) is mandatory.** This ensures that signing the same seed twice produces the same signature, which is required for canonicalization of signed seeds and for reproducibility of lineage chains.

## Verification

```
fn verify(seed: Seed) -> Result<Unit, CryptoError>:
    if seed.$sovereignty is null:
        return Err(Unsigned)
    seed_to_verify = seed with { $sovereignty.signature = null }
    message = canonicalize(seed_to_verify)
    digest  = sha256(message)
    if digest != seed.$hash.drop_prefix("sha256:"):
        return Err(HashMismatch)
    sig = base64_decode(seed.$sovereignty.signature)
    if !ecdsa_verify_p256(digest, sig, seed.$sovereignty.author_pubkey):
        return Err(InvalidSignature)
    return Ok
```

Verification is **stateless** — it requires no network, no database, no third party. A seed can be verified offline on a device that has no knowledge of Paradigm at all, using only the Web Crypto API and the canonicalization procedure.

## Lineage Propagation

### Primordial

A primordial seed is signed once by its author. Its `$lineage.parents == []` and `$lineage.operation == "primordial"`.

### Mutation

When a seed is mutated, the mutator signs the resulting seed with *their own* key. The lineage becomes:

```
$lineage: {
  parents:   [original.$hash],
  operation: "mutate",
  generation: original.$lineage.generation + 1
}
```

The mutator becomes the sovereign author of the mutation. The original author's signature remains intact in the parent seed (which the mutator must retain or reference).

### Breeding

Breeding takes two parents and produces a child. The breeder signs the child. Both parent hashes are recorded:

```
$lineage: {
  parents:   [parent_a.$hash, parent_b.$hash],
  operation: "breed",
  generation: max(a.generation, b.generation) + 1
}
```

Royalties flow backward through the lineage at sale time (see [Royalty Propagation](#royalty-propagation) below).

### Composition

Cross-domain composition via a functor bridge produces a new seed in a different domain. The composer signs the result:

```
$lineage: {
  parents:   [source.$hash],
  operation: "compose",
  generation: source.$lineage.generation + 1
}
```

The functor identifier is stored in `$metadata.composition.functor` (not part of the hash) for auditing.

## Royalty Propagation

When a signed seed is sold via the Paradigm marketplace, the sale triggers royalty calculation that walks backward through the lineage chain:

```
fn compute_royalties(sold_seed: Seed, sale_amount: f64) -> RoyaltySplit[]:
    splits = []
    platform_fee = sale_amount * 0.10         // Paradigm takes 10%
    remaining    = sale_amount - platform_fee
    seller_share = remaining * 0.70           // seller of this sale gets 70%
    lineage_pool = remaining * 0.30           // 30% flows backward

    splits.push({ recipient: sold_seed.author, amount: seller_share })

    // Walk backward, diminishing per generation
    current = sold_seed
    gen_rate = 0.5   // each generation upstream gets half of what the last got
    pool = lineage_pool
    while current.$lineage.parents.length > 0:
        parent = resolve(current.$lineage.parents[0])  // primary parent
        gen_share = pool * gen_rate
        splits.push({ recipient: parent.author, amount: gen_share })
        pool -= gen_share
        current = parent
        if pool < dust_threshold: break

    // Any residual pool returns to the platform treasury
    splits.push({ recipient: "platform_treasury", amount: pool })

    return splits
```

The calculation is executed on-chain (Stripe Connect destination charges) at sale time. Each recipient must have a Stripe-connected account to receive their share; unclaimed shares accrue to the platform treasury and are released when the account is eventually connected.

## Key Storage

Author keys are stored client-side by default. Paradigm *never* holds a user's private key. Storage options:

1. **WebAuthn / passkey (recommended for public beta).** The private key is stored by the operating system's secure enclave or a FIDO2 authenticator and never exposed to JavaScript. Signing is delegated via the WebAuthn API.
2. **JWK in localStorage (prototype only).** The private key is exported as JWK and stored in `localStorage`. This is only acceptable for development; it must be replaced before public beta.
3. **Hardware token (enterprise).** YubiKey / smart card / HSM via WebAuthn or a native bridge.

The existing prototype uses option 2 and must migrate to option 1 before public beta. This is tracked as a P0 gap in the roadmap.

## C2PA Integration

Paradigm emits **C2PA Content Credentials** on every exported artifact (not on the seed itself — on the rendered output). The manifest binds:

- The seed's content hash.
- The seed's sovereign author public key and JWK thumbprint.
- The seed's lineage chain (hashes only, not full parents).
- The engine version that grew the artifact.
- A timestamp (from a trusted time source) and optionally a timestamp-token from a CA.

C2PA compliance is mandatory for:

- **EU AI Act Article 50** — enforcement begins August 2026.
- **California SB 942** — effective January 2026.

The manifest format is C2PA 1.x; the generator is specified in [`../compliance/c2pa-integration.md`](../compliance/c2pa-integration.md).

## Threat Model

Sovereignty defends against:

- **Authorship forgery** — an attacker claims to have created someone else's seed. Prevented by signature verification.
- **Tampering** — an attacker modifies a seed's genes after signing. Prevented by hash binding.
- **Lineage injection** — an attacker claims a seed descends from a prestigious ancestor it does not. Prevented because every link in the chain must have a valid signature by the ancestor's author.
- **Replay** — an attacker re-submits an old signed seed. Partially prevented: the signature is valid, but the marketplace de-duplicates by hash, and listings are bound to the seller's key.

Sovereignty does **not** defend against:

- **Key theft.** If an attacker steals a user's private key, they can sign new seeds as that user. The only mitigation is key rotation and WebAuthn-backed storage.
- **Off-platform copying.** An attacker can copy a rendered artifact and re-distribute it. The C2PA manifest proves original provenance but cannot physically prevent copying.
- **Coerced signing.** If a user is compelled to sign a seed, the signature is cryptographically valid. This is a legal and human-rights problem, not a cryptographic one.
