# 05 — Binary Format & Sovereignty

*Status: IN PROGRESS*

---

## Overview

Phase 4 introduces the **`.gseed`** binary format — a sovereign, self-contained package for generative content. Each `.gseed` file contains the seed, generator parameters, provenance metadata (C2PA), and embedded outputs. This enables true content sovereignty, royalty tracking, and tamper-evident generative assets.

---

## 4.1 `.gseed` Binary Format

### Magic & Version
```
Offset 0   : 4 bytes  — Magic: "GSEE" (0x47 0x53 45 0x45)
Offset 4   : 2 bytes  — Version major (uint16)
Offset 6   : 2 bytes  — Version minor (uint16)
```

### Header
```
Offset 8   : 8 bytes  — Timestamp (uint64, Unix epoch ms)
Offset 16  : 4 bytes  — Flags (uint32)
                 bit 0: 1 = has C2PA manifest
                 bit 1: 1 = has embedded outputs
                 bit 2: 1 = encrypted seed
                 bit 3: 1 = royalty enabled
Offset 20  : 4 bytes  — Seed hash length (uint32, always 64)
Offset 24  : 64 bytes — Seed hash (SHA-512/256, 64 hex chars)
```

### Sections (TLV: Type-Length-Value)
```
For each section:
  2 bytes — Section Type (uint16)
  4 bytes — Section Length (uint32, excludes type+length)
  N bytes — Section Data
```

#### Section Types
| ID  | Name           | Description                          |
|-----|----------------|--------------------------------------|
| 1   | METADATA       | JSON metadata (author, title, etc.)  |
| 2   | PARAMS         | Generator parameters (GSPL AST)      |
| 3   | OUTPUTS        | Embedded outputs (OBJ, WAV, PNG)     |
| 4   | C2PA_MANIFEST  | C2PA provenance manifest (CBOR)      |
| 5   | ROYALTY        | Royalty configuration (JSON)         |
| 6   | SIGNATURE      | Ed25519 signature of header+sections |

### Metadata JSON Schema
```json
{
  "schema": "https://paradigm.ai/schema/gseed-metadata/v1",
  "author": "string",
  "title": "string",
  "description": "string",
  "generator": "character-v2 | music-v2 | sprite-v2",
  "tags": ["string"],
  "created": "ISO 8601 date",
  "license": "string (CC0, CC-BY, proprietary, etc.)",
  "parent": "optional parent seed hash"
}
```

### Outputs Section
Outputs are stored as a sequence of output entries:
```
For each output:
  2 bytes — Output Type (uint16): 1=OBJ, 2=WAV, 3=PNG, 4=GLTF, 5=MIDI
  2 bytes — Output Index (uint16): 0=primary, 1+=secondary
  4 bytes — Output Length (uint32)
  N bytes — Output Data
```

---

## 4.2 C2PA Compliance

### Manifest Structure (CBOR)
The C2PA manifest tracks the generative provenance:

```cbor
{
  "claim_generator": "Paradigm/1.0",
  "recipes": [{
    "ingredients": [{
      "title": "Seed Input",
      "format": "application/x-gseed-seed",
      "documentID": "<seed-hash>",
      "relationship": "input"
    }, {
      "title": "Generator",
      "format": "application/x-paradigm-generator",
      "documentID": "<generator-name>",
      "relationship": "tool"
    }],
    "actions": [{
      "action": "generative_create",
      "parameters": {
        "algorithm": "<generator-name>",
        "seed_hash": "<seed-hash>"
      }
    }]
  }],
  "assertions": [{
    "label": "paradigm.seed",
    "data": {
      "hash": "<seed-hash>",
      "algorithm": "SHA-512/256"
    }
  }, {
    "label": "paradigm.generator",
    "data": {
      "name": "<generator-name>",
      "version": "2.0"
    }
  }]
}
```

### Verification
1. Parse `.gseed` file
2. Verify magic + version
3. Calculate hash of header + sections (excluding SIGNATURE)
4. Verify Ed25519 signature against hash
5. Parse C2PA manifest
6. Verify ingredient hashes match
7. Display provenance information

---

## 4.3 Royalty System

### Royalty Configuration
```json
{
  "schema": "https://paradigm.ai/schema/gseed-royalty/v1",
  "enabled": true,
  "primary_splits": [{
    "address": "0x...",
    "percentage": 70.0,
    "role": "author"
  }, {
    "address": "0x...",
    "percentage": 30.0,
    "role": "platform"
  }],
  "resale_splits": [{
    "address": "0x...",
    "percentage": 5.0,
    "role": "author"
  }],
  "minimum_price": 0.01,
  "currency": "ETH",
  "chain": "ethereum | solana | polygon"
}
```

### Smart Contract Interface (EVM)
```solidity
interface IGSeedRoyalty {
    event RoyaltyPaid(
        bytes32 indexed seedHash,
        address payer,
        address payee,
        uint256 amount,
        string role
    );

    function payRoyalty(bytes32 seedHash) external payable;
    function getRoyaltySplits(bytes32 seedHash) external view returns (address[], uint256[]);
    function registerSeed(bytes32 seedHash, RoyaltyConfig calldata config) external;
}
```

### Royalty Enforcement
1. `.gseed` file includes royalty config in ROYALTY section
2. When content is used/sold, smart contract verifies `.gseed` signature
3. Automatic royalty distribution on-chain
4. Resale royalties (5-10%) enforced via contract

---

## 4.4 Implementation Files

| File                          | Description                          |
|-------------------------------|--------------------------------------|
| `binary-format.ts`            | `.gseed` encoder/decoder             |
| `c2pa-manifest.ts`            | C2PA manifest builder/verifier       |
| `royalty-system.ts`           | Royalty config + smart contract ABI  |
| `gseed-cli.ts`                | CLI for creating/verifying `.gseed`  |

---

## Acceptance Criteria

- [ ] `.gseed` files can be created from any generator output
- [ ] Binary format is parseable and validated
- [ ] C2PA manifest is embedded and verifiable
- [ ] Ed25519 signatures work correctly
- [ ] Royalty system can be configured
- [ ] Smart contract interface is defined
- [ ] CLI can create, verify, and inspect `.gseed` files
- [ ] Build passes with all new files

---

*Phase 4 establishes Paradigm as a sovereign generative content platform with full provenance and royalty tracking.*
