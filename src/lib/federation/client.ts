/**
 * Paradigm Infinite — Federation Client (P2P seed exchange)
 * 
 * Pure client for offering seeds and requesting lineage merges.
 * Uses fetch (node 18+ / undici). All calls carry ECDSA signatures.
 * 
 * Determinism: The client never mutates seeds. It only transports + verifies.
 */

import { signSovereign, verifySovereign, type SignatureBundle, type SovereignKeyPair, deriveKeyPair } from '../sovereignty/ecdsa';
import { kernelNowIso } from '../kernel/clock';

export interface FederationClientOptions {
  nodeId: string;
  privateKeySeed: string; // material used to derive sovereign key (never the real priv bytes on wire)
  baseTimeout?: number;
}

export class FederationClient {
  private keyPair: SovereignKeyPair;
  private nodeId: string;

  constructor(opts: FederationClientOptions) {
    this.nodeId = opts.nodeId;
    this.keyPair = deriveKeyPair(opts.privateKeySeed);
  }

  get publicKey() {
    return this.keyPair.publicKey;
  }

  /**
   * Offer a seed to a remote peer.
   * The remote must run the federation server.
   */
  async offer(peerUrl: string, seed: Record<string, unknown>): Promise<{ accepted: boolean; seedHash: string; receipt?: any }> {
    const canonicalSeed = { ...seed, $hash: (seed as any).$hash || (seed as any).hash };
    const signature = signSovereign(this.keyPair.privateKey, canonicalSeed, { signedAt: Date.parse(kernelNowIso()) });

    const body = {
      seed: canonicalSeed,
      signature,
      fromNode: this.nodeId,
      offeredAt: kernelNowIso(),
    };

    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/federation/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`offer_rejected: ${res.status} ${err?.error || ''}`);
    }
    return res.json();
  }

  /**
   * Request a lineage merge (push our known signed records or query).
   */
  async lineageMerge(peerUrl: string, records: Array<{ seedHash: string; lineage: string[] }>): Promise<any> {
    const signedRecords = records.map((rec) => ({
      ...rec,
      signature: signSovereign(this.keyPair.privateKey, rec),
    }));

    const body = {
      records: signedRecords,
      fromNode: this.nodeId,
      mergeId: 'client-' + Date.now().toString(36),
    };

    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/federation/lineage-merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`merge_rejected: ${res.status}`);
    return res.json();
  }

  /**
   * Verify a received bundle (convenience).
   */
  verifyReceived(bundle: SignatureBundle, payload: unknown): boolean {
    return verifySovereign(bundle, payload, bundle.publicKey);
  }
}

/**
 * One-shot helpers for scripts / CLI.
 */
export async function quickOffer(peerUrl: string, seed: Record<string, unknown>, nodeSeed = 'default-sovereign-node'): Promise<any> {
  const client = new FederationClient({ nodeId: 'cli-node', privateKeySeed: nodeSeed });
  return client.offer(peerUrl, seed);
}
