import crypto from 'crypto';
import { kernelNowIso } from '../kernel/clock.js';
import { canonicalizeSeed } from './canonical.js';

export class SovereigntyLayer {
  /**
   * Generates a new ECDSA P-256 keypair for signing seeds.
   */
  static generateKeys(): { public_key: string, private_key: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return {
      public_key: publicKey,
      private_key: privateKey
    };
  }

  /**
   * Serializes the core immutable properties of a seed for signing/verification.
   * This ensures that any change to genes, domain, or lineage invalidates the signature.
   */
  private static serializeSeedForSigning(seed: unknown): string {
    // unknown + narrow justified: dynamic seed shape from any domain (genes/lineage vary); canonicalizeSeed handles unknown safely
    const s = seed as { id?: string; $domain?: string; genes?: unknown; $hash?: string; $lineage?: unknown };
    const coreData = {
      id: s.id,
      domain: s.$domain,
      genes: s.genes,
      hash: s.$hash,
      lineage: s.$lineage
    };
    
    // Deterministic JSON stringification (prefer canonical for full cross-peer)
    try {
      const { canonicalJson } = canonicalizeSeed(seed);
      return canonicalJson;
    } catch {
      return JSON.stringify(coreData, Object.keys(coreData).sort());
    }
  }

  /**
   * Signs a seed using the provided private key.
   */
  static signSeed(seed: unknown, privateKeyPem: string): { signature: string; public_key: string; signed_at: string } {
    const dataToSign = this.serializeSeedForSigning(seed);
    
    const sign = crypto.createSign('SHA256');
    sign.update(dataToSign);
    sign.end();
    
    const signature = sign.sign(privateKeyPem, 'base64');
    
    return {
      signature,
      public_key: crypto.createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString(),
      signed_at: kernelNowIso() // use kernel clock for det-spine compliance (no direct wall)
    };
  }

  /**
   * Verifies a seed's signature using the provided public key.
   */
  static verifySeed(seed: unknown, publicKeyPem: string): boolean {
    const s = seed as { $sovereignty?: { signature?: string; public_key?: string } };
    if (!s.$sovereignty || !s.$sovereignty.signature) {
      return false;
    }

    const dataToVerify = this.serializeSeedForSigning(seed);
    
    const verify = crypto.createVerify('SHA256');
    verify.update(dataToVerify);
    verify.end();
    
    // Use the public key provided, or fallback to the one in the sovereignty object
    const keyToUse = publicKeyPem || s.$sovereignty.public_key;
    
    if (!keyToUse) return false;

    try {
      return verify.verify(keyToUse, s.$sovereignty.signature, 'base64');
    } catch {
      // no console per standards; named silent only on verify contract (expected for bad sigs)
      return false;
    }
  }
}

// === Federation v1 (Part 6 / XVI per 13_): two-node signed seed exchange, no central, lineage preserve, det merge/fork, crypto+merkle ===
// Small addition to existing ECDSA layer. Uses canonical + merkle for verify. Deterministic (no Date for ids; hash-derived).

import { createHash } from 'crypto';
import { MerkleTree, verifyInclusion, type InclusionProof } from '../intelligence/federation/merkle.js';

export interface FedV1Exchange {
  fromNode: string;
  toNode: string;
  seedHash: string;
  lineage: string[];
  signature: string;
  publicKey: string;
  timestamp: string;
  merkleRoot: string;
}

export function createFedV1SignedExchange(
  fromNode: string,
  toNode: string,
  seedHash: string,
  lineage: string[],
  privateKeyPem: string
): FedV1Exchange {
  // canonical data for sign (no wall time in signed payload)
  const dataToSign = JSON.stringify({ fromNode, toNode, seedHash, lineage }, Object.keys({ fromNode, toNode, seedHash, lineage }).sort());
  const sign = crypto.createSign('SHA256');
  sign.update(dataToSign);
  sign.end();
  const signature = sign.sign(privateKeyPem, 'base64');
  const publicKey = crypto.createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();

  // Merkle over lineage for inclusion proofs (v1 support)
  const leafHashes = lineage.length > 0 ? lineage.map(l => createHash('sha256').update(l).digest('hex')) : [createHash('sha256').update(seedHash).digest('hex')];
  const tree = new MerkleTree(leafHashes);
  const merkleRoot = tree.root;

  return {
    fromNode,
    toNode,
    seedHash,
    lineage,
    signature,
    publicKey,
    timestamp: kernelNowIso(),
    merkleRoot,
  };
}

export function verifyFedV1Exchange(ex: FedV1Exchange, publicKeyPem: string): { sigOk: boolean; merkleOk: boolean; proof?: InclusionProof } {
  try {
    const dataToSign = JSON.stringify({ fromNode: ex.fromNode, toNode: ex.toNode, seedHash: ex.seedHash, lineage: ex.lineage }, Object.keys({ fromNode: ex.fromNode, toNode: ex.toNode, seedHash: ex.seedHash, lineage: ex.lineage }).sort());
    const verify = crypto.createVerify('SHA256');
    verify.update(dataToSign);
    verify.end();
    const sigOk = verify.verify(publicKeyPem, ex.signature, 'base64');

    // Merkle verify: root matches recompute, and can produce inclusion for seedHash if present
    const leafHashes = ex.lineage.length > 0 ? ex.lineage.map(l => createHash('sha256').update(l).digest('hex')) : [createHash('sha256').update(ex.seedHash).digest('hex')];
    const tree = new MerkleTree(leafHashes);
    const merkleOk = tree.root === ex.merkleRoot;

    let proof: InclusionProof | undefined;
    const idx = ex.lineage.indexOf(ex.seedHash);
    if (idx >= 0) {
      proof = tree.proveByIndex(idx);
    } else if (leafHashes.length === 1) {
      proof = tree.proveByIndex(0);
    }
    if (proof && !verifyInclusion(proof, ex.merkleRoot)) {
      return { sigOk, merkleOk: false };
    }
    return { sigOk, merkleOk, proof };
  } catch {
    return { sigOk: false, merkleOk: false };
  }
}

/**
 * Det merge: preserve union lineage (sorted for bit-idempotence). Fork flag if divergence detected (overlapping but inconsistent lengths).
 * Returns new signed exchange for the result. Uses ECDSA.
 */
export function detMergeFed(
  incoming: FedV1Exchange,
  localSeedHash: string,
  localLineage: string[],
  operatorPrivateKeyPem: string
): { success: boolean; mergedSeedId: string; lineage: string[]; conflicts: string[]; fork: boolean; newExchange?: FedV1Exchange } {
  const combined = Array.from(new Set([...(incoming.lineage || []), ...localLineage, localSeedHash, incoming.seedHash]));
  const sortedLineage = combined.sort(); // det order
  const fork = (incoming.lineage.length > 0 && localLineage.length > 0) && (incoming.lineage.length !== localLineage.length); // simple divergence heuristic for v1
  const mergedId = `merge-${createHash('sha256').update(sortedLineage.join('|') + incoming.seedHash).digest('hex').slice(0, 12)}`; // det, no Date

  const newEx = createFedV1SignedExchange('merged-node', 'local-node', mergedId, sortedLineage, operatorPrivateKeyPem);

  return {
    success: true,
    mergedSeedId: mergedId,
    lineage: sortedLineage,
    conflicts: fork ? ['lineage-divergence'] : [],
    fork,
    newExchange: newEx,
  };
}

/**
 * Det fork: explicit branch preserving parent lineage. Det id.
 */
export function detForkFed(
  sourceSeedHash: string,
  sourceLineage: string[],
  newOperatorPrivateKeyPem: string
): { success: boolean; forkedSeedId: string; newLineage: string[]; forkExchange?: FedV1Exchange } {
  const newLineage = [...sourceLineage, sourceSeedHash].sort();
  const forkedId = `fork-${createHash('sha256').update(newLineage.join('|')).digest('hex').slice(0, 12)}`; // det

  const forkEx = createFedV1SignedExchange('system', 'fork-operator', forkedId, newLineage, newOperatorPrivateKeyPem);

  return {
    success: true,
    forkedSeedId: forkedId,
    newLineage,
    forkExchange: forkEx,
  };
}

/** Simulate two independent nodes performing signed exchange (no central server; pure func, for CLI/demo) */
export function simulateTwoNodeFedExchange(
  seedHash: string,
  initialLineage: string[],
  nodeAPriv: string,
  nodeBPriv: string
): { nodeAtoB: FedV1Exchange; verified: boolean; merged?: ReturnType<typeof detMergeFed> } {
  const exAB = createFedV1SignedExchange('nodeA', 'nodeB', seedHash, initialLineage, nodeAPriv);
  const v = verifyFedV1Exchange(exAB, /*pub would derive but for sim pass pub? use from ex*/ exAB.publicKey);
  const verified = v.sigOk && v.merkleOk;

  let merged;
  if (verified) {
    merged = detMergeFed(exAB, seedHash + '-local', [...initialLineage, 'local-anc'], nodeBPriv);
  }
  return { nodeAtoB: exAB, verified, merged };
}
