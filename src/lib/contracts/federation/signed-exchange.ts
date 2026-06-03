/**
 * Paradigm Infinite — Federation v1 Signed Seed Exchange Primitive (Part 6, real ECDSA P-256)
 * DEPRECATED proto layer (per Karpathy+doctrine reviewer 019e8af1 note on dupe: contracts/federation vs sovereignty/index.ts).
 * Canonical deterministic impl is sovereignty/index.ts (ECDSA+merkle+detMerge/detFork, kernel clock).
 * This is now a thin alias/delegate for compat (example, agent federation_action). Higher phases can remove.
 * Delegates to sovereignty calls. Uses kernelNowIso. No new weak/stubs.
 */

import crypto from 'crypto';
import { kernelNowIso } from '../../kernel/clock.js';
// delegate to canonical (avoid dupe logic); types mapped for API compat
import { createFedV1SignedExchange, verifyFedV1Exchange, type FedV1Exchange } from '../../sovereignty/index.js';

export interface SignedSeedExchange {
  fromOperator: string;
  toOperator: string;
  seedHash: string;
  lineage: string[];
  signature: string;
  timestamp: string;
  publicKey?: string;
}

export function createSignedExchange(
  from: string,
  to: string,
  seedHash: string,
  lineage: string[],
  privateKeyPem: string
): SignedSeedExchange {
  // delegate to sovereignty canonical (ECDSA+merkle); map shape (fromNode->fromOperator etc); kernel clock
  const v1: FedV1Exchange = createFedV1SignedExchange(from, to, seedHash, lineage, privateKeyPem);
  return {
    fromOperator: v1.fromNode,
    toOperator: v1.toNode,
    seedHash: v1.seedHash,
    lineage: v1.lineage,
    signature: v1.signature,
    timestamp: v1.timestamp, // already kernelNowIso from sovereignty
    publicKey: v1.publicKey,
  };
}

export function verifySignedExchange(ex: SignedSeedExchange, publicKeyPem: string): boolean {
  // adapt to FedV1 shape for delegate verify (which also checks merkle); named catch + unknown justif
  const adapted: FedV1Exchange = {
    fromNode: ex.fromOperator,
    toNode: ex.toOperator,
    seedHash: ex.seedHash,
    lineage: ex.lineage,
    signature: ex.signature,
    publicKey: ex.publicKey || publicKeyPem,
    timestamp: ex.timestamp,
    merkleRoot: '', // v1 proto compat; full merkle in sovereignty verifyFedV1
  };
  try {
    const res = verifyFedV1Exchange(adapted, publicKeyPem);
    return res.sigOk; // note: proto verify was sig only; merkle extra in canonical
  } catch (err: unknown) {
    // named catch per standards; best-effort verify for legacy proto path (non kernel)
    void err;
    return false;
  }
}
