# 01 — UniversalSeed

The **UniversalSeed** is the atomic data structure of the entire Paradigm platform. Every artifact across every domain originates from one. This spec defines its schema, its invariants, and the operations that must be supported on it.

## Schema

A UniversalSeed is a JSON-serializable object with the following mandatory and optional fields:

```jsonc
{
  "$gst": "1.0",                       // Genetic Seed Type version (required)
  "$domain": "character",              // One of 26 domains (required)
  "$hash": "sha256:7f8b...",           // Content hash of the canonicalized seed (required)
  "$name": "Iron Warrior",             // Human-readable label (optional)
  "$lineage": {                        // Ancestry (required; empty array for primordial seeds)
    "parents": [
      "sha256:aaa...",
      "sha256:bbb..."
    ],
    "operation": "breed",              // breed | mutate | compose | primordial
    "generation": 14,                  // Depth in the lineage tree
    "timestamp": "2026-04-06T12:00:00Z"
  },
  "genes": {                           // The payload (required)
    "size":      { "type": "scalar",     "value": 1.75 },
    "archetype": { "type": "categorical","value": "warrior" },
    "color":     { "type": "vector",     "value": [0.2, 0.15, 0.1] },
    "silhouette":{ "type": "topology",   "value": { /* ... */ } },
    "motion":    { "type": "temporal",   "value": { /* ... */ } }
    // ... any number of named genes, each with a type and a value
  },
  "$fitness": {                        // Optional: cached quality evaluation
    "geometry": 0.87,
    "texture":  0.92,
    "animation":0.75,
    "coherence":0.88,
    "style":    0.81,
    "novelty":  0.64
  },
  "$sovereignty": {                    // Required for published seeds; optional for drafts
    "author_pubkey": "jwk:{...}",      // ECDSA P-256 public key in JWK form
    "signature":     "base64:...",     // ECDSA signature over the canonicalized seed sans $sovereignty.signature
    "signed_at":     "2026-04-06T12:00:00Z"
  },
  "$metadata": {                       // Free-form; not included in canonicalization for hash purposes except whitelisted fields
    "engine_version": "1.2.3",
    "license":        "CC-BY-SA-4.0",
    "tags":           ["warrior", "iron-age", "monochrome"]
  }
}
```

## Field Conventions

All top-level metadata fields begin with `$` (dollar sign) to distinguish them from user-defined gene names. This is a naming convention and also a **hard rule**: gene names must not begin with `$`. The parser and type checker enforce this.

- `$gst` — the spec version. Current: `"1.0"`. Tools must refuse to operate on unknown versions.
- `$domain` — exactly one of the 26 domain identifiers. Case-sensitive, kebab-case discouraged (use `fullgame` not `full-game`).
- `$hash` — `"sha256:" + hex(sha256(canonicalize(seed_without_hash_or_signature)))`. See [`05-sovereignty.md`](05-sovereignty.md) for the canonicalization procedure.
- `$name` — UTF-8, ≤ 128 characters. Purely informational; not used in hashing or identity.
- `$lineage.parents` — array of content hashes, one per parent. `primordial` seeds have `parents: []`. `mutate` seeds have exactly one parent. `breed` seeds have exactly two. `compose` seeds have one or more.
- `$lineage.operation` — one of `primordial | breed | mutate | compose`.
- `$lineage.generation` — integer ≥ 0. A primordial seed is generation 0; any derivative is `max(parents.generation) + 1`.
- `$lineage.timestamp` — ISO 8601 UTC. Informational only; **not** part of the content hash (would break determinism).
- `genes` — a map from gene name (a string matching `/^[a-z][a-zA-Z0-9_]*$/`) to a `{type, value}` pair where `type` is one of the 17 gene types. See [`02-gene-system.md`](02-gene-system.md).
- `$fitness` — cached from the last refinement-loop evaluation. Reproducible from the seed alone; safe to drop and recompute.
- `$sovereignty` — see [`05-sovereignty.md`](05-sovereignty.md).
- `$metadata` — any additional data, most of it explicitly *excluded* from canonicalization. Only the whitelisted subset `{engine_version, license}` participates in the hash.

## Invariants

These must hold for every UniversalSeed at all times. Tools must reject seeds that violate them.

1. **Hash correctness.** `$hash == sha256(canonicalize(seed \ {$hash, $sovereignty.signature}))`.
2. **Lineage consistency.** If `$lineage.operation == "primordial"`, then `$lineage.parents == []` and `$lineage.generation == 0`. Otherwise `parents.length >= 1` and `generation == max(parent.generation for parent in resolved_parents) + 1`.
3. **Gene name legality.** Every key in `genes` matches `/^[a-z][a-zA-Z0-9_]*$/` and does not begin with `$`.
4. **Gene type legality.** Every `genes[k].type` is one of the 17 defined gene types.
5. **Gene value legality.** Every `genes[k].value` passes the `validate()` operator for its type.
6. **Domain legality.** `$domain` is one of the 26 domains.
7. **Signature validity (if present).** `verify(seed.$sovereignty.signature, seed.$hash, seed.$sovereignty.author_pubkey) == true`.
8. **Version support.** `$gst` is a recognized version the current tool can handle.

## Operations

Every implementation must support the following operations on seeds. Signatures are given in pseudocode; return types assume a `Result<T, SeedError>` variant with typed errors.

```
fn canonicalize(seed: Seed) -> Bytes
// Deterministic, sorted, whitespace-free JSON serialization per RFC 8785 (JCS)
// plus Paradigm-specific field ordering. Used for hashing and signing.

fn hash(seed: Seed) -> ContentHash
// Computes sha256 of canonicalize(seed minus $hash and $sovereignty.signature).

fn validate(seed: Seed) -> Result<Unit, ValidationError>
// Checks all 8 invariants above. Returns structured errors.

fn sign(seed: Seed, private_key: JWK) -> Result<Seed, CryptoError>
// Produces a new seed with $sovereignty populated.

fn verify(seed: Seed) -> Result<Unit, CryptoError>
// Verifies the embedded signature.

fn mutate(seed: Seed, rate: f64, rng: DeterministicRng) -> Seed
// Applies gene-type-specific mutation operators to a fraction of the genes.
// Produces a new seed with $lineage.operation = "mutate", parents = [seed.$hash].

fn breed(parent_a: Seed, parent_b: Seed, rng: DeterministicRng) -> Seed
// Applies gene-type-specific crossover operators between matching genes.
// Produces a new seed with $lineage.operation = "breed", parents = [a.$hash, b.$hash].
// Requires both parents to be in the same $domain OR connected by a functor bridge.

fn compose(seed: Seed, target_domain: Domain, functor: Functor) -> Seed
// Applies a registered functor bridge to map a seed across domains.
// Produces a new seed with $lineage.operation = "compose", parents = [seed.$hash].

fn distance(a: Seed, b: Seed) -> f64
// Aggregates per-gene distances into a scalar seed distance.
// Used by Novelty Search, MAP-Elites, and refinement-loop deviation bounds.

fn grow(seed: Seed, engine: DomainEngine) -> Artifact
// Runs the seed through the engine's developmental pipeline, producing an artifact.
// MUST be deterministic: grow(s, e) == grow(s, e) bit-for-bit, always.
```

## Determinism Requirements

Any function that transforms a seed **must** be pure with respect to the seed's content and the deterministic RNG seeded from the seed's hash. Specifically:

- No reads of wall-clock time (except purely informational `$lineage.timestamp`).
- No `Math.random()`, `crypto.getRandomValues()` for anything other than signature nonces.
- No network I/O.
- No dependence on filesystem state or environment variables.
- No floating-point operations whose result depends on CPU architecture (use IEEE-754 double precision; avoid extended-precision intermediates; prefer integer arithmetic where possible for hash-critical paths).

Violations are treated as bugs of the highest severity. A single non-deterministic operator anywhere in the pipeline breaks reproducibility for every seed that depends on it, which breaks lineage, which breaks royalty calculations, which breaks the entire economic model.

## Primordial Seeds

A *primordial* seed is one with no parents. It must be constructed either:

1. Directly by a human author writing a GSPL program (`seed "Iron Warrior" { ... }` declaration), or
2. By the GSPL Agent from natural-language input (Concept-to-Seed pipeline, see [`intelligence/gspl-agent.md`](../intelligence/gspl-agent.md)), or
3. By loading a `.gseed` file (in which case its content hash must verify).

Primordial seeds are the roots of every lineage tree. The set of primordial seeds plus the functor bridge registry plus the breeding history determines the entire genetic library.

## Example: Minimal Character Seed

```json
{
  "$gst": "1.0",
  "$domain": "character",
  "$name": "Iron Warrior",
  "$lineage": {
    "parents": [],
    "operation": "primordial",
    "generation": 0,
    "timestamp": "2026-04-06T12:00:00Z"
  },
  "genes": {
    "size":      { "type": "scalar",     "value": 1.75 },
    "archetype": { "type": "categorical","value": "warrior" },
    "strength":  { "type": "scalar",     "value": 0.82 },
    "agility":   { "type": "scalar",     "value": 0.54 },
    "palette":   { "type": "vector",     "value": [0.2, 0.15, 0.1] }
  },
  "$hash": "sha256:<computed>",
  "$sovereignty": {
    "author_pubkey": "jwk:{...}",
    "signature":     "base64:<computed>",
    "signed_at":     "2026-04-06T12:00:00Z"
  },
  "$metadata": {
    "engine_version": "1.2.3",
    "license":        "CC-BY-SA-4.0",
    "tags":           ["warrior", "iron-age"]
  }
}
```

See [`../examples/seeds/`](../examples/seeds/) for worked examples in every domain.
