/**
 * Federation Peer Store — Doctrine v2 Part VIII.16.
 *
 * Content-addressed object store for cross-operator federation exchange.
 * In v1 the store is purely in-memory; v2 swaps the adapter without
 * changing this surface.
 *
 * Identity rules (Part VIII.16):
 *   - object id = sha256(canonicalize(body))
 *   - canonicalize = recursively-sorted-key JSON; byte-stable across
 *     Node, Bun, browser
 *   - any peer that holds an object must be able to re-derive its id
 *     by recomputing the hash; mismatch → reject as poisoned
 */
import { createHash } from 'node:crypto';

/** Canonical JSON — recursively-sorted keys; undefined keys dropped (matches JSON.stringify wire behavior). */
export function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj ?? null);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).filter((k) => record[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(record[k])).join(',') + '}';
}

/** sha256(canonical(body)) — the federation content hash. */
export function contentHashOf(body: unknown): string {
  return createHash('sha256').update(canonicalize(body), 'utf8').digest('hex');
}

export type Visibility = 'private' | 'mirror-allowed' | 'fully-public';

/**
 * An object the peer can serve. The body is opaque to the store; the
 * store only enforces the content-hash identity rule. A typical body
 * for v1 is a signed Seed (i.e. has `$hash` and `$sovereignty` fields).
 */
export interface FederationObject<TBody = unknown> {
  readonly contentHash: string;
  readonly body: TBody;
  readonly visibility: Visibility;
  /** Lineage parents (other content hashes this object references). */
  readonly parents: ReadonlyArray<string>;
  /** Operator-supplied tag for the manifest filter (`domain:character`, etc.). */
  readonly tags: ReadonlyArray<string>;
}

export interface ManifestEntry {
  readonly contentHash: string;
  readonly parents: ReadonlyArray<string>;
  readonly tags: ReadonlyArray<string>;
}

export interface PeerStore {
  put<TBody>(opts: { body: TBody; visibility?: Visibility; parents?: ReadonlyArray<string>; tags?: ReadonlyArray<string> }): FederationObject<TBody>;
  get(contentHash: string): FederationObject | undefined;
  has(contentHash: string): boolean;
  /** Manifest entries visible to a peer with the given trust level. */
  manifest(trust: 'public' | 'mirror'): ManifestEntry[];
  /** Stable head hash — sha256 of sorted manifest. Cheap; recomputed on demand. */
  headHash(trust: 'public' | 'mirror'): string;
  size(): number;
}

export function createInMemoryPeerStore(): PeerStore {
  const map = new Map<string, FederationObject>();

  function visibleEntries(trust: 'public' | 'mirror'): FederationObject[] {
    const out: FederationObject[] = [];
    for (const obj of map.values()) {
      if (obj.visibility === 'fully-public') out.push(obj);
      else if (trust === 'mirror' && obj.visibility === 'mirror-allowed') out.push(obj);
      // 'private' is never returned over federation
    }
    out.sort((a, b) => (a.contentHash < b.contentHash ? -1 : a.contentHash > b.contentHash ? 1 : 0));
    return out;
  }

  return {
    put({ body, visibility = 'fully-public', parents = [], tags = [] }) {
      const contentHash = contentHashOf(body);
      const obj: FederationObject = {
        contentHash,
        body,
        visibility,
        parents: Object.freeze([...parents]),
        tags: Object.freeze([...tags]),
      };
      map.set(contentHash, obj);
      return obj as FederationObject<typeof body>;
    },
    get(contentHash) {
      return map.get(contentHash);
    },
    has(contentHash) {
      return map.has(contentHash);
    },
    manifest(trust) {
      return visibleEntries(trust).map((o) => ({
        contentHash: o.contentHash,
        parents: o.parents,
        tags: o.tags,
      }));
    },
    headHash(trust) {
      const entries = visibleEntries(trust).map((o) => o.contentHash);
      return createHash('sha256').update(entries.join('\n')).digest('hex');
    },
    size() {
      return map.size;
    },
  };
}
