/**
 * Reference Gathering Loop — Brief 090.
 *   NEED → SEARCH → FETCH → CLASSIFY → GROUND → STORE → CITE
 *
 * Wraps the existing network-tier tools (web_search, fetch_json, browse_page)
 * + a classifier hook + the federation graph. Produces signed RefSeed nodes
 * with provenance, lineage, and source-culture flags.
 */
import { kernelNow } from '../../kernel/clock';
import { contentHashOf } from './content-store';
import type { GraphStore, RefSeed } from './types';

export interface ReferenceLoopDeps {
  store: GraphStore;
  search: (q: string, limit: number) => Promise<Array<{ url: string; title?: string; snippet?: string }>>;
  fetchPage: (url: string) => Promise<{ status: number; bytes: number; bodyText: string; contentType: string }>;
  classify?: (url: string, contentType: string, bodyText: string) => Promise<{
    license: string; attribution: string;
    cultural?: 'sacred' | 'restricted' | 'contested';
    copyright?: 'public-domain' | 'fair-use-claim' | 'unknown';
    trademark?: 'none' | 'named-brand' | 'named-vehicle';
  }>;
  ground?: (bodyText: string) => Promise<{ matchedPrimitives: string[]; perceptualHash?: string; semanticEmbedding?: number[] }>;
  signedBy: string;
  composeFor?: string;  // upstream node hash to link via lineage
}

export interface GatherResult {
  query: string;
  refs: RefSeed[];
  rejected: Array<{ url: string; reason: string }>;
  elapsedMs: number;
}

export async function gatherReferences(query: string, opts: ReferenceLoopDeps & { limit?: number }): Promise<GatherResult> {
  const t0 = kernelNow();
  const limit = opts.limit ?? 3;
  const refs: RefSeed[] = [];
  const rejected: Array<{ url: string; reason: string }> = [];

  // 1. SEARCH
  let hits: Array<{ url: string; title?: string; snippet?: string }> = [];
  try {
    hits = await opts.search(query, limit);
  } catch (e) {
    return { query, refs, rejected: [{ url: '(search)', reason: (e as Error).message }], elapsedMs: kernelNow() - t0 };
  }

  for (const hit of hits) {
    try {
      // 2. FETCH (sandboxed)
      const page = await opts.fetchPage(hit.url);
      if (page.status >= 400) {
        rejected.push({ url: hit.url, reason: `http ${page.status}` });
        continue;
      }

      // 3. CLASSIFY (consent + cultural + license)
      const classify = opts.classify ?? (async () => ({ license: 'unknown', attribution: 'unknown', copyright: 'unknown' as const, cultural: undefined, trademark: 'none' as const }));
      const cls = await classify(hit.url, page.contentType, page.bodyText);

      // 4. GROUND (perceptual + semantic anchoring against the libraries)
      const ground = opts.ground ?? (async () => ({ matchedPrimitives: [] as string[], perceptualHash: undefined as string | undefined, semanticEmbedding: undefined as number[] | undefined }));
      const grounded = await ground(page.bodyText);

      // 5. STORE — build the signed RefSeed
      const path = sha1Short(hit.url);
      const body = {
        sourceUrl: hit.url,
        fetchedAt: kernelNow(),
        fetchedBy: opts.signedBy,
        license: cls.license,
        attribution: cls.attribution,
        perceptualHash: grounded.perceptualHash,
        semanticEmbedding: grounded.semanticEmbedding,
        matchedPrimitives: grounded.matchedPrimitives,
      };
      const ref: RefSeed = {
        contentHash: contentHashOf(body),
        url: { scheme: 'ref', path, version: 'v1' },
        signedBy: opts.signedBy,
        body,
        lineageOut: opts.composeFor ? [opts.composeFor] : [],
        forever: [opts.signedBy],
        flags: {
          cultural: cls.cultural,
          copyright: cls.copyright,
          trademark: cls.trademark ?? 'none',
        },
        confidence: { license: cls.license !== 'unknown' ? 1 : 0.2, attribution: cls.attribution !== 'unknown' ? 1 : 0.3 },
        visibility: 'private',
        createdAt: kernelNow(),
      };
      await opts.store.put(ref);

      // 6. CITE — implicit composition edge if composeFor is set
      if (opts.composeFor) {
        await opts.store.addEdge({
          contentHash: contentHashOf({ class: 'references', source: opts.composeFor, target: ref.contentHash, t: kernelNow() }),
          class: 'references',
          source: opts.composeFor,
          target: ref.contentHash,
          signedBy: opts.signedBy,
          createdAt: kernelNow(),
        });
      }

      refs.push(ref);
    } catch (e) {
      rejected.push({ url: hit.url, reason: (e as Error).message });
    }
  }

  return { query, refs, rejected, elapsedMs: kernelNow() - t0 };
}

function sha1Short(s: string): string {
  // Cheap stable shortener for the RefSeed URL path
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).slice(0, 12);
}
