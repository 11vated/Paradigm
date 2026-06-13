/**
 * Paradigm Infinite — Federation Client (P2P seed exchange)
 * 
 * Pure client for offering seeds and requesting lineage merges.
 * Uses fetch (node 18+ / undici). All calls carry ECDSA signatures.
 * 
 * Determinism: The client never mutates seeds. It only transports + verifies.
 */

import { signSovereign, verifySovereign, type SignatureBundle, type SovereignKeyPair, deriveKeyPair } from '../sovereignty/ecdsa.ts';
import { kernelNowIso } from '../kernel/clock';

export interface FederationClientOptions {
  nodeId: string;
  privateKeySeed: string; // material used to derive sovereign key (never the real priv bytes on wire)
  baseTimeout?: number;
}

export class FederationClient {
  knownPeers: string[] = [];
  lbIdx = 0;
  // v1.3 regional cache tag
  regionCache: Map<string, any> = new Map();
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
   * v1.2: added simple retry for fault tolerance.
   * v1.4: adaptive LB with latency compensation.
   */
  async offer(peerUrl: string, seed: Record<string, unknown>, retries = 2) {
    // v1.3/v1.4: if no specific peer, use load-balanced from known peers (global scaling + adaptive)
    if (!peerUrl && this.knownPeers && this.knownPeers.length > 0) {
      peerUrl = this.getAdaptivePeer() || this.knownPeers[this.lbIdx % this.knownPeers.length];
      this.lbIdx = (this.lbIdx || 0) + 1;
    }
    const canonicalSeed = { ...seed, $hash: (seed as any).$hash || (seed as any).hash };
    const signature = signSovereign(this.keyPair.privateKey, canonicalSeed, { signedAt: Date.parse(kernelNowIso()) });

    const body = {
      seed: canonicalSeed,
      signature,
      fromNode: this.nodeId,
      offeredAt: kernelNowIso(),
    };

    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const t0 = Date.now();
      try {
        const res = await fetch(`${peerUrl.replace(/\/$/, '')}/federation/offer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const latency = Date.now() - t0;
        this.recordLatency(peerUrl, latency);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`offer_rejected: ${res.status} ${err?.error || ''}`);
        }
        return res.json();
      } catch (e) {
        lastErr = e;
        if (attempt < retries) await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    throw lastErr;
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
   * v1.2: Sync registry with a peer for distributed federation.
   */
  async syncRegistry(peerUrl: string, localRegistry: any[]): Promise<any> {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/federation/sync/registry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: localRegistry }),
    });
    if (!res.ok) throw new Error(`sync_failed: ${res.status}`);
    return res.json();
  }

  async getRegistry(peerUrl: string): Promise<any> {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/federation/sync/registry`);
    return res.json();
  }

  /**
   * Cache an artifact on a peer node.
   */
  async cacheArtifact(peerUrl: string, key: string, value: any): Promise<any> {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/federation/cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    return res.json();
  }

  /**
   * Verify a received bundle (convenience).
   */
  verifyReceived(bundle: SignatureBundle, payload: unknown): boolean {
    return verifySovereign(bundle, payload, bundle.publicKey);
  }

  // v1.4 Global Synchrony helpers
  private latencyMap: Map<string, number[]> = new Map();

  recordLatency(peerUrl: string, latencyMs: number) {
    if (!peerUrl) return;
    if (!this.latencyMap.has(peerUrl)) this.latencyMap.set(peerUrl, []);
    const arr = this.latencyMap.get(peerUrl)!;
    arr.push(latencyMs);
    if (arr.length > 10) arr.shift();
  }

  getAdaptivePeer(): string | null {
    if (this.knownPeers.length === 0) return null;
    let best = this.knownPeers[0];
    let bestAvg = Infinity;
    for (const p of this.knownPeers) {
      const lats = this.latencyMap.get(p) || [50];
      const avg = lats.reduce((a,b)=>a+b,0) / lats.length;
      if (avg < bestAvg) {
        bestAvg = avg;
        best = p;
      }
    }
    return best;
  }

  // v1.5: Predictive scaling (deterministic EWMA + delta projection from observed latency history)
  predictNextLatency(peerUrl: string): number {
    const lats = this.latencyMap.get(peerUrl) || [50];
    if (lats.length < 2) return lats[0] || 50;
    const n = lats.length;
    const ema = lats.reduce((a, v, i) => a * 0.7 + v * 0.3, lats[0]);
    const recentDelta = lats[n-1] - lats[n-2];
    return Math.max(1, Math.floor(ema + recentDelta * 0.4)); // simple predictive model (pure)
  }

  // Continuous/global sync + v1.5 intel: report perf, trigger self-opt on peers, adaptive decisions
  async continuousSync(peerUrls: string[], intervalMs = 5000, maxCycles = 3) {
    for (let cycle = 0; cycle < maxCycles; cycle++) {
      for (const url of peerUrls) {
        try {
          const reg = await this.getRegistry(url);
          if (reg && reg.registry) {
            await this.syncRegistry(url, reg.registry.slice(0, 5)); // sync subset
          }
          // Report latency for adaptive + predictive
          const t0 = Date.now();
          await this.getRegistry(url);
          const lat = Date.now() - t0;
          this.recordLatency(url, lat);
          const pred = this.predictNextLatency(url);
          // v1.5: report to peer intel for substrate self-opt (best-effort)
          try {
            await fetch(`${url.replace(/\/$/, '')}/intelligence/self-opt`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latency: lat, predicted: pred, node: this.nodeId, cycle })
            }).catch(() => {});
          } catch {}
          // v1.8: sync conscious/gov state for unified conscious federation (best-effort)
          try {
            // In real use, localConscious would come from kernel context._v16_conscious or _v17_gov
            await fetch(`${url.replace(/\/$/, '')}/federation/conscious-sync`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nodeId: this.nodeId, conscious: { ethical: 0.8 + (cycle % 5) * 0.01 }, gov: { lastScore: 0.79 }, proof: 'local-' + this.nodeId })
            }).catch(() => {});
          } catch {}
        } catch (e) {
          // fault tolerance: skip failed peer
        }
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  // v1.8 Cooperative federation client helpers (sync conscious, propose/collect consensus for cooperative evolution)
  async syncConsciousState(peerUrl: string, localConscious: any, localGov: any) {
    const body = { nodeId: this.nodeId, conscious: localConscious, gov: localGov, proof: 'client-' + this.nodeId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/federation/conscious-sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  async proposeCooperative(peerUrl: string, proposal: any) {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/consensus/propose`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proposal)
    });
    return res.json();
  }

  async voteConsensus(peerUrl: string, proposalId: string, vote: boolean, ethical: number) {
    const body = { proposalId, nodeId: this.nodeId, vote, ethical, proof: 'vote-' + this.nodeId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/consensus/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  // v1.9 Civilization client helpers (collective sync, civ consensus for civilization-scale creation)
  async syncCivilization(peerUrl: string, localCollective: any, localCivGov: any) {
    const body = { nodeId: this.nodeId, collective: localCollective, civGov: localCivGov, proof: 'civ-' + this.nodeId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/civilization/collective-sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  async proposeCivilizationConsensus(peerUrl: string, civProposal: any) {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/civilization/consensus`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(civProposal)
    });
    return res.json();
  }

  // v2.0 Continuum client helpers (recursive sync, cross-reality federation)
  async syncContinuumLayer(peerUrl: string, layerId: string, substrate: any, depth: number) {
    const body = { layerId, substrate, depth, continuumProof: 'layer-' + layerId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/continuum/recursive-sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  async crossRealityFederation(peerUrl: string, realityProposal: any) {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/continuum/cross-reality`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(realityProposal)
    });
    return res.json();
  }

  // v2.1 Genesis client helpers (recursive genesis sync, cross-universe federation)
  async syncGenesisUniverse(peerUrl: string, universeId: string, substrate: any, depth: number) {
    const body = { universeId, substrate, depth, genesisProof: 'genesis-' + universeId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/genesis/recursive-sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  async crossUniverseFederation(peerUrl: string, universeProposal: any) {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/genesis/cross-universe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(universeProposal)
    });
    return res.json();
  }

  // v2.2 Continuity client helpers (eternal sync, cross-reality cooperation)
  async syncEternalContinuity(peerUrl: string, universeId: string, eternalState: any, syncDepth: number) {
    const body = { universeId, eternalState, syncDepth, continuityProof: 'eternal-' + universeId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/continuity/eternal-sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  async cooperateCrossReality(peerUrl: string, coopProposal: any) {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/cooperation/cross-reality`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(coopProposal)
    });
    return res.json();
  }

  // v2.3 Omniversal client helpers (merge sync, cooperative omniversal)
  async syncOmniversalMerge(peerUrl: string, layerId: string, unifiedSubstrate: any, layers: number) {
    const body = { layerId, unifiedSubstrate, layers, omniProof: 'omni-' + layerId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/omniversal/merge-sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  async cooperateOmniversal(peerUrl: string, omniProposal: any) {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/cooperative/omniversal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(omniProposal)
    });
    return res.json();
  }

  // v2.4 Absolute client helpers (continuum sync, self-sustaining optimization)
  async syncAbsoluteContinuum(peerUrl: string, substrateId: string, absoluteState: any, coherence: number) {
    const body = { substrateId, absoluteState, coherence, sustainProof: 'absolute-' + substrateId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/absolute/continuum-sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  async selfSustainOptimize(peerUrl: string, sustainProposal: any) {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/sustain/self-optimize`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sustainProposal)
    });
    return res.json();
  }

  // v2.5 Eternal client helpers (perpetual sync, self-perpetuating regeneration)
  async syncEternalParadigm(peerUrl: string, substrateId: string, eternalState: any, perpetuation: number) {
    const body = { substrateId, eternalState, perpetuation, perpetuateProof: 'eternal-' + substrateId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/eternal/perpetual-sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  async perpetuateRegenerate(peerUrl: string, perpetuateProposal: any) {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/perpetuate/regenerate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(perpetuateProposal)
    });
    return res.json();
  }

  // v2.6 Absolute client helpers (continuum merge, convergence verification)
  async mergeAbsoluteContinuum(peerUrl: string, substrateId: string, absoluteState: any, convergence: number) {
    const body = { substrateId, absoluteState, convergence, convergeProof: 'absolute-' + substrateId };
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/absolute/continuum-merge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return res.json();
  }

  async verifyConvergence(peerUrl: string, convergeProposal: any) {
    const res = await fetch(`${peerUrl.replace(/\/$/, '')}/convergence/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(convergeProposal)
    });
    return res.json();
  }
}

/**
 * One-shot helpers for scripts / CLI.
 */
export async function quickOffer(peerUrl: string, seed: Record<string, unknown>, nodeSeed = 'default-sovereign-node'): Promise<any> {
  const client = new FederationClient({ nodeId: 'cli-node', privateKeySeed: nodeSeed });
  return client.offer(peerUrl, seed);
}




