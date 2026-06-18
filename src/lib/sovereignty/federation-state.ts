/**
 * Federation State — file-based persistent store for federation exchanges,
 * known nodes, and lineage records.
 *
 * Uses JSON files at FEDERATION_STATE_DIR (default: .paradigm/federation/).
 * All writes are synchronous for simplicity — this is a local-node store,
 * not a high-throughput server.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { FedV1Exchange } from './index.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_STATE_DIR = path.join(process.cwd(), '.paradigm', 'federation');

/** Active federation node record */
export interface FederationNode {
  nodeId: string;
  publicKeyPem: string;
  label?: string;
  firstSeen: string;
  lastSeen: string;
  exchangeCount: number;
}

/** Lineage record tracking seed lineage across exchanges */
export interface LineageRecord {
  seedHash: string;
  lineage: string[];
  merkleRoot: string;
  nodeCount: number;
  lastExchange: string;
}

/** Full federation state dump */
export interface FederationState {
  version: 1;
  nodes: Record<string, FederationNode>;
  lineage: Record<string, LineageRecord>;
  ledger: FedV1Exchange[];
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function statePath(baseDir: string): string {
  return path.join(baseDir, 'federation-state.json');
}

function emptyState(): FederationState {
  return { version: 1, nodes: {}, lineage: {}, ledger: [], updatedAt: new Date().toISOString() };
}

function loadState(baseDir: string): FederationState {
  try {
    const sp = statePath(baseDir);
    if (!fs.existsSync(sp)) return emptyState();
    const raw = fs.readFileSync(sp, 'utf-8');
    return JSON.parse(raw) as FederationState;
  } catch {
    return emptyState();
  }
}

function saveState(baseDir: string, state: FederationState): void {
  ensureDir(baseDir);
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(statePath(baseDir), JSON.stringify(state, null, 2), 'utf-8');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export class FederationStateStore {
  private state: FederationState;
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? DEFAULT_STATE_DIR;
    this.state = loadState(this.baseDir);
  }

  /** Reload state from disk (e.g., for cross-process reads) */
  reload(): void {
    this.state = loadState(this.baseDir);
  }

  /** Persist current in-memory state to disk */
  flush(): void {
    saveState(this.baseDir, this.state);
  }

  /** Get the full state snapshot */
  get snapshot(): FederationState {
    return { ...this.state, ledger: [...this.state.ledger] };
  }

  /** Total number of recorded exchanges */
  get exchangeCount(): number {
    return this.state.ledger.length;
  }

  /** Registered node identifiers */
  get nodeIds(): string[] {
    return Object.keys(this.state.nodes);
  }

  /** Registered lineage seed hashes */
  get seedHashes(): string[] {
    return Object.keys(this.state.lineage);
  }

  // ─── Node operations ────────────────────────────────────────────────────

  registerNode(nodeId: string, publicKeyPem: string, label?: string): FederationNode {
    const now = new Date().toISOString();
    const existing = this.state.nodes[nodeId];
    const node: FederationNode = existing
      ? { ...existing, publicKeyPem, lastSeen: now, label: label ?? existing.label }
      : { nodeId, publicKeyPem, label, firstSeen: now, lastSeen: now, exchangeCount: 0 };
    if (existing) node.exchangeCount = existing.exchangeCount;
    this.state.nodes[nodeId] = node;
    this.flush();
    return node;
  }

  getNode(nodeId: string): FederationNode | undefined {
    return this.state.nodes[nodeId];
  }

  /** Get all registered nodes */
  listNodes(): FederationNode[] {
    return Object.values(this.state.nodes);
  }

  removeNode(nodeId: string): boolean {
    const existed = nodeId in this.state.nodes;
    if (existed) {
      delete this.state.nodes[nodeId];
      this.flush();
    }
    return existed;
  }

  // ─── Ledger operations ──────────────────────────────────────────────────

  appendExchange(exchange: FedV1Exchange): void {
    this.state.ledger.push(exchange);
    // Update node exchange counts
    const fromNode = this.state.nodes[exchange.fromNode];
    if (fromNode) fromNode.exchangeCount++;
    const toNode = this.state.nodes[exchange.toNode];
    if (toNode) toNode.exchangeCount++;
    // Update lineage record
    this.updateLineage(exchange);
    this.flush();
  }

  /** Get all exchanges for a given node (either as sender or recipient) */
  getExchangesForNode(nodeId: string): FedV1Exchange[] {
    return this.state.ledger.filter(
      ex => ex.fromNode === nodeId || ex.toNode === nodeId
    );
  }

  /** Get exchanges involving a specific seed hash */
  getExchangesForSeed(seedHash: string): FedV1Exchange[] {
    return this.state.ledger.filter(ex => ex.seedHash === seedHash);
  }

  /** Get the last N exchanges */
  recentExchanges(n: number = 10): FedV1Exchange[] {
    return this.state.ledger.slice(-n);
  }

  // ─── Lineage operations ─────────────────────────────────────────────────

  private updateLineage(exchange: FedV1Exchange): void {
    const existing = this.state.lineage[exchange.seedHash];
    const existingLineage = existing?.lineage ?? [];
    const mergedLineage = Array.from(new Set([...existingLineage, ...exchange.lineage])).sort();
    const now = new Date().toISOString();
    this.state.lineage[exchange.seedHash] = {
      seedHash: exchange.seedHash,
      lineage: mergedLineage,
      merkleRoot: exchange.merkleRoot,
      nodeCount: (existing?.nodeCount ?? 0) + 1,
      lastExchange: now,
    };
  }

  getLineage(seedHash: string): LineageRecord | undefined {
    return this.state.lineage[seedHash];
  }

  /** List all tracked lineage records */
  listLineage(): LineageRecord[] {
    return Object.values(this.state.lineage);
  }

  // ─── Summary ────────────────────────────────────────────────────────────

  summary(): string {
    const nl = this.nodeIds.length;
    const ne = this.exchangeCount;
    const ns = this.seedHashes.length;
    return `FederationStateStore: ${nl} node(s), ${ne} exchange(s), ${ns} seed lineage(s)`;
  }
}
