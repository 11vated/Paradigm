# 06 — The `.gseed` Binary Format

`.gseed` is the canonical binary file format for serialized seeds. It is a length-prefixed, schema-validated MessagePack envelope containing the seed plus metadata. This spec defines the byte layout, the integrity checks, and the decoding procedure.

## Goals

1. **Compact.** Smaller than the equivalent JSON by 2–4× (MessagePack).
2. **Self-describing.** Carries its `$gst` version, so a future tool can refuse or upgrade.
3. **Tamper-evident.** Embeds a content hash and (optionally) a signature.
4. **Streamable.** A reader can decode header fields without loading the whole file.
5. **Schema-validated.** Decode fails fast with structured errors on malformed input.

## Byte Layout

```
+--------+--------------------------------------------+
| Bytes  | Field                                      |
+========+============================================+
| 0..3   | Magic: "GSED" (0x47 0x53 0x45 0x44)        |
| 4      | Format version: 0x01                        |
| 5      | Flags byte (bit field, see below)           |
| 6..13  | Total file length (u64, little-endian)      |
| 14..45 | SHA-256 of payload (32 bytes)               |
| 46..n  | Payload (MessagePack-encoded seed object)   |
| n..end | Optional appendix (signatures, attestations)|
+--------+--------------------------------------------+
```

### Magic

The file always starts with the four ASCII bytes `GSED`. This is a stable identifier that lets the OS recognize the format and lets a parser reject non-`.gseed` input immediately.

### Format version

Currently `0x01`. Increments when the byte layout changes (not when the seed `$gst` version changes — those are independent dimensions).

### Flags

| Bit | Meaning |
|---|---|
| 0 | Payload is signed (a `$sovereignty.signature` is present in the payload) |
| 1 | Payload is compressed with zstd (decode payload through zstd before MessagePack) |
| 2 | Has appendix (the file extends beyond the payload with attestations) |
| 3 | Reserved |
| 4 | Reserved |
| 5 | Reserved |
| 6 | Reserved |
| 7 | Reserved (must be 0) |

### File length

The total file length in bytes, including the 46-byte header and any appendix. Used by streaming parsers to know when to stop and as a sanity check against a truncated file.

### Payload hash

SHA-256 of the payload bytes (after any decompression). This is **not** the seed's content hash; it's a transport integrity check. The seed's content hash lives inside the payload at `$hash`.

### Payload

A MessagePack-encoded representation of the UniversalSeed JSON object. Uses the canonical "compact" MessagePack profile with no extension types except for `bin` family (raw bytes for signature data).

### Appendix

Optional. Contains additional attestations:

- C2PA manifest (binary form, per C2PA spec).
- Notary timestamps (RFC 3161 token).
- Co-signatures by collaborators.

The appendix is itself MessagePack-encoded, prefixed with its own length and SHA-256.

## Decoding Procedure

```
fn decode(bytes: &[u8]) -> Result<Seed, GseedError>:
    if bytes.len() < 46:
        return Err(TooShort)
    if bytes[0..4] != "GSED":
        return Err(BadMagic)
    if bytes[4] != 0x01:
        return Err(UnsupportedFormatVersion(bytes[4]))
    flags = bytes[5]
    total_len = u64_le(bytes[6..14])
    if bytes.len() != total_len:
        return Err(LengthMismatch)
    expected_hash = bytes[14..46]
    payload_end = if flags & 0b0000_0100 != 0 {
        find_appendix_offset(bytes)
    } else {
        total_len
    }
    payload_bytes = bytes[46..payload_end]
    actual_hash = sha256(payload_bytes)
    if actual_hash != expected_hash:
        return Err(PayloadHashMismatch)
    payload_bytes = if flags & 0b0000_0010 != 0 {
        zstd_decompress(payload_bytes)
    } else {
        payload_bytes
    }
    seed_obj = msgpack_decode(payload_bytes)
    seed = parse_universal_seed(seed_obj)?
    seed.validate()?
    if flags & 0b0000_0001 != 0:
        seed.verify_signature()?
    return Ok(seed)
```

Decode is **strict by default**. Any unknown field, any version mismatch, any hash mismatch, any signature failure, any validation failure aborts with a typed error and no partial seed is returned.

## Encoding Procedure

```
fn encode(seed: Seed, options: EncodeOptions) -> Vec<u8>:
    seed.validate()?
    payload_obj  = seed_to_msgpack_object(seed)
    payload_raw  = msgpack_encode(payload_obj)
    payload      = if options.compress {
        zstd_compress(payload_raw, level = 3)
    } else {
        payload_raw
    }
    payload_hash = sha256(payload)

    flags = 0
    if seed.$sovereignty.is_some(): flags |= 0b0000_0001
    if options.compress:            flags |= 0b0000_0010
    if options.appendix.is_some():  flags |= 0b0000_0100

    appendix_bytes = options.appendix.map(encode_appendix).unwrap_or(vec![])
    total_len = 46 + payload.len() + appendix_bytes.len()

    out = Vec::with_capacity(total_len)
    out.extend(b"GSED")
    out.push(0x01)
    out.push(flags)
    out.extend(u64_le(total_len))
    out.extend(payload_hash)
    out.extend(payload)
    out.extend(appendix_bytes)
    return out
```

## Versioning Policy

### `$gst` version (semantic content version)

Lives inside the payload. Bumped when the seed schema changes (e.g., a new gene type added, a field renamed, a new lineage operation). Tools must refuse to decode an unknown `$gst` major version and may upgrade minor versions transparently.

### Format version (transport version)

Lives in byte 4 of the file. Bumped only when the byte layout itself changes. Independent of `$gst`. Decoders must check this first and refuse unknown versions before doing anything else.

## File Extension Conventions

- `.gseed` — a single seed.
- `.gcapsule` — a `.gseed` whose appendix contains the transitive lineage of the seed (every ancestor's full seed). Used for offline auditing and museum-quality archiving.
- `.gworld` — a `.gseed` whose payload's `$domain` is `world` (a meta-domain) and whose payload contains a graph of seeds plus their composition relationships. Represents a full scene or game.
- `.gresonance` — a `.gseed` whose appendix contains pre-rendered WAV bytes for the audio domain. Lets a buyer hear the seed without running the engine.

All four use the same byte layout described above; the extension is informational.

## Implementation Notes

- MessagePack libraries: `msgpackr` (Node/browser, fast), `rmp-serde` (Rust), `msgpack-c` (C/C++).
- zstd libraries: `zstandard` (Node), `zstd` (Rust), `libzstd` (C).
- Always verify the payload hash before decoding. Decoding malformed MessagePack on hostile input is a security risk.
- Never trust the file length field alone — always cross-check it against `bytes.len()`.
- Large seeds (> 1 MB) should always be compressed.
- The optional `.gcapsule` form can be very large (a deep lineage with 100 ancestors at 50 KB each is 5 MB); always stream-parse rather than buffer in memory.
