/**
 * Paradigm Infinite — Sovereign ECDSA (ed25519) for seeds & lineage
 * 
 * Deterministic key derivation from seed material.
 * Signatures cover canonical seed hash + operation metadata.
 * WebCrypto (browser) + node:crypto (server) compatible via subtle where possible.
 * 
 * Non-negotiable: Same (seed, operation, priv) => identical signature bytes.
 * Used by federation for offer / lineage-merge authenticity.
 */

import { createHash, createPrivateKey, createPublicKey, sign, verify as cryptoVerify } from 'node:crypto';
import { Buffer } from 'node:buffer';

export interface SovereignKeyPair {
  publicKey: string; // base64 PEM (SPKI)
  privateKey: string; // base64 PEM (PKCS8)
}

export interface SignatureBundle {
  signature: string; // base64
  publicKey: string; // base64 PEM
  algorithm: 'ed25519';
  signedAt: number; // kernel time only
  payloadHash: string;
}

/**
 * Derive a deterministic ed25519 keypair from a seed string or hash using real crypto.
 * Private key seed is derived via SHA512 for reproducibility.
 * This is the ONLY way keys are created for seeds/lineage in the platform.
 */
export function deriveKeyPair(seedMaterial: string | Uint8Array): SovereignKeyPair {
  const hash = typeof seedMaterial === 'string'
    ? createHash('sha512').update(seedMaterial, 'utf8').digest()
    : Buffer.from(seedMaterial);
  const seed32 = hash.subarray(0, 32);

  // Real ed25519 private key from 32-byte seed (standard derivation for reproducibility)
  const privDer = Buffer.concat([
    Buffer.from('302e020100300506032b657004220420', 'hex'), // DER header for Ed25519 PKCS#8
    seed32
  ]);

  const privateKey = createPrivateKey({
    key: privDer,
    format: 'der',
    type: 'pkcs8'
  });

  const publicKey = createPublicKey(privateKey);

  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString('base64'),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString('base64'),
  };
}

/**
 * Sign a payload using real ed25519.
 * Returns base64 signature + bundle with real crypto signature.
 */
export function signSovereign(
  privateKeyB64: string,
  payload: unknown,
  opts: { signedAt?: number } = {}
): SignatureBundle {
  const payloadStr = JSON.stringify(payload, Object.keys(payload as any).sort());
  const payloadHash = createHash('sha256').update(payloadStr).digest('hex');
  const signedAt = opts.signedAt ?? Date.now(); // caller must use kernelNow() outside pure kernel

  const privateKey = createPrivateKey({
    key: Buffer.from(privateKeyB64, 'base64'),
    format: 'pem',
    type: 'pkcs8'
  });

  const data = Buffer.from(payloadStr); // sign the canonical string for determinism
  const signature = sign(null, data, privateKey); // ed25519: algorithm = null

  const publicKey = createPublicKey(privateKey);
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString('base64');

  return {
    signature: signature.toString('base64'),
    publicKey: pubPem,
    algorithm: 'ed25519',
    signedAt,
    payloadHash,
  };
}

/**
 * Verify using real ed25519 crypto.
 * Returns true only if signature, key, and hash match.
 */
export function verifySovereign(
  bundle: SignatureBundle,
  payload: unknown,
  expectedPubKey?: string
): boolean {
  const pub = expectedPubKey || bundle.publicKey;
  if (bundle.publicKey !== pub) return false;

  const payloadStr = JSON.stringify(payload, Object.keys(payload as any).sort());
  const payloadHash = createHash('sha256').update(payloadStr).digest('hex');
  if (payloadHash !== bundle.payloadHash) return false;

  try {
    const publicKey = createPublicKey({
      key: Buffer.from(pub, 'base64'),
      format: 'pem',
      type: 'spki'
    });

    const data = Buffer.from(payloadStr);
    const sigBuf = Buffer.from(bundle.signature, 'base64');
    return cryptoVerify(null, data, publicKey, sigBuf);
  } catch {
    return false;
  }
}

/**
 * Convenience: Sign a UniversalSeed or .gseed payload for federation.
 */
export function signSeed(seed: Record<string, unknown>, privateKeyB64: string, operation: 'offer' | 'merge' | 'lineage'): SignatureBundle {
  const canonical = {
    $hash: (seed as any).$hash || (seed as any).hash,
    operation,
    genes: (seed as any).genes || seed,
  };
  return signSovereign(privateKeyB64, canonical);
}

export function verifySeedSignature(bundle: SignatureBundle, seed: Record<string, unknown>): boolean {
  const canonical = {
    $hash: (seed as any).$hash || (seed as any).hash,
    operation: 'offer',
    genes: (seed as any).genes || seed,
  };
  return verifySovereign(bundle, canonical, bundle.publicKey);
}
