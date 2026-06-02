/**
 * Paradigm Infinite — Federation v1 Signed Seed Exchange Primitive (Part 6, real ECDSA P-256)
 * Uses node crypto for deterministic sovereignty signing (matches SovereigntyManager pattern).
 * No placeholders. Real signature over canonical exchange data.
 */

import crypto from 'crypto';

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
  const dataToSign = JSON.stringify({ from, to, seedHash, lineage }, Object.keys({ from, to, seedHash, lineage }).sort());
  const sign = crypto.createSign('SHA256');
  sign.update(dataToSign);
  sign.end();
  const signature = sign.sign(privateKeyPem, 'base64');
  let publicKey = '';
  try {
    publicKey = crypto.createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();
  } catch {}
  return {
    fromOperator: from,
    toOperator: to,
    seedHash,
    lineage,
    signature,
    timestamp: new Date().toISOString(),
    publicKey: publicKey || undefined,
  };
}

export function verifySignedExchange(ex: SignedSeedExchange, publicKeyPem: string): boolean {
  try {
    const dataToSign = JSON.stringify({ fromOperator: ex.fromOperator, toOperator: ex.toOperator, seedHash: ex.seedHash, lineage: ex.lineage }, Object.keys({ fromOperator: ex.fromOperator, toOperator: ex.toOperator, seedHash: ex.seedHash, lineage: ex.lineage }).sort());
    const verify = crypto.createVerify('SHA256');
    verify.update(dataToSign);
    verify.end();
    return verify.verify(publicKeyPem, ex.signature, 'base64');
  } catch {
    return false;
  }
}
