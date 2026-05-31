# Paradigm Federation Protocol v1

**Status:** Specification  
**Phase:** 9 (Federation v1)  
**Date:** May 2026

---

## Overview

The Paradigm Federation Protocol enables peer-to-peer seed exchange between independent Paradigm nodes without requiring a central server. Two nodes can discover each other, exchange seeds, verify signatures, merge lineage, and maintain determinism.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  Node A         │         │  Node B         │
│  (Paradigm 1)   │         │  (Paradigm 2)   │
└────────┬────────┘         └────────┬────────┘
         │                          │
         │  POST /federation/offer  │
         ├─────────────────────────>│
         │  {seed, signature, ...}  │
         │                          │
         │  POST /federation/accept │
         │<─────────────────────────┤
         │  {proof-of-receipt}      │
         │                          │
         │  Both verify signatures  │
         │  Both update lineage     │
         │  Both replay seed        │
         │  ✅ Determinism proof   │
         │                          │
```

## Protocol Messages

### 1. Discovery

```typescript
interface FederationNode {
  nodeId: string;           // Unique node identifier
  hostname: string;         // Network address
  port: number;             // API port
  publicKey: string;        // ECDSA P-256 public key
  capabilities: string[];   // ['seed-exchange', 'lineage-merge', 'corpus-sync']
  lastSeen: number;         // Timestamp
}

// POST /federation/discover
// Response: list of known peers
```

### 2. Seed Offer

```typescript
interface SeedOffer {
  seed: UniversalSeed;      // The seed being offered
  signature: string;        // ECDSA signature of seed.$hash
  senderNodeId: string;     // Sender's node ID
  senderPublicKey: string;  // Sender's public key
  timestamp: number;        // When the offer was made
  offerHash: string;        // SHA-256 of the offer
}

// POST /federation/offer
// Body: SeedOffer
// Response: FederationAccept | FederationReject
```

### 3. Accept / Reject

```typescript
interface FederationAccept {
  accepted: true;
  receiverNodeId: string;
  receiverSignature: string;  // Signature of seed.$hash
  proofOfReceipt: string;     // SHA-256(offerHash + receiverNodeId + timestamp)
  lineageFork: boolean;       // Whether this creates a lineage fork
  timestamp: number;
}

interface FederationReject {
  accepted: false;
  reason: string;             // 'duplicate', 'invalid-signature', 'determinism-mismatch', etc.
}
```

### 4. Lineage Merge

```typescript
interface LineageMerge {
  seedId: string;
  parentIds: string[];
  childIds: string[];
  forkPoint: number;         // Generation where fork occurred
  mergeStrategy: 'deterministic' | 'explicit-fork';
}

// When two nodes have different versions of the same seed lineage,
// they perform a deterministic merge:
// 1. Compare seed hashes at each generation
// 2. If identical: merge is trivial (same seed)
// 3. If different: create explicit fork with both branches
```

## Determinism Verification

When a node receives a seed from another node:

1. **Verify signature** against sender's public key
2. **Replay seed** using local deterministic pipeline
3. **Compare output hash** with received hash
4. **If match**: Accept and store
5. **If mismatch**: Reject with evidence

```typescript
// Verification step
const localOutput = await growSeed(receivedSeed);
const localHash = createHash('sha256').update(JSON.stringify(localOutput)).digest('hex');
const verified = localHash === receivedSeed.$hash;
```

## Security

- All messages are signed with ECDSA P-256
- Seed hashes are verified on receipt
- Replay attacks prevented by timestamp + nonce
- No central certificate authority (trust-on-first-use)

## Privacy

- Seeds are public by default (shareable)
- Private seeds: `seed.$federation.private = true` → no export
- Lineage is preserved across exchanges
- No content inspection (only hash verification)

## Implementation

### Server Routes

```
POST /federation/discover      → List known peers
POST /federation/offer         → Send seed offer
POST /federation/accept        → Accept seed offer
POST /federation/reject        → Reject seed offer
GET  /federation/status        → Node status
GET  /federation/peers         → List connected peers
GET  /federation/lineage/:id   → Lineage tree for a seed
```

### Client Functions

```typescript
// Discover peers
const peers = await discoverPeers(nodeUrl);

// Offer a seed to a peer
const offer = await offerSeed(nodeUrl, seed, privateKey);

// Accept a seed from a peer
const accept = await acceptSeed(nodeUrl, offer, privateKey);

// Verify a received seed
const verified = await verifyReceivedSeed(receivedSeed);
```

## Future Work

- **Phase 16b**: libp2p/DHT for decentralized peer discovery
- **Phase 16c**: Merkle tree inclusion proofs for large corpus sync
- **Phase 16d**: Encrypted seed exchange for private corpora
