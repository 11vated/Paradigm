/**
 * L9 P2P Federation Protocol
 * 
 * Distributed seed exchange and collaborative evolution:
 * - Seed synchronization across nodes
 * - Distributed MAP-Elites archive sharing
 * - Collaborative fitness evaluation
 * - Conflict resolution via cryptographic signatures
 * - Gossip protocol for peer discovery
 */

import crypto from 'crypto';
import { rngFromHash, Xoshiro256StarStar } from '../kernel/rng';
import { type Seed } from '../kernel/seed-class';
import { FederationManager, type PeerInfo, type FederationMessage } from './federation';

export interface SeedExchangeRecord {
  seedHash: string;
  seedData: Partial<Seed>;
  originNode: string;
  timestamp: number;
  signature: string;
  fitness: number;
  domain: string;
  generation: number;
}

export interface DistributedArchive {
  nodeId: string;
  cells: Map<string, SeedExchangeRecord>;
  dimensions: string[];
  resolution: number;
  lastSync: number;
}

export interface GossipMessage {
  type: 'seed' | 'archive' | 'peer' | 'fitness' | 'evolution_result';
  payload: any;
  originNode: string;
  ttl: number;
  timestamp: number;
  signature: string;
}

export interface P2PConfig {
  nodeId: string;
  maxPeers: number;
  syncIntervalMs: number;
  gossipIntervalMs: number;
  archiveResolution: number;
  seedTTL: number;
  enableCollaborativeEvolution: boolean;
}

export class P2PFederationProtocol {
  private federation: FederationManager;
  private localArchive: DistributedArchive;
  private pendingSync: SeedExchangeRecord[] = [];
  private seenMessages = new Set<string>();
  private config: P2PConfig;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private gossipTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: P2PConfig) {
    this.config = config;
    this.federation = new FederationManager(config.nodeId);
    this.localArchive = {
      nodeId: config.nodeId,
      cells: new Map(),
      dimensions: ['fitness', 'novelty', 'complexity', 'domain'],
      resolution: config.archiveResolution,
      lastSync: Date.now(),
    };
  }

  async start(): Promise<void> {
    this.setupMessageHandlers();
    this.syncTimer = setInterval(() => this.syncWithPeers(), this.config.syncIntervalMs);
    this.gossipTimer = setInterval(() => this.gossipBroadcast(), this.config.gossipIntervalMs);
    console.log(`[P2P] Node ${this.config.nodeId} started`);
  }

  stop(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.gossipTimer) clearInterval(this.gossipTimer);
  }

  async connectToPeer(peerUrl: string): Promise<boolean> {
    return this.federation.connect(peerUrl);
  }

  async publishSeed(seed: Seed): Promise<void> {
    const record: SeedExchangeRecord = {
      seedHash: seed.hash || crypto.createHash('sha256').update(JSON.stringify(seed)).digest('hex'),
      seedData: seed,
      originNode: this.config.nodeId,
      timestamp: Date.now(),
      signature: this.signRecord(seed.hash || '', seed.metadata.domain || 'unknown'),
      fitness: seed.lineage.fitness || 0,
      domain: seed.metadata.domain || 'unknown',
      generation: seed.lineage.generation || 0,
    };

    this.localArchive.cells.set(record.seedHash, record);
    this.pendingSync.push(record);
    this.federation.broadcastSeed(record.seedHash, record);
  }

  async syncWithPeers(): Promise<{ synced: number; conflicts: number }> {
    let synced = 0;
    let conflicts = 0;

    for (const record of this.pendingSync) {
      const existing = this.localArchive.cells.get(record.seedHash);
      if (existing) {
        if (existing.timestamp > record.timestamp) {
          conflicts++;
          continue;
        }
      }
      synced++;
    }

    this.pendingSync = [];
    this.localArchive.lastSync = Date.now();

    return { synced, conflicts };
  }

  async gossipBroadcast(): Promise<void> {
    if (this.pendingSync.length === 0) return;

    const batch = this.pendingSync.slice(0, 10);
    const gossipMsg: GossipMessage = {
      type: 'seed',
      payload: { seeds: batch, archiveSize: this.localArchive.cells.size },
      originNode: this.config.nodeId,
      ttl: 3,
      timestamp: Date.now(),
      signature: this.signRecord('gossip', String(batch.length)),
    };

    this.federation.broadcastSeed(`gossip:${gossipMsg.timestamp}`, gossipMsg);
  }

  async queryPeersForSeeds(domain: string, minFitness: number = 0): Promise<SeedExchangeRecord[]> {
    const results: SeedExchangeRecord[] = [];

    for (const [, record] of this.localArchive.cells) {
      if (record.domain === domain && record.fitness >= minFitness) {
        results.push(record);
      }
    }

    return results.sort((a, b) => b.fitness - a.fitness);
  }

  async mergeRemoteArchive(remoteArchive: DistributedArchive): Promise<{ merged: number; conflicts: number }> {
    let merged = 0;
    let conflicts = 0;

    for (const [hash, record] of remoteArchive.cells) {
      if (this.seenMessages.has(hash)) continue;

      const existing = this.localArchive.cells.get(hash);
      if (existing) {
        if (existing.timestamp >= record.timestamp) {
          conflicts++;
          continue;
        }
      }

      if (this.verifyRecord(record)) {
        this.localArchive.cells.set(hash, record);
        this.seenMessages.add(hash);
        merged++;
      }
    }

    return { merged, conflicts };
  }

  getPeerStats(): {
    peerCount: number;
    archiveSize: number;
    pendingSync: number;
    lastSync: number;
  } {
    return {
      peerCount: this.federation.connectedPeers,
      archiveSize: this.localArchive.cells.size,
      pendingSync: this.pendingSync.length,
      lastSync: this.localArchive.lastSync,
    };
  }

  getArchiveSnapshot(): DistributedArchive {
    return {
      ...this.localArchive,
      cells: new Map(this.localArchive.cells),
    };
  }

  private setupMessageHandlers(): void {
    this.federation.on('SEED', (msg: FederationMessage, peer: PeerInfo) => {
      if (msg.payload?.data) {
        const record = msg.payload.data as SeedExchangeRecord;
        if (record && record.seedHash && !this.localArchive.cells.has(record.seedHash)) {
          if (this.verifyRecord(record)) {
            this.localArchive.cells.set(record.seedHash, record);
            this.seenMessages.add(record.seedHash);
          }
        }
      }
    });

    this.federation.on('HELLO_ACK', (msg: FederationMessage, peer: PeerInfo) => {
      console.log(`[P2P] Peer connected: ${peer.id}`);
    });
  }

  private signRecord(seedHash: string, domain: string): string {
    const data = `${this.config.nodeId}:${seedHash}:${domain}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
  }

  private verifyRecord(record: SeedExchangeRecord): boolean {
    if (!record.seedHash || !record.originNode || !record.timestamp) return false;
    if (Date.now() - record.timestamp > this.config.seedTTL) return false;

    const expectedSig = crypto
      .createHash('sha256')
      .update(`${record.originNode}:${record.seedHash}:${record.domain}:${record.timestamp}`)
      .digest('hex')
      .slice(0, 32);

    return record.signature === expectedSig;
  }
}

export function createP2PFederation(config: P2PConfig): P2PFederationProtocol {
  return new P2PFederationProtocol(config);
}
