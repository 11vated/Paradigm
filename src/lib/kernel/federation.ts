import crypto from 'crypto';
import http from 'http';
import { substrateLibrary, type SubstrateEntry } from './substrate-library';
import { kernelNow, kernelNowIso } from './clock';

// ─── PEER STATE ───────────────────────────────────────────────────────────

export interface PeerInfo {
  id: string;
  url: string;
  pubkey?: string;
  firstSeen: string;
  lastSeen: string;
  seedCount: number;
  trustLevel: number;
}

export interface FederationMessage {
  type: 'HELLO' | 'HELLO_ACK' | 'ELITES' | 'SEED' | 'QUERY' | 'QUERY_RESULT' | 'PING' | 'PONG';
  peerId: string;
  payload?: any;
  timestamp: string;
  signature?: string;
}

// ─── FEDERATION MANAGER ───────────────────────────────────────────────────

export class FederationManager {
  private peers = new Map<string, PeerInfo>();
  private knownSeeds = new Set<string>();
  private messageHandlers = new Map<string, (msg: FederationMessage, peer: PeerInfo) => void>();

  constructor(private nodeId: string, private listenPort: number = 0) {}

  get connectedPeers(): number { return this.peers.size; }
  get knownSeedCount(): number { return this.knownSeeds.size; }

  /**
   * Register a handler for a specific message type.
   */
  on(type: string, handler: (msg: FederationMessage, peer: PeerInfo) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Connect to a remote peer.
   */
  async connect(peerUrl: string): Promise<boolean> {
    const peerId = crypto.createHash('sha256').update(peerUrl).digest('hex').slice(0, 16);
    // Prevent duplicate connection
    if (this.peers.has(peerId)) return true;

    const msg: FederationMessage = {
      type: 'HELLO',
      peerId: this.nodeId,
      payload: { seedCount: this.knownSeeds.size, substrateSize: substrateLibrary.size },
      timestamp: kernelNowIso(),
    };

    try {
      const response = await this.sendMessage(peerUrl, msg);
      if (response && response.type === 'HELLO_ACK') {
        const peer: PeerInfo = {
          id: peerId, url: peerUrl, seedCount: response.payload?.seedCount || 0,
          firstSeen: kernelNowIso(), lastSeen: kernelNowIso(),
          trustLevel: 0.5,
        };
        this.peers.set(peerId, peer);
        this.knownSeeds.add(peerId);
        return true;
      }
    } catch {}

    return false;
  }

  /**
   * Broadcast a seed to all connected peers.
   */
  broadcastSeed(seedHash: string, seedData?: any): void {
    const msg: FederationMessage = {
      type: 'SEED',
      peerId: this.nodeId,
      payload: { hash: seedHash, data: seedData },
      timestamp: kernelNowIso(),
    };
    for (const [peerId, peer] of this.peers) {
      try {
        this.sendMessage(peer.url, msg).catch(() => this.peers.delete(peerId));
      } catch {}
    }
  }

  /**
   * Query peers for a specific seed or concept.
   */
  async queryNetwork(query: string): Promise<SubstrateEntry[]> {
    const results: SubstrateEntry[] = [];
    const msg: FederationMessage = {
      type: 'QUERY',
      peerId: this.nodeId,
      payload: { query },
      timestamp: kernelNowIso(),
    };

    for (const [peerId, peer] of this.peers) {
      try {
        const response = await this.sendMessage(peer.url, msg);
        if (response && response.type === 'QUERY_RESULT' && response.payload?.results) {
          for (const entry of response.payload.results) {
            if (!this.knownSeeds.has(entry.id)) {
              this.knownSeeds.add(entry.id);
              results.push(entry);
            }
          }
        }
      } catch {
        this.peers.delete(peerId);
      }
    }

    return results;
  }

  /**
   * Get list of all connected peers.
   */
  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * HTTP-based message sending (simplified for Node-to-Node comms).
   */
  private sendMessage(peerUrl: string, msg: FederationMessage): Promise<FederationMessage | null> {
    return new Promise((resolve) => {
      const urlObj = new URL(peerUrl);
      const data = JSON.stringify(msg);
      const req = http.request({
        hostname: urlObj.hostname,
        port: urlObj.port || 3001,
        path: '/api/v1/federation/message',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
      }, (res) => {
        let body = '';
        res.on('data', (chunk: any) => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.write(data);
      req.end();
    });
  }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────

export const federation = new FederationManager(
  crypto.randomUUID().slice(0, 8),
  parseInt(process.env.FEDERATION_PORT || '3001', 10),
);
