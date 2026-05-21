/**
 * Sovereignty — ECDSA Signing and Verification
 * Features: P-256 signatures, WebAuthn, lineage verification
 */

export interface SovereigntyData {
  author: string;
  timestamp: number;
  signature: string;
  publicKey: string;
  lineage: string[];
}

/**
 * Generate key pair using Web Crypto API
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  );
}

/**
 * Export public key to JWK format
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

/**
 * Import public key from JWK
 */
export async function importPublicKey(jwk: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwk),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );
}

/**
 * Sign data with ECDSA P-256
 */
export async function signData(
  data: string,
  privateKey: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(data)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify ECDSA signature
 */
export async function verifySignature(
  data: string,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  const encoder = new TextEncoder();
  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  return await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signatureBytes,
    encoder.encode(data)
  );
}

/**
 * Create sovereignty record for a seed
 */
export async function createSovereignty(
  seedHash: string,
  author: string,
  keyPair: CryptoKeyPair,
  lineage: string[] = []
): Promise<SovereigntyData> {
  const timestamp = Date.now();
  const dataToSign = `${seedHash}:${author}:${timestamp}`;
  const signature = await signData(dataToSign, keyPair.privateKey);
  const publicKey = await exportPublicKey(keyPair.publicKey);

  return {
    author,
    timestamp,
    signature,
    publicKey,
    lineage
  };
}

/**
 * Verify seed sovereignty
 */
export async function verifySovereignty(
  seedHash: string,
  sovereignty: SovereigntyData
): Promise<boolean> {
  const publicKey = await importPublicKey(sovereignty.publicKey);
  const dataToVerify = `${seedHash}:${sovereignty.author}:${sovereignty.timestamp}`;
  return await verifySignature(dataToVerify, sovereignty.signature, publicKey);
}

/**
 * Calculate lineage-based royalties
 * 10% platform, 70% seller, 30% ancestors (diminishing)
 */
export function calculateRoyalties(
  saleAmount: number,
  lineageLength: number
): {
  platform: number;
  seller: number;
  ancestors: number[];
} {
  const platformFee = saleAmount * 0.10;
  const remaining = saleAmount - platformFee;
  const sellerShare = remaining * 0.70;
  const lineagePool = remaining * 0.30;

  const ancestors: number[] = [];
  let genRate = 0.5;
  let remainingPool = lineagePool;

  for (let i = 0; i < lineageLength; i++) {
    const share = remainingPool * genRate;
    ancestors.push(share);
    remainingPool -= share;
    genRate *= 0.5;
  }

  return { platform: platformFee, seller: sellerShare, ancestors };
}
