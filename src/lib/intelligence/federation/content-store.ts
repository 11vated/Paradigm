/**
 * In-memory ContentAddressedStore — sha256(canonical JSON) → GraphNode.
 *
 * Real persistence is provided via SemanticMemory (Layer 3) or an IndexedDB
 * adapter. For now a pure in-memory store, perfect for tests + smoke usage.
 */
import { createHash } from 'node:crypto';
import type { ContentStore, GraphEdge, GraphNode, GraphStore, NodeScheme } from './types';

export function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize((obj as Record<string, unknown>)[k])).join(',') + '}';
}

export function contentHashOf(body: unknown): string {
  return createHash('sha256').update(canonicalize(body)).digest('hex');
}

export class InMemoryContentStore implements ContentStore {
  private nodes = new Map<string, GraphNode>();
  async put(node: GraphNode): Promise<void> { this.nodes.set(node.contentHash, node); }
  async get(h: string): Promise<GraphNode | null> { return this.nodes.get(h) ?? null; }
  async has(h: string): Promise<boolean> { return this.nodes.has(h); }
  async listByScheme(scheme: NodeScheme): Promise<GraphNode[]> {
    return [...this.nodes.values()].filter(n => n.url.scheme === scheme);
  }
  async size(): Promise<number> { return this.nodes.size; }
}

export class InMemoryGraphStore extends InMemoryContentStore implements GraphStore {
  private edges = new Map<string, GraphEdge>();
  private fromIdx = new Map<string, Set<string>>();
  private toIdx = new Map<string, Set<string>>();
  async addEdge(edge: GraphEdge): Promise<void> {
    this.edges.set(edge.contentHash, edge);
    if (!this.fromIdx.has(edge.source)) this.fromIdx.set(edge.source, new Set());
    if (!this.toIdx.has(edge.target)) this.toIdx.set(edge.target, new Set());
    this.fromIdx.get(edge.source)!.add(edge.contentHash);
    this.toIdx.get(edge.target)!.add(edge.contentHash);
  }
  async edgesFrom(source: string): Promise<GraphEdge[]> {
    const hashes = this.fromIdx.get(source) ?? new Set();
    return [...hashes].map(h => this.edges.get(h)!).filter(Boolean);
  }
  async edgesTo(target: string): Promise<GraphEdge[]> {
    const hashes = this.toIdx.get(target) ?? new Set();
    return [...hashes].map(h => this.edges.get(h)!).filter(Boolean);
  }
}
