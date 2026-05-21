/**
 * Federated Knowledge Graph — type contracts (Briefs 090 / 091).
 *
 * Every signed gseed is a content-addressed node. Edges are typed and
 * themselves signed. The graph is immutable + append-only.
 */

export type NodeScheme =
  | 'chem' | 'phys' | 'mat' | 'fx' | 'bio' | 'earth' | 'astro' | 'math'
  | 'audio' | 'lang' | 'culture' | 'arch' | 'urban' | 'vehicle' | 'textile'
  | 'garment' | 'food' | 'psy' | 'char' | 'seed' | 'ref';

export interface NodeUrl {
  scheme: NodeScheme;
  path: string;
  version: string;          // "v1", "v2.1"
}

export type EdgeClass =
  | 'composes' | 'derives_from' | 'references' | 'forever_signed_by'
  | 'respects' | 'attributes' | 'refines' | 'reconciles' | 'refutes'
  | 'supersedes';

export type FederationVisibility = 'private' | 'mirror-allowed' | 'fully-public';

export interface GraphNode<TBody = unknown> {
  contentHash: string;      // sha256 of canonical CBOR-equivalent JSON
  url: NodeUrl;
  signedBy: string;         // identity key id
  body: TBody;
  lineageOut: string[];     // out-edge target hashes (composes / derives / references)
  forever: string[];        // creator credit chain (Brief 078)
  flags: {
    cultural?: 'sacred' | 'restricted' | 'contested';
    copyright?: 'public-domain' | 'fair-use-claim' | 'unknown';
    trademark?: 'none' | 'named-brand' | 'named-vehicle';
  };
  confidence: Record<string, number>;
  visibility: FederationVisibility;
  createdAt: number;
}

export interface GraphEdge {
  contentHash: string;
  class: EdgeClass;
  source: string;           // node contentHash
  target: string;           // node contentHash
  signedBy: string;
  meta?: Record<string, unknown>;
  createdAt: number;
}

export interface RefSeed extends GraphNode<{
  sourceUrl: string;
  fetchedAt: number;
  fetchedBy: string;
  license: string;
  attribution: string;
  perceptualHash?: string;
  semanticEmbedding?: number[];
  matchedPrimitives: string[];   // library node URLs
}> {
  url: { scheme: 'ref'; path: string; version: string };
}

export interface ContentStore {
  put(node: GraphNode): Promise<void>;
  get(contentHash: string): Promise<GraphNode | null>;
  has(contentHash: string): Promise<boolean>;
  listByScheme(scheme: NodeScheme): Promise<GraphNode[]>;
  size(): Promise<number>;
}

export interface GraphStore extends ContentStore {
  addEdge(edge: GraphEdge): Promise<void>;
  edgesFrom(source: string): Promise<GraphEdge[]>;
  edgesTo(target: string): Promise<GraphEdge[]>;
}

export function parseNodeUrl(url: string): NodeUrl {
  // scheme://path[@vN] format
  const at = url.indexOf('@');
  const head = at >= 0 ? url.slice(0, at) : url;
  const version = at >= 0 ? url.slice(at + 1) : 'v1';
  const m = head.match(/^(\w+):\/\/(.+)$/);
  if (!m) throw new Error(`Invalid node URL: ${url}`);
  return { scheme: m[1] as NodeScheme, path: m[2], version };
}

export function formatNodeUrl(u: NodeUrl): string {
  return `${u.scheme}://${u.path}@${u.version}`;
}
